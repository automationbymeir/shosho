// ============================================
// PHOTO BOOK CREATOR - MAIN APPLICATION
// ============================================

// ============================================
// STATE MANAGEMENT
// ============================================
const state = {
    selectedPhotos: [],
    pages: [],
    currentPageIndex: 0,
    selectedTemplate: null, // Selected template from gallery
    // Tracks the currently-open saved album/project (so refresh can restore it)
    activeProjectId: null,
    activeProjectType: null, // 'classic' | 'memoryDirector' | null
    activeProjectTitle: null,
    pendingStartMemoryDirector: false,
    // Last PDF generation (used for optional BookPod printing at end)
    lastGeneratedBookData: null,
    lastGeneratedPdfDownloadUrl: null,
    // Optional BookPod order draft (delivery details)
    bookpodOrderDraft: null,
    cover: {
        photo: null,
        title: 'My Photo Book',
        titleSize: 36,
        titleColor: '#ffffff',
        titleFont: 'Playfair Display',
        subtitle: '',
        backgroundColor: '#1a1a2e',
        photoBorder: null
    },
    backCover: {
        text: 'Thank you for viewing this photo book',
        subtitle: '',
        textSize: 18,
        subtitleSize: 12,
        textFont: 'Inter',
        textColor: '#ffffff',
        backgroundColor: '#1a1a2e',
        textAlign: 'center',
        showBorder: true,
        showLogo: false
    },
    selectedPhotoSlot: null, // Currently selected photo slot for alignment
    config: {
        THEMES: {
            'classic': {
                name: 'Classic Minimal',
                colors: {
                    primary: '#1E3932',
                    secondary: '#D4AF37',
                    bg: '#FFFFFF',
                    surface: '#FFFFFF',
                    text: '#333333'
                },
                fonts: {
                    serif: "'Playfair Display', Georgia, serif",
                    sans: "'Montserrat', sans-serif"
                },
                illustrations: {
                    corner: '🌿',
                    border: 'simple',
                    pattern: 'none'
                },
                decorations: []
            },
            'botanical': {
                name: 'Botanical',
                colors: {
                    primary: '#2C5F2D',
                    secondary: '#97BC62',
                    bg: '#F3F4F0',
                    surface: '#FFFFFF',
                    text: '#1A2F1C'
                },
                fonts: {
                    serif: "'Playfair Display', serif",
                    sans: "'Lato', sans-serif"
                },
                illustrations: {
                    corner: '🌱',
                    border: 'leaf',
                    pattern: 'botanical'
                },
                decorations: ['🌿', '🍃', '🌾']
            },
            'modern': {
                name: 'Modern Bold',
                colors: {
                    primary: '#000000',
                    secondary: '#FF3366',
                    bg: '#F5F5F5',
                    surface: '#FFFFFF',
                    text: '#000000'
                },
                fonts: {
                    serif: "'Montserrat', sans-serif",
                    sans: "'Open Sans', sans-serif"
                },
                illustrations: {
                    corner: '◆',
                    border: 'geometric',
                    pattern: 'geometric'
                },
                decorations: ['◆', '◼', '●']
            }
        },
        LAYOUTS: {
            'single': { slots: 1, name: 'Single Photo' },
            'two-horizontal': { slots: 2, name: 'Two Horizontal' },
            'two-vertical': { slots: 2, name: 'Two Vertical' },
            'three-left': { slots: 3, name: 'Three (Large Left)' },
            'three-right': { slots: 3, name: 'Three (Large Right)' },
            'four-grid': { slots: 4, name: 'Four Grid' },
            'collage-5': { slots: 5, name: 'Collage (5 Photos)' },
            'collage-6': { slots: 6, name: 'Collage (6 Photos)' }
        }
    },
    pollingInterval: null,
    sessionId: null,
    photoPickerCallback: null,
    generatedPresentationId: null,
    generatedPdfUrl: null,
    generatedPdfDownloadUrl: null,
    // BookPod printing options (prep)
    bookpodPrint: {
        printcolor: 'color', // 'bw' | 'color'
        sheettype: 'white80',
        laminationtype: 'none', // 'none'|'flat'|'matt'
        finishtype: 'soft', // BookPod currently documents 'soft' for this flow
        readingdirection: 'right', // 'right'|'left'
        bleed: false,
        width: 15.0,  // cm
        height: 22.0  // cm
    },
    // Default background for newly-created pages (can be set before any pages exist)
    defaultPageBackgroundColor: null,
    user: null,
    currentTheme: 'classic'
};

// ============================================
// COLOR UTILITY FUNCTIONS
// ============================================

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (e.g., "#6366f1")
 * @returns {{r: number, g: number, b: number}|null}
 */
function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

/**
 * Convert RGB values to hex string
 */
function rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    }).join('');
}

/**
 * Lighten a hex color by a percentage
 */
function lightenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(
        rgb.r + (255 - rgb.r) * (percent / 100),
        rgb.g + (255 - rgb.g) * (percent / 100),
        rgb.b + (255 - rgb.b) * (percent / 100)
    );
}

/**
 * Darken a hex color by a percentage
 */
function darkenColor(hex, percent) {
    const rgb = hexToRgb(hex);
    if (!rgb) return hex;
    return rgbToHex(
        rgb.r * (1 - percent / 100),
        rgb.g * (1 - percent / 100),
        rgb.b * (1 - percent / 100)
    );
}

/**
 * Check if a color is dark (for determining text color)
 */
function isColorDark(hex) {
    const rgb = hexToRgb(hex);
    if (!rgb) return false;
    const luminance = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
    return luminance < 0.5;
}

/**
 * Get contrasting text color for a background
 */
function getContrastingTextColor(bgHex) {
    return isColorDark(bgHex) ? '#ffffff' : '#1e293b';
}

function parseBookpodSizeCm(value) {
    const raw = String(value || '').trim();
    const m = raw.match(/^(\d+(?:\.\d+)?)x(\d+(?:\.\d+)?)$/i);
    if (!m) return null;
    return { width: Number(m[1]), height: Number(m[2]) };
}

function readBookpodPrintSettingsFromUI() {
    // Classic editor ids
    const getSel = (id) => document.getElementById(id)?.value;
    const getChk = (id) => Boolean(document.getElementById(id)?.checked);

    const sizeRaw = getSel('bpSizeCm');
    const size = parseBookpodSizeCm(sizeRaw) || { width: 15.0, height: 22.0 };

    state.bookpodPrint = {
        ...state.bookpodPrint,
        printcolor: getSel('bpPrintColor') || state.bookpodPrint.printcolor,
        sheettype: getSel('bpSheetType') || state.bookpodPrint.sheettype,
        laminationtype: getSel('bpLaminationType') || state.bookpodPrint.laminationtype,
        finishtype: 'soft',
        readingdirection: getSel('bpReadingDirection') || state.bookpodPrint.readingdirection,
        bleed: getChk('bpBleed'),
        width: size.width,
        height: size.height
    };

    return state.bookpodPrint;
}

function applyBookpodPrintSettingsToUI(settings) {
    const s = settings && typeof settings === 'object' ? settings : state.bookpodPrint;
    const setVal = (id, v) => { const el = document.getElementById(id); if (el && v !== undefined && v !== null) el.value = String(v); };
    const setChk = (id, v) => { const el = document.getElementById(id); if (el) el.checked = Boolean(v); };

    setVal('bpPrintColor', s.printcolor || 'color');
    setVal('bpSheetType', s.sheettype || 'white80');
    setVal('bpLaminationType', s.laminationtype || 'none');
    setVal('bpReadingDirection', s.readingdirection || 'right');
    setChk('bpBleed', Boolean(s.bleed));

    const sizeValue = `${Number(s.width || 15)}x${Number(s.height || 22)}`;
    setVal('bpSizeCm', sizeValue);
}

// ============================================
// PERSIST "CURRENTLY EDITING ALBUM" ACROSS REFRESH
// ============================================
const STORAGE_KEYS = {
    lastProjectId: 'shoso:lastProjectId',
    lastProjectType: 'shoso:lastProjectType',
    lastProjectTitle: 'shoso:lastProjectTitle',
    lastProjectOpenedAt: 'shoso:lastProjectOpenedAt',
    // Lightweight draft so refresh doesn't kick you to the gallery
    // (especially for unsaved projects).
    draftV1: 'shoso:draft:v1',
    lastView: 'shoso:lastView'
};

function persistActiveProjectToStorage() {
    try {
        if (state.activeProjectId) {
            localStorage.setItem(STORAGE_KEYS.lastProjectId, String(state.activeProjectId));
            localStorage.setItem(STORAGE_KEYS.lastProjectType, String(state.activeProjectType || ''));
            localStorage.setItem(STORAGE_KEYS.lastProjectTitle, String(state.activeProjectTitle || ''));
            localStorage.setItem(STORAGE_KEYS.lastProjectOpenedAt, new Date().toISOString());
        } else {
            localStorage.removeItem(STORAGE_KEYS.lastProjectId);
            localStorage.removeItem(STORAGE_KEYS.lastProjectType);
            localStorage.removeItem(STORAGE_KEYS.lastProjectTitle);
            localStorage.removeItem(STORAGE_KEYS.lastProjectOpenedAt);
        }
    } catch (e) {
        // localStorage may be blocked; ignore
        console.warn('Failed to persist active project to storage:', e);
    }
}

function clearActiveProjectFromStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.lastProjectId);
        localStorage.removeItem(STORAGE_KEYS.lastProjectType);
        localStorage.removeItem(STORAGE_KEYS.lastProjectTitle);
        localStorage.removeItem(STORAGE_KEYS.lastProjectOpenedAt);
    } catch (e) {
        console.warn('Failed to clear active project from storage:', e);
    }
}

function getLastProjectIdFromStorage() {
    try {
        const v = localStorage.getItem(STORAGE_KEYS.lastProjectId);
        return v && String(v).trim() ? String(v).trim() : null;
    } catch {
        return null;
    }
}

function persistLastViewToStorage(view) {
    try {
        if (!view) return;
        localStorage.setItem(STORAGE_KEYS.lastView, String(view));
    } catch {
        // ignore
    }
}

function getLastViewFromStorage() {
    try {
        const v = localStorage.getItem(STORAGE_KEYS.lastView);
        return v && String(v).trim() ? String(v).trim() : null;
    } catch {
        return null;
    }
}

function detectCurrentView() {
    const elGallery = document.getElementById('templateGalleryView');
    const elEditor = document.getElementById('editorView');
    const elMD = document.getElementById('memoryDirectorView');
    const isShown = (el) => {
        if (!el) return false;
        const style = window.getComputedStyle ? getComputedStyle(el) : null;
        const display = style ? style.display : el.style.display;
        return display !== 'none';
    };
    if (isShown(elMD)) return 'memoryDirector';
    if (isShown(elEditor)) return 'editor';
    if (isShown(elGallery)) return 'gallery';
    return null;
}

function clearDraftFromStorage() {
    try {
        localStorage.removeItem(STORAGE_KEYS.draftV1);
    } catch {
        // ignore
    }
}

function getDraftFromStorage() {
    try {
        const raw = localStorage.getItem(STORAGE_KEYS.draftV1);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || parsed.v !== 1) return null;
        return parsed;
    } catch {
        return null;
    }
}

// ============================================
// NEW ALBUM (RESET) FLOW
// ============================================
function getDefaultClassicCoverState() {
    return {
        photo: null,
        title: 'My Photo Book',
        titleSize: 36,
        titleColor: '#ffffff',
        titleFont: 'Playfair Display',
        subtitle: '',
        backgroundColor: '#1a1a2e',
        photoBorder: null
    };
}

function getDefaultClassicBackCoverState() {
    return {
        text: 'Thank you for viewing this photo book',
        subtitle: '',
        textSize: 18,
        subtitleSize: 12,
        textFont: 'Inter',
        textColor: '#ffffff',
        backgroundColor: '#1a1a2e',
        textAlign: 'center',
        showBorder: true,
        showLogo: false
    };
}

function resetMemoryDirectorStateToDefaults() {
    try {
        mdState.active = false;
        mdState.story = null;
        mdState.chapters = [];
        mdState.spreads = [];
        mdState.activeChapterId = null;
        mdState.currentSpreadIndex = 0;
        mdState.pendingPlacement = null;
        mdState.settings = {
            pageFormat: "square-10x10",
            coverBackground: "#1a1a2e",
            coverTextColor: "#ffffff",
            pageBackground: "#ffffff",
            paperTexture: "matte"
        };
    } catch (e) {
        console.warn('Failed to reset Memory Director state:', e);
    }
}

function closeAllOpenModals() {
    try {
        document.querySelectorAll('.modal.active').forEach(el => el.classList.remove('active'));
        // Memory Director story modal uses a different class
        const mdStory = document.getElementById('storyDetectionModal');
        if (mdStory) mdStory.classList.remove('active');
        // Any custom overlays (cinematic preview etc.)
        document.querySelectorAll('.cinematic-preview-overlay').forEach(el => el.remove());
        document.querySelectorAll('#resolutionWarningsModal').forEach(el => el.remove());
    } catch {
        // ignore
    }
}

function resetClassicAlbumStateToDefaults() {
    // Clear saved-album pointer and lightweight draft so refresh doesn't re-open old work
    state.activeProjectId = null;
    state.activeProjectType = null;
    state.activeProjectTitle = null;
    clearActiveProjectFromStorage();
    clearDraftFromStorage();
    persistLastViewToStorage('gallery');

    // Reset classic editor state
    state.selectedPhotos = [];
    state.pages = [];
    state.currentPageIndex = 0;
    state.selectedPhotoSlot = null;
    state.photoPickerCallback = null;
    state.generatedPresentationId = null;
    state.generatedPdfUrl = null;
    state.generatedPdfDownloadUrl = null;

    // Reset cover/back cover
    state.cover = getDefaultClassicCoverState();
    state.backCover = getDefaultClassicBackCoverState();

    // Require choosing a template for the new album
    state.selectedTemplate = null;
    state.currentTheme = 'classic';
    state.defaultPageBackgroundColor = null;
    state.pendingStartMemoryDirector = false;

    // Reset a few UI fields (safe even if editor is hidden)
    try {
        const title = document.getElementById('bookTitle');
        if (title) title.value = state.cover.title;
        const pageFormat = document.getElementById('pageFormat');
        if (pageFormat) pageFormat.value = 'square-8x8';
        const templateIndicator = document.getElementById('selectedTemplateName');
        if (templateIndicator) templateIndicator.textContent = '';
        const pageTemplateLabel = document.getElementById('pageTemplateLabel');
        if (pageTemplateLabel) pageTemplateLabel.textContent = '';
    } catch {
        // ignore
    }

    // Re-render classic editor UI pieces
    try {
        if (typeof resetPickerButton !== 'undefined') resetPickerButton();
    } catch { /* ignore */ }

    try { updateSelectedPhotosUI(); } catch { /* ignore */ }
    try { renderSelectedPhotosModal(); } catch { /* ignore */ }
    try { updateCoverFromState(); } catch { /* ignore */ }
    try { updateBackCoverPreview(); } catch { /* ignore */ }
    try { renderPageThumbnails(); } catch { /* ignore */ }
    try { renderCurrentPage(); } catch { /* ignore */ }
    try { updatePageIndicator(); } catch { /* ignore */ }
}

/**
 * Start a brand-new album from anywhere (any template / editor / Memory Director).
 * Clears current state and then shows template options for the user to choose.
 */
function startNewAlbum() {
    const ok = confirm('Start a new album? Unsaved changes will be lost.');
    if (!ok) return;

    closeAllOpenModals();
    resetMemoryDirectorStateToDefaults();
    resetClassicAlbumStateToDefaults();

    // Ask the user which template to use by showing the template gallery options
    if (typeof showTemplateGallery !== 'undefined') {
        showTemplateGallery();
    } else {
        const galleryView = document.getElementById('templateGalleryView');
        const editorView = document.getElementById('editorView');
        const mdView = document.getElementById('memoryDirectorView');
        if (galleryView) galleryView.style.display = 'block';
        if (editorView) editorView.style.display = 'none';
        if (mdView) mdView.style.display = 'none';
        if (typeof initTemplateGallery !== 'undefined') initTemplateGallery();
    }
}

function sanitizePhotoForStorage(p) {
    if (!p || typeof p !== 'object') return null;
    // Avoid storing big data-URIs in localStorage (thumbnails/edited images).
    return {
        id: p.id || null,
        baseUrl: normalizeBaseUrl(p.baseUrl || p.fullUrl || null),
        caption: p.caption || null,
        alignment: p.alignment || null,
        // Keep any simple flags; drop heavy fields like thumbnailUrl / editedData / editedImageData.
        edited: Boolean(p.edited)
    };
}

function normalizeBaseUrl(u) {
    if (!u || typeof u !== 'string') return u;
    // Google Photos baseUrls sometimes get size params appended ("=w800-h800").
    // Be careful: some URLs may contain "=" for other reasons (query params, etc).
    // Only strip the *trailing* Google image resize suffix when it looks like one.
    const idx = u.lastIndexOf('=');
    if (idx < 0) return u;
    const suffix = u.slice(idx + 1);
    // Typical suffix begins with w/h/s digits: w800-h800, s256, etc.
    if (/^(w|h|s)\d/i.test(suffix)) return u.slice(0, idx);
    return u;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function isPhotosAuthRequiredError(err) {
    const code = err && (err.code || err?.details?.code);
    if (code === 'PHOTOS_AUTH_REQUIRED') return true;
    const msg = String(err?.message || err?.error || '');
    return msg.includes('PHOTOS_AUTH_REQUIRED') || msg.toLowerCase().includes('user not authorized');
}

async function requestGooglePhotosAuthorization(purpose = 'access your Google Photos') {
    try {
        const res = await callFunction('getAuthUrl');
        if (res?.authUrl) {
            window.open(res.authUrl, '_blank', 'noopener,noreferrer');
            return true;
        }
    } catch (e) {
        console.warn('Failed to get auth URL:', e);
    }
    return false;
}

async function waitForGooglePhotosAuthorization(testBaseUrl, timeoutMs = 60000) {
    const start = Date.now();
    const u = normalizeBaseUrl(testBaseUrl);
    if (!u) return true;

    while (Date.now() - start < timeoutMs) {
        try {
            const res = await callFunction('fetchThumbnailBatch', { baseUrls: [u] });
            if (res?.success && Array.isArray(res?.thumbnails) && res.thumbnails.some(t => t && t.thumbnailUrl)) {
                return true;
            }
        } catch {
            // ignore; retry
        }
        await sleep(2000);
    }
    return false;
}

function getAnyPhotoBaseUrlFromState() {
    // Try to find *any* baseUrl that requires Google Photos OAuth.
    const pick = (p) => normalizeBaseUrl(p?.baseUrl || p?.fullUrl || p?.url || null);

    const cover = pick(state?.cover?.photo);
    if (cover) return cover;

    const selected = pick((state?.selectedPhotos || []).find(p => p && (p.baseUrl || p.fullUrl || p.url)));
    if (selected) return selected;

    for (const page of (state?.pages || [])) {
        for (const p of (page?.photos || [])) {
            const u = pick(p);
            if (u) return u;
        }
    }

    // Memory Director spreads (if active)
    for (const s of (mdState?.spreads || [])) {
        const l = pick(s?.leftPhoto);
        if (l) return l;
        const r = pick(s?.rightPhoto);
        if (r) return r;
    }

    return null;
}

async function ensureGooglePhotosAuthorizedInteractive(purpose = 'use your Google Photos', timeoutMs = 60000) {
    const testUrl = getAnyPhotoBaseUrlFromState();
    if (!testUrl) return true;

    try {
        const res = await callFunction('fetchThumbnailBatch', { baseUrls: [testUrl] });
        if (res && res.success === false && String(res.error || '').toLowerCase().includes('no auth')) {
            const err = new Error('PHOTOS_AUTH_REQUIRED');
            err.code = 'PHOTOS_AUTH_REQUIRED';
            throw err;
        }
        return true;
    } catch (e) {
        if (!isPhotosAuthRequiredError(e)) throw e;
        await requestGooglePhotosAuthorization(purpose);
        return await waitForGooglePhotosAuthorization(testUrl, timeoutMs);
    }
}

function sanitizePageForStorage(page) {
    if (!page || typeof page !== 'object') return null;
    const photos = Array.isArray(page.photos) ? page.photos.map(sanitizePhotoForStorage).filter(Boolean) : [];
    return {
        layout: page.layout || 'single',
        caption: page.caption || '',
        backgroundColor: page.backgroundColor || null,
        themeColors: page.themeColors || null,
        template: page.template || null,
        photos
    };
}

function persistDraftToStorage(reason = 'auto') {
    try {
        const lastView = detectCurrentView() || getLastViewFromStorage() || 'gallery';
        persistLastViewToStorage(lastView);

        // Prefer restoring a saved project by ID if present.
        // Draft is mainly for “unsaved edits / unsaved project” and to keep the editor open on refresh.
        const payload = {
            v: 1,
            savedAt: new Date().toISOString(),
            reason,
            lastView,
            // We keep enough to restore the editor UI and reconstruct thumbnails via baseUrls.
            activeProjectId: state.activeProjectId || null,
            activeProjectType: state.activeProjectType || null,
            classic: null,
            memoryDirector: null
        };

        if (mdState && mdState.active) {
            payload.lastView = 'memoryDirector';
            payload.memoryDirector = {
                settings: mdState.settings || null,
                story: mdState.story || null,
                chapters: mdState.chapters || null,
                spreads: (mdState.spreads || []).map(s => ({
                    id: s.id,
                    chapterId: s.chapterId,
                    spreadNumber: s.spreadNumber || 1,
                    leftPhoto: sanitizePhotoForStorage(s.leftPhoto),
                    rightPhoto: sanitizePhotoForStorage(s.rightPhoto)
                })),
                selectedPhotos: (state.selectedPhotos || []).map(p => sanitizePhotoForStorage(p)).filter(Boolean),
                bookpodPrint: state.bookpodPrint || null
            };
        } else {
            payload.classic = {
                bookTitle: document.getElementById('bookTitle')?.value || state.cover?.title || 'My Photo Book',
                pageFormat: document.getElementById('pageFormat')?.value || null,
                currentPageIndex: Number.isFinite(state.currentPageIndex) ? state.currentPageIndex : 0,
                currentTheme: state.currentTheme || null,
                selectedTemplateId: state.selectedTemplate?.id || null,
                bookpodPrint: state.bookpodPrint || null,
                cover: {
                    ...state.cover,
                    photo: sanitizePhotoForStorage(state.cover?.photo)
                },
                backCover: { ...state.backCover },
                pages: (state.pages || []).map(sanitizePageForStorage).filter(Boolean),
                selectedPhotos: (state.selectedPhotos || []).map(p => sanitizePhotoForStorage(p)).filter(Boolean)
            };
        }

        // If we have essentially nothing meaningful, don't write.
        const hasSomething =
            (payload.activeProjectId) ||
            (payload.classic && (payload.classic.pages?.length || payload.classic.cover?.photo || payload.classic.selectedTemplateId)) ||
            (payload.memoryDirector && (payload.memoryDirector.spreads?.length || payload.memoryDirector.story));
        if (!hasSomething) return;

        localStorage.setItem(STORAGE_KEYS.draftV1, JSON.stringify(payload));
    } catch (e) {
        console.warn('Failed to persist draft to storage:', e);
    }
}

async function rehydrateThumbnailsFromBaseUrls() {
    try {
        const baseUrls = [];
        const pushUrl = (u) => { if (u && typeof u === 'string') baseUrls.push(u); };
        const getBaseUrl = (p) => (p && typeof p === 'object') ? normalizeBaseUrl(p.baseUrl || p.fullUrl || p.url || null) : null;

        pushUrl(getBaseUrl(state.cover?.photo));
        (state.selectedPhotos || []).forEach(p => pushUrl(getBaseUrl(p)));
        (state.pages || []).forEach(page => {
            (page.photos || []).forEach(p => pushUrl(getBaseUrl(p)));
        });

        let map = null;
        try {
            map = await fetchThumbnailMapInBatches(baseUrls);
        } catch (e) {
            if (isPhotosAuthRequiredError(e)) {
                await requestGooglePhotosAuthorization('restore your photos');
                const ok = await waitForGooglePhotosAuthorization(baseUrls[0], 60000);
                if (ok) map = await fetchThumbnailMapInBatches(baseUrls);
            } else {
                throw e;
            }
        }
        if (!map || map.size === 0) return;

        const coverBaseUrl = getBaseUrl(state.cover?.photo);
        if (state.cover?.photo && coverBaseUrl && map.get(coverBaseUrl)) {
            state.cover.photo.baseUrl = coverBaseUrl;
            state.cover.photo.thumbnailUrl = map.get(coverBaseUrl);
        }
        (state.selectedPhotos || []).forEach(p => {
            const u = getBaseUrl(p);
            if (p && u && map.get(u)) {
                p.baseUrl = u;
                p.thumbnailUrl = map.get(u);
            }
        });
        (state.pages || []).forEach(page => {
            (page.photos || []).forEach(p => {
                const u = getBaseUrl(p);
                if (p && u && map.get(u)) {
                    p.baseUrl = u;
                    p.thumbnailUrl = map.get(u);
                }
            });
        });
    } catch (e) {
        console.warn('Failed to rehydrate thumbnails:', e);
    }
}

async function fetchThumbnailMapInBatches(baseUrls, opts = {}) {
    const { batchSize = 12, onProgress } = opts || {};
    const unique = Array.from(new Set((baseUrls || []).filter(u => u && typeof u === 'string').map(normalizeBaseUrl))).filter(Boolean);
    if (unique.length === 0) return new Map();

    const map = new Map();
    for (let i = 0; i < unique.length; i += batchSize) {
        const chunk = unique.slice(i, i + batchSize);
        try {
            const thumbs = await callFunction('fetchThumbnailBatch', { baseUrls: chunk });
            if (thumbs && thumbs.success === false && String(thumbs.error || '').toLowerCase().includes('no auth')) {
                const err = new Error('PHOTOS_AUTH_REQUIRED');
                err.code = 'PHOTOS_AUTH_REQUIRED';
                throw err;
            }
            if (thumbs?.success && Array.isArray(thumbs?.thumbnails)) {
                thumbs.thumbnails.forEach(t => {
                    const k = normalizeBaseUrl(t?.baseUrl);
                    if (k && t.thumbnailUrl) map.set(k, t.thumbnailUrl);
                });
            }
        } catch (e) {
            // Keep going; partial thumbnails are still useful.
            console.warn('Thumbnail batch failed:', e);
            if (isPhotosAuthRequiredError(e)) throw e;
        } finally {
            if (typeof onProgress === 'function') {
                try { onProgress(Math.min(i + chunk.length, unique.length), unique.length); } catch { /* ignore */ }
            }
        }
    }
    return map;
}

async function tryRestoreDraftIfNeeded() {
    const draft = getDraftFromStorage();
    if (!draft) return false;

    // If we have a saved project ID, prefer that path (loadProject handles view + persistence).
    if (draft.activeProjectId) return false;

    // Restore Memory Director draft
    if (draft.memoryDirector) {
        try {
            mdState.active = true;
            mdState.settings = draft.memoryDirector.settings || mdState.settings;
            state.bookpodPrint = { ...(state.bookpodPrint || {}), ...(draft.memoryDirector.bookpodPrint || {}) };

            state.selectedPhotos = (draft.memoryDirector.selectedPhotos || []).map(p => ({
                ...p,
                thumbnailUrl: null
            }));

            mdState.story = draft.memoryDirector.story || mdState.story;
            mdState.chapters = draft.memoryDirector.chapters || mdState.chapters;
            mdState.spreads = (draft.memoryDirector.spreads || []).map(s => ({
                ...s,
                leftPhoto: s.leftPhoto ? { ...s.leftPhoto, thumbnailUrl: null } : null,
                rightPhoto: s.rightPhoto ? { ...s.rightPhoto, thumbnailUrl: null } : null
            }));

            // Hydrate thumbnails for MD pool + spread photos (reuse existing MD loader helper if it exists)
            // but keep it simple: just fetch thumbnails for all baseUrls.
            const mdUrls = [];
            (state.selectedPhotos || []).forEach(p => { if (p?.baseUrl) mdUrls.push(normalizeBaseUrl(p.baseUrl)); });
            (mdState.spreads || []).forEach(s => {
                if (s.leftPhoto?.baseUrl) mdUrls.push(normalizeBaseUrl(s.leftPhoto.baseUrl));
                if (s.rightPhoto?.baseUrl) mdUrls.push(normalizeBaseUrl(s.rightPhoto.baseUrl));
            });
            const unique = Array.from(new Set(mdUrls)).filter(Boolean);
            if (unique.length > 0) {
                try {
                    const map = await fetchThumbnailMapInBatches(unique, { batchSize: 12 });
                    if (map && map.size > 0) {
                        (state.selectedPhotos || []).forEach(p => {
                            const u = normalizeBaseUrl(p?.baseUrl);
                            if (p && u && map.get(u)) {
                                p.baseUrl = u;
                                p.thumbnailUrl = map.get(u);
                            }
                        });
                        (mdState.spreads || []).forEach(s => {
                            const l = normalizeBaseUrl(s.leftPhoto?.baseUrl);
                            const r = normalizeBaseUrl(s.rightPhoto?.baseUrl);
                            if (s.leftPhoto && l && map.get(l)) { s.leftPhoto.baseUrl = l; s.leftPhoto.thumbnailUrl = map.get(l); }
                            if (s.rightPhoto && r && map.get(r)) { s.rightPhoto.baseUrl = r; s.rightPhoto.thumbnailUrl = map.get(r); }
                        });
                    }
                } catch (e) {
                    if (isPhotosAuthRequiredError(e)) {
                        await requestGooglePhotosAuthorization('restore your photos');
                        const ok = await waitForGooglePhotosAuthorization(unique[0], 60000);
                        if (ok) {
                            const map = await fetchThumbnailMapInBatches(unique, { batchSize: 12 });
                            (state.selectedPhotos || []).forEach(p => {
                                const u = normalizeBaseUrl(p?.baseUrl);
                                if (p && u && map.get(u)) { p.baseUrl = u; p.thumbnailUrl = map.get(u); }
                            });
                            (mdState.spreads || []).forEach(s => {
                                const l = normalizeBaseUrl(s.leftPhoto?.baseUrl);
                                const r = normalizeBaseUrl(s.rightPhoto?.baseUrl);
                                if (s.leftPhoto && l && map.get(l)) { s.leftPhoto.baseUrl = l; s.leftPhoto.thumbnailUrl = map.get(l); }
                                if (s.rightPhoto && r && map.get(r)) { s.rightPhoto.baseUrl = r; s.rightPhoto.thumbnailUrl = map.get(r); }
                            });
                        }
                    } else {
                        throw e;
                    }
                }
            }

            showMemoryDirectorView();
            return true;
        } catch (e) {
            console.warn('Failed to restore Memory Director draft:', e);
            return false;
        }
    }

    // Restore classic editor draft
    if (draft.classic) {
        try {
            // Wait for templates so template re-apply works.
            await waitForTemplatesReady(2500);

            const c = draft.classic;
            state.currentTheme = c.currentTheme || state.currentTheme;
            state.selectedTemplate = null;

            const templatesObj = window.PHOTO_BOOK_TEMPLATES || (typeof PHOTO_BOOK_TEMPLATES !== 'undefined' ? PHOTO_BOOK_TEMPLATES : {});
            if (c.selectedTemplateId && templatesObj && templatesObj[c.selectedTemplateId]) {
                state.selectedTemplate = templatesObj[c.selectedTemplateId];
            }

            state.bookpodPrint = { ...(state.bookpodPrint || {}), ...(c.bookpodPrint || {}) };
            applyBookpodPrintSettingsToUI(state.bookpodPrint);

            // Restore content
            state.cover = c.cover || state.cover;
            state.backCover = c.backCover || getDefaultClassicBackCoverState();
            
            // Update back cover UI from restored state
            if (typeof updateBackCoverFromState === 'function') {
                updateBackCoverFromState();
            } else {
                updateBackCoverPreview();
            }
            state.pages = Array.isArray(c.pages) ? c.pages : [];
            state.selectedPhotos = Array.isArray(c.selectedPhotos) ? c.selectedPhotos : [];
            state.currentPageIndex = Number.isFinite(c.currentPageIndex) ? c.currentPageIndex : 0;

            // Ensure expected photo shape for later rendering
            if (state.cover?.photo && !state.cover.photo.baseUrl && state.cover.photo.baseUrl !== null) {
                state.cover.photo.baseUrl = state.cover.photo.baseUrl || state.cover.photo.fullUrl || null;
            }
            (state.pages || []).forEach(page => {
                (page.photos || []).forEach(p => {
                    if (p && !p.thumbnailUrl) p.thumbnailUrl = null;
                });
            });

            // Update UI controls
            const titleEl = document.getElementById('bookTitle');
            if (titleEl && c.bookTitle) titleEl.value = c.bookTitle;
            const formatEl = document.getElementById('pageFormat');
            if (formatEl && c.pageFormat) formatEl.value = c.pageFormat;

            // Switch to editor + apply template styling
            if (typeof showEditorView !== 'undefined') {
                showEditorView();
            } else {
                const galleryView = document.getElementById('templateGalleryView');
                const editorView = document.getElementById('editorView');
                const mdView = document.getElementById('memoryDirectorView');
                if (galleryView) galleryView.style.display = 'none';
                if (editorView) editorView.style.display = 'block';
                if (mdView) mdView.style.display = 'none';
            }

            if (state.selectedTemplate && typeof applyTemplate !== 'undefined') {
                applyTemplate(state.selectedTemplate);
            } else if (state.selectedTemplate && typeof applyTemplateToUI !== 'undefined') {
                applyTemplateToUI(state.selectedTemplate);
            }

            // Rehydrate thumbnails then render
            await rehydrateThumbnailsFromBaseUrls();
            updateSelectedPhotosUI();
            updateCoverFromState();
            if (typeof updateBackCoverFromState === 'function') {
                updateBackCoverFromState();
            } else {
                updateBackCoverPreview();
            }
            renderPageThumbnails();
            renderCurrentPage();
            updatePageIndicator();
            return true;
        } catch (e) {
            console.warn('Failed to restore classic draft:', e);
            return false;
        }
    }

    return false;
}

function waitForTemplatesReady(timeoutMs = 2000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
            const ok = (typeof window.PHOTO_BOOK_TEMPLATES !== 'undefined' || typeof PHOTO_BOOK_TEMPLATES !== 'undefined');
            if (ok) return resolve(true);
            if (Date.now() - start >= timeoutMs) return resolve(false);
            setTimeout(tick, 50);
        };
        tick();
    });
}

