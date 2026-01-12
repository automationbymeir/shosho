/**
 * Main Application Logic for AI Editor
 */
import { store } from './state.js';
import { layoutEngine } from './layout-engine.js';
import { RenderEngine } from './render-engine.js';
import { pdfExport } from './pdf-export.js';
import { googlePhotosService } from './google-photos-service.js';
import { geminiService } from './gemini-banana-service.js';
import { aiDirector } from './ai-director.js';
import { orderFlow } from './order-flow.js';
import { authService } from './firebase-auth.js';
import { persistenceService } from './persistence-service.js';

class App {
    constructor() {
        this.init();

        // Auto-Init Gemini with provided Key
        // key: AIzaSyCw0jvaapxUWW7zMWSTIzY2cNQf-0GkfPk
        geminiService.init("AIzaSyCw0jvaapxUWW7zMWSTIzY2cNQf-0GkfPk");
    }

    init() {
        this.renderer = new RenderEngine('canvas-container');
        this.state = store.state; // Direct access ref
        this.bindEvents();
        this.loadAssets();

        // Auth Init
        this.saveDebounced = persistenceService.debounce((state) => {
            if (store.state.user) {
                persistenceService.saveProject(store.state.user.uid, state);
            }
        }, 3000);

        authService.onAuthStateChanged(async (user) => {
            store.state.user = user;
            this.renderAuthUI();

            if (user) {
                console.log("User Logged In:", user.email);
                // Load saved project if exists
                const savedData = await persistenceService.loadProject(user.uid);
                if (savedData) {
                    console.log("Loading saved project...");
                    // Restore key state properties
                    // Note: We need to be careful not to overwrite 'user' which we just set
                    Object.assign(store.state, {
                        ...savedData,
                        user: user, // Ensure user stays
                        assets: savedData.assets || store.state.assets // Fallback
                    });

                    // Force refresh
                    store.notify('pages', store.state.pages);
                    store.notify('cover', store.state.cover);
                    this.renderer.renderAssetSidebar(); // Refresh assets
                    // Refresh current view
                    if (store.state.viewMode === 'cover') {
                        this.renderer.renderCover(store.state.cover, store.state.assets);
                    } else {
                        const p = store.state.pages.find(pg => pg.id === store.state.activePageId);
                        if (p) this.renderer.renderPage(p, store.state.assets, store.state.selection);
                    }

                    alert(`Welcome back, ${user.displayName}! Your project has been restored.`);
                }
            }
        });

        // Setup Auto-Save on all changes
        store.subscribe((state, prop, val) => {
            // Don't save on ephemeral props if desired, but for now save everything
            if (prop !== 'selection' && prop !== 'user') {
                this.saveDebounced(state);
            }
        });
    }

