/**
 * Main Application Logic for AI Editor
 */
// PERFORMANCE: Import logger FIRST — silences console.log/warn in production
import './logger.js';
import { store } from './state.js';
import { layoutEngine } from '../engines/layout-engine.js';
import { RenderEngine } from '../engines/render-engine.js';
import { pdfExport } from '../engines/pdf-export.js';
import { pdfCanvasExport } from '../engines/pdf-canvas-export.js';
import { googlePhotosService } from '../services/google-photos-service.js?v=googleFixBlackScreen';
import { geminiService } from '../services/ai-service.js';
import { aiDirector } from '../engines/ai-director.js';
import { orderFlow } from '../services/order-flow.js?v=bookpod2';
import { authService } from '../services/firebase-auth-service.js?v=forceProduction';
import { persistenceService } from '../services/persistence-service.js';
import { TemplateSidebar } from '../ui-components/template-sidebar.js?v=force_refresh_1';
import { UnifiedCoverRenderer } from '../engines/unified-cover-renderer.js?v=align2';
import { UnifiedTemplateRenderer } from '../templates/unified-template-renderer.js';
import { ProfileModal } from '../ui-components/profile-modal.js?v=datefix';
import { generateQRCode, createQRElement, extractUrlsFromText } from '../utils/qr-generator.js?v=browser_qr_1';
import { photoPositionService } from '../services/photo-position-service.js';
import { ProjectManager } from '../ui-components/project-manager.js';
import { photoQualityModal } from '../ui-components/photo-quality-modal.js';
import { photoQualityService } from '../services/photo-quality-service.js';

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
        this.moveableInstance = null; // Groundwork for Moveable integration
        this.clipboard = null;
        this.bindEvents();
        this.setupKeyboardShortcuts();
        this.createHoverTooltip();
        this.loadAssets();

        // Initialize Profile Modal
        this.profileModal = new ProfileModal(this);

        // Initialize Project Manager
        this.projectManager = new ProjectManager(this);

        // Auth Init
        this.saveDebounced = persistenceService.debounce((state) => {
            // SMART SAVE: Don't save if state is effectively empty
            // This prevents overwriting previous work with a blank slate during initialization
            const hasContent = (state.pages && state.pages.length > 0) || (state.assets && state.assets.photos && state.assets.photos.length > 0);
            if (!hasContent) {
                console.log("[App] Auto-save skipped: State is empty.");
                return;
            }

            // Prevent save if the user is a viewer
            if (persistenceService.currentRole === "viewer") {
                console.log("[App] Auto-save skipped: User is a restricted viewer.");
                return;
            }

            // We now pass userId if it exists, otherwise pass null to allow local-only save.
            persistenceService.saveProject(store.state.user?.uid || null, state);
        }, 3000);

        // Check for Auto-Start Params immediately
        const urlParams = new URLSearchParams(window.location.search);
        this.isAutoStart = urlParams.get('autoStart') === 'true';
        this.targetTemplateId = urlParams.get('templateId');
        this.urlProjectId = urlParams.get('projectId');
        this.urlShareToken = urlParams.get('shareToken');
        this.waProjectId = urlParams.get('project');
        this.waSource = urlParams.get('source');

        // --- UPLOAD MODAL EVENT BINDING ---
        const autoUploadModal = document.getElementById('auto-start-upload-modal');
        if (autoUploadModal) {
            // Bind Events
            const btnLocal = document.getElementById('btn-auto-upload-local');
            const btnGoogle = document.getElementById('btn-auto-upload-google');

            if (btnLocal) {
                btnLocal.onclick = () => {
                    const fileInput = document.getElementById('file-upload-input');
                    if (fileInput) fileInput.click();
                    autoUploadModal.style.display = 'none';
                };
            }

            if (btnGoogle) {
                btnGoogle.onclick = async () => {
                    this.magicCreateGenerationStarted = true; // Block auth observer from clobbering us

                    // Check Auth State On Demand
                    if (!store.state.user) {
                        try {
                            console.log("Login required for Google Photos...");
                            await authService.signInWithGoogle();
                            // We wait for the promise, but store.state.user is set in onAuthStateChanged
                            // We might need to wait a tick or just proceed if signIn resolves with user
                        } catch (e) {
                            this.magicCreateGenerationStarted = false;
                            console.error("Login failed", e);
                            alert("ההתחברות נכשלה. אנא נסה שוב.");
                            return;
                        }
                    }

                    // Proceed to Picker
                    // Don't close modal yet - wait for success
                    try {
                        const photos = await googlePhotosService.openPicker();
                        if (photos && photos.length > 0) {
                            // Success - close modal
                            autoUploadModal.style.display = 'none';

                            // --- VISION QUALITY SCREENING FOR GOOGLE PHOTOS ---
                            photoQualityModal.review(photos, (keptPhotos, analyses) => {
                                store.state.assets.photos = keptPhotos;
                                store.notify('assets', store.state.assets);
                                if (this.renderAssetSidebar) this.renderAssetSidebar();

                                // AUTO-START WITH FALLBACK DEFAULT
                                if (this.isAutoStart && this.templateSidebar) {
                                    const templateToUse = this.targetTemplateId || 'family-roots-v1';
                                    console.log(`[App] Auto-Start: Generating book from Google Photos using ${templateToUse}...`);
                                    this.templateSidebar.handleTemplateSelect(templateToUse).then(() => {
                                        this.disabledAutoStart = true;
                                        this.isAutoStart = false;
                                    });
                                }
                            });
                        } else {
                            this.magicCreateGenerationStarted = false;
                            // No photos selected (User cancelled or empty selection)
                            console.log("[App] Google Photos Picker cancelled or empty.");
                            alert("לא נבחרו תמונות. אנא בחר תמונות או העלה מהמחשב כדי להמשיך ביצירת הספר.");
                            autoUploadModal.style.display = 'flex'; // Ensure modal is visible for retry/alternate choice
                        }
                    } catch (e) {
                        this.magicCreateGenerationStarted = false;
                        console.error("Google Photos Error:", e);
                        const msg = e.message || "Unknown error";
                        if (!msg.includes("popup_b_closed") && !msg.includes("cancel")) {
                            alert("טעינת תמונות מ-Google נכשלה. אנא נסה שוב או העלה מהמחשב.");
                        }
                        autoUploadModal.style.display = 'flex'; // Show again on error
                    }
                };
            }
        }

        authService.onAuthStateChanged(async (user) => {
            store.state.user = user;
            this.renderAuthUI();

            // ─── WhatsApp Project Loading ───────────────────
            if (this.waProjectId && this.waSource === 'whatsapp' && !this._waLoaded) {
                console.log('[App] Loading WhatsApp project:', this.waProjectId);
                try {
                    const db = authService.getDB();
                    let doc = await db.collection('whatsapp_projects').doc(this.waProjectId).get();

                    // Retry once after 2s if not found (Firebase SDK may not be ready yet)
                    if (!doc.exists) {
                        console.log('[App] WhatsApp project not found on first try, retrying in 2s...');
                        await new Promise(r => setTimeout(r, 2000));
                        doc = await db.collection('whatsapp_projects').doc(this.waProjectId).get();
                    }

                    // Only set _waLoaded after we actually got the doc
                    this._waLoaded = true;
                    if (doc.exists) {
                        const waData = doc.data();
                        const plan = waData.plan;
                        console.log('[App] WhatsApp project loaded:', waData.title, waData.photos?.length, 'photos', plan?.pages?.length, 'pages');

                        // Convert WhatsApp photos to editor format
                        const editorPhotos = (waData.photos || []).map((p, i) => ({
                            id: p.id || `wa_${i}`,
                            url: p.url,
                            rawBaseUrl: p.url,
                            baseUrl: p.url,
                            name: p.name || `photo_${i}.jpg`,
                            index: p.index ?? i,
                            type: 'photo'
                        }));

                        // Set photos in store BEFORE loadIntoEditor
                        store.state.assets = { photos: editorPhotos };
                        store.notify('assets', store.state.assets);
                        if (this.renderAssetSidebar) this.renderAssetSidebar();

                        // Build cover page from plan.cover
                        let coverPage = plan.cover ? {
                            id: 'page_cover_' + crypto.randomUUID(),
                            templateId: 'cover',
                            title: plan.cover.title || waData.title,
                            subtitle: plan.cover.subtitle || '',
                            background: plan.cover.backgroundTextureId || null,
                            frontPhotoId: editorPhotos[plan.cover.photoIndex || 0]?.id,
                            photos: plan.cover.photoIndex !== undefined ? [editorPhotos[plan.cover.photoIndex]] : [],
                            photoShape: plan.cover.photoShape || 'rounded',
                            textContent: {
                                title: plan.cover.title || waData.title,
                                subtitle: plan.cover.subtitle || ''
                            }
                        } : null;

                        // ─── Travel Cover Gallery Auto-Match ────────────────
                        // If a country/city name is detected in the title/prompt,
                        // auto-apply matching illustrated travel cover from COVER_GALLERY
                        if (coverPage && window.COVER_GALLERY && window.COVER_GALLERY.length > 0) {
                            const searchText = [
                                waData.title || '',
                                waData.prompt || '',
                                plan.cover?.title || '',
                                plan.cover?.subtitle || ''
                            ].join(' ').toLowerCase();

                            let matchedCover = null;
                            for (const gc of window.COVER_GALLERY) {
                                if (gc.keywords.some(kw => searchText.includes(kw.toLowerCase()))) {
                                    matchedCover = gc;
                                    break;
                                }
                            }

                            if (matchedCover) {
                                const svgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(matchedCover.svg);
                                const existingFrontPhoto = coverPage.frontPhotoId;
                                coverPage = {
                                    ...coverPage,
                                    title: matchedCover.cityEn,
                                    subtitle: new Date().getFullYear().toString(),
                                    textColor: matchedCover.textColor,
                                    color: matchedCover.bgColor,
                                    theme: svgDataUri,
                                    background: svgDataUri,
                                    _coverGalleryId: matchedCover.id,
                                    _backSvgDataUri: matchedCover.backSvg ? 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(matchedCover.backSvg) : undefined,
                                    frontPhotoId: null,  // Gallery cover illustration replaces front photo
                                    textContent: {
                                        title: matchedCover.cityEn,
                                        subtitle: new Date().getFullYear().toString(),
                                        date: new Date().getFullYear().toString()
                                    }
                                };
                                // Redirect front photo to back cover if it existed
                                if (existingFrontPhoto && !coverPage.backPhotoId) {
                                    coverPage.backPhotoId = existingFrontPhoto;
                                }
                                console.log('[App] 🌍 Travel cover auto-matched (WhatsApp):', matchedCover.id, matchedCover.cityEn);
                            }
                        }

                        // Build back cover from plan.backCover
                        const backCoverPage = plan.backCover ? {
                            id: 'page_backcover_' + crypto.randomUUID(),
                            templateId: 'back-cover',
                            title: plan.backCover.text || '',
                            subtitle: plan.backCover.subtitle || '',
                            background: plan.backCover.backgroundTextureId || null,
                            textContent: {
                                title: plan.backCover.text || '',
                                subtitle: plan.backCover.subtitle || ''
                            }
                        } : null;

                        // Build content pages from plan.pages
                        const contentPages = (plan.pages || []).map((pg, pgIdx) => {
                            const pagePhotos = [];
                            const photoSlots = (pg.slots || []).filter(s => s.type === 'photo');

                            // Collect photos AND build slot-to-photo mapping
                            const slotPhotoIds = [];
                            photoSlots.forEach(slot => {
                                const photo = editorPhotos[slot.photoIndex];
                                if (photo) {
                                    pagePhotos.push(photo);
                                    slotPhotoIds.push(photo.id);
                                }
                            });

                            return {
                                id: crypto.randomUUID(),
                                layout: pg.layout || 'single',
                                photos: pagePhotos,
                                // Store photoIds so loadIntoEditor can set them on layout slots
                                _slotPhotoIds: slotPhotoIds,
                                background: pg.backgroundTextureId || null,
                                backgroundTextureId: pg.backgroundTextureId || null,
                                photoSpacing: pg.photoSpacing || 14,
                                pageFrameId: pg.pageFrameId || null,
                                elementCategories: pg.elementCategories || [],
                                fontId: pg.fontId || 'heebo',
                                imageShape: 'rounded',
                                slots: pg.slots || [],
                                elements: [],
                                textContent: {}
                            };
                        });

                        // Build result object for loadIntoEditor
                        const result = {
                            pages: [
                                ...(coverPage ? [coverPage] : []),
                                ...contentPages,
                                ...(backCoverPage ? [backCoverPage] : [])
                            ],
                            cover: plan.cover ? {
                                title: plan.cover.title,
                                subtitle: plan.cover.subtitle,
                                backgroundTextureId: plan.cover.backgroundTextureId
                            } : null,
                            backCover: plan.backCover || null,
                            theme: { coverId: plan.cover?.backgroundTextureId }
                        };

                        // Pre-convert layout strings to objects WITH photoId
                        // The render engine specifically needs slot.photoId to find photos
                        const LAYOUTS = {
                            "single": [{ x: 10, y: 10, width: 80, height: 80 }],
                            "two-vertical": [{ x: 10, y: 5, width: 80, height: 43 }, { x: 10, y: 52, width: 80, height: 43 }],
                            "two-horizontal": [{ x: 5, y: 15, width: 43, height: 70 }, { x: 52, y: 15, width: 43, height: 70 }],
                            "three-left": [{ x: 5, y: 5, width: 55, height: 90 }, { x: 63, y: 5, width: 32, height: 43 }, { x: 63, y: 52, width: 32, height: 43 }],
                            "three-right": [{ x: 10, y: 5, width: 80, height: 50 }, { x: 10, y: 58, width: 38, height: 37 }, { x: 52, y: 58, width: 38, height: 37 }],
                            "four-grid": [{ x: 5, y: 5, width: 43, height: 43 }, { x: 52, y: 5, width: 43, height: 43 }, { x: 5, y: 52, width: 43, height: 43 }, { x: 52, y: 52, width: 43, height: 43 }],
                            "collage-5": [{ x: 5, y: 5, width: 43, height: 43 }, { x: 52, y: 5, width: 43, height: 43 }, { x: 5, y: 52, width: 43, height: 43 }, { x: 52, y: 52, width: 20, height: 20 }, { x: 75, y: 52, width: 20, height: 20 }],
                            "collage-6": [{ x: 5, y: 5, width: 30, height: 40 }, { x: 38, y: 5, width: 24, height: 40 }, { x: 65, y: 5, width: 30, height: 40 }, { x: 5, y: 50, width: 30, height: 40 }, { x: 38, y: 50, width: 24, height: 40 }, { x: 65, y: 50, width: 30, height: 40 }]
                        };
                        result.pages.forEach(pg => {
                            if (typeof pg.layout === 'string') {
                                const layoutId = pg.layout;
                                const template = LAYOUTS[layoutId] || LAYOUTS["single"];
                                const photoIds = pg._slotPhotoIds || [];
                                pg.layout = {
                                    id: layoutId,
                                    slots: template.map((s, i) => ({
                                        ...s,
                                        photoId: photoIds[i] || null
                                    }))
                                };
                                console.log(`[App] Layout "${layoutId}" → ${pg.layout.slots.length} slots, photoIds:`, photoIds);
                            }
                        });

                        console.log('[App] WhatsApp: Layout conversion done');

                        // === DIRECT STATE APPROACH ===
                        // Skip loadIntoEditor (has timing issues with _target/Proxy writes)
                        // Instead, set state directly and use the standard render pipeline

                        // Separate cover from content pages
                        const allPages = result.pages || [];
                        const waCoverPage = allPages.find(p => p.templateId === 'cover' || (p.id && p.id.startsWith('page_cover_')));
                        const waBackCoverPage = allPages.find(p => p.templateId === 'back-cover' || (p.id && p.id.startsWith('page_backcover_')));
                        const waContentPages = allPages.filter(p => p !== waCoverPage && p !== waBackCoverPage);

                        // Ensure all pages have unique IDs
                        waContentPages.forEach(p => { if (!p.id) p.id = crypto.randomUUID(); });

                        // Fill empty slots with unassigned photos (AFTER separating content pages)
                        const assignedIds = new Set();
                        waContentPages.forEach(pg => {
                            (pg.layout?.slots || []).forEach(s => {
                                if (s.photoId) assignedIds.add(s.photoId);
                            });
                        });
                        console.log('[App] WhatsApp SLOT FILL: assigned IDs:', assignedIds.size, 'total photos:', editorPhotos.length);

                        // Log per-page slot status BEFORE filling
                        waContentPages.forEach((pg, pi) => {
                            const slots = pg.layout?.slots || [];
                            const empty = slots.filter(s => !s.photoId).length;
                            const filled = slots.filter(s => !!s.photoId).length;
                            console.log(`[App] WhatsApp BEFORE fill - Page ${pi}: layout=${pg.layout?.id} slots=${slots.length} filled=${filled} empty=${empty}`);
                        });

                        const unassigned = editorPhotos.filter(p => !assignedIds.has(p.id));
                        console.log('[App] WhatsApp SLOT FILL: unassigned photos:', unassigned.length);
                        let unassignedIdx = 0;
                        let totalFilled = 0;
                        waContentPages.forEach((pg, pi) => {
                            const slots = pg.layout?.slots || [];
                            slots.forEach((slot, si) => {
                                if (!slot.photoId) {
                                    let photo;
                                    if (unassignedIdx < unassigned.length) {
                                        photo = unassigned[unassignedIdx++];
                                    } else {
                                        photo = editorPhotos[unassignedIdx % editorPhotos.length];
                                        unassignedIdx++;
                                    }
                                    if (photo) {
                                        slot.photoId = photo.id;
                                        if (!pg.photos) pg.photos = [];
                                        pg.photos.push(photo);
                                        totalFilled++;
                                        console.log(`[App] WhatsApp FILLED: Page ${pi} slot ${si} → ${photo.id}`);
                                    }
                                }
                            });
                        });
                        console.log('[App] WhatsApp: Filled', totalFilled, 'empty slots. Pages:', waContentPages.length, 'Photos:', editorPhotos.length);

                        // Block auth observer from overwriting
                        this.magicCreateGenerationStarted = true;

                        // CRITICAL: Suppress proxy notifications during batch setup
                        window.store._isBatchUpdating = true;

                        // 1. FIRST set assets (renderActivePage reads this)
                        window.store.state.assets = { photos: editorPhotos };

                        // 2. Then set pages and active page
                        window.store.state.pages = waContentPages;
                        window.store.state.activePageId = waContentPages[0]?.id;
                        window.store.state.viewMode = 'pages';

                        // 3. Set cover
                        if (waCoverPage) {
                            if (waCoverPage._coverGalleryId) {
                                // Country/travel gallery cover — preserve SVG fields exactly
                                window.store.state.cover = {
                                    ...(window.store.state.cover || {}),
                                    ...waCoverPage,
                                    // background is already the SVG data URI set in the auto-match block
                                    // Don't override it with null backgroundTextureId
                                };
                                console.log('[App] 🌍 Country cover applied to store:', waCoverPage._coverGalleryId);
                            } else {
                                window.store.state.cover = {
                                    ...(window.store.state.cover || {}),
                                    ...waCoverPage,
                                    background: waCoverPage.background || waCoverPage.backgroundTextureId,
                                    theme: waCoverPage.background || waCoverPage.backgroundTextureId,
                                };
                            }
                        }
                        if (result.theme) {
                            window.store.state.theme = result.theme;
                        }

                        // Store backups for preview/PDF
                        window._magicPages = waContentPages;
                        window._magicCover = { ...window.store.state.cover };
                        window._magicAssets = { photos: [...editorPhotos] };

                        // 4. Re-enable notifications
                        window.store._isBatchUpdating = false;

                        // 5. Render active page to main canvas
                        if (this.renderer && waContentPages[0]) {
                            const canvas = document.getElementById('canvas-container');
                            if (canvas) {
                                console.log('[App] WhatsApp: Rendering page 0 to canvas. Assets:', editorPhotos.length);
                                this.renderer.renderPageToContainer(
                                    waContentPages[0],
                                    { photos: editorPhotos },
                                    canvas,
                                    null
                                );
                            }
                        }

                        // 6. Update timeline thumbnails
                        if (this.updateTimeline) {
                            this.updateTimeline(waContentPages, waContentPages[0]?.id);
                        }

                        // 7. Notify subscribers
                        window.store.notify('pages', waContentPages);
                        this._magicCreateRendering = false;

                        // 8. Auto-save
                        if (this.saveDebounced) {
                            this.saveDebounced(window.store.state);
                        }

                        // 9. Force delayed re-render to catch IntersectionObserver + any async issues
                        setTimeout(() => {
                            // Ensure assets are still set (persistence might overwrite)
                            if (!window.store.state.assets?.photos?.length) {
                                window.store.state.assets = { photos: editorPhotos };
                            }
                            // Re-render active page
                            this.renderActivePage();
                            // Force ALL timeline thumbnails to render (don't rely on IntersectionObserver)
                            const tl = document.getElementById('page-timeline');
                            if (tl) {
                                const thumbs = tl.querySelectorAll('.timeline-page');
                                thumbs.forEach(t => {
                                    if (t._lazyRender && !t._rendered) {
                                        try {
                                            t._lazyRender();
                                            t._rendered = true;
                                        } catch (e) {
                                            console.warn('[App] Timeline thumb render failed:', e.message);
                                        }
                                    }
                                });
                            }
                        }, 800);

                        console.log('[App] WhatsApp album state set, rendering in 1s');
                        window.history.replaceState({}, document.title, window.location.pathname);
                        return;
                    } else {
                        console.error('[App] WhatsApp project not found:', this.waProjectId);
                    }
                } catch (e) {
                    console.error('[App] Failed to load WhatsApp project:', e);
                }

                // FALLBACK: If WA load failed but we restored from IndexedDB, fix empty slots
                setTimeout(() => {
                    const pages = window.store?.state?.pages || [];
                    const photos = window.store?.state?.assets?.photos || [];
                    if (pages.length > 0 && photos.length > 0) {
                        let filledCount = 0;
                        pages.forEach(pg => {
                            (pg.layout?.slots || []).forEach(slot => {
                                if (!slot.photoId && photos.length > 0) {
                                    slot.photoId = photos[filledCount % photos.length].id;
                                    if (!pg.photos) pg.photos = [];
                                    pg.photos.push(photos[filledCount % photos.length]);
                                    filledCount++;
                                }
                            });
                        });
                        if (filledCount > 0) {
                            console.log('[App] POST-RESTORE: Filled', filledCount, 'empty slots from cached data');
                            this.renderActivePage();
                            if (this.updateTimeline) {
                                this._lastTimelineHash = null; // Force full rebuild
                                this.updateTimeline(pages, window.store.state.activePageId);
                            }
                        }
                    }
                }, 3000);
            }

            // Prevent Race Condition: If user initiated Magic Create, do not restore old projects or re-trigger Start Fresh.
            if (this.magicCreateGenerationStarted) {
                console.log("[App] Auth observer skipped: Magic Create sequence already claimed session.");
                return;
            }

            if (true) {
                console.log("Auth State Changed, checking for projects. Logged in:", !!user);

                // Modal handles initialized here
                const restoreLoadingModal = document.getElementById('restore-loading-modal');
                const welcomeUploadModal = document.getElementById('auto-start-upload-modal');

                // Load saved project if exists (passing null userId will load from local DB)
                let savedData = null;

                if (this.urlProjectId) {
                    if (!user) {
                        // Force login for share links
                        alert("אנא התחבר כדי לצפות או לערוך אלבום זה.");
                        try {
                            await authService.signInWithGoogle();
                            return; // The auth observer will re-fire after login
                        } catch (e) {
                            console.error("Login required for shared album", e);
                            window.location.search = ""; // clear URL and fallback
                        }
                    }
                    if (this.urlShareToken && user) {
                        try {
                            await persistenceService.joinProject(this.urlProjectId, this.urlShareToken);
                        } catch (e) {
                            console.error("Failed to join project via share token:", e);
                            alert("קישור השיתוף אינו חוקי או פג תוקף.");
                        }
                    }
                    if (restoreLoadingModal) restoreLoadingModal.style.display = 'flex';
                    try {
                        savedData = await persistenceService.loadProject(user?.uid || null, this.urlProjectId);
                    } catch (e) {
                        console.error('[App] Failed to load shared project (IndexedDB/network error):', e);
                        savedData = null;
                    }

                    // Clear the URL to avoid re-joining on reload
                    window.history.replaceState({}, document.title, window.location.pathname);
                } else {
                    try {
                        savedData = await persistenceService.loadProject(user?.uid || null);
                    } catch (e) {
                        console.error('[App] Failed to load project from IndexedDB:', e);
                        console.warn('[App] Starting fresh due to storage error. Your project data may be too large for this browser.');
                        savedData = null;
                    }
                }

                if (savedData) {
                    console.log("Loading saved project...");

                    // --- VALIDATION: Check for corrupt/empty data ---
                    const isValid = (savedData.pages && savedData.pages.length > 0) || (savedData.cover);
                    if (!isValid) {
                        console.warn("[App] Loaded project appears empty or corrupt. Ignoring and starting fresh.");
                        savedData = null;
                        // Optionally delete the corrupt project?
                        // persistenceService.deleteProject(persistenceService.currentProjectId);
                    }
                }

                if (savedData) {
                    console.log("Valid saved project found. Restoring...");

                    // --- 1. LEGACY TEMPLATE CLEANUP ---
                    // Detect if this is the unwanted "Smith Family" default template
                    const hasLegacyDefault = (savedData.pages && savedData.pages.some(p => p.templateId === 'family-roots-v1')) ||
                        (savedData.cover && (savedData.cover.title === 'The Smith Family' || savedData.cover.subtitle === 'Roots & Memories'));

                    if (hasLegacyDefault) {
                        console.log("[App] Detected legacy default 'Smith Family' template in save. DISCARDING for clean slate.");
                        savedData = null; // Treat as no save
                    }
                }

                // --- 2. AUTO-START FRESH SESSION ENFORCEMENT ---
                // If user entered via "Magic Create" (Auto-Start), we MUST start fresh.
                // We typically do NOT want to restore the old project ("implement older photos or templates")
                // because the user's intent is to create something NEW.
                if (this.isAutoStart && !this.disabledAutoStart) {
                    console.log(`[App] Auto-Start detected. Ignoring saved project to enforce fresh session.`);
                    // Force null to trigger "Start Fresh" block below
                    savedData = null;
                    // CRITICAL: Reset persistence ID so we create a NEW Cloud Record instead of overwriting the old one
                    persistenceService.currentProjectId = null;
                }

                if (savedData) {
                    if (restoreLoadingModal) restoreLoadingModal.style.display = 'flex';

                    // --- 3. PRESERVE ACTIVE PHOTOS & CLEAR STALE BLOBS ---
                    // Prevent Auth Observer from clobbering photos imported via AutoStart/Manual Upload before Auth resolves.
                    const activePhotos = [...(store.state.assets?.photos || [])];

                    if (savedData.assets && savedData.assets.photos) {
                        // Keep valid URLs (Google Photos, Firebase Storage), discard stale blobs
                        // BUT: We now save blobs LOCALLY as Base64 in IndexedDB, so those are valid!
                        // Let's filter out 'blob:' if they don't work, but keep 'data:'
                        const persistentPhotos = savedData.assets.photos.filter(p => {
                            const testUrl = p.url || p.baseUrl || p.rawBaseUrl;
                            return testUrl && !testUrl.startsWith('blob:');
                        });

                        // Map baseUrl from Firestore back to url for UI
                        persistentPhotos.forEach(p => {
                            if (!p.url && p.baseUrl) {
                                p.url = p.baseUrl;
                                p.rawBaseUrl = p.baseUrl;
                            } else if (!p.url && p.rawBaseUrl) {
                                p.url = p.rawBaseUrl;
                            }
                        });

                        // Merge active photos from the current session (like fresh blobs before auth resolved)
                        const mergedPhotos = [...persistentPhotos];
                        for (const activePhoto of activePhotos) {
                            if (!mergedPhotos.find(p => p.id === activePhoto.id)) {
                                mergedPhotos.push(activePhoto);
                            }
                        }

                        console.log(`[App] Hydrating ${persistentPhotos.length} saved photos, adding ${activePhotos.length} active session photos.`);
                        savedData.assets.photos = mergedPhotos;
                    } else {
                        savedData.assets = { photos: activePhotos };
                    }

                    // RACE CONDITION GUARD: Check AGAIN before overwriting state.
                    // The initial check at the top of onAuthStateChanged may have passed
                    // before Magic Create started, but by the time we get here (after async
                    // loadProject), Magic Create may have already finished and set the correct state.
                    // We must NOT overwrite it.
                    if (this.magicCreateGenerationStarted) {
                        console.log("[App] Auth restore ABORTED: Magic Create completed while loading saved project.");
                        if (restoreLoadingModal) restoreLoadingModal.style.display = 'none';
                        return;
                    }

                    // DEFENSIVE: Ensure all pages have IDs before restoring state.
                    // Older Magic Create versions didn't generate page IDs, causing
                    // navigation failures (timeline clicks set activePageId to undefined).
                    if (savedData.pages && Array.isArray(savedData.pages)) {
                        savedData.pages.forEach(p => {
                            if (!p.id) {
                                p.id = crypto.randomUUID();
                                console.warn('[App] Auto-assigned missing page ID:', p.id);
                            }
                        });
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
                            pdfCanvasExport.setTemplateConfig(this.templateSidebar.manager.config);
                        } catch (e) {
                            console.error("Failed to restore template config:", e);
                        }
                    }

                    if (store.state.viewMode === 'cover') {
                        this.renderCoverWithTemplate();
                    } else {
                        this.renderActivePage();
                    }

                    console.log(`[App] Project restored for ${user ? (user.displayName || 'Unnamed User') : 'Local User'}`);
                    if (restoreLoadingModal) restoreLoadingModal.style.display = 'none';

                    // Handle Viewer Restrictions
                    if (persistenceService.currentRole === "viewer") {
                        this.applyViewerRestrictions();
                    } else {
                        this.removeViewerRestrictions();
                    }

                    // Start Presence Sync
                    if (user && persistenceService.currentProjectId) {
                        persistenceService.startPresence(persistenceService.currentProjectId, user, (activeUsers) => {
                            const container = document.getElementById('online-users');
                            if (!container) return;
                            container.innerHTML = '';

                            // Don't show myself if I'm the only one
                            if (activeUsers.length <= 1) return;

                            activeUsers.forEach(u => {
                                if (u.uid === user.uid) return; // Skip self visually
                                const div = document.createElement('div');
                                div.className = 'online-avatar';
                                div.title = u.displayName + ' עורך כעת';
                                if (u.photoURL) {
                                    div.style.backgroundImage = `url(${u.photoURL})`;
                                } else {
                                    div.textContent = u.displayName.charAt(0).toUpperCase();
                                }
                                container.appendChild(div);
                            });
                        });
                    }
                } else {
                    if (restoreLoadingModal) restoreLoadingModal.style.display = 'none';
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
                                pdfCanvasExport.setTemplateConfig(this.templateSidebar.manager.config);
                                // We might need to refresh the view to apply styles to the default pages
                                this.renderActivePage();
                            } catch (e) {
                                console.error("Failed to load target template:", e);
                            }
                        }, 500);
                    }

                    // Show Welcome Upload Popup conditionally (if we are starting fresh and NO project was loaded)
                    if (welcomeUploadModal) welcomeUploadModal.style.display = 'flex';
                }
            }
        });

        // Setup Auto-Save on all changes
        // NOTE: Auto-save and timeline updates are handled by the main subscriber
        // in setupEventListeners(). No duplicate subscriber here.
    }

    updateActiveThumbnailOnly() {
        if (!store.state.pages || !store.state.activePageId) return;
        const activeId = store.state.activePageId;
        const pageEl = document.querySelector(`.timeline-page.active`);
        if (pageEl && pageEl._lazyRender) {
            // If it's active and hasn't rendered yet, aggressively render it now
            pageEl._lazyRender();
            pageEl._lazyRender = null;
        }
    }

    /**
     * Re-renders the active page's timeline thumbnail to reflect content changes
     * (photo repositioning, spacing, layout changes, etc.)
     * Debounced to avoid excessive re-renders during rapid changes.
     */
    refreshActivePageThumbnail() {
        if (!store.state.activePageId || store.state.viewMode === 'cover') return;

        const tl = document.getElementById('page-timeline');
        if (!tl) return;

        const pageEl = tl.querySelector(`.timeline-page[data-page-id="${store.state.activePageId}"]`);
        if (!pageEl) return;

        // Robustly clear ALL preview content (keep only the page number label)
        Array.from(pageEl.children).forEach(child => {
            if (!child.classList.contains('page-num')) {
                child.remove();
            }
        });

        // Get dimensions
        const manager = this.templateSidebar?.manager;
        let rw = 800, rh = 600;
        if (manager?.config?.designSystem?.canvas) {
            rw = manager.config.designSystem.canvas.scaledWidth || manager.config.designSystem.canvas.width || rw;
            rh = manager.config.designSystem.canvas.scaledHeight || manager.config.designSystem.canvas.height || rh;
        }

        const isMobileSize = window.innerWidth <= 768;
        const THUMB_SIZE = isMobileSize ? 80 : 110;
        const scaleX = THUMB_SIZE / rw;
        const scaleY = THUMB_SIZE / rh;
        const pageScale = Math.max(scaleX, scaleY);

        const page = store.state.pages.find(p => p.id === store.state.activePageId);
        if (!page) return;

        try {
            const previewWrapper = document.createElement('div');
            previewWrapper.className = 'timeline-preview-wrapper';
            previewWrapper.style.width = `${rw}px`;
            previewWrapper.style.height = `${rh}px`;
            previewWrapper.style.position = 'absolute';
            previewWrapper.style.top = '50%';
            previewWrapper.style.left = '50%';
            previewWrapper.style.transform = `translate(-50%, -50%) scale(${pageScale})`;
            previewWrapper.style.transformOrigin = 'center center';
            previewWrapper.style.pointerEvents = 'none';
            // Use transparent background — let renderPageToContainer handle it
            previewWrapper.style.backgroundColor = 'transparent';

            let rendered = false;
            if (page.templateId && manager?.config?.templateId === page.templateId) {
                const renderer = this.getSpecializedRenderer(page.templateId, manager.config);
                if (renderer && page.rawLayoutId) {
                    const layout = manager.config.pageLayouts.find(l => l.layoutId === page.rawLayoutId);
                    if (layout) {
                        const dom = renderer.renderPage(layout, page.photos || [], page.textContent || {}, page.textPositions || {});
                        if (dom) {
                            dom.style.width = '100%';
                            dom.style.height = '100%';
                            previewWrapper.appendChild(dom);
                            rendered = true;
                        }
                    }
                }
            }

            if (!rendered) {
                this.renderer.renderPageToContainer(page, store.state.assets, previewWrapper);
            }

            pageEl.appendChild(previewWrapper);
            pageEl._rendered = true;
        } catch (err) {
            console.warn('[App] Thumbnail refresh error:', err.message);
        }
    }

    /**
     * Refreshes ONLY the cover thumbnail in the timeline.
     * Called when cover properties change (gallery selection, text, background etc.)
     * without rebuilding the entire timeline.
     */
    refreshCoverThumbnail() {
        const tl = document.getElementById('page-timeline');
        if (!tl) return;

        const coverEl = tl.querySelector('.timeline-page.cover');
        if (!coverEl) return;

        // Clear existing preview content
        const existingPreview = coverEl.querySelector('div[style*="position: absolute"]');
        if (existingPreview) existingPreview.remove();

        // Get dimensions
        const manager = this.templateSidebar?.manager;
        let rw = 800, rh = 600;
        if (manager?.config?.designSystem?.canvas) {
            rw = manager.config.designSystem.canvas.scaledWidth || manager.config.designSystem.canvas.width || rw;
            rh = manager.config.designSystem.canvas.scaledHeight || manager.config.designSystem.canvas.height || rh;
        }

        const isMobileSize = window.innerWidth <= 768;
        const THUMB_SIZE = isMobileSize ? 80 : 110;
        const scaleX = THUMB_SIZE / rw;
        const scaleY = THUMB_SIZE / rh;
        const coverScale = Math.max(scaleX, scaleY);

        // Re-render
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

        const templateConfig = manager?.config || null;
        UnifiedCoverRenderer.render({
            cover: store.state.cover,
            assets: store.state.assets,
            templateConfig,
            container: preview,
            interactive: false,
            thumbnail: false
        });

        coverEl.appendChild(preview);
        coverEl._rendered = true;
        console.log('[App] Cover thumbnail refreshed');
    }

    renderActivePage() {
        let p = store.state.pages.find(pg => pg.id === store.state.activePageId);
        console.log('[renderActivePage] activePageId:', store.state.activePageId?.substring(0, 12), 'found:', !!p, 'totalPages:', store.state.pages.length);

        // CRITICAL FIX: If the page isn't found in the store, try to restore from
        // _magicPages. Magic Create writes pages to _target directly, but they get
        // overwritten by later proxy sets (e.g., addPage creates a new array via
        // this.state.pages = [...this.state.pages, newPage]).
        if (!p && window._magicPages && window._magicPages.length > 0) {
            console.log('[renderActivePage] Page not in store — restoring', window._magicPages.length, 'pages from _magicPages');
            store._isBatchUpdating = true;
            store.state.pages = window._magicPages;
            store._isBatchUpdating = false;
            p = store.state.pages.find(pg => pg.id === store.state.activePageId);
            console.log('[renderActivePage] After restore: found:', !!p, 'totalPages:', store.state.pages.length);
        }

        if (!p) {
            console.warn('[renderActivePage] Page NOT FOUND even after restore! Page IDs:', store.state.pages.map(pg => pg.id?.substring(0, 12)));
            return;
        }

        // Check for Specialized Renderer
        // We need access to the Template Config for the renderer. 
        // We assume TemplateSidebar has the manager with the config loaded.
        if (p.templateId) {
            const manager = this.templateSidebar?.manager;
            if (manager && manager.config && manager.config.templateId === p.templateId) {

                // Unified Template Renderer — all templates use the same engine
                const renderer = new UnifiedTemplateRenderer(manager.config);

                if (renderer && p.rawLayoutId) {
                    const layout = manager.config.pageLayouts.find(l => l.layoutId === p.rawLayoutId);
                    if (layout) {
                        const el = renderer.renderPage(layout, p.photos || [], p.textContent || {}, p.textPositions || {}, p);

                        // Apply custom text styles/scales universally across any template
                        if (p.textStyles) {
                            Object.entries(p.textStyles).forEach(([elementId, styles]) => {
                                const targetEl = el.querySelector(`[data-selectable-id="${elementId}"]`);
                                if (targetEl && styles.size) {
                                    const val = styles.size / 100;
                                    if (targetEl.style.transform && targetEl.style.transform !== 'none') {
                                        targetEl.style.transform += ` scale(${val})`;
                                    } else {
                                        targetEl.style.transform = `scale(${val})`;
                                        targetEl.style.transformOrigin = 'center center';
                                    }
                                }
                            });
                        }

                        // INJECT CROP STYLES AND TOOLTIPS FOR TEMPLATE RENDERERS
                        if (p.layout && p.layout.slots) {
                            p.layout.slots.forEach((slot, index) => {
                                const slotContainers = el.querySelectorAll('.photo-slot');
                                const slotContainer = el.querySelector(`.photo-slot[data-selectable-id="${slot.photoId}"]`) || slotContainers[index];
                                if (slotContainer) {
                                    // Add hover hint to make it clear for the user
                                    slotContainer.title = "לחץ פעמיים לשינוי מיקום / זום על התמונה";
                                    const img = slotContainer.querySelector('img');
                                    if (img && slot.crop && slot.photoId) {
                                        const panX = slot.crop.panX !== undefined ? slot.crop.panX : 50;
                                        const panY = slot.crop.panY !== undefined ? slot.crop.panY : 50;
                                        const zoom = slot.crop.zoom || 1;
                                        img.style.objectPosition = `${panX}% ${panY}%`;
                                        img.style.transform = `scale(${zoom})`;
                                        img.style.transformOrigin = 'center center';
                                    }
                                }
                            });
                        }


                        // INJECT USER ELEMENTS GLOBALLY FOR ALL SPECIALIZED TEMPLATES!
                        if (p.elements) {
                            p.elements.forEach(elem => {
                                // SKIP native elements mapped by TemplateManager; specialized renderers handle them!
                                if (elem.id && (elem.id.startsWith('text_') || elem.id.startsWith('dec_') || elem.id.startsWith('container_'))) return;

                                const domEl = document.createElement('div');
                                domEl.className = `page-element element-${elem.type}`;
                                domEl.style.position = 'absolute';
                                domEl.style.left = `${elem.x}%`;
                                domEl.style.top = `${elem.y}%`;
                                if (elem.zIndex !== undefined) domEl.style.zIndex = elem.zIndex;
                                if (elem.transform) domEl.style.transform = elem.transform;
                                domEl.dataset.selectableType = elem.type;
                                domEl.dataset.selectableId = elem.id;

                                if (elem.type === 'text') {
                                    domEl.classList.add('text-element');
                                    domEl.style.minWidth = '200px';
                                    if (elem.pixelWidth) domEl.style.width = elem.pixelWidth;
                                    if (elem.pixelHeight) domEl.style.height = elem.pixelHeight;
                                    domEl.style.maxWidth = `${elem.width || 50}%`;

                                    const styleDef = window.TEXT_STYLES?.find(s => s.id === elem.styleId);
                                    if (styleDef && styleDef.style) Object.assign(domEl.style, styleDef.style);

                                    if (elem.fontSize) domEl.style.fontSize = `${elem.fontSize}px`;
                                    if (elem.color) domEl.style.color = elem.color;
                                    if (elem.fontFamily) domEl.style.fontFamily = elem.fontFamily;
                                    if (elem.textAlign) domEl.style.textAlign = elem.textAlign;
                                    domEl.textContent = elem.content;
                                } else if (elem.type === 'qr') {
                                    // ── QR Code Element ──
                                    domEl.classList.add('qr-element');
                                    domEl.style.width = elem.pixelWidth || '80px';
                                    domEl.style.height = elem.pixelHeight || '80px';
                                    domEl.style.cursor = 'pointer';
                                    domEl.title = elem.targetUrl || 'QR Code';
                                    const qrImg = document.createElement('img');
                                    qrImg.src = elem.url;
                                    qrImg.style.width = '100%';
                                    qrImg.style.height = '100%';
                                    qrImg.style.objectFit = 'contain';
                                    qrImg.style.borderRadius = '6px';
                                    qrImg.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                                    qrImg.draggable = false;
                                    domEl.appendChild(qrImg);
                                    // Video badge
                                    if (elem.isVideo) {
                                        const badge = document.createElement('div');
                                        badge.style.cssText = 'position:absolute;top:-6px;right:-6px;background:#ff4444;color:white;font-size:9px;padding:2px 5px;border-radius:8px;font-weight:700;z-index:10;';
                                        badge.textContent = '▶ וידאו';
                                        domEl.appendChild(badge);
                                    }
                                } else if (elem.type === 'element') {
                                    domEl.classList.add('visual-element');
                                    domEl.style.width = elem.pixelWidth || '100px';
                                    domEl.style.height = elem.pixelHeight || '100px';
                                    const img = document.createElement('img');
                                    img.src = elem.url;
                                    img.style.width = '100%';
                                    img.style.height = '100%';
                                    img.style.objectFit = 'contain';
                                    img.draggable = false;

                                    let filterStr = '';
                                    if (elem.filterHue) filterStr += `hue-rotate(${elem.filterHue}deg) `;
                                    if (elem.filterBrightness && elem.filterBrightness !== 100) filterStr += `brightness(${elem.filterBrightness}%) `;
                                    if (elem.filterShadow) filterStr += `drop-shadow(2px 4px 6px ${elem.filterShadowColor || 'rgba(0,0,0,0.5)'}) `;
                                    if (filterStr) img.style.filter = filterStr.trim();

                                    domEl.appendChild(img);
                                }

                                if (elem.id === store.state.selection) {
                                    domEl.classList.add('selected');
                                    domEl.style.border = '2px solid var(--color-primary, #6366f1)';
                                }

                                el.appendChild(domEl);
                            });
                        }
                        const container = document.getElementById('canvas-container');
                        container.innerHTML = '';
                        // Ensure template pages have the required class and data attributes
                        // for crop mode and other interactions to work
                        el.classList.add('shoso-page');
                        el.dataset.pageId = p.id;
                        container.appendChild(el);

                        // Post-render: fix text overlaps (especially for Hebrew content)
                        this.fixTextOverlaps(el);

                        return; // Successfully used custom renderer
                    }
                }
            }
        }

        // Fallback to Default RenderEngine
        this.renderer.renderPage(p, store.state.assets, store.state.selection);
    }

    /**
     * Post-render overlap fixer for text elements.
     * Detects overlapping text elements and adjusts font sizes or positions.
     * Particularly important for Hebrew/RTL text which tends to be longer than English.
     */
    fixTextOverlaps(pageEl) {
        if (!pageEl) return;

        const textElements = Array.from(pageEl.querySelectorAll('.text-element'));
        if (textElements.length < 2) return;

        // Get bounding info relative to the page container
        const pageRect = pageEl.getBoundingClientRect();

        // Build sorted list of text elements by their top position
        const sorted = textElements.map(el => {
            const rect = el.getBoundingClientRect();
            return {
                el,
                top: rect.top - pageRect.top,
                bottom: rect.bottom - pageRect.top,
                left: rect.left - pageRect.left,
                right: rect.right - pageRect.left,
                height: rect.height,
                fontSize: parseFloat(getComputedStyle(el).fontSize)
            };
        }).sort((a, b) => a.top - b.top);

        // Check adjacent pairs for overlap
        const MIN_GAP = 4; // Minimum pixels between elements
        const MIN_FONT_RATIO = 0.6; // Don't shrink below 60% of original size

        for (let i = 0; i < sorted.length - 1; i++) {
            const upper = sorted[i];
            const lower = sorted[i + 1];

            // Check if they overlap vertically and horizontally
            const verticalOverlap = upper.bottom + MIN_GAP > lower.top;
            const horizontalOverlap = !(upper.right < lower.left || upper.left > lower.right);

            if (verticalOverlap && horizontalOverlap) {
                const overlapAmount = upper.bottom + MIN_GAP - lower.top;

                // Strategy 1: Try reducing upper element's font size
                let newFontSize = upper.fontSize;
                const minFontSize = upper.fontSize * MIN_FONT_RATIO;
                let resolved = false;

                while (newFontSize > minFontSize) {
                    newFontSize -= 1;
                    upper.el.style.fontSize = `${newFontSize}px`;

                    // Recalculate bounds
                    const newRect = upper.el.getBoundingClientRect();
                    const newBottom = newRect.bottom - pageRect.top;

                    if (newBottom + MIN_GAP <= lower.top) {
                        resolved = true;
                        upper.bottom = newBottom;
                        break;
                    }
                }

                // Strategy 2: If still overlapping, push lower element down
                if (!resolved) {
                    const stillOverlap = upper.el.getBoundingClientRect().bottom - pageRect.top + MIN_GAP - lower.top;
                    if (stillOverlap > 0) {
                        const currentTop = parseFloat(lower.el.style.top) || 0;
                        const unit = (lower.el.style.top || '').includes('%') ? '%' : 'px';

                        if (unit === '%') {
                            const shiftPct = (stillOverlap / pageRect.height) * 100;
                            lower.el.style.top = `${(currentTop + shiftPct).toFixed(1)}%`;
                        } else {
                            lower.el.style.top = `${currentTop + stillOverlap}px`;
                        }

                        // Update lower bounds for next iteration
                        const updatedRect = lower.el.getBoundingClientRect();
                        lower.top = updatedRect.top - pageRect.top;
                        lower.bottom = updatedRect.bottom - pageRect.top;
                    }
                }
            }
        }
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
        this.renderElementsLibrary();

        // Initialize with one page
        store.addPage();

        // Initialize Template Sidebar (New) - ensures it loads even without auth restore
        this.templateSidebar = new TemplateSidebar('template-library', this);
        this.templateSidebar.init();
    }

    renderElementsLibrary() {
        const grid = document.getElementById('elements-library');
        if (!grid) return;

        const elements = window.ELEMENTS_LIBRARY || [];
        grid.innerHTML = '';

        elements.forEach(item => {
            const el = document.createElement('div');
            el.className = 'asset-item element-item';
            el.draggable = true;
            el.title = item.title || 'Element';
            el.style.cursor = 'grab';
            el.style.border = '1px solid rgba(255,255,255,0.1)';
            el.style.borderRadius = '8px';
            el.style.padding = '10px';
            el.style.backgroundColor = 'rgba(0,0,0,0.2)';
            el.style.display = 'flex';
            el.style.alignItems = 'center';
            el.style.justifyContent = 'center';
            el.style.aspectRatio = '1/1';

            const img = document.createElement('img');
            img.src = item.url;
            img.style.maxWidth = '100%';
            img.style.maxHeight = '100%';
            img.style.objectFit = 'contain';
            img.draggable = false;

            el.appendChild(img);

            el.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'element',
                    id: item.id,
                    url: item.url
                }));
                el.style.opacity = '0.5';
            });
            el.addEventListener('dragend', () => { el.style.opacity = '1'; });

            grid.appendChild(el);
        });
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

        // FIX: Reset Magic Create rendering flag — if it's still true,
        // the subscriber will block ALL canvas renders permanently
        this._magicCreateRendering = false;

        // FIX: Invalidate timeline hash so the timeline rebuilds with new pages
        this._lastTimelineHash = null;

        if (newCover) {
            store.state.cover = newCover;
            // FIX: Notify subscribers about cover update (was commented out!)
            store.notify('cover', newCover);
        }

        if (newPages && newPages.length > 0) {
            console.log(`[App] Applying template with ${newPages.length} pages`);

            // FIX: Ensure viewMode is 'pages' (not 'cover') so active page renders
            store.state.viewMode = 'pages';
            store.state.pages = newPages;
            store.state.activePageId = newPages[0].id;

            // Notify subscribers — these trigger RAF-batched timeline + canvas render
            store.notify('pages', store.state.pages);
            store.notify('activePageId', store.state.activePageId);

            // Sync PDF Config
            if (this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config) {
                console.log("[App] Syncing PDF Template Config...");
                pdfExport.setTemplateConfig(this.templateSidebar.manager.config);
                pdfCanvasExport.setTemplateConfig(this.templateSidebar.manager.config);
            }

            // FIX: Force explicit timeline rebuild (don't rely solely on RAF subscriber)
            this.updateTimeline(newPages, newPages[0].id);

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
        console.log('[renderCoverWithTemplate] cover from store:', JSON.stringify({
            background: cover?.background,
            theme: cover?.theme,
            title: cover?.title,
            id: cover?.id
        }));
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

        // Clean up any corrupted textPositions for structural elements
        // These should NEVER have position overrides — they are flex children
        if (cover && cover.textPositions) {
            delete cover.textPositions['cover-photo'];
            delete cover.textPositions['cover-back-photo'];
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

        // Post-render: fix text overlaps on cover
        this.fixTextOverlaps(container);
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

    /**
     * Normalize an element's position before Moveable attaches.
     * Converts CSS centering tricks (left:50%+translateX(-50%)) into 
     * simple pixel-based left/top relative to the offset parent.
     * This prevents Moveable from causing jumps when it replaces the transform.
     */
    _normalizeCoverTextPosition(el) {
        if (!el || el.dataset.selectableType !== 'cover-text') return;
        if (el._positionNormalized) return; // Already done

        const offsetParent = el.offsetParent || el.parentElement;
        if (!offsetParent) return;

        // Capture the element's ACTUAL visual position on screen
        const parentRect = offsetParent.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();

        // Calculate position relative to offset parent (in pixels)
        const pixelLeft = elRect.left - parentRect.left;
        const pixelTop = elRect.top - parentRect.top;

        // Clear any centering transform and switch to simple absolute positioning
        el.style.position = 'absolute';
        el.style.left = `${pixelLeft}px`;
        el.style.top = `${pixelTop}px`;
        el.style.transform = '';
        el.style.margin = '0';

        el._positionNormalized = true;
        console.log(`[App] Normalized cover text "${el.dataset.selectableId}" → left:${pixelLeft.toFixed(0)}px, top:${pixelTop.toFixed(0)}px`);
    }

    updateMoveable(state) {
        if (!window.Moveable) return;

        const container = document.getElementById('canvas-container');
        if (!container) return;

        // Clean up existing instance if no selection
        if (!state.selection) {
            if (this.moveableInstance) {
                this.moveableInstance.destroy();
                this.moveableInstance = null;
            }
            return;
        }

        // Find the newly rendered selected element
        const targetEl = document.querySelector(`[data-selectable-id="${state.selection}"]`);

        if (!targetEl) {
            if (this.moveableInstance) {
                this.moveableInstance.destroy();
                this.moveableInstance = null;
            }
            return;
        }

        // Do not attach moveable to template layout slots or cover photo areas
        const selectableType = targetEl.dataset.selectableType;
        if (selectableType === 'photo' || selectableType === 'empty-slot' || selectableType === 'cover-photo') {
            if (this.moveableInstance) {
                this.moveableInstance.destroy();
                this.moveableInstance = null;
            }
            return;
        }

        // CRITICAL: Normalize cover text position BEFORE Moveable attaches
        // This converts CSS centering (left:50% + translateX(-50%)) to simple pixel left/top,
        // preventing the element from jumping when Moveable replaces the transform.
        this._normalizeCoverTextPosition(targetEl);

        // We have a selection and a DOM element
        if (this.moveableInstance) {
            this.moveableInstance.target = targetEl;
            this.moveableInstance.updateRect();
        } else {
            console.log("[App] Instantiating Moveable for element config groundwork.");
            this.moveableInstance = new window.Moveable(container, {
                target: targetEl,
                draggable: true,
                resizable: true,
                rotatable: true,
                snappable: true,
                edge: false,
                origin: true,
                keepRatio: false
            });

            // Drag handler — uses simple pixel-based left/top after normalization
            this.moveableInstance.on('drag', ({ target, transform }) => {
                const parent = target.closest('.cover-section.front-cover, .cover-section.back-cover, .album-page') || target.parentElement;
                if (parent) {
                    const parentRect = parent.getBoundingClientRect();
                    const elW = target.offsetWidth;
                    const elH = target.offsetHeight;

                    // Parse translate values from Moveable's transform
                    const match = transform.match(/translate\(([^,]+),\s*([^)]+)\)/);
                    if (match) {
                        let tx = parseFloat(match[1]) || 0;
                        let ty = parseFloat(match[2]) || 0;

                        // Compute absolute position (left/top is now in px after normalization)
                        const baseLeft = parseFloat(target.style.left) || 0;
                        const baseTop = parseFloat(target.style.top) || 0;

                        const absLeft = baseLeft + tx;
                        const absTop = baseTop + ty;

                        // Clamp: keep at least 20px of the element visible
                        const margin = 20;
                        if (absLeft < -(elW - margin)) tx += (-(elW - margin) - absLeft);
                        if (absLeft > parentRect.width - margin) tx += (parentRect.width - margin - absLeft);
                        if (absTop < -(elH - margin)) ty += (-(elH - margin) - absTop);
                        if (absTop > parentRect.height - margin) ty += (parentRect.height - margin - absTop);

                        transform = `translate(${tx}px, ${ty}px)`;
                    }
                }
                target.style.transform = transform;
            }).on('resize', ({ target, width, height, drag }) => {
                target.style.width = `${width}px`;
                target.style.height = `${height}px`;
                target.style.transform = drag.transform;
            }).on('rotate', ({ target, transform }) => {
                target.style.transform = transform;
            }).on('dragEnd', ({ target }) => {
                this.persistMoveableState(target);
            }).on('resizeEnd', ({ target }) => {
                this.persistMoveableState(target);
            }).on('rotateEnd', ({ target }) => {
                this.persistMoveableState(target);
            });
        }
    }

    persistMoveableState(target) {
        if (!target) return;
        const id = target.dataset.selectableId;
        const type = target.dataset.selectableType;

        if (!id || !type) return;

        if (type === 'cover-text') {
            // Only persist positions for text elements on the cover (title, subtitle)
            // Do NOT persist for cover-photo or cover-back-photo — they are structural flex elements
            // Convert Moveable's drag position into absolute textPositions
            // and apply directly to the DOM element (no re-render needed)
            if (!store.state.cover.textPositions) store.state.cover.textPositions = {};
            if (!store.state.cover.textStyles) store.state.cover.textStyles = {};
            if (!store.state.cover.textStyles[id]) store.state.cover.textStyles[id] = {};

            // Get the ACTUAL positioning context for this element.
            // offsetParent returns the nearest positioned ancestor, which is where
            // position:absolute will be calculated relative to.
            const positioningContext = target.offsetParent || target.parentElement;
            if (!positioningContext) return;
            const containerRect = positioningContext.getBoundingClientRect();

            // Use getBoundingClientRect to get the element's ACTUAL rendered position
            // This correctly handles flexbox-positioned elements where CSS left/top are not set
            const targetRect = target.getBoundingClientRect();

            // Calculate position relative to parent container (as percentages)
            const relativeLeft = targetRect.left - containerRect.left;
            const relativeTop = targetRect.top - containerRect.top;

            const newX = ((relativeLeft / containerRect.width) * 100).toFixed(1) + '%';
            const newY = ((relativeTop / containerRect.height) * 100).toFixed(1) + '%';

            // Clear the transform first, then set absolute positioning
            target.style.transform = '';
            target.style.position = 'absolute';
            target.style.left = newX;
            target.style.top = newY;

            // Save to state silently (don't notify 'cover' to avoid full re-render)
            store.state.cover.textPositions[id] = {
                x: newX,
                y: newY,
                width: target.style.width || undefined,
                height: target.style.height || undefined
            };

            console.log(`[App] Persisted cover ${type} position: ${id} → (${newX}, ${newY})`);

            // Save width/height from resize
            store.state.cover.textStyles[id].width = target.style.width;
            store.state.cover.textStyles[id].height = target.style.height;

            // Push undo state and trigger auto-save WITHOUT full cover re-render
            clearTimeout(window._moveableDebounce);
            window._moveableDebounce = setTimeout(() => {
                store.pushState('Move Cover Element');
                // Use 'coverPosition' instead of 'cover' to trigger auto-save only
                store.notify('coverPosition', store.state.cover);
            }, 500);
        } else if (type === 'text' || type === 'shape' || type === 'element' || type === 'qr') {
            const page = store.state.pages.find(p => p.id === store.state.activePageId);
            if (page && page.elements) {
                const el = page.elements.find(e => e.id === id);
                if (el) {
                    // Convert pixel-based Moveable transform to percentage-based coordinates
                    // so that positions are resolution-independent and scale correctly in preview/PDF
                    const positioningContext = target.offsetParent || target.parentElement;
                    if (positioningContext) {
                        const containerRect = positioningContext.getBoundingClientRect();
                        const targetRect = target.getBoundingClientRect();

                        const relativeLeft = targetRect.left - containerRect.left;
                        const relativeTop = targetRect.top - containerRect.top;

                        const newX = parseFloat(((relativeLeft / containerRect.width) * 100).toFixed(2));
                        const newY = parseFloat(((relativeTop / containerRect.height) * 100).toFixed(2));

                        // Update state with percentage positions
                        el.x = newX;
                        el.y = newY;

                        // Clear pixel-based transform and use absolute positioning
                        target.style.transform = '';
                        target.style.position = 'absolute';
                        target.style.left = `${newX}%`;
                        target.style.top = `${newY}%`;

                        // Clear the stored transform since position is now in x/y percentages
                        el.transform = '';
                    }

                    el.pixelWidth = target.style.width;
                    el.pixelHeight = target.style.height;

                    console.log(`[App] Persisted page ${type} position: ${id} → (${el.x}%, ${el.y}%)`);

                    clearTimeout(window._moveableDebounce);
                    window._moveableDebounce = setTimeout(() => {
                        store.pushState('Move Element');
                        store.notify('pages', store.state.pages);
                    }, 500);
                }
            }
        }
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ignore if typing in input/textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return;
            }

            const state = store.state;
            const selectionId = state.selection;
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const cmdOrCtrl = isMac ? e.metaKey : e.ctrlKey;

            // Undo / Redo
            if (cmdOrCtrl && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                if (e.shiftKey) {
                    store.redo();
                } else {
                    store.undo();
                }
                return;
            }

            // Copy
            if (cmdOrCtrl && selectionId && e.key.toLowerCase() === 'c') {
                this.handleCopy(selectionId);
                return;
            }

            // Paste
            if (cmdOrCtrl && e.key.toLowerCase() === 'v') {
                this.handlePaste();
                return;
            }

            // Delete / Backspace
            if ((e.key === 'Backspace' || e.key === 'Delete') && selectionId) {
                e.preventDefault();
                this.handleDeleteSelection(selectionId);
                return;
            }

            // Arrow Keys for moving
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key) && selectionId) {
                e.preventDefault();
                this.handleMoveSelection(selectionId, e.key, e.shiftKey ? 10 : 1);
                return;
            }
        });
    }

    handleDeleteSelection(selectionId) {
        const state = store.state;
        let page = state.pages.find(p => p.id === state.activePageId);

        if (!page && state.viewMode === 'cover') {
            if (state.cover.frontPhotoId === selectionId) {
                store.pushState('Delete Cover Photo');
                state.cover.frontPhotoId = null;
                store.notify('cover', state.cover);
                store.state.selection = null;
                store.notify('selection', null);
            } else if (state.cover.backPhotoId === selectionId) {
                store.pushState('Delete Cover Photo');
                state.cover.backPhotoId = null;
                store.notify('cover', state.cover);
                store.state.selection = null;
                store.notify('selection', null);
            }
            return;
        }

        if (!page) return;

        // Custom injected elements
        if (page.elements && page.elements.find(e => e.id === selectionId)) {
            store.pushState('Delete Element');
            page.elements = page.elements.filter(el => el.id !== selectionId);
            store.state.selection = null;
            store.notify('pages', store.state.pages);
            store.notify('selection', null);
            return;
        }

        // Native template photo slots vs Dynamic layout slots
        if (page.photos && Array.isArray(page.photos) && page.photos.find(p => p && p.id === selectionId)) {
            if (page.templateId) {
                const photoIdx = page.photos.findIndex(p => p && p.id === selectionId);
                if (photoIdx > -1) {
                    store.pushState('Delete Photo');
                    page.photos[photoIdx] = null;
                    if (page.layout && page.layout.slots) {
                        const slot = page.layout.slots.find(s => s.photoId === selectionId);
                        if (slot) slot.photoId = null;
                    }
                    store.state.selection = null;
                    store.notify('pages', store.state.pages);
                    store.notify('selection', null);
                    return;
                }
            } else {
                store.pushState('Delete Photo');
                const pIdx = page.photos.findIndex(p => p && p.id === selectionId);
                if (pIdx > -1) {
                    page.photos.splice(pIdx, 1);
                    if (this.layoutEngine) {
                        page.layout = this.layoutEngine.generateLayout(page.photos, page.layout ? page.layout.name : null);
                    }
                    store.state.selection = null;
                    store.notify('pages', store.state.pages);
                    store.notify('selection', null);
                    return;
                }
            }
        }
    }

    handleMoveSelection(selectionId, direction, amount) {
        const state = store.state;
        const page = state.pages.find(p => p.id === state.activePageId);
        if (!page) return;

        let moved = false;

        // 1. Custom injected elements
        const userEl = page.elements && page.elements.find(e => e.id === selectionId);
        if (userEl) {
            store.pushState('Move Element');
            let amt = amount * 0.25;
            if (direction === 'ArrowUp') userEl.y -= amt;
            if (direction === 'ArrowDown') userEl.y += amt;
            if (direction === 'ArrowLeft') userEl.x -= amt;
            if (direction === 'ArrowRight') userEl.x += amt;
            moved = true;
        } else if (page.templateId) {
            // 2. Template photo slot (PAN CROP)
            const slot = page.layout && page.layout.slots ? page.layout.slots.find(s => s.photoId === selectionId) : null;
            if (slot) {
                store.pushState('Pan Template Image');
                if (!slot.crop) {
                    slot.crop = { panX: 50, panY: 50, zoom: 1 };
                }
                const panAmt = amount * 2; // percentages
                if (direction === 'ArrowUp') slot.crop.panY = Math.max(0, (slot.crop.panY || 50) - panAmt);
                if (direction === 'ArrowDown') slot.crop.panY = Math.min(100, (slot.crop.panY || 50) + panAmt);
                if (direction === 'ArrowLeft') slot.crop.panX = Math.max(0, (slot.crop.panX || 50) - panAmt);
                if (direction === 'ArrowRight') slot.crop.panX = Math.min(100, (slot.crop.panX || 50) + panAmt);

                moved = true;
            } else {
                // 3. Template text element
                if (!page.textPositions) page.textPositions = {};
                let pos = page.textPositions[selectionId];
                if (!pos) {
                    const domEl = document.querySelector(`[data-selectable-id="${selectionId}"]`);
                    if (domEl) {
                        pos = {
                            x: domEl.style.left || '0%',
                            y: domEl.style.top || '0%'
                        };
                    } else {
                        pos = { x: '0%', y: '0%' };
                    }
                } else {
                    pos = { ...pos };
                }

                store.pushState('Move Template Text');
                const moveVal = (valStr, dirAmount) => {
                    let v = parseFloat(valStr) || 0;
                    let unit = valStr.toString().replace(/[0-9.-]/g, '') || '%';
                    return (v + dirAmount) + unit;
                };

                let unitX = pos.x.toString().replace(/[0-9.-]/g, '') || '%';
                let unitY = pos.y.toString().replace(/[0-9.-]/g, '') || '%';
                let amtX = (unitX === '%') ? amount * 0.2 : amount;
                let amtY = (unitY === '%') ? amount * 0.2 : amount;

                if (direction === 'ArrowUp') pos.y = moveVal(pos.y, -amtY);
                if (direction === 'ArrowDown') pos.y = moveVal(pos.y, amtY);
                if (direction === 'ArrowLeft') pos.x = moveVal(pos.x, -amtX);
                if (direction === 'ArrowRight') pos.x = moveVal(pos.x, amtX);

                page.textPositions[selectionId] = pos;
                moved = true;
            }
        }

        if (moved) {
            store.notify('pages', state.pages);
            if (this.moveableInstance) {
                setTimeout(() => this.moveableInstance.updateRect(), 0);
            }
        }
    }

    handleCopy(selectionId) {
        const state = store.state;
        const page = state.pages.find(p => p.id === state.activePageId);
        if (!page) return;

        // User element
        let el = page.elements && page.elements.find(e => e.id === selectionId);
        if (el) {
            this.clipboard = { type: 'element', data: JSON.parse(JSON.stringify(el)) };
            console.log("[App] Copied user element", el.id);
            return;
        }

        // Template text element
        if (page.templateId) {
            const content = page.textContent ? page.textContent[selectionId] : null;
            if (content) {
                this.clipboard = { type: 'text', data: { id: selectionId, content: content } };
                console.log("[App] Copied template text", selectionId);
            }
        }
    }

    handlePaste() {
        if (!this.clipboard) return;
        const state = store.state;
        const page = state.pages.find(p => p.id === state.activePageId);
        if (!page) return;

        store.pushState('Paste Component');

        if (this.clipboard.type === 'element') {
            const newEl = JSON.parse(JSON.stringify(this.clipboard.data));
            newEl.id = 'elem_' + Date.now() + Math.random().toString(36).substr(2, 5);
            newEl.x += 2; // Offset slightly
            newEl.y += 2;
            if (!page.elements) page.elements = [];
            page.elements.push(newEl);
            store.state.selection = newEl.id; // Select new one
            store.notify('pages', state.pages);
            store.notify('selection', newEl.id);
            console.log("[App] Pasted user element");
        } else if (this.clipboard.type === 'text') {
            // Can't paste a template predefined structure easily natively unless layout has room,
            // so we inject it as a floating user element.
            const newEl = {
                id: 'text_' + Date.now() + Math.random().toString(36).substr(2, 5),
                type: 'text',
                content: this.clipboard.data.content,
                x: 40,
                y: 40,
                fontSize: 24,
                color: '#000000',
                width: 50
            };
            if (!page.elements) page.elements = [];
            page.elements.push(newEl);
            store.state.selection = newEl.id;
            store.notify('pages', state.pages);
            store.notify('selection', newEl.id);
            console.log("[App] Pasted template text as free element");
        }
    }

    bindEvents() {
        // ── TIMELINE EVENT DELEGATION ──
        // Single click handler on the timeline container that catches ALL page/cover clicks.
        // This is bulletproof — works even if individual onclick handlers are lost during rebuilds.
        const timelineEl = document.getElementById('page-timeline');
        if (timelineEl) {
            timelineEl.addEventListener('click', (e) => {
                // Find the closest .timeline-page ancestor from the clicked element
                const pageItem = e.target.closest('.timeline-page');
                if (!pageItem) return;

                console.log('[TIMELINE DELEGATION] Click on:', pageItem.classList.toString(), 'pageId:', pageItem.dataset?.pageId?.substring(0, 12));

                // ── COVER CLICK ──
                if (pageItem.classList.contains('cover-thumb')) {
                    if (store.state.viewMode === 'cover') return;
                    console.log('[TIMELINE DELEGATION] Switching to COVER');

                    this._manualRenderLock = true;
                    store._isBatchUpdating = true;
                    store.state.viewMode = 'cover';
                    store.state.activePageId = null;
                    store._isBatchUpdating = false;
                    this._rafPending = false;
                    this._pendingUpdates = new Set();

                    this.renderCoverWithTemplate();
                    this.updateTimelineActiveState(store.state);
                    this.updatePropertiesPanel(store.state);

                    requestAnimationFrame(() => {
                        requestAnimationFrame(() => { this._manualRenderLock = false; });
                    });
                    return;
                }

                // ── PAGE CLICK ──
                const pageId = pageItem.dataset?.pageId;
                if (!pageId) {
                    console.warn('[TIMELINE DELEGATION] No pageId on element');
                    return;
                }

                if (store.state.activePageId === pageId && store.state.viewMode === 'pages') {
                    // Don't early return if the page wasn't actually rendered
                    // (e.g., store.state.pages didn't contain it when renderActivePage was called)
                    const actualPage = store.state.pages.find(pg => pg.id === pageId);
                    if (actualPage) {
                        console.log('[TIMELINE DELEGATION] EARLY RETURN: same page active and found in store');
                        return;
                    }
                    console.log('[TIMELINE DELEGATION] Same page active but NOT in store — forcing re-render');
                }


                console.log('[TIMELINE DELEGATION] Switching to page:', pageId.substring(0, 12));

                this._manualRenderLock = true;
                store._isBatchUpdating = true;
                store.state.activePageId = pageId;
                store.state.viewMode = 'pages';
                store._isBatchUpdating = false;
                this._rafPending = false;
                this._pendingUpdates = new Set();

                // CRITICAL FIX: Check if the page exists in store.state.pages.
                // Magic Create writes pages to _target directly, but they can get
                // overwritten by later state changes (auth observer, addPage, etc).
                // If the page isn't found, force-restore from _magicPages backup.
                let foundPage = store.state.pages.find(p => p.id === pageId);
                if (!foundPage && window._magicPages && window._magicPages.length > 0) {
                    console.log('[TIMELINE DELEGATION] Page not in store! Restoring', window._magicPages.length, 'pages from _magicPages backup');
                    // Force-write Magic Create pages back to the store
                    store._isBatchUpdating = true;
                    store.state.pages = window._magicPages;
                    store._isBatchUpdating = false;
                    foundPage = store.state.pages.find(p => p.id === pageId);
                }
                console.log('[TIMELINE DELEGATION] Page found:', !!foundPage, 'in', store.state.pages.length, 'pages');

                if (foundPage) {
                    this.renderActivePage();
                } else {
                    // Last resort: render directly from _magicPages if still not found
                    const magicPage = window._magicPages?.find(p => p.id === pageId);
                    if (magicPage) {
                        console.log('[TIMELINE DELEGATION] Direct-rendering from _magicPages');
                        const canvas = document.getElementById('canvas-container');
                        if (canvas) {
                            this.renderer.renderPageToContainer(magicPage, store.state.assets, canvas, null);
                        }
                    } else {
                        console.warn('[TIMELINE DELEGATION] Page completely not found anywhere!');
                    }
                }

                // Sync UI
                this.updateTimelineActiveState(store.state);
                this.updatePropertiesPanel(store.state);
                this.updateMoveable(store.state);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => { this._manualRenderLock = false; });
                });
            });
        }

        // Profile Button
        const btnProfile = document.getElementById('btn-profile');
        if (btnProfile) {
            btnProfile.onclick = () => {
                if (this.profileModal) this.profileModal.open();
            };
        }


        // Subscribe to state changes
        store.subscribe((state, prop, value) => {
            // === AUTO-SAVE (debounced) ===
            if (['pages', 'cover', 'coverPosition', 'assets', 'theme', 'history_restore'].includes(prop)) {
                if (this.saveDebounced) this.saveDebounced(state);
            }

            // === ASSET SIDEBAR (rate-limited) ===
            if (prop === 'assets') {
                if (!this._assetSidebarPending) {
                    this._assetSidebarPending = true;
                    requestAnimationFrame(() => {
                        this._assetSidebarPending = false;
                        if (this.renderAssetSidebar) this.renderAssetSidebar();
                    });
                }
            }

            // === MAIN RENDER LOOP (batched via RAF) ===
            if (prop === 'activePageId' || prop === 'pages' || prop === 'selection' || prop === 'theme' || prop === 'viewMode' || prop === 'cover' || prop === 'history_restore') {

                // Track what needs updating
                if (!this._pendingUpdates) this._pendingUpdates = new Set();
                this._pendingUpdates.add(prop);

                // Batch render via requestAnimationFrame — prevents multiple renders per frame
                if (!this._rafPending) {
                    this._rafPending = true;
                    requestAnimationFrame(() => {
                        this._rafPending = false;
                        const updates = this._pendingUpdates;
                        this._pendingUpdates = new Set();

                        const needsCanvasRender = updates.has('pages') || updates.has('cover') ||
                            updates.has('activePageId') || updates.has('theme') ||
                            updates.has('viewMode') || updates.has('history_restore');

                        // Canvas render — skip for selection-only changes and coverPosition (text drag)
                        // Also skip if a manual render lock is active (prevents timeline click overwrite)
                        if (needsCanvasRender && !this._magicCreateRendering && !this._manualRenderLock) {
                            // CRITICAL: Skip cover re-render while user is actively editing text
                            // (contentEditable or typing in sidebar inputs). Re-rendering destroys
                            // the DOM element being edited, causing focus loss and data loss.
                            let skipRender = false;
                            if (state.viewMode === 'cover' && updates.has('cover') && !updates.has('viewMode') && !updates.has('history_restore')) {
                                const activeEl = document.activeElement;
                                const isEditingCoverText = activeEl && (
                                    activeEl.isContentEditable ||
                                    activeEl.id === 'prop-cover-title' ||
                                    activeEl.id === 'prop-cover-sub' ||
                                    activeEl.id === 'prop-cover-spine' ||
                                    activeEl.id === 'prop-inline-text'
                                );
                                // Also check _isEditing flag set by inline editor
                                const anyEditing = document.querySelector('[data-selectable-type="cover-text"][contenteditable="true"]');
                                if (isEditingCoverText || anyEditing) {
                                    console.log('[App] Skipping cover re-render — user is editing text');
                                    skipRender = true;
                                }
                            }

                            // PERFORMANCE: Skip re-render if active page content hasn't changed
                            if (!skipRender && updates.size === 1 && updates.has('pages') && state.viewMode !== 'cover') {
                                const activePage = state.pages.find(p => p.id === state.activePageId);
                                if (activePage) {
                                    try {
                                        const fingerprint = JSON.stringify({
                                            id: activePage.id,
                                            photos: activePage.photos,
                                            textContent: activePage.textContent,
                                            textPositions: activePage.textPositions,
                                            background: activePage.background,
                                            spacing: activePage.spacing,
                                            // Include layout identity AND slot geometry to detect shuffle/layout changes
                                            layoutId: activePage.layout?.id || activePage.layout?.name || activePage.rawLayoutId,
                                            layoutSlots: activePage.layout?.slots?.map(s => ({ id: s.photoId, crop: s.crop, x: s.x, y: s.y, w: s.width, h: s.height }))
                                        });
                                        if (this._lastPageFingerprint === fingerprint) {
                                            skipRender = true;
                                        }
                                        this._lastPageFingerprint = fingerprint;
                                    } catch (e) { /* ignore fingerprint errors */ }
                                }
                            } else if (!skipRender) {
                                this._lastPageFingerprint = null; // Reset on non-pages update
                            }

                            if (!skipRender) {
                                if (state.viewMode === 'cover') {
                                    this.renderCoverWithTemplate();
                                } else {
                                    this.renderActivePage();
                                }
                            }
                        }

                        // Timeline — rebuild on structure changes, update highlight on selection changes
                        // IMPORTANT: These are NOT mutually exclusive! A project restore triggers
                        // both 'pages' and 'viewMode' in the same batch, so we must handle both.
                        if (updates.has('pages') || updates.has('theme') || updates.has('history_restore')) {
                            this.updateTimeline(state.pages, state.activePageId);
                            // Refresh the active page thumbnail immediately for content changes
                            this.refreshActivePageThumbnail();
                        }
                        // When cover changes, refresh just the cover thumbnail
                        if (updates.has('cover') && !updates.has('pages')) {
                            this.refreshCoverThumbnail();
                        }
                        if (updates.has('activePageId') || updates.has('viewMode')) {
                            this.updateTimelineActiveState(state);
                        }

                        // Properties panel — only when selection or view switches
                        if (updates.has('selection') || updates.has('viewMode') || updates.has('activePageId')) {
                            this.updatePropertiesPanel(state);
                        }

                        // Moveable — only when selection-relevant changes occur
                        if (updates.has('selection') || needsCanvasRender) {
                            this.updateMoveable(state);
                        }
                    });
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
            // FIX: Include .front-cover in closest() so dropping anywhere on front cover works
            const targetSlotEl = e.target.closest('.photo-slot') || e.target.closest('.cover-photo-area') || e.target.closest('.front-cover') || e.target.closest('.back-cover');

            // Handle Photo Swapping (Slot to Slot)
            if (item.type === 'slot-swap' && targetSlotEl && targetSlotEl.classList.contains('photo-slot')) {
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
                    if (targetSlotEl.classList.contains('back-cover')) {
                        store.pushState('Add Photo to Back Cover');
                        if (!store.state.cover) store.state.cover = {};
                        store.state.cover.backPhotoId = item.id;
                        store.notify('cover', store.state.cover);
                    } else if (targetSlotEl.classList.contains('cover-photo-area') || targetSlotEl.classList.contains('front-cover')) {
                        // FIX: Both .cover-photo-area and .front-cover target the front cover
                        // But block if a gallery cover is active — illustration takes priority
                        if (store.state.cover?._coverGalleryId) {
                            console.log('[Drop] Gallery cover active — blocking front cover photo drop. Use back cover instead.');
                            // Redirect to back cover instead
                            store.pushState('Add Photo to Back Cover');
                            if (!store.state.cover) store.state.cover = {};
                            store.state.cover.backPhotoId = item.id;
                            store.notify('cover', store.state.cover);
                        } else {
                            store.pushState('Add Photo to Front Cover');
                            if (!store.state.cover) store.state.cover = {};
                            store.state.cover.frontPhotoId = item.id;
                            store.notify('cover', store.state.cover);
                        }
                    } else if (targetSlotEl.classList.contains('empty-slot')) {
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
            } else if (item.type === 'element') {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                const relativeX = (x / rect.width) * 100;
                const relativeY = (y / rect.height) * 100;
                store.pushState('Add Element');
                this.addElementToPage(item.id, relativeX, relativeY);
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
                if (confirm('להסיר את התמונה מהעמוד?')) {
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
            // Ignore clicks on Moveable elements to prevent deselection bugs after drag
            if (e.target.closest('*[class*="moveable-"]')) {
                return;
            }

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

                // Only update if selection actually changed to avoid infinite/unnecessary loops
                if (store.state.selection !== id) {
                    store.state.selection = id;
                    store.notify('selection', id);
                }

                // Show selection frame if text
                if (type === 'text' || type === 'cover-text') {
                    const frame = target.querySelector('.selection-frame');
                    if (frame) frame.style.display = 'block';

                    // Indication: One click = Select/Move (Hand/Pointer)
                    // Double click = Edit (Text)
                    target.style.cursor = 'grab';
                }
            } else {
                // Deselect if clicking background
                if (store.state.selection !== null) {
                    store.state.selection = null;
                    store.notify('selection', null);
                }
            }
        });

        // Double Click Handler
        canvas.addEventListener('dblclick', (e) => {
            // 1. Text Editing
            const textTarget = e.target.closest('[data-selectable-type="text"], [data-selectable-type="cover-text"]');
            if (textTarget) {
                e.stopPropagation(); // Prevent other triggers
                textTarget.contentEditable = 'true';
                textTarget.focus();
                textTarget.style.cursor = 'text';
                textTarget.style.outline = 'none';
                // Mark that we are actively editing to prevent re-renders
                textTarget._isEditing = true;

                // Save on blur
                const id = textTarget.dataset.selectableId;
                const saveHandler = () => {
                    textTarget._isEditing = false;
                    const newContent = textTarget.textContent.trim();
                    textTarget.contentEditable = 'false';
                    textTarget.style.cursor = 'grab';
                    textTarget.removeEventListener('blur', saveHandler);

                    // Update State
                    if (store.state.viewMode === 'cover') {
                        if (!store.state.cover.textContent) store.state.cover.textContent = {};
                        store.state.cover.textContent[id] = newContent;
                        // For backwards compatibility:
                        if (id === 'cover-title' || id === 'title') store.state.cover.title = newContent;
                        if (id === 'cover-subtitle' || id === 'subtitle' || id === 'date') store.state.cover.subtitle = newContent;
                        if (id === 'cover-spine' || id === 'spine') store.state.cover.spineText = newContent;

                        // Advanced Template Support: specifically for groomName/brideName fields
                        if (id === 'groomName' || id === 'brideName') {
                            const g = store.state.cover.textContent['groomName'] || '';
                            const b = store.state.cover.textContent['brideName'] || '';
                            store.state.cover.title = b ? `${g} & ${b}` : g;
                        }

                        // Sync sidebar inputs to reflect inline edits (without triggering re-render)
                        const titleInput = document.getElementById('prop-cover-title');
                        const subInput = document.getElementById('prop-cover-sub');
                        const spineInput = document.getElementById('prop-cover-spine');
                        if (titleInput && (id === 'cover-title' || id === 'title')) titleInput.value = newContent;
                        if (subInput && (id === 'cover-subtitle' || id === 'subtitle' || id === 'date')) subInput.value = newContent;
                        if (spineInput && (id === 'cover-spine' || id === 'spine')) spineInput.value = newContent;

                        // Push undo state but do NOT trigger full cover re-render.
                        // The text is already visible in the DOM — re-rendering would destroy
                        // the element and rebuild it, causing a visual "jump".
                        store.pushState('Edit Cover Text');
                        store.notify('coverPosition', store.state.cover);
                    } else {
                        const page = store.state.pages.find(p => p.id === store.state.activePageId);
                        if (page) {
                            if (!page.textContent) page.textContent = {};
                            page.textContent[id] = newContent;
                            store.pushState('Edit Page Text');
                            store.notify('pages', store.state.pages);
                        }
                    }
                };
                textTarget.addEventListener('blur', saveHandler);
                return;
            }

            // 2. Photo Crop / Pan Mode (Album Pages)
            const photoSlot = e.target.closest('.photo-slot');
            if (photoSlot) {
                e.stopPropagation();
                const img = photoSlot.querySelector('img');
                if (img && img.src && !img.src.includes('placeholder')) {
                    this.enterCropMode(photoSlot);
                }
                return;
            }

            // 3. Cover Photo Crop / Pan Mode (Front & Back Cover)
            const coverPhotoArea = e.target.closest('.cover-photo-area');
            const backCoverArea = e.target.closest('.back-cover');
            const coverTarget = coverPhotoArea || backCoverArea;
            if (coverTarget) {
                e.stopPropagation();
                e.preventDefault();

                const isBack = !!backCoverArea && !coverPhotoArea;
                const isFront = !!coverPhotoArea;

                // Back cover: Check for <img> child (photo), ignore texture backgrounds
                // Front cover: Check state for frontPhotoId, since background-image may be texture
                let hasPhoto = false;
                if (isBack) {
                    hasPhoto = !!coverTarget.querySelector('img');
                } else if (isFront) {
                    hasPhoto = !!(store.state.cover && store.state.cover.frontPhotoId);
                }

                if (hasPhoto) {
                    this.enterCoverCropMode(coverTarget, isFront ? 'front' : 'back');
                }
                return;
            }
        });

        // ----------------------------------------------------
        // Legacy Text Drag & Drop removed in favor of Moveable.js
        // ----------------------------------------------------


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
            import('../ui-components/album-preview.js').then(({ albumPreview }) => {
                albumPreview.open(
                    store.state.pages,
                    store.state.cover,
                    store.state.assets,
                    templateConfig
                );
            }).catch(err => {
                console.error('[App] Failed to load album preview:', err);
                alert('פתיחת התצוגה המקדימה נכשלה. אנא נסה שוב.');
            });
        });

        document.getElementById('btn-remix-layout').addEventListener('click', () => {
            const state = store.state;
            const page = state.pages.find(p => p.id === state.activePageId);
            if (!page) return;

            const isAdHoc = page.templateId && page.templateId.startsWith('layout-');
            const tm = (this.templateSidebar && this.templateSidebar.manager) ? this.templateSidebar.manager : null;

            const executeFallback = () => {
                // Reconstruct page.photos from slots if missing
                if (!page.photos && page.layout && page.layout.slots) {
                    const assetPhotos = store.state.assets.photos;
                    page.photos = page.layout.slots
                        .filter(s => s.photoId)
                        .map(s => {
                            const p = assetPhotos.find(p => p.id === s.photoId);
                            if (p && s.shape) p.shape = s.shape;
                            return p;
                        })
                        .filter(p => p);
                } else if (page.photos && page.layout && page.layout.slots) {
                    // Preserve shapes from current slots
                    page.layout.slots.forEach(s => {
                        if (s.shape && s.photoId) {
                            const p = page.photos.find(ph => ph.id === s.photoId);
                            if (p) p.shape = s.shape;
                        }
                    });
                }

                // Preserve ALL original photos so remix cycling doesn't lose them
                if (!page._allPhotos && page.photos && page.photos.length > 0) {
                    page._allPhotos = [...page.photos];
                }
                const allPhotos = page._allPhotos || page.photos || [];
                if (allPhotos.length === 0) return;

                // Use name OR id for layout matching (Magic Create sets .id, LayoutEngine sets .name)
                const currentName = page.layout ? (page.layout.name || page.layout.id) : null;
                const newLayout = layoutEngine.getNextLayout(allPhotos, currentName);
                if (newLayout) {
                    store.pushState('Remix Layout');
                    // Preserve imageShape on new layout
                    const savedShape = page.imageShape;
                    page.photos = [...allPhotos]; // Restore all photos for new layout
                    page.layout = newLayout;
                    if (savedShape) page.imageShape = savedShape;
                    store.notify('pages', state.pages);
                }
            };

            if (page.templateId && !isAdHoc && tm) {
                if (!tm.config || tm.currentTemplateId !== page.templateId) {
                    console.log('[App] Loading template config for remix:', page.templateId);
                    tm.loadTemplate(page.templateId).then(() => {
                        if (!this.performTemplateRemix(page, tm)) executeFallback();
                    }).catch(err => {
                        console.warn('[App] Could not load template for remix, falling back:', err);
                        executeFallback();
                    });
                    return;
                }
                if (this.performTemplateRemix(page, tm)) return;
            }
            // Fallback if not template or remix failed
            executeFallback();
        });

        // Test Mode: inject "Send to Print (Test)" button when ?testPrint=true in URL
        if (new URLSearchParams(window.location.search).get('testPrint') === 'true') {
            const testBtn = document.createElement('button');
            testBtn.id = 'btn-test-print';
            testBtn.className = 'btn-primary';
            testBtn.title = 'שליחה ישירה לדפוס ללא תשלום (בדיקה)';
            testBtn.style.cssText = 'background: linear-gradient(135deg, #f59e0b, #d97706); border-color: #d97706;';
            testBtn.innerHTML = '<i class="fa-solid fa-flask"></i> Test Print';
            const toolbarGroup = document.getElementById('btn-review').closest('.toolbar-group');
            if (toolbarGroup) toolbarGroup.insertBefore(testBtn, document.getElementById('btn-review'));

            testBtn.addEventListener('click', async () => {
                testBtn.disabled = true;
                testBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מייצר PDF...';
                try {
                    const hasTemplateConfig = this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config;
                    const templateConfig = hasTemplateConfig ? this.templateSidebar.manager.config : null;
                    if (templateConfig) pdfCanvasExport.setTemplateConfig(templateConfig);

                    const blob = await pdfCanvasExport.generatePDF(store.state.pages, store.state.cover, store.state.assets, true);
                    if (blob) await orderFlow.startTestFlow(blob);
                } catch (err) {
                    console.error('[TestPrint]', err);
                    alert('שגיאה: ' + err.message);
                } finally {
                    testBtn.disabled = false;
                    testBtn.innerHTML = '<i class="fa-solid fa-flask"></i> Test Print';
                }
            });
        }

        // Review & Order Actions
        // 1. Review (Download PDF)
        document.getElementById('btn-review').addEventListener('click', async () => {
            console.log("Generating Review PDF via Server...");

            // Ensure config is up to date
            const hasTemplateConfig = this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config;
            const templateConfig = hasTemplateConfig ? this.templateSidebar.manager.config : null;

            if (templateConfig) {
                pdfCanvasExport.setTemplateConfig(templateConfig);
            }

            // Generate high quality PDF on the client using html2canvas to ensure EXACT visual mapping.
            await pdfCanvasExport.generatePDF(store.state.pages, store.state.cover, store.state.assets);

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
                pdfCanvasExport.setTemplateConfig(templateConfig);
            }

            // Generate Client PDF arraybuffer/blob for printing using html2canvas
            const blob = await pdfCanvasExport.generatePDF(store.state.pages, store.state.cover, store.state.assets, true);

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
                    alert("אנא הוסף לפחות 4 תמונות קודם (השתמש בכפתור ה-'+' בלשונית התמונות).");
                    return;
                }

                // CRITICAL: Block auth observer from overwriting Magic Create pages
                this.magicCreateGenerationStarted = true;

                if (window.magicLauncher) {
                    window.magicLauncher.open(photos);
                } else {
                    console.error("MagicLauncher module not loaded");
                    alert("Magic Create בעבודה... אנא נסה שוב בעוד רגע.");
                    this.magicCreateGenerationStarted = false;
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

                    // Use standard loop for better performance than async iterator overhead
                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];

                        // optimization: Use Object URL instead of reading file into memory string
                        const objectUrl = URL.createObjectURL(file);

                        newPhotos.push({
                            id: 'local_' + crypto.randomUUID(),
                            url: objectUrl,
                            file: file, // Store file reference for persistence service
                            isLocal: true,
                            ratio: 1.5 // Default ratio, RenderEngine handles actual adjustment
                        });
                    }

                    uploadModal.style.display = 'none';

                    // --- VISION QUALITY SCREENING ---
                    // Analyze photos with Gemini Vision and show review modal
                    photoQualityModal.review(newPhotos, (keptPhotos, analyses) => {
                        // Add kept photos to assets
                        store.state.assets.photos = [...store.state.assets.photos, ...keptPhotos];
                        this._animateNextRender = true; // Trigger solitaire dealing animation
                        this.renderAssetSidebar();

                        // Enrich ALL original photos with vision data (even excluded ones kept in memory)
                        newPhotos.forEach(p => {
                            const analysis = analyses.get(p.id);
                            if (analysis) {
                                p.visionFocalPoint = { focalX: analysis.focalX, focalY: analysis.focalY };
                                p._visionAnalysis = analysis;
                            }
                        });

                        // Also try fallback batch analysis via Firebase Cloud Function
                        photoPositionService.batchAnalyzePhotos(keptPhotos).then(focalDict => {
                            let updated = false;
                            store.state.assets.photos.forEach(p => {
                                if (focalDict[p.id] && !p.visionFocalPoint) {
                                    p.visionFocalPoint = focalDict[p.id];
                                    updated = true;
                                }
                            });
                            if (updated && window.app) {
                                console.log("[App] Background Vision Batch Completed. Refreshing UI.");
                                store.notify('pages', store.state.pages);
                            }
                        });

                        // --- AUTO START TRIGGER ---
                        if (this.isAutoStart && this.templateSidebar) {
                            this.magicCreateGenerationStarted = true; // Block auth observer Restore
                            const templateToUse = this.targetTemplateId || 'family-roots-v1';
                            console.log(`[App] Auto-Start: Generating book from local files using ${templateToUse}...`);
                            // Use a small timeout to let UI update
                            setTimeout(async () => {
                                await this.templateSidebar.handleTemplateSelect(templateToUse);
                                this.isAutoStart = false;
                            }, 100);
                        }
                    });

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
            const goToPrev = () => {
                const state = store.state;
                if (state.viewMode === 'cover') return;

                const currentIndex = state.pages.findIndex(p => p.id === state.activePageId);
                if (currentIndex > 0) {
                    store.state.activePageId = state.pages[currentIndex - 1].id;
                    store.notify('activePageId', store.state.activePageId);
                    this.renderActivePage();
                    this.updateTimeline(state.pages, store.state.activePageId);
                } else {
                    store.state.viewMode = 'cover';
                    store.notify('viewMode', 'cover');
                    this.renderCoverWithTemplate();
                    this.updateTimeline(state.pages, null);
                }
            };

            const goToNext = () => {
                const state = store.state;
                if (state.viewMode === 'cover') {
                    store.state.viewMode = 'pages';
                    store.notify('viewMode', 'pages');
                    if (state.pages.length > 0) {
                        store.state.activePageId = state.pages[0].id;
                        store.notify('activePageId', store.state.activePageId);
                        this.renderActivePage();
                    }
                    this.updateTimeline(state.pages, store.state.activePageId);
                    return;
                }

                const currentIndex = state.pages.findIndex(p => p.id === state.activePageId);
                if (currentIndex < state.pages.length - 1) {
                    store.state.activePageId = state.pages[currentIndex + 1].id;
                    store.notify('activePageId', store.state.activePageId);
                    this.renderActivePage();
                    this.updateTimeline(state.pages, store.state.activePageId);
                }
            };

            // In RTL (Hebrew), left arrow = next, right arrow = prev
            const isEditorLTR = () => {
                const container = document.getElementById('canvas-container');
                return container ? container.classList.contains('force-ltr') : false;
            };

            btnPrev.addEventListener('click', () => {
                isEditorLTR() ? goToPrev() : goToNext();
            });
            btnNext.addEventListener('click', () => {
                isEditorLTR() ? goToNext() : goToPrev();
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

        // --- NEW PROJECT BUTTON HANDLER ---
        const btnNew = document.getElementById('btn-new-project');
        if (btnNew) {
            btnNew.addEventListener('click', () => this.startNewProject(true));
        }

        const btnShare = document.getElementById('btn-share-project');
        if (btnShare) {
            btnShare.addEventListener('click', () => this.openShareModal());
        }

        // --- MOBILE MENU TOGGLE ---
        const btnMobileMenu = document.getElementById('btn-mobile-menu');
        if (btnMobileMenu) {
            // Delegate to MobileEditor if available (from ai-editor-mobile.js)
            if (window.MobileEditor && window.MobileEditor.toggleLeftPanel) {
                // MobileEditor handles mobile menu — no duplicate handler needed
                // The handler is already wired in ai-editor-mobile.js
            } else {
                // Fallback: basic toggle using 'expanded' class (same as MobileEditor)
                let backdrop = document.querySelector('.mobile-sidebar-backdrop');
                if (!backdrop) {
                    backdrop = document.createElement('div');
                    backdrop.className = 'mobile-sidebar-backdrop';
                    document.body.appendChild(backdrop);
                }

                const sidebarLeft = document.getElementById('sidebar-left');
                const toggleSidebar = () => {
                    const isOpen = sidebarLeft.classList.toggle('expanded');
                    backdrop.classList.toggle('active', isOpen);
                };

                btnMobileMenu.addEventListener('click', toggleSidebar);
                backdrop.addEventListener('click', () => {
                    sidebarLeft.classList.remove('expanded');
                    backdrop.classList.remove('active');
                });
            }
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
                        uploadModal.style.display = 'none';

                        // --- VISION QUALITY SCREENING FOR GOOGLE PHOTOS (Sidebar) ---
                        photoQualityModal.review(photos, (keptPhotos, analyses) => {
                            // --- ASK REPLACE VS APPEND ---
                            if (store.state.assets.photos.length > 0) {
                                if (window.confirm("כבר יש תמונות בספרייה.\n\nלחץ אישור כדי להוסיף את התמונות החדשות.\nלחץ ביטול כדי להחליף את כל התמונות.")) {
                                    store.state.assets.photos = [...store.state.assets.photos, ...keptPhotos];
                                    console.log("[App] User chose to APPEND to library.");
                                } else {
                                    store.state.assets.photos = keptPhotos;
                                    console.log("[App] User chose to REPLACE library.");
                                }
                            } else {
                                store.state.assets.photos = keptPhotos;
                            }

                            this.renderAssetSidebar();
                            console.log("Imported Google Photos:", keptPhotos.length);
                            store.notify('assets', store.state.assets);
                        });
                    }

                } catch (e) {
                    console.error("Google Photos Error:", e);
                    const msg = e.message || e.toString();
                    if (msg.includes('User not logged in')) {
                        alert("אנא התחבר קודם (כפתור בצד ימין למעלה) כדי להשתמש ב-Google Photos.");
                    } else {
                        alert("שגיאה: " + msg);
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
        // Use rawLayoutId as primary (template pages), fall back to layout.id (layout engine)
        const currentLayoutId = page.rawLayoutId || (page.layout ? page.layout.id : null);

        // Ensure page.photos is populated from slots if missing
        if ((!page.photos || page.photos.length === 0) && page.layout && page.layout.slots) {
            const assetPhotos = store.state.assets?.photos || [];
            page.photos = page.layout.slots
                .filter(s => s.photoId)
                .map(s => assetPhotos.find(p => p.id === s.photoId))
                .filter(p => p);
            console.log('[App] Remix: Reconstructed page.photos from slots:', page.photos.length);
        }

        const photoCount = page.photos ? page.photos.length : (page.layout?.slots ? page.layout.slots.filter(s => s.photoId).length : 0);

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
                // Front cover — but block if gallery cover is active
                if (state.cover._coverGalleryId) {
                    console.log('[addPhotoToPage] Gallery cover active — redirecting front drop to back cover');
                    state.cover.backPhotoId = photoId;
                } else {
                    state.cover.frontPhotoId = photoId;
                }
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


        // FALLBACK LOGIC (No Template or Remix Failed)
        // If the Template manager didn't generate a 'newPage', we MUST dynamically calculate a new layout
        // using the fallback layoutEngine, otherwise the new photo will be invisible.
        newLayout = layoutEngine.generateLayout(page.photos);
        console.log('[App] Generated Layout fallback:', newLayout);
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

    addElementToPage(elementId, x = 50, y = 50) {
        if (store.state.viewMode === 'cover') {
            console.warn("[App] Adding elements directly to cover is unsupported via standard elements array, routing to first page or skipping.");
            return;
        }

        const state = store.state;
        const pageIndex = state.pages.findIndex(p => p.id === state.activePageId);
        if (pageIndex === -1) return;
        const page = { ...state.pages[pageIndex] };

        const libraryItem = window.ELEMENTS_LIBRARY?.find(e => e.id === elementId);
        if (!libraryItem) return;

        if (!page.elements) page.elements = [];
        const newElem = {
            id: 'elem_' + Date.now() + Math.floor(Math.random() * 1000),
            type: 'element',
            url: libraryItem.url,
            x: x - 10, // Center roughly
            y: y - 10,
            pixelWidth: '100px', // Default size for moveable
            pixelHeight: '100px',
            zIndex: 10
        };
        page.elements.push(newElem);

        store.state.selection = newElem.id;

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

        // Safety: ensure page.photos is an array
        if (!page.photos || !Array.isArray(page.photos)) {
            page.photos = [];
        }

        // Check if this is a template-based page
        if (page.templateId && page.photos.length > 0) {
            // Template-based page
            // 1. Check if new photo already on page
            if (page.photos.find(p => p && p.id === newPhotoId)) {
                return; // Prevent duplicates
            }

            // 2. Find and replace the photo in the array
            const oldPhotoIdx = page.photos.findIndex(p => p && p.id === targetId);
            const newPhotoAsset = state.assets.photos.find(p => p.id === newPhotoId);

            if (oldPhotoIdx !== -1 && newPhotoAsset) {
                page.photos[oldPhotoIdx] = newPhotoAsset;

                // CRITICAL: Ensure slot's photoId is updated so RenderEngine sees the new photo
                if (page.layout && page.layout.slots) {
                    const targetSlot = page.layout.slots.find(s => s.photoId === targetId);
                    if (targetSlot) targetSlot.photoId = newPhotoId;
                }

                const newPages = [...state.pages];
                newPages[pageIndex] = page;
                store.state.pages = newPages;
                console.log('[App] Replaced template photo', targetId, 'with', newPhotoId);
            }
        } else {
            // Default page system
            // 1. Check if new photo already on page
            if (page.photos.length > 0 && page.photos.find(p => p && p.id === newPhotoId)) {
                return;
            }

            // 2. Find target slot
            const slot = (page.layout && page.layout.slots)
                ? page.layout.slots.find(s => s.photoId === targetId)
                : null;

            if (slot) {
                // Update photo list: Remove old, Add new
                const oldPhotoIdx = page.photos.findIndex(p => p && p.id === targetId);
                const newPhotoAsset = state.assets.photos.find(p => p.id === newPhotoId);

                if (oldPhotoIdx > -1 && newPhotoAsset) {
                    page.photos[oldPhotoIdx] = newPhotoAsset;
                    slot.photoId = newPhotoId;

                    const newPages = [...state.pages];
                    newPages[pageIndex] = page;
                    store.state.pages = newPages;
                    console.log('[App] Replaced photo in slot', targetId, 'with', newPhotoId);
                }
            } else {
                // No slot found — this might be a fresh page or first photo placement
                // Fall back to addPhotoToPage behavior
                const newPhotoAsset = state.assets.photos.find(p => p.id === newPhotoId);
                if (newPhotoAsset) {
                    page.photos.push(newPhotoAsset);
                    // Regenerate layout with new photo count
                    if (typeof layoutEngine !== 'undefined' && layoutEngine.generateLayout) {
                        page.layout = layoutEngine.generateLayout(page.photos);
                    }
                    const newPages = [...state.pages];
                    newPages[pageIndex] = page;
                    store.state.pages = newPages;
                    store.notify('pages', store.state.pages);
                    console.log('[App] Added photo to page (no slot found)', newPhotoId);
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

        // Add photo at the specific index for ANY page (template or standard)
        if (page.photos && Array.isArray(page.photos)) {
            page.photos[slotIndex] = newPhotoAsset;

            // CRITICAL: If the layout has explicit slots, update the photoId directly!
            if (page.layout && page.layout.slots && page.layout.slots[slotIndex]) {
                page.layout.slots[slotIndex].photoId = newPhotoId;
            }

            const newPages = [...state.pages];
            newPages[pageIndex] = page;
            store.state.pages = newPages;
            store.notify('pages', newPages);
            console.log('[App] Added photo to empty slot', slotIndex);
        }
    }

    /**
     * Resets the project to a clean state.
     * @param {boolean} confirm - Whether to ask for confirmation
     */
    startNewProject(confirm = true) {
        if (confirm && !window.confirm("האם אתה בטוח שברצונך להתחיל פרויקט חדש? פעולה זו תנקה את האלבום הנוכחי ותסיר את כל התמונות שיובאו.")) {
            return;
        }

        console.log("[App] Starting new project (Full Reset)...");

        // UI Feedback
        const btn = document.getElementById('btn-new-project');
        if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> מנקה...';

        // ═══════════════════════════════════════════════════════
        // 1. CLEAR ALL WINDOW-LEVEL MAGIC BACKUPS
        //    These are used as auto-heal sources. If not cleared,
        //    old album data will be restored after reset.
        // ═══════════════════════════════════════════════════════
        window._magicPages = null;
        window._magicCover = null;
        window._magicAssets = null;
        window._magicPrompt = null;
        window._magicIsHebrew = null;

        // 2. Clear photo quality / vision analysis caches
        if (window.photoQualityService) {
            if (window.photoQualityService.analysisCache) {
                window.photoQualityService.analysisCache.clear();
            }
            if (window.photoQualityService.qualityCache) {
                window.photoQualityService.qualityCache.clear();
            }
        }

        // 3. Clear any pending magic create state
        if (window.app) {
            window.app.magicCreateGenerationStarted = false;
            window.app._magicCreateRendering = false;
        }

        // 4. Full State Reset (includes clearing assets, pages, cover)
        store.reset();

        // 5. Add one empty page to start
        store.addPage();
        store.state.viewMode = 'pages';

        // 6. Clear local persistence ID so next save creates a new file
        persistenceService.currentProjectId = null;
        if (store.state.user) {
            persistenceService.saveProject(store.state.user.uid, store.state);
        }

        // ═══════════════════════════════════════════════════════
        // 7. FORCE IMMEDIATE FULL UI REFRESH
        // ═══════════════════════════════════════════════════════

        // 7a. Clear the main canvas
        const canvasContainer = document.getElementById('canvas-container') || document.getElementById('editor-canvas');
        if (canvasContainer) {
            // Force re-render by rendering the (now empty) active page
            this.renderActivePage();
        }

        // 7b. Clear & rebuild the timeline (page thumbnails at bottom)
        this._lastTimelineHash = null; // Force full rebuild
        if (this.updateTimeline) {
            this.updateTimeline(store.state.pages, store.state.activePageId);
        }

        // 7c. Clear the photo sidebar (show empty state)
        this.renderAssetSidebar();

        // 7d. Clear properties panel
        const propertiesPanel = document.getElementById('properties-panel');
        if (propertiesPanel) {
            propertiesPanel.innerHTML = '<div class="panel-header"><h3>מאפיינים</h3></div><p style="padding:12px;color:#888;">בחר אלמנט לעריכה</p>';
        }

        // 7e. Clear TemplateSidebar state to prevent ghost styles
        if (this.templateSidebar && this.templateSidebar.manager) {
            this.templateSidebar.manager.currentTemplateId = null;
            this.templateSidebar.manager.config = null;
        }

        // 7f. Clear cover preview if visible
        const coverPreview = document.getElementById('cover-preview');
        if (coverPreview) coverPreview.innerHTML = '';

        // 7g. Reset any cover gallery selection
        if (store.state.cover) {
            store.state.cover._coverGalleryId = null;
        }

        // 8. Restore button text
        if (btn) btn.innerHTML = '<i class="fa-solid fa-file-circle-plus"></i> חדש';

        console.log("[App] New project created successfully. State:", {
            pages: store.state.pages.length,
            photos: store.state.assets.photos.length,
            activePageId: store.state.activePageId
        });
    }



    updatePropertiesPanel(state) {
        const panel = document.getElementById('properties-panel');

        // Prevent re-rendering if user is actively typing in a field in this panel
        // This stops the "focus loss" bug on every keystroke. 
        // We use activeElement checks robustly
        if (panel && panel.contains(document.activeElement)) {
            const activeTag = document.activeElement.tagName;
            const activeType = document.activeElement.type;

            if (['INPUT', 'TEXTAREA', 'SELECT'].includes(activeTag)) {

                // Allow ranges (sliders) to still let props update if needed, but text inputs block it
                if (activeType === 'text' || activeTag === 'TEXTAREA' || activeType === 'color') {
                    return;
                }
            }
        }

        if (state.viewMode === 'cover') {
            if (state.selection) {
                const targetEl = document.querySelector(`[data-selectable-id="${state.selection}"]`);
                if (targetEl && (targetEl.dataset.selectableType === 'cover-text' || targetEl.dataset.selectableType === 'text')) {
                    this.renderCoverTextProperties(panel, state.cover, state.selection);
                } else if (targetEl && targetEl.dataset.selectableType === 'cover-photo') {
                    // Photo properties for cover
                    panel.innerHTML = `<div class="panel-header"><h3>תמונת כריכה</h3></div><p>נבחרה תמונה. לחץ עליה פעמיים כדי להזיז, או גרור תמונה חדשה.</p>`;
                } else {
                    this.renderCoverProperties(panel, state.cover);
                }
            } else {
                this.renderCoverProperties(panel, state.cover);
            }
            return;
        }

        const selectionId = state.selection;

        const page = state.pages.find(p => p.id === state.activePageId);
        if (!page) {
            panel.innerHTML = '<div class="empty-state">לא נבחר עמוד</div>';
            return;
        }

        // If no selectionId, we fall through to Page Properties
        // instead of showing "No Selection"


        // Find element (text) or Slot (photo)
        let textElement = page.elements && page.elements.find(e => e.id === selectionId);

        // Check if this is a template page with textContent
        let isTemplateText = false;
        if (!textElement && page.templateId && selectionId) {
            // Detect template text elements whether or not they have been edited yet.
            // Previously this checked page.textContent[selectionId] !== undefined,
            // which silently failed on first click (key not yet written).
            // Now we also check the live DOM for a text element with the same id.
            const existingContent = page.textContent?.[selectionId];
            const domEl = document.querySelector(
                `[data-selectable-id="${selectionId}"][data-selectable-type="text"]`
            );
            if (existingContent !== undefined || domEl) {
                isTemplateText = true;
                // Create a virtual text element for the properties panel
                textElement = {
                    id: selectionId,
                    content: existingContent !== undefined
                        ? existingContent
                        : (domEl?.textContent?.trim() || ''),
                    isTemplate: true
                };
            }
        }

        const photoSlot = page.layout && page.layout.slots ? page.layout.slots.find(s => s.photoId === selectionId) : null;

        if (photoSlot) {
            panel.innerHTML = `
                <div class="panel-header">
                    <h3>מאפייני תמונה</h3>
                </div>
                <div style="padding:15px;">
                    <p>מזהה תמונה: ${selectionId.substring(0, 8)}...</p>
                    
                    <button id="btn-magic-edit" class="btn-primary" style="width:100%; margin-top:10px; background: linear-gradient(90deg, #a855f7, #ec4899);">
                        <i class="fa-solid fa-wand-magic"></i> עריכת קסם (AI)
                    </button>
                </div>
            `;

            // Bind Edit
            const btn = document.getElementById('btn-magic-edit');
            if (btn) {
                btn.onclick = async () => {
                    const prompt = window.prompt("✨ עריכת קסם: מה לשנות?");
                    if (!prompt) return;

                    const asset = state.assets.photos.find(p => p.id === selectionId);
                    if (!asset) return;

                    alert("עריכת קסם יוצרת... אנא המתן!");
                    try {
                        const newUrl = await geminiService.editImage(asset.url, prompt);
                        store.pushState('Magic Edit');
                        asset.url = newUrl;
                        store.notify('assets', state.assets);
                    } catch (e) {
                        alert("העריכה נכשלה: " + e.message);
                    }
                };
            }
            return;
        }

        if (textElement) {
            // ── QR Code Properties Panel ──
            if (textElement.type === 'qr') {
                const isVideo = textElement.isVideo;
                panel.innerHTML = `
                    <div class="panel-header">
                        <h3>מאפייני QR Code</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:12px; text-align: right;">
                        <div style="text-align:center; padding:12px; background:rgba(108,52,131,0.1); border-radius:10px;">
                            <i class="fa-solid fa-qrcode" style="font-size:2rem; color:#a855f7; margin-bottom:8px; display:block;"></i>
                            <span style="color:#e2e8f0; font-weight:600;">QR Code</span>
                        </div>
                        <div>
                            <label style="font-size:0.85rem; color:#94a3b8;">סוג קישור</label>
                            <div style="padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:6px; margin-top:4px; display:flex; align-items:center; gap:6px;">
                                <i class="fa-solid fa-${isVideo ? 'video' : 'globe'}" style="color:${isVideo ? '#ff6b6b' : '#60a5fa'};"></i>
                                <span style="color:#e2e8f0; font-size:0.9rem;">${isVideo ? 'סרטון' : 'אתר'}</span>
                            </div>
                        </div>
                        <div>
                            <label style="font-size:0.85rem; color:#94a3b8;">כתובת URL</label>
                            <div dir="ltr" style="padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:6px; margin-top:4px; word-break:break-all; color:#a78bfa; font-size:0.8rem;">
                                ${textElement.targetUrl || 'N/A'}
                            </div>
                        </div>
                        <div>
                            <label style="font-size:0.85rem; color:#94a3b8;">צבע</label>
                            <div style="padding:8px 12px; background:rgba(255,255,255,0.05); border-radius:6px; margin-top:4px; color:#e2e8f0;">
                                ${textElement.colorName || 'Custom'}
                            </div>
                        </div>
                        <button id="btn-delete-qr" style="padding:10px; background:rgba(239,68,68,0.1); color:#ef4444; border:1px solid rgba(239,68,68,0.3); border-radius:8px; cursor:pointer; font-weight:600; display:flex; align-items:center; justify-content:center; gap:6px;">
                            <i class="fa-solid fa-trash"></i> מחיקת QR Code
                        </button>
                    </div>
                `;

                document.getElementById('btn-delete-qr').addEventListener('click', () => {
                    if (confirm("למחוק את ה-QR Code?")) {
                        store.pushState('Delete QR Code');
                        page.elements = page.elements.filter(el => el.id !== selectionId);
                        store.state.selection = null;
                        store.notify('pages', store.state.pages);
                        store.notify('selection', null);
                    }
                });

                return;
            }

            if (textElement.type === 'element') {
                panel.innerHTML = `
                    <div class="panel-header">
                        <h3>מאפייני איור/אלמנט</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:10px; text-align: right;">
                        
                        <div>
                            <label>שינוי גוון (Color Hue)</label>
                            <input type="range" id="prop-el-hue" min="0" max="360" value="${textElement.filterHue || 0}">
                            <span id="prop-el-hue-val" style="font-size: 12px; color: #888;">${textElement.filterHue || 0}°</span>
                        </div>

                        <div>
                            <label>בהירות (Brightness)</label>
                            <input type="range" id="prop-el-bright" min="0" max="200" value="${textElement.filterBrightness || 100}">
                            <span id="prop-el-bright-val" style="font-size: 12px; color: #888;">${textElement.filterBrightness || 100}%</span>
                        </div>

                        <div style="display:flex; align-items:center; justify-content: space-between; margin-top: 10px;">
                            <label>הצללה (Drop Shadow)</label>
                            <input type="checkbox" id="prop-el-shadow" ${textElement.filterShadow ? 'checked' : ''}>
                        </div>
                        
                        ${textElement.filterShadow ? `
                        <div>
                            <label>צבע הצללה</label>
                            <div style="display:flex; align-items:center;">
                                <input type="color" id="prop-el-shadow-color" value="${textElement.filterShadowColor || '#000000'}">
                            </div>
                        </div>` : ''}

                       <button class="btn-secondary btn-sm" id="btn-delete-element" style="color:red; border-color:red; margin-top:20px;">
                            <i class="fa-solid fa-trash"></i> מחק אלמנט
                       </button>
                    </div>
                `;

                // Bind Events
                const hueSlider = document.getElementById('prop-el-hue');
                const hueVal = document.getElementById('prop-el-hue-val');
                hueSlider.addEventListener('input', (e) => {
                    textElement.filterHue = parseInt(e.target.value);
                    hueVal.textContent = textElement.filterHue + '°';
                    const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"] img`);
                    if (visualEl) {
                        let filterStr = '';
                        if (textElement.filterHue) filterStr += `hue-rotate(${textElement.filterHue}deg) `;
                        if (textElement.filterBrightness && textElement.filterBrightness !== 100) filterStr += `brightness(${textElement.filterBrightness}%) `;
                        if (textElement.filterShadow) filterStr += `drop-shadow(2px 4px 6px ${textElement.filterShadowColor || 'rgba(0,0,0,0.5)'}) `;
                        visualEl.style.filter = filterStr.trim();
                    }
                });

                const brightSlider = document.getElementById('prop-el-bright');
                const brightVal = document.getElementById('prop-el-bright-val');
                brightSlider.addEventListener('input', (e) => {
                    textElement.filterBrightness = parseInt(e.target.value);
                    brightVal.textContent = textElement.filterBrightness + '%';
                    const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"] img`);
                    if (visualEl) {
                        let filterStr = '';
                        if (textElement.filterHue) filterStr += `hue-rotate(${textElement.filterHue}deg) `;
                        if (textElement.filterBrightness && textElement.filterBrightness !== 100) filterStr += `brightness(${textElement.filterBrightness}%) `;
                        if (textElement.filterShadow) filterStr += `drop-shadow(2px 4px 6px ${textElement.filterShadowColor || 'rgba(0,0,0,0.5)'}) `;
                        visualEl.style.filter = filterStr.trim();
                    }
                });

                const shadowToggle = document.getElementById('prop-el-shadow');
                shadowToggle.addEventListener('change', (e) => {
                    textElement.filterShadow = e.target.checked;
                    store.notify('pages', store.state.pages); // Force rerender to show color picker
                });

                const shadowColor = document.getElementById('prop-el-shadow-color');
                if (shadowColor) {
                    shadowColor.addEventListener('input', (e) => {
                        textElement.filterShadowColor = e.target.value;
                        const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"] img`);
                        if (visualEl) {
                            let filterStr = '';
                            if (textElement.filterHue) filterStr += `hue-rotate(${textElement.filterHue}deg) `;
                            if (textElement.filterBrightness && textElement.filterBrightness !== 100) filterStr += `brightness(${textElement.filterBrightness}%) `;
                            if (textElement.filterShadow) filterStr += `drop-shadow(2px 4px 6px ${textElement.filterShadowColor || 'rgba(0,0,0,0.5)'}) `;
                            visualEl.style.filter = filterStr.trim();
                        }
                    });
                }

                document.getElementById('btn-delete-element').addEventListener('click', () => {
                    if (confirm("למחוק את האלמנט הזה?")) {
                        store.pushState('Delete Element');
                        page.elements = page.elements.filter(el => el.id !== selectionId);
                        store.state.selection = null;
                        store.notify('pages', store.state.pages);
                        store.notify('selection', null);
                    }
                });

                return;
            }

            // For template text, only show content editing (styling is from template)
            const isTemplate = textElement.isTemplate === true;

            if (isTemplate) {
                panel.innerHTML = `
                    <div class="panel-header">
                        <h3>מאפייני טקסט</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:10px; text-align: right;">
                        <div>
                            <label>תוכן</label>
                            <textarea id="prop-text-content" rows="5" style="width:100%; border-radius:4px; padding:5px; font-family: inherit; text-align: right;" dir="rtl">${textElement.content || ''}</textarea>
                        </div>
                        <div style="color: #888; font-size: 12px;">
                            <i class="fa-solid fa-info-circle"></i> סגנון הגופן נקבע על ידי עיצוב התבנית
                        </div>
                    </div>
                `;

                // Bind Events for template text
                const txtContent = document.getElementById('prop-text-content');
                let _thumbRefreshTimer = null;
                txtContent.addEventListener('input', (e) => {
                    // Guard: initialize textContent if page was created without it
                    if (!page.textContent) page.textContent = {};
                    page.textContent[selectionId] = e.target.value;

                    // PERFORMANCE FIX: Do not call store.notify('pages', store.state.pages) here!
                    // It causes the entire canvas and DOM to rebuild on every keystroke.
                    // Instead, look for the element in the DOM and manually update its textContent visually
                    const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"]`);
                    if (visualEl) {
                        visualEl.textContent = e.target.value;
                    }

                    // Debounced thumbnail refresh so timeline reflects the text change
                    clearTimeout(_thumbRefreshTimer);
                    _thumbRefreshTimer = setTimeout(() => {
                        this.refreshActivePageThumbnail();
                    }, 600);
                });
            } else {
                // Default page system - full controls
                panel.innerHTML = `
                    <div class="panel-header">
                        <h3>מאפייני טקסט</h3>
                    </div>
                    <div style="padding:15px; display:flex; flex-direction:column; gap:10px; text-align: right;">
                        <div>
                            <label>תוכן</label>
                            <textarea id="prop-text-content" rows="3" style="width:100%; border-radius:4px; padding:5px; text-align: right;" dir="rtl">${textElement.content}</textarea>
                        </div>

                        <div>
                            <label>גודל גופן</label>
                            <input type="range" id="prop-text-size" min="10" max="100" value="${textElement.fontSize || 24}">
                            <span id="prop-text-size-val">${textElement.fontSize || 24}px</span>
                        </div>

                        <div>
                            <label>צבע</label>
                            <div style="display:flex; align-items:center;">
                                <input type="color" id="prop-text-color" value="${textElement.color || '#000000'}">
                            </div>
                        </div>
                         <div>
                            <label>משפחת גופנים</label>
                            <select id="prop-text-font" style="width:100%; padding:5px;">
                                <option value="sans-serif">Sans Serif</option>
                                <option value="serif">Serif</option>
                                <option value="monospace">Monospace</option>
                                <option value="'Playfair Display', serif">Playfair Display</option>
                                <option value="'Montserrat', sans-serif">Montserrat</option>
                            </select>
                        </div>

                       <button class="btn-secondary btn-sm" id="btn-delete-text" style="color:red; border-color:red; margin-top:10px;">
                            <i class="fa-solid fa-trash"></i> מחק טקסט
                       </button>
                    </div>
                `;

                // Bind Events for default page system
                const txtContent = document.getElementById('prop-text-content');
                txtContent.addEventListener('input', (e) => {
                    textElement.content = e.target.value;

                    const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"]`);
                    if (visualEl) {
                        visualEl.textContent = e.target.value;
                    }
                });

                const txtSize = document.getElementById('prop-text-size');
                const txtSizeVal = document.getElementById('prop-text-size-val');
                txtSize.addEventListener('input', (e) => {
                    textElement.fontSize = parseInt(e.target.value);
                    txtSizeVal.textContent = e.target.value + 'px';
                    const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"]`);
                    if (visualEl) {
                        visualEl.style.fontSize = e.target.value + 'px';
                    }
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
                    if (confirm("למחוק את הטקסט הזה?")) {
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
            authBtn.title = `Logged in as ${user.displayName || user.email}. Click to view Profile.`;
            authBtn.onclick = () => {
                if (window.app && window.app.profileModal) {
                    window.app.profileModal.open();
                } else if (this.profileModal) {
                    this.profileModal.open();
                }
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
                    alert("התחברות נכשלה. ראה פרטים במסוף.");
                }
            };
            authBtn.style.border = 'none';
        }
    }
    renderPageProperties(container, page) {
        container.innerHTML = `
            <div class="panel-header">
                <h3>הגדרות עמוד</h3>
            </div>
            
            <div style="padding: 20px;">
                <!-- Layout -->
                <div class="prop-group">
                    <label>פריסה</label>
                    <div class="layout-selector">
                        <button class="layout-btn" title="יחיד / פוקוס"><i class="fa-regular fa-square"></i></button>
                        <button class="layout-btn" title="כפול / מפוצל"><i class="fa-solid fa-table-columns"></i></button>
                        <button class="layout-btn" title="גריד / מעורב"><i class="fa-solid fa-border-all"></i></button>
                    </div>
                </div>

                <!-- Slide (Spacing/Padding) -->
                <div class="prop-group">
                    <label>רווח פנימי (שוליים) <span id="val-spacing" style="color:#888;">${page.spacing || 0}px</span></label>
                    <input type="range" id="prop-page-spacing" min="0" max="40" value="${page.spacing || 0}">
                </div>

                <!-- Color -->
                <div class="prop-group">
                    <label>צבע רקע</label>
                    <div class="color-picker-wrapper">
                        <input type="color" id="prop-page-color" class="color-input-hidden" value="${(page.background && typeof page.background === 'string' && page.background.startsWith('#')) ? page.background : (page.background && page.background.color ? page.background.color : '#ffffff')}">
                        <div class="color-icon"><i class="fa-solid fa-eye-dropper"></i></div>
                    </div>
                </div>

                <!-- Text (Notes/Caption Placeholder) -->
                <div class="prop-group">
                    <label>הערה / כיתוב</label>
                    <input type="text" placeholder="הוסף הערה לעמוד..." class="full-width">
                </div>

                <!-- QR Code -->
                <div class="prop-group">
                    <label>QR Code</label>
                    <button id="btn-add-qr" class="full-width" style="
                        padding: 10px 16px;
                        background: linear-gradient(135deg, #6C3483, #2E86C1);
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        font-weight: 600;
                        font-size: 13px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                        transition: all 0.2s ease;
                    ">
                        <i class="fa-solid fa-qrcode"></i>
                        הוסף QR Code
                    </button>
                </div>
            </div>
        `;

        // Bindings

        // 1. Layout Buttons (Template-aware Remix)
        const layouts = container.querySelectorAll('.layout-btn');
        layouts.forEach((btn, idx) => {
            btn.addEventListener('click', () => {
                const state = store.state;
                const isAdHoc = page.templateId && page.templateId.startsWith('layout-');
                const tm = (window.app.templateSidebar && window.app.templateSidebar.manager) ? window.app.templateSidebar.manager : null;

                const executeFallback = () => {
                    // Reconstruct page.photos from slots if missing
                    if (!page.photos && page.layout && page.layout.slots) {
                        const assetPhotos = store.state.assets.photos;
                        page.photos = page.layout.slots
                            .filter(s => s.photoId)
                            .map(s => assetPhotos.find(p => p.id === s.photoId))
                            .filter(p => p);
                    }

                    // Preserve ALL original photos so switching 4→2→4 doesn't lose them
                    if (!page._allPhotos && page.photos && page.photos.length > 0) {
                        page._allPhotos = [...page.photos];
                    }

                    // Use _allPhotos as the source of truth for available photos
                    const allPhotos = page._allPhotos || page.photos || [];
                    if (allPhotos.length === 0) return;

                    let newLayout = null;
                    const currentName = page.layout ? (page.layout.name || page.layout.id) : null;

                    if (idx === 0) {
                        // Single photo layout — show first photo only
                        newLayout = layoutEngine.getNextLayout(allPhotos.slice(0, 1), null);
                        page.photos = allPhotos.slice(0, 1);
                    } else if (idx === 1 && allPhotos.length >= 2) {
                        // Two photo layout
                        newLayout = layoutEngine.getNextLayout(allPhotos.slice(0, 2), null);
                        page.photos = allPhotos.slice(0, 2);
                    } else {
                        // Grid/all — restore ALL photos
                        page.photos = [...allPhotos];
                        newLayout = layoutEngine.getNextLayout(allPhotos, currentName);
                    }

                    if (newLayout) {
                        store.pushState('Change Layout');
                        const savedShape = page.imageShape;
                        page.layout = newLayout;
                        if (savedShape) page.imageShape = savedShape;
                        store.notify('pages', state.pages);
                    }
                };

                const tryTemplateAction = (manager) => {
                    // Ensure page.photos is populated from slots
                    if ((!page.photos || page.photos.length === 0) && page.layout && page.layout.slots) {
                        const assetPhotos = store.state.assets?.photos || [];
                        page.photos = page.layout.slots
                            .filter(s => s.photoId)
                            .map(s => assetPhotos.find(p => p.id === s.photoId))
                            .filter(p => p);
                    }

                    let targetLayoutId = null;
                    if (idx === 0) targetLayoutId = manager.getLayoutIdForCount(1);
                    if (idx === 1) targetLayoutId = manager.getLayoutIdForCount(2);

                    if (targetLayoutId) {
                        const newP = manager.regeneratePage(page, targetLayoutId);
                        if (newP) {
                            store.pushState('Change Layout');
                            const newPs = [...store.state.pages];
                            const pIdx = newPs.findIndex(p => p.id === page.id);
                            if (pIdx > -1) {
                                newPs[pIdx] = newP;
                                store.state.pages = newPs;
                                store.notify('pages', store.state.pages);
                            }
                            return true;
                        }
                    } else if (idx === 2) {
                        if (window.app.performTemplateRemix(page, manager)) return true;
                    }
                    return false;
                };

                if (page.templateId && !isAdHoc && tm) {
                    if (!tm.config || tm.currentTemplateId !== page.templateId) {
                        tm.loadTemplate(page.templateId).then(() => {
                            if (!tryTemplateAction(tm)) executeFallback();
                        }).catch(e => executeFallback());
                        return;
                    }
                    if (tryTemplateAction(tm)) return;
                }

                executeFallback();
            });
        });

        // 2. Spacing — use 'input' for real-time feedback while dragging
        container.querySelector('#prop-page-spacing').addEventListener('input', (e) => {
            const val = parseInt(e.target.value, 10);
            
            // Update value display
            const valDisplay = container.querySelector('#val-spacing');
            if (valDisplay) valDisplay.textContent = val + 'px';

            // Immediate visual update — apply padding directly to all slots
            const slots = document.querySelectorAll('#canvas-container .photo-slot');
            slots.forEach(slot => {
                slot.style.boxSizing = 'border-box';
                slot.style.padding = val > 0 ? `${val}px` : '0';
            });

            // Update state (direct mutation, no notify during drag)
            page.spacing = val;

            // Debounced full re-render for final state sync
            clearTimeout(window._spacingDebounce);
            window._spacingDebounce = setTimeout(() => {
                store.pushState('Change Spacing');
                store.notify('pages', store.state.pages);
            }, 400);
        });

        // 3. Color
        container.querySelector('#prop-page-color').addEventListener('change', (e) => {
            store.pushState('Change Color');
            page.background = e.target.value;
            store.notify('pages', store.state.pages);
        });

        // 4. QR Code button
        const qrBtn = container.querySelector('#btn-add-qr');
        if (qrBtn) {
            qrBtn.addEventListener('click', () => this.addQRToPage());
            qrBtn.addEventListener('mouseenter', () => {
                qrBtn.style.transform = 'scale(1.02)';
                qrBtn.style.boxShadow = '0 4px 12px rgba(108, 52, 131, 0.4)';
            });
            qrBtn.addEventListener('mouseleave', () => {
                qrBtn.style.transform = '';
                qrBtn.style.boxShadow = '';
            });
        }
    }

    /**
     * Add a QR code to the active page
     * Opens the QR Code modal for users to input a URL
     */
    async addQRToPage() {
        const modal = document.getElementById('qr-code-modal');
        if (modal) {
            modal.style.display = 'flex';
            const input = modal.querySelector('#qr-url-input');
            if (input) {
                input.value = '';
                setTimeout(() => input.focus(), 100);
            }
        }
    }

    /**
     * Internal: Generate and add a QR code for a given URL
     * Called by the QR modal's generate button
     */
    async _addQRWithUrl(url) {
        if (!url || url === 'https://') return;

        const { dataUrl, color } = await generateQRCode(url, { size: 256 });
        const qrElement = createQRElement(url, dataUrl, color, { x: 80, y: 78 });

        const state = store.state;
        const pageIndex = state.pages.findIndex(p => p.id === state.activePageId);
        if (pageIndex === -1) return;

        store.pushState('Add QR Code');
        const page = { ...state.pages[pageIndex] };
        if (!page.elements) page.elements = [];
        page.elements.push(qrElement);
        state.pages[pageIndex] = page;
        state.selection = qrElement.id;
        store.notify('pages', state.pages);

        console.log(`[QR] Added QR code for "${url}" (${color.name})`);
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
                    <button class="btn-secondary btn-sm" id="btn-back-cover-props"><i class="fa-solid fa-arrow-left"></i> הגדרות כריכה</button>
                    <h3>${selection === 'cover-photo' ? 'תמונה קדמית' : 'תמונה אחורית'}</h3>
                </div>
             `;

            const photoId = selection === 'cover-photo' ? cover.frontPhotoId : cover.backPhotoId;

            if (!photoId) {
                container.innerHTML += `<div class="empty-state">לא נבחרה תמונה</div>`;
            } else {
                const actionsGroup = document.createElement('div');
                actionsGroup.className = 'prop-group';
                actionsGroup.innerHTML = `<button class="btn-secondary full-width text-danger" id="btn-remove-cover-photo">הסר תמונה</button>`;
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

        container.innerHTML = `<h3>הגדרות כריכה</h3>`;

        // Title
        const titleGroup = document.createElement('div');
        titleGroup.className = 'prop-group';
        titleGroup.innerHTML = `<label>כותרת</label><input type="text" id="prop-cover-title" value="${cover.title || ''}" placeholder="${templateDefaults.title}" style="text-align: right;" dir="rtl">`;
        container.appendChild(titleGroup);

        // Subtitle
        const subGroup = document.createElement('div');
        subGroup.className = 'prop-group';
        subGroup.innerHTML = `<label>תת-כותרת</label><input type="text" id="prop-cover-sub" value="${cover.subtitle || ''}" placeholder="${templateDefaults.subtitle}" style="text-align: right;" dir="rtl">`;
        container.appendChild(subGroup);

        // Spine Text
        const spineGroup = document.createElement('div');
        spineGroup.className = 'prop-group';
        spineGroup.innerHTML = `<label>טקסט שדרה</label><input type="text" id="prop-cover-spine" value="${cover.spineText || ''}" placeholder="${cover.title || templateDefaults.spineText}" style="text-align: right;" dir="rtl">`;
        container.appendChild(spineGroup);

        // Layout - with all 7 options
        const currentLayout = cover.layout || templateDefaults.layout;
        const layoutOptions = layouts.map(l =>
            `<option value="${l.id}" ${currentLayout === l.id ? 'selected' : ''} title="${l.description}">${l.label}</option>`
        ).join('');

        const layoutGroup = document.createElement('div');
        layoutGroup.className = 'prop-group';
        layoutGroup.innerHTML = `
            <label>פריסה</label>
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
            <label>גופן כותרת</label>
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
            <label>גופן תת-כותרת</label>
            <select id="prop-cover-body-font" class="full-width">
                ${bodyFontOptions}
            </select>
        `;
        container.appendChild(bodyFontGroup);

        // Background Color
        const colorGroup = document.createElement('div');
        colorGroup.className = 'prop-group';
        colorGroup.innerHTML = `
            <label>צבע רקע</label>
            <div style="display:flex; gap:10px;">
                <input type="color" id="prop-cover-color" value="${cover.color || templateDefaults.bgColor}" class="full-width" style="height:40px;">
                <button class="btn-secondary" id="btn-reset-theme" title="אפס לברירת מחדל"><i class="fa-solid fa-rotate-left"></i></button>
            </div>
        `;
        container.appendChild(colorGroup);

        // Text Color
        const textColorGroup = document.createElement('div');
        textColorGroup.className = 'prop-group';
        textColorGroup.innerHTML = `
            <label>צבע טקסט</label>
            <input type="color" id="prop-cover-text-color" value="${cover.textColor || templateDefaults.textColor}" class="full-width" style="height:40px;">
        `;
        container.appendChild(textColorGroup);

        // Event Bindings
        container.querySelector('#prop-cover-title').addEventListener('input', (e) => {
            const val = e.target.value;
            // Update properties directly on the existing cover object (don't create new object)
            // Creating a new object with spread triggers proxy set → notify → full re-render
            store.state.cover.title = val;
            if (!store.state.cover.textContent) store.state.cover.textContent = {};
            store.state.cover.textContent['title'] = val;
            store.state.cover.textContent['cover-title'] = val;

            // Advanced Template Support: specifically for groomName/brideName fields
            let parts = [val, ''];
            if (val.includes('&')) parts = val.split('&');
            else if (val.includes(' ו')) parts = val.split(' ו');
            else if (val.includes('ו-')) parts = val.split('ו-');

            store.state.cover.textContent['groomName'] = parts[0].trim();
            store.state.cover.textContent['brideName'] = parts[1] ? parts[1].trim() : '';

            // Map to dynamic template title elements
            if (this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config) {
                this.templateSidebar.manager.config.pageLayouts.forEach(layout => {
                    if (layout.textElements) {
                        layout.textElements.forEach(te => {
                            if (te.type === 'title' || te.type === 'locationTitle' || te.elementId === 'destination') {
                                store.state.cover.textContent[te.elementId] = val;
                                // Apply atomic update to mapped elements
                                document.querySelectorAll(`[data-selectable-id="${te.elementId}"]`).forEach(el => {
                                    if (el) el.textContent = val;
                                });
                            }
                        });
                    }
                });
            }

            // Atomic DOM update for common direct template selectors
            document.querySelectorAll('[data-selectable-id="title"], [data-selectable-id="cover-title"]').forEach(el => {
                if (el) el.textContent = val;
            });
        });

        container.querySelector('#prop-cover-title').addEventListener('change', (e) => {
            store.notify('cover', store.state.cover);
        });

        container.querySelector('#prop-cover-sub').addEventListener('input', (e) => {
            const val = e.target.value;
            // Update directly — don't create new object (avoids full re-render during typing)
            store.state.cover.subtitle = val;
            if (!store.state.cover.textContent) store.state.cover.textContent = {};
            store.state.cover.textContent['date'] = val;
            store.state.cover.textContent['subtitle'] = val;
            store.state.cover.textContent['cover-subtitle'] = val;

            // Map to dynamic template subtitle elements
            if (this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config) {
                this.templateSidebar.manager.config.pageLayouts.forEach(layout => {
                    if (layout.textElements) {
                        layout.textElements.forEach(te => {
                            if (te.type === 'subtitle' || te.type === 'date' || te.type === 'body') {
                                // Only override if it acts as a short subtitle/description on cover layouts
                                if (layout.pageType === 'cover' || layout.pageType === 'intro') {
                                    store.state.cover.textContent[te.elementId] = val;
                                    // Apply atomic update to mapped elements
                                    document.querySelectorAll(`[data-selectable-id="${te.elementId}"]`).forEach(el => {
                                        if (el) el.textContent = val;
                                    });
                                }
                            }
                        });
                    }
                });
            }

            // Atomic DOM update for common direct template selectors
            document.querySelectorAll('[data-selectable-id="subtitle"], [data-selectable-id="cover-subtitle"], [data-selectable-id="date"]').forEach(el => {
                if (el) el.textContent = val;
            });
        });

        container.querySelector('#prop-cover-sub').addEventListener('change', (e) => {
            store.notify('cover', store.state.cover);
        });

        container.querySelector('#prop-cover-spine').addEventListener('input', (e) => {
            const val = e.target.value;
            // Update directly — don't create new object
            store.state.cover.spineText = val;
            if (!store.state.cover.textContent) store.state.cover.textContent = {};
            store.state.cover.textContent['spine'] = val;

            // Atomic update
            document.querySelectorAll('[data-selectable-id="spine"], [data-selectable-id="cover-spine"]').forEach(el => {
                if (el) el.textContent = val;
            });
        });

        container.querySelector('#prop-cover-spine').addEventListener('change', (e) => {
            store.notify('cover', store.state.cover);
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
                textPositions: null,
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
        h3.textContent = 'מאפייני טקסט';
        container.appendChild(h3);

        // Content Input
        const inputGroup = document.createElement('div');
        inputGroup.className = 'prop-group';
        inputGroup.innerHTML = `<label>תוכן</label><textarea id="prop-text-content" rows="3" style="text-align: right;" dir="rtl">${textEl.content}</textarea>`;
        container.appendChild(inputGroup);

        // Size Slider
        const sizeGroup = document.createElement('div');
        sizeGroup.className = 'prop-group';
        sizeGroup.innerHTML = `<label>גודל: ${textEl.fontSize}px</label><input type="range" id="prop-text-size" min="12" max="120" value="${textEl.fontSize}">`;
        container.appendChild(sizeGroup);

        // Alignment Buttons
        const alignGroup = document.createElement('div');
        alignGroup.className = 'prop-group';
        alignGroup.innerHTML = `
            <label>יישור טקסט</label>
            <div style="display:flex; gap:10px; margin-top:5px; margin-bottom: 10px;" class="align-buttons">
                <button class="btn-secondary btn-sm align-btn" data-align="right" title="ימין" style="flex:1"><i class="fa-solid fa-align-right"></i></button>
                <button class="btn-secondary btn-sm align-btn" data-align="center" title="מרכז" style="flex:1"><i class="fa-solid fa-align-center"></i></button>
                <button class="btn-secondary btn-sm align-btn" data-align="left" title="שמאל" style="flex:1"><i class="fa-solid fa-align-left"></i></button>
            </div>
        `;
        container.appendChild(alignGroup);

        alignGroup.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const align = e.currentTarget.dataset.align;
                textEl.textAlign = align;
                const visualEl = document.querySelector(`[data-selectable-id="${textEl.id}"]`);
                if (visualEl) {
                    visualEl.style.textAlign = align;
                    if (window.app && window.app.moveableInstance) window.app.moveableInstance.updateRect();
                }
                store.notify('pages', store.state.pages);
            });
        });

        // Bindings
        container.querySelector('#prop-text-content').addEventListener('input', (e) => {
            textEl.content = e.target.value;
            const visualEl = document.querySelector(`[data-selectable-id="${textEl.id}"]`);
            if (visualEl) visualEl.textContent = e.target.value;
        });
        container.querySelector('#prop-text-content').addEventListener('change', (e) => {
            store.notify('pages', store.state.pages);
        });

        container.querySelector('#prop-text-size').addEventListener('input', (e) => {
            const val = parseInt(e.target.value);
            textEl.fontSize = val;
            sizeGroup.querySelector('label').textContent = `Size: ${val}px`;
            const visualEl = document.querySelector(`[data-selectable-id="${textEl.id}"]`);
            if (visualEl) {
                visualEl.style.fontSize = val + 'px';
                if (window.app && window.app.moveableInstance) window.app.moveableInstance.updateRect();
            }
        });
        container.querySelector('#prop-text-size').addEventListener('change', (e) => {
            store.notify('pages', store.state.pages);
        });
    }

    renderPhotoProperties(container, photoId, page) {
        // Find the slot to get current values
        const slot = page.layout.slots.find(s => s.photoId === photoId);
        if (!slot) return;

        container.innerHTML = `<h3>מאפייני תמונה</h3>`;

        // 1. Filter
        const filterGroup = document.createElement('div');
        filterGroup.className = 'prop-group';
        const currentFilter = slot.filter || 'none';
        filterGroup.innerHTML = `
            <label>פילטר</label>
            <select id="prop-filter" class="full-width">
                <option value="none" ${currentFilter === 'none' ? 'selected' : ''}>ללא</option>
                <option value="grayscale(100%)" ${currentFilter.includes('grayscale') ? 'selected' : ''}>שחור לבן</option>
                <option value="sepia(100%)" ${currentFilter.includes('sepia') ? 'selected' : ''}>ספיה</option>
                <option value="saturate(200%)" ${currentFilter.includes('saturate') ? 'selected' : ''}>חי (Vivid)</option>
                <option value="contrast(150%) brightness(90%) sepia(20%)" ${currentFilter.includes('contrast') ? 'selected' : ''}>דרמטי</option>
            </select>
        `;
        container.appendChild(filterGroup);

        // 2. Adjustments (Brightness, Contrast)
        const brightness = slot.brightness || 100;
        const contrast = slot.contrast || 100;

        // 3. Zoom & Pan (LinkedIn Style)
        if (!slot.crop) slot.crop = { panX: 50, panY: 50, zoom: 1 };
        const zoom = slot.crop.zoom || 1;
        const panX = slot.crop.panX !== undefined ? slot.crop.panX : 50;
        const panY = slot.crop.panY !== undefined ? slot.crop.panY : 50;

        // Build list of available frames for select
        const frameOptions = (window.IMAGE_FRAMES || []).map(f =>
            `<option value="${f.id}" ${slot.frameId === f.id ? 'selected' : ''}>${f.name}</option>`
        ).join('');

        const adjGroup = document.createElement('div');
        adjGroup.className = 'prop-group';
        adjGroup.innerHTML = `
            <label>זום (תקריב): <span id="val-zoom">${Math.round(zoom * 100)}</span>%</label>
            <input type="range" id="prop-zoom" min="100" max="300" value="${Math.round(zoom * 100)}">
            <label>הזזה (X): <span id="val-panx">${Math.round(panX)}</span>%</label>
            <input type="range" id="prop-panx" min="0" max="100" value="${panX}">
            <label>הזזה (Y): <span id="val-pany">${Math.round(panY)}</span>%</label>
            <input type="range" id="prop-pany" min="0" max="100" value="${panY}">
            <hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
            <label>בהירות: <span id="val-bright">${brightness}</span>%</label>
            <input type="range" id="prop-brightness" min="0" max="200" value="${brightness}">
            <label>ניגודיות: <span id="val-bontrast">${contrast}</span>%</label>
            <input type="range" id="prop-contrast" min="0" max="200" value="${contrast}">
            ${frameOptions.length ? `<hr style="margin: 10px 0; border: none; border-top: 1px solid #ddd;">
            <label>מסגרת</label>
            <select id="prop-frame" class="full-width">
                <option value="">ללא מסגרת</option>
                ${frameOptions}
            </select>` : ''}
            <button class="btn-secondary btn-sm" id="btn-remove-photo" style="color:red; border-color:red; margin-top:15px; width:100%;">
                <i class="fa-solid fa-trash"></i> הסר תמונה
            </button>
        `;
        container.appendChild(adjGroup);

        container.querySelector('#prop-zoom').addEventListener('input', (e) => {
            container.querySelector('#val-zoom').textContent = e.target.value;
            slot.crop.zoom = e.target.value / 100;
            store.notify('pages', store.state.pages);
        });
        container.querySelector('#prop-panx').addEventListener('input', (e) => {
            container.querySelector('#val-panx').textContent = e.target.value;
            slot.crop.panX = parseFloat(e.target.value);
            store.notify('pages', store.state.pages);
        });
        container.querySelector('#prop-pany').addEventListener('input', (e) => {
            container.querySelector('#val-pany').textContent = e.target.value;
            slot.crop.panY = parseFloat(e.target.value);
            store.notify('pages', store.state.pages);
        });

        const propFrame = container.querySelector('#prop-frame');
        if (propFrame) {
            propFrame.addEventListener('change', (e) => {
                slot.frameId = e.target.value || null;
                store.notify('pages', store.state.pages);
            });
        }

        container.querySelector('#btn-remove-photo').addEventListener('click', () => {
            if (confirm('להסיר את התמונה הזו?')) {
                // Remove from page.photos and re-layout
                const pIdx = page.photos ? page.photos.findIndex(p => p.id === photoId) : -1;
                if (pIdx > -1) {
                    page.photos.splice(pIdx, 1);
                    page.layout = layoutEngine.generateLayout(page.photos);
                    store.state.selection = null;
                    store.notify('pages', store.state.pages);
                }
            }
        });
    }

    renderCoverTextProperties(panel, cover, selectionId) {
        // Find text content — check multiple sources in priority order
        let content = '';

        // 1. Explicit user-edited content
        if (cover.textContent && cover.textContent[selectionId] !== undefined) {
            content = cover.textContent[selectionId];
        }
        // 2. Custom layout placeholder/content from template definition
        else if (cover.customLayout && cover.customLayout.textElements) {
            const textSpec = cover.customLayout.textElements.find(t => t.elementId === selectionId);
            if (textSpec) {
                content = textSpec.content || textSpec.placeholder || '';
                // Also check standard cover fields that might map to this element
                if (!content) {
                    if (selectionId === 'title' || selectionId === 'childName') content = cover.title || '';
                    else if (selectionId === 'date' || selectionId === 'subtitle') content = cover.subtitle || '';
                }
            }
        }
        // 3. Standard cover fields (cover-title, cover-subtitle)
        else if (selectionId === 'cover-title') {
            content = cover.title || '';
        } else if (selectionId === 'cover-subtitle') {
            content = cover.subtitle || '';
        }

        // 4. Last resort: read from the visible DOM element
        if (!content) {
            const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"]`);
            if (visualEl) content = visualEl.textContent || '';
        }

        // Find custom font size multiplier
        const sizeMultiplier = cover.textStyles?.[selectionId]?.size || 100;

        panel.innerHTML = `
            <div class="panel-header" style="display:flex; justify-content:space-between; align-items:center;">
                <h3>עריכת טקסט</h3>
                <button class="btn-secondary btn-sm" id="btn-back-to-cover" style="padding:4px 8px;" title="חזרה להגדרות כריכה"><i class="fa-solid fa-chevron-right"></i></button>
            </div>
            <div style="padding:15px; display:flex; flex-direction:column; gap:15px; text-align: right;">
                <div>
                    <label>תוכן</label>
                    <textarea id="prop-inline-text" rows="3" class="full-width" dir="rtl" style="margin-top:5px; border-radius:4px; padding:5px;">${content || ''}</textarea>
                </div>
                <div>
                    <label>קנה מידה (%)</label>
                    <div style="display:flex; align-items:center; gap:10px; margin-top:5px;">
                        <input type="range" id="prop-inline-size" min="30" max="300" value="${sizeMultiplier}" style="flex:1;">
                        <span id="val-inline-size" style="width:40px; text-align:left;">${sizeMultiplier}%</span>
                    </div>
                    <div style="color: #888; font-size: 11px; margin-top: 5px;">
                        השתמש במחוון כדי לשנות את הגודל ביחס לגודל המקורי בתבנית.
                    </div>
                </div>
                <div>
                    <label>יישור טקסט</label>
                    <div style="display:flex; gap:10px; margin-top:5px; margin-bottom: 10px;" class="align-buttons">
                        <button class="btn-secondary btn-sm align-btn" data-align="right" title="ימין" style="flex:1"><i class="fa-solid fa-align-right"></i></button>
                        <button class="btn-secondary btn-sm align-btn" data-align="center" title="מרכז" style="flex:1"><i class="fa-solid fa-align-center"></i></button>
                        <button class="btn-secondary btn-sm align-btn" data-align="left" title="שמאל" style="flex:1"><i class="fa-solid fa-align-left"></i></button>
                    </div>
                </div>
            </div>
        `;

        panel.querySelector('#btn-back-to-cover').addEventListener('click', () => {
            store.state.selection = null;
        });

        panel.querySelectorAll('.align-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const align = e.currentTarget.dataset.align;
                if (!store.state.cover.textStyles) store.state.cover.textStyles = {};
                if (!store.state.cover.textStyles[selectionId]) store.state.cover.textStyles[selectionId] = {};
                store.state.cover.textStyles[selectionId].textAlign = align;

                const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"]`);
                if (visualEl) {
                    visualEl.style.setProperty('text-align', align, 'important');
                    if (window.app && window.app.moveableInstance) window.app.moveableInstance.updateRect();
                }
                store.notify('cover', store.state.cover);
            });
        });

        panel.querySelector('#prop-inline-text').addEventListener('input', (e) => {
            if (!store.state.cover.textContent) store.state.cover.textContent = {};
            store.state.cover.textContent[selectionId] = e.target.value;

            // MANUAL UPDATE TO AVOID FULL RERENDER ON TYPING
            const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"]`);
            if (visualEl) {
                // If it's a cover template element, often it just holds text nodes
                visualEl.textContent = e.target.value;
                if (window.app && window.app.moveableInstance) window.app.moveableInstance.updateRect();
            }

            // Sync state after typing pauses
            clearTimeout(window._coverTextDebounce);
            window._coverTextDebounce = setTimeout(() => {
                store.notify('cover', store.state.cover);
            }, 800);
        });

        panel.querySelector('#prop-inline-size').addEventListener('input', (e) => {
            const val = e.target.value;
            panel.querySelector('#val-inline-size').textContent = val + '%';
            if (!store.state.cover.textStyles) store.state.cover.textStyles = {};
            if (!store.state.cover.textStyles[selectionId]) store.state.cover.textStyles[selectionId] = {};
            store.state.cover.textStyles[selectionId].size = val;

            // MANUAL UPDATE TO AVOID FULL SCALE RERENDER LOOP
            const visualEl = document.querySelector(`[data-selectable-id="${selectionId}"]`);
            if (visualEl) {
                const scaleVal = val / 100;
                // Preserve trailing transforms like translate but inject scale safely
                if (visualEl.style.transform && visualEl.style.transform.includes('translate')) {
                    visualEl.style.transform = `translate(-50%, -50%) scale(${scaleVal})`;
                } else {
                    visualEl.style.transform = `scale(${scaleVal})`;
                    visualEl.style.transformOrigin = 'center center';
                }
                if (window.app && window.app.moveableInstance) window.app.moveableInstance.updateRect();
            }

            // Sync state after slider pauses
            clearTimeout(window._coverSizeDebounce);
            window._coverSizeDebounce = setTimeout(() => {
                store.notify('cover', store.state.cover);
            }, 500);
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
        const photoGrid = document.getElementById('photo-library');
        if (!photoGrid) return;

        // PERFORMANCE: Create Google Photos button ONCE, persist across renders
        if (!this._googlePhotosBtnCreated) {
            this._googlePhotosBtnCreated = true;
            const btnGoogle = document.createElement('button');
            btnGoogle.className = 'btn-google-photos';
            btnGoogle.id = 'btn-google-photos-persistent';
            btnGoogle.innerHTML = '<i class="fa-brands fa-google"></i> חבר Google Photos';
            btnGoogle.style.cssText = 'width:100%;height:auto;align-self:start;grid-column:1/-1;padding:12px;margin-bottom:10px;background-color:#4285F4;color:white;border:none;border-radius:4px;font-weight:500;display:flex;align-items:center;justify-content:center;gap:8px;cursor:pointer;';

            btnGoogle.addEventListener('click', async () => {
                try {
                    let user = authService.getCurrentUser();
                    if (!user) {
                        try {
                            user = await authService.signInWithGoogle();
                        } catch (loginErr) {
                            console.error("[App] Login failed:", loginErr);
                            alert("אנא התחבר כדי להשתמש ב-Google Photos.");
                            return;
                        }
                    }

                    btnGoogle.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> מתחבר ל-Google Photos...';
                    btnGoogle.disabled = true;

                    let photos = [];
                    try {
                        photos = await googlePhotosService.openPicker();
                    } finally {
                        btnGoogle.innerHTML = '<i class="fa-brands fa-google"></i> חבר Google Photos';
                        btnGoogle.disabled = false;
                    }

                    if (!photos || photos.length === 0) {
                        if (confirm("לא נבחרו תמונות מ-Google Photos.\nהאם תרצה לנסות שוב? (במידה ולא, תוכל להעלות מהמחשב בלחצן ההעלאה הרגיל)")) {
                            btnGoogle.click();
                        }
                        return;
                    }

                    if (store.state.assets.photos.length > 0 && photos.length > 0) {
                        if (window.confirm("כבר יש תמונות בספרייה שלך.\n\nלחץ אישור כדי להחליף אותן בבחירה החדשה.\nלחץ ביטול כדי להוסיף (שמור קיים).")) {
                            store.state.assets.photos = [];
                        }
                    }

                    const hasLegacyDefault = store.state.pages.some(p => p.templateId === 'family-roots-v1');
                    if (hasLegacyDefault) {
                        this.startNewProject(false);
                    }

                    store.state.assets.photos = [...store.state.assets.photos, ...photos];

                    if (window.app) {
                        window.app._animateNextRender = true;
                        window.app.renderAssetSidebar();
                        store.notify('assets', store.state.assets);
                        if (hasLegacyDefault || store.state.pages.length === 0) {
                            if (store.state.pages.length === 0) store.addPage();
                            window.app.renderActivePage();
                            window.app.updateTimeline(store.state.pages, store.state.activePageId);
                        }
                    }

                    alert(`יובאו בהצלחה ${photos.length} תמונות. גרור אותן לעמודים כדי להתחיל.`);

                    // Background vision processing
                    photoPositionService.batchAnalyzePhotos(photos).then(focalDict => {
                        let updated = false;
                        store.state.assets.photos.forEach(p => {
                            if (focalDict[p.id]) {
                                p.visionFocalPoint = focalDict[p.id];
                                updated = true;
                            }
                        });
                        if (updated && window.app) {
                            store.notify('pages', store.state.pages);
                        }
                    });

                } catch (err) {
                    console.error(err);
                    alert('שגיאת Google Photos: ' + err);
                }
            });
            this._persistedGoogleBtn = btnGoogle;
        }

        // Clear only photo items, re-use Google button
        photoGrid.innerHTML = '';
        photoGrid.appendChild(this._persistedGoogleBtn);

        // PERFORMANCE: Event delegation — 2 listeners on grid instead of 5 per photo
        if (!this._photoGridDelegated) {
            this._photoGridDelegated = true;
            const tooltip = document.getElementById('photo-preview-tooltip');

            // Delegate mouseenter/leave for delete button & preview tooltip
            photoGrid.addEventListener('mouseover', (e) => {
                const item = e.target.closest('.asset-item');
                if (!item) return;
                const delBtn = item.querySelector('.btn-delete-asset');
                if (delBtn) delBtn.style.display = 'flex';
                // Show preview tooltip
                if (tooltip && item.dataset.photoSrc) {
                    tooltip.innerHTML = `<img src="${item.dataset.photoSrc}" style="max-width:400px;max-height:400px;border-radius:8px;box-shadow:0 10px 25px rgba(0,0,0,0.5);display:block;background:#fff;">`;
                    tooltip.style.display = 'block';
                    tooltip.style.top = (e.clientY + 10) + 'px';
                    tooltip.style.left = (e.clientX + 20) + 'px';
                }
            });

            photoGrid.addEventListener('mouseout', (e) => {
                const item = e.target.closest('.asset-item');
                if (!item) return;
                // Only hide if we're actually leaving the item (not entering a child)
                if (!item.contains(e.relatedTarget)) {
                    const delBtn = item.querySelector('.btn-delete-asset');
                    if (delBtn) delBtn.style.display = 'none';
                    if (tooltip) tooltip.style.display = 'none';
                }
            });

            photoGrid.addEventListener('mousemove', (e) => {
                if (tooltip && tooltip.style.display === 'block') {
                    let top = e.clientY + 10;
                    let left = e.clientX + 20;
                    if (left + 400 > window.innerWidth) left = e.clientX - 420;
                    if (top + 400 > window.innerHeight) top = window.innerHeight - 420;
                    tooltip.style.top = top + 'px';
                    tooltip.style.left = left + 'px';
                }
            });

            // Delegate delete button click
            photoGrid.addEventListener('click', (e) => {
                const delBtn = e.target.closest('.btn-delete-asset');
                if (!delBtn) return;
                e.stopPropagation();
                const item = delBtn.closest('.asset-item');
                const photoId = item?.dataset.photoId;
                if (photoId && confirm('להסיר תמונה זו?')) {
                    const idx = store.state.assets.photos.findIndex(p => p.id === photoId);
                    if (idx > -1) {
                        store.state.assets.photos.splice(idx, 1);
                        this.renderAssetSidebar();
                        store.notify('assets', store.state.assets);
                    }
                }
            });

            // Delegate dragstart
            photoGrid.addEventListener('dragstart', (e) => {
                const item = e.target.closest('.asset-item');
                if (!item) return;
                const photoId = item.dataset.photoId;
                if (photoId) {
                    e.dataTransfer.setData('application/json', JSON.stringify({ type: 'photo', id: photoId }));
                    e.dataTransfer.effectAllowed = 'copy';
                }
            });
        }

        // PERFORMANCE: Build all photo elements in a DocumentFragment (single DOM insert)
        const shouldAnimate = this._animateNextRender === true;
        if (shouldAnimate) this._animateNextRender = false;

        const fragment = document.createDocumentFragment();
        const photos = store.state.assets.photos;

        // PERFORMANCE: Lazy image loading via IntersectionObserver
        if (!this._photoImageObserver) {
            this._photoImageObserver = new IntersectionObserver((entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        const src = img.dataset.lazySrc;
                        if (src) {
                            img.src = src;
                            img.removeAttribute('data-lazy-src');
                        }
                        this._photoImageObserver.unobserve(img);
                    }
                }
            }, { rootMargin: '100px' });
        }

        for (let index = 0; index < photos.length; index++) {
            const photo = photos[index];
            const el = document.createElement('div');
            el.className = 'asset-item';
            el.draggable = true;
            el.style.position = 'relative';
            el.dataset.photoId = photo.id;
            el.dataset.photoSrc = photo.thumbnailUrl || photo.url;

            // Solitaire dealing animation
            if (shouldAnimate) {
                el.classList.add('dealing');
                el.style.setProperty('--deal-index', index);
                const animDuration = 450 + (index * 60) + 50;
                setTimeout(() => el.classList.remove('dealing'), animDuration);
            }

            // PERFORMANCE: Use lazy loading for images
            const img = document.createElement('img');
            img.draggable = false;
            img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
            // Load first 20 eagerly (visible), rest lazily
            if (index < 20) {
                img.src = photo.thumbnailUrl || photo.url;
            } else {
                img.dataset.lazySrc = photo.thumbnailUrl || photo.url;
                img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="90" height="90"><rect fill="%23333" width="90" height="90"/></svg>';
                this._photoImageObserver.observe(img);
            }
            el.appendChild(img);

            // Delete button (lightweight, no inline styles — handled by event delegation)
            const delBtn = document.createElement('button');
            delBtn.className = 'btn-delete-asset';
            delBtn.title = 'הסר תמונה';
            delBtn.textContent = '×';
            delBtn.style.cssText = 'position:absolute;top:4px;right:4px;width:20px;height:20px;border-radius:50%;background:rgba(0,0,0,0.6);color:white;border:none;cursor:pointer;display:none;align-items:center;justify-content:center;font-size:14px;line-height:1;';
            el.appendChild(delBtn);

            fragment.appendChild(el);
        }

        photoGrid.appendChild(fragment);

        // Designs
        const designList = document.getElementById('design-library');
        if (designList) {
            designList.innerHTML = '';
            if (window.BACKGROUND_TEXTURES) {
                window.BACKGROUND_TEXTURES.forEach(bg => {
                    const el = document.createElement('div');
                    el.className = 'asset-item';
                    if (bg.url.startsWith('http') || bg.url.startsWith('assets') || bg.url.startsWith('data:')) {
                        el.style.backgroundImage = `url("${bg.url}")`;
                    } else {
                        el.style.backgroundColor = bg.theme?.colors?.primary || '#333';
                    }
                    el.style.backgroundSize = 'cover';
                    el.title = `${bg.name}\nShift+לחיצה = החלה על כל העמודים`;
                    el.addEventListener('click', (e) => {
                        if (e.shiftKey) {
                            // Shift+Click: Apply to ALL pages (old behavior)
                            store.setTheme(bg.id);
                        } else {
                            // Normal click: Apply only to the active page
                            const activePage = store.state.pages.find(p => p.id === store.state.activePageId);
                            if (activePage) {
                                activePage.background = bg.id;
                                activePage.backgroundTextureId = bg.id;
                                store.notify('pages', store.state.pages);
                            }
                        }
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
                            el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 ${w} ${h}">${inner}</svg>`;
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
                                const slot = page.layout?.slots?.find(s => {
                                    const tId = s.photoId || s.assetId || s.id || (s.photoIndex !== undefined ? `index_${s.photoIndex}` : null);
                                    return tId === state.selection;
                                });
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

        // Cover Gallery (Travel Covers)
        const coversList = document.getElementById('covers-library');
        if (coversList) {
            coversList.innerHTML = '';
            if (window.COVER_GALLERY) {
                window.COVER_GALLERY.forEach(cover => {
                    const el = document.createElement('div');
                    el.className = 'cover-gallery-item';
                    el.style.cssText = `
                        aspect-ratio: 5/7;
                        border-radius: 8px;
                        overflow: hidden;
                        cursor: pointer;
                        position: relative;
                        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                        border: 2px solid transparent;
                    `;

                    // Determine the image/background URI for the cover
                    let coverUri = '';
                    if (cover.svg) {
                        coverUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cover.svg);
                    } else if (cover.url) {
                        coverUri = cover.url;
                    } else if (cover.coverUrl) {
                        coverUri = cover.coverUrl;
                    }

                    el.innerHTML = `
                        <img src="${coverUri}" alt="${cover.cityEn}" style="width:100%; height:100%; object-fit:cover; display:block;" loading="lazy" />
                        <div style="position:absolute; bottom:0; left:0; right:0; padding:6px 8px; background:linear-gradient(transparent, rgba(0,0,0,0.7)); color:#fff; font-size:11px; font-weight:600; text-align:center;">
                            ${cover.cityEn}
                        </div>
                    `;

                    // Border highlight on hover (CSS handles transform/shadow pop-up)
                    el.addEventListener('mouseenter', () => {
                        el.style.borderColor = '#38bdf8';
                    });
                    el.addEventListener('mouseleave', () => {
                        el.style.borderColor = 'transparent';
                    });

                    el.addEventListener('click', () => {
                        // Apply cover to the book
                        if (!store.state.cover) store.state.cover = {};
                        store.state.cover.title = cover.cityEn;
                        store.state.cover.subtitle = new Date().getFullYear().toString();
                        store.state.cover.textColor = cover.textColor;
                        store.state.cover.color = cover.bgColor;
                        // Store image/svg as cover background
                        store.state.cover.theme = coverUri;
                        store.state.cover.background = coverUri;
                        store.state.cover._coverGalleryId = cover.id;
                        // Clear any existing front photo — illustration replaces it
                        store.state.cover.frontPhotoId = null;
                        // Store dedicated back cover
                        if (cover.backSvg) {
                            store.state.cover._backSvgDataUri = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(cover.backSvg);
                        } else if (cover.url || cover.coverUrl) {
                            // If it's an uploaded image, use it for the back cover too, or keep it clear? Let's use it for now, or just undefined.
                            store.state.cover._backSvgDataUri = null;
                        }
                        // Update text content tracking
                        if (!store.state.cover.textContent) store.state.cover.textContent = {};
                        store.state.cover.textContent['title'] = cover.cityEn;
                        store.state.cover.textContent['date'] = new Date().getFullYear().toString();
                        store.state.cover.textContent['subtitle'] = new Date().getFullYear().toString();

                        // Switch to cover view and re-render
                        store.state.viewMode = 'cover';
                        store.notify('cover', store.state.cover);
                        store.notify('viewMode', 'cover');

                        console.log('[CoverGallery] Applied cover:', cover.id, cover.cityEn);
                    });

                    el.title = `${cover.cityEn} (${cover.countryEn})`;
                    coversList.appendChild(el);
                });
            }
        }
    }

    updateTimelineActiveState(state) {
        const tl = document.getElementById('page-timeline');
        if (!tl) return;

        const activeChanged = this._lastTimelineActiveId !== state.activePageId ||
            this._lastTimelineViewMode !== state.viewMode;
        this._lastTimelineActiveId = state.activePageId;
        this._lastTimelineViewMode = state.viewMode;

        Array.from(tl.children).forEach(child => {
            if (child.dataset.isCover === 'true') {
                if (state.viewMode === 'cover') child.classList.add('active');
                else child.classList.remove('active');
            } else if (child.dataset.pageId) {
                if (state.viewMode !== 'cover' && child.dataset.pageId === state.activePageId) {
                    child.classList.add('active');
                    // Only scroll when the active page actually changed
                    if (activeChanged) {
                        child.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                    }
                } else {
                    child.classList.remove('active');
                }
            }
        });
    }

    // Fully Virtualized Timeline Construction 
    updateTimeline(pages, activeId) {
        const tl = document.getElementById('page-timeline');
        if (!tl) return;

        // PERFORMANCE: Skip full rebuild if page structure hasn't changed
        // Only rebuild when pages are added, removed, or reordered
        const pageHash = (pages || []).map(p => p.id).join(',');
        const coverHash = store.state.viewMode === 'cover' ? 'cover' : '';
        const fullHash = `${coverHash}|${pageHash}`;

        if (this._lastTimelineHash === fullHash) {
            // Structure unchanged — just update active state and re-render active thumbnail
            this.updateTimelineActiveState(store.state);
            this.updateActiveThumbnailOnly();
            return;
        }
        this._lastTimelineHash = fullHash;

        tl.innerHTML = '';

        // Determine Base Dimensions
        const manager = this.templateSidebar?.manager;
        let rw = 800;
        let rh = 600;

        if (manager && manager.config && manager.config.designSystem && manager.config.designSystem.canvas) {
            rw = manager.config.designSystem.canvas.scaledWidth || manager.config.designSystem.canvas.width || rw;
            rh = manager.config.designSystem.canvas.scaledHeight || manager.config.designSystem.canvas.height || rh;
        }

        const isMobileSize = window.innerWidth <= 768;
        const THUMB_SIZE = isMobileSize ? 80 : 110;

        const calculateScale = (contentW, contentH, targetSize) => {
            const scaleX = targetSize / contentW;
            const scaleY = targetSize / contentH;
            return Math.max(scaleX, scaleY);
        };

        // --- Intersection Observer for Lazy Rendering ---
        if (!this.timelineObserver) {
            this.timelineObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const lazyRenderFn = entry.target._lazyRender;
                        if (lazyRenderFn && !entry.target._rendered) {
                            try {
                                lazyRenderFn();
                                entry.target._rendered = true;
                            } catch (e) {
                                console.warn('[Timeline] Lazy render error:', e.message);
                            }
                        }
                    }
                });
            }, {
                root: tl,
                rootMargin: '400px',
                threshold: 0.01
            });
        }

        // Clear previous observations
        this.timelineObserver.disconnect();

        // 1. Cover
        if (store.state.viewMode === 'cover' || store.state.cover) {
            const coverEl = document.createElement('div');
            coverEl.className = `timeline-page cover ${store.state.viewMode === 'cover' ? 'active' : ''}`;
            coverEl.style.width = `${THUMB_SIZE}px`;
            coverEl.style.height = `${THUMB_SIZE}px`;
            coverEl.style.overflow = 'hidden';
            coverEl.style.position = 'relative';
            coverEl.dataset.isCover = 'true';

            // Placeholder skeleton until observed
            const skeleton = document.createElement('div');
            skeleton.style.width = '100%';
            skeleton.style.height = '100%';
            skeleton.style.background = '#e9ecef';
            coverEl.appendChild(skeleton);

            const coverScale = calculateScale(rw, rh, THUMB_SIZE);

            // Create the lazy loader function attached to the element
            coverEl._lazyRender = () => {
                skeleton.remove(); // Remove skeleton
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

                const coverForRender = store.state.cover;

                const templateConfig = manager?.config || null;
                UnifiedCoverRenderer.render({
                    cover: coverForRender,
                    assets: store.state.assets,
                    templateConfig,
                    container: preview,
                    interactive: false,
                    thumbnail: false
                });
                coverEl.appendChild(preview);
            };

            coverEl.onclick = () => {
                if (store.state.viewMode === 'cover') return;

                // ── ROBUST COVER SWITCH ──
                this._manualRenderLock = true;

                store._isBatchUpdating = true;
                store.state.viewMode = 'cover';
                store.state.activePageId = null;
                store._isBatchUpdating = false;

                this._rafPending = false;
                this._pendingUpdates = new Set();

                this.renderCoverWithTemplate();
                this.updateTimelineActiveState(store.state);
                this.updatePropertiesPanel(store.state);

                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        this._manualRenderLock = false;
                    });
                });
            };

            tl.appendChild(coverEl);
            this.timelineObserver.observe(coverEl);
        }

        // 2. Interior Pages
        const contentPages = pages.filter(page => {
            const isCover = page.templateId === 'cover' || (page.id && page.id.startsWith('page_cover_'));
            return !isCover;
        });

        contentPages.forEach((page, idx) => {
            const el = document.createElement('div');
            el.className = `timeline-page ${page.id === activeId && store.state.viewMode !== 'cover' ? 'active' : ''}`;
            el.style.width = `${THUMB_SIZE}px`;
            el.style.height = `${THUMB_SIZE}px`;
            el.style.overflow = 'hidden';
            el.style.position = 'relative';
            el.dataset.pageId = page.id;

            // Fast skeleton
            const skeleton = document.createElement('div');
            skeleton.style.width = '100%';
            skeleton.style.height = '100%';
            skeleton.style.background = '#e9ecef';
            skeleton.className = 'timeline-skeleton-shimmer';
            el.appendChild(skeleton);

            const pageScale = calculateScale(rw, rh, THUMB_SIZE);

            // The expensive work happens HERE, only when observed
            // IMPORTANT: Look up the CURRENT page state from store (not the stale closure variable)
            // so that background changes, photo changes, etc. are always reflected.
            const pageId = page.id;
            el._lazyRender = () => {
                try {
                    if (skeleton.parentElement) skeleton.remove();
                    // Get the CURRENT page state (not the closure-captured one)
                    const currentPage = store.state.pages.find(p => p.id === pageId) || page;

                    const previewWrapper = document.createElement('div');
                    previewWrapper.className = 'timeline-preview-wrapper';
                    previewWrapper.style.width = `${rw}px`;
                    previewWrapper.style.height = `${rh}px`;
                    previewWrapper.style.position = 'absolute';
                    previewWrapper.style.top = '50%';
                    previewWrapper.style.left = '50%';
                    previewWrapper.style.transform = `translate(-50%, -50%) scale(${pageScale})`;
                    previewWrapper.style.transformOrigin = 'center center';
                    previewWrapper.style.pointerEvents = 'none';
                    // Use transparent — renderPageToContainer handles the actual background
                    previewWrapper.style.backgroundColor = 'transparent';

                    let rendered = false;
                    if (currentPage.templateId) {
                        if (manager && manager.config && manager.config.templateId === currentPage.templateId) {
                            const renderer = this.getSpecializedRenderer(currentPage.templateId, manager.config);
                            if (renderer && currentPage.rawLayoutId) {
                                const layout = manager.config.pageLayouts.find(l => l.layoutId === currentPage.rawLayoutId);
                                if (layout) {
                                    const dom = renderer.renderPage(layout, currentPage.photos || [], currentPage.textContent || {}, currentPage.textPositions || {});
                                    if (dom) {
                                        dom.style.width = '100%';
                                        dom.style.height = '100%';
                                        previewWrapper.appendChild(dom);
                                        rendered = true;
                                    }
                                }
                            }
                        }
                    }

                    if (!rendered) {
                        this.renderer.renderPageToContainer(currentPage, store.state.assets, previewWrapper);
                    }

                    el.appendChild(previewWrapper);
                } catch (err) {
                    console.warn('[Timeline] Render error for page', pageId?.substring(0, 8), err.message);
                }
            };

            const label = document.createElement('div');
            label.className = 'page-num';
            label.textContent = idx + 1;
            el.appendChild(label);

            el.onclick = () => {
                console.log('[TIMELINE CLICK] Page clicked:', page.id?.substring(0, 12), 'viewMode:', store.state.viewMode, 'activePageId:', store.state.activePageId?.substring(0, 12));
                if (store.state.activePageId === page.id && store.state.viewMode === 'pages') {
                    console.log('[TIMELINE CLICK] EARLY RETURN: same page already active');
                    return;
                }

                // ── ROBUST PAGE SWITCH ──
                // 1. Lock out any pending/future subscriber RAF renders
                this._manualRenderLock = true;

                // 2. Update state SILENTLY (no notifications, no subscriber RAF)
                store._isBatchUpdating = true;
                store.state.activePageId = page.id;
                store.state.viewMode = 'pages';
                store._isBatchUpdating = false;

                // 3. Cancel any pending RAF renders
                this._rafPending = false;
                this._pendingUpdates = new Set();

                // 4. Render the page
                console.log('[TIMELINE CLICK] About to render. Looking for page:', store.state.activePageId?.substring(0, 12), 'in', store.state.pages.length, 'pages');
                const foundPage = store.state.pages.find(p => p.id === store.state.activePageId);
                console.log('[TIMELINE CLICK] Page found:', !!foundPage, foundPage ? { id: foundPage.id?.substring(0, 12), layout: typeof foundPage.layout, hasSlots: !!(foundPage.layout?.slots) } : 'NOT FOUND');

                this.renderActivePage();

                const cc = document.getElementById('canvas-container');
                console.log('[TIMELINE CLICK] After render. Container children:', cc?.children.length, 'First child:', cc?.firstElementChild?.className?.substring(0, 40));

                // 5. Sync all UI panels
                this.updateTimelineActiveState(store.state);
                this.updatePropertiesPanel(store.state);
                this.updateMoveable(store.state);

                // 6. Release render lock after 2 frame cycles (guards against delayed RAFs)
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        this._manualRenderLock = false;
                    });
                });
            };

            tl.appendChild(el);
            this.timelineObserver.observe(el);
        });
    }

    // Helper to get renderer instance
    getSpecializedRenderer(templateId, config) {
        // Unified renderer for ALL templates — no per-template dispatch
        if (templateId && config) return new UnifiedTemplateRenderer(config);
        return null;
    }

    // This is now handled safely by updateActiveThumbnailOnly
    updateActivePagePreview() {
        if (!store.state.pages) return;
        this.updateActiveThumbnailOnly();
    }

    // --- Manual Crop / Pan Logic ---

    enterCropMode(slotEl) {
        if (!slotEl) return;
        const pageContainer = slotEl.closest('.shoso-page') || slotEl.closest('.album-page');
        if (!pageContainer) {
            console.log('[App] enterCropMode skipped: not on a page (likely cover)');
            return;
        }
        const pageId = pageContainer.dataset.pageId;
        const slotId = slotEl.dataset.selectableId;

        // Set Manual Crop Flag
        const page = store.state.pages.find(p => p.id === pageId);
        if (page) {
            const slot = page.layout.slots.find(s => s.photoId === slotId);
            if (slot) slot.manualCrop = true;
        }

        if (this.currentCropSession) {
            this.commitCropMode();
        }

        console.log('[App] Entering crop mode for', slotId);

        // --- Visual Feedback ---
        document.querySelectorAll('.photo-slot').forEach(el => el.classList.remove('crop-active'));
        slotEl.classList.add('crop-active');

        // Create instruction overlay
        const instructionEl = document.createElement('div');
        instructionEl.className = 'crop-instruction';
        instructionEl.innerHTML = `
            <i class="fas fa-arrows-alt" style="margin-left: 8px;"></i>
            <span>גרור לשינוי מיקום התמונה</span>
            <span style="margin: 0 6px; opacity: 0.6;">•</span>
            <span>לחץ בחוץ לסיום</span>
        `;
        instructionEl.style.cssText = `
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(37, 99, 235, 0.95);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 200;
            pointer-events: none;
            direction: rtl;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            animation: cropInstructionPulse 2s ease-in-out infinite;
        `;
        slotEl.appendChild(instructionEl);

        // Page dimming overlay
        const dimOverlay = document.createElement('div');
        dimOverlay.className = 'crop-dim-overlay';
        dimOverlay.style.cssText = `
            position: absolute; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.4); z-index: 90; pointer-events: none;
        `;
        pageContainer.appendChild(dimOverlay);
        slotEl.style.zIndex = '100';

        // Inject animation styles once
        if (!document.getElementById('crop-mode-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'crop-mode-styles';
            styleEl.textContent = `
                @keyframes cropInstructionPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .photo-slot.crop-active {
                    box-shadow: 0 0 0 3px #2563eb, 0 0 0 6px rgba(37, 99, 235, 0.3) !important;
                    z-index: 100 !important;
                    cursor: move !important;
                }
                .photo-slot.crop-active img {
                    pointer-events: none;
                    transition: object-position 0.05s ease-out;
                }
            `;
            document.head.appendChild(styleEl);
        }

        // --- Get current pan values ---
        const img = slotEl.querySelector('img');
        let currentPanX = 50, currentPanY = 50, currentZoom = 1;
        if (page) {
            const slot = page.layout.slots.find(s => s.photoId === slotId);
            if (slot && slot.crop) {
                currentPanX = slot.crop.panX !== undefined ? slot.crop.panX : 50;
                currentPanY = slot.crop.panY !== undefined ? slot.crop.panY : 50;
                currentZoom = slot.crop.zoom || 1;
            }
        }

        // --- Initialize Session ---
        this.currentCropSession = {
            slotEl, pageId, slotId, imgEl: img,
            instructionEl, dimOverlay,
            panX: currentPanX, panY: currentPanY, zoom: currentZoom,
            startX: 0, startY: 0,
            startPanX: currentPanX, startPanY: currentPanY,
            isDragging: false, hasModified: false
        };

        // Apply current state visually
        if (img) {
            img.style.objectPosition = `${currentPanX}% ${currentPanY}%`;
            img.style.transform = `scale(${currentZoom})`;
            img.style.transformOrigin = 'center center';
        }

        // --- Dismiss handler ---
        setTimeout(() => {
            const dismissHandler = (e) => {
                if (!slotEl.contains(e.target) && this.currentCropSession && !this.currentCropSession.isDragging) {
                    this.commitCropMode();
                    document.removeEventListener('mousedown', dismissHandler);
                    document.removeEventListener('touchstart', dismissHandler);
                }
            };
            this.currentCropSession.dismissHandler = dismissHandler;
            document.addEventListener('mousedown', dismissHandler);
            document.addEventListener('touchstart', dismissHandler, { passive: true });
        }, 200);

        // --- Attach drag handlers ---
        slotEl.addEventListener('mousedown', this.boundHandleCropDragStart);
        slotEl.addEventListener('touchstart', this.boundHandleCropDragStart, { passive: false });
        slotEl.style.cursor = 'move';
        slotEl.draggable = false;
    }

    commitCropMode() {
        if (!this.currentCropSession) return;
        const { slotEl, pageId, slotId, dismissHandler, instructionEl, dimOverlay } = this.currentCropSession;
        console.log('[App] Committing crop mode for', slotId);

        // Cleanup visuals
        slotEl.classList.remove('crop-active');
        slotEl.style.cursor = '';
        slotEl.draggable = true;
        if (instructionEl && instructionEl.parentNode) instructionEl.remove();
        if (dimOverlay && dimOverlay.parentNode) dimOverlay.remove();

        // Remove all listeners
        slotEl.removeEventListener('mousedown', this.boundHandleCropDragStart);
        slotEl.removeEventListener('touchstart', this.boundHandleCropDragStart);
        if (dismissHandler) {
            document.removeEventListener('mousedown', dismissHandler);
            document.removeEventListener('touchstart', dismissHandler);
        }
        window.removeEventListener('mousemove', this.boundHandleCropDragMove);
        window.removeEventListener('mouseup', this.boundHandleCropDragEnd);
        window.removeEventListener('touchmove', this.boundHandleCropDragMove);
        window.removeEventListener('touchend', this.boundHandleCropDragEnd);

        // Persist final state
        const page = store.state.pages.find(p => p.id === pageId);
        if (page) {
            const slot = page.layout.slots.find(s => s.photoId === slotId);
            if (slot) {
                if (!slot.crop) slot.crop = {};
                slot.crop.panX = this.currentCropSession.panX;
                slot.crop.panY = this.currentCropSession.panY;
                slot.crop.zoom = this.currentCropSession.zoom;
            }
        }
        store.notify('pages', store.state.pages);
        this.currentCropSession = null;
    }

    initializeCropState(pageId, slotId, slotEl) {
        // No-op — initialization handled in enterCropMode
    }

    handleCropDragStart(e) {
        if (!this.currentCropSession) return;
        e.stopPropagation();
        e.preventDefault();

        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        if (!this.currentCropSession.hasModified) {
            store.pushState('Adjust Crop');
            this.currentCropSession.hasModified = true;
        }

        this.currentCropSession.isDragging = true;
        this.currentCropSession.startX = clientX;
        this.currentCropSession.startY = clientY;
        this.currentCropSession.startPanX = this.currentCropSession.panX;
        this.currentCropSession.startPanY = this.currentCropSession.panY;

        window.addEventListener('mousemove', this.boundHandleCropDragMove);
        window.addEventListener('mouseup', this.boundHandleCropDragEnd);
        window.addEventListener('touchmove', this.boundHandleCropDragMove, { passive: false });
        window.addEventListener('touchend', this.boundHandleCropDragEnd);
    }

    handleCropDragMove(e) {
        if (!this.currentCropSession || !this.currentCropSession.isDragging) return;
        e.preventDefault();

        const isTouch = e.type === 'touchmove';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;

        const { startX, startY, startPanX, startPanY, slotEl, imgEl } = this.currentCropSession;
        const dx = clientX - startX;
        const dy = clientY - startY;

        // Convert pixel movement to percentage (dragging right = decrease panX to reveal left side)
        const sensitivity = 100 / Math.max(slotEl.clientWidth, 1);
        const sensitivityY = 100 / Math.max(slotEl.clientHeight, 1);

        let newPanX = Math.max(0, Math.min(100, startPanX - (dx * sensitivity)));
        let newPanY = Math.max(0, Math.min(100, startPanY - (dy * sensitivityY)));

        this.currentCropSession.panX = newPanX;
        this.currentCropSession.panY = newPanY;

        if (imgEl) {
            imgEl.style.objectPosition = `${newPanX}% ${newPanY}%`;
        }
    }

    handleCropDragEnd(e) {
        if (!this.currentCropSession) return;
        this.currentCropSession.isDragging = false;

        window.removeEventListener('mousemove', this.boundHandleCropDragMove);
        window.removeEventListener('mouseup', this.boundHandleCropDragEnd);
        window.removeEventListener('touchmove', this.boundHandleCropDragMove);
        window.removeEventListener('touchend', this.boundHandleCropDragEnd);

        // Persist to state
        const { pageId, slotId, panX, panY, zoom } = this.currentCropSession;
        const page = store.state.pages.find(p => p.id === pageId);
        if (page) {
            const slot = page.layout.slots.find(s => s.photoId === slotId);
            if (slot) {
                if (!slot.crop) slot.crop = {};
                slot.crop.panX = panX;
                slot.crop.panY = panY;
                slot.crop.zoom = zoom;
            }
        }
    }

    // --- Cover Photo Crop / Pan Mode ---

    enterCoverCropMode(targetEl, coverSide) {
        if (!targetEl) return;

        // Commit any existing crop session
        if (this.currentCropSession) this.commitCropMode();
        if (this.currentCoverCropSession) this.commitCoverCropMode();

        console.log('[App] Entering cover crop mode for', coverSide);

        // --- Visual Feedback ---
        targetEl.classList.add('crop-active');

        // Instruction tooltip
        const instructionEl = document.createElement('div');
        instructionEl.className = 'crop-instruction';
        instructionEl.innerHTML = `
            <i class="fas fa-arrows-alt" style="margin-left: 8px;"></i>
            <span>גרור לשינוי מיקום התמונה</span>
            <span style="margin: 0 6px; opacity: 0.6;">•</span>
            <span>לחץ בחוץ לסיום</span>
        `;
        instructionEl.style.cssText = `
            position: absolute;
            bottom: -40px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(37, 99, 235, 0.95);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 500;
            white-space: nowrap;
            z-index: 200;
            pointer-events: none;
            direction: rtl;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
            animation: cropInstructionPulse 2s ease-in-out infinite;
        `;
        targetEl.style.position = targetEl.style.position || 'relative';
        targetEl.appendChild(instructionEl);

        // Inject animation styles once
        if (!document.getElementById('crop-mode-styles')) {
            const styleEl = document.createElement('style');
            styleEl.id = 'crop-mode-styles';
            styleEl.textContent = `
                @keyframes cropInstructionPulse {
                    0%, 100% { opacity: 1; }
                    50% { opacity: 0.7; }
                }
                .photo-slot.crop-active, .cover-photo-area.crop-active, .back-cover.crop-active {
                    box-shadow: 0 0 0 3px #2563eb, 0 0 0 6px rgba(37, 99, 235, 0.3) !important;
                    z-index: 100 !important;
                    cursor: move !important;
                }
                .photo-slot.crop-active img, .back-cover.crop-active img {
                    pointer-events: none;
                    transition: object-position 0.05s ease-out;
                }
            `;
            document.head.appendChild(styleEl);
        }

        // Get current pan from state
        const cover = store.state.cover || {};
        const cropKey = coverSide === 'front' ? 'frontCrop' : 'backCrop';
        const currentCrop = cover[cropKey] || {};
        let currentPanX = currentCrop.panX !== undefined ? currentCrop.panX : 50;
        let currentPanY = currentCrop.panY !== undefined ? currentCrop.panY : 50;

        // Apply current position
        if (coverSide === 'front') {
            targetEl.style.backgroundPosition = `${currentPanX}% ${currentPanY}%`;
        } else {
            const img = targetEl.querySelector('img');
            if (img) {
                img.style.objectPosition = `${currentPanX}% ${currentPanY}%`;
            }
        }

        this.currentCoverCropSession = {
            targetEl, coverSide, instructionEl,
            panX: currentPanX, panY: currentPanY,
            startX: 0, startY: 0,
            startPanX: currentPanX, startPanY: currentPanY,
            isDragging: false, hasModified: false
        };

        // Drag start handler
        const onDragStart = (e) => {
            e.stopPropagation();
            e.preventDefault();
            const isTouch = e.type === 'touchstart';
            const clientX = isTouch ? e.touches[0].clientX : e.clientX;
            const clientY = isTouch ? e.touches[0].clientY : e.clientY;

            if (!this.currentCoverCropSession.hasModified) {
                store.pushState('Adjust Cover Crop');
                this.currentCoverCropSession.hasModified = true;
            }

            this.currentCoverCropSession.isDragging = true;
            this.currentCoverCropSession.startX = clientX;
            this.currentCoverCropSession.startY = clientY;
            this.currentCoverCropSession.startPanX = this.currentCoverCropSession.panX;
            this.currentCoverCropSession.startPanY = this.currentCoverCropSession.panY;

            window.addEventListener('mousemove', onDragMove);
            window.addEventListener('mouseup', onDragEnd);
            window.addEventListener('touchmove', onDragMove, { passive: false });
            window.addEventListener('touchend', onDragEnd);
        };

        const onDragMove = (e) => {
            if (!this.currentCoverCropSession || !this.currentCoverCropSession.isDragging) return;
            e.preventDefault();
            const isTouch = e.type === 'touchmove';
            const clientX = isTouch ? e.touches[0].clientX : e.clientX;
            const clientY = isTouch ? e.touches[0].clientY : e.clientY;

            const { startX, startY, startPanX, startPanY, targetEl: el, coverSide: side } = this.currentCoverCropSession;
            const dx = clientX - startX;
            const dy = clientY - startY;

            const sensitivity = 100 / Math.max(el.clientWidth, 1);
            const sensitivityY = 100 / Math.max(el.clientHeight, 1);

            let newPanX = Math.max(0, Math.min(100, startPanX - (dx * sensitivity)));
            let newPanY = Math.max(0, Math.min(100, startPanY - (dy * sensitivityY)));

            this.currentCoverCropSession.panX = newPanX;
            this.currentCoverCropSession.panY = newPanY;

            if (side === 'front') {
                el.style.backgroundPosition = `${newPanX}% ${newPanY}%`;
            } else {
                const img = el.querySelector('img');
                if (img) img.style.objectPosition = `${newPanX}% ${newPanY}%`;
            }
        };

        const onDragEnd = () => {
            if (!this.currentCoverCropSession) return;
            this.currentCoverCropSession.isDragging = false;
            window.removeEventListener('mousemove', onDragMove);
            window.removeEventListener('mouseup', onDragEnd);
            window.removeEventListener('touchmove', onDragMove);
            window.removeEventListener('touchend', onDragEnd);

            // Persist to cover state
            const { panX, panY, coverSide: side } = this.currentCoverCropSession;
            if (!store.state.cover) store.state.cover = {};
            const key = side === 'front' ? 'frontCrop' : 'backCrop';
            store.state.cover[key] = { panX, panY };
        };

        // Store handlers for cleanup
        this.currentCoverCropSession._onDragStart = onDragStart;
        this.currentCoverCropSession._onDragMove = onDragMove;
        this.currentCoverCropSession._onDragEnd = onDragEnd;

        targetEl.addEventListener('mousedown', onDragStart);
        targetEl.addEventListener('touchstart', onDragStart, { passive: false });
        targetEl.style.cursor = 'move';

        // Dismiss handler
        setTimeout(() => {
            const dismissHandler = (e) => {
                if (!targetEl.contains(e.target) && this.currentCoverCropSession && !this.currentCoverCropSession.isDragging) {
                    this.commitCoverCropMode();
                    document.removeEventListener('mousedown', dismissHandler);
                    document.removeEventListener('touchstart', dismissHandler);
                }
            };
            this.currentCoverCropSession._dismissHandler = dismissHandler;
            document.addEventListener('mousedown', dismissHandler);
            document.addEventListener('touchstart', dismissHandler, { passive: true });
        }, 200);
    }

    commitCoverCropMode() {
        if (!this.currentCoverCropSession) return;
        const { targetEl, coverSide, instructionEl, _onDragStart, _onDragMove, _onDragEnd, _dismissHandler, panX, panY } = this.currentCoverCropSession;
        console.log('[App] Committing cover crop mode for', coverSide);

        targetEl.classList.remove('crop-active');
        targetEl.style.cursor = '';
        if (instructionEl && instructionEl.parentNode) instructionEl.remove();

        // Remove listeners
        targetEl.removeEventListener('mousedown', _onDragStart);
        targetEl.removeEventListener('touchstart', _onDragStart);
        if (_dismissHandler) {
            document.removeEventListener('mousedown', _dismissHandler);
            document.removeEventListener('touchstart', _dismissHandler);
        }
        window.removeEventListener('mousemove', _onDragMove);
        window.removeEventListener('mouseup', _onDragEnd);
        window.removeEventListener('touchmove', _onDragMove);
        window.removeEventListener('touchend', _onDragEnd);

        // Persist final state
        if (!store.state.cover) store.state.cover = {};
        const key = coverSide === 'front' ? 'frontCrop' : 'backCrop';
        store.state.cover[key] = { panX, panY };

        // DON'T notify 'cover' — that would trigger full re-render!
        // Just save quietly via the debounced save
        if (this.saveDebounced) this.saveDebounced(store.state);

        this.currentCoverCropSession = null;
    }

    applyViewerRestrictions() {
        console.log("[App] Applying viewer restrictions (Read-Only Mode)");
        // Hide standard editing toolbars/buttons
        const hideIds = ['btn-undo', 'btn-redo', 'btn-remix-layout', 'btn-add-photos-sidebar'];
        hideIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'none';
        });

        // Add a Read-Only badge to top toolbar
        const toolbar = document.querySelector('.toolbar-group.center');
        if (toolbar && !document.getElementById('badge-readonly')) {
            const badge = document.createElement('span');
            badge.id = 'badge-readonly';
            badge.style.cssText = 'background: #fbbf24; color: #78350f; padding: 4px 10px; border-radius: 12px; font-weight: bold; font-size: 0.85rem; margin-right: 15px; display: inline-flex; align-items: center; gap: 5px;';
            badge.innerHTML = '<i class="fa-solid fa-eye"></i> צפייה בלבד';
            toolbar.appendChild(badge);
        }

        // Disable moveable interactions
        if (this.moveableInstance) {
            this.moveableInstance.draggable = false;
            this.moveableInstance.resizable = false;
            this.moveableInstance.rotatable = false;
        }

        // Disable template/element drag interactions (we can use CSS locally or just rely on state)
        document.getElementById('sidebar-left').style.pointerEvents = 'none';
        document.getElementById('sidebar-left').style.opacity = '0.5';

        // Disable save button or indicator
        let statusEl = document.getElementById('save-status-indicator');
        if (statusEl) statusEl.textContent = "מצב קריאה";
    }

    removeViewerRestrictions() {
        // Remove Read-Only badge
        const badge = document.getElementById('badge-readonly');
        if (badge) badge.remove();

        const showIds = ['btn-undo', 'btn-redo', 'btn-remix-layout', 'btn-add-photos-sidebar'];
        showIds.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = '';
        });

        document.getElementById('sidebar-left').style.pointerEvents = '';
        document.getElementById('sidebar-left').style.opacity = '1';

        if (this.moveableInstance) {
            this.moveableInstance.draggable = true;
            this.moveableInstance.resizable = true;
            this.moveableInstance.rotatable = true;
        }
    }

    openShareModal() {
        if (!store.state.user) {
            alert("עליך להתחבר כדי לשתף את האלבום.");
            return;
        }

        if (!persistenceService.currentProjectId) {
            alert("יש לשמור את הפרויקט לפני שיתופו. הוסף תמונות או דפים תחילה.");
            return;
        }

        const modal = document.getElementById('share-modal');
        const togglePublic = document.getElementById('share-toggle-public');
        const panel = document.getElementById('share-settings-panel');
        const roleSelect = document.getElementById('share-role-select');
        const allowReshare = document.getElementById('share-allow-reshare');
        const linkInput = document.getElementById('share-link-input');
        const btnCopy = document.getElementById('btn-copy-share-link');
        const btnSave = document.getElementById('btn-save-share-settings');
        const notice = document.getElementById('share-not-saved-notice');

        // Hide notice generally
        notice.style.display = 'none';

        // Check ownership
        const isOwner = store.state.user.uid === (persistenceService.currentOwner || persistenceService.currentShareSettings?.owner);
        const role = persistenceService.currentRole || "owner";
        const shareSettings = persistenceService.currentShareSettings || {};

        if (role !== "owner" && !(role === "editor" && shareSettings.allowEditorsToShare)) {
            alert("אין לך הרשאה לשתף את האלבום הזה.");
            return;
        }

        // Populate modal with current settings
        togglePublic.checked = shareSettings.isPublic || false;
        panel.style.display = togglePublic.checked ? 'block' : 'none';
        roleSelect.value = shareSettings.publicRole || 'viewer';
        allowReshare.checked = shareSettings.allowEditorsToShare || false;

        // URL construction
        const buildLink = (token) => {
            const origin = window.location.origin;
            const path = window.location.pathname;
            return `${origin}${path}?projectId=${persistenceService.currentProjectId}&shareToken=${token || ''}`;
        };

        linkInput.value = buildLink(shareSettings.shareToken);

        // Bind UI
        togglePublic.onchange = (e) => {
            panel.style.display = e.target.checked ? 'block' : 'none';
        };

        btnCopy.onclick = async () => {
            if (!togglePublic.checked) {
                togglePublic.checked = true;
                panel.style.display = 'block';
                await btnSave.onclick();
            }

            navigator.clipboard.writeText(linkInput.value).then(() => {
                const icon = btnCopy.querySelector('i');
                if (icon) {
                    const prevClass = icon.className;
                    icon.className = 'fa-solid fa-check';
                    setTimeout(() => icon.className = prevClass, 2000);
                }
            });
        };

        btnSave.onclick = async () => {
            btnSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> שומר...';
            btnSave.disabled = true;

            try {
                const newSettings = {
                    isPublic: togglePublic.checked,
                    publicRole: roleSelect.value,
                    allowEditorsToShare: allowReshare.checked
                };
                const result = await persistenceService.updateShareSettings(persistenceService.currentProjectId, newSettings);

                // Update local value with new token if generated
                linkInput.value = buildLink(result.shareSettings.shareToken);

                btnSave.innerHTML = '<i class="fa-solid fa-check"></i> נשמר!';
                setTimeout(() => {
                    btnSave.innerHTML = 'שמור הגדרות';
                    btnSave.disabled = false;
                }, 2000);
            } catch (e) {
                console.error("Failed to save share settings", e);
                alert("שגיאה בשמירת הגדרות שיתוף: " + e.message);
                btnSave.innerHTML = 'שמור הגדרות';
                btnSave.disabled = false;
            }
        };

        modal.style.display = 'flex';
    }
}

// Start the app
window.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
});

// PDF Preview Handler (Now handled by Component UI)
window.downloadPdfOnly = async () => {
    console.log("PDF download triggered externally.");
    // This is a legacy hook. Real generation happens via UI component buttons communicating with pdfServerExport
};

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