let didAutoRestoreLastProject = false;

// ============================================
// MEMORY DIRECTOR STATE & FUNCTIONS
// ============================================

const mdState = {
    active: false,
    story: null,
    chapters: [],
    spreads: [],
    activeChapterId: null,
    currentSpreadIndex: 0,
    pendingPlacement: null, // { spreadId, position }
    settings: {
        pageFormat: "square-10x10",
        coverBackground: "#1a1a2e",
        coverTextColor: "#ffffff",
        pageBackground: "#ffffff",
        paperTexture: "matte"
    }
};

function setMDPaperTexture(texture) {
    mdState.settings.paperTexture = texture;
    document.querySelectorAll('.md-btn-group .btn').forEach(btn => btn.classList.remove('active'));
    const buttons = document.querySelectorAll('.md-btn-group .btn');
    if (texture === 'matte') {
        buttons[0]?.classList.add('active');
    } else if (texture === 'glossy') {
        buttons[1]?.classList.add('active');
    }
}

/**
 * Initialize Memory Director with selected photos
 */
async function initMemoryDirector() {
    if (!state.selectedPhotos || state.selectedPhotos.length === 0) {
        state.pendingStartMemoryDirector = true;
        // Stay on the template gallery (no “old editor” flash).
        // Auto-open the picker so this feels different than regular templates.
        setTimeout(() => {
            try {
                if (typeof loadPicker !== 'undefined') {
                    showStatus("Memory Director: select at least 4 photos, then we'll build your story automatically.", "info");
                    loadPicker();
                } else {
                    alert("Please select photos first (open Google Photos, pick at least 4), then Memory Director will start automatically.");
                }
            } catch (e) {
                console.warn("Failed to auto-open picker:", e);
                alert("Please select photos first (open Google Photos, pick at least 4), then Memory Director will start automatically.");
            }
        }, 200);
        return;
    }

    if (state.selectedPhotos.length < 4) {
        state.pendingStartMemoryDirector = true;
        // Stay on the template gallery (no “old editor” flash).
        // Guide user and offer to add more via picker automatically.
        setTimeout(() => {
            try {
                if (typeof loadPicker !== 'undefined') {
                    showStatus("Memory Director: please add more photos (need at least 4).", "info");
                    loadPicker();
                } else {
                    alert("Please select at least 4 photos for a photo book. Memory Director will start automatically once you have enough.");
                }
            } catch (e) {
                console.warn("Failed to auto-open picker:", e);
                alert("Please select at least 4 photos for a photo book. Memory Director will start automatically once you have enough.");
            }
        }, 200);
        return;
    }

    showProgress("Analyzing your photos...", "AI is detecting your story structure...", 20);

    try {
        const result = await callFunction("detectStory", {
            photos: state.selectedPhotos.map(p => ({
                id: p.id,
                date: p.date || p.creationTime || null,
                location: p.location || null,
                filename: p.filename || p.name || null,
                creationTime: p.creationTime || null,
                mediaMetadata: p.mediaMetadata || null
            }))
        });

        if (!result.success) {
            throw new Error(result.error || "Story detection failed");
        }

        updateProgress("Story detected!", `Found ${result.story.chapters.length} chapter(s)`, 80);

        // Store in state
        mdState.story = result.story;
        mdState.chapters = (result.story.chapters || []).map(ch => ({ ...ch }));
        mdState.active = true;

        // Map photo indices to actual photos
        mdState.chapters.forEach(chapter => {
            chapter.photos = (chapter.photoIndices || [])
                .map(i => state.selectedPhotos[i])
                .filter(Boolean);
            chapter.photoCount = chapter.photos.length;
        });

        // Set first chapter as active
        if (mdState.chapters.length > 0) {
            mdState.activeChapterId = mdState.chapters[0].id;
        }

        // Generate spreads
        generateSpreadsFromChapters();

        updateProgress("Ready!", "Opening Memory Director...", 100);

        setTimeout(() => {
            hideProgress();
            showMemoryDirectorView();
        }, 400);

    } catch (error) {
        hideProgress();
        console.error("Memory Director error:", error);
        alert("Failed to analyze photos: " + error.message);
    }
}

/**
 * Generate spreads from chapters (2 photos per spread)
 */
function generateSpreadsFromChapters() {
    mdState.spreads = [];

    mdState.chapters.forEach(chapter => {
        const photos = chapter.photos || [];

        for (let i = 0; i < photos.length; i += 2) {
            mdState.spreads.push({
                id: `spread-${mdState.spreads.length}`,
                chapterId: chapter.id,
                leftPhoto: photos[i] || null,
                rightPhoto: photos[i + 1] || null,
                spreadNumber: Math.floor(i / 2) + 1
            });
        }
    });

    console.log(`Generated ${mdState.spreads.length} spreads`);
}

function showMemoryDirectorView() {
    const gallery = document.getElementById("templateGalleryView");
    const editor = document.getElementById("editorView");
    const mdView = document.getElementById("memoryDirectorView");
    if (gallery) gallery.style.display = "none";
    if (editor) editor.style.display = "none";
    if (mdView) mdView.style.display = "block";

    renderMDChaptersList();
    renderMDActiveChapter();
    showStoryDetectionModal();
}

function showStoryDetectionModal() {
    const modal = document.getElementById("storyDetectionModal");
    if (!modal) return;

    const titleEl = document.getElementById("mdStoryTitle");
    if (titleEl) titleEl.textContent = mdState.story?.title || "Your Photo Story";

    const chaptersHtml = (mdState.chapters || []).map(chapter => `
        <div class="md-chapter-preview">
            <div class="md-chapter-icon" style="background: ${chapter.color}20; color: ${chapter.color}">
                ${getIcon ? getIcon(chapter.icon, 20) : ''}
            </div>
            <div class="md-chapter-info">
                <span class="md-chapter-name">${escapeHtml(chapter.name || '')}</span>
                <span class="md-chapter-subtitle">${escapeHtml(chapter.subtitle || "")}</span>
            </div>
            <span class="md-chapter-count">${chapter.photoCount || 0} photos</span>
        </div>
    `).join("");

    const listEl = document.getElementById("mdChaptersList");
    if (listEl) listEl.innerHTML = chaptersHtml;
    modal.classList.add("active");
}

function acceptStoryStructure() {
    const modal = document.getElementById("storyDetectionModal");
    if (modal) modal.classList.remove("active");
}

function renderMDChaptersList() {
    const container = document.getElementById("mdChaptersContainer");
    if (!container) return;

    container.innerHTML = (mdState.chapters || []).map(chapter => `
        <div class="md-chapter-card ${chapter.id === mdState.activeChapterId ? "active" : ""}"
            data-chapter-id="${chapter.id}"
            onclick="selectMDChapter('${chapter.id}')"
            style="--chapter-color: ${chapter.color}">
            <div class="md-chapter-header">
                <div class="md-chapter-icon-wrap" style="background: ${chapter.color}20; color: ${chapter.color}">
                    ${getIcon ? getIcon(chapter.icon, 22) : ''}
                </div>
                <div>
                    <h4>${escapeHtml(chapter.name || '')}</h4>
                    <p>${escapeHtml(chapter.subtitle || "")}</p>
                </div>
            </div>
            <div class="md-chapter-thumbs">
                ${(chapter.photos || []).slice(0, 4).map(photo => `
                    <div class="md-thumb">
                        ${photo?.thumbnailUrl ? `<img src="${photo.thumbnailUrl}" alt="">` : ""}
                    </div>
                `).join("")}
                ${(chapter.photos?.length || 0) > 4 ? `<div class="md-thumb-more">+${chapter.photos.length - 4}</div>` : ""}
            </div>
        </div>
    `).join("");
}

function selectMDChapter(chapterId) {
    mdState.activeChapterId = chapterId;

    document.querySelectorAll(".md-chapter-card").forEach(card => {
        card.classList.toggle("active", card.dataset.chapterId === chapterId);
    });

    renderMDActiveChapter();
}

function renderMDActiveChapter() {
    const chapter = (mdState.chapters || []).find(c => c.id === mdState.activeChapterId);
    if (!chapter) return;

    const header = document.getElementById("mdChapterHeader");
    if (header) {
        header.innerHTML = `
            <div class="md-active-chapter" style="--chapter-color: ${chapter.color}">
                <div class="md-chapter-icon-lg" style="background: ${chapter.color}20; color: ${chapter.color}">
                    ${getIcon ? getIcon(chapter.icon, 28) : ''}
                </div>
                <div>
                    <h2>${escapeHtml(chapter.name || '')}</h2>
                    <p>${escapeHtml(chapter.subtitle || `${chapter.photoCount || 0} photos`)}</p>
                </div>
            </div>
        `;
    }

    const chapterSpreads = (mdState.spreads || []).filter(s => s.chapterId === chapter.id);
    const container = document.getElementById("mdSpreadsContainer");

    if (container) {
        container.innerHTML = chapterSpreads.map((spread, idx) => {
            const leftPageNum = spread.spreadNumber * 2;         // even (left)
            const rightPageNum = spread.spreadNumber * 2 + 1;    // odd (right)
            return `
                <div class="md-spread ${idx === 0 ? "active" : ""}" data-spread-id="${spread.id}">
                    <div class="md-spread-gutter"></div>

                    <div class="md-spread-page md-spread-left">
                        ${spread.leftPhoto ? renderMDPhotoSlot(spread.leftPhoto, "left", spread.id) : renderMDEmptySlot(spread.id, "left")}
                        <span class="md-page-num">${leftPageNum}</span>
                    </div>

                    <div class="md-spread-page md-spread-right">
                        ${spread.rightPhoto ? renderMDPhotoSlot(spread.rightPhoto, "right", spread.id) : renderMDEmptySlot(spread.id, "right")}
                        <span class="md-page-num">${rightPageNum}</span>
                    </div>
                </div>
            `;
        }).join("");
    }
}

function renderMDPhotoSlot(photo, position, spreadId) {
    return `
        <div class="md-photo-slot"
            data-photo-id="${photo?.id || ''}"
            data-position="${position}"
            onclick="openMDPhotoPicker('${spreadId}', '${position}')">
            ${photo?.thumbnailUrl ? `<img src="${photo.thumbnailUrl}" alt="" draggable="false">` : ""}
            ${photo?.caption ? `<div class="md-photo-caption">${escapeHtml(photo.caption)}</div>` : ""}
        </div>
    `;
}

function renderMDEmptySlot(spreadId, position) {
    return `
        <div class="md-empty-slot" onclick="openMDPhotoPicker('${spreadId}', '${position}')">
            ${getIcon ? getIcon("plus", 24) : '+'}
            <span>Add photo</span>
        </div>
    `;
}

function openMDPhotoPicker(spreadId, position) {
    mdState.pendingPlacement = { spreadId, position };
    state.photoPickerCallback = (photo) => {
        const spread = (mdState.spreads || []).find(s => s.id === spreadId);
        if (!spread) return;

        if (position === 'left') spread.leftPhoto = photo;
        if (position === 'right') spread.rightPhoto = photo;

        mdState.pendingPlacement = null;
        renderMDChaptersList();
        renderMDActiveChapter();
    };
    openPhotoPicker();
}

async function generateMDCaptions() {
    const allPhotos = (mdState.spreads || []).flatMap(s => [s.leftPhoto, s.rightPhoto].filter(Boolean));
    if (allPhotos.length === 0) {
        alert("No photos to caption");
        return;
    }

    showProgress("Generating captions...", "AI is writing captions for your photos...", 30);

    try {
        const result = await callFunction("generateCaptions", {
            photos: allPhotos.map((p, i) => ({
                index: i,
                date: p.date || p.creationTime || null,
                location: p.location || null,
                filename: p.filename || p.name || null,
                caption: p.caption || null
            }))
        });

        if (!result.success) throw new Error(result.error || "Caption generation failed");

        (result.captions || []).forEach(item => {
            const photo = allPhotos[item.index];
            if (photo && item.caption) photo.caption = item.caption;
        });

        hideProgress();
        renderMDActiveChapter();
        showStatus(`Generated ${result.captions?.length || 0} captions`, "success");

    } catch (error) {
        hideProgress();
        alert("Caption generation failed: " + error.message);
    }
}

function addMDSpread() {
    if (!mdState.activeChapterId) return;
    const chapterSpreads = mdState.spreads.filter(s => s.chapterId === mdState.activeChapterId);

    mdState.spreads.push({
        id: `spread-${Date.now()}`,
        chapterId: mdState.activeChapterId,
        leftPhoto: null,
        rightPhoto: null,
        spreadNumber: chapterSpreads.length + 1
    });

    renderMDActiveChapter();
}

function addMDChapter() {
    const colors = ["#E07B54", "#9CAF88", "#5B9BD5", "#D4A574", "#8B6F4E", "#6B8E9F", "#722F37"];

    const newChapter = {
        id: `chapter-${Date.now()}`,
        name: "New Chapter",
        subtitle: "Click to edit",
        icon: "sun",
        color: colors[mdState.chapters.length % colors.length],
        photos: [],
        photoCount: 0,
        photoIndices: []
    };

    mdState.chapters.push(newChapter);
    if (mdState.story) mdState.story.chapters = mdState.chapters;

    renderMDChaptersList();
    selectMDChapter(newChapter.id);
}

async function generateMDBook() {
    if (!mdState.spreads || mdState.spreads.length === 0) {
        alert("No spreads to generate");
        return;
    }

    const hasPhotos = mdState.spreads.some(s => s.leftPhoto || s.rightPhoto);
    if (!hasPhotos) {
        alert("Please add photos to your spreads first");
        return;
    }

    showProgress("Generating your photo book...", "This may take a few minutes...", 10);

    try {
        const bookData = {
            // Add a top-level title for downstream integrations (BookPod printing)
            title: mdState.story?.title || "My Photo Book",
            story: {
                title: mdState.story?.title || "My Photo Book",
                chapters: mdState.chapters.map(ch => ({
                    id: ch.id,
                    name: ch.name,
                    subtitle: ch.subtitle,
                    icon: ch.icon,
                    color: ch.color,
                    photoCount: ch.photoCount
                }))
            },
            spreads: mdState.spreads.map(s => ({
                id: s.id,
                chapterId: s.chapterId,
                leftPhoto: s.leftPhoto ? {
                    id: s.leftPhoto.id,
                    baseUrl: s.leftPhoto.baseUrl,
                    thumbnailUrl: s.leftPhoto.thumbnailUrl,
                    caption: s.leftPhoto.caption || null,
                    editedImageData: s.leftPhoto.editedImageData || null,
                    editedData: s.leftPhoto.editedData || null
                } : null,
                rightPhoto: s.rightPhoto ? {
                    id: s.rightPhoto.id,
                    baseUrl: s.rightPhoto.baseUrl,
                    thumbnailUrl: s.rightPhoto.thumbnailUrl,
                    caption: s.rightPhoto.caption || null,
                    editedImageData: s.rightPhoto.editedImageData || null,
                    editedData: s.rightPhoto.editedData || null
                } : null
            })),
            settings: mdState.settings,
            // Reuse the shared BookPod print settings (same as classic flow)
            bookpodPrint: (state.bookpodPrint && typeof state.bookpodPrint === 'object') ? state.bookpodPrint : null
        };

        updateProgress("Uploading...", "Sending data to server...", 30);
        const idToken = await firebase.auth().currentUser.getIdToken();

        const functionUrl = window.location.hostname === "localhost"
            ? "http://127.0.0.1:5001/shoso-photobook/us-central1/generateMemoryDirectorPdf"
            : "https://us-central1-shoso-photobook.cloudfunctions.net/generateMemoryDirectorPdf";

        const response = await fetch(functionUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${idToken}`
            },
            body: JSON.stringify({ bookData })
        });

        updateProgress("Creating PDF...", "Building your print-ready book...", 60);

        if (!response.ok) {
            const err = await response.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${response.status}`);
        }

        const result = await response.json();

        // Save for optional BookPod printing step
        state.lastGeneratedBookData = bookData;
        state.lastGeneratedPdfDownloadUrl = result?.pdfDownloadUrl || result?.pdfUrl || null;

        updateProgress("Complete!", "Your book is ready!", 100);

        setTimeout(() => {
            hideProgress();

            const showResult = () => showMDPdfResult(result);

            if (result.resolutionWarnings && result.resolutionWarnings.length > 0) {
                showMDResolutionWarnings(result.resolutionWarnings, showResult);
                return;
            }

            showResult();
        }, 500);

    } catch (error) {
        hideProgress();
        console.error("PDF generation error:", error);
        alert("Failed to generate book: " + error.message);
    }
}

function showMDPdfResult(result) {
    // Always surface something (even if backend returned unexpected payload)
    console.log("Memory Director PDF result:", result);

            const pdfUrl = result?.pdfUrl;
            const pdfDownloadUrl = result?.pdfDownloadUrl || result?.pdfUrl;

    if (!pdfUrl) {
        alert("PDF generation finished but no pdfUrl was returned. Check function logs.");
        return;
    }

    const resultModal = document.getElementById("resultModal");
    const resultText = resultModal?.querySelector(".result-content p");
    if (resultText) resultText.textContent = "Your print-ready PDF photo book is ready.";

    const viewLink = document.getElementById("viewPresentationLink");
    if (viewLink) {
        viewLink.href = pdfUrl;
        viewLink.textContent = "View PDF";
    }

    const downloadLink = document.getElementById("downloadPdfLink");
    if (downloadLink) downloadLink.href = pdfDownloadUrl;

    const exportBtn = resultModal?.querySelector("button.btn-accent");
    if (exportBtn) exportBtn.style.display = "none";

    const pdfResult = document.getElementById("pdfResult");
    if (pdfResult) {
        pdfResult.style.display = "block";
        const msg = pdfResult.querySelector("p");
        if (msg) msg.textContent = "PDF ready!";
    }

            // Enable “Send to printing” now that we have a PDF
            const sendBtn = document.getElementById('sendToPrintBtn');
            if (sendBtn) sendBtn.style.display = 'inline-flex';

            document.getElementById("resultModal").classList.add("active");
}

function showMDResolutionWarnings(warnings, onClose) {
    const modal = document.createElement("div");
    modal.className = "md-modal-overlay active";
    modal.id = "resolutionWarningsModal";
    modal.innerHTML = `
        <div class="md-modal-card" style="max-width: 520px; text-align: left;">
            <h2 style="display:flex; align-items:center; gap:10px; margin-bottom: 10px;">
                ${getIcon ? getIcon("eye", 24) : ''} Resolution Notice
            </h2>
            <p style="margin-bottom: 16px; color: #64748b;">
                ${warnings.length} photo(s) are below optimal print quality (300 DPI):
            </p>
            <div style="max-height: 220px; overflow-y: auto; margin-bottom: 18px;">
                ${warnings.map(w => `
                    <div style="padding: 8px 12px; background: #fef3c7; border-radius: 8px; margin-bottom: 8px; font-size: 13px;">
                        <strong>Page ${w.page}</strong>: ${w.dpi} DPI
                    </div>
                `).join("")}
            </div>
            <p style="font-size: 12px; color: #94a3b8; margin-bottom: 18px;">
                For best results, use photos with at least 3000×3000 pixels for a 10×10&quot; book.
                The book will still print, but these photos may not be as sharp.
            </p>
            <button class="btn btn-primary" onclick="window.__mdCloseResolutionWarnings()">
                I Understand
            </button>
        </div>
    `;
    document.body.appendChild(modal);

    window.__mdCloseResolutionWarnings = () => {
        try {
            const el = document.getElementById("resolutionWarningsModal");
            if (el) el.remove();
        } finally {
            if (typeof onClose === "function") onClose();
            window.__mdCloseResolutionWarnings = null;
        }
    };
}

function exitMemoryDirector() {
    mdState.active = false;
    const mdView = document.getElementById("memoryDirectorView");
    if (mdView) mdView.style.display = "none";
    if (typeof showTemplateGallery !== 'undefined') {
        showTemplateGallery();
    } else {
        const gallery = document.getElementById("templateGalleryView");
        if (gallery) gallery.style.display = "block";
    }
}

function openCinematicPreview() {
    const allPhotos = [];
    (mdState.chapters || []).forEach(chapter => {
        const chapterSpreads = (mdState.spreads || []).filter(s => s.chapterId === chapter.id);
        chapterSpreads.forEach(spread => {
            if (spread.leftPhoto) allPhotos.push({ photo: spread.leftPhoto, chapter });
            if (spread.rightPhoto) allPhotos.push({ photo: spread.rightPhoto, chapter });
        });
    });

    if (allPhotos.length === 0) {
        alert("No photos to preview");
        return;
    }

    let currentIndex = 0;

    const overlay = document.createElement("div");
    overlay.className = "cinematic-preview-overlay";
    overlay.innerHTML = `
        <div class="cinematic-close" onclick="this.parentElement.remove()">×</div>
        <div class="cinematic-content">
            <img src="${allPhotos[0].photo.thumbnailUrl || ''}" class="cinematic-image" id="cinematicImage">
            <div class="cinematic-caption" id="cinematicCaption">${escapeHtml(allPhotos[0].photo.caption || "")}</div>
        </div>
        <div class="cinematic-progress">
            ${allPhotos.map((_, i) => `<div class="cinematic-dot ${i === 0 ? "active" : ""}"></div>`).join("")}
        </div>
    `;
    document.body.appendChild(overlay);

    const interval = setInterval(() => {
        currentIndex++;
        if (currentIndex >= allPhotos.length) {
            clearInterval(interval);
            overlay.remove();
            return;
        }

        const img = document.getElementById("cinematicImage");
        const cap = document.getElementById("cinematicCaption");
        if (img) img.src = allPhotos[currentIndex].photo.thumbnailUrl || '';
        if (cap) cap.textContent = allPhotos[currentIndex].photo.caption || "";

        document.querySelectorAll(".cinematic-dot").forEach((dot, i) => {
            dot.classList.toggle("active", i === currentIndex);
        });
    }, 3500);

    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) {
            clearInterval(interval);
            overlay.remove();
        }
    });
}