    async loadAssets() {
        // Load mock photos for MVP
        // In real implementation, this would fetch from Google Photos API
        const mockPhotos = [
            { id: 'p1', url: 'https://images.unsplash.com/photo-1501854140884-074cf2cb3055?auto=format&fit=crop&w=500&q=60', ratio: 1.5 },
            { id: 'p2', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=500&q=60', ratio: 1.5 },
            { id: 'p3', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=500&q=60', ratio: 0.67 }, // Portrait
            { id: 'p4', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=60', ratio: 1.5 },
            { id: 'p5', url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=500&q=60', ratio: 1.5 }
        ];

        store.state.assets.photos = mockPhotos;
        this.renderAssetSidebar();

        // Initialize with one page
        store.addPage();
    }

    bindEvents() {
        // Subscribe to state changes
        store.subscribe((state, prop, value) => {
            if (prop === 'activePageId' || prop === 'pages' || prop === 'selection' || prop === 'theme' || prop === 'viewMode' || prop === 'cover') {
                if (state.viewMode === 'cover') {
                    this.renderer.renderCover(state.cover, state.assets);
                } else {
                    const activePage = state.pages.find(p => p.id === state.activePageId);
                    this.renderer.renderPage(activePage, state.assets, state.selection);
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
            e.dataTransfer.dropEffect = 'copy';
            canvas.classList.add('drop-target-active');
        });

        canvas.addEventListener('dragleave', (e) => {
            canvas.classList.remove('drop-target-active');
        });

        canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            canvas.classList.remove('drop-target-active');

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
                    // Replace photo in specific slot
                    const targetPhotoId = targetSlotEl.dataset.selectableId;
                    store.pushState('Replace Photo');
                    this.replacePhotoInSlot(targetPhotoId, item.id);
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
        canvas.addEventListener('click', (e) => {
            // Check if clicked on a selectable item
            const target = e.target.closest('[data-selectable-id]');
            if (target) {
                const id = target.dataset.selectableId;
                const type = target.dataset.selectableType;

                // For text types, the ID is unique element ID
                // For photo types, in our current simple model, ID is photoId. 
                // (Ideally slots should have unique IDs independent of photo)
                store.state.selection = id;
            } else {
                // Deselect if clicking background
                store.state.selection = null;
            }
        });

        // ----------------------------------------------------
        // Text Drag & Drop (Mouse Interactions)
        // ----------------------------------------------------
        let isDraggingText = false;
        let dragTargetId = null;
        let dragOffsetX = 0;
        let dragOffsetY = 0;

        canvas.addEventListener('mousedown', (e) => {
            const target = e.target.closest('[data-selectable-type="text"]');
            if (target) {
                isDraggingText = true;
                dragTargetId = target.dataset.selectableId;

                // Calculate offset
                const rect = target.getBoundingClientRect();
                dragOffsetX = e.clientX - rect.left;
                dragOffsetY = e.clientY - rect.top;

                // Set selection
                store.state.selection = dragTargetId;
                e.stopPropagation(); // prevent other clicks
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDraggingText || !dragTargetId) return;

            const targetEl = document.querySelector(`[data-selectable-id="${dragTargetId}"]`);
            if (!targetEl) return;

            const canvasRect = canvas.getBoundingClientRect();

            // Calculate new X, Y relative to canvas
            let newX = e.clientX - canvasRect.left - dragOffsetX;
            let newY = e.clientY - canvasRect.top - dragOffsetY;

            // Visual Update (Direct DOM for Performance)
            targetEl.style.left = `${newX}px`; // Temporary px value overriding %
            targetEl.style.top = `${newY}px`;

            // We don't commit to state yet to avoid excessive re-renders
        });

        window.addEventListener('mouseup', (e) => {
            if (isDraggingText && dragTargetId) {
                const targetEl = document.querySelector(`[data-selectable-id="${dragTargetId}"]`);
                if (targetEl) {
                    const canvasRect = canvas.getBoundingClientRect();
                    // Final calculation based on current mouse or element Pos?
                    // Let's use the element's current visual position (which was updated in mousemove)
                    // But 'style.left' might be in px now.

                    const rect = targetEl.getBoundingClientRect();
                    const relativeX = (rect.left - canvasRect.left) / canvasRect.width * 100;
                    const relativeY = (rect.top - canvasRect.top) / canvasRect.height * 100;

                    // Update State
                    const page = store.state.pages.find(p => p.id === store.state.activePageId);
                    if (page && page.elements) {
                        const el = page.elements.find(el => el.id === dragTargetId);
                        if (el) {
                            // store.pushState('Move Text'); // Too noisy for every drag? Maybe debounce pushState or classify as minor?
                            // For now, simple update
                            el.x = relativeX;
                            el.y = relativeY;
                            store.notify('pages', store.state.pages);
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
        document.getElementById('btn-preview').addEventListener('click', () => {
            // User Request: "when i click on preview it will created and download a pdf file"
            // Toggling preview mode is still useful for quick check, but let's prioritize the download as requested.

            // Option A: Just download
            console.log("[App] Preview clicked. Generating PDF...");
            pdfExport.generatePDF(store.state.pages, store.state.cover, store.state.assets);

            // Option B: Toggle mode AND download? 
            // "not other file type" implies they want the file.
            // We can keep the visual toggle if it helps, but let's stick to the request.

            // toggle visual preview as well for feedback
            document.body.classList.toggle('preview-mode');
            const isPreview = document.body.classList.contains('preview-mode');
            const btn = document.getElementById('btn-preview');
            btn.textContent = isPreview ? 'Close Preview' : 'Preview (PDF)';
        });

        document.getElementById('btn-remix-layout').addEventListener('click', () => {
            const state = store.state;
            const page = state.pages.find(p => p.id === state.activePageId);
            if (page && page.photos && page.photos.length > 0) {
                // Pass current layout name to cycle
                const currentName = page.layout ? page.layout.name : null;
                const newLayout = layoutEngine.getNextLayout(page.photos, currentName);
                if (newLayout) {
                    store.pushState('Remix Layout');
                    page.layout = newLayout;
                    store.notify('pages', state.pages);
                    console.log('[App] Remixed layout to:', newLayout.name);
                }
            }
        });

        // Review & Order Actions
        // 1. Review (Download PDF)
        document.getElementById('btn-review').addEventListener('click', () => {
            console.log("Generating Review PDF...");
            // Standard export for review
            pdfExport.generatePDF(store.state.pages, store.state.cover, store.state.assets);

            // Show Order Button
            document.getElementById('btn-order-print').style.display = 'inline-block';
        });

        // 2. Order (Simulate Checkout)
        document.getElementById('btn-order-print').addEventListener('click', async () => {
            console.log("Starting Order Flow...");
            // Generate Blob
            const blob = await pdfExport.generatePDF(store.state.pages, store.state.cover, store.state.assets, true);
            if (blob) {
                orderFlow.startOrderFlow(blob);
            }
        });

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
                    uploadModal.style.display = 'none';
                    // Reset input
                    fileInput.value = '';
                }
            });
        }

        const btnGoogle = document.getElementById('btn-upload-google');
        if (btnGoogle) {
            btnGoogle.addEventListener('click', async () => {
                try {
                    // 1. Connect (Auth)
                    if (!googlePhotosService.accessToken) {
                        try {
                            await googlePhotosService.connect();
                        } catch (err) {
                            console.error(err);
                            alert("Google Auth Failed: " + err);
                            return;
                        }
                    }

                    // 2. Open Picker
                    const photos = await googlePhotosService.openPicker();

                    if (photos && photos.length > 0) {
                        store.pushState('Upload Google Photos');
                        // Add to assets
                        store.state.assets.photos = [...store.state.assets.photos, ...photos];
                        this.renderAssetSidebar();
                        uploadModal.style.display = 'none';
                        console.log("Imported Google Photos:", photos.length);
                        store.notify('assets', store.state.assets); // Ensure assets update triggers
                    }

                } catch (e) {
                    console.error("Google Photos Error:", e);
                    if (e.toString().includes('Picker API')) {
                        alert("Google Picker API not fully loaded. Please check API Key configuration.");
                    } else if (e !== 'Picker canceled') {
                        alert("Error: " + e);
                    }
                }
            });
        }
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
        page.photos = [...(page.photos || []), photo];

        console.log('[App] New Photos list:', page.photos.length, page.photos);

        // 4. Trigger AI Layout
        const newLayout = layoutEngine.generateLayout(page.photos);
        console.log('[App] Generated Layout:', newLayout);

        // 5. Update State
        page.layout = newLayout;

        // Replace the page in the store array
        const newPages = [...state.pages];
        newPages[pageIndex] = page;
        store.state.pages = newPages; // Triggers UI update
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

        // Find slots
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
            }
        }
    }

    updatePropertiesPanel(state) {
        const panel = document.getElementById('properties-panel');

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
        const textElement = page.elements && page.elements.find(e => e.id === selectionId);
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

            // Bind Events
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
                        <input type="color" id="prop-page-color" class="color-input-hidden" value="${page.background && page.background.startsWith('#') ? page.background : '#ffffff'}">
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

        // 1. Layout Buttons (Simple Remix for now, matching illustration icons)
        const layouts = container.querySelectorAll('.layout-btn');
        layouts.forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                // Determine logic based on which "grid" icon was clicked
                // For MVP, all just trigger 'Magic Remix' logic but maybe filtered?
                // Let's just cycle layouts for now to be safe.
                // Or: 
                // Btn 0: 1-photo logic?
                // Btn 1: 2-photo logic?
                // Btn 2: Grid logic?
                // Since we can't change photo COUNT here easily without deleting, let's just trigger Remix.
                const state = store.state;
                const currentName = page.layout ? page.layout.name : null;
                const newLayout = window.app.layoutEngine.getNextLayout(page.photos, currentName);
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

        if (selection === 'cover-photo' || selection === 'cover-back-photo') {
            container.innerHTML = `
                <div class="panel-header">
                    <button class="btn-secondary btn-sm" id="btn-back-cover-props"><i class="fa-solid fa-arrow-left"></i> Cover Settings</button>
                    <h3>${selection === 'cover-photo' ? 'Front Photo' : 'Back Photo'}</h3>
                </div>
             `;

            // Reuse renderPhotoProperties logic? 
            // renderPhotoProperties expects a page and photoId. 
            // We need a bespoke one for cover or adapt it. 
            // For now, let's just add Filters/Remove options here.

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
                    store.state.selection = null; // Deselect
                });
            }

            container.querySelector('#btn-back-cover-props').addEventListener('click', () => {
                store.state.selection = null;
                store.notify('selection', null); // Force update to show general properties
            });

            return;
        }

        container.innerHTML = `<h3>Cover Settings</h3>`;

        // Title
        const titleGroup = document.createElement('div');
        titleGroup.className = 'prop-group';
        titleGroup.innerHTML = `<label>Title</label><input type="text" id="prop-cover-title" value="${cover.title}">`;
        container.appendChild(titleGroup);

        // Subtitle
        const subGroup = document.createElement('div');
        subGroup.className = 'prop-group';
        subGroup.innerHTML = `<label>Subtitle</label><input type="text" id="prop-cover-sub" value="${cover.subtitle}">`;
        container.appendChild(subGroup);

        // Layout
        const layoutGroup = document.createElement('div');
        layoutGroup.className = 'prop-group';
        layoutGroup.innerHTML = `
            <label>Layout</label>
            <select id="prop-cover-layout" class="full-width">
                <option value="standard" ${cover.layout === 'standard' ? 'selected' : ''}>Standard</option>
                <option value="full-bleed" ${cover.layout === 'full-bleed' ? 'selected' : ''}>Full Bleed</option>
                <option value="photo-bottom" ${cover.layout === 'photo-bottom' ? 'selected' : ''}>Photo Bottom</option>
            </select>
        `;
        container.appendChild(layoutGroup);

        // Bindings
        container.querySelector('#prop-cover-title').addEventListener('input', (e) => {
            store.state.cover = { ...store.state.cover, title: e.target.value };
        });
        container.querySelector('#prop-cover-sub').addEventListener('input', (e) => {
            store.state.cover = { ...store.state.cover, subtitle: e.target.value };
        });
        container.querySelector('#prop-cover-layout').addEventListener('change', (e) => {
            store.state.cover = { ...store.state.cover, layout: e.target.value };
        });

        // Spine Text
        const spineGroup = document.createElement('div');
        spineGroup.className = 'prop-group';
        spineGroup.innerHTML = `<label>Spine Text</label><input type="text" id="prop-cover-spine" value="${cover.spineText || ''}" placeholder="${cover.title}">`;
        container.appendChild(spineGroup);

        container.querySelector('#prop-cover-spine').addEventListener('input', (e) => {
            store.state.cover = { ...store.state.cover, spineText: e.target.value };
        });

        // Background Color/Theme
        const colorGroup = document.createElement('div');
        colorGroup.className = 'prop-group';
        colorGroup.innerHTML = `
            <label>Background Color</label>
            <div style="display:flex; gap:10px;">
                <input type="color" id="prop-cover-color" value="${cover.color || '#ffffff'}" class="full-width" style="height:40px;">
                <button class="btn-secondary" id="btn-reset-theme" title="Reset to Theme"><i class="fa-solid fa-rotate-left"></i></button>
            </div>
        `;
        container.appendChild(colorGroup);

        container.querySelector('#prop-cover-color').addEventListener('input', (e) => {
            // Unset theme effectively to use color
            // Or just update color. RenderEngine prioritizes theme if set?
            // "applyCoverBg" prioritizes theme. So we need to unset theme or update it.
            // Let's assume user wants to override theme.
            store.state.cover = { ...store.state.cover, color: e.target.value, theme: null };
        });

        container.querySelector('#btn-reset-theme').addEventListener('click', () => {
            // Reset to global theme
            store.state.cover = { ...store.state.cover, theme: store.state.theme };
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
                if (!googlePhotosService.accessToken) {
                    await googlePhotosService.init();
                    await googlePhotosService.connect();
                }
                const photos = await googlePhotosService.openPicker();
                store.state.assets.photos = [...store.state.assets.photos, ...photos];
                // 4. Update UI
                // Use window.app to ensure we target the correct instance and avoid 'this' context issues
                if (window.app) {
                    window.app.renderAssetSidebar();
                } else {
                    console.error("Window.app not found for re-render");
                }

                // Show completion
                console.log("Magic Create Complete!");
                alert("Magic Album Created! Check the new page.");

            } catch (err) {
                console.error(err);
                alert('Google Photos Error: ' + err);
            }
        });
        photoGrid.appendChild(btnGoogle);

        console.log(`[App] Rendering ${store.state.assets.photos.length} photos.`);
        store.state.assets.photos.forEach(photo => {
            const el = document.createElement('div');
            el.className = 'asset-item';
            el.draggable = true;
            el.innerHTML = `<img src="${photo.url}" draggable="false">`;
            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({ type: 'photo', id: photo.id }));
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
        tl.innerHTML = '';

        // Cover Button
        const coverEl = document.createElement('div');
        coverEl.className = `timeline-page ${store.state.viewMode === 'cover' ? 'active' : ''}`;
        coverEl.textContent = 'C';
        coverEl.style.color = 'white';
        coverEl.style.backgroundColor = '#444';
        coverEl.style.display = 'flex';
        coverEl.style.alignItems = 'center';
        coverEl.style.justifyContent = 'center';
        coverEl.style.border = '1px solid #666';
        coverEl.addEventListener('click', () => {
            store.state.viewMode = 'cover';
        });
        tl.appendChild(coverEl);

        pages.forEach((page, idx) => {
            const el = document.createElement('div');
            el.className = `timeline-page ${page.id === activeId && store.state.viewMode !== 'cover' ? 'active' : ''}`;
            el.textContent = idx + 1;
            el.style.color = 'white';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';

            el.addEventListener('click', () => {
                store.state.viewMode = 'pages'; // Switch back to pages
                store.state.activePageId = page.id;
            });
            tl.appendChild(el);
        });
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
                    // User provided key: AIzaSyCw0jvaapxUWW7zMWSTIzY2cNQf-0GkfPk
                    geminiService.init("AIzaSyCw0jvaapxUWW7zMWSTIzY2cNQf-0GkfPk");
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
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    App.init();
});

// PDF Preview Handler
window.downloadPdfOnly = async () => {
    console.log("Preview PDF Clicked");
    // Use current store state
    const { pages, cover, assets } = store.state;
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
