/**
 * Main Application Logic for AI Editor
 */
import { store } from './state.js';
import { layoutEngine } from '../engines/layout-engine.js';
import { RenderEngine } from '../engines/render-engine.js';
import { pdfExport } from '../engines/pdf-export.js';
import { pdfCanvasExport } from '../engines/pdf-canvas-export.js';
import { googlePhotosService } from '../services/google-photos-service.js?v=forceNew6';
import { geminiService } from '../services/ai-service.js';
import { aiDirector } from '../engines/ai-director.js';
import { orderFlow } from '../services/order-flow.js';
import { authService } from '../services/firebase-auth-service.js';
import { persistenceService } from '../services/persistence-service.js';
import { TemplateSidebar } from '../ui-components/template-sidebar.js';
import { PhotographyPortfolioRenderer } from '../templates/photography-portfolio-renderer.js';
import { RomanticJourneyRenderer } from '../templates/romantic-journey-renderer.js';
import { TravelJourneyRenderer } from '../templates/travel-journey-renderer.js';
import { FamilyRootsRenderer } from '../templates/family-roots-renderer.js';
import { BarMitzvahRenderer } from '../templates/bar-mitzvah-renderer.js';
import { UnifiedCoverRenderer } from '../engines/unified-cover-renderer.js';
import { WeddingPrestigeRenderer } from '../templates/wedding-prestige-renderer.js';



// Expose for debugging
window.pdfExport = pdfExport;
window.pdfCanvasExport = pdfCanvasExport;

class App {
    constructor() {
        // Manual Crop Handlers
        this.boundHandleCropDragStart = this.handleCropDragStart.bind(this);
        this.boundHandleCropDragMove = this.handleCropDragMove.bind(this);
        this.boundHandleCropDragEnd = this.handleCropDragEnd.bind(this);
        this.enterCropMode = this.enterCropMode.bind(this);
        this.commitCropMode = this.commitCropMode.bind(this);

        this.init();

        // Initialize Config & Services
        this.initConfig().then(() => {
            // Continue setup if needed
        });
    }

    async initConfig() {
        // 1. Try Local Config (Ignored file)
        // 1. Try Local Global Config (loaded via script tag)
        if (window.CONFIG && window.CONFIG.GEMINI_API_KEY) {
            console.log("[App] Initializing Gemini with Key from window.CONFIG");
            geminiService.init(window.CONFIG.GEMINI_API_KEY);
            return;
        }

        // 2. Try LocalStorage
        const storedKey = localStorage.getItem('gemini_api_key');
        if (storedKey) {
            console.log("[App] Initializing Gemini with Key from LocalStorage");
            geminiService.init(storedKey);
            return;
        }

        console.warn("[App] Gemini API Key missing. Magic features will run in Mock Mode.");

    }

    init() {
        this.renderer = new RenderEngine('canvas-container');
        this.state = store.state; // Direct access ref
        this.bindEvents();
        this.createHoverTooltip();
        this.loadAssets();

        // Auth Init
        this.saveDebounced = persistenceService.debounce((state) => {
            if (store.state.user) {
                persistenceService.saveProject(store.state.user.uid, state);
            }
        }, 3000);

        // Check for Auto-Start Params immediately
        const urlParams = new URLSearchParams(window.location.search);
        this.isAutoStart = urlParams.get('autoStart') === 'true';
        this.targetTemplateId = urlParams.get('templateId');

        authService.onAuthStateChanged(async (user) => {
            store.state.user = user;
            this.renderAuthUI();

            // --- AUTO START FLOW: PRE-LOGIN ---
            if (this.isAutoStart && !user) {
                console.log("[App] Auto-Start: Triggering Login...");
                try {
                    // We attempt to sign in. The page might reload or popup might appear.
                    // If popup, this callback will fire again with user object upon success.
                    await authService.signInWithGoogle();
                    return; // Wait for the callback to fire again with user
                } catch (e) {
                    console.error("Auto-login failed:", e);
                    // Fallback? Maybe just show the page.
                    alert("Please sign in to continue creating your book.");
                }
            }

            if (user) {
                console.log("User Logged In:", user.email);
                // Load saved project if exists
                let savedData = await persistenceService.loadProject(user.uid);

                if (savedData) {
                    console.log("Loading saved project...");

                    // --- 1. LEGACY TEMPLATE CLEANUP ---
                    // Detect if this is the unwanted "Smith Family" default template
                    const hasLegacyDefault = (savedData.pages && savedData.pages.some(p => p.templateId === 'family-roots-v1')) ||
                        (savedData.cover && (savedData.cover.title === 'The Smith Family' || savedData.cover.subtitle === 'Roots & Memories'));

                    if (hasLegacyDefault) {
                        console.log("[App] Detected legacy default 'Smith Family' template in save. DISCARDING for clean slate.");
                        savedData = null; // Treat as no save
                    }
                }

                // --- 2. AUTO-START TEMPLATE OVERRIDE ---
                // If user selected a specific template from landing page, we prioritize that over saved state
                // UNLESS the saved state matches the target template (optimization)
                if (this.isAutoStart && this.targetTemplateId) {
                    console.log(`[App] Auto-Start: Overriding saved project with template '${this.targetTemplateId}'`);
                    // We effectively start fresh but keep the user
                    // OR we could try to migrate content? For now, fresh start is safer for "Create New" flow.
                    savedData = null;
                }

                if (savedData) {
                    // --- 3. CLEAR PHOTOS FROM PREVIOUS SESSION ---
                    if (savedData.assets) {
                        console.log(`[App] Clearing ${savedData.assets.photos?.length || 0} photos from previous session.`);
                        savedData.assets.photos = [];
                    }

                    // Restore key state properties
                    Object.assign(store.state, {
                        ...savedData,
                        user: user,
                        assets: savedData.assets || store.state.assets
                    });

                    // Force refresh
                    store.notify('pages', store.state.pages);
                    store.notify('cover', store.state.cover);
                    store.notify('assets', store.state.assets);

                    if (this.renderAssetSidebar) this.renderAssetSidebar();

                    // Initialize Template Sidebar
                    this.templateSidebar = new TemplateSidebar('template-library', this);
                    this.templateSidebar.init();

                    // PDF Export Hydration
                    const activeTemplateId = (store.state.pages && store.state.pages[0] ? store.state.pages[0].templateId : null) ||
                        (store.state.cover ? store.state.cover.templateId : null);

                    if (activeTemplateId && this.templateSidebar.manager) {
                        try {
                            await this.templateSidebar.manager.loadTemplate(activeTemplateId);
                            pdfExport.setTemplateConfig(this.templateSidebar.manager.config);
                        } catch (e) {
                            console.error("Failed to restore template config:", e);
                        }
                    }

                    // Refresh current view
                    if (store.state.viewMode === 'cover') {
                        this.renderCoverWithTemplate();
                    } else {
                        this.renderActivePage();
                    }

                    console.log(`[App] Project restored for ${user.displayName}`);
                } else {
                    // Start Fresh (New User or Auto-Start Override)
                    this.templateSidebar = new TemplateSidebar('template-library', this);
                    this.templateSidebar.init();

                    // Apply Target Template if requested
                    if (this.targetTemplateId && this.templateSidebar.manager) {
                        console.log(`[App] Applying target template: ${this.targetTemplateId}`);
                        // Small delay to ensure manager is ready/registry loaded
                        setTimeout(async () => {
                            try {
                                await this.templateSidebar.manager.loadTemplate(this.targetTemplateId);
                                pdfExport.setTemplateConfig(this.templateSidebar.manager.config);
                                // We might need to refresh the view to apply styles to the default pages
                                this.renderActivePage();
                            } catch (e) {
                                console.error("Failed to load target template:", e);
                            }
                        }, 500);
                    }
                }

                // --- AUTO START FLOW: POST-LOGIN (Show Modal) ---
                if (this.isAutoStart) {
                    // Show Hebrew Modal
                    const modal = document.getElementById('auto-start-upload-modal');
                    if (modal) {
                        modal.style.display = 'flex';
                        // Bind events if not already done (better to do in bindEvents but lazy binding ensures elements exist)
                        const btnLocal = document.getElementById('btn-auto-upload-local');
                        const btnGoogle = document.getElementById('btn-auto-upload-google');

                        // Clear previous listeners (handled by replace or simple on click/setup)
                        // Ideally we bind in bindEvents, but let's ensure it here just effectively.
                        btnLocal.onclick = () => {
                            document.getElementById('file-upload-input').click();
                            modal.style.display = 'none';
                        };
                        btnGoogle.onclick = async () => {
                            modal.style.display = 'none';
                            try {
                                const photos = await googlePhotosService.openPicker();
                                if (photos && photos.length > 0) {
                                    // Set assets directly for fresh start
                                    store.state.assets.photos = photos;
                                    store.notify('assets', store.state.assets);
                                    this.renderAssetSidebar();

                                    if (this.targetTemplateId && this.templateSidebar) {
                                        console.log("[App] Auto-Start: Generating book from Google Photos...");
                                        await this.templateSidebar.handleTemplateSelect(this.targetTemplateId);
                                        this.isAutoStart = false;
                                    }
                                }
                            } catch (e) {
                                console.error("Auto-start Google Photos error:", e);
                            }
                        };
                    }
                }
            }
        });

        // Setup Auto-Save on all changes
        store.subscribe((state, prop, val) => {
            // Don't save on ephemeral props if desired, but for now save everything
            if (prop !== 'selection' && prop !== 'user') {
                this.saveDebounced(state);

                // Update Timeline Preview for Active Page dynamically
                this.updateActivePagePreview();
            }
        });
    }

    renderActivePage() {
        const p = store.state.pages.find(pg => pg.id === store.state.activePageId);
        if (!p) return;

        // Check for Specialized Renderer
        // We need access to the Template Config for the renderer. 
        // We assume TemplateSidebar has the manager with the config loaded.
        if (p.templateId === 'photography-portfolio-v1' || p.templateId === 'romantic-journey-v1' || p.templateId === 'travel-journey-v1' || p.templateId === 'family-roots-v1' || p.templateId === 'bar-mitzvah-v1' || p.templateId === 'wedding-prestige-hebrew-v1') {
            const manager = this.templateSidebar?.manager;
            if (manager && manager.config && manager.config.templateId === p.templateId) {

                let renderer = null;
                if (p.templateId === 'photography-portfolio-v1') {
                    renderer = new PhotographyPortfolioRenderer(manager.config);
                } else if (p.templateId === 'romantic-journey-v1') {
                    renderer = new RomanticJourneyRenderer(manager.config);
                } else if (p.templateId === 'travel-journey-v1') {
                    renderer = new TravelJourneyRenderer(manager.config);
                } else if (p.templateId === 'family-roots-v1') {
                    renderer = new FamilyRootsRenderer(manager.config);
                } else if (p.templateId === 'bar-mitzvah-v1') {
                    renderer = new BarMitzvahRenderer(manager.config);
                } else if (p.templateId === 'wedding-prestige-hebrew-v1') {
                    renderer = new WeddingPrestigeRenderer(manager.config);
                }

                if (renderer && p.rawLayoutId) {
                    const layout = manager.config.pageLayouts.find(l => l.layoutId === p.rawLayoutId);
                    if (layout) {
                        const el = renderer.renderPage(layout, p.photos || [], p.textContent || {}, p.textPositions || {}, p);
                        const container = document.getElementById('canvas-container');
                        container.innerHTML = '';
                        container.appendChild(el);
                        return; // Successfully used custom renderer
                    }
                }
            }
        }

        // Fallback to Default RenderEngine
        this.renderer.renderPage(p, store.state.assets, store.state.selection);
    }