// ============================================
// Expose Memory Director globals for inline HTML handlers
// ============================================
// NOTE: index.html uses inline onclick/onchange handlers, which only reliably
// see values attached to window (not top-level const/let bindings).
try {
    window.mdState = mdState;
    window.initMemoryDirector = initMemoryDirector;
    window.showMemoryDirectorView = showMemoryDirectorView;
    window.acceptStoryStructure = acceptStoryStructure;
    window.exitMemoryDirector = exitMemoryDirector;
    window.saveMemoryDirectorProject = saveMemoryDirectorProject;
    window.selectMDChapter = selectMDChapter;
    window.addMDChapter = addMDChapter;
    window.addMDSpread = addMDSpread;
    window.openMDPhotoPicker = openMDPhotoPicker;
    window.generateMDCaptions = generateMDCaptions;
    window.generateMDBook = generateMDBook;
    window.openCinematicPreview = openCinematicPreview;
    window.setMDPaperTexture = setMDPaperTexture;
} catch (e) {
    console.warn("Failed to attach Memory Director globals:", e);
}

// ============================================
// THEME & DESIGN FUNCTIONS
// ============================================
// Apply template to the app
function applyTemplate(template) {
    if (!template) return;

    console.log('Applying template:', template.name);

    state.selectedTemplate = template;
    state.currentTheme = template.id;

    // Get root element for CSS variables
    const root = document.documentElement;

    // === Apply Colors ===
    const colors = template.colors || {};
    
    // Primary/Cover color
    const primaryColor = colors.accentColor || colors.coverColor || '#6366f1';
    root.style.setProperty('--color-primary', primaryColor);
    root.style.setProperty('--cover-color', primaryColor);
    
    // Calculate RGB for shadows/glows
    const rgb = hexToRgb(primaryColor);
    if (rgb) {
        root.style.setProperty('--color-primary-rgb', `${rgb.r}, ${rgb.g}, ${rgb.b}`);
    }

    // Lighter/darker variants
    root.style.setProperty('--color-primary-light', lightenColor(primaryColor, 20));
    root.style.setProperty('--color-primary-dark', darkenColor(primaryColor, 15));

    // Page colors
    root.style.setProperty('--page-color', colors.pageBackground || '#fdfbf7');
    root.style.setProperty('--page-text-color', colors.textColor || '#1e293b');

    // Cover text color (based on background darkness)
    const coverTextColor = getContrastingTextColor(primaryColor);
    root.style.setProperty('--cover-text-color', coverTextColor);

    // === Apply Typography ===
    const typography = template.typography || {};
    if (typography.titleFont || typography.headingFont) {
        const titleFont = typography.titleFont || typography.headingFont;
        root.style.setProperty('--font-serif', `'${titleFont}', Georgia, serif`);
    }
    if (typography.bodyFont) {
        root.style.setProperty('--font-sans', `'${typography.bodyFont}', sans-serif`);
    }

    // === Apply to Form Inputs ===
    const coverBgColor = document.getElementById('coverBgColor');
    const coverBgColorText = document.getElementById('coverBgColorText');
    const backCoverBgColor = document.getElementById('backCoverBgColor');
    const backCoverBgColorText = document.getElementById('backCoverBgColorText');
    const coverTitleColor = document.getElementById('coverTitleColor');
    const coverTitleColorText = document.getElementById('coverTitleColorText');
    const backCoverTextColor = document.getElementById('backCoverTextColor');
    const backCoverTextColorText = document.getElementById('backCoverTextColorText');
    
    if (coverBgColor) coverBgColor.value = primaryColor;
    if (coverBgColorText) coverBgColorText.value = primaryColor;
    if (backCoverBgColor) backCoverBgColor.value = primaryColor;
    if (backCoverBgColorText) backCoverBgColorText.value = primaryColor;
    if (coverTitleColor) coverTitleColor.value = coverTextColor;
    if (coverTitleColorText) coverTitleColorText.value = coverTextColor;
    if (backCoverTextColor) backCoverTextColor.value = coverTextColor;
    if (backCoverTextColorText) backCoverTextColorText.value = coverTextColor;

    // Update state cover/backCover colors
    if (state.cover) {
        state.cover.backgroundColor = primaryColor;
        state.cover.titleColor = coverTextColor;
    }
    if (state.backCover) {
        state.backCover.backgroundColor = primaryColor;
        state.backCover.textColor = coverTextColor;
    }

    // Set title font dropdown if it exists
    const coverTitleFont = document.getElementById('coverTitleFont');
    const titleFontValue = typography.titleFont || typography.headingFont || 'Playfair Display';
    
    if (coverTitleFont) {
        const options = coverTitleFont.options;
        for (let i = 0; i < options.length; i++) {
            if (options[i].value === titleFontValue) {
                coverTitleFont.selectedIndex = i;
                break;
            }
        }
    }

    // === Update Template Indicator ===
    const templateIndicator = document.getElementById('selectedTemplateName');
    if (templateIndicator) {
        templateIndicator.textContent = template.name;
        templateIndicator.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${lightenColor(primaryColor, 30)} 100%)`;
        templateIndicator.style.color = coverTextColor;
    }

    // === Store Template Decoration ===
    if (template.decorations?.enabled && template.decorations?.elements?.length > 0) {
        root.style.setProperty('--template-decoration', `"${template.decorations.elements[0]}"`);
    } else {
        root.style.setProperty('--template-decoration', '""');
    }

    // === Apply template to cover state ===
    if (state.cover && template.cover) {
        state.cover.backgroundColor = template.cover.backgroundColor || primaryColor;
        state.cover.titleColor = template.cover.titleColor || coverTextColor;
        state.cover.titleFont = template.cover.titleFont || titleFontValue;
        state.cover.titleSize = template.cover.titleSize || state.cover.titleSize || 36;
    }

    // === Apply template to all existing pages ===
    state.pages.forEach(page => {
        page.backgroundColor = template.colors?.pageBackground || colors.pageBackground;
        page.template = template.id;
        page.templateData = template;
        page.themeColors = template.colors;
        page.themeIllustrations = template.illustrations || null;
        page.themeDecorations = Array.isArray(template.decorations) ?
            template.decorations :
            (template.decorations && Array.isArray(template.decorations.elements) ? template.decorations.elements : []);
    });

    // Apply template styling to the entire editor UI
    applyTemplateToUI(template);

    // Re-render current page
    if (state.pages.length > 0) {
        renderCurrentPage();
    }

    // Update cover preview
    updateCoverPreview();
    updateBackCoverPreview();

    console.log('Template applied:', {
        name: template.name,
        primaryColor,
        coverTextColor,
        pageColor: colors.pageBackground
    });
}

// Apply template styling to the entire editor UI
function applyTemplateToUI(template) {
    if (!template) return;

    const root = document.documentElement;
    const editorView = document.getElementById('editorView');

    // Apply to root for global access
    const colors = template.colors || {};
    const primaryColor = colors.accentColor || colors.coverColor || '#6366f1';
    const pageBackground = colors.pageBackground || '#fdfbf7';
    const textColor = colors.textColor || '#1e293b';
    const borderColor = colors.borderColor || '#e2e8f0';

    // Set CSS custom properties on root
    root.style.setProperty('--template-primary', primaryColor);
    root.style.setProperty('--template-bg', pageBackground);
    root.style.setProperty('--template-text', textColor);
    root.style.setProperty('--template-border', borderColor);

    if (!editorView) return;

    // Apply template colors as CSS custom properties to the editor view
    editorView.style.setProperty('--template-bg', pageBackground);
    editorView.style.setProperty('--template-surface', pageBackground);
    editorView.style.setProperty('--template-primary', primaryColor);
    editorView.style.setProperty('--template-accent', primaryColor);
    editorView.style.setProperty('--template-text', textColor);
    editorView.style.setProperty('--template-text-light', colors.captionColor || '#666666');
    editorView.style.setProperty('--template-border', borderColor);

    // Apply template fonts
    const headingFont = template.typography?.headingFont || template.cover?.titleFont || "'Playfair Display', serif";
    const bodyFont = template.typography?.bodyFont || "'Montserrat', sans-serif";

    editorView.style.setProperty('--template-heading-font', headingFont);
    editorView.style.setProperty('--template-body-font', bodyFont);

    // Apply background color to editor view
    editorView.style.backgroundColor = template.colors.pageBackground || '#FFFFFF';

    // Style the header
    const header = editorView.querySelector('.header');
    if (header) {
        header.style.backgroundColor = template.colors.pageBackground || '#FFFFFF';
        header.style.borderBottomColor = template.colors.borderColor || '#E0E0E0';
        const headerTitle = header.querySelector('h1');
        if (headerTitle) {
            headerTitle.style.color = template.colors.textColor || '#333333';
            headerTitle.style.fontFamily = headingFont;
        }
    }

    // Style the sidebar
    const sidebar = editorView.querySelector('.sidebar');
    if (sidebar) {
        sidebar.style.backgroundColor = template.colors.pageBackground || '#FFFFFF';
        sidebar.style.borderRightColor = template.colors.borderColor || '#E0E0E0';
    }

    // Style tabs
    const tabs = editorView.querySelectorAll('.tab');
    tabs.forEach(tab => {
        if (tab.classList.contains('active')) {
            tab.style.color = template.colors.textColor || '#333333';
            tab.style.borderBottomColor = template.colors.accentColor || '#D4AF37';
        } else {
            tab.style.color = template.colors.captionColor || '#666666';
        }
    });

    // Style buttons
    const buttons = editorView.querySelectorAll('.btn');
    buttons.forEach(btn => {
        if (btn.classList.contains('btn-primary')) {
            btn.style.backgroundColor = template.colors.accentColor || '#D4AF37';
            btn.style.color = template.colors.pageBackground || '#FFFFFF';
            btn.style.borderColor = template.colors.accentColor || '#D4AF37';
        } else if (btn.classList.contains('btn-secondary')) {
            btn.style.borderColor = template.colors.borderColor || '#E0E0E0';
            btn.style.color = template.colors.textColor || '#333333';
            btn.style.backgroundColor = 'transparent';
        }
    });

    // Style input fields (border only - text color must stay dark for readability)
    const inputs = editorView.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.style.borderColor = template.colors.borderColor || '#E0E0E0';
        // Always use dark text for inputs - never use template text color as it might be white
        input.style.color = '#1e293b';
    });

    // Style tab content areas
    const tabContents = editorView.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.color = template.colors.textColor || '#333333';
    });

    // Update page preview background
    // Update page preview background (active page inside the 3D spread if present)
    const pagePreview = document.querySelector('#pagePreview .book3d-page.is-active') || document.getElementById('pagePreview');
    if (pagePreview) {
        pagePreview.style.backgroundColor = template.colors.pageBackground || '#FFFFFF';
    }

    // Style the header template indicator
    const templateIndicator = document.getElementById('selectedTemplateName');
    if (templateIndicator) {
        templateIndicator.textContent = template.name;
        const coverTextColor = getContrastingTextColor(primaryColor);
        templateIndicator.style.background = `linear-gradient(135deg, ${primaryColor} 0%, ${lightenColor(primaryColor, 25)} 100%)`;
        templateIndicator.style.color = coverTextColor;
    }

    // Style active tab with template color
    const activeTabs = editorView.querySelectorAll('.tab.active, .editor-tab.active');
    activeTabs.forEach(tab => {
        tab.style.backgroundColor = primaryColor;
        tab.style.borderColor = primaryColor;
    });

    // Update 3D book spine colors
    const spines = document.querySelectorAll('.book3d-spine, .book3d-cover-spine');
    spines.forEach(spine => {
        spine.style.setProperty('--cover-color', primaryColor);
    });
}

function applyTheme(themeId) {
    // Check if we have a template instead
    if (PHOTO_BOOK_TEMPLATES && PHOTO_BOOK_TEMPLATES[themeId]) {
        applyTemplate(PHOTO_BOOK_TEMPLATES[themeId]);
        return;
    }

    const theme = state.config.THEMES[themeId];
    if (!theme) return;

    state.currentTheme = themeId;

    // Store theme in state for book generation
    state.bookTheme = themeId;

    // Apply theme to album pages (not app UI)
    applyThemeToPages(theme);

    // Update cover with theme colors
    if (state.cover) {
        state.cover.backgroundColor = theme.colors.bg;
        state.cover.titleColor = theme.colors.primary;
        updateCoverPreview();
    }

    // Apply theme to all existing pages
    state.pages.forEach(page => {
        page.backgroundColor = theme.colors.bg;
        page.theme = themeId;
        page.themeColors = theme.colors;
        page.themeIllustrations = theme.illustrations;
        page.themeDecorations = theme.decorations;
    });

    // Re-render current page to show theme
    if (state.pages.length > 0) {
        renderCurrentPage();
    }

    // Update active state in UI
    document.querySelectorAll('.theme-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-theme') === themeId);
    });

    // Update 3D preview
    update3DBookPreview(themeId);
}

function update3DBookPreview(themeId) {
    // Animate 3D preview when theme is selected
    const preview = document.getElementById(`preview-${themeId}`);
    if (preview) {
        preview.style.transform = 'perspective(1000px) rotateY(-15deg) scale(1.05)';
        setTimeout(() => {
            preview.style.transform = 'perspective(1000px) rotateY(0deg) scale(1)';
        }, 500);
    }
}

function applyThemeToPages(theme) {
    // This will be applied when pages are created or re-rendered
    // The theme colors and illustrations will be used in renderCurrentPage()
}

// ============================================
// FIREBASE FUNCTIONS
// ============================================
const functions = firebase.functions();

// For local development, use emulator:
if (window.location.hostname === "localhost") {
    functions.useEmulator("localhost", 5001);
}

async function callFunction(name, data = {}) {
    try {
        const callable = functions.httpsCallable(name);
        const result = await callable(data);
        return result.data;
    } catch (error) {
        console.error(`Error calling function ${name}:`, error);

        // Handle connection refused error specifically
        if (error.message && (error.message.includes('internal') || error.message.includes('network'))) {
            if (window.location.hostname === "localhost") {
                console.warn("It looks like the Firebase emulators might not be running.");
                alert(`Connection Error: Ensure Firebase Emulators are starting by running 'npm run serve' in your terminal.\n\nError details: ${error.message}`);
            }
        }

        throw error;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================
function showStatus(message, type = 'info') {
    console.log(`[${type}] ${message}`);
    const statusEl = document.getElementById('picker-message');
    if (statusEl) {
        statusEl.innerHTML = `<span style="color: ${type === 'error' ? 'red' : type === 'success' ? 'green' : '#555'};">${message}</span>`;
    }
}

function showProgress(message, status = '', progress = 0) {
    document.getElementById('progressText').textContent = message;
    document.getElementById('progressStatus').textContent = status;
    document.getElementById('progressBar').style.width = progress + '%';
    document.getElementById('progressModal').classList.add('active');
}

function updateProgress(message, status = '', progress = 0) {
    if (message) document.getElementById('progressText').textContent = message;
    if (status !== undefined) document.getElementById('progressStatus').textContent = status;
    if (progress !== undefined) document.getElementById('progressBar').style.width = progress + '%';
}

function hideProgress() {
    document.getElementById('progressModal').classList.remove('active');
    document.getElementById('progressBar').style.width = '0%';
    document.getElementById('progressStatus').textContent = '';
}

function showError(message) {
    alert(message);
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ============================================
// AUTHENTICATION
// ============================================
async function signInWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/photospicker.mediaitems.readonly');
        provider.addScope('https://www.googleapis.com/auth/presentations');
        provider.addScope('https://www.googleapis.com/auth/drive');
        await firebase.auth().signInWithPopup(provider);
    } catch (error) {
        console.error('Sign-in error:', error);
        alert('Failed to sign in. Please try again.');
    }
}

async function signOut() {
    try {
        await firebase.auth().signOut();
    } catch (error) {
        console.error('Sign-out error:', error);
    }
}

// ============================================
// INITIALIZATION
// ============================================
async function initialize() {
    try {
        console.log("Initializing app...");

        // Set up auth state listener and require Google sign-in
        firebase.auth().onAuthStateChanged(async (user) => {
            state.user = user;
            if (user) {
                console.log("User signed in:", user.uid);
                // Hide login screen
                document.getElementById('loginScreen').style.display = 'none';

                // Auto-restore last opened saved album on refresh.
                // If the user never saved / never loaded an album before, there is nothing to restore.
                if (!didAutoRestoreLastProject) {
                    didAutoRestoreLastProject = true;
                    const lastId = getLastProjectIdFromStorage();
                    if (lastId) {
                        // Wait briefly for templates to load so we can apply the saved template cleanly.
                        await waitForTemplatesReady(2500);
                        await loadProject(lastId, { suppressErrors: true, closeModal: false });
                        // If that project no longer exists / can't be loaded, fall back to draft.
                        if (!state.activeProjectId) {
                            await tryRestoreDraftIfNeeded();
                        }
                    } else {
                        // No saved project pointer — try restoring an unsaved draft so refresh
                        // doesn't dump the user back to the gallery.
                        await tryRestoreDraftIfNeeded();
                    }
                }
            } else {
                console.log("User not signed in, showing login screen");
                // Show login screen as overlay
                document.getElementById('loginScreen').style.display = 'flex';

                // Don't keep "resume album" pointers across sign-out.
                state.activeProjectId = null;
                state.activeProjectType = null;
                state.activeProjectTitle = null;
                clearActiveProjectFromStorage();
            }
        });

        // Show template gallery if no template selected
        if (!state.selectedTemplate) {
            const galleryView = document.getElementById('templateGalleryView');
            const editorView = document.getElementById('editorView');
            const mdView = document.getElementById('memoryDirectorView');
            if (galleryView) galleryView.style.display = 'block';
            if (editorView) editorView.style.display = 'none';
            if (mdView) mdView.style.display = 'none';
        } else {
            const galleryView = document.getElementById('templateGalleryView');
            const editorView = document.getElementById('editorView');
            const mdView = document.getElementById('memoryDirectorView');
            if (galleryView) galleryView.style.display = 'none';
            if (editorView) editorView.style.display = 'block';
            if (mdView) mdView.style.display = 'none';
            // Apply template styling to editor
            if (typeof applyTemplateToUI !== 'undefined') {
                applyTemplateToUI(state.selectedTemplate);
            }
        }

        // Initialize UI
        updateCoverPreview();
        updateBackCoverPreview();
        initResizableSidebar();
        initAlbumViewSizeControls();
        initPagePreviewZoomControls();

        // Initialize design editor
        if (typeof designEditor !== 'undefined') {
            designEditor.init('designCanvasContainer');
        }

        // Persist an unsaved draft when refreshing / closing the tab.
        // This is intentionally lightweight (no big base64 thumbnails).
        window.addEventListener('beforeunload', () => {
            try {
                persistDraftToStorage('beforeunload');
            } catch {
                // ignore
            }
        });

        console.log("App initialized successfully");
    } catch (error) {
        console.error('Initialization error:', error);
        alert("Error loading app. Please refresh.");
    }
}

// ============================================
// GOOGLE PHOTOS PICKER
// ============================================
async function loadPicker() {
    const btn = document.getElementById('pickerBtn');
    const statusMsg = document.getElementById('picker-message');

    btn.disabled = true;
    btn.innerHTML = '⏳ Creating Session...';
    statusMsg.innerHTML = '';

    try {
        console.log("Requesting Picker Session...");
        const result = await callFunction('createPickerSession');
        console.log("Session Result:", result);

        if (result.status === 'PHOTOS_NOT_ACTIVE') {
            statusMsg.innerHTML = `
        <div style="background:#e8f0fe; padding:15px; border-radius:8px; margin-top:10px; border:1px solid #d2e3fc; box-shadow: 0 2px 6px rgba(0,0,0,0.05);">
          <div style="display:flex; align-items:flex-start; margin-bottom:10px;">
            <span style="font-size:24px; margin-right:10px;">📸</span>
            <div>
              <strong style="color:#1967d2; font-size:16px;">Google Photos Account Needed</strong>
              <p style="margin:5px 0 10px; color:#5f6368; font-size:14px; line-height:1.4;">
                We couldn't access your Google Photos library. It might be empty or not set up yet.
              </p>
            </div>
          </div>
          <div style="text-align:right;">
             <a href="https://photos.google.com" target="_blank" class="btn btn-primary" style="text-decoration:none; display:inline-block; margin-bottom:5px;">Open Google Photos</a>
          </div>
          <p style="margin:5px 0 0; color:#5f6368; font-size:12px; text-align:center;">
            Please log in, upload at least one photo, and then <a href="#" onclick="loadPicker(); return false;">try again</a>.
          </p>
        </div>`;
            btn.disabled = false;
            btn.innerHTML = '🔄 Try Again';
            return;
        }

        if (result.status === 'AUTH_REQUIRED') {
            statusMsg.innerHTML = `
        <div style="background:#fff3cd; padding:10px; border-radius:4px; margin-top:10px; border:1px solid #ffeeba;">
          <strong>Authorization Required</strong><br>
          <a href="${result.authUrl}" target="_blank" class="btn btn-small" style="margin-top:5px; text-decoration:underline;">Click here to Authorize</a>
          <br><small style="color:#666">After authorizing, close that tab and click the button again.</small>
        </div>`;
            btn.disabled = false;
            btn.innerHTML = '🖼️ Open Google Photos Picker';
            return;
        }

        if (result.status === 'SUCCESS') {
            console.log('Opening picker window with URI:', result.pickerUri);
            const pickerWindow = window.open(result.pickerUri, '_blank', 'width=800,height=600');

            if (!pickerWindow || pickerWindow.closed || typeof pickerWindow.closed === 'undefined') {
                // Popup was blocked
                alert('Popup blocked! Please allow popups for this site and try again.');
                btn.disabled = false;
                btn.innerHTML = '🖼️ Open Google Photos Picker';
                return;
            }

            state.sessionId = result.sessionId;
            btn.innerHTML = '🔎 Waiting for you to click "Done"...';
            statusMsg.innerHTML = 'Please select photos in the popup window and click <b>Done</b>.';

            if (state.pollingInterval) clearInterval(state.pollingInterval);
            state.pollingInterval = setInterval(checkSession, 2000);
        } else {
            alert('Error creating session: ' + result.message);
            btn.disabled = false;
            btn.innerHTML = '🖼️ Open Google Photos Picker';
        }

    } catch (e) {
        console.error(e);
        alert("Error: " + e.message);
        btn.disabled = false;
        btn.innerHTML = '🖼️ Open Google Photos Picker';
    }
}

const THUMBNAIL_BATCH_SIZE = 5;

async function checkSession() {
    if (!state.sessionId) return;

    try {
        const result = await callFunction('checkPickerSession', { sessionId: state.sessionId });

        if (result && result.complete) {
            clearInterval(state.pollingInterval);
            state.pollingInterval = null;
            state.sessionId = null;

            if (result.count === 0) {
                document.getElementById('picker-message').innerHTML =
                    '<span style="color:orange;">No photos selected.</span>';
                resetPickerButton();
                return;
            }

            result.photos.forEach(photo => {
                if (!state.selectedPhotos.some(p => p.id === photo.id)) {
                    state.selectedPhotos.push(photo);
                }
            });

            if (state.pendingStartMemoryDirector) {
                // Immediately show a global progress overlay after the picker “Done”
                // so the user sees we're working (thumbnails + story).
                showProgress("Preparing Memory Director...", "Loading your photos...", 5);
            }

            // If user started Memory Director, don't jump into the old editor UI.
            // Stay in the template gallery, load thumbs, then show MD loading + story view.
            if (!state.pendingStartMemoryDirector) {
                updateSelectedPhotosUI();
                switchTab('selected');
            }

            if (result.needsThumbnails) {
                await loadThumbnailsInBatches(result.photos);
            }

            document.getElementById('picker-message').innerHTML =
                `<span style="color:green; font-weight:bold;">✅ Added ${result.count} photos!</span>`;
            resetPickerButton();

            // If user clicked Memory Director before selecting photos, auto-launch now.
            if (state.pendingStartMemoryDirector && state.selectedPhotos.length >= 4) {
                state.pendingStartMemoryDirector = false;
                setTimeout(() => {
                    if (typeof initMemoryDirector !== 'undefined') {
                        initMemoryDirector();
                    }
                }, 0);
            }
        }
        else if (result && result.error) {
            console.error("Polling Error:", result.error);
        }

    } catch (e) {
        console.log("Polling check failed: " + e);
    }
}

async function loadThumbnailsInBatches(photos) {
    const totalPhotos = photos.length;
    let processed = 0;

    const useGlobalProgress = !!state.pendingStartMemoryDirector;
    if (!useGlobalProgress) {
        showThumbnailProgress(0, totalPhotos);
    } else {
        updateProgress("Preparing Memory Director...", `Loading thumbnails... 0/${totalPhotos}`, 10);
    }

    for (let i = 0; i < photos.length; i += THUMBNAIL_BATCH_SIZE) {
        const batch = photos.slice(i, i + THUMBNAIL_BATCH_SIZE);
        const baseUrls = batch.map(p => p.baseUrl);

        try {
            const result = await callFunction('fetchThumbnailBatch', { baseUrls });

            if (result.success && result.thumbnails) {
                result.thumbnails.forEach((thumb, batchIndex) => {
                    const photoIndex = i + batchIndex;
                    const photo = state.selectedPhotos.find(p => p.baseUrl === photos[photoIndex].baseUrl);
                    if (photo && thumb.thumbnailUrl) {
                        photo.thumbnailUrl = thumb.thumbnailUrl;
                    }
                });

                if (!useGlobalProgress) {
                    updateSelectedPhotosUI();
                }
            }

            processed += batch.length;
            if (!useGlobalProgress) {
                showThumbnailProgress(processed, totalPhotos);
            } else {
                const pct = Math.round((processed / totalPhotos) * 25) + 10; // 10%..35%
                updateProgress("Preparing Memory Director...", `Loading thumbnails... ${processed}/${totalPhotos}`, pct);
            }

        } catch (e) {
            console.error("Batch load error:", e);
            processed += batch.length;
            if (!useGlobalProgress) {
                showThumbnailProgress(processed, totalPhotos);
            } else {
                const pct = Math.round((processed / totalPhotos) * 25) + 10;
                updateProgress("Preparing Memory Director...", `Loading thumbnails... ${processed}/${totalPhotos}`, pct);
            }
        }
    }

    if (!useGlobalProgress) {
        hideThumbnailProgress();
    } else {
        updateProgress("Preparing Memory Director...", "Starting story analysis...", 40);
    }
}

function showThumbnailProgress(current, total) {
    const percent = Math.round((current / total) * 100);
    const progressHtml = `
    <div class="thumbnail-progress" style="margin-top:10px;">
      <div style="display:flex; justify-content:space-between; margin-bottom:5px;">
        <span>Loading thumbnails...</span>
        <span>${current}/${total}</span>
      </div>
      <div style="background:#e0e0e0; border-radius:4px; height:8px; overflow:hidden;">
        <div style="background:#4285f4; height:100%; width:${percent}%; transition:width 0.3s;"></div>
      </div>
    </div>
  `;

    let progressEl = document.getElementById('thumbnail-progress');
    if (!progressEl) {
        progressEl = document.createElement('div');
        progressEl.id = 'thumbnail-progress';
        document.getElementById('picker-message').appendChild(progressEl);
    }
    progressEl.innerHTML = progressHtml;
}

function hideThumbnailProgress() {
    const progressEl = document.getElementById('thumbnail-progress');
    if (progressEl) {
        setTimeout(() => {
            progressEl.style.opacity = '0';
            progressEl.style.transition = 'opacity 0.5s';
            setTimeout(() => progressEl.remove(), 500);
        }, 1000);
    }
}

function resetPickerButton() {
    const btn = document.getElementById('pickerBtn');
    btn.innerHTML = '🖼️ Add More Photos';
    btn.disabled = false;
}

// ============================================
// SELECTED PHOTOS UI
// ============================================
const ALBUM_VIEW_SIZE_STORAGE_KEY = 'shoso:albumViewSize';
const ALBUM_VIEW_SIZE_DEFAULT = 120;
const ALBUM_VIEW_SIZE_MIN = 80;
const ALBUM_VIEW_SIZE_MAX = 240;

const PAGE_PREVIEW_ZOOM_STORAGE_KEY = 'shoso:pagePreviewZoom';
const PAGE_PREVIEW_ZOOM_DEFAULT = 100; // %
const PAGE_PREVIEW_ZOOM_MIN = 50; // %
const PAGE_PREVIEW_ZOOM_MAX = 150; // %

function clampNumber(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
}

function getAlbumViewSize() {
    try {
        const raw = localStorage.getItem(ALBUM_VIEW_SIZE_STORAGE_KEY);
        const parsed = parseInt(raw, 10);
        if (!Number.isFinite(parsed)) return ALBUM_VIEW_SIZE_DEFAULT;
        return clampNumber(parsed, ALBUM_VIEW_SIZE_MIN, ALBUM_VIEW_SIZE_MAX);
    } catch (e) {
        return ALBUM_VIEW_SIZE_DEFAULT;
    }
}

function applyAlbumViewSize(size) {
    const clamped = clampNumber(size, ALBUM_VIEW_SIZE_MIN, ALBUM_VIEW_SIZE_MAX);
    document.documentElement.style.setProperty('--album-tile-size', `${clamped}px`);

    // Sync all zoom sliders/labels (sidebar + modal)
    document.querySelectorAll('[data-album-zoom-range]').forEach((el) => {
        const input = /** @type {HTMLInputElement} */ (el);
        if (parseInt(input.value, 10) !== clamped) input.value = String(clamped);
    });

    document.querySelectorAll('[data-album-zoom-label]').forEach((el) => {
        el.textContent = `${clamped}px`;
    });
}

function setAlbumViewSize(size) {
    const clamped = clampNumber(size, ALBUM_VIEW_SIZE_MIN, ALBUM_VIEW_SIZE_MAX);
    try {
        localStorage.setItem(ALBUM_VIEW_SIZE_STORAGE_KEY, String(clamped));
    } catch (e) {
        // ignore (private mode / blocked storage)
    }
    applyAlbumViewSize(clamped);
}

function initAlbumViewSizeControls() {
    const initial = getAlbumViewSize();
    applyAlbumViewSize(initial);

    document.querySelectorAll('[data-album-zoom-range]').forEach((el) => {
        const input = /** @type {HTMLInputElement} */ (el);
        input.min = String(ALBUM_VIEW_SIZE_MIN);
        input.max = String(ALBUM_VIEW_SIZE_MAX);
        input.step = '10';
        input.value = String(initial);
        input.addEventListener('input', () => {
            setAlbumViewSize(parseInt(input.value, 10));
        });
    });

    // Also use event delegation so the zoom keeps working even if the DOM is
    // re-rendered or inputs are replaced (e.g. after restoring a draft).
    if (!window.__shosoZoomDelegationInitialized) {
        window.__shosoZoomDelegationInitialized = true;
        document.addEventListener('input', (e) => {
            const target = /** @type {HTMLElement} */ (e.target);
            if (!target) return;

            if (target.matches && target.matches('[data-album-zoom-range]')) {
                const input = /** @type {HTMLInputElement} */ (target);
                const v = parseInt(String(input.value || ''), 10);
                if (Number.isFinite(v)) setAlbumViewSize(v);
                return;
            }

            if (target.matches && target.matches('[data-page-zoom-range]')) {
                const input = /** @type {HTMLInputElement} */ (target);
                const v = parseInt(String(input.value || ''), 10);
                if (Number.isFinite(v)) setPagePreviewZoomPercent(v);
            }
        }, { passive: true });
    }
}

function getPagePreviewZoomPercent() {
    try {
        const raw = localStorage.getItem(PAGE_PREVIEW_ZOOM_STORAGE_KEY);
        const parsed = parseInt(raw, 10);
        if (!Number.isFinite(parsed)) return PAGE_PREVIEW_ZOOM_DEFAULT;
        return clampNumber(parsed, PAGE_PREVIEW_ZOOM_MIN, PAGE_PREVIEW_ZOOM_MAX);
    } catch (e) {
        return PAGE_PREVIEW_ZOOM_DEFAULT;
    }
}

function applyPagePreviewZoomPercent(percent) {
    const clamped = clampNumber(percent, PAGE_PREVIEW_ZOOM_MIN, PAGE_PREVIEW_ZOOM_MAX);
    const scale = clamped / 100;
    document.documentElement.style.setProperty('--page-preview-zoom', String(scale));

    document.querySelectorAll('[data-page-zoom-range]').forEach((el) => {
        const input = /** @type {HTMLInputElement} */ (el);
        if (parseInt(input.value, 10) !== clamped) input.value = String(clamped);
    });

    document.querySelectorAll('[data-page-zoom-label]').forEach((el) => {
        el.textContent = `${clamped}%`;
    });
}

function setPagePreviewZoomPercent(percent) {
    const clamped = clampNumber(percent, PAGE_PREVIEW_ZOOM_MIN, PAGE_PREVIEW_ZOOM_MAX);
    try {
        localStorage.setItem(PAGE_PREVIEW_ZOOM_STORAGE_KEY, String(clamped));
    } catch (e) {
        // ignore
    }
    applyPagePreviewZoomPercent(clamped);
}

function initPagePreviewZoomControls() {
    const initial = getPagePreviewZoomPercent();
    applyPagePreviewZoomPercent(initial);

    document.querySelectorAll('[data-page-zoom-range]').forEach((el) => {
        const input = /** @type {HTMLInputElement} */ (el);
        input.min = String(PAGE_PREVIEW_ZOOM_MIN);
        input.max = String(PAGE_PREVIEW_ZOOM_MAX);
        input.step = '10';
        input.value = String(initial);
        input.addEventListener('input', () => {
            setPagePreviewZoomPercent(parseInt(input.value, 10));
        });
    });
}

function updateSelectedPhotosUI() {
    const list = document.getElementById('selectedPhotosList');
    const count = document.getElementById('selectedCount');
    const showMoreBtn = document.getElementById('selectedShowMoreBtn');
    count.textContent = state.selectedPhotos.length;

    if (state.selectedPhotos.length === 0) {
        list.innerHTML = '<div class="empty-state">No photos selected</div>';
        if (showMoreBtn) showMoreBtn.style.display = 'none';
        return;
    }

    // Collapsed strip: show a limited number of thumbnails and a “Show more” button.
    const STRIP_MAX = 12;
    const visible = state.selectedPhotos.slice(0, STRIP_MAX);
    const remaining = Math.max(0, state.selectedPhotos.length - visible.length);

    list.innerHTML = visible.map((photo, index) => {
        const thumbUrl = photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:') ? photo.thumbnailUrl : null;
        return `<div class="selected-strip-item" title="Selected photo ${index + 1}" onclick="openSelectedPhotosModal()">
          ${thumbUrl
            ? `<img src="${thumbUrl}" alt="Selected photo ${index + 1}">`
            : `<div class="thumbnail-placeholder">${index + 1}</div>`
          }
        </div>`;
    }).join('');

    if (remaining > 0) {
        list.insertAdjacentHTML('beforeend', `<div class="selected-strip-more" onclick="openSelectedPhotosModal()" title="Show all selected photos">+${remaining}</div>`);
    }

    if (showMoreBtn) {
        showMoreBtn.style.display = remaining > 0 ? 'inline-flex' : 'none';
        showMoreBtn.textContent = `Show more (${state.selectedPhotos.length})`;
    }
}

function removeSelectedPhoto(index) {
    state.selectedPhotos.splice(index, 1);
    updateSelectedPhotosUI();
    renderSelectedPhotosModal();
}

function clearSelectedPhotos() {
    if (confirm('Clear all selected photos?')) {
        state.selectedPhotos = [];
        updateSelectedPhotosUI();
        renderSelectedPhotosModal();
    }
}

function shuffleSelectedPhotos() {
    state.selectedPhotos = state.selectedPhotos.sort(() => Math.random() - 0.5);
    updateSelectedPhotosUI();
    renderSelectedPhotosModal();
}

function openSelectedPhotosModal() {
    const modal = document.getElementById('selectedPhotosModal');
    if (!modal) return;
    renderSelectedPhotosModal();
    modal.classList.add('active');
}

function closeSelectedPhotosModal() {
    const modal = document.getElementById('selectedPhotosModal');
    if (modal) modal.classList.remove('active');
}

function renderSelectedPhotosModal() {
    const grid = document.getElementById('selectedPhotosModalGrid');
    const countEl = document.getElementById('selectedPhotosModalCount');
    if (countEl) countEl.textContent = String(state.selectedPhotos.length);
    if (!grid) return;

    if (!state.selectedPhotos.length) {
        grid.innerHTML = '<div class="empty-state">No photos selected</div>';
        return;
    }

    grid.innerHTML = state.selectedPhotos.map((photo, index) => {
        const thumbUrl = photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:') ? photo.thumbnailUrl : null;
        return `
          <div class="selected-photo-item">
            ${thumbUrl
              ? `<img src="${thumbUrl}" alt="Photo ${index + 1}">`
              : `<div class="thumbnail-placeholder">${index + 1}</div>`
            }
            <button class="remove-btn" onclick="removeSelectedPhoto(${index})" title="Remove">&times;</button>
          </div>
        `;
    }).join('');
}

// Close selected photos modal when clicking outside
document.getElementById('selectedPhotosModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeSelectedPhotosModal();
});

// ============================================
// TABS & NAVIGATION
// ============================================
function switchTab(tabName) {
    document.querySelectorAll('.sidebar .tab').forEach(tab =>
        tab.classList.toggle('active', tab.dataset.tab === tabName)
    );
    document.querySelectorAll('.tab-content').forEach(content =>
        content.classList.toggle('active', content.id === tabName + '-tab')
    );

    // If switching to design tab, ensure canvas is visible
    if (tabName === 'design' && typeof designEditor !== 'undefined') {
        setTimeout(() => {
            if (designEditor.canvas) {
                designEditor.resizeCanvas();
            }
        }, 100);
    }
}

function switchEditorTab(tabName) {
    document.querySelectorAll('.editor-tab').forEach(tab =>
        tab.classList.toggle('active', tab.dataset.editortab === tabName)
    );
    document.querySelectorAll('.editor-content').forEach(content =>
        content.classList.toggle('active', content.id === tabName + '-editor')
    );
}

// ============================================
// COVER EDITOR
// ============================================
function updateCoverPreview() {
    ensure3DCoverPreview('front');
    
    const title = document.getElementById('coverTitle')?.value || 'My Photo Book';
    const titleSize = document.getElementById('coverTitleSize')?.value || 36;
    const titleColor = document.getElementById('coverTitleColor')?.value || '#ffffff';
    const titleFont = document.getElementById('coverTitleFont')?.value || 'Playfair Display';
    const subtitle = document.getElementById('coverSubtitle')?.value || '';
    const subtitleSize = document.getElementById('coverSubtitleSize')?.value || 14;
    const bgColor = document.getElementById('coverBgColor')?.value || '#6366f1';
    const showBorder = document.getElementById('coverShowBorder')?.checked !== false;

    // Update state
    state.cover.title = title;
    state.cover.titleSize = parseInt(titleSize);
    state.cover.titleColor = titleColor;
    state.cover.titleFont = titleFont;
    state.cover.subtitle = subtitle;
    state.cover.subtitleSize = parseInt(subtitleSize) || 14;
    state.cover.backgroundColor = bgColor;
    state.cover.showBorder = showBorder;

    // Update range value displays
    const titleSizeVal = document.getElementById('coverTitleSizeVal');
    if (titleSizeVal) titleSizeVal.textContent = titleSize + 'px';
    
    const subtitleSizeVal = document.getElementById('coverSubtitleSizeVal');
    if (subtitleSizeVal) subtitleSizeVal.textContent = (subtitleSize || 14) + 'px';

    // Update title preview with styling
    const titlePreview = document.getElementById('coverTitlePreview');
    if (titlePreview) {
        titlePreview.textContent = title;
        titlePreview.style.fontSize = titleSize + 'px';
        titlePreview.style.color = titleColor;
        titlePreview.style.fontFamily = `'${titleFont}', serif`;
    }

    // Update subtitle preview
    const subtitlePreview = document.getElementById('coverSubtitlePreview');
    if (subtitlePreview) {
        subtitlePreview.textContent = subtitle;
        subtitlePreview.style.fontSize = (subtitleSize || 14) + 'px';
        subtitlePreview.style.color = titleColor;
        subtitlePreview.style.opacity = '0.85';
    }

    // Update cover background and decorative border color
    const coverPreview = document.getElementById('coverPreview');
    if (coverPreview) {
        sync3DThicknessVars();
        // Update cover color CSS variable for spine
        const root = coverPreview.querySelector('.book3d-cover-root');
        if (root) {
            const coverColor = state?.selectedTemplate?.colors?.accentColor || bgColor || '#2c3e50';
            root.style.setProperty('--cover-color', coverColor);
        }
    }

    // In 3D mode the background belongs to the 3D face (not the outer container),
    // otherwise you get a big diagonal wedge when the face is inset/rotated.
    const coverFace = coverPreview?.querySelector('.book3d-cover-face');
    if (coverFace) {
        coverPreview.style.backgroundColor = 'transparent';
        coverPreview.style.backgroundImage = 'none';
        coverFace.style.backgroundColor = bgColor;
        coverFace.style.backgroundImage = 'none';
        
        // Toggle embossed border
        if (showBorder) {
            coverFace.classList.remove('no-border');
        } else {
            coverFace.classList.add('no-border');
        }
    } else if (coverPreview) {
        coverPreview.style.backgroundColor = bgColor;
        coverPreview.style.backgroundImage = 'none'; // CRITICAL: Clear any texture/gradient
    }
    if (coverPreview) coverPreview.style.color = titleColor; // For the decorative border

    const hasBorder = document.getElementById('coverPhotoBorder').checked;
    if (hasBorder) {
        state.cover.photoBorder = {
            color: document.getElementById('coverBorderColor').value,
            weight: parseInt(document.getElementById('coverBorderWeight').value)
        };

        // Apply border to photo placeholder if photo exists
        const photoSlot = document.getElementById('coverPhotoSlot');
        if (photoSlot && photoSlot.querySelector('img')) {
            photoSlot.style.border = `${state.cover.photoBorder.weight}px solid ${state.cover.photoBorder.color}`;
        }
    } else {
        state.cover.photoBorder = null;
        const photoSlot = document.getElementById('coverPhotoSlot');
        if (photoSlot) {
            photoSlot.style.border = '3px solid rgba(0, 0, 0, 0.1)';
        }
    }
}

function selectCoverPhoto() {
    state.photoPickerCallback = (photo) => {
        state.cover.photo = photo;
        const slot = document.getElementById('coverPhotoSlot');
        const thumbUrl = photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:') ? photo.thumbnailUrl : null;
        slot.innerHTML = thumbUrl
            ? `<img src="${thumbUrl}" alt="Cover photo">`
            : '<div class="thumbnail-placeholder">Cover Photo</div>';
    };
    if (state.selectedPhotos.length > 0) {
        openPhotoPicker();
    } else {
        alert("Please select photos from Google Photos first.");
    }
}

// ============================================
// BACK COVER EDITOR
// ============================================

// Store back cover alignment (add this variable near the top of file or before the function)
let backCoverAlign = 'center';

/**
 * Set back cover text alignment
 */
function setBackCoverAlign(align) {
    backCoverAlign = align;
    state.backCover.textAlign = align;
    
    // Update button states
    document.querySelectorAll('#backcover-editor .btn-alignment, [data-alignment]').forEach(btn => {
        const btnAlign = btn.dataset.alignment;
        btn.classList.toggle('active', btnAlign === align);
    });
    
    updateBackCoverPreview();
}

/**
 * Sync back cover text color inputs
 */
function syncBackCoverTextColor() {
    const text = document.getElementById('backCoverTextColorText');
    const color = document.getElementById('backCoverTextColor');
    if (text && color) {
        color.value = text.value;
        updateBackCoverPreview();
    }
}

/**
 * Sync back cover background color inputs
 */
function syncBackCoverBgColor() {
    const text = document.getElementById('backCoverBgColorText');
    const color = document.getElementById('backCoverBgColor');
    if (text && color) {
        color.value = text.value;
        updateBackCoverPreview();
    }
}

function updateBackCoverPreview() {
    ensure3DCoverPreview('back');
    
    // Get all values from inputs (with fallbacks)
    const text = document.getElementById('backCoverText')?.value || 'Thank you for viewing this photo book';
    const subtitle = document.getElementById('backCoverSubtitle')?.value || '';
    const bgColor = document.getElementById('backCoverBgColor')?.value || state.backCover?.backgroundColor || '#1a1a2e';
    const textColor = document.getElementById('backCoverTextColor')?.value || state.backCover?.textColor || '#ffffff';
    const textSize = document.getElementById('backCoverTextSize')?.value || state.backCover?.textSize || 18;
    const subtitleSize = document.getElementById('backCoverSubtitleSize')?.value || state.backCover?.subtitleSize || 12;
    const textFont = document.getElementById('backCoverTextFont')?.value || state.backCover?.textFont || 'Inter';
    const showBorder = document.getElementById('backCoverShowBorder')?.checked !== false;
    const showLogo = document.getElementById('backCoverShowLogo')?.checked || false;
    const align = backCoverAlign || state.backCover?.textAlign || 'center';

    // Update range value displays
    const textSizeVal = document.getElementById('backCoverTextSizeVal');
    const subtitleSizeVal = document.getElementById('backCoverSubtitleSizeVal');
    if (textSizeVal) textSizeVal.textContent = textSize + 'px';
    if (subtitleSizeVal) subtitleSizeVal.textContent = subtitleSize + 'px';

    // Update state
    state.backCover = {
        ...state.backCover,
        text: text,
        subtitle: subtitle,
        backgroundColor: bgColor,
        textColor: textColor,
        textSize: parseInt(textSize),
        subtitleSize: parseInt(subtitleSize),
        textFont: textFont,
        textAlign: align,
        showBorder: showBorder,
        showLogo: showLogo
    };

    // Update text preview
    const textPreview = document.getElementById('backCoverTextPreview');
    if (textPreview) {
        textPreview.textContent = text;
        textPreview.style.color = textColor;
        textPreview.style.fontSize = textSize + 'px';
        textPreview.style.fontFamily = `'${textFont}', sans-serif`;
        textPreview.style.textAlign = align;
    }

    // Update subtitle preview
    const subtitlePreview = document.getElementById('backCoverSubtitlePreview');
    if (subtitlePreview) {
        subtitlePreview.textContent = subtitle;
        subtitlePreview.style.color = textColor;
        subtitlePreview.style.fontSize = subtitleSize + 'px';
        subtitlePreview.style.opacity = '0.75';
        subtitlePreview.style.textAlign = align;
        subtitlePreview.style.display = subtitle ? 'block' : 'none';
    }

    // Update logo visibility
    const logoPreview = document.getElementById('backCoverLogoPreview');
    if (logoPreview) {
        logoPreview.style.display = showLogo ? 'block' : 'none';
        logoPreview.style.color = textColor;
        logoPreview.style.textAlign = align;
    }

    // Update background
    const el = document.getElementById('backCoverPreview');
    if (el) {
        sync3DThicknessVars();
        
        // Update cover color CSS variable for spine
        const root = el.querySelector('.book3d-cover-root');
        if (root) {
            const coverColor = state?.selectedTemplate?.colors?.accentColor || bgColor || '#2c3e50';
            root.style.setProperty('--cover-color', coverColor);
        }
        
        const face = el.querySelector('.book3d-cover-face');
        if (face) {
            el.style.backgroundColor = 'transparent';
            el.style.backgroundImage = 'none';
            face.style.backgroundColor = bgColor;
            face.style.backgroundImage = 'none';
            
            // Toggle embossed border
            if (showBorder) {
                face.classList.remove('no-border');
            } else {
                face.classList.add('no-border');
            }
        } else {
            el.style.backgroundColor = bgColor;
        }

        // Update inner content alignment
        const inner = el.querySelector('.book3d-cover-inner');
        if (inner) {
            inner.style.textAlign = align;
            inner.style.alignItems = align === 'left' ? 'flex-start' : (align === 'right' ? 'flex-end' : 'center');
        }
    }
}

/**
 * Update back cover UI from state (called on load/restore)
 */
function updateBackCoverFromState() {
    const bc = state.backCover || {};
    
    const setText = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.value = value || '';
    };
    
    const setCheck = (id, value) => {
        const el = document.getElementById(id);
        if (el) el.checked = !!value;
    };

    setText('backCoverText', bc.text || 'Thank you for viewing this photo book');
    setText('backCoverSubtitle', bc.subtitle || '');
    setText('backCoverBgColor', bc.backgroundColor || '#1a1a2e');
    setText('backCoverBgColorText', bc.backgroundColor || '#1a1a2e');
    setText('backCoverTextColor', bc.textColor || '#ffffff');
    setText('backCoverTextColorText', bc.textColor || '#ffffff');
    setText('backCoverTextFont', bc.textFont || 'Inter');
    
    const textSizeEl = document.getElementById('backCoverTextSize');
    if (textSizeEl) textSizeEl.value = bc.textSize || 18;
    
    const subtitleSizeEl = document.getElementById('backCoverSubtitleSize');
    if (subtitleSizeEl) subtitleSizeEl.value = bc.subtitleSize || 12;
    
    setCheck('backCoverShowBorder', bc.showBorder !== false);
    setCheck('backCoverShowLogo', bc.showLogo || false);
    
    backCoverAlign = bc.textAlign || 'center';
    
    // Update alignment buttons
    document.querySelectorAll('#backcover-editor .btn-alignment, [data-alignment]').forEach(btn => {
        const btnAlign = btn.dataset.alignment;
        btn.classList.toggle('active', btnAlign === backCoverAlign);
    });

    updateBackCoverPreview();
}

function getBookThicknessPx() {
    const totalPages = Array.isArray(state.pages) ? state.pages.length : 0;
    const sheets = Math.max(1, Math.ceil(totalPages / 2));
    return Math.max(14, Math.min(64, Math.round(12 + sheets * 1.35)));
}

function sync3DThicknessVars() {
    const px = getBookThicknessPx();
    const pagePreview = document.getElementById('pagePreview');
    if (pagePreview) pagePreview.style.setProperty('--book-thickness', `${px}px`);
    const coverPreview = document.getElementById('coverPreview');
    if (coverPreview) coverPreview.style.setProperty('--book-thickness', `${px}px`);
    const backCoverPreview = document.getElementById('backCoverPreview');
    if (backCoverPreview) backCoverPreview.style.setProperty('--book-thickness', `${px}px`);
}

function ensure3DCoverPreview(which) {
    const isBack = String(which || '').toLowerCase() === 'back';
    const id = isBack ? 'backCoverPreview' : 'coverPreview';
    const preview = document.getElementById(id);
    if (!preview) return;

    preview.classList.add('is-cover-3d');
    preview.style.setProperty('--book-thickness', `${getBookThicknessPx()}px`);

    // Only wrap once
    const root = preview.querySelector(':scope > .book3d-cover-root');
    if (root) {
        // Update cover color if root already exists
        const bgColor = isBack ? state?.backCover?.backgroundColor : state?.cover?.backgroundColor;
        const coverColor = state?.selectedTemplate?.colors?.accentColor || bgColor || '#2c3e50';
        root.style.setProperty('--cover-color', coverColor);
        return;
    }

    const newRoot = document.createElement('div');
    newRoot.className = 'book3d-cover-root' + (isBack ? ' is-back' : ' is-front');
    
    // Set cover color CSS variable
    const bgColor = isBack ? state?.backCover?.backgroundColor : state?.cover?.backgroundColor;
    const coverColor = state?.selectedTemplate?.colors?.accentColor || bgColor || '#2c3e50';
    newRoot.style.setProperty('--cover-color', coverColor);

    const stage = document.createElement('div');
    stage.className = 'book3d-cover-stage';

    const spine = document.createElement('div');
    spine.className = 'book3d-cover-spine';
    const edge = document.createElement('div');
    edge.className = 'book3d-cover-foreedge';
    const bottom = document.createElement('div');
    bottom.className = 'book3d-cover-bottom';

    const face = document.createElement('div');
    face.className = 'book3d-cover-face';

    const inner = document.createElement('div');
    inner.className = 'book3d-cover-inner';

    // Move current children into the 3D face so existing IDs still work
    while (preview.firstChild) inner.appendChild(preview.firstChild);

    face.appendChild(inner);
    stage.appendChild(spine);
    stage.appendChild(edge);
    stage.appendChild(bottom);
    stage.appendChild(face);
    newRoot.appendChild(stage);

    preview.appendChild(newRoot);
}

// ============================================
// PAGE EDITOR
// ============================================
function autoArrange() {
    if (state.selectedPhotos.length === 0) {
        alert('Please select some photos first');
        return;
    }

    // Layout preference UI isn't always present; default to a good-looking mix.
    const layoutPrefEl = document.getElementById('autoLayout');
    const layoutPref = layoutPrefEl ? layoutPrefEl.value : 'mixed';
    const layouts = state.config.LAYOUTS;
    const layoutKeys = Object.keys(layouts);
    state.pages = [];
    let photoIndex = 0;

    while (photoIndex < state.selectedPhotos.length) {
        let layout;
        if (layoutPref === 'random') {
            layout = layoutKeys[Math.floor(Math.random() * layoutKeys.length)];
        } else if (layoutPref === 'mixed') {
            layout = state.pages.length % 2 === 0 ? 'single' : layoutKeys[Math.floor(Math.random() * (layoutKeys.length - 1)) + 1];
        } else {
            layout = layoutPref;
        }

        const slotsNeeded = layouts[layout].slots;
        const pagePhotos = state.selectedPhotos.slice(photoIndex, photoIndex + slotsNeeded);
        // Apply current template or theme to new pages
        const template = state.selectedTemplate;
        const currentTheme = template || (state.config.THEMES[state.currentTheme] || state.config.THEMES['classic']);
        const bgColor = template ? template.colors.pageBackground : currentTheme.colors.bg;

        state.pages.push({
            layout: layout,
            photos: pagePhotos.map(photo => photo ? {
                ...photo,
                alignment: 'center',
                customX: undefined,
                customY: undefined
            } : null),
            backgroundColor: bgColor,
            backgroundImageData: null,
            backgroundImageName: null,
            backgroundImageUrl: null,
            caption: '',
            theme: state.currentTheme || 'classic',
            template: template ? template.id : null,
            templateData: template || null,
            themeColors: template ? template.colors : currentTheme.colors,
            themeIllustrations: template ? template.illustrations : currentTheme.illustrations,
            themeDecorations: template ? (template.decorations?.elements || []) : currentTheme.decorations,
            showPageNumber: true,
            photoBorder: null
        });
        photoIndex += slotsNeeded;
    }

    state.currentPageIndex = 0;
    renderPageThumbnails();
    renderCurrentPage();
    updatePageIndicator();
    switchEditorTab('pages');
}

function addPage() {
    // Apply current template or theme to new page
    const template = state.selectedTemplate;
    const currentTheme = template || (state.config.THEMES[state.currentTheme] || state.config.THEMES['classic']);
    const bgColor = template ? template.colors.pageBackground : currentTheme.colors.bg;

    state.pages.push({
        layout: 'single',
        photos: [],
        backgroundColor: bgColor,
        backgroundImageData: null,
        backgroundImageName: null,
        backgroundImageUrl: null,
        caption: '',
        theme: state.currentTheme || 'classic',
        template: template ? template.id : null,
        templateData: template || null,
        themeColors: template ? template.colors : currentTheme.colors,
        themeIllustrations: template ? template.illustrations : currentTheme.illustrations,
        themeDecorations: template ? (template.decorations?.elements || []) : currentTheme.decorations,
        showPageNumber: true,
        photoBorder: null
    });
    state.currentPageIndex = state.pages.length - 1;
    state.selectedPhotoSlot = null;
    renderPageThumbnails();
    renderCurrentPage();
    updatePageIndicator();
}

function duplicatePage() {
    if (state.pages.length === 0) return;
    const currentPage = state.pages[state.currentPageIndex];
    const duplicate = JSON.parse(JSON.stringify(currentPage));
    state.pages.splice(state.currentPageIndex + 1, 0, duplicate);
    state.currentPageIndex++;
    renderPageThumbnails();
    renderCurrentPage();
    updatePageIndicator();
}

function deletePage() {
    if (state.pages.length === 0) return;
    if (confirm('Delete this page?')) {
        state.pages.splice(state.currentPageIndex, 1);
        if (state.currentPageIndex >= state.pages.length) {
            state.currentPageIndex = Math.max(0, state.pages.length - 1);
        }
        renderPageThumbnails();
        renderCurrentPage();
        updatePageIndicator();
    }
}

function prevPage() {
    // In the book-like preview, we flip by spread (2 pages) to mimic turning a sheet.
    const base = Math.floor((state.currentPageIndex || 0) / 2) * 2;
    const targetBase = base - 2;
    if (targetBase < 0) return;
    animateBookSpreadFlip(-1, targetBase);
}

function nextPage() {
    // In the book-like preview, we flip by spread (2 pages) to mimic turning a sheet.
    const base = Math.floor((state.currentPageIndex || 0) / 2) * 2;
    const targetBase = base + 2;
    if (targetBase > state.pages.length - 1) return;
    animateBookSpreadFlip(1, targetBase);
}

function goToPage(index) {
    state.currentPageIndex = index;
    renderCurrentPage();
    updatePageIndicator();
    highlightCurrentThumbnail();
}

function activatePage(index) {
    const i = Number(index);
    if (!Number.isFinite(i)) return;
    if (i < 0 || i >= state.pages.length) return;
    state.currentPageIndex = i;
    state.selectedPhotoSlot = null;
    renderCurrentPage();
    updatePageIndicator();
    highlightCurrentThumbnail();
}

function renderPageThumbnails() {
    const container = document.getElementById('pageThumbnails');
    if (state.pages.length === 0) {
        container.innerHTML = '';
        return;
    }
    container.innerHTML = state.pages.map((page, index) =>
        `<div class="page-thumbnail ${index === state.currentPageIndex ? 'active' : ''}" onclick="goToPage(${index})">${index + 1}</div>`
    ).join('');
}

function highlightCurrentThumbnail() {
    document.querySelectorAll('.page-thumbnail').forEach((thumb, index) => {
        thumb.classList.toggle('active', index === state.currentPageIndex);
    });
}

function updatePageIndicator() {
    document.getElementById('currentPageNum').textContent = state.pages.length > 0 ? state.currentPageIndex + 1 : 0;
    document.getElementById('totalPages').textContent = state.pages.length;
}

// ============================================
// Template/theme visual preview helpers (HTML/SVG)
// ============================================
function renderTemplateThemeOverlay(themeId, colors) {
    const id = String(themeId || '').toLowerCase();
    const accent = colors?.accent || colors?.accentColor || colors?.secondary || colors?.primary || '#97BC62';
    const secondary = colors?.secondary || colors?.borderColor || colors?.textColor || '#777777';

    // We use SVG overlays so the editor preview matches the PDF generator's visual language.
    // (Background curve, subtle geometry, filmstrip framing, etc.)
    if (id.includes('botanical') || id.includes('nature')) {
        // Organic bottom curve (matches pdf-generator drawThemeBackground botanical branch)
        return `
          <div class="page-theme-overlay" style="position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden;">
            <svg viewBox="0 0 800 600" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%;">
              <path d="M 0 600 L 0 500 Q 200 450 400 500 T 800 520 L 800 600 Z" fill="${accent}" fill-opacity="0.08"></path>
            </svg>
          </div>
        `;
    }

    if (id.includes('modern') || id.includes('geometric')) {
        return `
          <div class="page-theme-overlay" style="position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden;">
            <svg viewBox="0 0 800 600" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%;">
              <polygon points="0,600 800,420 800,600" fill="${accent}" fill-opacity="0.10"></polygon>
              <polygon points="0,0 240,0 0,120" fill="${secondary}" fill-opacity="0.05"></polygon>
            </svg>
          </div>
        `;
    }

    if (id.includes('noir') || id.includes('film')) {
        // Simplified filmstrip vibe (PDF has sprocket holes; we keep it light for DOM preview)
        return `
          <div class="page-theme-overlay" style="position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden;">
            <svg viewBox="0 0 800 600" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%;">
              <rect x="0" y="0" width="44" height="600" fill="#000000" fill-opacity="0.22"></rect>
              <rect x="756" y="0" width="44" height="600" fill="#000000" fill-opacity="0.22"></rect>
              <rect x="0" y="0" width="800" height="28" fill="#000000" fill-opacity="0.18"></rect>
              <rect x="0" y="572" width="800" height="28" fill="#000000" fill-opacity="0.18"></rect>
            </svg>
          </div>
        `;
    }

    if (id.includes('bauhaus')) {
        return `
          <div class="page-theme-overlay" style="position:absolute; inset:0; pointer-events:none; z-index:0; overflow:hidden;">
            <svg viewBox="0 0 800 600" preserveAspectRatio="none" style="position:absolute; inset:0; width:100%; height:100%;">
              <polygon points="0,108 544,0 800,0 0,252" fill="${accent}" fill-opacity="0.10"></polygon>
              <circle cx="656" cy="468" r="108" fill="${secondary}" fill-opacity="0.10"></circle>
              <rect x="64" y="432" width="26" height="26" fill="${secondary}" fill-opacity="0.10"></rect>
              <rect x="128" y="72" width="18" height="18" fill="${accent}" fill-opacity="0.10"></rect>
            </svg>
          </div>
        `;
    }

    return '';
}

function renderDecorationSvg(decoration, color, opacity = 0.15, size = 56) {
    const dec = String(decoration || '');
    const lower = dec.toLowerCase();

    // Leaf-ish decorations (🌿 🍃 🌱 🌾 etc.)
    const isLeaf = dec === '🌿' || dec === '🍃' || dec === '🌱' || dec === '🌾' || lower.includes('leaf') || lower.includes('botanical');
    if (isLeaf) {
        return `
          <svg width="${size}" height="${size}" viewBox="-40 -40 80 80" aria-hidden="true">
            <path d="M 0 40 C 40 40 40 -20 0 -40 C -40 -20 -40 40 0 40 Z" fill="${color}" fill-opacity="${opacity}"></path>
            <path d="M 0 40 L 0 -40" stroke="${color}" stroke-opacity="${opacity}" stroke-width="2" fill="none"></path>
          </svg>
        `;
    }

    if (dec === '◆' || lower.includes('diamond')) {
        return `
          <svg width="${size}" height="${size}" viewBox="-40 -40 80 80" aria-hidden="true">
            <path d="M 0 -40 L 24 0 L 0 40 L -24 0 Z" fill="${color}" fill-opacity="${opacity}"></path>
          </svg>
        `;
    }

    if (dec === '●' || lower.includes('circle')) {
        return `
          <svg width="${size}" height="${size}" viewBox="-40 -40 80 80" aria-hidden="true">
            <circle cx="0" cy="0" r="20" fill="${color}" fill-opacity="${opacity}"></circle>
          </svg>
        `;
    }

    if (dec === '◼' || lower.includes('square')) {
        return `
          <svg width="${size}" height="${size}" viewBox="-40 -40 80 80" aria-hidden="true">
            <rect x="-20" y="-20" width="40" height="40" fill="${color}" fill-opacity="${opacity}"></rect>
          </svg>
        `;
    }

    // Fallback: keep the original text-based decoration
    return `<div style="font-size: 2rem; opacity: ${opacity}; color: ${color};">${escapeHtml(dec)}</div>`;
}

function renderCurrentPage() {
    const preview = document.getElementById('pagePreview');
    if (state.pages.length === 0) {
        preview.innerHTML = '<div class="empty-state">No pages yet. Select photos and click "Auto-Arrange"</div>';
        return;
    }

    // Spread indices (left/right pages visible at once)
    const base = Math.floor((state.currentPageIndex || 0) / 2) * 2;
    const leftIndex = base;
    const rightIndex = base + 1;

    // Thickness scales with number of spreads (sheets)
    const totalPages = state.pages.length;
    const sheets = Math.ceil(totalPages / 2);
    const thicknessPx = Math.max(14, Math.min(64, Math.round(12 + sheets * 1.35)));

    preview.classList.add('is-book-spread');
    preview.style.setProperty('--book-thickness', `${thicknessPx}px`);

    // Get cover color for spine
    const coverColor = state?.selectedTemplate?.colors?.accentColor || 
                       document.getElementById('coverBgColor')?.value || 
                       '#2c3e50';

    const pagesLeft = Math.max(0, totalPages - (base + 2));
    const spreadLabel = `Pages ${leftIndex + 1}${rightIndex < totalPages ? `–${rightIndex + 1}` : ''} · ${pagesLeft} left`;

    preview.innerHTML = `
      <div class="book3d" style="--book-thickness: ${thicknessPx}px; --cover-color: ${coverColor};">
        <div class="book3d-stage">
          <div class="book3d-body">
            <div class="book3d-spine"></div>
            <div class="book3d-foreedge"></div>
            <div class="book3d-bottom"></div>

            <div class="book3d-spread">
              <div class="book3d-page book3d-page-left ${state.currentPageIndex === leftIndex ? 'is-active' : ''}" data-page-index="${leftIndex}"></div>
              <div class="book3d-gutter"></div>
              <div class="book3d-page book3d-page-right ${state.currentPageIndex === rightIndex ? 'is-active' : ''}" data-page-index="${rightIndex}"></div>
            </div>

            <div class="book3d-progress">${escapeHtml(spreadLabel)}</div>
            <div class="book3d-flip-layer" aria-hidden="true"></div>
          </div>
        </div>
      </div>
    `;

    // Render both pages (inactive side is non-interactive preview)
    const leftEl = preview.querySelector(`.book3d-page[data-page-index="${leftIndex}"]`);
    const rightEl = preview.querySelector(`.book3d-page[data-page-index="${rightIndex}"]`);

    if (leftEl) {
        leftEl.innerHTML = renderSinglePageHtml(leftIndex, { isActive: state.currentPageIndex === leftIndex });
        applyBackgroundToPageElement(leftEl, leftIndex);
        if (state.currentPageIndex !== leftIndex) {
            leftEl.insertAdjacentHTML('beforeend', `<button class="book3d-page-activate" type="button" onclick="activatePage(${leftIndex})" aria-label="Edit page ${leftIndex + 1}"></button>`);
        }
    }
    if (rightEl) {
        rightEl.innerHTML = renderSinglePageHtml(rightIndex, { isActive: state.currentPageIndex === rightIndex });
        applyBackgroundToPageElement(rightEl, rightIndex);
        if (rightIndex < totalPages && state.currentPageIndex !== rightIndex) {
            rightEl.insertAdjacentHTML('beforeend', `<button class="book3d-page-activate" type="button" onclick="activatePage(${rightIndex})" aria-label="Edit page ${rightIndex + 1}"></button>`);
        }
    }

    // Setup drag/drop only for the active page slots (inactive pages have draggable=false)
    setupPhotoDragAndDrop();
    updateAlignmentControls();

    // Sync controls to the active page
    const page = state.pages[state.currentPageIndex];
    if (!page) return;
    const template = page.templateData || state.selectedTemplate;
    const theme = template || (page.theme ? state.config.THEMES[page.theme] : null) || state.config.THEMES[state.currentTheme] || state.config.THEMES['classic'];
    const bgColor = page.backgroundColor || (template ? template.colors.pageBackground : theme.colors.bg);

    document.getElementById('pageLayout').value = page.layout;
    document.getElementById('pageBgColor').value = page.backgroundColor || bgColor;
    document.getElementById('pageCaption').value = page.caption || '';
    document.getElementById('showPageNumber').checked = page.showPageNumber;

    const bgStatus = document.getElementById('pageBgImageStatus');
    if (bgStatus) {
        const labelName = page.backgroundImageName ? `: ${page.backgroundImageName}` : '';
        if (page.backgroundImageUrl) {
            bgStatus.textContent = `Background image set${labelName}`;
        } else if (page.backgroundImageData) {
            bgStatus.textContent = `Background image set (not uploaded yet)${labelName}`;
        } else {
            bgStatus.textContent = 'No background image';
        }
    }

    // Per-page template label
    const label = document.getElementById('pageTemplateLabel');
    if (label) {
        const pageTplName = page.templateData?.name || (page.template ? String(page.template) : null);
        const bookTplName = state.selectedTemplate?.name || (state.selectedTemplate?.id ? String(state.selectedTemplate.id) : null);
        label.textContent = pageTplName ? pageTplName : (bookTplName ? `${bookTplName} (book default)` : 'None');
    }

    if (page.photoBorder) {
        document.getElementById('pageBorder').checked = true;
        document.getElementById('pageBorderColor').value = page.photoBorder.color;
        document.getElementById('pageBorderWeight').value = page.photoBorder.weight;
    } else {
        document.getElementById('pageBorder').checked = false;
    }
}

function applyBackgroundToPageElement(el, pageIndex) {
    const page = state.pages?.[pageIndex];
    if (!el || !page) return;
    const template = page.templateData || state.selectedTemplate;
    const theme = template || (page.theme ? state.config.THEMES[page.theme] : null) || state.config.THEMES[state.currentTheme] || state.config.THEMES['classic'];
    const bgColor = page.backgroundColor || (template ? template.colors.pageBackground : theme.colors.bg);
    el.style.backgroundColor = bgColor;
    applyPageBackgroundStyles(el, page, bgColor);
}

function renderSinglePageHtml(pageIndex, opts = {}) {
    const page = state.pages?.[pageIndex];
    const isActive = !!opts.isActive;

    if (!page) {
        return `<div class="empty-state" style="height:100%; display:flex; align-items:center; justify-content:center; padding: 18px;">Blank page</div>`;
    }

    const layoutClass = `layout-${page.layout}`;
    const slots = state.config.LAYOUTS[page.layout]?.slots || 1;

    // Get template or theme for this page
    const template = page.templateData || state.selectedTemplate;
    const theme = template || (page.theme ? state.config.THEMES[page.theme] : null) || state.config.THEMES[state.currentTheme] || state.config.THEMES['classic'];

    let slotsHtml = '';
    for (let i = 0; i < slots; i++) {
        const photo = page.photos[i];
        const hasPhoto = photo && photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:');
        const hasPhotoData = photo && (photo.baseUrl || photo.id);
        const isSelected = isActive && (state.currentPageIndex === pageIndex) && (state.selectedPhotoSlot === i);
        const alignment = photo?.alignment || 'center';
        const objectPos = alignment === 'left' ? '0% 50%' : (alignment === 'right' ? '100% 50%' : '50% 50%');
        const draggable = isActive && hasPhotoData ? 'true' : 'false';
        const replaceClick = (isActive && hasPhotoData)
            ? `onclick="handleReplacePhotoClick(${i}, event)"`
            : '';

        slotsHtml += `
      <div class="layout-slot slot-${i} ${hasPhotoData ? 'has-photo' : ''} ${isSelected ? 'selected' : ''}"
           data-slot-index="${i}"
           draggable="${draggable}"
           ${replaceClick}>
        ${hasPhoto
                ? `<img src="${photo.thumbnailUrl}" alt="" draggable="false" style="object-position:${objectPos};">`
                : (hasPhotoData
                    ? `<div class="thumbnail-placeholder">Photo ${i + 1}</div>`
                    : `<div class="empty-slot" onclick="activatePage(${pageIndex}); selectPhotoForSlot(${i})">Click to add photo</div>`
                )
            }
        <span class="slot-number">${i + 1}</span>
        ${hasPhotoData ? `
          <button class="edit-photo-btn" onclick="activatePage(${pageIndex}); selectPhotoSlot(${i}); event.stopPropagation();" title="Edit photo" aria-label="Edit photo">
            ✏️
          </button>
          <span class="alignment-indicator" title="Alignment: ${alignment}">${alignment === 'left' ? '⬅' : alignment === 'right' ? '➡' : '⬌'}</span>
        ` : ''}
      </div>
    `;
    }

    // Get template/theme decorations (normalize template shape)
    const templateDecorations = template
        ? (Array.isArray(template.decorations) ? template.decorations : (template.decorations?.elements || []))
        : null;
    const decorations = page.themeDecorations || templateDecorations || theme.decorations || [];

    // Templates don't always define illustrations; use preview.pattern as a hint for whether to show decorations.
    const templateIllustrations = template ? { pattern: template.preview?.pattern || 'none' } : null;
    const illustrations = page.themeIllustrations || templateIllustrations || theme.illustrations || {};

    let decorationsHtml = '';
    if (decorations.length > 0 && illustrations.pattern !== 'none') {
        const decorationsColor = template
            ? (template.colors.accentColor || template.colors.textColor || '#333333')
            : (theme.colors.primary || '#333333');
        decorationsHtml = `
          <div class="page-decorations" style="position:absolute; inset:0; pointer-events:none; z-index:1;">
            ${decorations.map((dec, i) => {
                const positions = [
                    { top: '10%', left: '5%', rotate: '0deg' },
                    { top: '10%', right: '5%', rotate: '90deg' },
                    { bottom: '10%', left: '5%', rotate: '-90deg' },
                    { bottom: '10%', right: '5%', rotate: '180deg' }
                ];
                const pos = positions[i % positions.length];
                const svg = renderDecorationSvg(dec, decorationsColor, 0.15, 56);
                return `<div style="position:absolute; ${pos.top ? `top:${pos.top};` : ''} ${pos.left ? `left:${pos.left};` : ''} ${pos.right ? `right:${pos.right};` : ''} ${pos.bottom ? `bottom:${pos.bottom};` : ''} transform: rotate(${pos.rotate}); transform-origin: center; width: 56px; height: 56px;">${svg}</div>`;
            }).join('')}
          </div>
        `;
    }

    // In the 3D book spread preview we keep the surface clean (no big diagonal overlays),
    // so the book geometry reads clearly.
    const themeOverlayHtml = '';

    const gridId = isActive ? 'pageLayoutGrid' : `pageLayoutGrid_${pageIndex}`;
    const captionColor = template ? (template.colors.captionColor || template.colors.textColor || '#333333') : (theme.colors.text || '#333333');

    return `
      ${themeOverlayHtml}
      <div class="layout-grid ${layoutClass}" id="${gridId}" style="position: relative; z-index: 2;">
        ${slotsHtml}
      </div>
      ${decorationsHtml}
      ${page.caption ? `<div class="page-caption" style="color: ${captionColor};">${escapeHtml(page.caption)}</div>` : ''}
    `;
}

let __bookFlipInProgress = false;
function animateBookSpreadFlip(direction, targetBaseIndex) {
    if (__bookFlipInProgress) return;
    if (!state.pages || !state.pages.length) return;

    const preview = document.getElementById('pagePreview');
    const flipLayer = preview?.querySelector('.book3d-flip-layer');
    if (!preview || !flipLayer) {
        // Fallback: no fancy preview, just jump
        state.currentPageIndex = Math.max(0, Math.min(state.pages.length - 1, targetBaseIndex));
        renderCurrentPage();
        updatePageIndicator();
        highlightCurrentThumbnail();
        return;
    }

    const base = Math.floor((state.currentPageIndex || 0) / 2) * 2;
    const totalPages = state.pages.length;

    const isNext = direction > 0;
    const sheetClass = isNext ? 'is-next' : 'is-prev';

    // Determine which page faces should show during the flip
    const currentLeft = base;
    const currentRight = base + 1;
    const targetLeft = targetBaseIndex;
    const targetRight = targetBaseIndex + 1;

    // Next: flip the right-hand page; its back becomes the next left page
    // Prev: flip the left-hand page back; its back becomes the previous right page
    const frontIndex = isNext ? currentRight : currentLeft;
    const backIndex = isNext ? targetLeft : targetRight;

    const frontHtml = renderSinglePageHtml(frontIndex, { isActive: false });
    const backHtml = renderSinglePageHtml(backIndex, { isActive: false });

    // Clear any prior overlay
    flipLayer.innerHTML = '';
    flipLayer.insertAdjacentHTML('beforeend', `
      <div class="book3d-sheet ${sheetClass}">
        <div class="book3d-sheet-face front">${frontHtml}</div>
        <div class="book3d-sheet-face back">${backHtml}</div>
      </div>
    `);

    const sheet = flipLayer.querySelector('.book3d-sheet');
    if (!sheet) return;

    __bookFlipInProgress = true;

    // Ensure backgrounds are applied for the overlay faces
    const frontFace = sheet.querySelector('.book3d-sheet-face.front');
    const backFace = sheet.querySelector('.book3d-sheet-face.back');
    applyBackgroundToPageElement(frontFace, frontIndex);
    applyBackgroundToPageElement(backFace, backIndex);

    // Trigger the flip
    requestAnimationFrame(() => {
        sheet.classList.add('is-flipping');
    });

    const finish = () => {
        sheet.removeEventListener('transitionend', finish);
        flipLayer.innerHTML = '';
        state.currentPageIndex = Math.max(0, Math.min(totalPages - 1, targetBaseIndex));
        state.selectedPhotoSlot = null;
        __bookFlipInProgress = false;
        renderCurrentPage();
        updatePageIndicator();
        highlightCurrentThumbnail();
    };

    sheet.addEventListener('transitionend', finish, { once: true });
    // Safety timeout in case transitionend doesn't fire
    setTimeout(() => { if (__bookFlipInProgress) finish(); }, 900);
}

function openPageTemplatePicker() {
    const modal = document.getElementById('pageTemplateModal');
    if (!modal) return;
    renderPageTemplatePicker();
    modal.classList.add('active');
}

function closePageTemplatePicker() {
    const modal = document.getElementById('pageTemplateModal');
    if (modal) modal.classList.remove('active');
}

function getTemplatesList() {
    const obj = window.PHOTO_BOOK_TEMPLATES || (typeof PHOTO_BOOK_TEMPLATES !== 'undefined' ? PHOTO_BOOK_TEMPLATES : {});
    return Object.values(obj || {}).filter(t => t && t.id && t.name);
}

function renderPageTemplatePicker() {
    const grid = document.getElementById('pageTemplateGrid');
    if (!grid) return;
    const templates = getTemplatesList();

    if (!templates.length) {
        grid.innerHTML = '<div class="empty-state">No templates available.</div>';
        return;
    }

    const page = state.pages?.[state.currentPageIndex];
    const activeId = page?.templateData?.id || null;
    const bookId = state.selectedTemplate?.id || null;

    grid.innerHTML = templates.map(tpl => {
        const coverColor = tpl.preview?.coverColor || tpl.colors?.pageBackground || '#FFFFFF';
        const accentColor = tpl.preview?.accentColor || tpl.colors?.accentColor || tpl.colors?.textColor || '#2C3E50';
        const isActive = activeId ? (tpl.id === activeId) : (tpl.id === bookId);
        return `
          <div class="page-template-card ${isActive ? 'active' : ''}" onclick="applyTemplateToCurrentPage('${tpl.id}')">
            <div class="page-template-preview" style="background:${coverColor};">
              <div class="page-template-mini-book" style="background:${coverColor}; border-color:${accentColor};">
                <div class="page-template-mini-spine" style="background:${accentColor};"></div>
                <div class="page-template-mini-pages" style="background:${coverColor};"></div>
              </div>
            </div>
            <div class="page-template-meta">
              <div class="page-template-name">${escapeHtml(tpl.name)}</div>
              <p class="page-template-desc">${escapeHtml(tpl.description || tpl.category || '')}</p>
            </div>
          </div>
        `;
    }).join('');
}

function normalizeTemplateDecorationsForPreview(template) {
    return Array.isArray(template.decorations)
        ? template.decorations
        : (template.decorations && Array.isArray(template.decorations.elements) ? template.decorations.elements : []);
}

function applyTemplateToCurrentPage(templateId) {
    if (!state.pages || !state.pages.length) return;
    const templatesObj = window.PHOTO_BOOK_TEMPLATES || (typeof PHOTO_BOOK_TEMPLATES !== 'undefined' ? PHOTO_BOOK_TEMPLATES : {});
    const template = templatesObj?.[templateId];
    if (!template) return;

    const page = state.pages[state.currentPageIndex];
    const prevTemplate = page.templateData || null;

    page.template = template.id;
    page.templateData = template;
    page.themeColors = template.colors;
    page.themeIllustrations = template.illustrations || null;
    page.themeDecorations = normalizeTemplateDecorationsForPreview(template);

    // Background color: if user didn't explicitly customize it, follow the template default.
    // We treat "explicit custom" as any color that is not the previous template's pageBackground.
    const prevBg = prevTemplate?.colors?.pageBackground;
    const nextBg = template?.colors?.pageBackground;
    const currentBg = page.backgroundColor;
    const userCustomized = !!(currentBg && prevBg && currentBg.toLowerCase() !== String(prevBg).toLowerCase());
    if (!userCustomized && nextBg) {
        page.backgroundColor = nextBg;
    }

    renderCurrentPage();
    closePageTemplatePicker();
}

function resetPageTemplateToBook() {
    if (!state.pages || !state.pages.length) return;
    const page = state.pages[state.currentPageIndex];
    page.template = null;
    page.templateData = null;

    // Re-derive theme fields from the current book template/theme
    const tpl = state.selectedTemplate;
    if (tpl) {
        page.themeColors = tpl.colors;
        page.themeIllustrations = tpl.illustrations || null;
        page.themeDecorations = normalizeTemplateDecorationsForPreview(tpl);
        // If page bg was just default, keep it aligned
        if (!page.backgroundColor || (tpl.colors?.pageBackground && String(page.backgroundColor).toLowerCase() === String(tpl.colors.pageBackground).toLowerCase())) {
            page.backgroundColor = tpl.colors?.pageBackground || page.backgroundColor;
        }
    }

    renderCurrentPage();
}

// Close template picker when clicking outside
document.getElementById('pageTemplateModal')?.addEventListener('click', function (e) {
    if (e.target === this) closePageTemplatePicker();
});

function updatePageLayout() {
    if (state.pages.length === 0) return;
    state.pages[state.currentPageIndex].layout = document.getElementById('pageLayout').value;
    renderCurrentPage();
}

function updatePageBackground() {
    if (state.pages.length === 0) return;
    const bgColor = document.getElementById('pageBgColor').value;
    state.pages[state.currentPageIndex].backgroundColor = bgColor;

    // Apply to preview immediately
    const pagePreview = document.querySelector('#pagePreview .book3d-page.is-active') || document.getElementById('pagePreview');
    if (pagePreview) {
        pagePreview.style.backgroundColor = bgColor;
        applyPageBackgroundStyles(pagePreview, state.pages[state.currentPageIndex], bgColor);
    }

    // Also update the layout grid background
    const layoutGrid = document.getElementById('pageLayoutGrid');
    if (layoutGrid) {
        if (layoutGrid.parentElement) {
            layoutGrid.parentElement.style.backgroundColor = bgColor;
            applyPageBackgroundStyles(layoutGrid.parentElement, state.pages[state.currentPageIndex], bgColor);
        }
    }

    console.log(`Updated page ${state.currentPageIndex + 1} background to: ${bgColor}`);
}

function triggerPageBackgroundImageUpload() {
    const input = document.getElementById('pageBgImageFile');
    if (input) input.click();
}

function clearPageBackgroundImage() {
    if (state.pages.length === 0) return;
    const page = state.pages[state.currentPageIndex];
    page.backgroundImageData = null;
    page.backgroundImageName = null;
    page.backgroundImageUrl = null;

    const input = document.getElementById('pageBgImageFile');
    if (input) input.value = '';

    renderCurrentPage();
}

async function updatePageBackgroundImage(event) {
    if (state.pages.length === 0) return;
    const file = event?.target?.files?.[0];
    if (!file) return;

    if (!/^image\/(jpeg|png)$/i.test(file.type)) {
        alert('Please choose a JPG or PNG image.');
        event.target.value = '';
        return;
    }

    try {
        const bgStatus = document.getElementById('pageBgImageStatus');
        if (bgStatus) bgStatus.textContent = 'Setting background image...';

        // Compress to keep payload sizes reasonable (avoid 413 errors)
        const dataUrl = await fileToCompressedJpegDataUrl(file, { maxDimension: 2400, quality: 0.9 });

        const page = state.pages[state.currentPageIndex];
        page.backgroundImageData = dataUrl;
        page.backgroundImageName = file.name || null;
        page.backgroundImageUrl = null;

        renderCurrentPage();

        // Upload to Firebase Storage so background survives project saves/loads.
        try {
            const url = await uploadBackgroundImageToStorage(dataUrl, file.name);
            if (url) {
                page.backgroundImageUrl = url;
                page.backgroundImageData = null; // keep state small; URL is persisted
                renderCurrentPage();
            }
        } catch (e2) {
            console.warn('Background image upload failed (keeping local data URL):', e2);
        }
    } catch (e) {
        console.error('Failed to set background image:', e);
        alert('Failed to set background image. Please try a different file.');
    } finally {
        // Allow re-selecting the same file later
        event.target.value = '';
    }
}

function applyPageBackgroundStyles(element, page, fallbackBgColor) {
    if (!element) return;
    const url = page?.backgroundImageUrl;
    const data = page?.backgroundImageData;
    const imageSrc = (typeof url === 'string' && url) ? url : ((typeof data === 'string' && data) ? data : null);
    const hasImage = !!imageSrc;
    if (hasImage) {
        element.style.backgroundColor = fallbackBgColor || element.style.backgroundColor || '#ffffff';
        element.style.backgroundImage = `url("${imageSrc}")`;
        element.style.backgroundSize = 'cover';
        element.style.backgroundPosition = 'center';
        element.style.backgroundRepeat = 'no-repeat';
    } else {
        element.style.backgroundColor = fallbackBgColor || element.style.backgroundColor || '#ffffff';
        element.style.backgroundImage = 'none';
    }
}

async function uploadBackgroundImageToStorage(dataUrl, originalName) {
    // If Storage SDK isn't loaded or user isn't signed in, fall back to keeping data URL in-memory.
    if (typeof firebase === 'undefined' || typeof firebase.storage !== 'function') return null;
    const uid = state.user?.uid;
    if (!uid) return null;

    const safeName = String(originalName || 'background.jpg')
        .replace(/[^\w.\-]+/g, '_')
        .slice(0, 80);
    const path = `users/${uid}/page-backgrounds/${Date.now()}_${safeName.replace(/\.(png|jpe?g)$/i, '')}.jpg`;

    const storage = firebase.storage();
    const ref = storage.ref().child(path);
    const snapshot = await ref.putString(dataUrl, 'data_url', { contentType: 'image/jpeg' });
    return await snapshot.ref.getDownloadURL();
}

async function fileToCompressedJpegDataUrl(file, opts = {}) {
    const maxDimension = Number.isFinite(opts.maxDimension) ? opts.maxDimension : 2400;
    const quality = Number.isFinite(opts.quality) ? opts.quality : 0.9;

    const objectUrl = URL.createObjectURL(file);
    try {
        const img = await new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = () => resolve(i);
            i.onerror = () => reject(new Error('Failed to decode image'));
            i.src = objectUrl;
        });

        const srcW = img.naturalWidth || img.width;
        const srcH = img.naturalHeight || img.height;
        if (!srcW || !srcH) throw new Error('Invalid image dimensions');

        const scale = Math.min(1, maxDimension / Math.max(srcW, srcH));
        const outW = Math.max(1, Math.round(srcW * scale));
        const outH = Math.max(1, Math.round(srcH * scale));

        const canvas = document.createElement('canvas');
        canvas.width = outW;
        canvas.height = outH;
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas unavailable');

        // White background to avoid black transparency when converting PNG->JPG
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, outW, outH);
        ctx.drawImage(img, 0, 0, outW, outH);

        return canvas.toDataURL('image/jpeg', quality);
    } finally {
        URL.revokeObjectURL(objectUrl);
    }
}

function updatePageCaption() {
    if (state.pages.length === 0) return;
    state.pages[state.currentPageIndex].caption = document.getElementById('pageCaption').value;
    renderCurrentPage();
}

function updatePageNumber() {
    if (state.pages.length === 0) return;
    state.pages[state.currentPageIndex].showPageNumber = document.getElementById('showPageNumber').checked;
}

function updatePageBorder() {
    if (state.pages.length === 0) return;
    const hasBorder = document.getElementById('pageBorder').checked;
    if (hasBorder) {
        state.pages[state.currentPageIndex].photoBorder = {
            color: document.getElementById('pageBorderColor').value,
            weight: parseInt(document.getElementById('pageBorderWeight').value)
        };
    } else {
        state.pages[state.currentPageIndex].photoBorder = null;
    }
}

function selectPhotoForSlot(slotIndex) {
    state.photoPickerCallback = (photo) => {
        const page = state.pages[state.currentPageIndex];
        while (page.photos.length <= slotIndex) {
            page.photos.push(null);
        }
        // Initialize photo with alignment and position data
        page.photos[slotIndex] = {
            ...photo,
            alignment: 'center',
            customX: undefined,
            customY: undefined
        };
        state.selectedPhotoSlot = slotIndex;
        renderCurrentPage();
    };
    openPhotoPicker();
}

let currentEditingPhotoIndex = null;
let currentEditingPageIndex = null;

function selectPhotoSlot(slotIndex) {
    // Only select if not currently dragging
    if (document.querySelector('.layout-slot[style*="opacity: 0.5"]')) {
        return; // Don't select if dragging
    }

    const page = state.pages[state.currentPageIndex];
    if (!page) return;

    const photo = page.photos[slotIndex];
    if (photo && (photo.baseUrl || photo.id)) {
        state.selectedPhotoSlot = slotIndex;
        renderCurrentPage();

        // Open design editor with this photo
        openDesignEditor(slotIndex);
    } else {
        // If no photo, open picker
        selectPhotoForSlot(slotIndex);
    }
}

function handleReplacePhotoClick(slotIndex, event) {
    try {
        if (event) event.stopPropagation();
    } catch (e) { /* ignore */ }

    // Don't open picker if the user was dragging.
    if (document.querySelector('.layout-slot[style*="opacity: 0.5"]')) {
        return;
    }

    // Replace is always optional: we only trigger it on an explicit click.
    selectPhotoForSlot(slotIndex);
}

async function openDesignEditor(slotIndex) {
    const page = state.pages[state.currentPageIndex];
    const photo = page.photos[slotIndex];
    if (!photo) {
        alert('No photo selected. Please select a photo from an album page first.');
        return;
    }

    currentEditingPhotoIndex = slotIndex;
    currentEditingPageIndex = state.currentPageIndex;

    // Switch to design tab first
    switchTab('design');

    // Wait for tab to be visible before initializing
    await new Promise(resolve => {
        // Use requestAnimationFrame to ensure DOM is updated
        requestAnimationFrame(() => {
            setTimeout(resolve, 200); // Increased delay to ensure container is visible
        });
    });

    // Initialize design editor if not already done
    if (typeof designEditor !== 'undefined') {
        const container = document.getElementById('designCanvasContainer');
        if (!container) {
            console.error('Design canvas container not found');
            alert('Design editor container not found. Please refresh the page.');
            return;
        }

        // Clear container if canvas already exists
        const existingCanvas = container.querySelector('#designCanvas');
        if (existingCanvas) {
            existingCanvas.remove();
            designEditor.canvas = null;
            designEditor.ctx = null;
        }

        // Initialize or reinitialize
        if (!designEditor.canvas) {
            designEditor.init('designCanvasContainer');
        }

        // Wait a bit more for canvas to be ready
        await new Promise(resolve => setTimeout(resolve, 200));

        // Ensure canvas is visible and properly sized
        if (designEditor.canvas) {
            // Make absolutely sure canvas is visible
            designEditor.canvas.style.display = 'block';
            designEditor.canvas.style.visibility = 'visible';
            designEditor.canvas.style.opacity = '1';
            designEditor.canvas.style.position = 'relative';
            designEditor.canvas.style.zIndex = '1';

            designEditor.resizeCanvas();
            // Force a redraw to ensure canvas is visible
            designEditor.redraw();

            // Verify canvas is in DOM and visible
            const canvasRect = designEditor.canvas.getBoundingClientRect();
            console.log('Canvas position and size:', {
                top: canvasRect.top,
                left: canvasRect.left,
                width: canvasRect.width,
                height: canvasRect.height,
                visible: canvasRect.width > 0 && canvasRect.height > 0
            });
        } else {
            console.error('Canvas not created after initialization');
            alert('Failed to initialize canvas. Please refresh the page.');
            return;
        }

        // Load the photo into the editor
        // Prefer data URLs to avoid CORS issues
        let imageUrl = null;
        if (photo.editedData) {
            // Use edited version if available (data URL)
            imageUrl = photo.editedData;
            console.log('Using edited image data (data URL)');
        } else if (photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:')) {
            // Use thumbnail if it's a data URL
            imageUrl = photo.thumbnailUrl;
            console.log('Using thumbnail URL (data URL)');
        } else if (photo.thumbnailUrl) {
            // If thumbnail is not a data URL, try to use it anyway
            imageUrl = photo.thumbnailUrl;
            console.log('Using thumbnail URL (may have CORS issues)');
        }

        if (!imageUrl) {
            alert('No image available for this photo. Please ensure the photo has been loaded.');
            return;
        }

        try {
            console.log('Loading image into design editor, URL type:', imageUrl.startsWith('data:') ? 'data URL' : 'external URL');
            await designEditor.loadImage(imageUrl);
            console.log('Image loaded successfully, canvas dimensions:', designEditor.canvas.width, 'x', designEditor.canvas.height);

            // Force multiple redraws to ensure visibility
            setTimeout(() => {
                if (designEditor.canvas) {
                    designEditor.redraw();
                    // Make absolutely sure canvas is visible
                    designEditor.canvas.style.display = 'block';
                    designEditor.canvas.style.visibility = 'visible';
                    designEditor.canvas.style.opacity = '1';
                    const container = document.getElementById('designCanvasContainer');
                    if (container) {
                        container.style.display = 'flex';
                        container.style.visibility = 'visible';
                    }
                    console.log('Canvas forced visible, checking dimensions...');
                    const rect = designEditor.canvas.getBoundingClientRect();
                    console.log('Canvas bounding rect:', rect.width, 'x', rect.height);
                }
            }, 200);

            showStatus('Photo loaded in editor. Use filters, text, and painting tools to edit.', 'success');
        } catch (error) {
            console.error('Error loading image:', error);
            alert('Failed to load image for editing: ' + error.message);
        }
    } else {
        alert('Design editor not available. Please refresh the page.');
    }
}

function setPhotoAlignment(alignment) {
    if (state.selectedPhotoSlot === null || state.pages.length === 0) {
        alert('Please select a photo slot first');
        return;
    }
    const page = state.pages[state.currentPageIndex];
    const photo = page.photos[state.selectedPhotoSlot];
    if (!photo) {
        alert('No photo in this slot');
        return;
    }
    photo.alignment = alignment;
    // Clear custom position when alignment is set
    photo.customX = undefined;
    photo.customY = undefined;
    renderCurrentPage();
}

function updateAlignmentControls() {
    const page = state.pages[state.currentPageIndex];
    const photo = state.selectedPhotoSlot !== null && page ? page.photos[state.selectedPhotoSlot] : null;
    const alignment = photo?.alignment || 'center';

    document.querySelectorAll('.btn-alignment').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.alignment === alignment);
    });
}

function setupPhotoDragAndDrop() {
    const slots = document.querySelectorAll('.layout-slot.has-photo');
    const page = state.pages[state.currentPageIndex];
    if (!page) return;

    slots.forEach(slot => {
        const slotIndex = parseInt(slot.dataset.slotIndex);
        const photo = page.photos[slotIndex];
        const hasPhotoData = photo && (photo.baseUrl || photo.id);

        if (!hasPhotoData) return; // Skip slots without photos

        // Simple HTML5 drag and drop - no complex mousedown logic
        slot.addEventListener('dragstart', function (e) {
            // Make photo smaller and semi-transparent while dragging
            this.style.opacity = '0.5';
            this.style.transform = 'scale(0.9)';
            e.dataTransfer.setData('text/plain', slotIndex.toString());
            e.dataTransfer.effectAllowed = 'move';
        });

        slot.addEventListener('dragover', function (e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            // Highlight drop target
            if (!this.classList.contains('drag-over')) {
                this.classList.add('drag-over');
            }
        });

        slot.addEventListener('dragleave', function (e) {
            // Remove highlight when leaving
            this.classList.remove('drag-over');
        });

        slot.addEventListener('drop', function (e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'));
            const targetIndex = parseInt(this.dataset.slotIndex);

            if (sourceIndex !== targetIndex) {
                const page = state.pages[state.currentPageIndex];
                const sourcePhoto = page.photos[sourceIndex];
                const targetPhoto = page.photos[targetIndex];

                // Swap photos
                page.photos[sourceIndex] = targetPhoto;
                page.photos[targetIndex] = sourcePhoto;

                // Clear any custom positions/alignment when swapping
                if (sourcePhoto) {
                    sourcePhoto.customX = undefined;
                    sourcePhoto.customY = undefined;
                }
                if (targetPhoto) {
                    targetPhoto.customX = undefined;
                    targetPhoto.customY = undefined;
                }

                renderCurrentPage();
            }
        });

        slot.addEventListener('dragend', function () {
            // Restore original size and opacity
            this.style.opacity = '1';
            this.style.transform = 'scale(1)';
            // Remove any drag-over classes from other slots
            document.querySelectorAll('.layout-slot.drag-over').forEach(s => {
                s.classList.remove('drag-over');
            });
        });
    });
}

// ============================================
// PHOTO PICKER MODAL
// ============================================
function openPhotoPicker() {
    const modal = document.getElementById('photoPickerModal');
    const grid = document.getElementById('photoPickerGrid');

    if (state.selectedPhotos.length === 0) {
        grid.innerHTML = '<div class="empty-state">No photos selected. Please pick photos from Google Photos first.</div>';
    } else {
        grid.innerHTML = state.selectedPhotos.map((photo, index) => {
            const thumbUrl = photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:') ? photo.thumbnailUrl : null;
            return `<div class="photo-item" onclick="pickPhoto(${index})">
        ${thumbUrl
                    ? `<img src="${thumbUrl}" alt="Photo ${index + 1}">`
                    : `<div class="thumbnail-placeholder">${index + 1}</div>`
                }
      </div>`;
        }).join('');
    }
    modal.classList.add('active');
}

function pickPhoto(index) {
    if (state.photoPickerCallback) {
        state.photoPickerCallback(state.selectedPhotos[index]);
        state.photoPickerCallback = null;
    }
    closePhotoPicker();
}

function closePhotoPicker() {
    document.getElementById('photoPickerModal').classList.remove('active');
}

// Close photo picker when clicking outside
document.getElementById('photoPickerModal').addEventListener('click', function (e) {
    if (e.target === this) {
        closePhotoPicker();
    }
});


// ============================================
// PROJECT SAVE/LOAD
// ============================================
async function saveProject() {
    const defaultName = document.getElementById('bookTitle').value || 'My Photo Book';
    const projectName = prompt('Enter project name:', defaultName);

    if (!projectName) return;

    document.getElementById('bookTitle').value = projectName;

    const projectData = {
        // If we already have a saved album open, overwrite it instead of creating a new one.
        id: state.activeProjectId || undefined,
        projectType: 'classic',
        title: projectName,
        pageFormat: document.getElementById('pageFormat').value,
        cover: state.cover,
        backCover: state.backCover,
        pages: state.pages,
        selectedPhotos: state.selectedPhotos,
        template: state.selectedTemplate ? state.selectedTemplate.id : state.currentTheme,
        currentTheme: state.currentTheme,
        bookpodPrint: readBookpodPrintSettingsFromUI(),
        savedAt: new Date().toISOString()
    };

    console.log("Saving project data:", projectData);
    showProgress('Saving project...');

    try {
        const result = await callFunction('saveProject', { projectData });
        hideProgress();
        if (result.success) {
            // Track + persist the saved album so refresh stays in it.
            state.activeProjectId = result.projectId || state.activeProjectId || projectData.id || null;
            state.activeProjectType = 'classic';
            state.activeProjectTitle = projectName;
            persistActiveProjectToStorage();
            alert(`Project "${projectName}" saved successfully!`);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        hideProgress();
        showError('Failed to save project: ' + error.message);
    }
}

async function saveMemoryDirectorProject() {
    if (!mdState || !mdState.active) {
        alert('Open a Memory Director project first.');
        return;
    }

    const defaultName = mdState.story?.title || 'My Photo Book';
    const projectName = prompt('Enter project name:', defaultName);
    if (!projectName) return;

    // Keep the saved payload small: store only ids/baseUrls for photos.
    const minimalPhoto = (p) => p ? ({
        id: p.id || null,
        baseUrl: p.baseUrl || null,
        caption: p.caption || null,
        editedImageData: p.editedImageData || null,
        editedData: p.editedData || null
    }) : null;

    const memoryDirectorData = {
        story: mdState.story ? {
            title: mdState.story.title || projectName,
            chapters: (mdState.chapters || []).map(ch => ({
                id: ch.id,
                name: ch.name,
                subtitle: ch.subtitle,
                icon: ch.icon,
                color: ch.color,
                photoCount: ch.photoCount || 0
            }))
        } : { title: projectName, chapters: [] },
        spreads: (mdState.spreads || []).map(s => ({
            id: s.id,
            chapterId: s.chapterId,
            spreadNumber: s.spreadNumber,
            leftPhoto: minimalPhoto(s.leftPhoto),
            rightPhoto: minimalPhoto(s.rightPhoto),
        })),
        settings: mdState.settings || {},
        bookpodPrint: {
            ...(state.bookpodPrint || {}),
            finishtype: 'soft',
        },
        selectedPhotos: (state.selectedPhotos || []).map(p => ({ id: p.id, baseUrl: p.baseUrl }))
    };

    const projectData = {
        // If we already have a saved album open, overwrite it instead of creating a new one.
        id: state.activeProjectId || undefined,
        projectType: 'memoryDirector',
        title: projectName,
        savedAt: new Date().toISOString(),
        memoryDirectorData
    };

    showProgress('Saving project...', 'Saving Memory Director project...', 20);
    try {
        const result = await callFunction('saveProject', { projectData });
        hideProgress();
        if (result.success) {
            // Track + persist the saved album so refresh stays in it.
            state.activeProjectId = result.projectId || state.activeProjectId || projectData.id || null;
            state.activeProjectType = 'memoryDirector';
            state.activeProjectTitle = projectName;
            persistActiveProjectToStorage();
            alert(`Project "${projectName}" saved successfully!`);
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        hideProgress();
        showError('Failed to save project: ' + error.message);
    }
}

function showLoadDialog() {
    document.getElementById('loadProjectModal').classList.add('active');
    loadProjectsList();
}

// ============================================
// BOOKPOD ORDER (PREP) - UI ONLY
// ============================================
function showBookpodOrderModal() {
    const modal = document.getElementById('bookpodOrderModal');
    if (!modal) {
        alert('BookPod order modal is missing from index.html');
        return;
    }
    modal.classList.add('active');

    // Try to populate options + fields, then render a preview.
    loadBookpodShippingOptions();
    prefillBookpodShippingFromProfile();
    previewBookpodOrder();
}

function closeBookpodOrderModal() {
    const modal = document.getElementById('bookpodOrderModal');
    if (modal) modal.classList.remove('active');
}

async function loadBookpodShippingOptions() {
    const hint = document.getElementById('bpShipOptionsHint');
    const methodSel = document.getElementById('bpShipMethod');
    if (hint) hint.textContent = 'Loading…';

    // Fallback options (from BookPod CreateOrder docs)
    const fallback = {
        shippingCompanies: [{ id: 6, name: 'HFD' }],
        shippingMethods: [
            { id: 1, name: 'Pickup point delivery' },
            { id: 2, name: 'Home delivery' },
            { id: 3, name: 'Factory self-pickup' }
        ],
        note: 'Prices are not provided by BookPod docs.'
    };

    let options = fallback;
    try {
        const res = await callFunction('bookpodGetShippingOptions');
        if (res && res.success) options = res;
    } catch (e) {
        console.warn('bookpodGetShippingOptions failed, using fallback:', e);
    }

    if (methodSel && options.shippingMethods && Array.isArray(options.shippingMethods)) {
        const current = methodSel.value || '2';
        methodSel.innerHTML = options.shippingMethods.map(m => {
            const id = String(m.id);
            const label = m.name || `Method ${id}`;
            return `<option value="${escapeHtml(id)}">${escapeHtml(label)}</option>`;
        }).join('');
        // Prefer preserving selection; default to "2" if present.
        const hasCurrent = Array.from(methodSel.options).some(o => o.value === current);
        const hasHome = Array.from(methodSel.options).some(o => o.value === '2');
        methodSel.value = hasCurrent ? current : (hasHome ? '2' : methodSel.options[0]?.value);
    }

    if (hint) {
        hint.textContent = options.note || 'Shipping methods loaded.';
    }
}

async function prefillBookpodShippingFromProfile() {
    try {
        const result = await callFunction('getPersonalDetails');
        const pd = (result && result.personalDetails) ? result.personalDetails : {};

        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (el.value && String(el.value).trim()) return; // do not overwrite existing
            el.value = v || '';
        };

        setVal('bpShipName', pd.fullName || state.user?.displayName || '');
        setVal('bpShipEmail', pd.email || state.user?.email || '');
        setVal('bpShipPhone', pd.phone || '');
        setVal('bpShipCountry', pd.country || '');
        setVal('bpShipCity', pd.city || '');
        setVal('bpShipAddress1', pd.address1 || '');
        setVal('bpShipAddress2', pd.address2 || '');
        setVal('bpShipPostalCode', pd.postalCode || '');
    } catch (e) {
        console.warn('Failed to prefill BookPod shipping from profile:', e);
    }
}

function previewBookpodOrder() {
    const el = document.getElementById('bpOrderPreview');
    if (!el) return;

    // Basic book summary (we don't have BookPod "bookId" until we upload + createBook).
    const title = document.getElementById('bookTitle')?.value || state.activeProjectTitle || 'My Photo Book';
    const pageFormat = document.getElementById('pageFormat')?.value || state.pages?.pageFormat || null;
    const contentPages = Array.isArray(state.pages) ? state.pages.filter(p => (p?.photos || []).some(x => x && (x.baseUrl || x.editedImageData))).length : 0;
    const approxTotalPages = contentPages + 2; // cover + back cover (approx)

    const ship = {
        name: document.getElementById('bpShipName')?.value || '',
        email: document.getElementById('bpShipEmail')?.value || '',
        phoneNumber: document.getElementById('bpShipPhone')?.value || '',
        country: document.getElementById('bpShipCountry')?.value || '',
        city: document.getElementById('bpShipCity')?.value || '',
        address1: document.getElementById('bpShipAddress1')?.value || '',
        address2: document.getElementById('bpShipAddress2')?.value || '',
        postalCode: document.getElementById('bpShipPostalCode')?.value || '',
        shippingCompanyId: 6,
        shippingMethod: Number(document.getElementById('bpShipMethod')?.value || 2),
    };

    // Include current BookPod print settings from UI (prep fields)
    const print = (typeof readBookpodPrintSettingsFromUI === 'function') ? readBookpodPrintSettingsFromUI() : (state.bookpodPrint || {});

    const qty = Math.max(1, Number(document.getElementById('bpQuantity')?.value || 1));

    // This is a PREVIEW ONLY. Creating an order requires:
    // - a BookPod bookId (not created yet in the UI flow)
    // - an invoice URL
    // - a total price number that matches your pricing rules
    const preview = {
        mode: 'prep-preview',
        book: {
            title,
            pageFormat,
            approxTotalPages,
            contentPages,
            printSettings: print
        },
        shippingDetails: ship,
        quantity: qty,
        missingForCreateOrder: [
            'BookPod bookId (requires uploading PDFs + createBook)',
            'invoice URL',
            'totalprice (pricing rules + shipping price)',
        ]
    };

    el.textContent = JSON.stringify(preview, null, 2);
}

async function createBookpodOrderPrep() {
    alert('Create order is not enabled yet. This modal currently only previews the order + available shipping methods.');
}

async function loadProjectsList() {
    const list = document.getElementById('projectsList');
    list.innerHTML = '<div class="loading">Loading projects...</div>';

    try {
        const result = await callFunction('listProjects');
        console.log("List projects result:", result);

        if (result.success && result.projects && result.projects.length > 0) {
            list.innerHTML = result.projects.map(project => {
                const date = new Date(project.lastModified).toLocaleDateString();
                return `<div class="project-item" onclick="loadProject('${project.id}')">
          <span>${escapeHtml(project.name)}</span>
          <span style="color: #888; font-size: 0.8rem;">${date}</span>
        </div>`;
            }).join('');
        } else {
            list.innerHTML = '<div class="empty-state">No saved projects found</div>';
        }
    } catch (error) {
        console.error("List projects error:", error);
        const errorMsg = error.message || error.code || 'INTERNAL';
        list.innerHTML = `<div class="empty-state">Failed to load projects: ${errorMsg}</div>`;
    }
}

async function loadProject(projectId, opts = {}) {
    const { suppressErrors = false, closeModal = true } = opts || {};

    if (closeModal) closeLoadModal();
    showProgress('Loading project...', 'Fetching project data...', 10);

    try {
        const result = await callFunction('loadProject', { projectId });
        console.log("Loaded project result:", result);

        if (result.success && result.data) {
            const data = result.data;

            // Memory Director project
            if (data.projectType === 'memoryDirector' || data.memoryDirectorData) {
                state.activeProjectId = projectId;
                state.activeProjectType = 'memoryDirector';
                state.activeProjectTitle = data.title || state.activeProjectTitle || null;
                persistActiveProjectToStorage();
                await loadMemoryDirectorProjectData(data);
                hideProgress();
                return;
            }

            state.activeProjectId = projectId;
            state.activeProjectType = 'classic';
            state.activeProjectTitle = data.title || state.activeProjectTitle || null;
            persistActiveProjectToStorage();

            document.getElementById('bookTitle').value = data.title || 'My Photo Book';
            document.getElementById('pageFormat').value = data.pageFormat || 'square-8x8';
            // Restore BookPod print settings (prep)
            if (data.bookpodPrint && typeof data.bookpodPrint === 'object') {
                state.bookpodPrint = { ...state.bookpodPrint, ...data.bookpodPrint };
                applyBookpodPrintSettingsToUI(state.bookpodPrint);
            } else {
                applyBookpodPrintSettingsToUI(state.bookpodPrint);
            }

            // Restore template if saved
            if (data.template && PHOTO_BOOK_TEMPLATES && PHOTO_BOOK_TEMPLATES[data.template]) {
                state.selectedTemplate = PHOTO_BOOK_TEMPLATES[data.template];
                state.currentTheme = data.template;
                applyTemplate(state.selectedTemplate);
            }

            state.cover = data.cover || state.cover;
            state.backCover = data.backCover || getDefaultClassicBackCoverState();
            
            // Update back cover UI from restored state
            if (typeof updateBackCoverFromState === 'function') {
                updateBackCoverFromState();
            }
            state.pages = data.pages || [];
            // Reset selected photos - we don't strictly need to restore "selectedPhotos" collection
            // as much as we need the photos ON the pages.
            state.selectedPhotos = data.selectedPhotos || [];
            state.currentPageIndex = 0;

            // Apply template to loaded pages if template exists
            if (state.selectedTemplate) {
                state.pages.forEach(page => {
                    // Only overwrite if not explicitly set? For now, re-apply template basics
                    // But checking if background color exists is safer
                    if (!page.backgroundColor) {
                        page.backgroundColor = state.selectedTemplate.colors.pageBackground;
                    }
                    page.template = state.selectedTemplate.id;
                    page.templateData = state.selectedTemplate;
                });
            }

            // Hydrate thumbnails from baseUrls (server returns data URIs so browser can display)
            updateProgress('Restoring photos...', 'Preparing thumbnails…', 38);
            const baseUrls = [];
            const getBaseUrl = (p) => (p && typeof p === 'object') ? normalizeBaseUrl(p.baseUrl || p.fullUrl || p.url || null) : null;
            (state.selectedPhotos || []).forEach(p => {
                const u = getBaseUrl(p);
                if (u) baseUrls.push(u);
            });
            state.pages.forEach(page => {
                (page.photos || []).forEach(p => {
                    const u = getBaseUrl(p);
                    if (u) baseUrls.push(u);
                });
            });
            const coverBaseUrl = getBaseUrl(state.cover?.photo);
            if (coverBaseUrl) baseUrls.push(coverBaseUrl);

            // If we are not authorized, thumbnails will never load and the UI looks "empty".
            // Make this explicit during restore/load.
            if (baseUrls.length > 0) {
                updateProgress('Restoring photos...', 'Checking Google Photos authorization…', 40);
                const authed = await ensureGooglePhotosAuthorizedInteractive('restore your photos', 60000);
                if (!authed) {
                    hideProgress();
                    alert('Google Photos authorization is required to restore your photos. Please complete authorization and try loading the project again.');
                    return;
                }

                try {
                    let map = null;
                    try {
                        map = await fetchThumbnailMapInBatches(baseUrls, {
                            batchSize: 12,
                            onProgress: (done, total) => {
                                // 40%..75% progress range
                                const pct = 40 + Math.round((done / Math.max(1, total)) * 35);
                                updateProgress('Restoring photos...', `Loading thumbnails... (${done}/${total})`, pct);
                            }
                        });
                    } catch (e) {
                        if (isPhotosAuthRequiredError(e)) {
                            updateProgress('Restoring photos...', 'Authorization required — opening Google consent…', 45);
                            await requestGooglePhotosAuthorization('restore your photos');
                            updateProgress('Restoring photos...', 'Waiting for authorization…', 50);
                            const ok = await waitForGooglePhotosAuthorization(baseUrls[0], 60000);
                            if (ok) {
                                map = await fetchThumbnailMapInBatches(baseUrls, {
                                    batchSize: 12,
                                    onProgress: (done, total) => {
                                        const pct = 40 + Math.round((done / Math.max(1, total)) * 35);
                                        updateProgress('Restoring photos...', `Loading thumbnails... (${done}/${total})`, pct);
                                    }
                                });
                            }
                        } else {
                            throw e;
                        }
                    }

                    if (map && map.size > 0) {
                        (state.selectedPhotos || []).forEach(p => {
                            const u = getBaseUrl(p);
                            if (p && u && map.get(u)) {
                                p.baseUrl = u;
                                p.thumbnailUrl = map.get(u);
                            }
                        });
                        state.pages.forEach(page => {
                            (page.photos || []).forEach(p => {
                                const u = getBaseUrl(p);
                                if (p && u && map.get(u)) {
                                    p.baseUrl = u;
                                    p.thumbnailUrl = map.get(u);
                                }
                            });
                        });
                        if (state.cover?.photo && coverBaseUrl && map.get(coverBaseUrl)) {
                            state.cover.photo.baseUrl = coverBaseUrl;
                            state.cover.photo.thumbnailUrl = map.get(coverBaseUrl);
                        }
                    }
                } catch (e) {
                    console.warn("Failed to hydrate thumbnails:", e);
                }
            }

            updateSelectedPhotosUI();
            updateCoverFromState();
            updateBackCoverPreview();
            renderPageThumbnails();
            renderCurrentPage();
            updatePageIndicator();

            // Ensure we are in the classic editor view
            if (typeof showEditorView !== 'undefined') showEditorView();

            hideProgress();
            // alert(`Project "${data.title || 'Untitled'}" loaded successfully!`);
        } else {
            throw new Error(result.error || 'No data returned');
        }
    } catch (error) {
        hideProgress();
        if (!suppressErrors) {
            showError('Failed to load project: ' + error.message);
        } else {
            // If auto-restore fails (deleted/unauthorized), clear the stored pointer.
            console.warn('Silent loadProject failure:', error);
            if (String(projectId) === String(getLastProjectIdFromStorage() || '')) {
                clearActiveProjectFromStorage();
            }
        }
    }
}

async function loadMemoryDirectorProjectData(data) {
    const mdData = data.memoryDirectorData || {};
    updateProgress('Loading project...', 'Restoring Memory Director project...', 25);

    // Restore selected photos pool for MD picker
    state.selectedPhotos = (mdData.selectedPhotos || []).map(p => ({
        id: p.id,
        baseUrl: p.baseUrl,
        thumbnailUrl: null
    }));

    // Restore MD state
    mdState.active = true;
    mdState.settings = mdData.settings || mdState.settings;
    // Restore BookPod print settings (prep)
    if (mdData.bookpodPrint && typeof mdData.bookpodPrint === 'object') {
        state.bookpodPrint = { ...state.bookpodPrint, ...mdData.bookpodPrint };
    }
    mdState.story = mdData.story || { title: data.title || 'My Photo Book', chapters: [] };
    mdState.chapters = (mdState.story?.chapters || []).map(ch => ({ ...ch, photos: [] }));
    mdState.spreads = (mdData.spreads || []).map(s => ({
        id: s.id,
        chapterId: s.chapterId,
        spreadNumber: s.spreadNumber || 1,
        leftPhoto: s.leftPhoto ? { ...s.leftPhoto } : null,
        rightPhoto: s.rightPhoto ? { ...s.rightPhoto } : null
    }));

    mdState.activeChapterId = mdState.chapters[0]?.id || null;

    // Hydrate thumbnails for selectedPhotos pool + spread photos
    const allBaseUrls = [];
    const getBaseUrl = (p) => (p && typeof p === 'object') ? normalizeBaseUrl(p.baseUrl || p.fullUrl || p.url || null) : null;
    (state.selectedPhotos || []).forEach(p => {
        const u = getBaseUrl(p);
        if (u) allBaseUrls.push(u);
    });
    mdState.spreads.forEach(s => {
        const l = getBaseUrl(s.leftPhoto);
        const r = getBaseUrl(s.rightPhoto);
        if (l) allBaseUrls.push(l);
        if (r) allBaseUrls.push(r);
    });

    if (allBaseUrls.length > 0) {
        updateProgress('Loading project...', 'Checking Google Photos authorization…', 42);
        const authed = await ensureGooglePhotosAuthorizedInteractive('restore your photos', 60000);
        if (!authed) {
            hideProgress();
            alert('Google Photos authorization is required to restore your photos. Please complete authorization and try loading the project again.');
            return;
        }

        updateProgress('Loading project...', 'Loading thumbnails...', 45);
        try {
            let map = null;
            try {
                map = await fetchThumbnailMapInBatches(allBaseUrls, {
                    batchSize: 12,
                    onProgress: (done, total) => {
                        const pct = 45 + Math.round((done / Math.max(1, total)) * 30);
                        updateProgress('Loading project...', `Loading thumbnails... (${done}/${total})`, pct);
                    }
                });
            } catch (e) {
                if (isPhotosAuthRequiredError(e)) {
                    updateProgress('Loading project...', 'Authorization required — opening Google consent…', 50);
                    await requestGooglePhotosAuthorization('restore your photos');
                    updateProgress('Loading project...', 'Waiting for authorization…', 55);
                    const ok = await waitForGooglePhotosAuthorization(allBaseUrls[0], 60000);
                    if (ok) {
                        map = await fetchThumbnailMapInBatches(allBaseUrls, {
                            batchSize: 12,
                            onProgress: (done, total) => {
                                const pct = 45 + Math.round((done / Math.max(1, total)) * 30);
                                updateProgress('Loading project...', `Loading thumbnails... (${done}/${total})`, pct);
                            }
                        });
                    }
                } else {
                    throw e;
                }
            }
            if (map && map.size > 0) {
                state.selectedPhotos.forEach(p => {
                    const u = getBaseUrl(p);
                    if (p && u && map.get(u)) {
                        p.baseUrl = u;
                        p.thumbnailUrl = map.get(u);
                    }
                });
                mdState.spreads.forEach(s => {
                    const l = getBaseUrl(s.leftPhoto);
                    const r = getBaseUrl(s.rightPhoto);
                    if (s.leftPhoto && l && map.get(l)) {
                        s.leftPhoto.baseUrl = l;
                        s.leftPhoto.thumbnailUrl = map.get(l);
                    }
                    if (s.rightPhoto && r && map.get(r)) {
                        s.rightPhoto.baseUrl = r;
                        s.rightPhoto.thumbnailUrl = map.get(r);
                    }
                });
            }
        } catch (e) {
            console.warn("Failed to hydrate MD thumbnails:", e);
        }
    }

    updateProgress('Loading project...', 'Opening Memory Director...', 85);
    showMemoryDirectorView();
}

function updateCoverFromState() {
    document.getElementById('coverTitle').value = state.cover.title || 'My Photo Book';
    document.getElementById('coverTitleSize').value = state.cover.titleSize || 36;
    document.getElementById('coverTitleSizeVal').textContent = (state.cover.titleSize || 36) + 'px';
    document.getElementById('coverTitleColor').value = state.cover.titleColor || '#ffffff';
    document.getElementById('coverTitleFont').value = state.cover.titleFont || 'Playfair Display';
    
    const subtitleEl = document.getElementById('coverSubtitle');
    if (subtitleEl) subtitleEl.value = state.cover.subtitle || '';
    
    const subtitleSizeEl = document.getElementById('coverSubtitleSize');
    if (subtitleSizeEl) subtitleSizeEl.value = state.cover.subtitleSize || 14;
    
    const subtitleSizeValEl = document.getElementById('coverSubtitleSizeVal');
    if (subtitleSizeValEl) subtitleSizeValEl.textContent = (state.cover.subtitleSize || 14) + 'px';
    
    const showBorderEl = document.getElementById('coverShowBorder');
    if (showBorderEl) showBorderEl.checked = state.cover.showBorder !== false;
    document.getElementById('coverSubtitle').value = state.cover.subtitle || '';
    document.getElementById('coverBgColor').value = state.cover.backgroundColor || '#1a1a2e';

    if (state.cover.photoBorder) {
        document.getElementById('coverPhotoBorder').checked = true;
        document.getElementById('coverBorderColor').value = state.cover.photoBorder.color || '#000000';
        document.getElementById('coverBorderWeight').value = state.cover.photoBorder.weight || 2;
    } else {
        document.getElementById('coverPhotoBorder').checked = false;
    }

    updateCoverPreview();

    const slot = document.getElementById('coverPhotoSlot');
    if (state.cover.photo && state.cover.photo.thumbnailUrl) {
        slot.innerHTML = `<img src="${state.cover.photo.thumbnailUrl}" alt="Cover photo">`;
    } else {
        slot.innerHTML = '<span>Click to add cover photo</span>';
    }
}

function closeLoadModal() {
    document.getElementById('loadProjectModal').classList.remove('active');
}

// ============================================
// PROFILE (SAVED ALBUMS + PAYMENTS PREP)
// ============================================

function switchProfileTab(tab) {
    document.querySelectorAll('.profile-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.profiletab === tab);
    });
    document.querySelectorAll('.profile-tab-content').forEach(el => {
        el.classList.toggle('active', el.id === `profile-${tab}-tab`);
    });
}

async function showProfileModal(tab = 'albums') {
    const modal = document.getElementById('profileModal');
    if (!modal) return;

    // If user isn't signed in yet, show login overlay (auth listener handles it)
    if (!state.user) {
        alert('Please sign in first.');
        return;
    }

    // Fill identity
    const avatar = document.getElementById('profileAvatar');
    const nameEl = document.getElementById('profileName');
    const emailEl = document.getElementById('profileEmail');

    const displayName = state.user.displayName || 'Signed in';
    const email = state.user.email || '';

    if (nameEl) nameEl.textContent = displayName;
    if (emailEl) emailEl.textContent = email;
    if (avatar) {
        if (state.user.photoURL) {
            avatar.src = state.user.photoURL;
            avatar.style.display = 'block';
        } else {
            avatar.removeAttribute('src');
            avatar.style.display = 'block';
        }
    }

    modal.classList.add('active');
    switchProfileTab(tab);

    // Load data
    await refreshProfileAlbums();
    await loadPersonalDetails();
    await refreshPurchases();
}

function closeProfileModal() {
    const modal = document.getElementById('profileModal');
    if (modal) modal.classList.remove('active');
}

async function refreshProfileAlbums() {
    const list = document.getElementById('profileAlbumsList');
    if (!list) return;
    list.innerHTML = '<div class="loading">Loading albums...</div>';

    try {
        const result = await callFunction('listProjects');
        if (result.success && result.projects && result.projects.length > 0) {
            list.innerHTML = result.projects.map(project => {
                const date = new Date(project.lastModified).toLocaleDateString();
                return `
                    <div class="project-item" onclick="openAlbumFromProfile('${project.id}')">
                        <div>
                            <div style="font-weight:600;">${escapeHtml(project.name)}</div>
                            <div style="color: var(--color-text-light); font-size: 0.85rem;">${date}</div>
                        </div>
                        <div class="project-actions" onclick="event.stopPropagation()">
                            <button class="btn btn-small btn-secondary" onclick="openAlbumFromProfile('${project.id}')">Open</button>
                            <button class="btn btn-small" style="border-color: var(--color-danger); color: var(--color-danger);" onclick="deleteAlbumFromProfile('${project.id}')">Delete</button>
                        </div>
                    </div>
                `;
            }).join('');
        } else {
            list.innerHTML = '<div class="empty-state">No saved albums found</div>';
        }
    } catch (error) {
        const errorMsg = error.message || error.code || 'INTERNAL';
        list.innerHTML = `<div class="empty-state">Failed to load albums: ${escapeHtml(errorMsg)}</div>`;
    }
}

function openAlbumFromProfile(projectId) {
    closeProfileModal();
    loadProject(projectId);
}

async function deleteAlbumFromProfile(projectId) {
    const ok = confirm('Delete this album? This cannot be undone.');
    if (!ok) return;

    try {
        await callFunction('deleteProject', { projectId });
        if (state.activeProjectId && String(state.activeProjectId) === String(projectId)) {
            state.activeProjectId = null;
            state.activeProjectType = null;
            state.activeProjectTitle = null;
            clearActiveProjectFromStorage();
        }
        await refreshProfileAlbums();
    } catch (e) {
        alert('Failed to delete album: ' + (e.message || 'Unknown error'));
    }
}

async function loadPersonalDetails() {
    try {
        const result = await callFunction('getPersonalDetails');
        const pd = (result && result.personalDetails) ? result.personalDetails : {};

        // Pre-fill from Firebase Auth if missing
        const defaultEmail = state.user?.email || '';

        const setVal = (id, v) => {
            const el = document.getElementById(id);
            if (el) el.value = v || '';
        };

        setVal('pdFullName', pd.fullName || state.user?.displayName || '');
        setVal('pdEmail', pd.email || defaultEmail);
        setVal('pdPhone', pd.phone || '');
        setVal('pdCountry', pd.country || '');
        setVal('pdCity', pd.city || '');
        setVal('pdAddress1', pd.address1 || '');
        setVal('pdAddress2', pd.address2 || '');
        setVal('pdPostalCode', pd.postalCode || '');
        setVal('pdCompany', pd.company || '');
        setVal('pdVatNumber', pd.vatNumber || '');
    } catch (e) {
        console.warn('Failed to load personal details:', e);
    }
}

async function savePersonalDetails() {
    const getVal = (id) => {
        const el = document.getElementById(id);
        return el ? el.value : '';
    };

    const personalDetails = {
        fullName: getVal('pdFullName'),
        email: getVal('pdEmail'),
        phone: getVal('pdPhone'),
        country: getVal('pdCountry'),
        city: getVal('pdCity'),
        address1: getVal('pdAddress1'),
        address2: getVal('pdAddress2'),
        postalCode: getVal('pdPostalCode'),
        company: getVal('pdCompany'),
        vatNumber: getVal('pdVatNumber'),
    };

    try {
        await callFunction('updatePersonalDetails', { personalDetails });
        alert('Personal details saved.');
    } catch (e) {
        alert('Failed to save personal details: ' + (e.message || 'Unknown error'));
    }
}

async function refreshPurchases() {
    const list = document.getElementById('profilePurchasesList');
    if (!list) return;
    list.innerHTML = '<div class="loading">Loading purchases...</div>';

    try {
        const result = await callFunction('listPurchases', { limit: 25 });
        const purchases = (result && result.purchases) ? result.purchases : [];

        if (!purchases.length) {
            list.innerHTML = '<div class="empty-state">No purchases yet</div>';
            return;
        }

        list.innerHTML = purchases.map(p => {
            const title = p.projectTitle || p.description || 'Purchase';
            const when = p.createdAt ? new Date(p.createdAt).toLocaleString() : '';
            const amount = (typeof p.amount === 'number' && p.currency)
                ? `${(p.amount / 100).toFixed(2)} ${String(p.currency).toUpperCase()}`
                : '';
            const subtitle = [when, amount, p.provider ? `via ${p.provider}` : null].filter(Boolean).join(' • ');

            return `
                <div class="purchase-item">
                    <div class="purchase-meta">
                        <div>
                            <div class="purchase-title">${escapeHtml(title)}</div>
                            <div class="purchase-subtitle">${escapeHtml(subtitle)}</div>
                        </div>
                        <div class="purchase-badge">${escapeHtml(p.status || 'unknown')}</div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (e) {
        const msg = e.message || e.code || 'INTERNAL';
        list.innerHTML = `<div class="empty-state">Failed to load purchases: ${escapeHtml(msg)}</div>`;
    }
}

async function createTestPurchaseDraft() {
    try {
        const projectTitle = document.getElementById('bookTitle')?.value || 'My Photo Book';
        const draft = {
            provider: 'manual',
            currency: 'usd',
            amount: 1999,
            description: 'Test purchase (draft)',
            projectTitle,
            meta: {
                pageFormat: document.getElementById('pageFormat')?.value || null,
                pages: Array.isArray(state.pages) ? state.pages.length : null,
            }
        };
        await callFunction('createPurchaseDraft', { draft });
        await refreshPurchases();
        alert('Test purchase created.');
    } catch (e) {
        alert('Failed to create test purchase: ' + (e.message || 'Unknown error'));
    }
}

// Close profile modal when clicking outside
document.getElementById('profileModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeProfileModal();
});

// ============================================
// BOOK GENERATION
// ============================================
function collectBookData() {
    // IMPORTANT: avoid sending base64 thumbnails to backend (413 payload too large)
    const sanitizePhotoForUpload = (photo) => {
        if (!photo) return null;
        return {
            id: photo.id,
            baseUrl: photo.baseUrl,
            // Keep high-quality edits if user edited the image
            editedImageData: photo.editedImageData || null,
            editedData: photo.editedData || null,
            // Keep per-photo placement metadata used by PDF generator
            alignment: photo.alignment || 'center',
            customX: photo.customX,
            customY: photo.customY,
            caption: photo.caption || null
        };
    };

    // Get cover photo - make sure it's a separate object, not referenced from pages
    let coverPhoto = null;
    if (state.cover.photo) {
        coverPhoto = sanitizePhotoForUpload(state.cover.photo);
    }

    // Include template data in book data
    const templateData = state.selectedTemplate || null;

    // Filter out cover photo from all pages to prevent duplication
    const filteredPages = state.pages.map(page => {
        if (!page.photos) return page;

        // Remove cover photo if it somehow got into page photos
        const coverPhotoId = state.cover.photo?.id;
        const filteredPhotos = page.photos.filter(photo => {
            if (!photo) return false;
            // Exclude if it's the cover photo
            if (coverPhotoId && photo.id === coverPhotoId) {
                console.log('Removing cover photo from page photos');
                return false;
            }
            return true;
        });

        return {
            ...page,
            // Replace with minimal photo data to prevent huge payloads
            photos: filteredPhotos.map(sanitizePhotoForUpload).filter(Boolean)
        };
    });

    // Get current template or theme
    const template = state.selectedTemplate;
    const currentTheme = template || (state.config.THEMES[state.currentTheme] || state.config.THEMES['classic']);

    return {
        title: state.cover.title || document.getElementById('bookTitle').value || 'My Photo Book',
        pageFormat: document.getElementById('pageFormat').value || 'square-8x8',
        coverPhoto: coverPhoto,
        coverBackground: state.cover.backgroundColor || (template ? template.cover.backgroundColor : currentTheme.colors.bg),
        coverTextColor: state.cover.titleColor || (template ? template.cover.titleColor : currentTheme.colors.primary),
        coverTitleSize: state.cover.titleSize || (template ? template.cover.titleSize : 36),
        coverTitleFont: state.cover.titleFont || (template ? template.cover.titleFont : 'Playfair Display'),
        coverSubtitle: state.cover.subtitle || '',
        coverSubtitleSize: state.cover.subtitleSize || 14,
        coverShowBorder: state.cover.showBorder !== false,
        
        // Enhanced back cover data with full parity
        backCover: {
            text: state.backCover.text || 'Thank you for viewing this photo book',
            subtitle: state.backCover.subtitle || '',
            backgroundColor: state.backCover.backgroundColor || state.cover.backgroundColor,
            textColor: state.backCover.textColor || state.cover.titleColor,
            textSize: state.backCover.textSize || 18,
            subtitleSize: state.backCover.subtitleSize || 12,
            textFont: state.backCover.textFont || 'Inter',
            textAlign: state.backCover.textAlign || 'center',
            showBorder: state.backCover.showBorder !== false,
            showLogo: state.backCover.showLogo || false
        },
        
        theme: state.currentTheme || 'classic',
        template: templateData ? templateData.id : (state.currentTheme || null),
        templateData: templateData || null,
        themeData: templateData ? null : currentTheme,
        // BookPod options (prep): included so the backend can later send to BookPod
        bookpodPrint: readBookpodPrintSettingsFromUI(),
        // BookPod shipping/order draft (optional; collected during "Generate Book")
        bookpodOrderDraft: (state.bookpodOrderDraft && typeof state.bookpodOrderDraft === 'object') ? state.bookpodOrderDraft : null,
        pages: filteredPages
    };
}