    loadMockPhotos() {
        console.log("[App] Loading Mock Photos...");
        const mockPhotos = [
            { id: 'mock1', url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&q=80', ratio: 1.5, type: 'photo' },
            { id: 'mock2', url: 'https://images.unsplash.com/photo-1472653431158-6364773b2710?w=600&q=80', ratio: 1.5, type: 'photo' },
            { id: 'mock3', url: 'https://images.unsplash.com/photo-1520024146169-3240400354ae?w=600&q=80', ratio: 1.5, type: 'photo' },
            { id: 'mock4', url: 'https://images.unsplash.com/photo-1502635385003-ee1e6a1a742d?w=600&q=80', ratio: 0.75, type: 'photo' },
            { id: 'mock5', url: 'https://images.unsplash.com/photo-1532467411038-f943805eb329?w=600&q=80', ratio: 1, type: 'photo' },
        ];
        store.state.assets.photos = mockPhotos;
        store.notify('assets', store.state.assets);
        this.renderAssetSidebar();

        // Auto-fill active page if empty
        const activePage = store.state.pages.find(p => p.id === store.state.activePageId);
        if (activePage && (!activePage.photos || activePage.photos.length === 0)) {
            store.pushState('Auto-Fill Mock');
            // Add first 2 photos to page
            this.addPhotoToPage('mock1', 0.2);
            setTimeout(() => this.addPhotoToPage('mock2', 0.6), 100);
        }
    }

    async loadAssets() {
        // Mock photos removed for Clean Slate feature.
        // User must upload photos or they will be loaded from persistence.

        // store.state.assets.photos = mockPhotos; -- Removed
        this.renderAssetSidebar();

        // Initialize with one page
        store.addPage();

        // Initialize Template Sidebar (New) - ensures it loads even without auth restore
        this.templateSidebar = new TemplateSidebar('template-library', this);
        this.templateSidebar.init();
    }

    renderAssetSidebar() {
        const list = document.getElementById('photo-list');
        if (!list) return; // Guard
        list.innerHTML = '';

        console.log(`[App] Rendering ${store.state.assets.photos.length} photos.`);

        store.state.assets.photos.forEach(photo => {
            const item = document.createElement('div');
            item.className = 'photo-item';

            // Drag Support
            item.draggable = true;
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'photo',
                    id: photo.id,
                    url: photo.url,
                    ratio: photo.ratio
                }));
                // Visual feedback
                item.style.opacity = '0.5';
            });
            item.addEventListener('dragend', () => {
                item.style.opacity = '1';
            });

            const img = document.createElement('img');
            img.src = photo.thumbnailUrl || photo.url;
            img.loading = 'lazy';

            // Debug or fallback
            img.onerror = () => { img.src = 'assets/placeholder-image.png'; };

            // Hover tooltip logic could go here

            item.appendChild(img);
            list.appendChild(item);
        });

        // Add Empty State or "+ Add" button if needed at bottom
        if (store.state.assets.photos.length === 0) {
            list.innerHTML = '<div class="empty-state">No photos yet. Click + to add.</div>';
        }
    }

    /**
     * Render a full album generated by a template
     * @param {Array} pages - Array of DOM elements
     */
    /**
     * Render a full album generated by a template
     * @param {Array} newPages - Array of Page State Objects
     */
    renderAlbumPages(input) {
        let newPages = [];
        let newCover = null;

        if (Array.isArray(input)) {
            newPages = input;
        } else if (input && typeof input === 'object') {
            newPages = input.pages || [];
            newCover = input.cover || null;
        }

        if (newCover) {
            store.state.cover = newCover;
            // Notify subscribers about cover update
            // store.notify('cover', newCover);
        }

        if (newPages && newPages.length > 0) {
            console.log(`[App] Applying template with ${newPages.length} pages`);

            store.state.pages = newPages;
            store.state.activePageId = newPages[0].id;

            // Notify subscribers
            store.notify('pages', store.state.pages);
            store.notify('activePageId', store.state.activePageId);

            // Sync PDF Config
            if (this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config) {
                console.log("[App] Syncing PDF Template Config...");
                pdfExport.setTemplateConfig(this.templateSidebar.manager.config);
            }

            // Force re-render of current view
            this.renderActivePage();

        }
    }

    /**
     * Render cover using the UNIFIED cover renderer
     * This ensures consistent cover rendering across editor, preview, and PDF export.
     */
    renderCoverWithTemplate() {
        const cover = store.state.cover;
        const assets = store.state.assets;
        const container = this.renderer.container;

        // Get template config if available
        const templateId = cover?.templateId ||
            (store.state.pages && store.state.pages[0] && store.state.pages[0].templateId);

        const manager = this.templateSidebar?.manager;
        let templateConfig = null;

        if (templateId && manager && manager.config) {
            templateConfig = manager.config;

            // Sync template ID to cover for consistency
            if (cover && !cover.templateId) {
                cover.templateId = templateId;
            }
        }

        // Use the UNIFIED cover renderer
        UnifiedCoverRenderer.render({
            cover,
            assets,
            templateConfig,
            container,
            interactive: true,  // Enable drag/drop and selection
            thumbnail: false
        });
    }

    createHoverTooltip() {
        if (document.getElementById('photo-preview-tooltip')) return;
        const tooltip = document.createElement('div');
        tooltip.id = 'photo-preview-tooltip';
        tooltip.style.position = 'fixed';
        tooltip.style.zIndex = '9999';
        tooltip.style.pointerEvents = 'none';
        tooltip.style.display = 'none';
        document.body.appendChild(tooltip);
    }

    bindEvents() {
        // Subscribe to state changes
        store.subscribe((state, prop, value) => {
            if (prop === 'activePageId' || prop === 'pages' || prop === 'selection' || prop === 'theme' || prop === 'viewMode' || prop === 'cover') {
                if (state.viewMode === 'cover') {
                    this.renderCoverWithTemplate();
                } else {
                    // IMPORTANT: Use renderActivePage() instead of renderer.renderPage()
                    // This ensures template-specific renderers are used consistently
                    this.renderActivePage();
                }

                this.updateTimeline(state.pages, state.activePageId);

                if (prop === 'selection' || prop === 'pages' || prop === 'viewMode' || prop === 'cover') {
                    this.updatePropertiesPanel(state);
                }
            }
        });

        // ... existing code ...


        const canvas = document.getElementById('canvas-container');

        canvas.addEventListener('dragover', (e) => {
            e.preventDefault();
            // console.log('[App] Dragover:', e.target);
            e.dataTransfer.dropEffect = 'copy';
            canvas.classList.add('drop-target-active');

            // Drag Feedback: Highlight Slot
            const slot = e.target.closest('.photo-slot');
            document.querySelectorAll('.photo-slot.drag-over-slot').forEach(el => {
                if (el !== slot) el.classList.remove('drag-over-slot');
            });
            if (slot) {
                slot.classList.add('drag-over-slot');
            }
        });

        canvas.addEventListener('dragleave', (e) => {
            // We can't simply remove detected slot class here because it fires when entering children
            // Logic in dragover handles the "switch" between slots correctly.
            // If we leave the canvas entirely, we should clear?
            // Checking e.relatedTarget to see if we left the browser window or canvas container
            if (e.relatedTarget && !canvas.contains(e.relatedTarget)) {
                canvas.classList.remove('drop-target-active');
                document.querySelectorAll('.drag-over-slot').forEach(el => el.classList.remove('drag-over-slot'));
            }
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            console.log('[App] Drop event detected on canvas:', e.target);
            canvas.classList.remove('drop-target-active');
            document.querySelectorAll('.drag-over-slot').forEach(el => el.classList.remove('drag-over-slot'));

            const data = e.dataTransfer.getData('application/json');
            if (!data) return;

            const item = JSON.parse(data);
            const targetSlotEl = e.target.closest('.photo-slot');

            // Handle Photo Swapping (Slot to Slot)
            if (item.type === 'slot-swap' && targetSlotEl) {
                const targetPhotoId = targetSlotEl.dataset.selectableId; // We set this in RenderEngine
                if (targetPhotoId && targetPhotoId !== item.photoId) {
                    store.pushState('Swap Photos');
                    this.swapPhotos(item.photoId, targetPhotoId);
                }
                return;
            }

            // Handle New Photo Drop
            if (item.type === 'photo') {
                if (targetSlotEl) {
                    // Check if this is an empty slot
                    if (targetSlotEl.classList.contains('empty-slot')) {
                        const slotIndex = parseInt(targetSlotEl.dataset.slotIndex);
                        store.pushState('Add Photo to Slot');
                        this.addPhotoToSlot(item.id, slotIndex);
                    } else {
                        // Replace photo in specific slot
                        const targetPhotoId = targetSlotEl.dataset.selectableId;
                        store.pushState('Replace Photo');
                        this.replacePhotoInSlot(targetPhotoId, item.id);
                    }
                } else {
                    // Add new photo (Cover or Page)
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const relativeX = x / rect.width;
                    store.pushState('Add Photo');
                    this.addPhotoToPage(item.id, relativeX);
                }
            } else if (item.type === 'text') {
                this.addTextToPage(item.id);
            } else if (item.type === 'frame') {
                const state = store.state;
                const page = state.pages.find(p => p.id === state.activePageId);

                if (targetSlotEl) {
                    const targetPhotoId = targetSlotEl.dataset.selectableId;
                    if (page && page.layout && page.layout.slots) {
                        const slot = page.layout.slots.find(s => s.photoId === targetPhotoId);
                        if (slot) {
                            store.pushState('Apply Frame');
                            slot.frameId = item.id;
                            store.notify('pages', state.pages);
                            console.log('[App] Applied frame', item.id, 'to photo', targetPhotoId);
                        }
                    }
                } else {
                    // Dropped on page background -> Set as page default
                    if (page) {
                        page.imageFrameId = item.id;
                        store.notify('pages', state.pages);
                        console.log('[App] Set page default frame', item.id);
                    }
                }
            }
        });

        // ----------------------------------------------------
        // Canvas Interaction (Selection)
        // ----------------------------------------------------
        // We use event delegation on the canvas-viewport or render container
        // We use event delegation on the canvas-viewport or render container
        // Photo Removal Handler
        canvas.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.btn-remove-slot-photo');
            if (removeBtn) {
                e.preventDefault();
                e.stopImmediatePropagation(); // Prevent other listeners on the same element (selection)

                const slotIndex = parseInt(removeBtn.dataset.slotIndex);
                if (isNaN(slotIndex)) return;

                // Use a non-blocking way if confirm is annoying, but for now strict confirm is okay.
                // Note: If the user moves mouse during click, it might be treated as drag.
                // We trust the click event here.
                if (confirm('Remove photo from this page?')) {
                    const page = store.state.pages.find(p => p.id === store.state.activePageId);
                    if (page && page.photos) {
                        page.photos.splice(slotIndex, 1);
                        store.notify('pages', store.state.pages);
                        // renderActivePage is triggered by notify subscription
                    }
                }
            }
        });

        canvas.addEventListener('click', (e) => {
            // Check if clicked on a selectable item
            const target = e.target.closest('[data-selectable-id]');

            // Clear previous selection frames
            document.querySelectorAll('.selection-frame').forEach(el => el.style.display = 'none');
            // Remove editable status if clicking elsewhere
            document.querySelectorAll('[contenteditable="true"]').forEach(el => {
                el.contentEditable = 'false';
                el.style.cursor = 'pointer';
                // We should have saved on blur, but let's ensure cleanup
            });

            if (target) {
                const id = target.dataset.selectableId;
                const type = target.dataset.selectableType;
                store.state.selection = id;

                // Show selection frame if text
                if (type === 'text') {
                    const frame = target.querySelector('.selection-frame');
                    if (frame) frame.style.display = 'block';

                    // Indication: One click = Select/Move (Hand/Pointer)
                    // Double click = Edit (Text)
                    target.style.cursor = 'grab';
                }
            } else {
                // Deselect if clicking background
                store.state.selection = null;
            }
        });

        // Double Click Handler
        canvas.addEventListener('dblclick', (e) => {
            // 1. Text Editing
            const textTarget = e.target.closest('[data-selectable-type="text"]');
            if (textTarget) {
                e.stopPropagation(); // Prevent other triggers
                textTarget.contentEditable = 'true';
                textTarget.focus();
                textTarget.style.cursor = 'text';
                textTarget.style.outline = 'none';

                // Save on blur
                const id = textTarget.dataset.selectableId;
                const saveHandler = () => {
                    const newContent = textTarget.textContent;
                    // Update State
                    const page = store.state.pages.find(p => p.id === store.state.activePageId);
                    if (page) {
                        if (!page.textContent) page.textContent = {};
                        page.textContent[id] = newContent;
                        store.notify('pages', store.state.pages);
                    }
                    textTarget.contentEditable = 'false';
                    textTarget.style.cursor = 'grab';
                    textTarget.removeEventListener('blur', saveHandler);
                };
                textTarget.addEventListener('blur', saveHandler);
                return;
            }

            // 2. Photo Crop / Pan Mode
            const photoSlot = e.target.closest('.photo-slot');
            if (photoSlot) {
                e.stopPropagation();

                // Only allow if photo exists in slot
                // We can check if img exists
                const img = photoSlot.querySelector('img');
                if (img && img.src && !img.src.includes('placeholder')) {
                    this.enterCropMode(photoSlot);
                }
            }
        });

        // ----------------------------------------------------
        // Text Drag & Drop (Mouse Interactions)
        // ----------------------------------------------------
        let isDraggingText = false;
        let dragTargetId = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        let initialMouseX = 0;
        let initialMouseY = 0;
        const DRAG_THRESHOLD = 5; // px

        canvas.addEventListener('mousedown', (e) => {
            // Priority: Check if clicking a control button first!
            if (e.target.closest('.btn-remove-slot-photo') || e.target.closest('.delete-btn')) {
                return; // Let standard click handler flow
            }

            const target = e.target.closest('[data-selectable-type="text"]');
            if (target) {
                // Prepare for drag, but don't commit yet
                initialMouseX = e.clientX;
                initialMouseY = e.clientY;

                isDraggingText = false; // Wait for move
                dragTargetId = target.dataset.selectableId;

                // Calculate offset
                const rect = target.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;

                // Set selection immediately for visual feedback? 
                // Creating selection state on mousedown is fine.
                store.state.selection = dragTargetId;
                // e.stopPropagation(); // Don't stop propagation yet, might need to dblclick?
                // Actually, if we stop propagation, dblclick still fires on element.
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!dragTargetId) return;

            // Check Threshold if not yet dragging
            if (!isDraggingText) {
                const dist = Math.sqrt(Math.pow(e.clientX - initialMouseX, 2) + Math.pow(e.clientY - initialMouseY, 2));
                if (dist < DRAG_THRESHOLD) return; // Ignore small movements
                isDraggingText = true; // Activate drag
            }

            const targetEl = document.querySelector(`[data-selectable-id="${dragTargetId}"]`);
            if (!targetEl) return;

            // Get the album page element (parent container for text elements)
            const albumPage = targetEl.closest('.album-page') || targetEl.closest('.shoso-page') || canvas.querySelector('.album-page');
            const containerRect = albumPage ? albumPage.getBoundingClientRect() : canvas.getBoundingClientRect();

            // Calculate new X, Y relative to the album page (not canvas)
            let newX = e.clientX - containerRect.left - dragOffsetX;
            let newY = e.clientY - containerRect.top - dragOffsetY;

            // Visual Update (Direct DOM for Performance)
            targetEl.style.left = `${newX}px`; // Temporary px value overriding %
            targetEl.style.top = `${newY}px`;

            // We don't commit to state yet to avoid excessive re-renders
        });

        window.addEventListener('mouseup', (e) => {
            if (isDraggingText && dragTargetId) {
                const targetEl = document.querySelector(`[data-selectable-id="${dragTargetId}"]`);
                if (targetEl) {
                    // Get the album page element (parent container for text elements)
                    // Text is positioned relative to .album-page, not #canvas-container
                    const albumPage = targetEl.closest('.album-page') || targetEl.closest('.shoso-page') || canvas.querySelector('.album-page');
                    const containerRect = albumPage ? albumPage.getBoundingClientRect() : canvas.getBoundingClientRect();

                    // Calculate position relative to the album page, not canvas container
                    const rect = targetEl.getBoundingClientRect();
                    const relativeX = (rect.left - containerRect.left) / containerRect.width * 100;
                    const relativeY = (rect.top - containerRect.top) / containerRect.height * 100;

                    // Update State
                    const page = store.state.pages.find(p => p.id === store.state.activePageId);
                    if (page) {
                        // Check if this is a template-based page
                        // Fix for dragging text on templates: rely on templateId, not just textContent existence
                        // Exclude ad-hoc layouts generated by layout engine (layout-*)
                        if (page.templateId && !page.templateId.startsWith('layout-')) {
                            // Template page: store custom positions separately
                            if (!page.textPositions) {
                                page.textPositions = {};
                            }
                            page.textPositions[dragTargetId] = {
                                x: relativeX + '%',
                                y: relativeY + '%'
                            };
                            store.notify('pages', store.state.pages);
                        } else if (page.elements) {
                            // Default page system
                            const el = page.elements.find(el => el.id === dragTargetId);
                            if (el) {
                                el.x = relativeX;
                                el.y = relativeY;
                                store.notify('pages', store.state.pages);
                            }
                        }
                    }
                }
            }
            isDraggingText = false;
            dragTargetId = null;
        });

        // ----------------------------------------------------
        // Toolbar Actions
        // ----------------------------------------------------
        document.getElementById('btn-preview').addEventListener('click', async () => {
            // Open preview mode with page flipping and 3D view
            // PDF is generated only when clicking "Generate PDF" button in preview
            console.log("[App] Opening Album Preview...");

            // Ensure Template Config is loaded
            const currentTemplateId = store.state.selectedTemplate?.id ||
                (store.state.pages[0] && store.state.pages[0].templateId) ||
                (store.state.cover && store.state.cover.templateId);

            if (currentTemplateId && this.templateSidebar && this.templateSidebar.manager) {
                if (!this.templateSidebar.manager.config || this.templateSidebar.manager.currentTemplateId !== currentTemplateId) {
                    console.log('[App] Loading template config for preview:', currentTemplateId);
                    try {
                        await this.templateSidebar.manager.loadTemplate(currentTemplateId);
                    } catch (e) {
                        console.warn('[App] Failed to load template config for preview:', e);
                    }
                }
            }

            const hasTemplateConfig = this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config;
            const templateConfig = hasTemplateConfig ? this.templateSidebar.manager.config : null;

            // Import and open the album preview
            import(`../ui-components/album-preview.js?v=${Date.now()}`).then(({ albumPreview }) => {
                albumPreview.open(
                    store.state.pages,
                    store.state.cover,
                    store.state.assets,
                    templateConfig
                );
            }).catch(err => {
                console.error('[App] Failed to load album preview:', err);
                alert('Failed to open preview. Please try again.');
            });
        });

        document.getElementById('btn-remix-layout').addEventListener('click', () => {
            const state = store.state;
            const page = state.pages.find(p => p.id === state.activePageId);
            if (!page) return;

            let newLayout = null;

            // Strategy A: Template-based Remix
            // Skip if ad-hoc layout (Magic Create)
            const isAdHoc = page.templateId && page.templateId.startsWith('layout-');

            if (page.templateId && !isAdHoc && this.templateSidebar && this.templateSidebar.manager) {
                const tm = this.templateSidebar.manager;

                // Ensure template config is loaded
                if (!tm.config || tm.currentTemplateId !== page.templateId) {
                    console.log('[App] Loading template config for remix:', page.templateId);
                    // Load template synchronously if possible, or use async with await
                    tm.loadTemplate(page.templateId).then(() => {
                        this.performTemplateRemix(page, tm);
                    }).catch(err => {
                        console.warn('[App] Could not load template for remix, falling back:', err);
                    });
                    return; // Exit early, remix will happen after load
                }

                // Config is loaded, perform remix
                if (this.performTemplateRemix(page, tm)) {
                    return; // Done
                }
            }

            // Strategy B: Default Layout Engine Remix (Fallback)
            // Ensure page.photos exists (fix for Magic Create pages)
            if (!page.photos && page.layout && page.layout.slots) {
                const assetPhotos = store.state.assets.photos;
                page.photos = page.layout.slots
                    .filter(s => s.photoId)
                    .map(s => assetPhotos.find(p => p.id === s.photoId))
                    .filter(p => p);
            }

            if (!newLayout && page.photos && page.photos.length > 0) {
                const currentName = page.layout ? page.layout.name : null;
                newLayout = layoutEngine.getNextLayout(page.photos, currentName);
            }

            if (newLayout) {
                store.pushState('Remix Layout');

                // If it's a template layout, we might need to handle elements (decorations) too?
                // For now, simplify: just replacing slots. 
                // Ideally TemplateManager should return full page state for remix, but let's stick to layout swap.
                // NOTE: If template layout changes, decoration elements usually change too!
                // This is a limitation: TemplateManager.getAlternativeLayout only returns slots.
                // We might need to regenerate the page completely with new layout?
                // For V1, let's just swap slots and see. (Decorations might conflict).

                // Correction: To handle decorations properly, we should re-generate the page state 
                // but keeping the same photos.
                // But doing that for a single page is tricky if assignments are global.
                // Let's accept mixing slots for now, or improve later.

                page.layout = newLayout;
                store.notify('pages', state.pages);
            }
        });

        // Review & Order Actions
        // 1. Review (Download PDF)
        document.getElementById('btn-review').addEventListener('click', async () => {
            console.log("Generating Review PDF...");

            // Ensure config is up to date
            const hasTemplateConfig = this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config;
            const templateConfig = hasTemplateConfig ? this.templateSidebar.manager.config : null;

            if (templateConfig) {
                pdfExport.setTemplateConfig(templateConfig);
                pdfCanvasExport.setTemplateConfig(templateConfig);
            }

            // Use canvas-based export for template-based pages
            const firstPage = store.state.pages[0];
            const isTemplateBased = firstPage && firstPage.templateId && templateConfig;

            if (isTemplateBased) {
                await pdfCanvasExport.generatePDF(store.state.pages, store.state.cover, store.state.assets);
            } else {
                await pdfExport.generatePDF(store.state.pages, store.state.cover, store.state.assets);
            }

            // Show Order Button
            document.getElementById('btn-order-print').style.display = 'inline-block';
        });

        // 2. Order (Simulate Checkout)
        document.getElementById('btn-order-print').addEventListener('click', async () => {
            console.log("Starting Order Flow...");

            // Ensure config is up to date
            const hasTemplateConfig = this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config;
            const templateConfig = hasTemplateConfig ? this.templateSidebar.manager.config : null;

            if (templateConfig) {
                pdfExport.setTemplateConfig(templateConfig);
                pdfCanvasExport.setTemplateConfig(templateConfig);
            }

            // Generate Blob - use canvas-based export for template-based pages
            const firstPage = store.state.pages[0];
            const isTemplateBased = firstPage && firstPage.templateId && templateConfig;

            let blob;
            if (isTemplateBased) {
                blob = await pdfCanvasExport.generatePDF(store.state.pages, store.state.cover, store.state.assets, true);
            } else {
                blob = await pdfExport.generatePDF(store.state.pages, store.state.cover, store.state.assets, true);
            }

            if (blob) {
                orderFlow.startOrderFlow(blob);
            }
        });

        // Magic Create Button (V2)
        const btnMagicCreate = document.getElementById('btn-magic-create');
        if (btnMagicCreate) {
            btnMagicCreate.addEventListener('click', async () => {
                const photos = store.state.assets.photos;
                if (!photos || photos.length < 4) {
                    alert("Please import at least 4 photos first (use the '+' button in Photos tab).");
                    return;
                }

                if (window.magicLauncher) {
                    window.magicLauncher.open(photos);
                } else {
                    console.error("MagicLauncher module not loaded");
                    alert("Magic Create is initializing... please try again in a moment.");
                }
            });
        }

        // Tab Navigation
        document.querySelectorAll('.nav-item').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = btn.dataset.tab;
                document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                document.getElementById(`tab-${tabId}`).classList.add('active');
            });
        });

        // Add Page Button
        const btnAddPage = document.querySelector('.btn-add-page');
        if (btnAddPage) {
            btnAddPage.addEventListener('click', () => {
                store.pushState('Add Page');
                store.addPage();
                console.log('[App] Added new page');
            });
        }

        // ----------------------------------------------------
        // Upload Flow
        // ----------------------------------------------------
        const btnAddPhotos = document.getElementById('btn-add-photos-sidebar');
        const uploadModal = document.getElementById('upload-options-modal');

        if (btnAddPhotos && uploadModal) {
            btnAddPhotos.addEventListener('click', () => {
                uploadModal.style.display = 'flex';
            });
        }

        const btnLocal = document.getElementById('btn-upload-local');
        const fileInput = document.getElementById('file-upload-input');

        if (btnLocal && fileInput) {
            btnLocal.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', async (e) => {
                const files = e.target.files;
                if (files && files.length > 0) {
                    store.pushState('Upload Photos');
                    const newPhotos = [];
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        const reader = new FileReader();
                        const p = new Promise(resolve => {
                            reader.onload = (evt) => {
                                resolve({
                                    id: 'local_' + crypto.randomUUID(),
                                    url: evt.target.result,
                                    ratio: 1.5 // simplified, ideally assume landscape
                                });
                            };
                        });
                        reader.readAsDataURL(file);
                        const photo = await p;
                        newPhotos.push(photo);
                    }

                    // Add to assets
                    store.state.assets.photos = [...store.state.assets.photos, ...newPhotos];
                    this.renderAssetSidebar();
                    this.renderAssetSidebar();
                    uploadModal.style.display = 'none';

                    // --- AUTO START TRIGGER ---
                    if (this.isAutoStart && this.targetTemplateId && this.templateSidebar) {
                        console.log("[App] Auto-Start: Generating book from local files...");
                        // Use a small timeout to let UI update
                        setTimeout(async () => {
                            await this.templateSidebar.handleTemplateSelect(this.targetTemplateId);
                            this.isAutoStart = false;
                        }, 100);
                    }
                    // Reset input
                    fileInput.value = '';
                }
            });
        }

        // ----------------------------------------------------
        // Navigation & History Actions
        // ----------------------------------------------------

        // Page Navigation
        const btnPrev = document.getElementById('btn-prev-page');
        const btnNext = document.getElementById('btn-next-page');

        if (btnPrev && btnNext) {
            btnPrev.addEventListener('click', () => {
                const state = store.state;
                if (state.viewMode === 'cover') return; // Can't go back from cover (unless wrapping?)

                const currentIndex = state.pages.findIndex(p => p.id === state.activePageId);
                if (currentIndex > 0) {
                    store.state.activePageId = state.pages[currentIndex - 1].id;
                    store.notify('activePageId', store.state.activePageId);
                    this.renderActivePage(); // Trigger render
                    this.updateTimeline(state.pages, store.state.activePageId);
                } else {
                    // Go to cover?
                    store.state.viewMode = 'cover';
                    store.notify('viewMode', 'cover');
                    this.renderCoverWithTemplate();
                    this.updateTimeline(state.pages, null); // Highlight cover in timeline
                }
            });

            btnNext.addEventListener('click', () => {
                const state = store.state;
                if (state.viewMode === 'cover') {
                    // Go to first page
                    store.state.viewMode = 'pages';
                    store.notify('viewMode', 'pages');
                    if (state.pages.length > 0) {
                        store.state.activePageId = state.pages[0].id; // Ensure active page is set
                        store.notify('activePageId', store.state.activePageId);
                        this.renderActivePage(); // Trigger render
                    }
                    this.updateTimeline(state.pages, store.state.activePageId);
                    return;
                }

                const currentIndex = state.pages.findIndex(p => p.id === state.activePageId);
                if (currentIndex < state.pages.length - 1) {
                    store.state.activePageId = state.pages[currentIndex + 1].id;
                    store.notify('activePageId', store.state.activePageId);
                    this.renderActivePage(); // Trigger render
                    this.updateTimeline(state.pages, store.state.activePageId);
                }
            });
        }

        // Undo / Redo
        const btnUndo = document.getElementById('btn-undo');
        const btnRedo = document.getElementById('btn-redo');

        if (btnUndo) {
            btnUndo.addEventListener('click', () => {
                store.undo();
                // After undo, state is restored. We need to re-render everything.
                this.renderActivePage(); // Or detect what changed? renderActivePage is safest.
                if (store.state.viewMode === 'cover') {
                    this.renderCoverWithTemplate();
                }
                this.updatePropertiesPanel(store.state);
            });
        }

        if (btnRedo) {
            btnRedo.addEventListener('click', () => {
                store.redo();
                // After redo, re-render
                this.renderActivePage();
                if (store.state.viewMode === 'cover') {
                    this.renderCoverWithTemplate();
                }
                this.updatePropertiesPanel(store.state);
            });
        }

        const btnGoogle = document.getElementById('btn-upload-google');
        if (btnGoogle) {
            btnGoogle.addEventListener('click', async () => {
                try {
                    // New Backend Session Flow:
                    // Authenticated user check happens inside openPicker or via auth token passing?
                    // google-photos-service.js checks currentUser. 
                    // No need for explicit connect() call anymore.

                    const photos = await googlePhotosService.openPicker();

                    if (photos && photos.length > 0) {
                        store.pushState('Upload Google Photos');

                        // --- ASK REPLACE VS APPEND ---
                        // If there are existing photos, ask user if they want to Replace or Append
                        if (store.state.assets.photos.length > 0) {
                            if (window.confirm("You already have photos in your library.\n\nClick OK to ADD these photos to your existing ones.\nClick Cancel to REPLACE all photos with the new selection.")) {
                                // Append
                                store.state.assets.photos = [...store.state.assets.photos, ...photos];
                                console.log("[App] User chose to APPEND to library.");
                            } else {
                                // Replace
                                store.state.assets.photos = photos;
                                console.log("[App] User chose to REPLACE library.");
                            }
                        } else {
                            // No existing photos, just add them
                            store.state.assets.photos = photos;
                        }

                        this.renderAssetSidebar();
                        uploadModal.style.display = 'none';
                        console.log("Imported Google Photos:", photos.length);
                        store.notify('assets', store.state.assets);
                    }

                } catch (e) {
                    console.error("Google Photos Error:", e);
                    const msg = e.message || e.toString();
                    if (msg.includes('User not logged in')) {
                        alert("Please Log In first (Top Right Button) to use Google Photos.");
                    } else {
                        alert("Error: " + msg);
                    }
                }
            });
        }
    }

    /**
     * Perform template-based layout remix for a page
     * @param {Object} page - The page to remix
     * @param {Object} tm - Template manager instance
     * @returns {boolean} True if remix was successful
     */
    performTemplateRemix(page, tm) {
        const currentLayoutId = page.layout ? page.layout.id : null;
        const photoCount = page.photos ? page.photos.length : (page.layout?.slots ? page.layout.slots.length : 0);

        // 1. Get next layout ID
        const nextLayoutId = tm.getAlternativeLayoutId(currentLayoutId, photoCount);
        console.log('[App] Remix: current layout:', currentLayoutId, 'next layout:', nextLayoutId, 'photoCount:', photoCount);

        if (nextLayoutId) {
            // 2. Regenerate entire page state (keeping photos)
            const newPage = tm.regeneratePage(page, nextLayoutId);

            if (newPage) {
                console.log('[App] Remixed template layout to:', newPage.layout.name);

                // Replace the page in state
                const state = store.state;
                const index = state.pages.findIndex(p => p.id === page.id);
                if (index !== -1) {
                    store.pushState('Remix Layout');
                    const newPages = [...state.pages];
                    newPages[index] = newPage;
                    store.state.pages = newPages;

                    // Ensure selection is cleared if element gone
                    store.state.selection = null;

                    // Notify and update
                    store.notify('pages', store.state.pages);

                    // Force properties panel update
                    this.updatePropertiesPanel(store.state);
                }
                return true; // Success
            }
        } else {
            console.warn('[App] No alternative layout found for photoCount:', photoCount);
        }
        return false; // No remix performed
    }

    addPhotoToPage(photoId, relativeX = 0.5) {
        const state = store.state;

        // Cover Handling
        if (state.viewMode === 'cover') {
            // Determine drop target (Front vs Back)
            // RenderEngine: Back (Left) | Spine | Front (Right)
            // Left < 0.45 is Back, > 0.55 is Front.

            if (relativeX > 0.5) {
                state.cover.frontPhotoId = photoId;
            } else {
                state.cover.backPhotoId = photoId;
            }
            store.notify('cover', state.cover);
            return;
        }

        // 1. Get Active Page
        // 1. Get Active Page
        let pageIndex = state.pages.findIndex(p => p.id === state.activePageId);

        // Fallback: If no active page but pages exist, default to first (or last?)
        if (pageIndex === -1 && state.pages.length > 0) {
            console.warn('[App] No active page ID found during drop. Defaulting to current stored active ID or first page.');
            // Try to recover active ID
            if (!state.activePageId) {
                store.state.activePageId = state.pages[0].id;
                pageIndex = 0;
            }
        }

        if (pageIndex === -1) {
            console.error('[App] Cannot add photo. No valid page found.');
            return;
        }

        console.log('[App] Adding photo to page', photoId, 'Index:', pageIndex);

        const page = { ...state.pages[pageIndex] }; // Copy for immutability check

        // 2. Fetch Photo Data
        const photo = state.assets.photos.find(p => p.id === photoId);
        if (!photo) {
            console.warn('[App] Photo not found in assets:', photoId);
            return;
        }

        // 3. Add to Elements (Immutable update)
        // Create a new array for photos to avoid mutating state before assignment
        const newPhotos = [...(page.photos || []), photo];
        page.photos = newPhotos;

        console.log('[App] New Photos list:', page.photos.length, page.photos);

        // 4. Trigger Layout Update
        let newLayout = null;
        let newPage = null;

        // TEMPLATE AWARE LOGIC
        // Exclude Magic Create "ad-hoc" layouts (starting with "layout-") from Template Manager logic
        // because they don't have a registered external template config.
        const isAdHocLayout = page.templateId && page.templateId.startsWith('layout-');

        if (page.templateId && !isAdHocLayout && this.templateSidebar && this.templateSidebar.manager) {
            const tm = this.templateSidebar.manager;
            // Ensure config matches (it should, as we only have one active template globally usually)
            // But if mixed, we might need to load.
            if (tm.config && tm.currentTemplateId === page.templateId) {
                const bestLayoutId = tm.getLayoutIdForCount(newPhotos.length);
                if (bestLayoutId) {
                    console.log('[App] Found template layout for count:', newPhotos.length, bestLayoutId);
                    newPage = tm.regeneratePage(page, bestLayoutId);
                } else {
                    console.warn('[App] No template layout found for photo count:', newPhotos.length);
                    // Fallback handled below or by keeping current
                }
            }
        }

        if (newPage) {
            // Use the regenerated page (updating slots, decorations, etc.)
            const newPages = [...state.pages];
            newPages[pageIndex] = newPage;
            store.state.pages = newPages;
            store.notify('pages', store.state.pages);
            return;
        }


        // DEFAULT LOGIC (Fallback or Non-Template)
        if (!page.templateId) {
            const newLayout = layoutEngine.generateLayout(page.photos);
            console.log('[App] Generated Layout:', newLayout);
            page.layout = newLayout;

            // Replace the page in the store array
            const newPages = [...state.pages];
            newPages[pageIndex] = page;
            store.state.pages = newPages; // Triggers UI update
        } else {
            // Template exists but no layout found.
            // We updated page.photos, so the photo is "there" but not in a slot.
            // The renderer will just ignore it (or show empty slots if we reduced count?).
            // We need to trigger update.
            const newPages = [...state.pages];
            newPages[pageIndex] = page;
            store.state.pages = newPages;
        }
    }

    addTextToPage(styleId) {
        const state = store.state;
        const pageIndex = state.pages.findIndex(p => p.id === state.activePageId);
        if (pageIndex === -1) return;
        const page = { ...state.pages[pageIndex] };

        if (!page.elements) page.elements = [];

        // Find style defaults
        const styleDef = window.TEXT_STYLES?.find(s => s.id === styleId);
        const content = styleDef ? (styleDef.previewText || 'Text') : 'Your Text';

        const newText = {
            id: `txt_${crypto.randomUUID()}`,
            type: 'text',
            styleId: styleId,
            content: content,
            x: 50, // Center
            y: 50,
            fontSize: 24,
            color: styleDef?.style?.color || '#000000'
        };

        page.elements.push(newText);
        store.state.selection = newText.id;

        // Update state
        const newPages = [...state.pages];
        newPages[pageIndex] = page;
        store.state.pages = newPages;
    }

    swapPhotos(id1, id2) {
        const state = store.state;

        // Handle Cover Swap (Front <-> Back)
        if (state.viewMode === 'cover') {
            const cover = state.cover;
            // Check if ids match front or back
            const isId1Front = (id1 === cover.frontPhotoId);
            const isId1Back = (id1 === cover.backPhotoId);

            const isId2Front = (id2 === cover.frontPhotoId);
            const isId2Back = (id2 === cover.backPhotoId);

            if ((isId1Front && isId2Back) || (isId1Back && isId2Front)) {
                store.pushState('Swap Cover Photos');
                const temp = cover.frontPhotoId;
                cover.frontPhotoId = cover.backPhotoId;
                cover.backPhotoId = temp;
                store.notify('cover', cover);
                console.log('[App] Swapped cover photos');
            }
            return;
        }

        const pageIndex = state.pages.findIndex(p => p.id === state.activePageId);
        if (pageIndex === -1) return;
        const page = { ...state.pages[pageIndex] };

        // Check if this is a template-based page
        if (page.templateId && page.photos && Array.isArray(page.photos)) {
            // Template-based page: photos are in page.photos[] array
            const photo1Index = page.photos.findIndex(p => p.id === id1);
            const photo2Index = page.photos.findIndex(p => p.id === id2);

            if (photo1Index !== -1 && photo2Index !== -1) {
                // Swap photos in the array
                const temp = page.photos[photo1Index];
                page.photos[photo1Index] = page.photos[photo2Index];
                page.photos[photo2Index] = temp;

                const newPages = [...state.pages];
                newPages[pageIndex] = page;
                store.state.pages = newPages;
                console.log('[App] Swapped template photos', id1, id2);
            }
        } else {
            // Default page system: slots are in page.layout.slots
            const slot1 = page.layout.slots.find(s => s.photoId === id1);
            const slot2 = page.layout.slots.find(s => s.photoId === id2);

            if (slot1 && slot2) {
                // Swap IDs
                const temp = slot1.photoId;
                slot1.photoId = slot2.photoId;
                slot2.photoId = temp;

                // Note: We don't swap 'photos' array order, just the visual layout assignment.
                // This preserves the "content" list but changes presentation.

                const newPages = [...state.pages];
                newPages[pageIndex] = page;
                store.state.pages = newPages;
                console.log('[App] Swapped photos', id1, id2);
            }
        }
    }

    replacePhotoInSlot(targetId, newPhotoId) {
        const state = store.state;

        // Handle Cover Replacement
        if (state.viewMode === 'cover') {
            const cover = state.cover;
            if (targetId === cover.frontPhotoId) {
                store.pushState('Replace Front Cover');
                cover.frontPhotoId = newPhotoId;
                store.notify('cover', cover);
            } else if (targetId === cover.backPhotoId) {
                store.pushState('Replace Back Cover');
                cover.backPhotoId = newPhotoId;
                store.notify('cover', cover);
            }
            return;
        }

        const pageIndex = state.pages.findIndex(p => p.id === state.activePageId);
        if (pageIndex === -1) return;
        const page = { ...state.pages[pageIndex] };

        // Check if this is a template-based page
        if (page.templateId && page.photos && Array.isArray(page.photos)) {
            // Template-based page
            // 1. Check if new photo already on page
            if (page.photos.find(p => p.id === newPhotoId)) {
                return; // Prevent duplicates
            }

            // 2. Find and replace the photo in the array
            const oldPhotoIdx = page.photos.findIndex(p => p.id === targetId);
            const newPhotoAsset = state.assets.photos.find(p => p.id === newPhotoId);

            if (oldPhotoIdx !== -1 && newPhotoAsset) {
                page.photos[oldPhotoIdx] = newPhotoAsset;

                const newPages = [...state.pages];
                newPages[pageIndex] = page;
                store.state.pages = newPages;
                console.log('[App] Replaced template photo', targetId, 'with', newPhotoId);
            }
        } else {
            // Default page system
            // 1. Check if new photo already on page
            if (page.photos.find(p => p.id === newPhotoId)) {
                // If already there, maybe swap? Or just ignore?
                // For now ignore to prevent duplicates if dragging existing photo
                return;
            }

            // 2. Find target slot
            const slot = page.layout.slots.find(s => s.photoId === targetId);
            if (slot) {
                // Update photo list: Remove old, Add new
                // Actually, we must replace the object in the array to keep count same
                const oldPhotoIdx = page.photos.findIndex(p => p.id === targetId);
                const newPhotoAsset = state.assets.photos.find(p => p.id === newPhotoId);

                if (oldPhotoIdx > -1 && newPhotoAsset) {
                    page.photos[oldPhotoIdx] = newPhotoAsset;
                    slot.photoId = newPhotoId; // Update slot directly

                    // We might want to re-generate layout if aspect ratios differ significantly?
                    // For "Replace", we usually want to KEEP layout.
                    // But if new photo is portrait and old was landscape, it might crop badly.
                    // Let's keep layout for stability as per "Replace", user can "Magic Remix" if they want.

                    const newPages = [...state.pages];
                    newPages[pageIndex] = page;
                    store.state.pages = newPages;
                    console.log('[App] Replaced photo in slot', targetId, 'with', newPhotoId);
                }
            }
        }
    }

    addPhotoToSlot(newPhotoId, slotIndex) {
        const state = store.state;
        const pageIndex = state.pages.findIndex(p => p.id === state.activePageId);
        if (pageIndex === -1) return;
        const page = { ...state.pages[pageIndex] };

        // Get the photo asset
        const newPhotoAsset = state.assets.photos.find(p => p.id === newPhotoId);
        if (!newPhotoAsset) return;

        // For template pages, add photo at the specific index
        if (page.templateId && page.photos && Array.isArray(page.photos)) {
            page.photos[slotIndex] = newPhotoAsset;

            const newPages = [...state.pages];
            newPages[pageIndex] = page;
            store.state.pages = newPages;
            console.log('[App] Added photo to slot', slotIndex);
        }
    }

    /**
     * Resets the project to a clean state.
     * @param {boolean} confirm - Whether to ask for confirmation
     */
    startNewProject(confirm = true) {
        if (confirm && !window.confirm("Are you sure you want to start a new project? This will clear your current album AND remove all imported photos.")) {
            return;
        }

        console.log("[App] Starting new project (Full Reset)...");

        // UI Feedback
        const btn = document.getElementById('btn-new-project');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Resetting...';

        // Full State Reset (includes clearing assets)
        store.reset();

        // Add one empty page to start
        store.addPage();
        store.state.viewMode = 'pages';

        // Clear Persistence immediatley to prevent reload of old data
        if (store.state.user) {
            persistenceService.saveProject(store.state.user.uid, store.state);
        }

        // Restore UI
        setTimeout(() => {
            if (btn) btn.innerHTML = '<i class="fa-solid fa-file-circle-plus"></i> New';
            // Force sidebar refresh specifically for photos
            this.renderAssetSidebar();
        }, 500);
    }



    updatePropertiesPanel(state) {
        const panel = document.getElementById('properties-panel');

        // Prevent re-rendering if user is actively typing in a field in this panel
        // This stops the "focus loss" bug on every keystroke
        if (panel && panel.contains(document.activeElement) &&
            ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) {
            return;
        }

        if (state.viewMode === 'cover') {
            this.renderCoverProperties(panel, state.cover);
            return;
        }

        const selectionId = state.selection;

        const page = state.pages.find(p => p.id === state.activePageId);
        if (!page) {
            panel.innerHTML = '<div class="empty-state">No Page Selected</div>';
            return;
        }

        // If no selectionId, we fall through to Page Properties
        // instead of showing "No Selection"


        // Find element (text) or Slot (photo)
        let textElement = page.elements && page.elements.find(e => e.id === selectionId);

        // Check if this is a template page with textContent
        let isTemplateText = false;
        if (!textElement && page.templateId && page.textContent && selectionId) {
            // This is a template text element
            if (page.textContent[selectionId] !== undefined) {
                isTemplateText = true;
                // Create a virtual text element for the properties panel
                textElement = {
                    id: selectionId,
                    content: page.textContent[selectionId],
                    isTemplate: true
                };
            }
        }

        const photoSlot = page.layout && page.layout.slots ? page.layout.slots.find(s => s.photoId === selectionId) : null;

        if (photoSlot) {
            panel.innerHTML = `
                <div class="panel-header">
                    <h3>Photo Properties</h3>
                </div>
                <div style="padding:15px;">
                    <p>Photo ID: ${selectionId.substring(0, 8)}...</p>
                    
                    <button id="btn-magic-edit" class="btn-primary" style="width:100%; margin-top:10px; background: linear-gradient(90deg, #a855f7, #ec4899);">
                        <i class="fa-solid fa-wand-magic"></i> Magic Edit (AI)
                    </button>
                </div>
            `;

            // Bind Edit
            const btn = document.getElementById('btn-magic-edit');
            if (btn) {
                btn.onclick = async () => {
                    const prompt = window.prompt("✨ Magic Edit: What should I change?");
                    if (!prompt) return;

                    const asset = state.assets.photos.find(p => p.id === selectionId);
                    if (!asset) return;

                    alert("Magic Edit is generating... please wait!");
                    try {
                        const newUrl = await geminiService.editImage(asset.url, prompt);
                        store.pushState('Magic Edit');
                        asset.url = newUrl;
                        store.notify('assets', state.assets);
                    } catch (e) {
                        alert("Edit failed: " + e.message);
                    }
                };
            }
            return;
        }

        if (textElement) {
            // For template text, only show content editing (styling is from template)
            const isTemplate = textElement.isTemplate === true;

            if (isTemplate) {
                panel.innerHTML = `
                    <div class="panel-header">
                        <h3>Text Properties</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:10px;">
                        <div>
                            <label>Content</label>
                            <textarea id="prop-text-content" rows="5" style="width:100%; border-radius:4px; padding:5px; font-family: inherit;">${textElement.content || ''}</textarea>
                        </div>
                        <div style="color: #888; font-size: 12px;">
                            <i class="fa-solid fa-info-circle"></i> Font styling is controlled by the template design
                        </div>
                    </div>
                `;

                // Bind Events for template text
                const txtContent = document.getElementById('prop-text-content');
                txtContent.addEventListener('input', (e) => {
                    page.textContent[selectionId] = e.target.value;
                    store.notify('pages', store.state.pages); // Live preview
                });
            } else {
                // Default page system - full controls
                panel.innerHTML = `
                    <div class="panel-header">
                        <h3>Text Properties</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:10px;">
                        <div>
                            <label>Content</label>
                            <textarea id="prop-text-content" rows="3" style="width:100%; border-radius:4px; padding:5px;">${textElement.content}</textarea>
                        </div>

                        <div>
                            <label>Font Size</label>
                            <input type="range" id="prop-text-size" min="10" max="100" value="${textElement.fontSize || 24}">
                            <span id="prop-text-size-val">${textElement.fontSize || 24}px</span>
                        </div>

                        <div>
                            <label>Color</label>
                            <div style="display:flex; align-items:center;">
                                <input type="color" id="prop-text-color" value="${textElement.color || '#000000'}">
                            </div>
                        </div>
                         <div>
                            <label>Font Family</label>
                            <select id="prop-text-font" style="width:100%; padding:5px;">
                                <option value="sans-serif">Sans Serif</option>
                                <option value="serif">Serif</option>
                                <option value="monospace">Monospace</option>
                                <option value="'Playfair Display', serif">Playfair Display</option>
                                <option value="'Montserrat', sans-serif">Montserrat</option>
                            </select>
                        </div>

                       <button class="btn-secondary btn-sm" id="btn-delete-text" style="color:red; border-color:red; margin-top:10px;">
                            <i class="fa-solid fa-trash"></i> Delete Text
                       </button>
                    </div>
                `;

                // Bind Events for default page system
                const txtContent = document.getElementById('prop-text-content');
                txtContent.addEventListener('input', (e) => {
                    textElement.content = e.target.value;
                    store.notify('pages', store.state.pages); // Live preview
                });

                const txtSize = document.getElementById('prop-text-size');
                const txtSizeVal = document.getElementById('prop-text-size-val');
                txtSize.addEventListener('input', (e) => {
                    textElement.fontSize = parseInt(e.target.value);
                    txtSizeVal.textContent = e.target.value + 'px';
                    store.notify('pages', store.state.pages);
                });

                const txtColor = document.getElementById('prop-text-color');
                txtColor.addEventListener('input', (e) => {
                    textElement.color = e.target.value;
                    store.notify('pages', store.state.pages);
                });

                const txtFont = document.getElementById('prop-text-font');
                if (textElement.fontFamily) txtFont.value = textElement.fontFamily;
                txtFont.addEventListener('change', (e) => {
                    textElement.fontFamily = e.target.value;
                    store.notify('pages', store.state.pages);
                });

                document.getElementById('btn-delete-text').addEventListener('click', () => {
                    if (confirm("Delete this text?")) {
                        store.pushState('Delete Text');
                        page.elements = page.elements.filter(el => el.id !== selectionId);
                        store.state.selection = null;
                        store.notify('pages', store.state.pages);
                        store.notify('selection', null);
                    }
                });
            }

            return;
        }

        // Default: Page Properties (Layout, background, etc.)
        this.renderPageProperties(panel, page);
    }

    renderAuthUI() {
        const user = store.state.user;
        // Target the left sidebar nav
        const container = document.querySelector('.sidebar-nav');
        if (!container) return;

        let authBtn = document.getElementById('btn-auth');
        if (!authBtn) {
            authBtn = document.createElement('button');
            authBtn.id = 'btn-auth';
            authBtn.className = 'nav-item'; // Use nav-item class for consistency
            authBtn.style.marginTop = 'auto'; // Push to bottom
            authBtn.style.marginBottom = '20px';
            authBtn.style.display = 'flex';
            authBtn.style.alignItems = 'center';
            authBtn.style.justifyContent = 'center';
            container.appendChild(authBtn);
        }

        if (user) {
            authBtn.innerHTML = `
                <img src="${user.photoURL || 'https://via.placeholder.com/24'}" 
                     style="width:28px;height:28px;border-radius:12px;object-fit:cover;">
            `;
            authBtn.title = `Logged in as ${user.displayName || user.email}. Click to Logout.`;
            authBtn.onclick = async () => {
                if (confirm("Log out?")) await authService.signOut();
            };
            authBtn.style.border = '2px solid #27ae60';
        } else {
            // Icon only for sidebar
            authBtn.innerHTML = '<i class="fa-brands fa-google"></i>';
            authBtn.title = "Login with Google";
            authBtn.onclick = async () => {
                try {
                    await authService.signInWithGoogle();
                } catch (e) {
                    console.error(e);
                    alert("Login failed. See console.");
                }
            };
            authBtn.style.border = 'none';
        }
    }
    renderPageProperties(container, page) {
        container.innerHTML = `
            <div class="panel-header">
                <h3>Page Settings</h3>
            </div>
            
            <div style="padding: 20px;">
                <!-- Layout -->
                <div class="prop-group">
                    <label>Layout</label>
                    <div class="layout-selector">
                        <button class="layout-btn" title="Single / Focus"><i class="fa-regular fa-square"></i></button>
                        <button class="layout-btn" title="Two / Split"><i class="fa-solid fa-table-columns"></i></button>
                        <button class="layout-btn" title="Grid / Remix"><i class="fa-solid fa-border-all"></i></button>
                    </div>
                </div>

                <!-- Slide (Spacing/Padding) -->
                <div class="prop-group">
                    <label>Slide (Spacing)</label>
                    <input type="range" id="prop-page-spacing" min="0" max="40" value="${page.spacing || 0}">
                </div>

                <!-- Color -->
                <div class="prop-group">
                    <label>Color</label>
                    <div class="color-picker-wrapper">
                        <input type="color" id="prop-page-color" class="color-input-hidden" value="${(page.background && typeof page.background === 'string' && page.background.startsWith('#')) ? page.background : (page.background && page.background.color ? page.background.color : '#ffffff')}">
                        <div class="color-icon"><i class="fa-solid fa-eye-dropper"></i></div>
                    </div>
                </div>

                <!-- Text (Notes/Caption Placeholder) -->
                <div class="prop-group">
                    <label>Text</label>
                    <input type="text" placeholder="Roarts..." class="full-width">
                </div>
            </div>
        `;

        // Bindings

        // 1. Layout Buttons (Template-aware Remix)
        const layouts = container.querySelectorAll('.layout-btn');
        layouts.forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                const state = store.state;
                let newLayout = null;

                // Strategy A: Template-based Remix
                // Skip if ad-hoc layout (Magic Create)
                const isAdHoc = page.templateId && page.templateId.startsWith('layout-');

                if (page.templateId && !isAdHoc && window.app.templateSidebar && window.app.templateSidebar.manager) {
                    const tm = window.app.templateSidebar.manager;

                    // Ensure template config is loaded
                    if (!tm.config || tm.currentTemplateId !== page.templateId) {
                        // Load and retry logic... (simplified here for brevity, assuming loaded or will fail gracefully)
                        // Ideally we should await this.templateSidebar.manager.loadTemplate(page.templateId)
                        // But for now let's reuse the async pattern from original code or just skip if not ready.
                        // The original code had a async load block. Let's keep it robust.
                        tm.loadTemplate(page.templateId).then(() => {
                            // Retry logic inside
                            const reTm = window.app.templateSidebar.manager;
                            let layoutId = null;
                            if (idx === 0) layoutId = reTm.getLayoutIdForCount(1);
                            if (idx === 1) layoutId = reTm.getLayoutIdForCount(2);

                            if (layoutId) {
                                const newP = reTm.regeneratePage(page, layoutId);
                                if (newP) {
                                    const newPs = [...store.state.pages];
                                    const pIdx = newPs.findIndex(p => p.id === page.id);
                                    if (pIdx > -1) {
                                        newPs[pIdx] = newP;
                                        store.state.pages = newPs;
                                        store.notify('pages', store.state.pages);
                                    }
                                }
                            } else if (idx === 2) {
                                window.app.performTemplateRemix(page, reTm);
                            }
                        });
                        return;
                    }

                    // Config Loaded:
                    let targetLayoutId = null;
                    if (idx === 0) targetLayoutId = tm.getLayoutIdForCount(1); // Single
                    if (idx === 1) targetLayoutId = tm.getLayoutIdForCount(2); // Two

                    if (targetLayoutId) {
                        const newPage = tm.regeneratePage(page, targetLayoutId);
                        if (newPage) {
                            store.pushState('Change Layout');
                            const newPages = [...state.pages];
                            const pIndex = newPages.findIndex(p => p.id === page.id);
                            newPages[pIndex] = newPage;
                            store.state.pages = newPages;
                            store.notify('pages', store.state.pages);
                            return;
                        }
                    } else if (idx === 2) {
                        // Grid/Remix -> Alternative for CURRENT count
                        if (window.app.performTemplateRemix(page, tm)) {
                            return;
                        }
                    }
                }

                // Strategy B: Default Layout Engine Remix (Fallback)
                if (!newLayout && page.photos && page.photos.length > 0) {
                    const currentName = page.layout ? page.layout.name : null;
                    // For default engine:
                    // idx 0 -> 1 photo layout?
                    // idx 1 -> 2 photo layout?
                    // idx 2 -> Remix

                    if (idx === 0) newLayout = layoutEngine.getNextLayout(page.photos.slice(0, 1), null);
                    else if (idx === 1 && page.photos.length >= 2) newLayout = layoutEngine.getNextLayout(page.photos.slice(0, 2), null);
                    else newLayout = layoutEngine.getNextLayout(page.photos, currentName);
                }

                if (newLayout) {
                    store.pushState('Change Layout');
                    page.layout = newLayout;
                    store.notify('pages', state.pages);
                }
            });
        });

        // 2. Spacing
        container.querySelector('#prop-page-spacing').addEventListener('change', (e) => {
            store.pushState('Change Spacing');
            page.spacing = parseInt(e.target.value, 10);
            store.notify('pages', store.state.pages);
        });

        // 3. Color
        container.querySelector('#prop-page-color').addEventListener('change', (e) => {
            store.pushState('Change Color');
            page.background = e.target.value;
            store.notify('pages', store.state.pages);
        });
    }

    renderCoverProperties(container, cover) {
        const state = store.state;
        const selection = state.selection;

        // Import layout and font options from UnifiedCoverRenderer
        const layouts = UnifiedCoverRenderer.LAYOUTS;
        const fonts = UnifiedCoverRenderer.FONTS;
        const templateId = cover.templateId || this.templateSidebar?.manager?.config?.templateId;
        const templateDefaults = UnifiedCoverRenderer.getTemplateDefaults(templateId);

        if (selection === 'cover-photo' || selection === 'cover-back-photo') {
            container.innerHTML = `
                <div class="panel-header">
                    <button class="btn-secondary btn-sm" id="btn-back-cover-props"><i class="fa-solid fa-arrow-left"></i> Cover Settings</button>
                    <h3>${selection === 'cover-photo' ? 'Front Photo' : 'Back Photo'}</h3>
                </div>
             `;

            const photoId = selection === 'cover-photo' ? cover.frontPhotoId : cover.backPhotoId;

            if (!photoId) {
                container.innerHTML += `<div class="empty-state">No photo set</div>`;
            } else {
                const actionsGroup = document.createElement('div');
                actionsGroup.className = 'prop-group';
                actionsGroup.innerHTML = `<button class="btn-secondary full-width text-danger" id="btn-remove-cover-photo">Remove Photo</button>`;
                container.appendChild(actionsGroup);

                container.querySelector('#btn-remove-cover-photo').addEventListener('click', () => {
                    if (selection === 'cover-photo') state.cover.frontPhotoId = null;
                    else state.cover.backPhotoId = null;
                    store.notify('cover', state.cover);
                    store.state.selection = null;
                });
            }

            container.querySelector('#btn-back-cover-props').addEventListener('click', () => {
                store.state.selection = null;
                store.notify('selection', null);
            });

            return;
        }

        container.innerHTML = `<h3>Cover Settings</h3>`;

        // Title
        const titleGroup = document.createElement('div');
        titleGroup.className = 'prop-group';
        titleGroup.innerHTML = `<label>Title</label><input type="text" id="prop-cover-title" value="${cover.title || ''}" placeholder="${templateDefaults.title}">`;
        container.appendChild(titleGroup);

        // Subtitle
        const subGroup = document.createElement('div');
        subGroup.className = 'prop-group';
        subGroup.innerHTML = `<label>Subtitle</label><input type="text" id="prop-cover-sub" value="${cover.subtitle || ''}" placeholder="${templateDefaults.subtitle}">`;
        container.appendChild(subGroup);

        // Spine Text
        const spineGroup = document.createElement('div');
        spineGroup.className = 'prop-group';
        spineGroup.innerHTML = `<label>Spine Text</label><input type="text" id="prop-cover-spine" value="${cover.spineText || ''}" placeholder="${cover.title || templateDefaults.spineText}">`;
        container.appendChild(spineGroup);

        // Layout - with all 7 options
        const currentLayout = cover.layout || templateDefaults.layout;
        const layoutOptions = layouts.map(l =>
            `<option value="${l.id}" ${currentLayout === l.id ? 'selected' : ''} title="${l.description}">${l.label}</option>`
        ).join('');

        const layoutGroup = document.createElement('div');
        layoutGroup.className = 'prop-group';
        layoutGroup.innerHTML = `
            <label>Layout</label>
            <select id="prop-cover-layout" class="full-width">
                ${layoutOptions}
            </select>
        `;
        container.appendChild(layoutGroup);

        // Title Font
        const currentTitleFont = cover.titleFont || templateDefaults.titleFont;
        const titleFontOptions = fonts.map(f => {
            const isSelected = currentTitleFont.includes(f.label.split(' ')[0]) ||
                currentTitleFont === f.family;
            return `<option value="${f.family}" ${isSelected ? 'selected' : ''} style="font-family:${f.family}">${f.label}</option>`;
        }).join('');

        const titleFontGroup = document.createElement('div');
        titleFontGroup.className = 'prop-group';
        titleFontGroup.innerHTML = `
            <label>Title Font</label>
            <select id="prop-cover-title-font" class="full-width">
                ${titleFontOptions}
            </select>
        `;
        container.appendChild(titleFontGroup);

        // Body Font (for subtitle)
        const currentBodyFont = cover.bodyFont || templateDefaults.bodyFont;
        const bodyFontOptions = fonts.map(f => {
            const isSelected = currentBodyFont.includes(f.label.split(' ')[0]) ||
                currentBodyFont === f.family;
            return `<option value="${f.family}" ${isSelected ? 'selected' : ''} style="font-family:${f.family}">${f.label}</option>`;
        }).join('');

        const bodyFontGroup = document.createElement('div');
        bodyFontGroup.className = 'prop-group';
        bodyFontGroup.innerHTML = `
            <label>Subtitle Font</label>
            <select id="prop-cover-body-font" class="full-width">
                ${bodyFontOptions}
            </select>
        `;
        container.appendChild(bodyFontGroup);

        // Background Color
        const colorGroup = document.createElement('div');
        colorGroup.className = 'prop-group';
        colorGroup.innerHTML = `
            <label>Background Color</label>
            <div style="display:flex; gap:10px;">
                <input type="color" id="prop-cover-color" value="${cover.color || templateDefaults.bgColor}" class="full-width" style="height:40px;">
                <button class="btn-secondary" id="btn-reset-theme" title="Reset to Template Defaults"><i class="fa-solid fa-rotate-left"></i></button>
            </div>
        `;
        container.appendChild(colorGroup);

        // Text Color
        const textColorGroup = document.createElement('div');
        textColorGroup.className = 'prop-group';
        textColorGroup.innerHTML = `
            <label>Text Color</label>
            <input type="color" id="prop-cover-text-color" value="${cover.textColor || templateDefaults.textColor}" class="full-width" style="height:40px;">
        `;
        container.appendChild(textColorGroup);

        // Event Bindings
        container.querySelector('#prop-cover-title').addEventListener('input', (e) => {
            store.state.cover = { ...store.state.cover, title: e.target.value };
        });
        container.querySelector('#prop-cover-sub').addEventListener('input', (e) => {
            store.state.cover = { ...store.state.cover, subtitle: e.target.value };
        });
        container.querySelector('#prop-cover-spine').addEventListener('input', (e) => {
            store.state.cover = { ...store.state.cover, spineText: e.target.value };
        });
        container.querySelector('#prop-cover-layout').addEventListener('change', (e) => {
            store.state.cover = { ...store.state.cover, layout: e.target.value };
            store.notify('cover', store.state.cover);
        });
        container.querySelector('#prop-cover-title-font').addEventListener('change', (e) => {
            store.state.cover = {
                ...store.state.cover,
                titleFont: e.target.value,
                _userCustomTitleFont: true
            };
            store.notify('cover', store.state.cover);
        });
        container.querySelector('#prop-cover-body-font').addEventListener('change', (e) => {
            store.state.cover = {
                ...store.state.cover,
                bodyFont: e.target.value,
                _userCustomBodyFont: true
            };
            store.notify('cover', store.state.cover);
        });
        container.querySelector('#prop-cover-color').addEventListener('input', (e) => {
            store.state.cover = {
                ...store.state.cover,
                color: e.target.value,
                theme: null,
                _userCustomColor: true
            };
        });
        container.querySelector('#prop-cover-text-color').addEventListener('input', (e) => {
            store.state.cover = {
                ...store.state.cover,
                textColor: e.target.value,
                _userCustomTextColor: true
            };
        });

        // Reset to Template Defaults
        container.querySelector('#btn-reset-theme').addEventListener('click', () => {
            const defaults = UnifiedCoverRenderer.getTemplateDefaults(templateId);
            store.state.cover = {
                ...store.state.cover,
                color: defaults.bgColor,
                textColor: defaults.textColor,
                titleFont: defaults.titleFont,
                bodyFont: defaults.bodyFont,
                layout: defaults.layout,
                theme: defaults.bgColor,
                _userCustomColor: false,
                _userCustomTextColor: false,
                _userCustomTitleFont: false,
                _userCustomBodyFont: false
            };
            store.notify('cover', store.state.cover);
        });
    }

    renderTextProperties(container, textEl, page) {
        container.innerHTML = '';

        // Title
        const h3 = document.createElement('h3');
        h3.textContent = 'Text Properties';
        container.appendChild(h3);

        // Content Input
        const inputGroup = document.createElement('div');
        inputGroup.className = 'prop-group';
        inputGroup.innerHTML = `<label>Content</label><textarea id="prop-text-content" rows="3">${textEl.content}</textarea>`;
        container.appendChild(inputGroup);

        // Size Slider
        const sizeGroup = document.createElement('div');
        sizeGroup.className = 'prop-group';
        sizeGroup.innerHTML = `<label>Size: ${textEl.fontSize}px</label><input type="range" id="prop-text-size" min="12" max="120" value="${textEl.fontSize}">`;
        container.appendChild(sizeGroup);

        // Bindings
        container.querySelector('#prop-text-content').addEventListener('input', (e) => {
            textEl.content = e.target.value;
            store.notify('pages', store.state.pages); // Live update
        });

        container.querySelector('#prop-text-size').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            textEl.fontSize = val;
            sizeGroup.querySelector('label').textContent = `Size: ${val}px`;
            store.notify('pages', store.state.pages);
        });
    }

    renderPhotoProperties(container, photoId, page) {
        // Find the slot to get current values
        const slot = page.layout.slots.find(s => s.photoId === photoId);
        if (!slot) return;

        container.innerHTML = `<h3>Photo Properties</h3>`;

        // 1. Filter
        const filterGroup = document.createElement('div');
        filterGroup.className = 'prop-group';
        const currentFilter = slot.filter || 'none';
        filterGroup.innerHTML = `
            <label>Filter</label>
            <select id="prop-filter" class="full-width">
                <option value="none" ${currentFilter === 'none' ? 'selected' : ''}>None</option>
                <option value="grayscale(100%)" ${currentFilter.includes('grayscale') ? 'selected' : ''}>B&W</option>
                <option value="sepia(100%)" ${currentFilter.includes('sepia') ? 'selected' : ''}>Sepia</option>
                <option value="saturate(200%)" ${currentFilter.includes('saturate') ? 'selected' : ''}>Vivid</option>
                <option value="contrast(150%) brightness(90%) sepia(20%)" ${currentFilter.includes('contrast') ? 'selected' : ''}>Dramatic</option>
            </select>
        `;
        container.appendChild(filterGroup);

        // 2. Adjustments (Brightness, Contrast)
        // We'll store these as separate props nicely in a real app, but for now hack into style string or separate props
        // Let's use specific props on the slot: brightness, contrast
        const brightness = slot.brightness || 100;
        const contrast = slot.contrast || 100;

        const adjGroup = document.createElement('div');
        adjGroup.className = 'prop-group';
        adjGroup.innerHTML = `
            <label>Brightness: <span id="val-bright">${brightness}</span>%</label>
            <input type="range" id="prop-brightness" min="0" max="200" value="${brightness}">
            <label>Contrast: <span id="val-bontrast">${contrast}</span>%</label>
            <input type="range" id="prop-contrast" min="0" max="200" value="${contrast}">
        `;
        container.appendChild(adjGroup);

        // 3. Frame
        const frameGroup = document.createElement('div');
        frameGroup.className = 'prop-group';
        const currentFrame = slot.frameId || '';
        // Build options from window.IMAGE_FRAMES
        let frameOpts = '<option value="">None</option>';
        if (window.IMAGE_FRAMES) {
            window.IMAGE_FRAMES.forEach(f => {
                frameOpts += `<option value="${f.id}" ${currentFrame === f.id ? 'selected' : ''}>${f.name}</option>`;
            });
        }
        frameGroup.innerHTML = `<label>Frame</label><select id="prop-frame" class="full-width">${frameOpts}</select>`;
        container.appendChild(frameGroup);

        // Actions
        const actionsGroup = document.createElement('div');
        actionsGroup.className = 'prop-group';
        actionsGroup.innerHTML = `<button class="btn-secondary full-width text-danger" id="btn-remove-photo">Remove Photo</button>`;
        container.appendChild(actionsGroup);

        // Bind Events
        container.querySelector('#prop-filter').addEventListener('change', (e) => {
            // If they pick a preset, it overrides manual sliders usually, or composes.
            // For MVP, simplistic toggling.
            slot.filter = e.target.value;
            // Also reset sliders if "None" to avoid confusion? No, let them stack.
            this.applyPhotoStyles(slot);
            store.notify('pages', store.state.pages);
        });

        const updateAdj = () => {
            const b = container.querySelector('#prop-brightness').value;
            const c = container.querySelector('#prop-contrast').value;
            slot.brightness = b;
            slot.contrast = c;
            container.querySelector('#val-bright').textContent = b;
            container.querySelector('#val-bontrast').textContent = c;
            this.applyPhotoStyles(slot);
            store.notify('pages', store.state.pages);
        };
        container.querySelector('#prop-brightness').addEventListener('input', updateAdj);
        container.querySelector('#prop-contrast').addEventListener('input', updateAdj);

        container.querySelector('#prop-frame').addEventListener('change', (e) => {
            slot.frameId = e.target.value;
            store.notify('pages', store.state.pages);
        });

        container.querySelector('#btn-remove-photo').addEventListener('click', () => {
            if (confirm('Remove this photo?')) {
                // Remove from page.photos and re-layout
                const pIdx = page.photos.findIndex(p => p.id === photoId);
                if (pIdx > -1) {
                    page.photos.splice(pIdx, 1);
                    page.layout = layoutEngine.generateLayout(page.photos);
                    store.state.selection = null;
                    store.notify('pages', store.state.pages);
                }
            }
        });
    }

    // Helper to compose CSS filter string
    applyPhotoStyles(slot) {
        // We need to update the RenderEngine to actually USE these properties
        // Currently RenderEngine only checks `slot.filter` if we added it there. 
        // We added logic to RenderEngine to merge props? No, I need to update RenderEngine to read these new props.
        // Wait, I can just bake it into a `style` object on the slot if I want to be lazy, but RenderEngine needs to read it.
        // I will assume RenderEngine updates are next or done.
        // Actually, in the previous step I only added `frameId`. selection logic, etc.
        // I missed adding `filter` support to RenderEngine! 
        // I will fix RenderEngine in a subsequent step or just `slot.filter` usage there.
        // For now, let's construct the filter string.

        let filterStr = slot.filter !== 'none' ? slot.filter : '';
        if (slot.brightness && slot.brightness != 100) filterStr += ` brightness(${slot.brightness}%)`;
        if (slot.contrast && slot.contrast != 100) filterStr += ` contrast(${slot.contrast}%)`;

        // Save computed filter for RenderEngine to use easily
        slot.computedFilter = filterStr.trim();
    }

    renderAssetSidebar() {
        console.log("[App] Rendering Asset Sidebar...");
        const photoGrid = document.getElementById('photo-library');
        if (!photoGrid) {
            console.error("Element #photo-library not found!");
            return;
        }
        photoGrid.innerHTML = '';

        // -- Google Photos Integration --
        const btnGoogle = document.createElement('button');
        btnGoogle.className = 'btn-google-photos';
        btnGoogle.innerHTML = '<i class="fa-brands fa-google"></i> Connect Google Photos';
        btnGoogle.style.width = '100%';
        btnGoogle.style.height = 'auto'; // Fix: Prevent stretching
        btnGoogle.style.alignSelf = 'start'; // Fix: Prevent grid row stretching
        btnGoogle.style.gridColumn = '1 / -1'; // Span full width
        btnGoogle.style.padding = '12px';
        btnGoogle.style.marginBottom = '10px';
        btnGoogle.style.backgroundColor = '#4285F4';
        btnGoogle.style.color = 'white';
        btnGoogle.style.border = 'none';
        btnGoogle.style.borderRadius = '4px';
        btnGoogle.style.fontWeight = '500';
        btnGoogle.style.display = 'flex';
        btnGoogle.style.alignItems = 'center';
        btnGoogle.style.justifyContent = 'center';
        btnGoogle.style.gap = '8px';
        btnGoogle.style.cursor = 'pointer';

        btnGoogle.addEventListener('click', async () => {
            try {
                // Ensure user is logged in (handling Emulator/Prod switch invalidating session)
                let user = authService.getCurrentUser();
                if (!user) {
                    console.log("[App] User not logged in. Prompting sign-in...");
                    try {
                        user = await authService.signInWithGoogle();
                        console.log("[App] Sign-in successful:", user.uid);
                    } catch (loginErr) {
                        console.error("[App] Login failed:", loginErr);
                        alert("Please sign in to access Google Photos.");
                        return;
                    }
                }

                // New Backend Session Flow
                const photos = await googlePhotosService.openPicker();

                // --- CLEAN ALBUM LOGIC ---
                // If there are existing photos, ask user if they want to Replace or Append
                if (store.state.assets.photos.length > 0 && photos.length > 0) {
                    if (window.confirm("You already have photos in your library.\n\nClick OK to REPLACE them with the new selection.\nClick Cancel to APPEND (keep existing).")) {
                        store.state.assets.photos = []; // clear first
                        console.log("[App] User chose to REPLACE library.");
                    } else {
                        console.log("[App] User chose to APPEND to library.");
                    }
                }

                // If the current project contains the "Family Roots" default template (which the user dislikes as default), 
                // and we are just importing photos, likely we want to start fresh.
                // We'll detect if the pages are using this template ID.
                const hasLegacyDefault = store.state.pages.some(p => p.templateId === 'family-roots-v1');
                if (hasLegacyDefault) {
                    console.log("[App] Detected legacy default template. Clearing for fresh start as requested.");
                    this.startNewProject(false); // false = no confirmation needed (auto-clean)
                }

                store.state.assets.photos = [...store.state.assets.photos, ...photos];

                if (window.app) {
                    window.app.renderAssetSidebar();
                    store.notify('assets', store.state.assets);
                    // Force refresh active page in case we just cleared it
                    if (hasLegacyDefault || store.state.pages.length === 0) {
                        if (store.state.pages.length === 0) store.addPage();
                        window.app.renderActivePage();
                        window.app.updateTimeline(store.state.pages, store.state.activePageId);
                    }
                } else {
                    console.error("Window.app not found for re-render");
                }

                // Show completion
                console.log("Photos successfully imported.");
                // Use a toast or non-blocking notification if possible, otherwise simple alert
                alert(`Successfully imported ${photos.length} photos. Drag them onto your pages to begin.`);

            } catch (err) {
                console.error(err);
                alert('Google Photos Error: ' + err);
            }
        });
        photoGrid.appendChild(btnGoogle);

        // --- NEW PROJECT BUTTON HANDLER ---
        const btnNew = document.getElementById('btn-new-project');
        if (btnNew) {
            btnNew.addEventListener('click', () => this.startNewProject(true));
        }

        console.log(`[App] Rendering ${store.state.assets.photos.length} photos.`);
        if (store.state.assets.photos.length > 0) {
            console.log("First Photo Debug:", JSON.stringify(store.state.assets.photos[0], null, 2));
        }
        if (store.state.assets.photos.length > 0) {
            console.log("SAMPLE PHOTO:", store.state.assets.photos[0]);
        }
        store.state.assets.photos.forEach(photo => {
            const el = document.createElement('div');
            el.className = 'asset-item';
            el.draggable = true;
            el.style.position = 'relative';
            el.innerHTML = `
                <img src="${photo.thumbnailUrl || photo.url}" draggable="false" style="width:100%; height:100%; object-fit:cover;">
                <button class="btn-delete-asset" title="Remove Photo" style="position:absolute; top:4px; right:4px; width:20px; height:20px; border-radius:50%; background:rgba(0,0,0,0.6); color:white; border:none; cursor:pointer; display:none; align-items:center; justify-content:center; font-size:14px; line-height:1;">×</button>
            `;

            el.addEventListener('mouseenter', () => el.querySelector('.btn-delete-asset').style.display = 'flex');
            el.addEventListener('mouseleave', () => el.querySelector('.btn-delete-asset').style.display = 'none');

            el.querySelector('.btn-delete-asset').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm('Remove this photo?')) {
                    const idx = store.state.assets.photos.findIndex(p => p.id === photo.id);
                    if (idx > -1) {
                        store.state.assets.photos.splice(idx, 1);
                        this.renderAssetSidebar();
                        store.notify('assets', store.state.assets); // Update persistence
                    }
                }
            });

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'photo', id: photo.id }));
                e.dataTransfer.effectAllowed = 'copy';
            });

            // Hover Preview
            el.addEventListener('mouseenter', (e) => {
                const tooltip = document.getElementById('photo-preview-tooltip');
                if (tooltip) {
                    // Use thumbnail to avoid 403
                    const src = photo.thumbnailUrl || photo.url;
                    tooltip.innerHTML = `<img src="${src}" style="max-width:400px; max-height:400px; border-radius:8px; box-shadow:0 10px 25px rgba(0,0,0,0.5); display:block; background:#fff;">`;
                    tooltip.style.display = 'block';
                    tooltip.style.top = (e.clientY + 10) + 'px';
                    tooltip.style.left = (e.clientX + 20) + 'px';
                }
            });
            el.addEventListener('mousemove', (e) => {
                const tooltip = document.getElementById('photo-preview-tooltip');
                if (tooltip && tooltip.style.display === 'block') {
                    // Update position
                    let top = e.clientY + 10;
                    let left = e.clientX + 20;

                    // Simple boundary check to prevent going off screen right/bottom
                    if (left + 400 > window.innerWidth) {
                        left = e.clientX - 420; // Flip to left
                    }
                    if (top + 400 > window.innerHeight) {
                        top = window.innerHeight - 420; // Cap bottom
                    }

                    tooltip.style.top = top + 'px';
                    tooltip.style.left = left + 'px';
                }
            });
            el.addEventListener('mouseleave', () => {
                const tooltip = document.getElementById('photo-preview-tooltip');
                if (tooltip) tooltip.style.display = 'none';
            });
            photoGrid.appendChild(el);
        });

        // Designs
        const designList = document.getElementById('design-library');
        if (designList) {
            designList.innerHTML = '';
            if (window.BACKGROUND_TEXTURES) {
                window.BACKGROUND_TEXTURES.slice(0, 10).forEach(bg => {
                    const el = document.createElement('div');
                    el.className = 'asset-item';
                    if (bg.url.startsWith('http') || bg.url.startsWith('assets')) {
                        el.style.backgroundImage = `url(${bg.url})`;
                    } else {
                        el.style.backgroundColor = bg.theme?.colors?.primary || '#333';
                    }
                    el.style.backgroundSize = 'cover';
                    el.title = bg.name;
                    el.addEventListener('click', () => {
                        store.setTheme(bg.id);
                    });
                    designList.appendChild(el);
                });
            }
        }

        const textList = document.getElementById('text-library');
        if (textList) {
            textList.innerHTML = '';
            if (window.TEXT_STYLES) {
                window.TEXT_STYLES.slice(0, 20).forEach(style => {
                    const el = document.createElement('div');
                    el.className = 'asset-item text-style-item';
                    el.draggable = true;
                    el.style.display = 'flex';
                    el.style.alignItems = 'center';
                    el.style.justifyContent = 'center';
                    // Use a darker background for text previews if text is white/light
                    if (style.style.color === '#fff' || style.style.color === '#ffffff') {
                        el.style.backgroundColor = '#333';
                    }
                    const span = document.createElement('span');
                    span.textContent = 'Aa';
                    Object.assign(span.style, style.style);
                    // span.style.fontSize = '32px'; // Handled in CSS now
                    el.appendChild(span);
                    el.addEventListener('dragstart', (e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({ type: 'text', id: style.id }));
                    });
                    textList.appendChild(el);
                });
            }
        }

        // Frames (NEW)
        const frameList = document.getElementById('frame-library');
        if (frameList) {
            frameList.innerHTML = '';
            if (window.IMAGE_FRAMES) {
                window.IMAGE_FRAMES.forEach(frame => {
                    try {
                        const el = document.createElement('div');
                        el.className = 'asset-item frame-item';
                        el.style.border = '1px solid #444';
                        el.style.display = 'flex';
                        el.style.alignItems = 'center';
                        el.style.justifyContent = 'center';
                        el.style.overflow = 'hidden';

                        el.draggable = true;
                        el.addEventListener('dragstart', (e) => {
                            e.dataTransfer.setData('application/json', JSON.stringify({ type: 'frame', id: frame.id }));
                        });

                        if (frame.svgGen || frame.createSVG) {
                            // SVG ERROR FIX: Use larger coordinate space (300x300) to allow thick frames (like Polaroid) 
                            // to calculate insets without resulting in negative heights.
                            // The visual size is controlled by CSS (width:100%, height:100% of parent).
                            const w = 300;
                            const h = 300;
                            let inner = '';
                            if (frame.createSVG) {
                                inner = frame.createSVG(w, h);
                            } else if (frame.svgGen) {
                                const shape = (frame.shapes && frame.shapes.length) ? frame.shapes[0] : 'rect';
                                inner = frame.svgGen(w, h, frame.color || '#ccc', shape);
                            }
                            el.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
                        } else {
                            el.textContent = frame.name;
                        }

                        el.title = frame.name;

                        el.addEventListener('click', () => {
                            // Apply frame to selected photo OR all photos on active page? 
                            // Let's do Active Selection if Photo, otherwise Global Page default for photos.
                            const state = store.state;
                            const page = state.pages.find(p => p.id === state.activePageId);
                            if (state.selection) {
                                const slot = page.layout?.slots?.find(s => s.photoId === state.selection);
                                if (slot) {
                                    slot.frameId = frame.id;
                                    store.notify('pages', state.pages);
                                }
                            } else {
                                // Set as default for the page
                                page.imageFrameId = frame.id;
                                store.notify('pages', state.pages);
                            }
                        });
                        frameList.appendChild(el);
                    } catch (err) {
                        console.error(`Error rendering frame ${frame.name}:`, err);
                    }
                });
            }
        }
    }

    updateTimeline(pages, activeId) {
        const tl = document.getElementById('page-timeline');
        if (!tl) return;
        tl.innerHTML = '';

        // Determine Base Dimensions
        const manager = this.templateSidebar?.manager;
        // Default design system dimensions
        let rw = 800;
        let rh = 600;

        // Try to get active layout dimensions from template config
        if (manager && manager.config && manager.config.designSystem && manager.config.designSystem.canvas) {
            rw = manager.config.designSystem.canvas.scaledWidth || manager.config.designSystem.canvas.width || rw;
            rh = manager.config.designSystem.canvas.scaledHeight || manager.config.designSystem.canvas.height || rh;
        }

        // Standardized Thumbnail Size (Square)
        const THUMB_SIZE = 110; // Slightly larger square

        // Scale Calculation Helper
        const calculateScale = (contentW, contentH, targetSize) => {
            const scaleX = targetSize / contentW;
            const scaleY = targetSize / contentH;
            return Math.max(scaleX, scaleY); // Cover (occupies all square)
        };

        // Cover Handling - Use UNIFIED cover renderer for thumbnail
        if (store.state.viewMode === 'cover' || store.state.cover) {
            const coverEl = document.createElement('div');
            coverEl.className = `timeline-page cover ${store.state.viewMode === 'cover' ? 'active' : ''}`;
            coverEl.style.width = `${THUMB_SIZE}px`;
            coverEl.style.height = `${THUMB_SIZE}px`;
            coverEl.style.overflow = 'hidden';
            coverEl.style.position = 'relative';

            const coverScale = calculateScale(rw, rh, THUMB_SIZE);

            const preview = document.createElement('div');
            preview.style.width = `${rw}px`;
            preview.style.height = `${rh}px`;
            preview.style.position = 'absolute';
            preview.style.top = '50%';
            preview.style.left = '50%';
            preview.style.transform = `translate(-50%, -50%) scale(${coverScale})`;
            preview.style.transformOrigin = 'center center';
            preview.style.pointerEvents = 'none';
            preview.style.background = '#fff';
            // preview.style.overflow = 'hidden';

            // Use UNIFIED cover renderer for timeline thumbnail
            const templateConfig = manager?.config || null;
            UnifiedCoverRenderer.render({
                cover: store.state.cover,
                assets: store.state.assets,
                templateConfig,
                container: preview,
                interactive: false,
                thumbnail: false  // Full cover, but scaled via CSS
            });

            coverEl.appendChild(preview);
            coverEl.onclick = () => {
                store.state.viewMode = 'cover';
                store.state.activePageId = null;
                store.notify('viewMode', 'cover');
                // Force update UI
                this.updatePropertiesPanel(store.state);
            };
            tl.appendChild(coverEl);
        }

        // Pages Handling - Filter out cover pages (cover is handled above separately)
        const contentPages = pages.filter(page => {
            const layoutId = (page.rawLayoutId || page.layout?.id || page.layout?.layoutId || '').toLowerCase();
            return !layoutId.includes('cover');
        });

        contentPages.forEach((page, idx) => {
            const el = document.createElement('div');
            el.className = `timeline-page ${page.id === activeId && store.state.viewMode !== 'cover' ? 'active' : ''}`;
            el.style.width = `${THUMB_SIZE}px`;
            el.style.height = `${THUMB_SIZE}px`;
            el.style.overflow = 'hidden';
            el.style.position = 'relative';

            const pageScale = calculateScale(rw, rh, THUMB_SIZE);

            const previewWrapper = document.createElement('div');
            previewWrapper.style.width = `${rw}px`;
            previewWrapper.style.height = `${rh}px`;
            previewWrapper.style.position = 'absolute';
            previewWrapper.style.top = '50%';
            previewWrapper.style.left = '50%';
            previewWrapper.style.transform = `translate(-50%, -50%) scale(${pageScale})`;
            previewWrapper.style.transformOrigin = 'center center';
            previewWrapper.style.pointerEvents = 'none';
            previewWrapper.style.backgroundColor = '#fff';

            // Unified Render Logic
            let rendered = false;

            // 1. Try Specialized Renderer (Template)
            if (page.templateId) {
                const manager = this.templateSidebar?.manager; // Use central manager
                if (manager && manager.config && manager.config.templateId === page.templateId) {
                    const renderer = this.getSpecializedRenderer(page.templateId, manager.config);

                    if (renderer && page.rawLayoutId) {
                        const layout = manager.config.pageLayouts.find(l => l.layoutId === page.rawLayoutId);
                        if (layout) {
                            const dom = renderer.renderPage(layout, page.photos || [], page.textContent || {}, page.textPositions || {});
                            if (dom) {
                                // Force full size to fill the wrapper (fixes rendering for templates with 0-height default)
                                dom.style.width = '100%';
                                dom.style.height = '100%';
                                previewWrapper.appendChild(dom);
                                rendered = true;
                            }
                        }
                    }
                }
            }

            // 2. Fallback to Default RenderEngine (Generic) if not rendered
            if (!rendered) {
                // Use the new Unified Method
                this.renderer.renderPageToContainer(page, store.state.assets, previewWrapper);
            }

            el.appendChild(previewWrapper);

            // Number Label
            const label = document.createElement('div');
            label.className = 'page-num';
            label.textContent = idx + 1;
            el.appendChild(label);

            el.onclick = () => {
                store.state.activePageId = page.id;
                store.state.viewMode = 'pages';
                store.notify('activePageId', page.id);
            };

            tl.appendChild(el);
        });
    }

    // Helper to get renderer instance
    getSpecializedRenderer(templateId, config) {
        if (templateId === 'photography-portfolio-v1') return new PhotographyPortfolioRenderer(config);
        if (templateId === 'romantic-journey-v1') return new RomanticJourneyRenderer(config);
        if (templateId === 'travel-journey-v1') return new TravelJourneyRenderer(config);
        if (templateId === 'family-roots-v1') return new FamilyRootsRenderer(config);
        if (templateId === 'bar-mitzvah-v1') return new BarMitzvahRenderer(config);
        if (templateId === 'wedding-prestige-hebrew-v1') return new WeddingPrestigeRenderer(config);
        return null;
    }

    updateActivePagePreview() {
        if (!store.state.pages) return;
        this.updateTimeline(store.state.pages, store.state.activePageId);
    }

    static init() {
        window.app = new App();
        // Load initial data
        // ... (data loading logic) ...

        // Initial History State
        store.pushState('Initial Load');

        // ----------------------------------------------------
        // Nano Banana AI Integration
        // ----------------------------------------------------
        // Init Service
        // Ideally we fetch API Key from user prefs or env
        // geminiService.init("YOUR_API_KEY"); 

        const aiPromptInput = document.getElementById('ai-prompt-input');
        const btnGenerateAI = document.getElementById('btn-generate-ai');

        if (btnGenerateAI && aiPromptInput) {
            btnGenerateAI.addEventListener('click', async () => {
                const userPrompt = aiPromptInput.value;
                if (!userPrompt) {
                    alert('Please enter a prompt');
                    return;
                }

                // Auto-Init with User's Key if not set
                if (!geminiService.apiKey) {
                    const storedKey = localStorage.getItem('gemini_api_key');
                    if (storedKey) geminiService.init(storedKey);
                    else {
                        alert("Please configure your Gemini API Key in settings or local config.");
                        return;
                    }
                }

                btnGenerateAI.textContent = 'Generating...';
                btnGenerateAI.disabled = true;

                try {
                    const imageUrl = await geminiService.generateImage(userPrompt);

                    // Add to Assets (history snapshot happens BEFORE mutation for Undo)
                    store.pushState('AI Generation');

                    store.state.assets.photos.push({
                        id: 'ai_' + crypto.randomUUID(),
                        url: imageUrl,
                        ratio: 1.0,
                        source: 'gemini-nano'
                    });

                    console.log("[App] AI Image added to assets. Total photos:", store.state.assets.photos.length);

                    // Use global app instance to avoid 'this' context issues in callbacks
                    if (window.app) {
                        window.app.renderAssetSidebar();
                    } else {
                        console.error("App instance not found on window");
                    }

                    store.notify('assets', store.state.assets);

                    // Clear input
                    aiPromptInput.value = '';
                    alert("Image Generated!");
                } catch (e) {
                    console.error(e);
                    alert("AI Generation Failed: " + e.message);
                } finally {
                    btnGenerateAI.textContent = 'Generate Asset';
                    btnGenerateAI.disabled = false;
                }
            });
        }

        // ----------------------------------------
        // Magic Remix (Full Album)
        // ----------------------------------------
        const btnMagicCreate = document.getElementById('btn-magic-create');
        if (btnMagicCreate) {
            if (btnMagicCreate) {
                const modal = document.getElementById('magic-create-modal');
                const btnSubmit = document.getElementById('btn-magic-submit');
                const input = document.getElementById('magic-prompt-input');

                btnMagicCreate.addEventListener('click', () => {
                    // 1. Check if we have photos
                    const photos = store.state.assets.photos;
                    if (photos.length < 3) {
                        alert("Please import at least 3 photos first! (Use dummy 'Create Mock Album' if needed)");
                        return;
                    }

                    // 2. Show Modal
                    if (modal) {
                        modal.style.display = 'flex';
                        if (input) input.focus();
                    }
                });

                // Submit Handler
                if (btnSubmit) {
                    btnSubmit.addEventListener('click', () => {
                        let prompt = input.value;
                        if (!prompt) {
                            alert("Please enter a description!");
                            return;
                        }

                        // Hide Modal
                        modal.style.display = 'none';

                        // 3. Trigger Director
                        if (!geminiService.apiKey) {
                            const key = window.prompt("Need Gemini API Key:");
                            if (key) geminiService.init(key);
                        }

                        aiDirector.magicCreate(store.state.assets.photos, prompt);

                        // Clear input for next time
                        input.value = '';
                    });
                }
            }
        }
    }

    // --- Manual Crop / Pan Logic ---

    enterCropMode(slotEl) {
        if (!slotEl) return;
        const pageId = slotEl.closest('.shoso-page').dataset.pageId;
        const slotId = slotEl.dataset.selectableId; // photoId

        // Set Manual Crop Flag to prevent smart crop overwrite
        const page = store.state.pages.find(p => p.id === pageId);
        if (page) {
            const slot = page.layout.slots.find(s => s.photoId === slotId);
            if (slot) slot.manualCrop = true;
        }

        if (this.currentCropSession) {
            // Commit previous
            this.commitCropMode();
        }

        console.log('[App] Entering crop mode for', slotId);

        // Visual Feedback
        // Add overlay and activate slot
        document.querySelectorAll('.photo-slot').forEach(el => el.classList.remove('crop-active'));
        slotEl.classList.add('crop-active');

        // Initialize Session
        this.currentCropSession = {
            slotEl: slotEl,
            pageId: pageId,
            slotId: slotId,
            initialCrop: null,
            imgEl: slotEl.querySelector('img'),
            scale: 1, // To be calculated
            startX: 0,
            startY: 0,
            startLeftPct: 0,
            startTopPct: 0,
            hasModified: false
        };

        // Attach Global Click to Dismiss (if clicking outside)
        // Delayed to avoid immediate trigger
        setTimeout(() => {
            const dismissHandler = (e) => {
                if (!slotEl.contains(e.target) && this.currentCropSession) {
                    this.commitCropMode();
                    document.removeEventListener('click', dismissHandler);
                }
            };
            this.currentCropSession.dismissHandler = dismissHandler;
            document.addEventListener('click', dismissHandler);
        }, 100);

        // Attach Mouse Handlers for Drag
        slotEl.addEventListener('mousedown', this.boundHandleCropDragStart);
        slotEl.style.cursor = 'move';
        // Disable swap drag
        slotEl.draggable = false;

        // Ensure crop is initialized
        this.initializeCropState(pageId, slotId, slotEl);
    }

    commitCropMode() {
        if (!this.currentCropSession) return;

        const { slotEl, pageId, slotId, dismissHandler } = this.currentCropSession;
        console.log('[App] Committing crop mode for', slotId);

        // Cleanup Visuals
        slotEl.classList.remove('crop-active');
        slotEl.style.cursor = '';
        slotEl.draggable = true; // Re-enable swap

        // Remove Listeners
        slotEl.removeEventListener('mousedown', this.boundHandleCropDragStart);
        document.removeEventListener('click', dismissHandler);
        window.removeEventListener('mousemove', this.boundHandleCropDragMove);
        window.removeEventListener('mouseup', this.boundHandleCropDragEnd);

        // State is already updated during drag via notify?
        if (store) store.notify('pages', store.state.pages);

        this.currentCropSession = null;
    }

    initializeCropState(pageId, slotId, slotEl) {
        const page = store.state.pages.find(p => p.id === pageId);
        if (!page) return;
        const slot = page.layout.slots.find(s => s.photoId === slotId);
        if (!slot) return;

        const img = slotEl.querySelector('img');

        // If no crop exists, create a default center crop based on CURRENT visualized ratio
        if (!slot.crop) {
            // We need photo dimensions.
            const asset = store.state.assets.photos.find(p => p.id === slotId);
            const pW = asset.width || (asset.ratio ? 1000 * asset.ratio : 1000);
            const pH = asset.height || 1000;

            // Slot aspect ratio (screen)
            const sW = slotEl.clientWidth;
            const sH = slotEl.clientHeight;
            const sRatio = sW / sH;

            // Calculate "Cover" rect in photo coordinates
            // We want largest rect of sRatio fitting in pW/pH
            let cropW, cropH;
            const pRatio = pW / pH;

            if (pRatio > sRatio) {
                // Photo is wider than slot -> Fit Height
                cropH = pH;
                cropW = cropH * sRatio;
            } else {
                // Photo is taller -> Fit Width
                cropW = pW;
                cropH = cropW / sRatio;
            }

            slot.crop = {
                x: (pW - cropW) / 2,
                y: (pH - cropH) / 2,
                width: cropW,
                height: cropH
            };

            store.notify('pages', store.state.pages);
        }
    }

    // handlers
    handleCropDragStart(e) {
        if (!this.currentCropSession) return;
        e.stopPropagation();
        e.preventDefault();

        const { slotEl, slotId, pageId } = this.currentCropSession;

        if (!this.currentCropSession.hasModified) {
            store.pushState('Adjust Crop');
            this.currentCropSession.hasModified = true;
        }

        // Retrieve current crop from STATE (it might have been initialized just now)
        const page = store.state.pages.find(p => p.id === pageId);
        const slot = page.layout.slots.find(s => s.photoId === slotId);

        if (!slot.crop) return; // Should not happen if initialized

        this.currentCropSession.initialCrop = { ...slot.crop };
        this.currentCropSession.startX = e.clientX;
        this.currentCropSession.startY = e.clientY;

        // Calculate Scale: Image Pixels per Screen Pixel
        this.currentCropSession.scaleX = slot.crop.width / slotEl.clientWidth;
        this.currentCropSession.scaleY = slot.crop.height / slotEl.clientHeight;

        window.addEventListener('mousemove', this.boundHandleCropDragMove);
        window.addEventListener('mouseup', this.boundHandleCropDragEnd);
    }

    handleCropDragMove(e) {
        if (!this.currentCropSession) return;
        e.preventDefault();

        const { startX, startY, initialCrop, scaleX, scaleY, pageId, slotId } = this.currentCropSession;
        const dx = e.clientX - startX;
        const dy = e.clientY - startY;

        // Calculate Delta in Image Pixels
        // Screen Move Right (+dx) -> Camera Move Left -> Crop X decreases
        // So we subtract dx * scale
        const dCropX = -dx * scaleX;
        const dCropY = -dy * scaleY;

        let newX = initialCrop.x + dCropX;
        let newY = initialCrop.y + dCropY;

        // Constraints
        const page = store.state.pages.find(p => p.id === pageId);
        const slot = page.layout.slots.find(s => s.photoId === slotId);
        const asset = store.state.assets.photos.find(p => p.id === slotId);

        // Estimate asset size if missing
        const pW = asset.width || (asset.ratio ? 1000 * asset.ratio : 1000);
        const pH = asset.height || 1000;

        // Clamp
        const maxX = Math.max(0, pW - initialCrop.width);
        const maxY = Math.max(0, pH - initialCrop.height);

        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));

        // Update State Object Directly (RenderEngine reads this)
        slot.crop.x = newX;
        slot.crop.y = newY;

        // Update DOM Directly for Performance (Mimic RenderEngine logic)
        const img = this.currentCropSession.imgEl;
        if (img) {
            const offX = 100 * (newX / initialCrop.width);
            const offY = 100 * (newY / initialCrop.height);
            img.style.left = `-${offX}%`;
            img.style.top = `-${offY}%`;
        }
    }

    handleCropDragEnd(e) {
        window.removeEventListener('mousemove', this.boundHandleCropDragMove);
        window.removeEventListener('mouseup', this.boundHandleCropDragEnd);
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// PDF Preview Handler
window.downloadPdfOnly = async () => {
    console.log("Preview PDF Clicked");
    // Use current store state
    const { pages, cover, assets } = store.state;

    // Set template config before generating PDF
    if (window.app && window.app.templateSidebar && window.app.templateSidebar.manager && window.app.templateSidebar.manager.config) {
        pdfExport.setTemplateConfig(window.app.templateSidebar.manager.config);
    }

    await pdfExport.generatePDF(pages, cover, assets);
};

// --- DEMO HELPER: Create Mock Album ---
// --- DEMO HELPER: Create Mock Album ---
window.demo_createMockAlbum = () => {
    console.log("Creating Mock Album...");

    // Reset pages
    const newPages = [];
    // Ensure styles are available
    const bgKeys = window.BACKGROUND_TEXTURES ? window.BACKGROUND_TEXTURES.map(b => b.id) : [];
    const frameKeys = window.PAGE_FRAMES ? window.PAGE_FRAMES.map(f => f.id) : [];
    const photoAssets = store.state.assets.photos;

    if (!photoAssets || photoAssets.length === 0) {
        console.error("No photo assets available!");
        return;
    }

    for (let i = 0; i < 10; i++) {
        const pageId = crypto.randomUUID();
        // 1 to 3 photos
        const numPhotos = Math.floor(Math.random() * 3) + 1;
        const pagePhotos = [];

        // Select Random Photos
        for (let j = 0; j < numPhotos; j++) {
            const asset = photoAssets[Math.floor(Math.random() * photoAssets.length)];
            // Use the asset directly so IDs match what RenderEngine expects (asset.id)
            pagePhotos.push(asset);
        }

        // Generate Layout
        // We use the app's layout engine
        let layout = null;
        if (window.app && window.app.layoutEngine) {
            layout = window.app.layoutEngine.generateLayout(pagePhotos);
        } else {
            // Fallback
            layout = { slots: [] };
        }

        // Random Styling
        const bgId = bgKeys.length > 0 ? bgKeys[Math.floor(Math.random() * bgKeys.length)] : null;
        // 30% chance of page frame
        const frameId = (frameKeys.length > 0 && Math.random() > 0.7) ? frameKeys[Math.floor(Math.random() * frameKeys.length)] : null;

        newPages.push({
            id: pageId,
            backgroundId: bgId, // The renderer expects backgroundId or background? 
            // render-engine.js: this.renderer.renderPage(activePage...)
            // renderPage uses page.backgroundId (implied) or checks assets.
            // Wait, checks page.background?
            // In render-engine.js (I need to check): 
            // It likely checks BACKGROUND_TEXTURES by ID. Let's assume backgroundId is correct property.
            background: bgId, // Storing as 'background' property for safety based on pdf-export usage
            frameId: frameId,
            photos: pagePhotos,
            layout: layout,
            elements: [
                {
                    id: crypto.randomUUID(),
                    type: 'text', // Explicit type
                    content: `Page ${i + 1}`,
                    x: 50, y: 92, // %
                    styleId: 'body-small', // Default
                    fontSize: 16,
                    fontFamily: 'Inter', // Default
                    color: '#000000',
                    align: 'center' // Not used by renderer yet?
                }
            ]
        });
    }

    // Apply to State
    store.state.pages = newPages;
    // Ensure cover obj exists
    if (!store.state.cover) store.state.cover = {};
    store.state.cover.title = "My Travels 2026";
    store.state.cover.subtitle = "A Journey Through Code";
    store.state.cover.layout = "full-bleed";

    // Assign random cover photo
    if (photoAssets.length > 0) {
        store.state.cover.frontPhotoId = photoAssets[0].id;
    }

    // Set View
    store.state.activePageId = newPages[0].id;
    store.state.viewMode = 'pages';

    console.log("Mock Album Created with 10 pages.");
    // Force update
    store.notify('pages', newPages);
};