// ============================================
// ALBUM CONFIG (Ask only on "Generate Book")
// ============================================
function __syncAlbumConfigModalFromUI() {
    const get = (id) => document.getElementById(id);

    const bookTitle = get('bookTitle');
    const pageFormat = get('pageFormat');
    const autoLayout = get('autoLayout');
    const bpPrintColor = get('bpPrintColor');
    const bpSheetType = get('bpSheetType');
    const bpLaminationType = get('bpLaminationType');
    const bpReadingDirection = get('bpReadingDirection');
    const bpBleed = get('bpBleed');
    const bpSizeCm = get('bpSizeCm');

    const acBookTitle = get('acBookTitle');
    const acPageFormat = get('acPageFormat');
    const acAutoLayout = get('acAutoLayout');
    const acBpPrintColor = get('acBpPrintColor');
    const acBpSheetType = get('acBpSheetType');
    const acBpLaminationType = get('acBpLaminationType');
    const acBpReadingDirection = get('acBpReadingDirection');
    const acBpBleed = get('acBpBleed');
    const acBpSizeCm = get('acBpSizeCm');

    if (acBookTitle && bookTitle) acBookTitle.value = bookTitle.value || '';
    if (acPageFormat && pageFormat) acPageFormat.value = pageFormat.value || 'square-8x8';
    if (acAutoLayout && autoLayout) acAutoLayout.value = autoLayout.value || 'random';

    if (acBpPrintColor && bpPrintColor) acBpPrintColor.value = bpPrintColor.value || 'color';
    if (acBpSheetType && bpSheetType) acBpSheetType.value = bpSheetType.value || 'white80';
    if (acBpLaminationType && bpLaminationType) acBpLaminationType.value = bpLaminationType.value || 'none';
    if (acBpReadingDirection && bpReadingDirection) acBpReadingDirection.value = bpReadingDirection.value || 'right';
    if (acBpBleed && bpBleed) acBpBleed.checked = !!bpBleed.checked;
    if (acBpSizeCm && bpSizeCm) acBpSizeCm.value = bpSizeCm.value || '15x22';
}

function __applyAlbumConfigModalToUI() {
    const get = (id) => document.getElementById(id);

    const bookTitle = get('bookTitle');
    const pageFormat = get('pageFormat');
    const autoLayout = get('autoLayout');
    const bpPrintColor = get('bpPrintColor');
    const bpSheetType = get('bpSheetType');
    const bpLaminationType = get('bpLaminationType');
    const bpReadingDirection = get('bpReadingDirection');
    const bpBleed = get('bpBleed');
    const bpSizeCm = get('bpSizeCm');

    const acBookTitle = get('acBookTitle');
    const acPageFormat = get('acPageFormat');
    const acAutoLayout = get('acAutoLayout');
    const acBpPrintColor = get('acBpPrintColor');
    const acBpSheetType = get('acBpSheetType');
    const acBpLaminationType = get('acBpLaminationType');
    const acBpReadingDirection = get('acBpReadingDirection');
    const acBpBleed = get('acBpBleed');
    const acBpSizeCm = get('acBpSizeCm');

    if (bookTitle && acBookTitle) bookTitle.value = acBookTitle.value || 'My Photo Book';
    if (pageFormat && acPageFormat) pageFormat.value = acPageFormat.value || 'square-8x8';
    if (autoLayout && acAutoLayout) autoLayout.value = acAutoLayout.value || 'random';

    if (bpPrintColor && acBpPrintColor) bpPrintColor.value = acBpPrintColor.value || 'color';
    if (bpSheetType && acBpSheetType) bpSheetType.value = acBpSheetType.value || 'white80';
    if (bpLaminationType && acBpLaminationType) bpLaminationType.value = acBpLaminationType.value || 'none';
    if (bpReadingDirection && acBpReadingDirection) bpReadingDirection.value = acBpReadingDirection.value || 'right';
    if (bpBleed && acBpBleed) bpBleed.checked = !!acBpBleed.checked;
    if (bpSizeCm && acBpSizeCm) bpSizeCm.value = acBpSizeCm.value || '15x22';

    // Ensure the editor reflects the selected page format
    try {
        if (typeof updatePagePreview === 'function') updatePagePreview();
    } catch (e) {
        console.warn('updatePagePreview failed:', e);
    }
}

function openAlbumConfigModal() {
    const modal = document.getElementById('albumConfigModal');
    if (!modal) return Promise.resolve(true);

    __syncAlbumConfigModalFromUI();

    modal.classList.add('active');

    return new Promise((resolve) => {
        window.__albumConfigModalResolve = (confirmed) => {
            if (confirmed) __applyAlbumConfigModalToUI();
            modal.classList.remove('active');
            resolve(!!confirmed);
            window.__albumConfigModalResolve = null;
        };
    });
}

function closeAlbumConfigModal(confirmed) {
    if (typeof window.__albumConfigModalResolve === 'function') {
        window.__albumConfigModalResolve(confirmed);
        return;
    }
    // Fallback: just hide if opened without promise wiring
    const modal = document.getElementById('albumConfigModal');
    if (modal) modal.classList.remove('active');
}

async function openAlbumConfigAndGenerate() {
    const ok = await openAlbumConfigModal();
    if (!ok) return;
    // Generate the PDF first. Printing is optional at the end of the flow.
    return generateBook();
}

// Make sure inline onclick handlers can access these
window.openAlbumConfigModal = openAlbumConfigModal;
window.closeAlbumConfigModal = closeAlbumConfigModal;
window.openAlbumConfigAndGenerate = openAlbumConfigAndGenerate;

function openBookpodDeliveryConfigModal() {
    const modal = document.getElementById('bookpodDeliveryConfigModal');
    if (!modal) return Promise.resolve('skip');

    // Prefill from existing draft if any
    try {
        acBpApplyOrderDraftToModal(state.bookpodOrderDraft || null);
    } catch (e) {
        console.warn('acBpApplyOrderDraftToModal failed:', e);
    }

    // If invoice URL is empty, default it to the last generated PDF URL.
    try {
        const invoiceEl = document.getElementById('acBpInvoiceUrl');
        if (invoiceEl && !String(invoiceEl.value || '').trim()) {
            invoiceEl.value = state.lastGeneratedPdfDownloadUrl || '';
        }
    } catch { /* ignore */ }

    modal.classList.add('active');

    return new Promise((resolve) => {
        window.__bookpodDeliveryModalResolve = (action) => {
            modal.classList.remove('active');
            resolve(action || 'skip');
            window.__bookpodDeliveryModalResolve = null;
        };
    });
}

function closeBookpodDeliveryConfigModal(action) {
    if (typeof window.__bookpodDeliveryModalResolve === 'function') {
        // Validate pickup point selection when needed
        if (action === 'continue') {
            const method = Number(document.getElementById('acBpShipMethod')?.value || 2);
            if (method === 1) {
                const pp = document.getElementById('acBpPickupPoint')?.value || '';
                if (!pp) {
                    const status = document.getElementById('acBpPickupStatus');
                    if (status) status.textContent = 'Please select a pickup point (or click Skip).';
                    return;
                }
            }
        }
        window.__bookpodDeliveryModalResolve(action);
        return;
    }
    const modal = document.getElementById('bookpodDeliveryConfigModal');
    if (modal) modal.classList.remove('active');
}

// ============================================
// BOOKPOD DELIVERY (Generate modal)
// ============================================
function acBpReadOrderDraftFromModal() {
    const get = (id) => document.getElementById(id);
    const method = Number(get('acBpShipMethod')?.value || 2);
    const totalRaw = get('acBpTotalPrice')?.value;
    const totalNum = (totalRaw === undefined || totalRaw === null || String(totalRaw).trim() === '') ? null : Number(totalRaw);
    const invoiceUrl = get('acBpInvoiceUrl')?.value || '';

    const draft = {
        shippingMethod: method, // 1 pickup point, 2 home, 3 factory
        quantity: Math.max(1, Number(get('acBpQuantity')?.value || 1)),
        totalprice: Number.isFinite(totalNum) ? totalNum : null,
        invoiceUrl: String(invoiceUrl || '').trim() || null,
        shippingDetails: {
            name: get('acBpShipName')?.value || '',
            email: get('acBpShipEmail')?.value || '',
            phoneNumber: get('acBpShipPhone')?.value || '',
            country: get('acBpShipCountry')?.value || '',
            city: get('acBpShipCity')?.value || '',
            address1: get('acBpShipAddress1')?.value || '',
            address2: get('acBpShipAddress2')?.value || '',
            postalCode: get('acBpShipPostalCode')?.value || '',
            shippingCompanyId: 6,
            shippingMethod: method,
        },
        pickupPoint: null,
    };

    if (method === 1) {
        const raw = get('acBpPickupPoint')?.value || '';
        if (raw) {
            try {
                draft.pickupPoint = JSON.parse(raw);
            } catch {
                // Backward compatibility: store as string
                draft.pickupPoint = { id: raw };
            }
        }
    }

    // Remove empty-ish drafts to keep payload small
    const sd = draft.shippingDetails;
    const hasAnyField = Object.keys(sd).some((k) => {
        if (k === 'shippingCompanyId' || k === 'shippingMethod') return false;
        return String(sd[k] || '').trim().length > 0;
    });
    if (!hasAnyField && method !== 1) return null;
    return draft;
}

function acBpApplyOrderDraftToModal(draft) {
    const get = (id) => document.getElementById(id);
    const setVal = (id, v) => {
        const el = get(id);
        if (!el) return;
        el.value = (v === undefined || v === null) ? '' : String(v);
    };

    const method = Number(draft?.shippingMethod || draft?.shippingDetails?.shippingMethod || 2);
    setVal('acBpShipMethod', method);
    setVal('acBpQuantity', draft?.quantity || 1);

    const sd = draft?.shippingDetails || {};
    setVal('acBpShipName', sd.name || '');
    setVal('acBpShipEmail', sd.email || '');
    setVal('acBpShipPhone', sd.phoneNumber || '');
    setVal('acBpShipCountry', sd.country || 'Israel');
    setVal('acBpShipCity', sd.city || '');
    setVal('acBpShipAddress1', sd.address1 || '');
    setVal('acBpShipAddress2', sd.address2 || '');
    setVal('acBpShipPostalCode', sd.postalCode || '');
    setVal('acBpTotalPrice', draft?.totalprice ?? '');
    setVal('acBpInvoiceUrl', draft?.invoiceUrl ?? '');

    // Pickup point selection
    const sel = get('acBpPickupPoint');
    if (sel) {
        sel.innerHTML = '<option value=\"\">Search to load pickup points…</option>';
        if (draft?.pickupPoint) {
            const opt = document.createElement('option');
            opt.value = JSON.stringify(draft.pickupPoint);
            opt.textContent = draft.pickupPoint.label || draft.pickupPoint.name || `Pickup point ${draft.pickupPoint.id || ''}`;
            sel.appendChild(opt);
            sel.value = opt.value;
        }
    }

    acBpOnShipMethodChanged();
}

function acBpOnShipMethodChanged() {
    const method = Number(document.getElementById('acBpShipMethod')?.value || 2);
    const sec = document.getElementById('acBpPickupPointSection');
    if (sec) sec.style.display = (method === 1) ? 'block' : 'none';
}

async function acBpPrefillShippingFromProfile() {
    try {
        const result = await callFunction('getPersonalDetails');
        const pd = (result && result.personalDetails) ? result.personalDetails : {};

        const setIfEmpty = (id, v) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (String(el.value || '').trim()) return;
            el.value = v || '';
        };

        setIfEmpty('acBpShipName', pd.fullName || state.user?.displayName || '');
        setIfEmpty('acBpShipEmail', pd.email || state.user?.email || '');
        setIfEmpty('acBpShipPhone', pd.phone || '');
        setIfEmpty('acBpShipCountry', pd.country || 'Israel');
        setIfEmpty('acBpShipCity', pd.city || '');
        setIfEmpty('acBpShipAddress1', pd.address1 || '');
        setIfEmpty('acBpShipAddress2', pd.address2 || '');
        setIfEmpty('acBpShipPostalCode', pd.postalCode || '');
    } catch (e) {
        console.warn('Prefill shipping from profile failed:', e);
    }
}

async function acBpSearchPickupPoints() {
    const status = document.getElementById('acBpPickupStatus');
    const sel = document.getElementById('acBpPickupPoint');
    if (!sel) return;

    const city = document.getElementById('acBpShipCity')?.value || '';
    const address1 = document.getElementById('acBpShipAddress1')?.value || '';
    const country = document.getElementById('acBpShipCountry')?.value || 'Israel';
    const postalCode = document.getElementById('acBpShipPostalCode')?.value || '';

    if (!city && !address1) {
        if (status) status.textContent = 'Enter at least City or Address line 1 to search pickup points.';
        return;
    }

    try {
        if (status) status.textContent = 'Searching pickup points…';
        sel.disabled = true;

        const res = await callFunction('bookpodSearchPickupPoints', {
            address: { country, city, address1, postalCode },
            limit: 10,
        });

        const points = (res && res.success && Array.isArray(res.pickupPoints)) ? res.pickupPoints : [];
        sel.innerHTML = '';
        if (points.length === 0) {
            sel.innerHTML = '<option value=\"\">No pickup points found</option>';
            if (status) status.textContent = res?.message || 'No pickup points found.';
            return;
        }

        points.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify(p);
            const dist = (typeof p.distanceKm === 'number') ? ` • ${p.distanceKm.toFixed(1)}km` : '';
            opt.textContent = `${p.name || p.label || 'Pickup point'} — ${[p.city, p.street, p.house].filter(Boolean).join(' ')}${dist}`;
            sel.appendChild(opt);
        });
        sel.value = sel.options[0]?.value || '';
        if (status) status.textContent = `Loaded ${points.length} pickup points.`;
    } catch (e) {
        console.warn('Pickup point search failed:', e);
        sel.innerHTML = '<option value=\"\">Failed to load pickup points</option>';
        if (status) status.textContent = `Failed to load pickup points: ${e.message || e.code || 'INTERNAL'}`;
    } finally {
        sel.disabled = false;
    }
}

// Make sure inline onclick handlers can access these
window.acBpOnShipMethodChanged = acBpOnShipMethodChanged;
window.acBpPrefillShippingFromProfile = acBpPrefillShippingFromProfile;
window.acBpSearchPickupPoints = acBpSearchPickupPoints;
window.acBpReadOrderDraftFromModal = acBpReadOrderDraftFromModal;
window.acBpApplyOrderDraftToModal = acBpApplyOrderDraftToModal;
window.openBookpodDeliveryConfigModal = openBookpodDeliveryConfigModal;
window.closeBookpodDeliveryConfigModal = closeBookpodDeliveryConfigModal;

async function sendToBookpodPrinting() {
    try {
        if (!state.lastGeneratedBookData || !state.lastGeneratedPdfDownloadUrl) {
            alert('No generated PDF found. Generate a PDF first.');
            return;
        }

        // Close the result modal before opening the delivery step.
        const resultModal = document.getElementById('resultModal');
        if (resultModal) resultModal.classList.remove('active');

        // Ask for delivery details at the end.
        const action = await openBookpodDeliveryConfigModal();
        if (action !== 'continue') {
            // User cancelled/escaped; return them to the result modal
            if (resultModal) resultModal.classList.add('active');
            return;
        }

        let orderDraft = null;
        try {
            orderDraft = acBpReadOrderDraftFromModal();
        } catch (e) {
            console.warn('Failed to read delivery draft:', e);
        }

        showProgress('Sending to BookPod…', 'Uploading PDFs and creating print job…', 15);
        const res = await callFunction('bookpodSubmitPrintJob', {
            bookData: state.lastGeneratedBookData,
            pdfDownloadUrl: state.lastGeneratedPdfDownloadUrl,
            orderDraft: orderDraft || null,
        });

        hideProgress();

        if (!res || !res.success) {
            throw new Error(res?.error || 'BookPod print job failed');
        }

        const orderNo = res?.bookpodOrder?.order_no;
        if (orderNo) {
            alert(`Sent to BookPod successfully. Order: ${orderNo}`);
        } else {
            alert('Sent to BookPod successfully.');
        }
    } catch (e) {
        console.error('sendToBookpodPrinting failed:', e);
        hideProgress();
        alert(`Failed to send to printing: ${e.message || e.code || 'INTERNAL'}`);
    }
}

window.sendToBookpodPrinting = sendToBookpodPrinting;

async function generateBook() {
    try {
        console.log('=== generateBook START ===');

        showProgress('Preparing to create your photo book...', 'Checking Google Photos authorization…', 3);
        const authed = await ensureGooglePhotosAuthorizedInteractive('generate your photo book PDF', 60000);
        if (!authed) {
            hideProgress();
            alert('Google Photos authorization is required to load your saved photos. Please complete the authorization in the opened tab, then click “Generate Book” again.');
            return;
        }

        const bookData = collectBookData();
        console.log('Book data collected:', bookData.pages.length, 'pages');

        showProgress('Preparing to create your photo book...', 'Initializing...', 5);

        // Get ID token for authentication
        updateProgress('Authenticating...', 'Verifying user credentials...', 10);
        const idToken = await firebase.auth().currentUser.getIdToken();

        // Use fetch instead of callable function to avoid 70s timeout
        const functionUrl = window.location.hostname === 'localhost'
            ? 'http://127.0.0.1:5001/shoso-photobook/us-central1/createPhotoBook'
            : 'https://us-central1-shoso-photobook.cloudfunctions.net/createPhotoBook';

        updateProgress('Uploading book data...', 'Sending your photo book configuration to the server...', 20);

        const response = await fetch(functionUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            },
            body: JSON.stringify({ bookData })
        });

        updateProgress('Processing...', 'Server is creating your photo book...', 40);

        if (!response.ok) {
            // Cloud Functions sometimes returns plain text on crashes; don't assume JSON.
            const raw = await response.text();
            try {
                const parsed = JSON.parse(raw);
                throw new Error(parsed.error || `HTTP ${response.status}`);
            } catch {
                throw new Error(raw || `HTTP ${response.status}`);
            }
        }

        updateProgress('Finalizing...', 'Almost done! Preparing your presentation...', 80);

        const result = await response.json();
        console.log('Server response:', result);

        // Save for optional BookPod printing step
        state.lastGeneratedBookData = bookData;
        state.lastGeneratedPdfDownloadUrl = result?.pdfDownloadUrl || result?.pdfUrl || null;

        updateProgress('Complete!', 'Your photo book is ready!', 100);

        setTimeout(() => {
            hideProgress();

            if (result && (result.pdfUrl || result.pdfDownloadUrl)) {
                // Direct PDF generation (current backend behavior)
                state.generatedPresentationId = null;

                const viewLink = document.getElementById('viewPresentationLink');
                const downloadLink = document.getElementById('downloadPdfLink');
                const pdfResult = document.getElementById('pdfResult');
                const exportBtn = document.querySelector('#resultModal .btn.btn-accent');
                const resultText = document.querySelector('#resultModal .result-content p');

                if (resultText) resultText.textContent = 'Your print-ready PDF photo book is ready.';

                if (viewLink) {
                    viewLink.href = result.pdfUrl || result.pdfDownloadUrl;
                    viewLink.textContent = 'View PDF';
                }
                if (downloadLink) {
                    downloadLink.href = result.pdfDownloadUrl || result.pdfUrl;
                }
                if (pdfResult) {
                    pdfResult.style.display = 'block';
                    const msg = pdfResult.querySelector('p');
                    if (msg) msg.textContent = 'PDF ready!';
                }
                if (exportBtn) exportBtn.style.display = 'none';

                const sendBtn = document.getElementById('sendToPrintBtn');
                if (sendBtn) sendBtn.style.display = 'inline-flex';

                document.getElementById('resultModal').classList.add('active');
            } else if (result && result.presentationId) {
                // Legacy Slides flow (if ever re-enabled)
                state.generatedPresentationId = result.presentationId;
                const viewLink = document.getElementById('viewPresentationLink');
                if (viewLink) {
                    viewLink.href = result.presentationUrl || '#';
                    viewLink.textContent = 'View Presentation';
                }
                const sendBtn = document.getElementById('sendToPrintBtn');
                if (sendBtn) sendBtn.style.display = 'none';
                document.getElementById('resultModal').classList.add('active');
            } else if (result && result.error) {
                alert('Error: ' + result.error);
            } else {
                alert('Unknown response from server');
            }
        }, 500);

    } catch (error) {
        console.error('generateBook error:', error);
        hideProgress();
        alert('Error: ' + error.message);
    }
}

function closeResultModal() {
    document.getElementById('resultModal').classList.remove('active');
    const sendBtn = document.getElementById('sendToPrintBtn');
    if (sendBtn) sendBtn.style.display = 'none';
}

async function exportToPdf() {
    // If we already generate PDFs directly, there is nothing to export.
    if (!state.generatedPresentationId) {
        alert('This book is already generated as a PDF. Use “Download PDF”.');
        return;
    }
    showProgress('Exporting to PDF...');
    try {
        const result = await callFunction('exportAsPdf', { presentationId: state.generatedPresentationId });
        hideProgress();
        if (result.success) {
            document.getElementById('pdfResult').style.display = 'block';
            document.getElementById('downloadPdfLink').href = result.downloadUrl;
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        hideProgress();
        showError('Failed to export PDF: ' + error.message);
    }
}

// ============================================
// DRAG AND DROP
// ============================================
function setupDragAndDrop() {
    const items = document.querySelectorAll('.selected-photo-item');
    items.forEach(item => {
        item.addEventListener('dragstart', function () {
            this.style.opacity = '0.5';
            window.draggedItem = this;
        });
        item.addEventListener('dragover', function (e) {
            e.preventDefault();
        });
        item.addEventListener('drop', function (e) {
            e.preventDefault();
            if (window.draggedItem !== this) {
                const from = parseInt(window.draggedItem.dataset.index);
                const to = parseInt(this.dataset.index);
                const item = state.selectedPhotos.splice(from, 1)[0];
                state.selectedPhotos.splice(to, 0, item);
                updateSelectedPhotosUI();
            }
        });
        item.addEventListener('dragend', function () {
            this.style.opacity = '1';
        });
    });
}

// ============================================
// RESIZABLE SIDEBAR
// ============================================
function initResizableSidebar() {
    const container = document.getElementById('mainContainer');
    const sidebar = document.getElementById('sidebar');
    const handle = document.getElementById('resizeHandle');

    if (!handle || !sidebar || !container) return;

    let isResizing = false;
    let startX = 0;
    let startWidth = 0;

    handle.addEventListener('mousedown', function (e) {
        isResizing = true;
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        handle.classList.add('dragging');
        document.body.classList.add('resizing');
        e.preventDefault();
    });

    document.addEventListener('mousemove', function (e) {
        if (!isResizing) return;
        const diff = e.clientX - startX;
        const newWidth = Math.max(200, Math.min(600, startWidth + diff));
        sidebar.style.width = newWidth + 'px';
    });

    document.addEventListener('mouseup', function () {
        if (isResizing) {
            isResizing = false;
            handle.classList.remove('dragging');
            document.body.classList.remove('resizing');
            localStorage.setItem('sidebarWidth', sidebar.offsetWidth);
        }
    });

    const savedWidth = localStorage.getItem('sidebarWidth');
    if (savedWidth) {
        sidebar.style.width = savedWidth + 'px';
    }
}

// ============================================
// DESIGN INSPIRATION SEARCH
// ============================================
function getDesignInspirationRenderTarget() {
    // Prefer inline rendering in the Selected tab (new location).
    const inline = document.getElementById('designInspirationInlineContent');
    if (inline) return inline;

    // Fallback to the legacy modal (still present in DOM).
    const modal = document.getElementById('designInspirationContent');
    if (modal) return modal;

    return null;
}

async function searchDesignInspiration() {
    const searchInput = document.getElementById('designSearchInput');
    const query = searchInput.value.trim();
    const statusDiv = document.getElementById('designSearchStatus');
    const target = getDesignInspirationRenderTarget();

    if (!query) {
        statusDiv.textContent = 'Please enter a search term';
        statusDiv.style.display = 'block';
        statusDiv.style.color = 'var(--color-error)';
        return;
    }

    try {
        statusDiv.textContent = 'Searching...';
        statusDiv.style.display = 'block';
        statusDiv.style.color = 'var(--color-text-light)';

        if (target) {
            target.innerHTML = '<div class="loading">Searching for design inspiration...</div>';
        }

        // Call backend function
        const result = await callFunction('searchDesignInspiration', {
            query: query,
            count: 10
        });

        if (result.success) {
            displayDesignInspirationResults(result, target);
            statusDiv.textContent = `Found ${result.total} results`;
            statusDiv.style.color = 'var(--color-success)';
        } else {
            throw new Error(result.error || 'Search failed');
        }

    } catch (error) {
        console.error('Design inspiration search error:', error);
        statusDiv.textContent = 'Search failed: ' + error.message;
        statusDiv.style.color = 'var(--color-error)';
        if (target) {
            target.innerHTML =
                `<div style="padding: 1rem; text-align: center; color: var(--color-error);">
                    <p style="margin-bottom: 0.75rem;">Failed to search: ${error.message}</p>
                </div>`;
        }
    }
}

function displayDesignInspirationResults(result, contentEl) {
    const content = contentEl || document.getElementById('designInspirationContent');
    if (!content) return;

    let html = '';

    // Display color palettes if found
    if (result.palettes && result.palettes.length > 0) {
        html += '<div style="margin-bottom: 2rem;">';
        html += '<h4 style="margin-bottom: 1rem; color: var(--color-primary);">🎨 Color Palettes Found</h4>';
        html += '<div style="display: grid; gap: 1rem;">';

        result.palettes.forEach((palette, index) => {
            const colorsStr = JSON.stringify(palette.colors).replace(/"/g, '&quot;');
            html += '<div style="border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem; background: var(--color-surface);">';
            html += `<h5 style="margin-bottom: 0.5rem; font-size: 0.9rem;">${palette.name}</h5>`;
            html += '<div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">';

            palette.colors.forEach(color => {
                html += `<div style="width: 40px; height: 40px; background: ${color}; border-radius: var(--radius-sm); border: 1px solid var(--color-border);" title="${color}"></div>`;
            });

            html += '</div>';
            html += `<button class="btn btn-small" onclick="applyColorPaletteFromString('${colorsStr}')" style="width: 100%;">Apply This Palette</button>`;
            html += '</div>';
        });

        html += '</div>';
        html += '</div>';
    }

    // Display search results
    if (result.results && result.results.length > 0) {
        html += '<div>';
        html += '<h4 style="margin-bottom: 1rem; color: var(--color-primary);">📚 Design Articles & Resources</h4>';
        html += '<div style="display: flex; flex-direction: column; gap: 1rem; max-height: 400px; overflow-y: auto;">';

        result.results.forEach((item, index) => {
            html += '<div style="border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1rem; background: var(--color-surface);">';
            html += `<h5 style="margin-bottom: 0.5rem; font-size: 0.95rem;"><a href="${item.url}" target="_blank" style="color: var(--color-primary); text-decoration: none;">${item.title}</a></h5>`;
            html += `<p style="color: var(--color-text-light); font-size: 0.85rem; margin-bottom: 0.5rem;">${item.description || 'No description available'}</p>`;
            if (item.age) {
                html += `<span style="font-size: 0.75rem; color: var(--color-text-light);">${item.age}</span>`;
            }
            html += '</div>';
        });

        html += '</div>';
        html += '</div>';
    } else {
        html += '<div style="padding: 2rem; text-align: center; color: var(--color-text-light);">';
        html += '<p>No results found. Try a different search term.</p>';
        html += '</div>';
    }

    content.innerHTML = html;
}

function applyColorPaletteFromString(colorsJson) {
    let colors;
    try {
        // Decode HTML entities and parse JSON
        const decoded = colorsJson.replace(/&quot;/g, '"');
        colors = JSON.parse(decoded);
    } catch (e) {
        console.error('Error parsing colors:', e);
        alert('Invalid color palette format');
        return;
    }

    if (!colors || !Array.isArray(colors) || colors.length < 3) {
        alert('Invalid color palette');
        return;
    }

    // Create a new theme from the palette
    const newTheme = {
        name: `Custom Palette ${new Date().toLocaleTimeString()}`,
        colors: {
            primary: colors[0] || '#1E3932',
            secondary: colors[1] || '#D4AF37',
            bg: colors[2] || '#FFFFFF',
            surface: colors[3] || colors[2] || '#FFFFFF',
            text: colors[4] || '#333333'
        },
        fonts: {
            serif: "'Playfair Display', serif",
            sans: "'Montserrat', sans-serif"
        }
    };

    // Add to themes config
    const themeId = `custom-${Date.now()}`;
    state.config.THEMES[themeId] = newTheme;

    // Apply the theme
    applyTheme(themeId);

    // Add to UI
    addThemeToUI(themeId, newTheme);

    // Show success message
    alert('Color palette applied! The theme has been added to your themes list.');
    closeDesignInspirationModal();
}

function addThemeToUI(themeId, theme) {
    const themeList = document.querySelector('.theme-list');
    if (!themeList) {
        // Themes tab UI may not exist (it was removed). Theme is still added to state + applied.
        return;
    }
    const themeItem = document.createElement('div');
    themeItem.className = 'theme-item';
    themeItem.setAttribute('data-theme', themeId);
    themeItem.onclick = () => applyTheme(themeId);

    // Create 3D book preview
    const preview = document.createElement('div');
    preview.className = 'book-3d-preview';
    preview.id = `preview-${themeId}`;

    const bookCover = document.createElement('div');
    bookCover.className = 'book-cover-3d';
    bookCover.style.background = theme.colors.bg;
    bookCover.style.border = `2px solid ${theme.colors.primary}`;

    const bookSpine = document.createElement('div');
    bookSpine.className = 'book-spine-3d';
    bookSpine.style.background = theme.colors.primary;

    const bookPages = document.createElement('div');
    bookPages.className = 'book-pages-3d';
    bookPages.style.background = theme.colors.bg;

    if (theme.decorations && theme.decorations.length > 0) {
        const decoration = document.createElement('div');
        decoration.className = 'book-decoration';
        decoration.style.color = theme.colors.secondary;
        decoration.textContent = theme.decorations[0];
        bookCover.appendChild(decoration);
    }

    bookCover.appendChild(bookSpine);
    bookCover.appendChild(bookPages);
    preview.appendChild(bookCover);

    const label = document.createElement('span');
    label.textContent = theme.name;

    themeItem.appendChild(preview);
    themeItem.appendChild(label);
    themeList.appendChild(themeItem);
}

function closeDesignInspirationModal() {
    document.getElementById('designInspirationModal').classList.remove('active');
}

// ============================================
// DESIGN EDITOR INTEGRATION
// ============================================
async function saveEditedPhoto() {
    if (currentEditingPhotoIndex === null || currentEditingPageIndex === null || typeof designEditor === 'undefined') {
        alert('No photo being edited. Please select a photo from an album page first.');
        return;
    }

    try {
        showProgress('Saving edited photo...', 'Processing your edits...', 50);

        // Export edited image from canvas (this now includes filters applied to image data)
        // Export at high resolution (without upscaling beyond the source image).
        // This ensures PDF generation can stay crisp.
        const editedImageData = await Promise.resolve(
            designEditor.exportImage('png', 0.95, { maxDimension: 3600 })
        );

        // Update the photo in the page with the edited version
        const page = state.pages[currentEditingPageIndex];
        const photo = page.photos[currentEditingPhotoIndex];
        if (photo) {
            // Replace thumbnail with edited image
            photo.thumbnailUrl = editedImageData;
            // Mark that this photo has been edited
            photo.edited = true;
            photo.editedData = editedImageData;
            photo.editedImageData = editedImageData; // Also set editedImageData for PDF generator

            // Re-render the page to show updated photo
            if (state.currentPageIndex === currentEditingPageIndex) {
                renderCurrentPage();
            }

            hideProgress();
            showStatus('Photo saved! The edited version will be used in the generated book.', 'success');
        } else {
            throw new Error('Photo not found in page');
        }

    } catch (error) {
        console.error('Error saving edited photo:', error);
        hideProgress();
        alert('Failed to save edited photo: ' + error.message);
    }
}

// Initialize editor (called from template gallery)
function initializeEditor() {
    updateCoverPreview();
    updateBackCoverPreview();
    initResizableSidebar();

    // Apply template styling if template is selected
    if (state.selectedTemplate && typeof applyTemplateToUI !== 'undefined') {
        applyTemplateToUI(state.selectedTemplate);
    }

    if (typeof designEditor !== 'undefined') {
        designEditor.init('designCanvasContainer');
    }
}

// ============================================
// WINDOW EXPORTS FOR ONCLICK HANDLERS
// ============================================

// Color utilities
window.hexToRgb = hexToRgb;
window.rgbToHex = rgbToHex;
window.lightenColor = lightenColor;
window.darkenColor = darkenColor;
window.isColorDark = isColorDark;
window.getContrastingTextColor = getContrastingTextColor;

// Back cover functions
window.setBackCoverAlign = setBackCoverAlign;
window.syncBackCoverTextColor = syncBackCoverTextColor;
window.syncBackCoverBgColor = syncBackCoverBgColor;
window.updateBackCoverPreview = updateBackCoverPreview;
window.updateBackCoverFromState = updateBackCoverFromState;

// Template functions (ensure they're available)
window.applyTemplate = applyTemplate;
window.applyTemplateToUI = applyTemplateToUI;

// ============================================
// INITIALIZATION ON LOAD
// ============================================
document.addEventListener('DOMContentLoaded', initialize);
