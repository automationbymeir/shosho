
// ============================================
// PHOTO BOOK CREATOR - MAIN APPLICATION
// ============================================
console.log("app.js loaded - Immediate execution start");

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
    ui: {
        // 'auto' | 'ltr' | 'rtl'
        dir: localStorage.getItem('shoso_ui_dir') || 'auto',
        lang: localStorage.getItem('shoso_ui_lang') || 'auto'
    },
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
    currentTheme: 'classic',
    currentPageIndex: -1
};

// ============================================
// FIREBASE FUNCTIONS UTILS (Moved to top to prevent TDZ errors)
// ============================================
const functions = firebase.functions();

// For local development, use emulator:
if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    functions.useEmulator("localhost", 5001);
}

async function callFunction(name, data = {}, timeoutMs = 60000) {
    try {
        console.log("Calling function", name, "User:", firebase.auth().currentUser?.uid);
        const callable = functions.httpsCallable(name);
        // Add client-side timeout to prevent infinite hang (default 60s)
        const result = await Promise.race([
            callable(data),
            new Promise((_, reject) => setTimeout(() => reject(new Error(`Function call timed out after ${timeoutMs / 1000}s`)), timeoutMs))
        ]);
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
 * Show the Template Gallery and hide other views.
 */
function showTemplateGallery() {
    const galleryView = document.getElementById('templateGalleryView');
    const editorView = document.getElementById('editorView');
    const mdView = document.getElementById('memoryDirectorView');
    if (galleryView) galleryView.style.display = 'block';
    if (editorView) editorView.style.display = 'none';
    if (mdView) mdView.style.display = 'none';

    // Ensure gallery is initialized
    initTemplateGallery();
}

/**
 * Initialize the template gallery grid from BACKGROUND_TEXTURES
 */
function initTemplateGallery() {
    const grid = document.getElementById('templateGalleryGrid');
    if (!grid) return;

    // Clear existing
    grid.innerHTML = '';

    // Check if we have textures
    const textures = window.BACKGROUND_TEXTURES || [];
    if (textures.length === 0) {
        grid.innerHTML = '<p>No templates found.</p>';
        return;
    }

    textures.forEach(template => {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.style.cssText = 'border: 1px solid #ddd; border-radius: 8px; overflow: hidden; cursor: pointer; transition: transform 0.2s; background: white;';
        card.onmouseover = () => card.style.transform = 'scale(1.02)';
        card.onmouseout = () => card.style.transform = 'scale(1)';

        const img = document.createElement('img');
        img.src = template.thumbnail || template.url;
        img.alt = template.name;
        img.style.cssText = 'width: 100%; height: 200px; object-fit: cover; display: block;';

        const info = document.createElement('div');
        info.style.padding = '12px';
        info.innerHTML = `<h3 style="margin:0; font-size:16px; color: #333;">${template.name}</h3><p style="margin:4px 0 0; color:#666; font-size:14px;">${template.category}</p>`;

        card.appendChild(img);
        card.appendChild(info);

        card.onclick = () => selectGalleryTemplate(template);
        grid.appendChild(card);
    });
}

/**
 * Handle template selection from gallery
 */
function selectGalleryTemplate(template) {
    if (!template) return;

    // Set state
    if (typeof state !== 'undefined') {
        state.selectedTemplate = template;
        state.currentTheme = template.id; // Fallback
    }

    // Apply template logic if available
    if (typeof applyTemplate === 'function') {
        applyTemplate(template);
    } else if (typeof applyTemplateToUI === 'function') {
        applyTemplateToUI(template);
    }

    // Switch view
    const galleryView = document.getElementById('templateGalleryView');
    const editorView = document.getElementById('editorView');
    if (galleryView) galleryView.style.display = 'none';
    if (editorView) editorView.style.display = 'block';

    // Initialize editor state if needed
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

// Repair Connection button removed per request.


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
    if (p.type === 'text') {
        return {
            type: 'text',
            id: p.id || ('text-' + Date.now()),
            content: String(p.content || ''),
            styleId: p.styleId || 'default',
            rotation: Number.isFinite(p.rotation) ? p.rotation : 0,
            fontSize: Number.isFinite(p.fontSize) ? p.fontSize : 32,
            shadowStrength: Number.isFinite(p.shadowStrength) ? p.shadowStrength : 0,
        };
    }
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

function containsHebrewText(s) {
    if (!s) return false;
    return /[\u0590-\u05FF]/.test(String(s));
}

function computeAutoDirFromState() {
    // Look at common user-entered strings; if any contain Hebrew => RTL
    const candidates = [
        state?.cover?.title,
        state?.cover?.subtitle,
        state?.backCover?.text,
        state?.backCover?.subtitle,
        ...(state?.pages || []).flatMap(p => (p?.photos || [])
            .filter(x => x && x.type === 'text')
            .map(x => x.content)),
    ];
    return candidates.some(containsHebrewText) ? 'rtl' : 'ltr';
}

function applyUiDirection() {
    const pref = state?.ui?.dir || 'auto';
    const dir = pref === 'auto' ? computeAutoDirFromState() : pref;
    document.documentElement.setAttribute('dir', dir);

    const langPref = state?.ui?.lang || 'auto';
    const lang = langPref === 'auto' ? (dir === 'rtl' ? 'he' : 'en') : langPref;
    document.documentElement.setAttribute('lang', lang);
    try { applyTranslations(); } catch { /* ignore */ }
}

// Apply persisted UI direction/lang as early as possible (before initialize)
try { applyUiDirection(); } catch { /* ignore */ }

function setUiDirection(dir) {
    state.ui.dir = dir;
    localStorage.setItem('shoso_ui_dir', dir);
    applyUiDirection();
    try { renderCurrentPage(); } catch { /* ignore */ }
}

const I18N = {
    en: {
        gallery_title: 'Create Your Photo Book',
        gallery_subtitle: 'Choose a template to begin',
        lang_en: 'EN',
        lang_he: 'עברית',
        toggle_rtl: 'RTL',
        load_project: 'Load Project',
        profile: 'Profile',
        open_design_gallery: 'Open Design Gallery',
        cover: 'Cover',
        back_cover: 'Back',
        prev_page: 'Previous Page',
        next_page: 'Next Page',
        add_page: 'Add Page',
        auto_layout: 'Auto Layout',
        cover_title_placeholder: 'Enter title...',
        cover_subtitle_placeholder: 'Enter subtitle...',
        cover_photo: 'Cover Photo',
        click_to_add_photo: 'Click to add photo',
        subtitle: 'Subtitle',
        title_font: 'Title Font',
        subtitle_font: 'Subtitle Font',
        layout: 'Layout',
        size: 'Size',
        angle: 'Angle',
        corners: 'Corners',
        text_color: 'Text Color',
        text_font: 'Text Font',
        alignment: 'Alignment',
        align_left: 'Left',
        align_center: 'Center',
        align_right: 'Right',
        page_layout: 'Page Layout',
        layout_single_photo: 'Single Photo',
        layout_two_horizontal: 'Two Horizontal',
        layout_two_vertical: 'Two Vertical',
        layout_three_left: 'Three (Large Left)',
        layout_three_right: 'Three (Large Right)',
        layout_four_grid: 'Four Grid',
        layout_collage_5: 'Collage (5 Photos)',
        layout_collage_6: 'Collage (6 Photos)',
        photo_spacing: 'Photo Spacing',
        gap: 'Gap',
        corner_style: 'Global Corners',
        radius: 'Radius',
        backcover_closing_text: 'Closing Text',
        backcover_subtitle_optional: 'Subtitle (optional)',
        background_color: 'Background Color',
        background_image: 'Background Image',
        upload_image: 'Upload Image...',
        no_image_set: 'No image set',
        remove_image: 'Remove Image',
        design_gallery: 'Design Gallery',
        typography_style: 'Typography Style',
        text_size: 'Text Size',
        subtitle_size: 'Subtitle Size',
        corner_square_0: 'Square (0px)',
        corner_subtle_4: 'Subtle (4px)',
        corner_rounded_8: 'Rounded (8px)',
        corner_soft_12: 'Soft (12px)',
        corner_modern_16: 'Modern (16px)',
        corner_circular_24: 'Circular (24px)',
        corner_sharp_0: 'Sharp (0px)',
        corner_soft_16: 'Soft (16px)',
        preview_pdf: 'Preview PDF',
        order_print: 'Order Print',
        left_page: 'Left Page',
        right_page: 'Right Page',
        confirm_delete_page: 'Delete this page?',
        page_cover: 'Cover',
        page_back: 'Back',
    },
    he: {
        gallery_title: 'צרו את אלבום התמונות שלכם',
        gallery_subtitle: 'בחרו תבנית כדי להתחיל',
        lang_en: 'EN',
        lang_he: 'עברית',
        toggle_rtl: 'RTL',
        load_project: 'טען פרויקט',
        profile: 'פרופיל',
        open_design_gallery: 'פתח את גלריית העיצובים',
        cover: 'כריכה',
        back_cover: 'גב',
        prev_page: 'עמוד קודם',
        next_page: 'עמוד הבא',
        add_page: 'הוסף עמוד',
        auto_layout: 'סידור אוטומטי',
        cover_title_placeholder: 'הכנס כותרת…',
        cover_subtitle_placeholder: 'הכנס כותרת משנה…',
        cover_photo: 'תמונת כריכה',
        click_to_add_photo: 'לחץ כדי להוסיף תמונה',
        subtitle: 'כותרת משנה',
        title_font: 'פונט כותרת',
        subtitle_font: 'פונט כותרת משנה',
        layout: 'פריסה',
        size: 'גודל',
        angle: 'זווית',
        corners: 'פינות',
        text_color: 'צבע טקסט',
        text_font: 'פונט טקסט',
        alignment: 'יישור',
        align_left: 'שמאל',
        align_center: 'מרכז',
        align_right: 'ימין',
        page_layout: 'עימוד',
        layout_single_photo: 'תמונה אחת בעמוד',
        layout_two_horizontal: 'שתיים בעמוד - אופקי',
        layout_two_vertical: 'שתיים בעמוד - אנכי',
        layout_three_left: 'שלוש בעמוד - גדול משמאל',
        layout_three_right: 'שלוש בעמוד - גדול מימין',
        layout_four_grid: 'ארבע בעמוד - רשת',
        layout_collage_5: "קולאז׳ - 5 תמונות",
        layout_collage_6: "קולאז׳ - 6 תמונות",
        photo_spacing: 'מרווח בין תמונות',
        gap: 'רווח',
        corner_style: 'סגנון פינות',
        radius: 'רדיוס',
        backcover_closing_text: 'טקסט לסיום',
        backcover_subtitle_optional: 'כותרת משנה (אופציונלי)',
        background_color: 'צבע רקע',
        background_image: 'תמונת רקע',
        upload_image: 'העלה תמונה…',
        no_image_set: 'לא הוגדרה תמונה',
        remove_image: 'הסר תמונה',
        design_gallery: 'גלריית העיצובים',
        typography_style: 'סגנון טיפוגרפיה',
        text_size: 'גודל טקסט',
        subtitle_size: 'גודל כותרת משנה',
        corner_square_0: 'חד (0px)',
        corner_subtle_4: 'עדין (4px)',
        corner_rounded_8: 'מעוגל (8px)',
        corner_soft_12: 'רך (12px)',
        corner_modern_16: 'מודרני (16px)',
        corner_circular_24: 'עגול (24px)',
        corner_sharp_0: 'חד (0px)',
        corner_soft_16: 'רך (16px)',
        preview_pdf: 'תצוגה מקדימה',
        order_print: 'הזמן אלבום מודפס',
        left_page: 'עמוד שמאל',
        right_page: 'עמוד ימין',
        confirm_delete_page: 'למחוק את העמוד הזה?',
        page_cover: 'כריכה',
        page_back: 'גב',
    }
};

function getUiLang() {
    const lang = (document.documentElement.getAttribute('lang') || 'en').toLowerCase();
    return (lang === 'he' || lang === 'iw') ? 'he' : 'en';
}

function t(key, fallback) {
    const lang = getUiLang();
    return (I18N[lang] && I18N[lang][key]) || (I18N.en && I18N.en[key]) || fallback || key;
}

// =====================================================
// FULL-APP (DOM) TRANSLATION LAYER (reversible)
// =====================================================
const __i18nTouchedTextNodes = new Set();
const __i18nTextNodeOrig = new WeakMap();
const __i18nTouchedAttrs = new Set(); // entries: { el, attr }
const __i18nAttrOrig = new WeakMap(); // el -> Map(attr->orig)

function __i18nRememberAttr(el, attr, value) {
    if (!el) return;
    let m = __i18nAttrOrig.get(el);
    if (!m) { m = new Map(); __i18nAttrOrig.set(el, m); }
    if (!m.has(attr)) m.set(attr, value);
}

function __i18nRestoreAll() {
    // Restore text nodes
    __i18nTouchedTextNodes.forEach((n) => {
        try {
            if (!n || n.nodeType !== 3) return;
            const orig = __i18nTextNodeOrig.get(n);
            if (typeof orig === 'string') n.nodeValue = orig;
        } catch { /* ignore */ }
    });
    __i18nTouchedTextNodes.clear();

    // Restore attributes
    __i18nTouchedAttrs.forEach((entry) => {
        try {
            const el = entry?.el;
            const attr = entry?.attr;
            if (!el || !attr) return;
            const m = __i18nAttrOrig.get(el);
            const orig = m ? m.get(attr) : undefined;
            if (typeof orig === 'string') el.setAttribute(attr, orig);
        } catch { /* ignore */ }
    });
    __i18nTouchedAttrs.clear();
}

function __i18nTranslateDynamicHebrew(s) {
    const str = String(s || '');
    // Sliders that include values
    let m = str.match(/^Brightness\s+(\d+%?)$/i);
    if (m) return `בהירות ${m[1]}`;
    m = str.match(/^Contrast\s+(\d+%?)$/i);
    if (m) return `ניגודיות ${m[1]}`;
    m = str.match(/^Saturation\s+(\d+%?)$/i);
    if (m) return `רוויה ${m[1]}`;
    return null;
}

function __i18nTranslateString(s) {
    const lang = getUiLang();
    const raw = String(s ?? '');
    const trimmed = raw.trim();
    if (!trimmed) return raw;

    if (lang !== 'he') return raw;

    // Keep the font name intact
    if (/^open\s+sans$/i.test(trimmed)) return raw;

    const dynamic = __i18nTranslateDynamicHebrew(trimmed);
    if (dynamic) return raw.replace(trimmed, dynamic);

    const replaceMap = {
        // General actions
        'Cancel': 'ביטול',
        'Close': 'סגור',
        'Back': 'חזרה',
        'Next': 'הבא',
        'Previous': 'הקודם',
        'Continue': 'המשך',
        'Confirm': 'אישור',
        'Save': 'שמור',
        'Refresh': 'רענן',
        'Shuffle': 'ערבב',
        'Clear': 'נקה',
        'Generate': 'צור',
        'Generate Book': 'צור ספר',
        'Generate All Captions': 'צור כיתובים לכל התמונות',
        'Export as PDF': 'ייצוא ל‑PDF',
        'Import from Cloud': 'ייבוא מהענן',
        'Upload from Computer': 'העלה מהמחשב',

        // Tabs / sections
        'Photos': 'תמונות',
        'Pages': 'עמודים',
        'Design': 'עיצוב',
        'Photo Library': 'ספריית תמונות',
        'Pages Overview': 'סקירת עמודים',
        'Page Thumbnails': 'תצוגות מקדימות',
        'Properties': 'מאפיינים',
        'Design Tools': 'כלי עיצוב',
        'Quick Actions': 'פעולות מהירות',
        'Auto Layout': 'סידור אוטומטי',
        'Brush Tools': 'כלי מברשת',
        'Brush Settings': 'הגדרות מברשת',
        'Photo Filters': 'מסנני תמונה',
        'Select a photo to edit': 'בחר תמונה לעריכה',

        // Page / cover controls
        'Add Page': 'הוסף עמוד',
        '+ Add Empty Page': '+ הוסף עמוד ריק',
        'Cover': 'כריכה',
        'Cover Photo': 'תמונת כריכה',
        'Click to add photo': 'לחץ כדי להוסיף תמונה',
        'Click to add photo or text': 'לחץ כדי להוסיף תמונה או טקסט',
        '+ Add Cover Photo': '+ הוסף תמונת כריכה',
        'Add a subtitle': 'הוסף כותרת משנה',
        'Subtitle': 'כותרת משנה',
        'Title Font': 'פונט כותרת',
        'Subtitle Font': 'פונט כותרת משנה',
        'Layout': 'פריסה',
        'Size': 'גודל',
        'Angle': 'זווית',
        'Corners': 'פינות',

        // Background / gallery
        'Background Color': 'צבע רקע',
        'Background Image': 'תמונת רקע',
        'Upload Image...': 'העלה תמונה…',
        'Remove Image': 'הסר תמונה',
        'Design Gallery': 'גלריית העיצובים',
        'Open Design Gallery': 'פתח את גלריית העיצובים',
        'Image Frames': 'מסגרות לתמונה',
        'Typography Style': 'סגנון טיפוגרפיה',
        'Apply All': 'החל על הכל',
        'Apply all': 'החל על הכל',
        'All': 'הכל',
        'Full Theme': 'תבנית מלאה',
        'Texture Only': 'טקסטורה בלבד',
        'TEMPLATE': 'תבנית',
        'Loading text styles...': 'טוען סגנונות טקסט…',
        'No frames available.': 'אין מסגרות זמינות.',
        'No backgrounds available.': 'אין רקעים זמינים.',
        'Design applied to all pages!': 'העיצוב הוחל על כל העמודים!',
        'Frame applied!': 'המסגרת הוחלה!',
        'Frame applied to all pages!': 'המסגרת הוחלה על כל העמודים!',
        'Text style applied to Cover!': 'סגנון הטקסט הוחל על הכריכה!',
        'Text style applied to Back Cover!': 'סגנון הטקסט הוחל על הכריכה האחורית!',
        'Text style applied!': 'סגנון הטקסט הוחל!',
        'Select a text slot to apply typography': 'בחר משבצת טקסט כדי להחיל טיפוגרפיה',

        // Back cover panel
        'Text Color': 'צבע טקסט',
        'Text Font': 'פונט טקסט',
        'Text Size': 'גודל טקסט',
        'Subtitle Size': 'גודל כותרת משנה',
        'Alignment': 'יישור',
        'Left': 'שמאל',
        'Center': 'מרכז',
        'Right': 'ימין',
        'Options': 'אפשרויות',
        'Border': 'מסגרת',
        'Show logo': 'הצג לוגו',
        'No image set': 'לא הוגדרה תמונה',

        // Modals / status
        'Generating your photo book...': 'מייצר את האלבום שלך…',
        'Load Project': 'טען פרויקט',
        'Profile': 'פרופיל',
        'Design Studio': 'סטודיו עיצוב',
        'Edit': 'ערוך',
        'Edit Design': 'עריכת עיצוב',
        'Edit Text': 'עריכת טקסט',

        // Shipping/profile fields
        'Full name': 'שם מלא',
        'Email': 'אימייל',
        'Phone': 'טלפון',
        'Country': 'מדינה',
        'City': 'עיר',
        'Address line 1': 'כתובת שורה 1',
        'Address line 2': 'כתובת שורה 2',
        'Postal code': 'מיקוד',
        'Shipping method': 'שיטת משלוח',
        'Home delivery': 'משלוח עד הבית',

        // Templates / themes (best-effort)
        'Classic Minimal': 'קלאסי מינימלי',
        'The Archive': 'הארכיון',
        'Your Photo Story': 'סיפור התמונות שלך',
        'Memory Director': 'מנהל הזיכרונות',
        'AI Captions': 'כיתובי AI',
        'Format': 'פורמט',

        // Remaining common strings (audit-driven)
        'Adjustments': 'התאמות',
        'Brightness': 'בהירות',
        'Contrast': 'ניגודיות',
        'Saturation': 'רוויה',
        'Book Title': 'כותרת האלבום',
        'Book title': 'כותרת האלבום',
        'Album configuration': 'הגדרות אלבום',
        'Printing configuration (BookPod — prep)': 'הגדרות הדפסה (BookPod — הכנה)',
        'Shipping details': 'פרטי משלוח',
        'Prefill from Profile': 'מלא מתוך פרופיל',
        'Find pickup points near this address': 'מצא נקודות איסוף ליד הכתובת הזו',
        'Subtitle (optional)': 'כותרת משנה (אופציונלי)',
        'Gap': 'רווח',
        'Radius': 'רדיוס',
        'Design with AI': 'עיצוב עם AI',
        '✓ Apply Design': '✓ החל עיצוב',
        'Thank you for viewing this photo book': 'תודה שצפיתם באלבום התמונות הזה',

        // Login / marketing strings inside app
        'Photo Book Creator': 'יוצר אלבומים',
        'Create beautiful photo books from your Google Photos': 'צרו אלבומי תמונות יפים מתמונות Google Photos שלכם',
        'Sign in with Google': 'התחבר עם Google',
        'Open Google Photos': 'פתח את Google Photos',
        'Open Google Photos Picker': 'פתח את Google Photos Picker',

        // Gallery / templates / AI
        'Search with AI': 'חיפוש עם AI',
        'Searching for design inspiration...': 'מחפש השראה לעיצוב…',
        'Design Inspiration Results': 'תוצאות השראה לעיצוב',
        'Paper & Textures': 'נייר וטקסטורות',
        'Page Frames': 'מסגרות עמוד',
        'Typography': 'טיפוגרפיה',

        // Pickers / modals
        'Select a Photo': 'בחר תמונה',
        'Selected Photos': 'תמונות שנבחרו',
        'Choose a template for this page': 'בחר תבנית לעמוד הזה',
        'Loading projects...': 'טוען פרויקטים…',
        'Loading albums...': 'טוען אלבומים…',
        'Saved albums': 'אלבומים שמורים',
        'Loading purchases...': 'טוען רכישות…',

        // BookPod / checkout fields
        'Shipping company': 'חברת שילוח',
        'Company (optional)': 'חברה (אופציונלי)',
        'VAT number (optional)': 'מספר עוסק/מע״מ (אופציונלי)',
        'Quantity': 'כמות',
        'Invoice URL (for order)': 'קישור לחשבונית (להזמנה)',

        // Template badge tokens
        'NEW': 'חדש',
        'New': 'חדש',
        'MINIMALIST': 'מינימליסטי',
        'Minimalist': 'מינימליסטי',
        'VINTAGE': 'וינטג׳',
        'Vintage': 'וינטג׳',
        'NATURE': 'טבע',
        'Nature': 'טבע',
        'Cinematic': 'קולנועי',
        'Graphic': 'גרפי',
        'Vintage Botanical': 'בוטניקה וינטג׳',
        'Inspired by 19th-century flora illustrations': 'בהשראת איורי פלורה מהמאה ה‑19',

        // Toasts / completion messages
        'Photo Book': 'אלבום',
        'photo book': 'אלבום',
        'My Photo Book': 'אלבום התמונות שלי',
        'Photo Book Created!': 'האלבום נוצר!',
        'Your photo book is ready.': 'האלבום שלך מוכן.',
        'View': 'צפה',
        'Send to printing': 'שלח להדפסה',
        'PDF exported successfully!': 'ה‑PDF יוצא בהצלחה!',
        'Download PDF': 'הורד PDF',
        'Open': 'פתח',
        'Preview PDF': 'תצוגה מקדימה',
        'Order Print': 'הזמן אלבום מודפס',
        'Left Page': 'עמוד שמאל',
        'Right Page': 'עמוד ימין',
        'Rotate': 'סובב',
        'Add more photos': 'הוסף תמונות',
        'Creating Session...': 'טוען...',
        'Creating Session': 'טוען...',
        'Page Layout': 'עימוד',
        'Single Photo': 'תמונה אחת בעמוד',
        'Two Horizontal': 'שתיים בעמוד - אופקי',
        'Two Vertical': 'שתיים בעמוד - אנכי',
        'Three (Large Left)': 'שלוש בעמוד - גדול משמאל',
        'Three (Large Right)': 'שלוש בעמוד - גדול מימין',
        'Four Grid': 'ארבע בעמוד - רשת',
        'Collage (5 Photos)': "קולאז׳ - 5 תמונות",
        'Collage (6 Photos)': "קולאז׳ - 6 תמונות",
        'Selected Text': 'עריכת טקסט',
        'Global Corners': 'סגנון פינות',
        'Photo Spacing': 'מרווח בין תמונות',
        'Gap': 'רווח',
        'Radius': 'רדיוס',
        'Square (0px)': 'חד (0px)',
        'Subtle (4px)': 'עדין (4px)',
        'Rounded (8px)': 'מעוגל (8px)',
        'Soft (12px)': 'רך (12px)',
        'Modern (16px)': 'מודרני (16px)',
        'Circular (24px)': 'עגול (24px)',
        'Sharp (0px)': 'חד (0px)',
        'Soft (16px)': 'רך (16px)',
    };

    const translated = replaceMap[trimmed];
    if (translated) return raw.replace(trimmed, translated);

    // Partial replacements for longer strings that embed English tokens
    const partialMap = {
        'AI-powered story detection': 'זיהוי סיפור בעזרת AI',
        'STORY': 'סיפור',
        'NEW': 'חדש',
        'New': 'חדש',
        'MINIMALIST': 'מינימליסטי',
        'Minimalist': 'מינימליסטי',
        'VINTAGE': 'וינטג׳',
        'Vintage': 'וינטג׳',
        'NATURE': 'טבע',
        'Nature': 'טבע',
        'Cinematic': 'קולנועי',
        'Graphic': 'גרפי',
        'Timeless elegance with ample whitespace': 'אלגנטיות נצחית עם הרבה מרווחים',
        'Sepia tones and typewriter aesthetics': 'גווני ספיה ואסתטיקת מכונת כתיבה',
        'Design with AI': 'עיצוב עם AI',
        'Apply Design': 'החל עיצוב',
        'Shipping details': 'פרטי משלוח',
        'Select a Photo': 'בחר תמונה',
        'Selected Photos': 'תמונות שנבחרו',
        'Choose a template for this page': 'בחר תבנית לעמוד הזה',
        'Loading projects...': 'טוען פרויקטים…',
        'Loading albums...': 'טוען אלבומים…',
        'Loading purchases...': 'טוען רכישות…',
        'Search with AI': 'חיפוש עם AI',
        'Searching for design inspiration...': 'מחפש השראה לעיצוב…',
        'Design Inspiration Results': 'תוצאות השראה לעיצוב',
        'Paper & Textures': 'נייר וטקסטורות',
        'Page Frames': 'מסגרות עמוד',
        'Typography': 'טיפוגרפיה',
        'Sign in with Google': 'התחבר עם Google',
        'Create beautiful photo books from your Google Photos': 'צרו אלבומי תמונות יפים מתמונות Google Photos שלכם',
        'Open Google Photos': 'פתח את Google Photos',
        'Open Google Photos Picker': 'פתח את Google Photos Picker',
        'STORY': 'סיפור',
        'Story': 'סיפור',
        'NEW': 'חדש',
        'New': 'חדש',
        'MINIMALIST': 'מינימליסטי',
        'Minimalist': 'מינימליסטי',
        'VINTAGE': 'וינטג׳',
        'Vintage': 'וינטג׳',
        'NATURE': 'טבע',
        'Nature': 'טבע',
        'Cinematic': 'קולנועי',
        'Graphic': 'גרפי',
        'Vintage Botanical': 'בוטניקה וינטג׳',
        'Inspired by 19th-century flora illustrations': 'בהשראת איורי פלורה מהמאה ה‑19',
        'Nana Banana AI': 'ננה בננה AI',
        'Photo Book Created!': 'הספר נוצר!',
        'Your photo book is ready.': 'האלבום שלך מוכן.',
        'Send to printing': 'שלח להדפסה',
        'PDF exported successfully!': 'ה‑PDF יוצא בהצלחה!',
        'Download PDF': 'הורד PDF',
    };
    let out = raw;
    Object.entries(partialMap).forEach(([from, to]) => {
        if (!from) return;
        if (out.includes(from)) out = out.split(from).join(to);
    });

    // Regex replacements for strings with variable whitespace / mixed nodes
    const regexMap = [
        // Force “photo book” -> “album” to avoid awkward token mixes like "תמונה ספר"
        { re: /\bmy\s+photo\s+book\b/gi, to: 'אלבום התמונות שלי' },
        { re: /\bphoto\s+books\b/gi, to: 'אלבומים' },
        { re: /\bphoto\s+book\b/gi, to: 'אלבום' },
        { re: /תמונה\s*ספר/g, to: 'אלבום' },
        { re: /Open\s+Google\s+Photos\s+Picker/gi, to: 'פתח את Google Photos Picker' },
        { re: /Open\s+Google\s+Photos/gi, to: 'פתח את Google Photos' },
        { re: /Create\s+beautiful\s+photo\s+books\s+from\s+your\s+Google\s+Photos/gi, to: 'צרו אלבומי תמונות יפים מתמונות Google Photos שלכם' },
        // Some UIs embed these tokens with odd separators; avoid word-boundary misses.
        { re: /new/gi, to: 'חדש' },
        { re: /minimalist/gi, to: 'מינימליסטי' },
        { re: /vintage/gi, to: 'וינטג׳' },
        { re: /nature/gi, to: 'טבע' },
        { re: /cinematic/gi, to: 'קולנועי' },
        { re: /graphic/gi, to: 'גרפי' },
        { re: /AI\s+analyzed\s+your\s+photos\s+and\s+found\s+a\s+narrative/gi, to: 'ה‑AI ניתח את התמונות ומצא סיפור' },
        { re: /\bDetected\b/gi, to: 'זוהה' },
        { re: /\bCustomize\b/gi, to: 'התאם' },
        { re: /\bUse\s+This\b/gi, to: 'השתמש בזה' },
        { re: /Photo\s+Book\s+Created!/gi, to: 'האלבום נוצר!' },
        { re: /Your\s+photo\s+book\s+is\s+ready\./gi, to: 'האלבום שלך מוכן.' },
        { re: /PDF\s+exported\s+successfully!/gi, to: 'ה‑PDF יוצא בהצלחה!' },
        { re: /Download\s+PDF/gi, to: 'הורד PDF' },
    ];
    regexMap.forEach(({ re, to }) => {
        try { out = out.replace(re, to); } catch { /* ignore */ }
    });

    // Token-level translation fallback (covers remaining UI strings without enumerating every sentence)
    // This runs last so explicit phrase translations above win.
    try {
        // Avoid translating URLs / code-like strings
        const lower = String(out).toLowerCase();
        const looksLikeUrl = lower.includes('http://') || lower.includes('https://') || lower.includes('://');
        const looksLikePath = lower.includes('\\\\') || lower.includes('/');
        const looksLikeAsset =
            lower.includes('.js') || lower.includes('.css') ||
            lower.includes('.png') || lower.includes('.jpg') || lower.includes('.jpeg') ||
            lower.includes('.pdf');
        if (looksLikeUrl || (looksLikePath && looksLikeAsset)) return out;

        const wordMap = {
            // Common UI
            'loading': 'טוען',
            'load': 'טען',
            'projects': 'פרויקטים',
            'project': 'פרויקט',
            'albums': 'אלבומים',
            'album': 'אלבום',
            'photos': 'תמונות',
            'photo': 'תמונה',
            'selected': 'נבחרו',
            'select': 'בחר',
            'choose': 'בחר',
            'template': 'תבנית',
            'templates': 'תבניות',
            'page': 'עמוד',
            'pages': 'עמודים',
            'overview': 'סקירה',
            'thumbnails': 'תצוגות מקדימות',
            'settings': 'הגדרות',
            'tools': 'כלים',
            'design': 'עיצוב',
            'gallery': 'גלריה',
            'typography': 'טיפוגרפיה',
            'frames': 'מסגרות',
            'background': 'רקע',
            'image': 'תמונה',
            'color': 'צבע',
            'text': 'טקסט',
            'title': 'כותרת',
            'subtitle': 'כותרת משנה',
            'alignment': 'יישור',
            'left': 'שמאל',
            'right': 'ימין',
            'center': 'מרכז',
            'size': 'גודל',
            'angle': 'זווית',
            'radius': 'רדיוס',
            'corners': 'פינות',
            'border': 'מסגרת',
            'logo': 'לוגו',
            'upload': 'העלה',
            'remove': 'הסר',
            'delete': 'מחק',
            'edit': 'ערוך',
            'apply': 'החל',
            'save': 'שמור',
            'close': 'סגור',
            'cancel': 'ביטול',
            'refresh': 'רענן',
            'shuffle': 'ערבב',
            'clear': 'נקה',
            'generate': 'צור',
            'export': 'ייצוא',
            'download': 'הורד',
            'printing': 'הדפסה',
            'shipping': 'משלוח',
            'details': 'פרטים',
            'method': 'שיטה',
            'company': 'חברה',
            'quantity': 'כמות',
            'invoice': 'חשבונית',
            'url': 'קישור',
            'optional': 'אופציונלי',
            'profile': 'פרופיל',

            // Domain / marketing
            'book': 'אלבום',
            'books': 'אלבומים',
            'created': 'נוצר',
            'ready': 'מוכן',
            'story': 'סיפור',
            'detected': 'זוהה',
            'new': 'חדש',
            'minimalist': 'מינימליסטי',
            'vintage': 'וינטג׳',
            'nature': 'טבע',
            'cinematic': 'קולנועי',
            'graphic': 'גרפי',

            // Brands / tech
            'google': 'גוגל',
            'pdf': 'PDF',
            'ai': 'AI',
            'open': 'פתח',
        };

        // Replace whole-word tokens case-insensitively while preserving original punctuation.
        // We only translate ASCII words; Hebrew/emoji remain unchanged.
        out = out.replace(/[A-Za-z][A-Za-z']*/g, (w) => {
            const key = w.toLowerCase();
            // Don't break font name "Open Sans"
            if (key === 'open' && /open\s+sans/i.test(out)) return w;
            return wordMap[key] || w;
        });
    } catch { /* ignore */ }
    return out;
}

function __i18nTranslateAttributes() {
    const attrs = ['title', 'aria-label', 'data-tooltip', 'placeholder'];
    document.querySelectorAll('*').forEach(el => {
        if (!el) return;
        if (el.closest && el.closest('script, style')) return;
        attrs.forEach(attr => {
            const v = el.getAttribute && el.getAttribute(attr);
            if (!v) return;
            const next = __i18nTranslateString(v);
            if (next !== v) {
                __i18nRememberAttr(el, attr, v);
                __i18nTouchedAttrs.add({ el, attr });
                el.setAttribute(attr, next);
            }
        });
    });
}

function __i18nTranslateTextNodes() {
    const walker = document.createTreeWalker(document.body || document.documentElement, NodeFilter.SHOW_TEXT, {
        acceptNode(node) {
            if (!node || node.nodeType !== 3) return NodeFilter.FILTER_REJECT;
            const p = node.parentElement;
            if (!p) return NodeFilter.FILTER_REJECT;
            const tag = (p.tagName || '').toLowerCase();
            if (tag === 'script' || tag === 'style' || tag === 'textarea' || tag === 'code' || tag === 'pre') return NodeFilter.FILTER_REJECT;
            // Skip if whitespace only
            if (!String(node.nodeValue || '').trim()) return NodeFilter.FILTER_REJECT;
            return NodeFilter.FILTER_ACCEPT;
        }
    });
    const nodes = [];
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    nodes.forEach(node => {
        const v = String(node.nodeValue || '');
        const next = __i18nTranslateString(v);
        if (next !== v) {
            if (!__i18nTextNodeOrig.has(node)) __i18nTextNodeOrig.set(node, v);
            __i18nTouchedTextNodes.add(node);
            node.nodeValue = next;
        }
    });
}

let __i18nObserver = null;
let __i18nScheduled = false;
function ensureI18nObserver() {
    if (__i18nObserver) return;
    __i18nObserver = new MutationObserver(() => {
        if (getUiLang() !== 'he') return;
        if (__i18nScheduled) return;
        __i18nScheduled = true;
        requestAnimationFrame(() => {
            __i18nScheduled = false;
            try { applyTranslations(); } catch { /* ignore */ }
        });
    });
    __i18nObserver.observe(document.documentElement, { subtree: true, childList: true, characterData: true });
}

function applyTranslations() {
    if (getUiLang() !== 'he') {
        __i18nRestoreAll();
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!key) return;
        el.textContent = t(key, el.textContent);
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (!key) return;
        el.setAttribute('placeholder', t(key, el.getAttribute('placeholder') || ''));
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (!key) return;
        el.setAttribute('title', t(key, el.getAttribute('title') || ''));
    });

    // Option text (keep value stable)
    const coverLayout = document.getElementById('coverLayout');
    if (coverLayout) {
        const m = {
            'standard': getUiLang() === 'he' ? 'סטנדרט (תמונה למעלה)' : 'Standard (Photo Top)',
            'full-bleed': getUiLang() === 'he' ? 'תמונה מלאה' : 'Full Bleed',
            'photo-bottom': getUiLang() === 'he' ? 'תמונה למטה' : 'Photo Bottom',
        };
        Array.from(coverLayout.options || []).forEach(opt => {
            if (m[opt.value]) opt.textContent = m[opt.value];
        });
    }

    if (getUiLang() === 'he') {
        __i18nTranslateAttributes();
        __i18nTranslateTextNodes();
        ensureI18nObserver();
    }
}

function setUiLanguage(lang) {
    state.ui.lang = lang;
    localStorage.setItem('shoso_ui_lang', lang);
    // In Hebrew, default to RTL; in English, default to LTR
    if (lang === 'he') {
        state.ui.dir = 'rtl';
        localStorage.setItem('shoso_ui_dir', 'rtl');
        // If the user never edited the default title, localize it
        try {
            if (state?.cover && state.cover.title === 'My Photo Book') {
                state.cover.title = 'אלבום התמונות שלי';
            }
        } catch { /* ignore */ }
    } else if (lang === 'en') {
        state.ui.dir = 'ltr';
        localStorage.setItem('shoso_ui_dir', 'ltr');
    }
    applyUiDirection();
    applyTranslations();
    try { renderCurrentPage(); } catch { /* ignore */ }
}

// Expose for inline onclick handlers in index.html
window.setUiDirection = setUiDirection;
window.setUiLanguage = setUiLanguage;

// Ensure translations apply once DOM exists (even before/without initialize)
document.addEventListener('DOMContentLoaded', () => {
    try { applyTranslations(); } catch { /* ignore */ }
});

function isPhotosAuthRequiredError(err) {
    const code = err && (err.code || err?.details?.code);
    if (code === 'PHOTOS_AUTH_REQUIRED') return true;
    const msg = String(err?.message || err?.error || '');
    return msg.includes('PHOTOS_AUTH_REQUIRED') || msg.toLowerCase().includes('user not authorized');
}


function showAuthFallbackModal(authUrl) {
    let modal = document.getElementById('auth-fallback-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'auth-fallback-modal';
        modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:9999;display:flex;justify-content:center;align-items:center;flex-direction:column;color:white;text-align:center;font-family:sans-serif;';
        modal.innerHTML = `
            <div style="background:#fff;color:#333;padding:30px;border-radius:12px;max-width:400px;box-shadow:0 10px 25px rgba(0,0,0,0.5);">
                <h3 style="margin-top:0;font-size:20px;">Authorization Required</h3>
                <p style="margin:15px 0;">We need your permission to access Google Photos.</p>
                <a id="auth-fallback-link" href="${authUrl}" target="_blank" style="display:inline-block;background:#1a73e8;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;font-weight:bold;margin:10px 0;font-size:16px;">Click here to Authorize</a>
                <p style="font-size:0.9em;color:#666;margin-top:15px;">After authorizing, close the new tab. This window will detect the change automatically.</p>
                <div style="margin-top:20px;border-top:1px solid #eee;padding-top:15px;">
                     <button onclick="document.getElementById('auth-fallback-modal').remove()" style="background:none;border:none;text-decoration:underline;cursor:pointer;color:#888;">Cancel</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } else {
        const link = modal.querySelector('#auth-fallback-link');
        if (link) link.href = authUrl;
        modal.style.display = 'flex';
    }
}

function hideAuthFallbackModal() {
    const modal = document.getElementById('auth-fallback-modal');
    if (modal) modal.remove();
}

async function requestGooglePhotosAuthorization(purpose = 'access your Google Photos') {
    try {
        const res = await callFunction('getAuthUrl');
        if (res?.authUrl) {
            console.log("Got auth URL, attempting open and showing fallback:", res.authUrl);

            // 1. Try to open automatically (might be blocked)
            // 1. Try to open automatically (might be blocked)
            try {
                const popup = window.open(res.authUrl, '_blank', 'noopener,noreferrer');
                if (!popup || popup.closed || typeof popup.closed === 'undefined') {
                    console.warn("Popup blocked or closed immediately.");
                }
            } catch (popupError) {
                console.warn("window.open failed:", popupError);
            }

            // 2. Always show the fallback modal to ensure the user can proceed if popup is blocked
            //    or if they just missed it. It will be dismissed automatically by waitForGooglePhotosAuthorization.
            showAuthFallbackModal(res.authUrl);

            return true;
        }
    } catch (e) {
        console.warn('Failed to get auth URL:', e);
        alert('Failed to initiate authorization: ' + (e.message || e));
    }
    return false;
}

async function waitForGooglePhotosAuthorization(testBaseUrl, timeoutMs = 120000) { // Increased timeout
    const start = Date.now();
    const u = normalizeBaseUrl(testBaseUrl);
    if (!u) {
        hideAuthFallbackModal();
        return true;
    }

    console.log("Waiting for authorization...");
    while (Date.now() - start < timeoutMs) {
        // Check if modal still exists (if user cancelled, stop waiting)
        if (!document.getElementById('auth-fallback-modal')) {
            console.log("Auth wait cancelled by user.");
            return false;
        }

        try {
            const res = await callFunction('fetchThumbnailBatch', { baseUrls: [u] });
            if (res?.success && Array.isArray(res?.thumbnails) && res.thumbnails.some(t => t && t.thumbnailUrl)) {
                console.log("Authorization successful!");
                hideAuthFallbackModal();
                return true;
            }
        } catch (e) {
            // ignore; retry
        }
        await sleep(3000);
    }
    console.warn("Authorization timed out.");
    hideAuthFallbackModal();
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

/**
 * Robustly fetch thumbnails, automatically refreshing expired URLs if needed.
 * @param {Array<Object>} items - Array of objects { id, baseUrl, isLocal, ... }
 * @param {Object} opts - { batchSize, onProgress(current, total) }
 * @returns {Promise<Map<string, string>>} Map of currentBaseUrl -> thumbnailUrl
 */
async function refreshAndFetchThumbnails(items, opts = {}) {
    const { batchSize = 12, onProgress } = opts;
    const itemsToFetch = items.filter(i => i && i.baseUrl && !i.isLocal);
    if (itemsToFetch.length === 0) return new Map();

    const map = new Map();
    const failedItems = [];
    const total = itemsToFetch.length;
    let processed = 0;

    // 1. Initial Fetch in Batches
    for (let i = 0; i < total; i += batchSize) {
        const chunkItems = itemsToFetch.slice(i, i + batchSize);
        const chunkUrls = chunkItems.map(c => c.baseUrl);

        try {
            const res = await callFunction('fetchThumbnailBatch', { baseUrls: chunkUrls });

            // DEBUG LOGGING
            console.log(`[DEBUG-Refresh] Batch ${i} result:`, res.success, res.thumbnails?.length);

            if (res.success && Array.isArray(res.thumbnails)) {
                res.thumbnails.forEach((t, idx) => {
                    const originalItem = chunkItems[idx];
                    if (t.success && t.thumbnailUrl) {
                        map.set(t.baseUrl, t.thumbnailUrl);
                    } else {
                        // Mark for potential refresh if it has an ID
                        if (originalItem.id) {
                            console.log(`[DEBUG-Refresh] Item failed, has ID: ${originalItem.id}, queuing refresh.`);
                            failedItems.push(originalItem);
                        } else {
                            console.warn(`[DEBUG-Refresh] Item failed but MISSING ID. Cannot refresh.`, originalItem);
                        }
                    }
                });
            } else {

                // Whole batch failed (e.g. 403 or other error)
                // Assume all with IDs might need refresh
                chunkItems.forEach(item => {
                    if (item.id) failedItems.push(item);
                });
            }
        } catch (e) {
            console.warn("Fetch batch failed, marking for refresh logic:", e);
            chunkItems.forEach(item => {
                if (item.id) failedItems.push(item);
            });
        }

        processed += chunkItems.length;
        if (typeof onProgress === 'function') {
            onProgress(processed, total);
        }
    }

    // 2. Refresh Failed Items
    if (failedItems.length > 0) {
        console.log(`Attempting to auto-refresh ${failedItems.length} expired items...`);
        // Deduplicate IDs
        const idsToRefresh = [...new Set(failedItems.map(i => i.id))];

        try {
            const refreshRes = await callFunction('refreshMediaItemUrls', { mediaItemIds: idsToRefresh });

            if (refreshRes.success) {
                const returnedCount = refreshRes.urls ? Object.keys(refreshRes.urls).length : 0;
                console.log(`[DEBUG-Refresh] Backend returned ${returnedCount} updated URLs.`);
                if (returnedCount > 0) {
                    console.log(`[DEBUG-Refresh] Sample URL key: ${Object.keys(refreshRes.urls)[0]}`);
                    console.log(`[DEBUG-Refresh] Sample Failed Item ID: ${failedItems[0].id}`);
                }

                if (refreshRes.inputDebug) {
                    console.info("[DEBUG-Refresh] Backend Input Debug:", refreshRes.inputDebug);
                }

                if (refreshRes.debug) {
                    console.info("[DEBUG-Refresh] Backend Debug Data:", refreshRes.debug);
                }

                if (refreshRes.errors && refreshRes.errors.length > 0) {
                    console.warn(`[DEBUG-Refresh] Backend reported ${refreshRes.errors.length} errors.`);
                    console.warn(`[DEBUG-Refresh] Sample Error:`, JSON.stringify(refreshRes.errors[0]));

                    // Check for token issues
                    const sampleError = refreshRes.errors[0];
                    if (sampleError?.status?.code === 403 ||
                        sampleError?.status?.message?.includes?.('UNAUTHENTICATED') ||
                        sampleError?.message?.includes?.('expired')) {
                        console.error("Token expired or invalid scopes. User needs REPAIR.");
                        // Show the button if it's not already there
                        // Repair Connection button removed per request.
                    }
                }

                if (refreshRes.success && refreshRes.urls) {
                    const scopeOrAuthIssue = Array.isArray(refreshRes.errors) && refreshRes.errors.some(e => {
                        const status = e?.status?.code ?? e?.status;
                        const text = String(e?.text || e?.message || e?.status?.message || '');
                        return status === 403 || text.includes('insufficient authentication scopes');
                    });
                    const returnedIds = new Set(Object.keys(refreshRes.urls));
                    const retryItems = [];
                    let refreshedCount = 0;

                    failedItems.forEach(item => {
                        const originalUrl = item.baseUrl;
                        const newUrl = refreshRes.urls[item.id];

                        if (newUrl) {
                            refreshedCount++;
                            if (newUrl !== originalUrl) {
                                // Update the item's baseUrl in place
                                item.baseUrl = newUrl;
                                retryItems.push(item);
                                console.log(`[DEBUG-Refresh] Updated URL for item ${item.id}`);
                            } else {
                                console.log(`[DEBUG-Refresh] URL for item ${item.id} is unchanged.`);
                                // Even if unchanged, if it was in failedItems, we should retry fetching its thumbnail
                                retryItems.push(item);
                            }
                        } else {
                            // Backend succeeded but didn't return this ID.
                            // If this is a scope/auth issue, do NOT mark as permanent failure:
                            // the user can repair permissions and we can retry fetching thumbnails.
                            if (scopeOrAuthIssue) {
                                console.warn(`[DEBUG-Refresh] Item ${item.id} missing from refresh response due to scope/auth issue. Keeping for retry.`);
                                retryItems.push(item);
                            } else {
                                // Permanent Failure (deleted/invalid)
                                console.warn(`[DEBUG-Refresh] Item ${item.id} not found in backend response. Marking as permanently failed.`);
                                // Do NOT add to failedItems. Just give up on this one.
                                // Optionally, we could remove it from the UI or show an error placeholder.
                            }
                        }
                    });

                    if (refreshedCount > 0) {
                        console.log(`Successfully refreshed ${refreshedCount} items. Retrying fetch...`);

                        // 3. Retry Fetch for refreshed items
                        // We can do this in one big batch or chunked. 
                        // Given it's a retry, one batch or larger chunks is fine.
                        const retryUrls = retryItems.map(i => i.baseUrl);
                        const retryBatchSize = 20;

                        for (let j = 0; j < retryUrls.length; j += retryBatchSize) {
                            const batchUrls = retryUrls.slice(j, j + retryBatchSize);
                            try {
                                const retryRes = await callFunction('fetchThumbnailBatch', { baseUrls: batchUrls });
                                if (retryRes.success && retryRes.thumbnails) {
                                    retryRes.thumbnails.forEach(t => {
                                        if (t.success && t.thumbnailUrl) {
                                            map.set(t.baseUrl, t.thumbnailUrl);
                                        }
                                    });
                                }
                            } catch (e) {
                                console.error("Retry fetch failed:", e);
                            }
                        }
                    } else {
                        console.warn("Refresh returned success but no new URLs were mapped.");
                    }
                }
            }
        } catch (e) {
            console.error("Auto-refreshing URLs failed:", e);
        }
    }

    return map;
}

async function rehydrateThumbnailsFromBaseUrls() {
    try {
        // Collect all photo objects that might need fetching
        const allItems = [];
        const pushItem = (p) => {
            if (p && !p.isLocal && (p.baseUrl || p.getUrl)) {
                // Ensure it has a baseUrl property if it's a simple object or handle safely
                if (!p.baseUrl && p.url) p.baseUrl = p.url;
                if (p.baseUrl) allItems.push(p);
            }
        };

        if (state.cover?.photo) pushItem(state.cover.photo);
        (state.selectedPhotos || []).forEach(p => pushItem(p));
        (state.pages || []).forEach(page => {
            (page.photos || []).forEach(p => pushItem(p));
        });

        if (allItems.length === 0) return;

        console.log(`Rehydrating ${allItems.length} thumbnails (with auto-refresh support)...`);

        // This helper updates p.baseUrl in place if refreshed!
        const map = await refreshAndFetchThumbnails(allItems, {
            batchSize: 12,
            onProgress: (curr, total) => {
                // Optional: could show a toast or loader
            }
        });

        if (!map || map.size === 0) return;

        // Apply thumbnails
        allItems.forEach(p => {
            // p.baseUrl might have been updated by refreshAndFetchThumbnails
            if (p.baseUrl && map.has(p.baseUrl)) {
                p.thumbnailUrl = map.get(p.baseUrl);
            }
        });

        // Trigger Repaint
        console.log("Rehydration complete. Triggering repaint.");
        if (typeof renderCurrentPage === 'function') renderCurrentPage();
        if (typeof updateSelectedPhotosUI === 'function') updateSelectedPhotosUI();

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
    console.log("tryRestoreDraftIfNeeded calling getDraftFromStorage...");
    const draft = getDraftFromStorage();
    if (!draft) {
        console.log("tryRestoreDraftIfNeeded: No draft found.");
        return false;
    }

    // If we have a saved project ID, prefer that path (loadProject handles view + persistence).
    if (draft.activeProjectId) {
        console.log("tryRestoreDraftIfNeeded: Draft has activeProjectId, skipping restore (should use loadProject).");
        return false;
    }

    // Restore Memory Director draft
    if (draft.memoryDirector) {
        console.log("tryRestoreDraftIfNeeded: Restoring Memory Director draft.");
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
    console.log(`waitForTemplatesReady called with timeout ${timeoutMs}ms`);
    return new Promise((resolve) => {
        const start = Date.now();
        const tick = () => {
            const ok = (typeof window.PHOTO_BOOK_TEMPLATES !== 'undefined' || typeof PHOTO_BOOK_TEMPLATES !== 'undefined');
            if (ok) {
                console.log("waitForTemplatesReady: Templates found!");
                return resolve(true);
            }
            if (Date.now() - start >= timeoutMs) {
                console.warn("waitForTemplatesReady: Timed out waiting for templates.");
                return resolve(false);
            }
            setTimeout(tick, 50);
        };
        tick();
    });
}

let didAutoRestoreLastProject = false;

// Expose state for debugging
window.state = state;
console.log('AppJS: Initializing, state exposed to window', state);

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
    // Core App State & Functions - Explicitly exposed for template-gallery.js
    window.state = state;
    window.applyTemplate = applyTemplate;
    window.initializeEditor = initializeEditor;
    window.renderCurrentPage = renderCurrentPage;
    window.updateCoverPreview = updateCoverPreview;
    window.updateBackCoverPreview = updateBackCoverPreview;
    console.log('[DEBUG-App] Core globals exposed successfully');
} catch (e) {
    console.error("Failed to attach Core App globals:", e);
}

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
    console.log('[DEBUG-App] Memory Director globals exposed successfully');
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

    // Persist template properties to state for PDF Generator
    state.template = template.id;
    state.decorations = template.decorations || { enabled: false };
    state.borderStyle = template.illustrations?.border || 'none';

    // === NEW: Auto-Apply Cover Design from Gallery ===
    const bgDesign = window.BACKGROUND_TEXTURES?.find(bg => bg.id === template.id);
    if (bgDesign) {
        console.log("Auto-applying cover design:", bgDesign.name);

        // Ensure state.cover exists
        if (!state.cover) state.cover = {};

        // Apply Background URL
        // Use absolute URL to be safe for PDF generation
        const absUrl = new URL(bgDesign.url, window.location.href).href;
        state.cover.backgroundImageUrl = absUrl;
        state.cover.backgroundImageName = bgDesign.name;
        state.cover.backgroundImageData = null; // Clear manual upload

        // Apply Theme Props
        if (bgDesign.theme) {
            state.cover.themeColors = bgDesign.theme.colors;
            if (bgDesign.theme.fonts) {
                state.cover.titleFont = bgDesign.theme.fonts.serif;
                state.cover.subtitleFont = bgDesign.theme.fonts.sans;
            }
        }
    }

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

        // Priority: 
        // 1. Text Color from Background Design (if one was auto-applied)
        // 2. Template Cover Title Color (from templates.js)
        // 3. Calculated Contrast Color

        let targetTitleColor = coverTextColor;
        if (template.cover && template.cover.titleColor) {
            targetTitleColor = template.cover.titleColor;
        } else if (bgDesign && bgDesign.textColor) {
            targetTitleColor = bgDesign.textColor;
            console.log("Using Background Design text color:", targetTitleColor);
        }

        state.cover.titleColor = targetTitleColor;
        state.cover.titleFont = template.cover.titleFont || titleFontValue;
        state.cover.titleSize = template.cover.titleSize || state.cover.titleSize || 36;

        // Ensure inputs are updated with the FINAL decision
        if (coverTitleColor) coverTitleColor.value = targetTitleColor;
        if (coverTitleColorText) coverTitleColorText.value = targetTitleColor;

        // Also update root variable for immediate CSS usage
        root.style.setProperty('--cover-text-color', targetTitleColor);
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

    // Update cover preview to apply template assets (overlays, borders)
    if (typeof updateCoverPreview === 'function') {
        updateCoverPreview();
    }
    if (typeof updateBackCoverPreview === 'function') {
        updateBackCoverPreview();
    }

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

        // CRITICAL: Update cover title color input to ensure contrast against the new cover color
        // This fixes the issue where text remains white on light backgrounds
        // REMOVED: Redundant and incorrect update of coverTitleColor here.
        // It is correctly handled in applyTemplate() using template-specific logic.
        /*
        const titleColorInput = document.getElementById('coverTitleColor');
        if (titleColorInput) {
            titleColorInput.value = coverTextColor;
            // Also update state immediately so updateCoverPreview picks it up validly
            if (state.cover) {
                state.cover.titleColor = coverTextColor;
            }
        }
        */
    }

    // Ensure cover assets are updated for the new template
    if (typeof updateCoverPreview === 'function') {
        updateCoverPreview();
    }


    // Update 3D book spine colors
    try {
        const spines = document.querySelectorAll('.book3d-cover-spine');
        if (spines.length > 0) {
            spines.forEach(spine => {
                spine.style.setProperty('--cover-color', primaryColor);
            });
        }
    } catch (e) {
        console.error('Error updating spines:', e);
    }

    if (typeof renderCurrentPage !== 'undefined') {
        console.log('AppJS: applyTemplateToUI calling renderCurrentPage');
        renderCurrentPage();
    } else {
        console.error('AppJS: renderCurrentPage is undefined');
    }
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
    console.log("[DEBUG_AUTH] signInWithGoogle called");
    // FAILSAFE: Ensure we are not on 127.0.0.1 before trying auth
    if (window.location.hostname === '127.0.0.1') {
        const port = window.location.port ? ':' + window.location.port : '';
        let search = window.location.search;

        // Pass the selected template in the URL to survive the redirect (localStorage is not shared)
        if (state.selectedTemplate && state.selectedTemplate.id) {
            const separator = search ? '&' : '?';
            search += `${separator}restoreTemplate=${encodeURIComponent(state.selectedTemplate.id)}`;
            console.log('[DEBUG_AUTH] Appending restoreTemplate to redirect URL:', state.selectedTemplate.id);
        }

        const newUrl = 'http://localhost' + port + window.location.pathname + search + window.location.hash;
        console.warn('[DEBUG_AUTH] Redirecting from 127.0.0.1 to localhost for Firebase Auth compatibility...');
        window.location.href = newUrl;
        return;
    }

    if (window.location.hostname === 'localhost') {
        console.warn('[DEBUG_AUTH] Localhost detected: Using Anonymous Auth to avoid Popup/Redirect loops.');
        try {
            await firebase.auth().signInAnonymously();
            console.log('[DEBUG_AUTH] Anonymous auth successful');
            return;
        } catch (error) {
            console.error('[DEBUG_AUTH] Anonymous auth failed:', error);
        }
    }

    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.addScope('https://www.googleapis.com/auth/photospicker.mediaitems.readonly');
        provider.addScope('https://www.googleapis.com/auth/photoslibrary.readonly');
        provider.addScope('https://www.googleapis.com/auth/presentations');
        provider.addScope('https://www.googleapis.com/auth/drive');

        // Prefer popup to avoid full-page reload (which loses selected template / flow state).
        console.log('[DEBUG_AUTH] Attempting signInWithPopup...');
        try {
            const result = await firebase.auth().signInWithPopup(provider);
            console.log('[DEBUG_AUTH] signInWithPopup success:', result.user ? result.user.uid : 'no user');
        } catch (error) {
            console.warn('[DEBUG_AUTH] Popup sign-in failed:', error);
            // CRITICAL FIX: Do NOT automatically fall back to redirect if popup fails.
            // This causes the infinite loop / bouncing behavior if the environment blocks popups or has config issues.
            // Instead, alert the user and let them decide or try again.
            if (error.code === 'auth/popup-blocked' || error.code === 'auth/popup-closed-by-user') {
                alert('Sign-in popup was blocked or closed. Please allow popups for this site and try again.');
            } else {
                const proceed = confirm(`Sign-in popup failed (${error.message}).\n\nDo you want to try redirecting to Google Sign-in page instead? (This will reload the app)`);
                if (proceed) {
                    console.log('[DEBUG_AUTH] User approved fallback to redirect...');
                    await firebase.auth().signInWithRedirect(provider);
                }
            }
        }
    } catch (error) {
        console.error('[DEBUG_AUTH] Sign-in error:', error);
        alert('Failed to sign in. Please try again.\n\nError: ' + error.message);
    }
}

async function signOut() {
    try {
        clearDraftFromStorage();
        // Clear other session keys
        localStorage.removeItem(STORAGE_KEYS.lastProjectId);
        localStorage.removeItem(STORAGE_KEYS.lastProjectType);
        localStorage.removeItem(STORAGE_KEYS.lastProjectTitle);
        localStorage.removeItem(STORAGE_KEYS.selectedPhotos); // If it exists

        await firebase.auth().signOut();
        window.location.reload();
    } catch (error) {
        console.error('Sign-out error:', error);
    }
}

// ============================================
// INITIALIZATION
// ============================================

function checkLocalhostRedirect() {
    if (window.location.hostname === '127.0.0.1') {
        const port = window.location.port ? ':' + window.location.port : '';
        const newUrl = 'http://localhost' + port + window.location.pathname + window.location.search + window.location.hash;
        console.warn('Redirecting from 127.0.0.1 to localhost for Firebase Auth compatibility...');
        window.location.href = newUrl;
        return true;
    }
    return false;
}

// Refactored auth handler
async function handleUserAuth(user) {
    console.log("[DEBUG_AUTH] handleUserAuth state change:", user ? user.uid : 'null');
    state.user = user;
    if (user) {
        console.log("User signed in:", user.uid);
        // Hide login screen
        const loginScreen = document.getElementById('loginScreen');
        if (loginScreen) loginScreen.style.display = 'none';

        // Auto-restore last opened saved album on refresh.
        // If the user never saved / never loaded an album before, there is nothing to restore.
        // CHECK: If user already picked a template (e.g. before logging in?), don't overwrite it.
        if (!didAutoRestoreLastProject && !state.selectedTemplate) {
            didAutoRestoreLastProject = true;
            const lastId = getLastProjectIdFromStorage();
            if (lastId) {
                await waitForTemplatesReady(2500);
                await loadProject(lastId, { suppressErrors: true, closeModal: false });
                if (!state.activeProjectId) {
                    await tryRestoreDraftIfNeeded();
                }
            } else {
                await tryRestoreDraftIfNeeded();
            }
        }

        // If we initiated auth from the Picker flow, resume automatically after redirect.
        try {
            const post = sessionStorage.getItem('shoso_post_signin_action');
            if (post === 'loadPicker') {
                console.log("[DEBUG_AUTH] Found post-signin action 'loadPicker'. Resuming...");
                sessionStorage.removeItem('shoso_post_signin_action');
                setTimeout(() => {
                    try { if (typeof loadPicker === 'function') loadPicker(); } catch { /* ignore */ }
                }, 50);
            }
        } catch { /* ignore */ }
    }
}

async function initialize() {
    if (checkLocalhostRedirect()) return;

    // Apply RTL/LTR early (auto-detect may adjust later as user types)
    try { applyUiDirection(); } catch { /* ignore */ }

    // CHECK URL FOR RESTORED TEMPLATE (passed during localhost redirect)
    try {
        const params = new URLSearchParams(window.location.search);
        const restoreId = params.get('restoreTemplate');
        if (restoreId) {
            console.log('Restoring template from URL:', restoreId);
            // Wait for templates to be ready, then select
            waitForTemplatesReady().then(() => {
                if (typeof selectTemplate !== 'undefined') {
                    selectTemplate(restoreId);
                }
            });
            // Set a temporary flag so the view switcher doesn't default to gallery immediately
            state.selectedTemplate = { id: restoreId, _pendingRestore: true };
        }
    } catch (e) {
        console.warn('Error checking restoreTemplate:', e);
    }

    // Restore template after auth redirect / refresh
    try {
        if (!state.selectedTemplate) {
            const savedId = localStorage.getItem('shoso_selected_template_id');
            const templatesObj = window.PHOTO_BOOK_TEMPLATES || (typeof PHOTO_BOOK_TEMPLATES !== 'undefined' ? PHOTO_BOOK_TEMPLATES : {});
            if (savedId && templatesObj && templatesObj[savedId]) {
                state.selectedTemplate = templatesObj[savedId];
                state.currentTheme = savedId;
            }
        }
    } catch { /* ignore */ }

    try {
        console.log("Initializing app...");

        // Set up auth state listener and require Google sign-in
        firebase.auth().onAuthStateChanged(async (user) => {
            await handleUserAuth(user);
        });

        // Show template gallery if no template selected
        // Wait a tick to let stored project load if happening
        setTimeout(() => {
            // If we are in AI Auto Design flow, stay in editor (no "selectedTemplate" yet).
            if (!state.selectedTemplate && !state.activeProjectId && !state._aiAutoDesignMode) {
                const galleryView = document.getElementById('templateGalleryView');
                const editorView = document.getElementById('editorView');
                const mdView = document.getElementById('memoryDirectorView');
                if (galleryView) galleryView.style.display = 'block';
                if (editorView) editorView.style.display = 'none';
                if (mdView) mdView.style.display = 'none';
            } else if (state.selectedTemplate) {
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
        }, 100);



        // Global error handler for debugging
        window.onerror = function (msg, url, line, col, error) {
            console.error("Global Error Caught:", msg, url, line, col, error);
            // Make it visible in DOM for browser agent
            const errDiv = document.createElement('div');
            errDiv.style.position = 'fixed';
            errDiv.style.top = '0';
            errDiv.style.left = '0';
            errDiv.style.background = 'red';
            errDiv.style.color = 'white';
            errDiv.style.zIndex = '99999';
            errDiv.style.padding = '10px';
            errDiv.innerText = "JS Error: " + msg;
            document.body.appendChild(errDiv);
        };

        // Initialize UI (wrap in try-catch to prevent initialization failures)
        try { updateCoverPreview(); } catch (e) { console.warn('updateCoverPreview failed during init:', e); }
        try { updateBackCoverPreview(); } catch (e) { console.warn('updateBackCoverPreview failed during init:', e); }
        try { initResizableSidebar(); } catch (e) { console.warn('initResizableSidebar failed:', e); }
        try { initAlbumViewSizeControls(); } catch (e) { console.warn('initAlbumViewSizeControls failed:', e); }
        try { initPagePreviewZoomControls(); } catch (e) { console.warn('initPagePreviewZoomControls failed:', e); }

        // Initialize new cover enhancements (subtitle, fonts, photo slot)
        try { setupCoverEnhancements(); } catch (e) { console.warn('setupCoverEnhancements failed:', e); }

        // Initialize design editor
        try {
            if (typeof designEditor !== 'undefined') {
                designEditor.init('designStudioCanvasContainer', {
                    filterControlsId: 'designStudioFilterControls',
                    toolControlsId: 'designStudioToolControls',
                    brushControlsId: 'designStudioBrushControls'
                });
            }
        } catch (e) { console.warn('designEditor init failed:', e); }

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

        // Listen for Auth Success from Popup (fixes COOP/blocked window access)
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'GOOGLE_PHOTOS_AUTH_SUCCESS') {
                console.log("Received Auth Success from Popup:", event.data);
                if (state.sessionId) {
                    console.log("Triggering session check...");
                    checkSession();
                } else {
                    // Use a small delay to allow state updates if we are in the middle of creating one
                    setTimeout(() => {
                        const btn = document.getElementById('pickerBtn');
                        if (btn && btn.innerText.includes('Creating')) {
                            // If we were stuck creating, maybe try re-triggering or just waiting
                            console.log("Auth success received while creating session.");
                        }
                    }, 1000);
                }
            }
        });

    } catch (error) {
        console.error('Initialization error:', error);
        alert("Error loading app. Please refresh.");
    }
}

// ============================================
// GOOGLE PHOTOS PICKER
// ============================================
async function loadPicker() {
    console.log("[DEBUG_AUTH] loadPicker called");
    const btn = document.getElementById('pickerBtn');
    const statusMsg = document.getElementById('picker-message');

    btn.disabled = true;
    btn.innerHTML = (getUiLang() === 'he') ? '⏳ טוען...' : '⏳ Creating Session...';
    statusMsg.innerHTML = '';

    // Robust user check: check both firebase auth and our local state
    const user = firebase.auth().currentUser || state.user;
    if (!user) {
        console.warn("[DEBUG_AUTH] User not signed in when clicking loadPicker. Triggering sign in...");
        try {
            try { sessionStorage.setItem('shoso_post_signin_action', 'loadPicker'); } catch { /* ignore */ }
            await signInWithGoogle();

            // Check again after potential popup
            const refreshedUser = firebase.auth().currentUser;
            if (refreshedUser) {
                console.log("[DEBUG_AUTH] Sign-in successful, retrying loadPicker automatically...");
                // Reset button state just in case loadPicker fails again
                btn.disabled = false;
                return loadPicker();
            } else {
                console.log("[DEBUG_AUTH] Sign-in flow finished but no user yet (maybe redirecting implies reload).");
            }
        } catch (e) {
            console.error("[DEBUG_AUTH] Sign in failed/cancelled:", e);
            btn.disabled = false;
            btn.innerHTML = (getUiLang() === 'he') ? '🖼️ פתח את Google Photos Picker' : '🖼️ Open Google Photos Picker';
        }
        return;
    }

    console.log("[DEBUG_AUTH] User is signed in. Proceeding to create picker session for:", user.uid);


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
            btn.innerHTML = (getUiLang() === 'he') ? '🔄 נסה שוב' : '🔄 Try Again';
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
            btn.innerHTML = (getUiLang() === 'he') ? '🖼️ פתח את Google Photos Picker' : '🖼️ Open Google Photos Picker';
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

// ============================================
// LOCAL PHOTO UPLOAD
// ============================================
function triggerLocalUpload() {
    const input = document.getElementById('localPhotoInput');
    if (input) input.click();
}

async function handleLocalFileUpload(event) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    if (!state.selectedPhotos) state.selectedPhotos = [];

    const processingBtn = document.getElementById('localUploadBtn');
    if (processingBtn) {
        processingBtn.disabled = true;
        processingBtn.innerHTML = '⏳ Processing...';
    }

    try {
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (!file.type.startsWith('image/')) continue;

            const base64Url = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = (e) => resolve(e.target.result);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            // Add to state
            state.selectedPhotos.push({
                id: 'local-' + Date.now() + '-' + i,
                baseUrl: base64Url,
                thumbnailUrl: base64Url, // REQUIRED for frontend preview
                editedImageData: base64Url, // REQUIRED for backend print (skip fetch)
                mimeType: file.type,
                filename: file.name,
                isLocal: true
            });
        }

        // Update UI
        updateSelectedPhotosUI();
        if (typeof renderSelectedPhotosModal !== 'undefined') {
            renderSelectedPhotosModal();
        }

        showStatus(`Imported ${files.length} photos successfully!`, 'success');
        // Open review modal after local upload
        try { setTimeout(() => { try { openPhotoReviewModal({ reason: 'local' }); } catch { } }, 50); } catch { /* ignore */ }

    } catch (err) {
        console.error('Error importing local photos:', err);
        showStatus('Failed to import some photos.', 'error');
    } finally {
        if (processingBtn) {
            processingBtn.disabled = false;
            processingBtn.innerHTML = `
                <span class="icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                    <polyline points="17,8 12,3 7,8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                  </svg>
                </span>
                Upload from Computer`;
        }
        // Reset input so same files can be selected again if needed
        event.target.value = '';
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

            // After photos are loaded/added (non-Memory Director), open the review modal
            try {
                if (!state.pendingStartMemoryDirector) {
                    setTimeout(() => { try { openPhotoReviewModal({ reason: 'picker' }); } catch { } }, 50);
                }
            } catch { /* ignore */ }

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
    const useGlobalProgress = !!state.pendingStartMemoryDirector;

    // Initial UI
    if (!useGlobalProgress) {
        showThumbnailProgress(0, totalPhotos);
    } else {
        updateProgress("Preparing Memory Director...", `Loading thumbnails... 0/${totalPhotos}`, 10);
    }

    try {
        const map = await refreshAndFetchThumbnails(photos, {
            batchSize: THUMBNAIL_BATCH_SIZE,
            onProgress: (current, total) => {
                if (!useGlobalProgress) {
                    showThumbnailProgress(current, total);
                    updateSelectedPhotosUI(); // Update UI progressively
                } else {
                    const pct = Math.round((current / total) * 25) + 10;
                    updateProgress("Preparing Memory Director...", `Loading thumbnails... ${current}/${total}`, pct);
                }
            }
        });

        // Apply thumbnails
        photos.forEach(p => {
            if (p.baseUrl && map.has(p.baseUrl)) {
                p.thumbnailUrl = map.get(p.baseUrl);
            }
        });

    } catch (e) {
        console.error("loadThumbnailsInBatches failed:", e);
    }

    if (!useGlobalProgress) {
        hideThumbnailProgress();
        updateSelectedPhotosUI(); // Final update
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
    if (count) count.textContent = state.selectedPhotos.length;
    if (!list) return;

    if (state.selectedPhotos.length === 0) {
        list.innerHTML = '<div class="empty-state">No photos selected</div>';
        if (showMoreBtn) showMoreBtn.style.display = 'none';
        return;
    }

    const isSafeImgSrc = (src) => {
        if (!src || typeof src !== 'string') return false;
        const s = src.trim();
        if (!s) return false;
        if (s.startsWith('data:') || s.startsWith('blob:')) return true;
        // allow relative or same-origin assets
        if (!/^https?:\/\//i.test(s)) return true;
        try { return new URL(s, window.location.href).origin === window.location.origin; } catch { return false; }
    };
    const getSafeThumb = (photo) => {
        const cands = [
            photo?.editedData,
            photo?.thumbnailUrl,
            photo?.editedImageData,
            photo?.baseUrl,
            photo?.url,
        ].filter(Boolean);
        for (const c of cands) {
            if (isSafeImgSrc(c)) return c;
        }
        return null;
    };

    // Render full grid in the sidebar (no longer just a strip)
    list.innerHTML = state.selectedPhotos.map((photo, index) => {
        // Avoid direct requests to protected googleusercontent URLs (403 spam).
        const imgSrc = getSafeThumb(photo);

        return `<div class="grid-item" title="Photo ${index + 1}">
          ${imgSrc
                ? `<img src="${imgSrc}" alt="Photo ${index + 1}" onerror="this.onerror=null; this.src=''; this.parentElement.classList.add('load-error'); this.parentElement.innerHTML='<div class=\\'error-placeholder\\'>⚠️</div>';">`
                : `<div class="thumbnail-placeholder">${index + 1}</div>`
            }
            <button class="remove-btn" onclick="removeSelectedPhoto(${index})" title="Remove">×</button>
        </div>`;
    }).join('');

    // We no longer need the "Show more" button pattern for the rail view
    if (showMoreBtn) showMoreBtn.style.display = 'none';
}

// ============================================
// PHOTO REVIEW MODAL (select/sort/captions)
// ============================================
function ensurePhotoReviewModal() {
    if (document.getElementById('photoReviewModal')) return;

    const modal = document.createElement('div');
    modal.id = 'photoReviewModal';
    modal.className = 'modal';
    modal.style.display = 'none';
    modal.innerHTML = `
      <div class="modal-content modal-large" style="max-width: 1100px;">
        <div class="modal-header" style="align-items:flex-start;">
          <div style="display:flex; flex-direction:column; gap:4px;">
            <h3 id="photoReviewTitle" style="margin:0;">${getUiLang() === 'he' ? 'בחירת תמונות וסידור' : 'Review & Arrange Photos'}</h3>
            <div id="photoReviewSubtitle" style="font-size:13px; color:#64748b;">${getUiLang() === 'he' ? 'סמן אילו תמונות לכלול, בחר סידור, והוסף תיאורים (AI) לפני יצירת האלבום.' : 'Choose which photos to include, pick an order, and generate captions before creating the book.'}</div>
          </div>
          <button class="close-btn" type="button" aria-label="Close" onclick="closePhotoReviewModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 16px 20px;">
          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
              <button class="btn btn-secondary btn-small" type="button" onclick="photoReviewSelectAll(true)">${getUiLang() === 'he' ? 'בחר הכל' : 'Select all'}</button>
              <button class="btn btn-secondary btn-small" type="button" onclick="photoReviewSelectAll(false)">${getUiLang() === 'he' ? 'נקה בחירה' : 'Clear'}</button>
              <button class="btn btn-ghost btn-small" type="button" onclick="photoReviewInvert()">${getUiLang() === 'he' ? 'הפוך בחירה' : 'Invert'}</button>
            </div>

            <div style="display:flex; gap:10px; flex-wrap:wrap; align-items:center;">
              <label style="font-size:12px; font-weight:700; color:#334155;">${getUiLang() === 'he' ? 'סדר:' : 'Order:'}</label>
              <select id="photoReviewOrder" class="edo-select" style="min-width: 230px;">
                <option value="ai">${getUiLang() === 'he' ? 'AI (רלוונטיות/סיפור)' : 'AI (relevance/story)'}</option>
                <option value="date_asc">${getUiLang() === 'he' ? 'לפי תאריך (ישן→חדש)' : 'By date (old→new)'}</option>
                <option value="date_desc">${getUiLang() === 'he' ? 'לפי תאריך (חדש→ישן)' : 'By date (new→old)'}</option>
                <option value="random">${getUiLang() === 'he' ? 'אקראי' : 'Random'}</option>
              </select>
              <button class="btn btn-secondary btn-small" type="button" onclick="applyPhotoReviewOrder()">${getUiLang() === 'he' ? 'סדר תמונות' : 'Apply order'}</button>
            </div>
          </div>

          <div style="display:flex; flex-wrap:wrap; gap:10px; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
              <button class="btn btn-primary btn-small" type="button" onclick="generateAICaptionsForSelected()">${getUiLang() === 'he' ? 'צור תיאורים (AI)' : 'Generate AI captions'}</button>
              <div style="font-size:12px; color:#64748b;">${getUiLang() === 'he' ? 'התיאורים יופיעו גם ב‑PDF.' : 'Captions will also appear in the PDF.'}</div>
            </div>
            <div id="photoReviewStatus" style="font-size:12px; color:#64748b;"></div>
          </div>

          <div id="photoReviewGrid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap:12px;"></div>
        </div>
        <div class="modal-footer" style="display:flex; justify-content:space-between; gap:10px; flex-wrap:wrap;">
          <button class="btn btn-secondary" type="button" onclick="closePhotoReviewModal()">${getUiLang() === 'he' ? 'סגור' : 'Close'}</button>
          <div style="display:flex; gap:10px; flex-wrap:wrap;">
            <button class="btn btn-primary" type="button" data-photo-review-ai-btn style="display:none;" onclick="startAiAutoDesignFromReview()">${getUiLang() === 'he' ? 'צור עם AI' : 'Create with AI'}</button>
            <button class="btn btn-primary" type="button" data-photo-review-apply-btn onclick="applyPhotoReviewSelection()">${getUiLang() === 'he' ? 'אישור' : 'Apply'}</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);

    // close on backdrop
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closePhotoReviewModal();
    });
}

function openPhotoReviewModal(opts = {}) {
    ensurePhotoReviewModal();
    const modal = document.getElementById('photoReviewModal');
    if (!modal) return;

    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    if (!photos.length) return;

    // Debounce: avoid reopening too often
    const now = Date.now();
    const lastAt = state._photoReviewLastOpenedAt || 0;
    const lastCount = state._photoReviewLastCount || 0;
    if (now - lastAt < 1200 && lastCount === photos.length) return;
    state._photoReviewLastOpenedAt = now;
    state._photoReviewLastCount = photos.length;

    // Build selection map (default: all selected)
    state._photoReview = state._photoReview || {};
    if (!state._photoReview.selectedById) state._photoReview.selectedById = {};
    photos.forEach(p => {
        if (!p || !p.id) return;
        if (typeof state._photoReview.selectedById[p.id] !== 'boolean') state._photoReview.selectedById[p.id] = true;
    });

    renderPhotoReviewGrid();
    modal.style.display = 'block';

    // Toggle footer buttons for AI Auto Design mode
    try {
        const isAi = !!state._aiAutoDesignMode;
        const applyBtn = modal.querySelector('[data-photo-review-apply-btn]');
        const aiBtn = modal.querySelector('[data-photo-review-ai-btn]');
        if (applyBtn) applyBtn.style.display = isAi ? 'none' : '';
        if (aiBtn) aiBtn.style.display = isAi ? '' : 'none';
    } catch { /* ignore */ }
}

function closePhotoReviewModal() {
    const modal = document.getElementById('photoReviewModal');
    if (modal) modal.style.display = 'none';
}

function openAIAutoDesignFlow() {
    // Called from template gallery card
    state._aiAutoDesignMode = true;
    // Prevent the "no template selected" view-switcher from bouncing us back to the gallery.
    // We'll still let the AI choose a different template later when applying the plan.
    try {
        const templates = window.PHOTO_BOOK_TEMPLATES || (typeof PHOTO_BOOK_TEMPLATES !== 'undefined' ? PHOTO_BOOK_TEMPLATES : {});
        if (!state.selectedTemplate && templates && templates.classic) {
            state.selectedTemplate = templates.classic;
            state.currentTheme = templates.classic.id || 'classic';
        }
    } catch { /* ignore */ }
    showEditorView();
    // Encourage the user to pick photos
    setTimeout(() => {
        try { if (typeof loadPicker === 'function') loadPicker(); } catch { /* ignore */ }
    }, 80);
}

async function startAiAutoDesignFromReview() {
    // Apply selection first (keeps only checked photos)
    applyPhotoReviewSelection();
    closePhotoReviewModal();

    const isHe = getUiLang() === 'he';
    if (!Array.isArray(state.selectedPhotos) || state.selectedPhotos.length === 0) {
        showToast(isHe ? 'לא נבחרו תמונות.' : 'No photos selected.', 'info');
        return;
    }

    await startAiAutoDesignGeneration();
}

function ensureAiAutoDesignModal() {
    if (document.getElementById('aiAutoDesignModal')) return;
    const isHe = getUiLang() === 'he';
    const modal = document.createElement('div');
    modal.id = 'aiAutoDesignModal';
    modal.className = 'modal';
    modal.style.display = 'none';
    const dir = isHe ? 'rtl' : 'ltr';
    const align = isHe ? 'right' : 'left';
    const rowDir = isHe ? 'row-reverse' : 'row';
    modal.innerHTML = `
      <div class="modal-content modal-large" dir="${dir}" style="max-width: 1180px; width: 96vw; max-height: 86vh; overflow: hidden;">
        <div class="modal-header">
          <h3 style="margin:0;">${isHe ? 'עיצוב אוטומטי עם AI' : 'AI Auto Design'}</h3>
          <button class="close-btn" onclick="closeAiAutoDesignModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 0; overflow: hidden;">
          <div style="display:flex; flex-direction:${rowDir}; height: 100%; min-height: 520px;">
            <!-- Visual / animation side -->
            <div style="flex: 1; min-width: 320px; background: linear-gradient(135deg, rgba(99,102,241,0.10), rgba(168,85,247,0.10)); border-${isHe ? 'left' : 'right'}: 1px solid rgba(148,163,184,0.25); display:flex; align-items:center; justify-content:center; padding: 28px; position: relative; overflow:hidden;">
              <div style="position:absolute; inset:0; background: radial-gradient(circle at 30% 20%, rgba(99,102,241,0.18), transparent 45%), radial-gradient(circle at 70% 80%, rgba(168,85,247,0.14), transparent 55%);"></div>

              <div style="position:relative; width: 100%; max-width: 420px; text-align:center;">
                <div style="font-weight:900; letter-spacing:-0.02em; font-size: 22px; color:#0f172a; margin-bottom: 10px;">
                  ${isHe ? 'הספר נוצר באמצעות AI' : 'Your book is being created by AI'}
                </div>
                <div style="color:#475569; font-size: 13px; line-height: 1.5; margin-bottom: 18px;">
                  ${isHe ? 'בוחר סגנון, מסדר תמונות, מעצב דפים ומוסיף טקסטים בצורה עקבית.' : 'Picking a style, arranging photos, designing pages, and adding text coherently.'}
                </div>

                <div class="book-loader-container" style="padding: 18px 0;">
                  <div class="book-loader" aria-hidden="true">
                    <div class="page"></div>
                    <div class="page"></div>
                    <div class="page"></div>
                  </div>
                </div>

                <div id="aiAutoDesignStatus" style="text-align:${align}; padding:12px 14px; border:1px solid rgba(148,163,184,0.35); border-radius:14px; background: rgba(255,255,255,0.7); color:#0f172a;">
                  ${isHe ? 'מוכן להתחיל.' : 'Ready.'}
                </div>
              </div>
            </div>

            <!-- Controls side -->
            <div style="width: 420px; max-width: 44vw; min-width: 340px; background: #ffffff; padding: 26px; overflow: auto;">
              <div style="text-align:${align}; display:flex; flex-direction:column; gap:12px;">
                <div style="font-size:14px; color:#64748b; line-height:1.55;">
                  ${isHe ? 'ה‑AI בונה אלבום שלם עם שפה עיצובית אחידה. כל ריצה יוצאת שונה.' : 'AI builds a full album with one coherent design system. Every run is different.'}
                </div>

                <div style="padding: 14px; border-radius: 14px; border: 1px solid rgba(148,163,184,0.35); background: rgba(241,245,249,0.55);">
                  <div style="font-weight:800; font-size: 13px; color:#0f172a; margin-bottom: 6px;">
                    ${isHe ? 'מה יקרה עכשיו?' : 'What happens next?'}
                  </div>
                  <div style="font-size: 13px; color:#475569; line-height:1.6;">
                    ${isHe
            ? '• ה‑AI יבחר תמונות לפי רלוונטיות\n• יעצב עמודים ויכריכה\n• יוסיף כיתובים ומסגרות בחלק מהתמונות\n• בסיום תוכל לערוך הכל בעורך הרגיל'
            : '• AI selects photos by relevance\n• Designs pages + cover\n• Adds captions + frames to some photos\n• Then you can edit everything in the normal editor'}
                  </div>
                </div>

                <div style="display:flex; gap:10px; flex-wrap:wrap; justify-content:${isHe ? 'flex-start' : 'flex-end'}; margin-top: 6px;">
                  <button id="aiAutoDesignStartBtn" class="btn btn-primary" type="button" onclick="runAiAutoDesignNow()" style="min-width: 190px;">
                    ${isHe ? 'צור אלבום עם AI' : 'Generate album with AI'}
                  </button>
                  <button class="btn btn-secondary" type="button" onclick="closeAiAutoDesignModal()">
                    ${isHe ? 'ביטול' : 'Cancel'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) closeAiAutoDesignModal(); });
}

function openAiAutoDesignModal() {
    ensureAiAutoDesignModal();
    const m = document.getElementById('aiAutoDesignModal');
    if (!m) return;
    m.style.display = 'block';
}

function closeAiAutoDesignModal() {
    const m = document.getElementById('aiAutoDesignModal');
    if (m) m.style.display = 'none';
}

function __aiAutoDesignPayloadFromSelected() {
    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    return photos.map((p, index) => ({
        index,
        id: p?.id || null,
        date: p?.date || p?.creationTime || p?.mediaMetadata?.creationTime || null,
        location: p?.location || null,
        filename: p?.filename || p?.name || null,
        caption: p?.caption || null,
    }));
}

async function runAiAutoDesignNow() {
    const isHe = getUiLang() === 'he';
    const status = document.getElementById('aiAutoDesignStatus');
    const btn = document.getElementById('aiAutoDesignStartBtn');
    if (btn) btn.disabled = true;
    try {
        const payload = __aiAutoDesignPayloadFromSelected();
        if (!payload.length) throw new Error('no photos');
        if (status) status.textContent = isHe ? 'מייצר שפה עיצובית…' : 'Designing system…';
        const seed = Math.random().toString(36).slice(2) + Date.now();
        const res = await callFunction('generateAutoDesign', { photos: payload, lang: isHe ? 'he' : 'en', seed });
        if (!res?.success) throw new Error(res?.error || 'generation failed');
        if (status) status.textContent = isHe ? 'מיישם את העיצוב באלבום…' : 'Applying design…';
        applyAiAutoDesignPlan(res.plan);
        closeAiAutoDesignModal();
        state._aiAutoDesignMode = false;
        showEditorView();
        renderCurrentPage();
        updatePageIndicator();
        showToast(isHe ? 'האלבום נוצר! אפשר לערוך עכשיו.' : 'Album generated! You can edit now.', 'success');
    } catch (e) {
        console.error('runAiAutoDesignNow failed:', e);
        if (status) status.textContent = isHe ? 'שגיאה ביצירת האלבום.' : 'Failed to generate album.';
        showToast(isHe ? 'שגיאה ביצירת האלבום.' : 'Failed to generate album.', 'info');
    } finally {
        if (btn) btn.disabled = false;
    }
}

async function startAiAutoDesignGeneration() {
    openAiAutoDesignModal();
}

function applyAiAutoDesignPlan(plan) {
    const isHe = getUiLang() === 'he';
    if (!plan || typeof plan !== 'object') return;

    // Pick template for coherent design system
    const templates = window.PHOTO_BOOK_TEMPLATES || {};
    const tpl = plan.templateId && templates[plan.templateId] ? templates[plan.templateId] : null;
    if (tpl && typeof applyTemplate === 'function') {
        state.selectedTemplate = tpl;
        try { applyTemplate(tpl); } catch { /* ignore */ }
    }

    // Global knobs
    if (Number.isFinite(plan.globalCornerRadius)) state.globalCornerRadius = plan.globalCornerRadius;

    // Cover
    state.cover = state.cover || {};
    if (plan.cover?.title) state.cover.title = plan.cover.title;
    if (plan.cover?.subtitle !== undefined) state.cover.subtitle = plan.cover.subtitle;
    if (plan.cover?.photoIndex !== undefined && Number.isFinite(parseInt(plan.cover.photoIndex, 10))) {
        const idx = parseInt(plan.cover.photoIndex, 10);
        const p = state.selectedPhotos?.[idx];
        if (p) state.cover.photo = { ...p, alignment: 'center' };
    }
    if (plan.cover?.photoShape) state.cover.photoShape = plan.cover.photoShape;
    if (plan.cover?.photoFrameId !== undefined) state.cover.photoFrameId = plan.cover.photoFrameId;

    // Back cover
    state.backCover = state.backCover || {};
    if (plan.backCover?.text) state.backCover.text = plan.backCover.text;
    if (plan.backCover?.subtitle !== undefined) state.backCover.subtitle = plan.backCover.subtitle;

    // Pages
    const pages = Array.isArray(plan.pages) ? plan.pages : [];
    state.pages = pages.map((pg) => {
        const layout = pg.layout || 'single';
        const slots = Array.isArray(pg.slots) ? pg.slots : [];
        const slotsCount = state.config?.LAYOUTS?.[layout]?.slots || Math.max(1, slots.length || 1);
        const photos = new Array(slotsCount).fill(null);
        for (let i = 0; i < Math.min(slotsCount, slots.length); i++) {
            const s = slots[i] || {};
            const pi = Number.isFinite(parseInt(s.photoIndex, 10)) ? parseInt(s.photoIndex, 10) : null;
            const base = (pi !== null && state.selectedPhotos?.[pi]) ? { ...state.selectedPhotos[pi] } : null;
            if (!base) continue;
            if (s.caption) base.caption = String(s.caption);
            if (s.shape) base.shape = String(s.shape);
            if (s.frameId !== undefined) base.frameId = s.frameId ? String(s.frameId) : null;
            photos[i] = base;
        }
        return {
            layout,
            photos,
            caption: pg.pageCaption || '',
            backgroundColor: pg.backgroundColor || (tpl?.colors?.pageBackground || '#ffffff'),
            showPageNumber: true,
            photoSpacing: Number.isFinite(pg.photoSpacing) ? pg.photoSpacing : (tpl?.layout?.photoSpacing || 16),
            frameId: pg.pageFrameId || null,
        };
    });

    // Start at cover for a “beautiful reveal”
    state.currentPageIndex = -1;
    state.selectedPhotoSlot = null;
    try { renderPageThumbnails(); } catch { /* ignore */ }
    try { updateCoverFromState(); } catch { /* ignore */ }
    try { updateBackCoverFromState(); } catch { /* ignore */ }
}

// Expose
window.openAIAutoDesignFlow = openAIAutoDesignFlow;
window.startAiAutoDesignFromReview = startAiAutoDesignFromReview;
window.openAiAutoDesignModal = openAiAutoDesignModal;
window.closeAiAutoDesignModal = closeAiAutoDesignModal;
window.runAiAutoDesignNow = runAiAutoDesignNow;

function __photoDateKey(p) {
    const t = p?.date || p?.creationTime || p?.mediaMetadata?.creationTime || null;
    if (!t) return 0;
    const ms = Date.parse(String(t));
    return Number.isFinite(ms) ? ms : 0;
}

function renderPhotoReviewGrid() {
    const grid = document.getElementById('photoReviewGrid');
    const status = document.getElementById('photoReviewStatus');
    if (!grid) return;
    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    const sel = state._photoReview?.selectedById || {};
    const isHe = getUiLang() === 'he';

    const selectedCount = photos.filter(p => p?.id && sel[p.id]).length;
    if (status) status.textContent = isHe ? `נבחרו ${selectedCount} מתוך ${photos.length}` : `${selectedCount} of ${photos.length} selected`;

    grid.innerHTML = photos.map((p, idx) => {
        const id = p?.id || `idx-${idx}`;
        const checked = !!(p?.id && sel[p.id]);
        const isSafeImgSrc = (src) => {
            if (!src || typeof src !== 'string') return false;
            const s = src.trim();
            if (!s) return false;
            if (s.startsWith('data:') || s.startsWith('blob:')) return true;
            if (!/^https?:\/\//i.test(s)) return true;
            try { return new URL(s, window.location.href).origin === window.location.origin; } catch { return false; }
        };
        const src = (() => {
            const cands = [p?.editedData, p?.thumbnailUrl, p?.editedImageData, p?.baseUrl].filter(Boolean);
            for (const c of cands) if (isSafeImgSrc(c)) return c;
            return '';
        })();
        const cap = (p?.caption || '').trim();
        const hasImg = !!src;
        return `
          <div class="photo-review-tile" data-photo-id="${escapeHtml(id)}" onclick="togglePhotoReview('${escapeHtml(id)}')" style="border:1px solid ${checked ? '#22c55e' : '#e2e8f0'}; border-radius:10px; overflow:hidden; background:#fff; cursor:pointer; position:relative;">
            <div style="height:140px; background:#f1f5f9; display:flex; align-items:center; justify-content:center; position:relative;">
              ${hasImg ? `<img src="${src}" alt="" style="width:100%; height:100%; object-fit:cover;">` : `<div style="color:#94a3b8; font-size:12px;">${isHe ? 'אין תצוגה' : 'No preview'}</div>`}
              <div style="position:absolute; top:10px; ${isHe ? 'left' : 'right'}:10px; width:28px; height:28px; border-radius:999px; background:${checked ? '#22c55e' : 'rgba(15,23,42,0.35)'}; color:#fff; display:flex; align-items:center; justify-content:center; font-weight:900; box-shadow:0 6px 16px rgba(0,0,0,0.18);">
                ${checked ? '✓' : ''}
              </div>
            </div>
            <div style="padding:10px;">
              <div style="font-size:12px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(p?.filename || p?.name || p?.id || '')}</div>
              <div style="font-size:12px; color:#0f172a; margin-top:6px; min-height: 34px; line-height:1.3; overflow:hidden; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical;">
                ${cap ? escapeHtml(cap) : `<span style="color:#94a3b8;">${isHe ? 'אין תיאור' : 'No caption'}</span>`}
              </div>
            </div>
          </div>
        `;
    }).join('');
}

function togglePhotoReview(photoId) {
    const id = String(photoId || '');
    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    const sel = state._photoReview?.selectedById || (state._photoReview.selectedById = {});
    const exists = photos.some(p => p?.id === id);
    if (!exists) return;
    sel[id] = !sel[id];
    renderPhotoReviewGrid();
}

function photoReviewSelectAll(v) {
    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    state._photoReview = state._photoReview || {};
    state._photoReview.selectedById = state._photoReview.selectedById || {};
    photos.forEach(p => { if (p?.id) state._photoReview.selectedById[p.id] = !!v; });
    renderPhotoReviewGrid();
}

function photoReviewInvert() {
    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    state._photoReview = state._photoReview || {};
    state._photoReview.selectedById = state._photoReview.selectedById || {};
    photos.forEach(p => { if (p?.id) state._photoReview.selectedById[p.id] = !state._photoReview.selectedById[p.id]; });
    renderPhotoReviewGrid();
}

async function applyPhotoReviewOrder() {
    const orderEl = document.getElementById('photoReviewOrder');
    const status = document.getElementById('photoReviewStatus');
    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    const sel = state._photoReview?.selectedById || {};
    const included = photos.filter(p => p?.id && sel[p.id]);
    const isHe = getUiLang() === 'he';
    if (!included.length) {
        if (status) status.textContent = isHe ? 'לא נבחרו תמונות.' : 'No photos selected.';
        return;
    }

    const mode = orderEl ? orderEl.value : 'ai';

    try {
        if (status) status.textContent = isHe ? 'מסדר…' : 'Ordering…';
        if (mode === 'random') {
            included.sort(() => Math.random() - 0.5);
        } else if (mode === 'date_asc' || mode === 'date_desc') {
            included.sort((a, b) => (__photoDateKey(a) - __photoDateKey(b)) * (mode === 'date_desc' ? -1 : 1));
        } else if (mode === 'ai') {
            // AI story detection → use chapter order to derive a relevance/story order
            const payload = included.map(p => ({
                id: p.id,
                date: p.date || p.creationTime || p.mediaMetadata?.creationTime || null,
                location: p.location || null,
                filename: p.filename || p.name || null,
                creationTime: p.creationTime || null,
                mediaMetadata: p.mediaMetadata || null,
                caption: p.caption || null,
            }));
            const res = await callFunction('detectStory', { photos: payload });
            const story = res?.story || res;
            const indices = [];
            const chapters = story?.chapters || [];
            chapters.forEach(ch => {
                (ch.photoIndices || []).forEach(i => { if (Number.isFinite(i)) indices.push(i); });
            });
            const seen = new Set();
            const ordered = [];
            indices.forEach(i => {
                const p = included[i];
                if (p && !seen.has(p.id)) { ordered.push(p); seen.add(p.id); }
            });
            // append any remaining
            included.forEach(p => { if (p && !seen.has(p.id)) ordered.push(p); });
            included.splice(0, included.length, ...ordered);
        }

        // replace selectedPhotos ordering with ordered included + remaining excluded (kept at end)
        const excluded = photos.filter(p => !(p?.id && sel[p.id]));
        state.selectedPhotos = [...included, ...excluded];
        updateSelectedPhotosUI();
        renderPhotoReviewGrid();
        if (status) status.textContent = isHe ? 'הסידור עודכן.' : 'Order updated.';
    } catch (e) {
        console.error('applyPhotoReviewOrder failed:', e);
        if (status) status.textContent = isHe ? 'שגיאה בסידור.' : 'Failed to order.';
    }
}

async function generateAICaptionsForSelected() {
    const status = document.getElementById('photoReviewStatus');
    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    const sel = state._photoReview?.selectedById || {};
    const included = photos.filter(p => p?.id && sel[p.id]);
    const isHe = getUiLang() === 'he';
    if (!included.length) {
        if (status) status.textContent = isHe ? 'לא נבחרו תמונות.' : 'No photos selected.';
        return;
    }

    try {
        if (status) status.textContent = isHe ? 'יוצר תיאורים בעזרת AI…' : 'Generating AI captions…';
        const payload = included.map(p => ({
            id: p.id,
            date: p.date || p.creationTime || p.mediaMetadata?.creationTime || null,
            location: p.location || null,
            filename: p.filename || p.name || null,
            caption: p.caption || null,
        }));
        const res = await callFunction('generateCaptions', { photos: payload });
        if (!res?.success) throw new Error(res?.error || 'caption generation failed');
        const captions = Array.isArray(res.captions) ? res.captions : [];
        captions.forEach(({ index, caption }) => {
            const i = parseInt(index, 10);
            if (!Number.isFinite(i) || !included[i]) return;
            included[i].caption = String(caption || '').trim();
        });
        updateSelectedPhotosUI();
        renderPhotoReviewGrid();
        if (status) status.textContent = isHe ? `נוצרו ${captions.length} תיאורים.` : `Generated ${captions.length} captions.`;
    } catch (e) {
        console.error('generateAICaptionsForSelected failed:', e);
        if (status) status.textContent = isHe ? 'שגיאה ביצירת תיאורים.' : 'Failed to generate captions.';
    }
}

function applyPhotoReviewSelection() {
    const photos = Array.isArray(state.selectedPhotos) ? state.selectedPhotos : [];
    const sel = state._photoReview?.selectedById || {};
    const included = photos.filter(p => p?.id && sel[p.id]);
    if (!included.length) {
        showToast(getUiLang() === 'he' ? 'לא נבחרו תמונות.' : 'No photos selected.', 'info');
        return;
    }
    state.selectedPhotos = included;
    updateSelectedPhotosUI();
    closePhotoReviewModal();
}

window.openPhotoReviewModal = openPhotoReviewModal;
window.closePhotoReviewModal = closePhotoReviewModal;
window.photoReviewSelectAll = photoReviewSelectAll;
window.photoReviewInvert = photoReviewInvert;
window.togglePhotoReview = togglePhotoReview;
window.applyPhotoReviewOrder = applyPhotoReviewOrder;
window.generateAICaptionsForSelected = generateAICaptionsForSelected;
window.applyPhotoReviewSelection = applyPhotoReviewSelection;

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

    const isSafeImgSrc = (src) => {
        if (!src || typeof src !== 'string') return false;
        const s = src.trim();
        if (!s) return false;
        if (s.startsWith('data:') || s.startsWith('blob:')) return true;
        if (!/^https?:\/\//i.test(s)) return true;
        try { return new URL(s, window.location.href).origin === window.location.origin; } catch { return false; }
    };
    const getSafeThumb = (photo) => {
        const cands = [
            photo?.editedData,
            photo?.thumbnailUrl,
            photo?.editedImageData,
            photo?.baseUrl,
            photo?.url,
        ].filter(Boolean);
        for (const c of cands) {
            if (isSafeImgSrc(c)) return c;
        }
        return null;
    };

    grid.innerHTML = state.selectedPhotos.map((photo, index) => {
        const imgSrc = getSafeThumb(photo);
        return `
          <div class="selected-photo-item">
            ${imgSrc
                ? `<img src="${imgSrc}" alt="Photo ${index + 1}" onerror="this.onerror=null; this.src=''; this.parentElement.classList.add('load-error'); this.parentElement.innerHTML='<div class=\\'error-placeholder\\'>⚠️</div>';">`
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
// TABS & NAVIGATION (UPDATED FOR REDESIGN)
// ============================================
function switchTab(tabName) {
    // Legacy support
    document.querySelectorAll('.sidebar .tab, .sidebar-rail .tab').forEach(tab =>
        tab.classList.toggle('active', tab.dataset.tab === tabName)
    );
    document.querySelectorAll('.tab-content').forEach(content =>
        content.classList.toggle('active', content.id === tabName + '-tab')
    );

    // Redesign Support (Editorial Swiss System)
    const drawer = document.querySelector('.rebuild-drawer');
    const activeDrawerContent = document.getElementById(tabName + '-tab');

    // Toggle Logic: If clicking the already active tab, close the drawer
    if (drawer && drawer.classList.contains('is-open') && activeDrawerContent && activeDrawerContent.classList.contains('active')) {
        drawer.classList.remove('is-open');
        // Deactivate rail buttons
        document.querySelectorAll('.rebuild-rail .rail-btn').forEach(btn => btn.classList.remove('active'));
        // Trigger resize for canvas/book
        setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
        return;
    }

    // Otherwise, open/switch tab
    // 1. Update Navigation Rail Buttons
    document.querySelectorAll('.rebuild-rail .rail-btn').forEach(btn =>
        btn.classList.toggle('active', btn.dataset.tab === tabName)
    );

    // 2. Update Drawer Content Visibility
    document.querySelectorAll('.rebuild-drawer .drawer-content').forEach(content => {
        const isActive = content.id === tabName + '-tab';
        content.classList.toggle('active', isActive);
    });

    // Ensure drawer is open
    if (drawer && !drawer.classList.contains('is-open')) {
        drawer.classList.add('is-open');
    }

    // If switching to design tab, ensure canvas is visible
    if (tabName === 'design' && typeof designEditor !== 'undefined') {
        setTimeout(() => {
            if (designEditor.canvas) {
                designEditor.resizeCanvas();
            }
        }, 100);
    }

    // Trigger resize for 3D book centering
    setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
}

// TOGGLE RIGHT INSPECTOR
function toggleInspector() {
    const panel = document.getElementById('inspectorPanel');
    if (panel) {
        panel.classList.toggle('collapsed');
        // Resize 3D book / Canvas
        setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
            if (typeof designEditor !== 'undefined' && designEditor.canvas) {
                designEditor.resizeCanvas();
            }
        }, 300);
    }
}

// Global Navigation Helpers for Toolbar
window.goToCover = function () {
    if (typeof state !== 'undefined') {
        state.currentPageIndex = -1;
        renderCurrentPage();
        updatePageIndicator();
    }
};

window.goToBackCover = function () {
    if (typeof state !== 'undefined' && state.pages) {
        state.currentPageIndex = state.pages.length;
        renderCurrentPage();
        updatePageIndicator();
    }
};


// Redirect old tab names to new merged 'photos' tab
// Note: We are patching the global function here.
const rawSwitchTab = switchTab;
switchTab = function (tabName) {
    if (tabName === 'picker' || tabName === 'selected') {
        tabName = 'photos';
    }
    rawSwitchTab(tabName);
};

function switchEditorTab(tabName) {
    document.querySelectorAll('.editor-tab').forEach(tab =>
        tab.classList.toggle('active', tab.dataset.editortab === tabName)
    );

    // Show/hide editor content sections
    document.querySelectorAll('.editor-content').forEach(content => {
        const isActive = content.id === tabName + '-editor';
        content.classList.toggle('active', isActive);
        // Explicitly set display to override any inline styles from HTML
        // CSS uses display: flex for .editor-content.active
        if (isActive) {
            content.style.display = 'flex';
        } else {
            content.style.display = 'none';
        }
    });

    // Update settings panel visibility
    const settingsPanels = {
        'cover': 'cover-settings-panel',
        'pages': 'pages-settings-panel',
        'backcover': 'backcover-settings-panel'
    };

    Object.keys(settingsPanels).forEach(key => {
        const panel = document.getElementById(settingsPanels[key]);
        if (panel) {
            panel.style.display = key === tabName ? 'block' : 'none';
        }
    });

    // Update header title
    const headerTitle = document.getElementById('settingsHeaderTitle');
    if (headerTitle) {
        const titles = {
            'cover': 'Cover Settings',
            'pages': 'Page Settings',
            'backcover': 'Back Cover Settings'
        };
        headerTitle.textContent = titles[tabName] || 'Settings';
    }

    // If switching to pages tab, ensure page is rendered
    if (tabName === 'pages') {
        renderCurrentPage();
    }
}

// Update cover photo customization (size, angle)
function updateCoverCustomization() {
    updateCoverPreview();
}

// Update global photo style (corners)
// Update global photo style (corners) with sync support
function updateGlobalPhotoStyle(sourceId) {
    const id = sourceId || 'globalCornerRadius';
    const selector = document.getElementById(id);
    if (!selector) return;

    const val = parseInt(selector.value) || 0;

    // Anti-bounce: If value hasn't changed, do nothing
    if (state.globalCornerRadius === val) return;

    state.globalCornerRadius = val;

    // Sync input values (only update others if needed)
    const master = document.getElementById('globalCornerRadius');
    if (master && master.id !== id && parseInt(master.value) !== val) master.value = val;

    const proxy = document.getElementById('globalCornerRadiusCover');
    if (proxy && proxy.id !== id && parseInt(proxy.value) !== val) proxy.value = val;

    // Defer heavy re-renders so native <select> UI can close cleanly (prevents
    // "jumping" dropdown behavior on some browsers).
    setTimeout(() => {
        renderCurrentPage(); // Re-render pages
        updateCoverPreview(); // Update cover
    }, 0);
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
    // NEW: Subtitle color from new input
    const subtitleColor = document.getElementById('coverSubtitleColor')?.value || '#ffffff';
    const subtitleFont = document.getElementById('coverSubtitleFont')?.value || state.cover?.subtitleFont || titleFont;

    const subtitleSize = document.getElementById('coverSubtitleSize')?.value || 14;

    const bgColor = document.getElementById('coverBgColor')?.value || '#6366f1';
    const showBorder = document.getElementById('coverShowBorder')?.checked !== false;
    const layout = document.getElementById('coverLayout')?.value || 'standard';
    const photoSize = document.getElementById('coverPhotoSize')?.value || 100;
    const photoAngle = document.getElementById('coverPhotoAngle')?.value || 0;

    // Update state
    state.cover.title = title;
    state.cover.titleSize = parseInt(titleSize);
    state.cover.titleColor = titleColor;
    state.cover.titleFont = titleFont;
    state.cover.subtitle = subtitle;
    // NEW: Store subtitle color
    state.cover.subtitleColor = subtitleColor;
    state.cover.subtitleFont = subtitleFont;
    state.cover.subtitleSize = parseInt(subtitleSize) || 14;
    state.cover.backgroundColor = bgColor;
    state.cover.showBorder = showBorder;
    state.cover.layout = layout;
    state.cover.photoSize = parseInt(photoSize);
    state.cover.photoAngle = parseInt(photoAngle);

    // Update range value displays
    const titleSizeVal = document.getElementById('coverTitleSizeVal');
    if (titleSizeVal) titleSizeVal.textContent = titleSize + 'px';

    const subtitleSizeVal = document.getElementById('coverSubtitleSizeVal');
    if (subtitleSizeVal) subtitleSizeVal.textContent = (subtitleSize || 14) + 'px';

    // Update new custom controls
    const photoSizeVal = document.getElementById('coverPhotoSizeVal');
    if (photoSizeVal) photoSizeVal.textContent = photoSize + '%';

    const photoAngleVal = document.getElementById('coverPhotoAngleVal');
    if (photoAngleVal) photoAngleVal.textContent = photoAngle + '°';

    // Update title preview with styling
    const titlePreview = document.getElementById('coverTitlePreview');
    if (titlePreview) {
        titlePreview.textContent = title;
        titlePreview.style.fontSize = titleSize + 'px';
        titlePreview.style.fontFamily = `'${titleFont}', serif`;

        // Reset base styles
        titlePreview.style.color = titleColor;
        titlePreview.style.textShadow = 'none';
        titlePreview.style.background = 'none';
        titlePreview.style.webkitTextFillColor = 'initial';
        titlePreview.style.transform = 'none';

        // Apply WordArt Style if selected
        if (state.coverTextStyle && window.TEXT_STYLES) {
            const styleObj = window.TEXT_STYLES.find(s => s.id === state.coverTextStyle);
            if (styleObj && styleObj.style) {
                Object.assign(titlePreview.style, styleObj.style);
                // Ensure font size and family from inputs override unless style demands specific font
                // Actually, let's let input font override style font family if user wants custom font with neon effect
                titlePreview.style.fontSize = titleSize + 'px';
                // We keep the style's font family if it's crucial to the look (e.g. Retro), 
                // but let's allow user override if they explicitly changed it? 
                // For simplicity, let style win for now, or mix.
                if (!styleObj.style.fontFamily) {
                    titlePreview.style.fontFamily = `'${titleFont}', serif`;
                }
            }
        }
    }

    // Update subtitle preview
    const subtitlePreview = document.getElementById('coverSubtitlePreview');
    if (subtitlePreview) {
        subtitlePreview.textContent = subtitle;
        subtitlePreview.style.fontSize = (subtitleSize || 14) + 'px';

        // Reset
        subtitlePreview.style.color = subtitleColor;
        subtitlePreview.style.textShadow = 'none';
        subtitlePreview.style.opacity = '0.9';

        // Apply WordArt Style (same as title for consistency, or maybe lighter?)
        if (state.coverTextStyle && window.TEXT_STYLES) {
            const styleObj = window.TEXT_STYLES.find(s => s.id === state.coverTextStyle);
            if (styleObj && styleObj.style) {
                // Clone style to avoid mutating original, remove huge font sizes if present
                const appliedStyle = { ...styleObj.style };
                delete appliedStyle.fontSize; // Keep manual size control
                Object.assign(subtitlePreview.style, appliedStyle);
            }
        } else {
            subtitlePreview.style.color = subtitleColor; // manual fallback
        }
    }

    // Custom Template Assets (Botanical, etc.)
    // We ideally want to target the VISIBLE 3D cover in #pagePreview, not just the hidden legacy one
    const visibleCoverRoot = document.querySelector('#pagePreview .book3d-cover-root');
    const legacyCoverPreview = document.getElementById('coverPreview');

    // List of covers to update (visible + legacy)
    const coverRoots = [];
    if (visibleCoverRoot) coverRoots.push(visibleCoverRoot);
    if (legacyCoverPreview) {
        const root = legacyCoverPreview.querySelector('.book3d-cover-root') || legacyCoverPreview;
        coverRoots.push(root);
    }

    coverRoots.forEach(root => {
        const coverColor = state?.selectedTemplate?.colors?.accentColor || bgColor || '#2c3e50';
        root.style.setProperty('--cover-color', coverColor);

        // Apply Layout Classes
        const layout = state.cover.layout || 'standard';
        root.classList.remove('layout-standard', 'layout-full-bleed', 'layout-photo-bottom');
        root.classList.add(`layout-${layout}`);

        // Find the face to apply assets to
        // In the visible 3D book, it is .book3d-cover-face
        const coverFace = root.querySelector('.book3d-cover-face') || root;

        if (coverFace) {
            // Reset
            coverFace.style.backgroundColor = bgColor;
            coverFace.style.backgroundImage = 'none';
            coverFace.style.border = '';
            coverFace.style.boxShadow = '';
            coverFace.classList.remove('no-border');

            // Apply Background Image from State if present
            if (state.cover && state.cover.backgroundImageUrl) {
                coverFace.style.backgroundImage = `url("${state.cover.backgroundImageUrl}")`;
                coverFace.style.backgroundSize = 'cover';
                coverFace.style.backgroundPosition = 'center';
            }

            // Apply WordArt style to the VISIBLE 3D cover title/subtitle (not just legacy hidden preview)
            if (state.coverTextStyle && window.TEXT_STYLES) {
                const styleObj = window.TEXT_STYLES.find(s => s.id === state.coverTextStyle);
                if (styleObj && styleObj.style) {
                    const inner = coverFace.querySelector('.book3d-cover-inner');
                    const h1 = inner?.querySelector('h1');
                    const h3 = inner?.querySelector('h3');
                    if (h1) {
                        // Keep size control, apply the rest
                        const applied = { ...styleObj.style };
                        delete applied.fontSize;
                        Object.assign(h1.style, applied);
                    }
                    if (h3) {
                        const applied = { ...styleObj.style };
                        delete applied.fontSize;
                        Object.assign(h3.style, applied);
                    }
                }
            }

            // Remove old overlays
            const existingOverlay = coverFace.querySelector('.template-overlay');
            if (existingOverlay) existingOverlay.remove();

            // Custom Template Assets (Botanical, etc.)
            const templateId = state.selectedTemplate?.id || '';
            const accent = state.selectedTemplate?.colors?.accentColor || '#97BC62';

            if (templateId.includes('botanical')) {
                // 1. Organic Border
                coverFace.style.border = `4px double ${accent}`;
                coverFace.style.boxShadow = `inset 0 0 0 8px ${bgColor}, inset 0 0 0 10px ${accent}`;
                coverFace.classList.add('no-border');

                // 2. Leaf/Nature Overlay
                const overlay = document.createElement('div');
                overlay.className = 'template-overlay botanical-leaf-overlay';
                overlay.style.position = 'absolute';
                overlay.style.inset = '0';
                overlay.style.pointerEvents = 'none';
                overlay.style.zIndex = '5';
                overlay.style.opacity = '1.0';
                overlay.innerHTML = `
                     <svg viewBox="0 0 400 600" preserveAspectRatio="none" style="width:100%; height:100%;">
                         <path d="M 0 600 C 100 500 150 550 200 600" fill="none" stroke="${accent}" stroke-width="20" stroke-opacity="0.4"/>
                         <path d="M -50 600 Q 150 400 350 550" fill="none" stroke="${accent}" stroke-width="3" opacity="0.8"/>
                         <path d="M 300 550 Q 320 520 350 500" fill="none" stroke="${accent}" stroke-width="3" opacity="0.6"/>
                         <text x="20" y="550" font-size="80" fill="${accent}" opacity="0.8">🌿</text>
                     </svg>
                 `;
                coverFace.appendChild(overlay);
            }

            // Apply Size & Rotation & Corners to Photo
            const photoImg = coverFace.querySelector('img.book3d-cover-photo') || coverFace.querySelector('img');
            if (photoImg) {
                const scale = (state.cover.photoSize || 100) / 100;
                const angle = state.cover.photoAngle || 0;

                // Fix: Force absolute centering so transform behaves correctly
                photoImg.style.position = 'absolute';
                photoImg.style.top = '50%';
                photoImg.style.left = '50%';
                photoImg.style.minWidth = '100%';
                photoImg.style.minHeight = '100%';
                photoImg.style.maxWidth = 'none'; // Prevent constraints
                photoImg.style.maxHeight = 'none';
                photoImg.style.width = 'auto'; // Let min-width/height handle fill
                photoImg.style.height = 'auto';
                // Note: Object-fit might be better but if we rotate/scale, absolute control is safer for centering.
                // Actually, if we use object-fit: cover, and size is 100%, we don't need min/max.
                // But translate requires absolute usually to escape flow if flow is constrained.
                // Let's assume absolute is best.

                photoImg.style.transformOrigin = 'center center';
                photoImg.style.transform = `translate(-50%, -50%) rotate(${angle}deg) scale(${scale})`;

                const radius = state.globalCornerRadius || 0;
                photoImg.style.borderRadius = `${radius}px`;
            }
        }
    });

    // Handle Title/Subtitle Text Updates for LEGACY hidden preview only (since 3D one is DOM-generated)
    // Actually, we might need to update text on the 3D one too if this function is called on input change?
    // standard `renderCurrentPage` handles the text content for the 3D view.
    // This function focuses on decorating it.

    const coverPreview = document.getElementById('coverPreview');
    if (coverPreview) coverPreview.style.color = titleColor; // For the decorative border

    const coverPhotoBorderEl = document.getElementById('coverPhotoBorder');
    const hasBorder = coverPhotoBorderEl ? coverPhotoBorderEl.checked : false;
    if (hasBorder) {
        const coverBorderColorEl = document.getElementById('coverBorderColor');
        const coverBorderWeightEl = document.getElementById('coverBorderWeight');
        state.cover.photoBorder = {
            color: coverBorderColorEl ? coverBorderColorEl.value : '#000000',
            weight: coverBorderWeightEl ? parseInt(coverBorderWeightEl.value) : 2
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
        updateCoverFromState();
        try { updateCoverPreview(); } catch (e) { /* ignore */ }
    };

    // If we have photos, use internal picker. If not, try to load from Google.
    if (state.selectedPhotos && state.selectedPhotos.length > 0) {
        openPhotoPicker();
    } else {
        // No photos selected? Trigger the main picker flow to help the user.
        if (typeof loadPicker === 'function') {
            loadPicker();
        } else {
            alert("Please select photos from Google Photos first.");
        }
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
    const textStyleId = document.getElementById('backCoverTextStyleSelect')?.value || state.backCover?.textStyleId || 'default';
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
        textStyleId: textStyleId,
        showBorder: showBorder,
        showLogo: showLogo
    };

    // Ensure typography dropdown is populated
    try {
        const sel = document.getElementById('backCoverTextStyleSelect');
        if (sel && (sel.options.length <= 1) && Array.isArray(window.TEXT_STYLES)) {
            const current = sel.value;
            sel.innerHTML = `<option value="default">Default</option>` +
                window.TEXT_STYLES.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
            if (current && document.activeElement !== sel) sel.value = current;
        }
        // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
        if (sel && document.activeElement !== sel) {
            sel.value = textStyleId || 'default';
        }
    } catch { /* ignore */ }

    // Apply typography CSS to previews if a style is selected
    const styleEntry = (window.TEXT_STYLES || []).find(s => s.id === textStyleId);
    const styleCss = styleEntry ? textStyleEntryToInlineCss(styleEntry) : '';

    // Update text preview
    const textPreview = document.getElementById('backCoverTextPreview');
    if (textPreview) {
        textPreview.textContent = text;
        textPreview.style.color = textColor;
        textPreview.style.fontSize = textSize + 'px';
        textPreview.style.fontFamily = `'${textFont}', sans-serif`;
        textPreview.style.textAlign = align;
        if (styleCss) textPreview.style.cssText += `;${styleCss}`;
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
        if (styleCss) subtitlePreview.style.cssText += `;${styleCss}`;
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
            // Back cover background image if present
            const bgImg = state.backCover?.backgroundImageUrl || state.backCover?.backgroundImageData || null;
            if (bgImg) {
                face.style.backgroundImage = `url("${bgImg}")`;
                face.style.backgroundSize = 'cover';
                face.style.backgroundPosition = 'center';
                face.style.backgroundRepeat = 'no-repeat';
            } else {
                face.style.backgroundImage = 'none';
            }

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
    setText('backCoverTextStyleSelect', bc.textStyleId || 'default');

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
    switchTab('pages');
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
    if (confirm(t('confirm_delete_page', 'Delete this page?'))) {
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
    const isRtl = (document?.documentElement?.getAttribute('dir') || 'ltr') === 'rtl';
    // Nav logic updated for Cover (-1)
    if (state.currentPageIndex === 0 || state.currentPageIndex === 1) {
        // Go to Cover
        state.currentPageIndex = -1;
        renderCurrentPage();
        updatePageIndicator();
        return;
    }

    // Handle return from Back Cover
    if (state.currentPageIndex >= state.pages.length) {
        const lastSpreadBase = Math.floor((state.pages.length - 1) / 2) * 2;
        state.currentPageIndex = lastSpreadBase;
        renderCurrentPage();
        updatePageIndicator();
        return;
    }
    // In the book-like preview, we flip by spread (2 pages) to mimic turning a sheet.
    const base = Math.floor((state.currentPageIndex || 0) / 2) * 2;
    const targetBase = base - 2;
    if (targetBase < 0) {
        state.currentPageIndex = -1;
        renderCurrentPage();
        updatePageIndicator();
        return;
    }
    // In RTL UI, flipping direction is visually reversed.
    animateBookSpreadFlip(-1, targetBase, { rtl: isRtl });
}

function nextPage() {
    const isRtl = (document?.documentElement?.getAttribute('dir') || 'ltr') === 'rtl';
    // Nav logic updated for Back Cover (> length)
    if (state.currentPageIndex === -1) {
        state.currentPageIndex = 0;
        renderCurrentPage();
        updatePageIndicator();
        return;
    }

    // In the book-like preview, we flip by spread (2 pages) to mimic turning a sheet.
    const base = Math.floor((state.currentPageIndex || 0) / 2) * 2;
    const targetBase = base + 2;

    if (targetBase > state.pages.length - 1) {
        // Go to Back Cover
        state.currentPageIndex = state.pages.length;
        renderCurrentPage();
        updatePageIndicator();
        return;
    }
    // In RTL UI, flipping direction is visually reversed.
    animateBookSpreadFlip(1, targetBase, { rtl: isRtl });
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
    const getSlotsCount = (page) => {
        const layout = page?.layout || 'single';
        return state.config?.LAYOUTS?.[layout]?.slots || 1;
    };
    const isFilled = (item) => {
        if (!item) return false;
        if (item.type === 'text') return String(item.content || '').trim().length > 0;
        return !!(item.editedData || item.thumbnailUrl || item.baseUrl || item.id);
    };
    const getStatus = (page) => {
        const slots = getSlotsCount(page);
        const filled = (page?.photos || []).slice(0, slots).filter(isFilled).length;
        if (filled <= 0) return { status: 'empty', label: getUiLang() === 'he' ? 'ריק' : 'Empty', filled, slots };
        if (filled < slots) return { status: 'partial', label: getUiLang() === 'he' ? 'חלקי' : 'In progress', filled, slots };
        return { status: 'complete', label: getUiLang() === 'he' ? 'מוכן' : 'Complete', filled, slots };
    };
    const getThumbSrc = (item) => {
        if (!item || item.type === 'text') return null;
        // Prefer small local/rehydrated thumbnails first
        return item.editedData || item.thumbnailUrl || null;
    };

    container.innerHTML = state.pages.map((page, index) => {
        const slots = getSlotsCount(page);
        const { status, label, filled } = getStatus(page);
        const active = index === state.currentPageIndex ? 'active' : '';
        const slotsClass = `slots-${Math.min(4, Math.max(1, slots))}`;

        const slotItems = (page?.photos || []).slice(0, slots);
        // For 3-slot layout, render as 2x2 grid and leave 4th blank.
        const visualSlots = slots === 3 ? 4 : slots;
        const slotHtml = Array.from({ length: visualSlots }).map((_, i) => {
            const item = slotItems[i];
            if (!item) return `<div class="page-thumb-slot"></div>`;
            if (item.type === 'text') {
                return `<div class="page-thumb-slot is-text">Aa</div>`;
            }
            const src = getThumbSrc(item);
            if (src) return `<div class="page-thumb-slot"><img src="${src}" alt=""></div>`;
            return `<div class="page-thumb-slot"></div>`;
        }).join('');

        return `
          <div class="page-thumbnail-card status-${status} ${active}" onclick="goToPage(${index})" data-page-index="${index}">
            <div class="page-thumb-surface" data-page-index="${index}">
              <div class="page-thumb-badge">${label} • ${filled}/${slots}</div>
              <div class="page-thumb-slots ${slotsClass}">
                ${slotHtml}
              </div>
            </div>
            <div class="page-thumb-meta">
              <div class="page-thumb-num">${getUiLang() === 'he' ? 'עמוד' : 'Page'} ${index + 1}</div>
              <div class="page-thumb-status">${label}</div>
            </div>
          </div>
        `;
    }).join('');

    // Apply per-page background color/image to each thumbnail surface
    try {
        document.querySelectorAll('#pageThumbnails .page-thumb-surface').forEach((el) => {
            const idx = Number(el.getAttribute('data-page-index'));
            if (Number.isFinite(idx)) applyBackgroundToPageElement(el, idx);
        });
    } catch { /* ignore */ }
}

function highlightCurrentThumbnail() {
    document.querySelectorAll('.page-thumbnail').forEach((thumb, index) => {
        thumb.classList.toggle('active', index === state.currentPageIndex);
    });

    // Auto-detect direction after user edits text
    try { if ((state?.ui?.dir || 'auto') === 'auto') applyUiDirection(); } catch { /* ignore */ }
}

function updatePageIndicator() {
    if (state.currentPageIndex < 0) {
        document.getElementById('currentPageNum').textContent = t('page_cover', "Cover");
        document.getElementById('totalPages').textContent = state.pages.length;
    } else if (state.currentPageIndex >= state.pages.length) {
        document.getElementById('currentPageNum').textContent = t('page_back', "Back");
        document.getElementById('totalPages').textContent = state.pages.length;
    } else {
        document.getElementById('currentPageNum').textContent = state.pages.length > 0 ? state.currentPageIndex + 1 : 0;
        document.getElementById('totalPages').textContent = state.pages.length;
    }
}

// ============================================
// Template/theme visual preview helpers (HTML/SVG)
// ============================================
function renderCurrentPage() {
    const preview = document.getElementById('pagePreview');

    if (!preview) {
        console.error("renderCurrentPage: #pagePreview not found!");
        return;
    }

    // Thickness scales with number of spreads (sheets)
    const totalPages = state.pages?.length || 0;
    const sheets = Math.ceil(totalPages / 2);
    const thicknessPx = Math.max(14, Math.min(64, Math.round(12 + sheets * 1.35)));

    // CHECK FOR COVER OR BACK COVER
    // ============================================
    if (state.currentPageIndex < 0) {
        // FRONT COVER
        const coverColor = state?.selectedTemplate?.colors?.accentColor || document.getElementById('coverBgColor')?.value || '#2c3e50';
        preview.classList.remove('is-book-spread');
        preview.classList.add('is-cover-view');

        const coverStyleEntry = (window.TEXT_STYLES || []).find(s => s.id === state.coverTextStyle);
        const coverTypographyCss = coverStyleEntry ? textStyleEntryToInlineCss(coverStyleEntry) : '';

        preview.innerHTML = `
    <div class="book3d-cover-root" style="--book-thickness: ${thicknessPx}px; --cover-color: ${coverColor}; width: 62%; height: 62%; margin: auto; inset: 0;">
        <div class="book3d-cover-stage" style="transform: rotateX(10deg) rotateY(-15deg);">
            <div class="book3d-cover-face">
                <div class="book3d-cover-inner">
                    <div class="cover-photo-slot" onclick="selectPhotoForCover()" style="width: 90%; height: 70%; background: #eee; margin: 0 auto 20px; display: flex; align-items: center; justify-content: center; border-radius: 4px; border: 2px dashed #ccc; cursor: pointer; overflow: hidden; position: relative; z-index: 20;">
                        ${(() => {
                const isSafe = (src) => {
                    if (!src || typeof src !== 'string') return false;
                    const s = src.trim();
                    if (!s) return false;
                    if (s.startsWith('data:') || s.startsWith('blob:')) return true;
                    if (!/^https?:\/\//i.test(s)) return true;
                    try { return new URL(s, window.location.href).origin === window.location.origin; } catch { return false; }
                };
                const thumb = state.cover?.photo?.thumbnailUrl;
                const url = (isSafe(thumb) ? thumb : (isSafe(state.cover?.photoUrl) ? state.cover.photoUrl : ''));
                if (!url) return '<span style="color:#999; font-size:12px;">+ Add Cover Photo</span>';
                const shape = state.cover?.photoShape || 'rect';
                const radius = state.globalCornerRadius || 0;
                const br = (shape === 'circle') ? '50%' : (shape === 'oval') ? '50% / 35%' : (shape === 'rounded') ? `${Math.max(12, radius)}px` : `${radius}px`;
                let frameLayer = '';
                try {
                    const frameId = state.cover?.photoFrameId;
                    const frame = frameId && window.IMAGE_FRAMES ? window.IMAGE_FRAMES.find(f => f.id === frameId) : null;
                    if (frame && frame.svgGen) {
                        const svgContent = frame.svgGen(1000, 1000, frame.color || '#111827', shape);
                        frameLayer = `<div class="image-frame-layer" style="position:absolute; inset:0; pointer-events:none; z-index:4;"><svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" style="display:block;">${svgContent}</svg></div>`;
                    }
                } catch { /* ignore */ }
                return `<div class="image-mask" style="position:absolute; inset:0; border-radius:${br}; overflow:hidden;"><img src="${url}" style="width:100%; height:100%; object-fit:cover; border-radius:${br};"></div>${frameLayer}`;
            })()}
                    </div>
                    <h1 style="font-size: 3em; color: ${state.cover?.titleColor || state.cover?.textColor || '#ffffff'}; font-family: ${state.cover?.titleFont || 'inherit'}; ${coverTypographyCss}">${state.cover?.title || 'My Photo Book'}</h1>
                    <h3 style="font-size: 1.5em; color: ${state.cover?.subtitleColor || state.cover?.textColor || state.cover?.titleColor || 'rgba(255,255,255,0.8)'}; margin-top: 5px; font-family: ${state.cover?.subtitleFont || 'inherit'}; ${coverTypographyCss}">${state.cover?.subtitle || 'Add a subtitle'}</h3>
                </div>
            </div>
            <div class="book3d-cover-spine"></div>
            <div class="book3d-cover-foreedge"></div>
            <div class="book3d-cover-bottom"></div>
        </div>
        </div>`;

        // Show Cover Settings, Hide others
        const coverPanel = document.getElementById('cover-settings-panel');
        const pagePanel = document.getElementById('pages-settings-panel');
        const backPanel = document.getElementById('backcover-settings-panel');

        // Anti-bounce: Check before set to avoid needless layout trashing
        if (coverPanel && coverPanel.style.display !== 'block') coverPanel.style.display = 'block';
        if (pagePanel && pagePanel.style.display !== 'none') pagePanel.style.display = 'none';
        if (backPanel && backPanel.style.display !== 'none') backPanel.style.display = 'none';

        // Ensure toolbar is visible
        const toolbar = document.querySelector('.floating-toolbar');
        if (toolbar && toolbar.style.display !== 'flex') toolbar.style.display = 'flex';

        // CRITICAL: Apply template assets and sync latest state to the fresh DOM
        // Defer this slightly to allow DOM to settle if called rapidly
        setTimeout(() => updateCoverPreview(), 0);

        return;
    }

    if (totalPages === 0) {
        preview.innerHTML = '<div class="empty-state">No pages yet. Select photos and click "Auto-Arrange"</div>';
        return;
    }

    // Spread indices (left/right pages visible at once)
    const base = Math.floor((state.currentPageIndex || 0) / 2) * 2;
    const leftIndex = base;
    const rightIndex = base + 1;

    if (state.currentPageIndex >= totalPages) {
        // BACK COVER
        const coverColor = state?.selectedTemplate?.colors?.accentColor || document.getElementById('coverBgColor')?.value || '#2c3e50';
        preview.classList.remove('is-book-spread');
        preview.classList.add('is-cover-view');

        const bc = state.backCover || {};
        const bcBgColor = bc.backgroundColor || '#1a1a2e';
        const bcTextColor = bc.textColor || '#ffffff';
        const bcTextSize = bc.textSize || 18;
        const bcSubtitle = bc.subtitle || '';
        const bcSubtitleSize = bc.subtitleSize || 12;
        const bcFont = bc.textFont || 'Inter';
        const bcAlign = bc.textAlign || 'center';
        const bcShowBorder = bc.showBorder !== false;
        const bcBgImg = bc.backgroundImageUrl || bc.backgroundImageData || null;
        const bcStyleEntry = (window.TEXT_STYLES || []).find(s => s.id === bc.textStyleId);
        const bcStyleCss = bcStyleEntry ? textStyleEntryToInlineCss(bcStyleEntry) : '';

        preview.innerHTML = `
    <div class="book3d-cover-root is-back" style="--book-thickness: ${thicknessPx}px; --cover-color: ${coverColor}; width: 62%; height: 62%; margin: auto; inset: 0;">
        <div class="book3d-cover-stage" style="transform: rotateX(10deg) rotateY(15deg);">
            <div class="book3d-cover-face">
                <div class="book3d-cover-inner" style="display:flex; flex-direction:column; gap:10px; justify-content:center; padding: 24px; text-align:${bcAlign}; align-items:${bcAlign === 'left' ? 'flex-start' : (bcAlign === 'right' ? 'flex-end' : 'center')};">
                    <div id="backCoverTextPreview" style="font-size:${bcTextSize}px; color:${bcTextColor}; font-family:'${bcFont}', sans-serif; max-width: 100%; ${bcStyleCss}">${escapeHtml(bc.text || 'The End')}</div>
                    <div id="backCoverSubtitlePreview" style="font-size:${bcSubtitleSize}px; color:${bcTextColor}; opacity:0.75; font-family:'${bcFont}', sans-serif; display:${bcSubtitle ? 'block' : 'none'}; max-width: 100%; ${bcStyleCss}">${escapeHtml(bcSubtitle)}</div>
                    <div id="backCoverLogoPreview" style="margin-top:18px; font-size: 12px; opacity:0.75; color:${bcTextColor}; display:${bc.showLogo ? 'block' : 'none'};">Shoso</div>
                </div>
            </div>
            <div class="book3d-cover-spine"></div>
            <div class="book3d-cover-foreedge"></div>
            <div class="book3d-cover-bottom"></div>
        </div>
        </div>`;

        // Apply back cover background + border to the face element
        const face = preview.querySelector('.book3d-cover-face');
        if (face) {
            face.style.backgroundColor = bcBgColor;
            if (bcBgImg) {
                face.style.backgroundImage = `url("${bcBgImg}")`;
                face.style.backgroundSize = 'cover';
                face.style.backgroundPosition = 'center';
                face.style.backgroundRepeat = 'no-repeat';
            } else {
                face.style.backgroundImage = 'none';
            }
            if (bcShowBorder) face.classList.remove('no-border');
            else face.classList.add('no-border');
        }

        // Show Back Cover Settings
        const coverPanel = document.getElementById('cover-settings-panel');
        const pagePanel = document.getElementById('pages-settings-panel');
        const backPanel = document.getElementById('backcover-settings-panel');

        // Anti-bounce logic
        if (coverPanel && coverPanel.style.display !== 'none') coverPanel.style.display = 'none';
        if (pagePanel && pagePanel.style.display !== 'none') pagePanel.style.display = 'none';
        if (backPanel && backPanel.style.display !== 'block') backPanel.style.display = 'block';

        // Ensure toolbar is visible
        const toolbar = document.querySelector('.floating-toolbar');
        if (toolbar) toolbar.style.display = 'flex';

        // Apply assets to back cover too (spine interactions etc)
        updateCoverPreview();
        try { updateBackCoverFromState(); } catch { /* ignore */ }

        return;
    }

    // NORMAL SPREAD RENDER - Settings Panels
    const coverPanel = document.getElementById('cover-settings-panel');
    const pagePanel = document.getElementById('pages-settings-panel');
    const backPanel = document.getElementById('backcover-settings-panel');
    if (coverPanel) coverPanel.style.display = 'none';
    if (pagePanel) pagePanel.style.display = 'block';
    if (backPanel) backPanel.style.display = 'none';

    // Ensure toolbar is visible
    const toolbar = document.querySelector('.floating-toolbar');
    if (toolbar) toolbar.style.display = 'flex';

    // NORMAL SPREAD RENDER
    preview.classList.remove('is-cover-view');
    preview.classList.add('is-book-spread');
    preview.style.setProperty('--book-thickness', `${thicknessPx}px`);

    // Get cover color for spine
    const coverColor = state?.selectedTemplate?.colors?.accentColor ||
        document.getElementById('coverBgColor')?.value ||
        '#2c3e50';

    const isRtl = (document?.documentElement?.getAttribute('dir') || 'ltr') === 'rtl';

    // Logical indices for this spread
    const logicalLeftIndex = base;
    const logicalRightIndex = (base + 1 < totalPages) ? (base + 1) : null;

    // Display indices depend on reading direction (RTL: page 1 is on the right side)
    const displayLeftIndex = isRtl ? logicalRightIndex : logicalLeftIndex;
    const displayRightIndex = isRtl ? logicalLeftIndex : logicalRightIndex;

    const pagesLeft = Math.max(0, totalPages - (base + 2));
    const a = displayRightIndex; // start side in RTL (right) / LTR (left) is handled below
    const b = displayLeftIndex;
    const firstIdx = isRtl ? a : displayLeftIndex;
    const secondIdx = isRtl ? b : displayRightIndex;
    const spreadLabel = `Pages ${Number.isFinite(firstIdx) ? (firstIdx + 1) : ''}${Number.isFinite(secondIdx) ? `–${secondIdx + 1}` : ''} · ${pagesLeft} left`;

    preview.innerHTML = `
    <div class="book3d" style="--book-thickness: ${thicknessPx}px; --cover-color: ${coverColor}; width: 62%; height: 62%; margin: auto; inset: 0; position: absolute;">
        <div class="book3d-stage">
            <div class="book3d-body">
                <div class="book3d-spine"></div>
                <div class="book3d-foreedge"></div>
                <div class="book3d-bottom"></div>

                <div class="book3d-spread">
                    <div id="leftPage" class="book3d-page book3d-page-left ${state.currentPageIndex === displayLeftIndex ? 'is-active' : ''}" data-page-index="${displayLeftIndex ?? ''}"></div>
                    <div class="book3d-gutter"></div>
                    <div id="rightPage" class="book3d-page book3d-page-right ${state.currentPageIndex === displayRightIndex ? 'is-active' : ''}" data-page-index="${displayRightIndex ?? ''}"></div>
                </div>

                <div class="book3d-progress">${escapeHtml(spreadLabel)}</div>
                <div class="book3d-flip-layer" aria-hidden="true"></div>
            </div>
        </div>
      </div>
    `;

    // Render both pages (inactive side is non-interactive preview)
    const leftEl = document.getElementById('leftPage');
    const rightEl = document.getElementById('rightPage');

    if (leftEl) {
        if (Number.isFinite(displayLeftIndex)) {
            leftEl.innerHTML = renderSinglePageHtml(displayLeftIndex, { isActive: state.currentPageIndex === displayLeftIndex });
            applyBackgroundToPageElement(leftEl, displayLeftIndex);
            if (state.currentPageIndex !== displayLeftIndex) {
                leftEl.insertAdjacentHTML('beforeend', `<button class="book3d-page-activate" type="button" onclick="activatePage(${displayLeftIndex})" aria-label="Edit page ${displayLeftIndex + 1}"></button>`);
            }
        } else {
            leftEl.innerHTML = '';
        }
    }
    if (rightEl) {
        if (Number.isFinite(displayRightIndex)) {
            rightEl.innerHTML = renderSinglePageHtml(displayRightIndex, { isActive: state.currentPageIndex === displayRightIndex });
            applyBackgroundToPageElement(rightEl, displayRightIndex);
            if (displayRightIndex < totalPages && state.currentPageIndex !== displayRightIndex) {
                rightEl.insertAdjacentHTML('beforeend', `<button class="book3d-page-activate" type="button" onclick="activatePage(${displayRightIndex})" aria-label="Edit page ${displayRightIndex + 1}"></button>`);
            }
        } else {
            rightEl.innerHTML = '';
        }
    }

    // Setup drag/drop only for the active page slots (inactive pages have draggable=false)
    setupPhotoDragAndDrop();
    updateAlignmentControls();
    updateTextSlotControls();

    // Sync controls to the active page
    const page = state.pages[state.currentPageIndex];
    if (!page) return;

    // Update Side Switcher Buttons
    const sideSwitcher = document.getElementById('pageSideSwitcher');
    if (sideSwitcher) {
        if (state.currentPageIndex < 0 || state.currentPageIndex >= state.pages.length) {
            sideSwitcher.style.display = 'none';
        } else {
            const base = Math.floor(state.currentPageIndex / 2) * 2;
            const logicalLeftIndex = base;
            const logicalRightIndex = (base + 1 < state.pages.length) ? (base + 1) : null;
            const isRtl = (document?.documentElement?.getAttribute('dir') || 'ltr') === 'rtl';
            const leftIndex = isRtl ? logicalRightIndex : logicalLeftIndex;
            const rightIndex = isRtl ? logicalLeftIndex : logicalRightIndex;
            const hasLeft = Number.isFinite(leftIndex);
            const hasRight = Number.isFinite(rightIndex);

            sideSwitcher.style.display = 'flex';

            const btnLeft = document.getElementById('btnSideLeft');
            const btnRight = document.getElementById('btnSideRight');

            if (btnLeft) {
                btnLeft.classList.toggle('active', state.currentPageIndex === leftIndex);
                btnLeft.disabled = !hasLeft;
            }
            if (btnRight) {
                btnRight.classList.toggle('active', state.currentPageIndex === rightIndex);
                btnRight.disabled = !hasRight;
            }
        }
    }

    const template = page.templateData || state.selectedTemplate;
    const theme = template || (page.theme ? state.config.THEMES[page.theme] : null) || state.config.THEMES[state.currentTheme] || state.config.THEMES['classic'];
    const bgColor = page.backgroundColor || (template ? template.colors.pageBackground : theme.colors.bg);

    const pageLayoutEl = document.getElementById('pageLayout');
    // Avoid mutating a focused <select> while user is interacting with it
    // (can close the dropdown on some browsers).
    if (pageLayoutEl && document.activeElement !== pageLayoutEl) pageLayoutEl.value = page.layout;

    // Photo spacing (gap between layout slots)
    const spacingEl = document.getElementById('pagePhotoSpacing');
    const spacingValEl = document.getElementById('pagePhotoSpacingVal');
    if (spacingEl) {
        const gap = Number.isFinite(page.photoSpacing) ? page.photoSpacing : 16;
        spacingEl.value = String(gap);
        if (spacingValEl) spacingValEl.textContent = `${gap}px`;
    }

    const pageBgColorEl = document.getElementById('pageBgColor');
    if (pageBgColorEl) pageBgColorEl.value = page.backgroundColor || bgColor;

    const pageCaptionEl = document.getElementById('pageCaption');
    if (pageCaptionEl) pageCaptionEl.value = page.caption || '';

    const showPageNumberEl = document.getElementById('showPageNumber');
    if (showPageNumberEl) showPageNumberEl.checked = page.showPageNumber;

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

    const pageBorderEl = document.getElementById('pageBorder');
    if (page.photoBorder) {
        if (pageBorderEl) pageBorderEl.checked = true;
        const pageBorderColorEl = document.getElementById('pageBorderColor');
        if (pageBorderColorEl) pageBorderColorEl.value = page.photoBorder.color;
        const pageBorderWeightEl = document.getElementById('pageBorderWeight');
        if (pageBorderWeightEl) pageBorderWeightEl.value = page.photoBorder.weight;
    } else {
        if (pageBorderEl) pageBorderEl.checked = false;
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

/**
 * Helper to render decorations (SVGs or Unicode)
 */
function renderDecorationSvg(dec, color, opacity, size) {
    if (!dec) return '';

    // Check if it's an SVG icon name in the global Icons object
    let svgContent = '';
    if (typeof Icons !== 'undefined' && Icons[dec]) {
        svgContent = Icons[dec];
    } else if (dec.startsWith('<svg')) {
        // Direct SVG string
        svgContent = dec;
    } else {
        // Assume Unicode/Emoji
        return `<div style="
            width: ${size}px; 
            height: ${size}px; 
            font-size: ${size * 0.7}px; 
            color: ${color}; 
            opacity: ${opacity}; 
            display: flex; 
            align-items: center; 
            justify-content: center;
        ">${dec}</div>`;
    }

    return `<div style="
        width: ${size}px; 
        height: ${size}px; 
        color: ${color}; 
        opacity: ${opacity}; 
        display: flex; 
        align-items: center; 
        justify-content: center;
    ">${svgContent}</div>`;
}

/**
 * Convert a TEXT_STYLES entry to inline CSS.
 * Supports special webkit keys used by some styles.
 * @param {Object} styleEntry - An item from window.TEXT_STYLES
 * @return {string}
 */
function textStyleEntryToInlineCss(styleEntry) {
    const style = styleEntry?.style || {};
    const fallback = styleEntry?.fallbackStyle || {};
    const merged = { ...fallback, ...style };

    const toKebab = (key) => key
        .replace(/^webkit/i, '') // handled separately
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .toLowerCase();

    let css = '';
    for (const [key, value] of Object.entries(merged)) {
        if (value === undefined || value === null || value === '') continue;

        if (/^webkit/i.test(key)) {
            // e.g. webkitBackgroundClip -> -webkit-background-clip
            const prop = '-webkit-' + toKebab(key);
            css += `${prop}:${value};`;
            continue;
        }
        css += `${toKebab(key)}:${value};`;
    }
    return css;
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

        // Fix: Use edited data if available, otherwise thumbnail
        const displayUrl = photo ? (photo.editedData || photo.thumbnailUrl) : null;

        // Check types
        const isTextSlot = photo && photo.type === 'text';
        const hasPhoto = !isTextSlot && displayUrl && displayUrl.startsWith('data:');

        const hasPhotoData = photo && (photo.editedData || photo.baseUrl || photo.id || isTextSlot);
        const isSelected = isActive && (state.currentPageIndex === pageIndex) && (state.selectedPhotoSlot === i);
        const alignment = photo?.alignment || 'center';
        const objectPos = alignment === 'left' ? '0% 50%' : (alignment === 'right' ? '100% 50%' : '50% 50%');
        const draggable = isActive && hasPhotoData ? 'true' : 'false';
        const replaceClick = (isActive && hasPhotoData)
            ? (isTextSlot
                ? `onclick="showTextOptions(${i}, event)"`
                : `onclick="showPhotoOptions(${i}, event)"`)
            : '';

        let slotContent = '';
        if (isTextSlot) {
            // Render Styled Text
            let styleString = '';
            if (photo.styleId && window.TEXT_STYLES) {
                const styleObj = window.TEXT_STYLES.find(s => s.id === photo.styleId);
                if (styleObj && styleObj.style) {
                    styleString = textStyleEntryToInlineCss(styleObj);
                }
            } else {
                // Default fallback
                styleString = 'font-family:sans-serif; color:#333; font-size:24px;';
            }
            const rot = Number.isFinite(photo.rotation) ? photo.rotation : 0;
            const fs = Number.isFinite(photo.fontSize) ? photo.fontSize : null;
            const ss = Number.isFinite(photo.shadowStrength) ? photo.shadowStrength : 0;
            const shadowCss = ss > 0 ? `filter: drop-shadow(0 2px ${Math.max(1, ss / 10)}px rgba(0,0,0,${Math.min(0.7, ss / 140)}));` : '';
            // Ensure font size scales with slot? Or fixed? 
            // For now, fixed relative to container or auto-fit could be complex. 
            // Let's use a reasonable base size and rely on the style's definition or defaults.
            // We might want to center it.
            slotContent = `<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; padding:16px; overflow:hidden; text-align:center;">
                             <span style="${styleString} ${fs ? `font-size:${fs}px;` : ''} white-space: pre-wrap; word-break: break-word; display:inline-block; max-width:100%; transform: rotate(${rot}deg); transform-origin:center; line-height:1.1; ${shadowCss}">${escapeHtml(photo.content)}</span>
                           </div>`;
        } else if (hasPhoto) {
            const shape = photo?.shape || 'rect';
            const radius = state.globalCornerRadius || 0;
            const borderRadius = (shape === 'circle') ? '50%' :
                (shape === 'oval') ? '50% / 35%' :
                    (shape === 'rounded') ? `${Math.max(12, radius)}px` :
                        `${radius}px`;
            const maskStyle = `border-radius:${borderRadius}; overflow:hidden;`;

            // Optional per-image frame overlay
            let frameHtml = '';
            try {
                const frameId = photo?.frameId;
                const frame = frameId && window.IMAGE_FRAMES ? window.IMAGE_FRAMES.find(f => f.id === frameId) : null;
                if (frame && frame.svgGen) {
                    const svgContent = frame.svgGen(1000, 1000, frame.color || '#111827', shape);
                    frameHtml = `
                      <div class="image-frame-layer" style="position:absolute; inset:0; pointer-events:none; z-index:4;">
                        <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" style="display:block;">
                          ${svgContent}
                        </svg>
                      </div>
                    `;
                }
            } catch { /* ignore */ }

            slotContent = `
              <div class="image-mask" style="position:absolute; inset:0; ${maskStyle}">
                <img src="${displayUrl}" alt="" draggable="false" style="width:100%; height:100%; object-fit:cover; object-position:${objectPos}; border-radius:${borderRadius};">
              </div>
              ${frameHtml}
            `;
        } else if (hasPhotoData) {
            slotContent = `<div class="thumbnail-placeholder">Photo ${i + 1}</div>`;
        } else {
            slotContent = `<div class="empty-slot" onclick="activatePage(${pageIndex}); selectPhotoForSlot(${i})">Click to add photo or text</div>`;
        }

        slotsHtml += `
    <div class="layout-slot slot-${i} ${hasPhotoData ? 'has-photo' : ''} ${isSelected ? 'selected' : ''}"
           data-slot-index="${i}"
           draggable="${draggable}"
           ${replaceClick}>
           ${slotContent}
           <span class="slot-number">${i + 1}</span>
        ${hasPhotoData && !isTextSlot ? `
          <button class="edit-photo-btn" title="Edit Design" onclick="event.stopPropagation(); window.selectPhotoForSlot(${i}); window.openDesignStudio();">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" style="display:inline-block; vertical-align:middle; margin-right:2px;"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
            Edit
          </button>
        ` : ''}
        ${hasPhotoData && isTextSlot ? `
          <button class="edit-photo-btn" title="Edit Text" onclick="event.stopPropagation(); openTextStudio(${i});">
            Edit
          </button>
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

    // NEW: Page Frames (Overrides older decorations)
    if (page.frameId && window.PAGE_FRAMES) {
        const frame = window.PAGE_FRAMES.find(f => f.id === page.frameId);
        if (frame) {
            // Use a standard 1000x1000 coordinate system for the vector generation
            // The SVG will scale to fit the page container
            const svgContent = frame.svgGen(1000, 1000, frame.color);
            decorationsHtml = `
                <div class="page-frame-layer" style="position:absolute; inset:0; pointer-events:none; z-index:2;">
                    <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none" style="display:block;">
                        ${svgContent}
                    </svg>
                </div>
            `;
        }
    }

    // Legacy/Theme Decorations (Only if no frame is set)
    if (!decorationsHtml && decorations.length > 0 && illustrations.pattern !== 'none') {
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
        }).join('')
            }
          </div>
            `;
    }

    // In the 3D book spread preview we keep the surface clean (no big diagonal overlays),
    // so the book geometry reads clearly.
    const themeOverlayHtml = '';

    const gridId = isActive ? 'pageLayoutGrid' : `pageLayoutGrid_${pageIndex} `;
    const captionColor = template ? (template.colors.captionColor || template.colors.textColor || '#333333') : (theme.colors.text || '#333333');
    const gapPx = Number.isFinite(page?.photoSpacing) ? page.photoSpacing : 16;

    return `
      ${themeOverlayHtml}
        <div class="layout-grid ${layoutClass}" id="${gridId}" style="position: relative; z-index: 2; --layout-gap: ${gapPx}px;">
            ${slotsHtml}
        </div>
      ${decorationsHtml}
      ${page.caption ? `<div class="page-caption" style="color: ${captionColor};">${escapeHtml(page.caption)}</div>` : ''}
        `;
}

let __bookFlipInProgress = false;
function animateBookSpreadFlip(direction, targetBaseIndex, opts = {}) {
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

    const isRtl = !!opts.rtl;
    const isForward = direction > 0;
    // In RTL we flip from left->right when moving forward (opposite of LTR).
    const sheetClass = isForward ? (isRtl ? 'is-prev' : 'is-next') : (isRtl ? 'is-next' : 'is-prev');

    // Determine which page faces should show during the flip (display-aware)
    const logicalCurrentLeft = base;
    const logicalCurrentRight = (base + 1 < totalPages) ? (base + 1) : null;
    const logicalTargetLeft = targetBaseIndex;
    const logicalTargetRight = (targetBaseIndex + 1 < totalPages) ? (targetBaseIndex + 1) : null;

    const currentDisplayLeft = isRtl ? logicalCurrentRight : logicalCurrentLeft;
    const currentDisplayRight = isRtl ? logicalCurrentLeft : logicalCurrentRight;
    const targetDisplayLeft = isRtl ? logicalTargetRight : logicalTargetLeft;
    const targetDisplayRight = isRtl ? logicalTargetLeft : logicalTargetRight;

    // Forward:
    // - LTR: flip the RIGHT page; back becomes target LEFT page
    // - RTL: flip the LEFT page; back becomes target RIGHT page
    // Backward:
    // - LTR: flip the LEFT page; back becomes target RIGHT page
    // - RTL: flip the RIGHT page; back becomes target LEFT page
    const frontIndex = isForward ? (isRtl ? currentDisplayLeft : currentDisplayRight) : (isRtl ? currentDisplayRight : currentDisplayLeft);
    const backIndex = isForward ? (isRtl ? targetDisplayRight : targetDisplayLeft) : (isRtl ? targetDisplayLeft : targetDisplayRight);

    // Determine what should be visible UNDERNEATH the flipping page
    let underneathLeftIndex = null;
    let underneathRightIndex = null;
    if (isForward) {
        // LTR forward: left stays currentLeft, right reveals targetRight
        // RTL forward: right stays currentRight, left reveals targetLeft
        underneathLeftIndex = isRtl ? targetDisplayLeft : currentDisplayLeft;
        underneathRightIndex = isRtl ? currentDisplayRight : targetDisplayRight;
    } else {
        // LTR backward: right stays currentRight, left reveals targetLeft
        // RTL backward: left stays currentLeft, right reveals targetRight
        underneathLeftIndex = isRtl ? currentDisplayLeft : targetDisplayLeft;
        underneathRightIndex = isRtl ? targetDisplayRight : currentDisplayRight;
    }

    // Render the flipping sheet
    const frontHtml = Number.isFinite(frontIndex) ? renderSinglePageHtml(frontIndex, { isActive: false }) : '';
    const backHtml = Number.isFinite(backIndex) ? renderSinglePageHtml(backIndex, { isActive: false }) : '';

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
    if (Number.isFinite(frontIndex)) applyBackgroundToPageElement(frontFace, frontIndex);
    if (Number.isFinite(backIndex)) applyBackgroundToPageElement(backFace, backIndex);

    // UPDATE STATIC BACKGROUND PAGES BEFORE ANIMATION STARTS
    // This ensures we reveal the correct page underneath the lifting sheet
    const leftPageEl = document.getElementById('leftPage');
    const rightPageEl = document.getElementById('rightPage');

    if (leftPageEl) {
        leftPageEl.innerHTML = Number.isFinite(underneathLeftIndex) ? renderSinglePageHtml(underneathLeftIndex, { isActive: false }) : '';
        if (Number.isFinite(underneathLeftIndex)) applyBackgroundToPageElement(leftPageEl, underneathLeftIndex);
    }
    if (rightPageEl) {
        rightPageEl.innerHTML = Number.isFinite(underneathRightIndex) ? renderSinglePageHtml(underneathRightIndex, { isActive: false }) : '';
        if (Number.isFinite(underneathRightIndex)) applyBackgroundToPageElement(rightPageEl, underneathRightIndex);
    }

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
    // Safety timeout in case transitionend doesn't fire (matched to 1200ms CSS + buffer)
    setTimeout(() => { if (__bookFlipInProgress) finish(); }, 1400);
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
    const pageLayoutEl = document.getElementById('pageLayout');
    if (pageLayoutEl) {
        state.pages[state.currentPageIndex].layout = pageLayoutEl.value;
        // Defer to let the native <select> commit selection without being interrupted.
        setTimeout(() => renderCurrentPage(), 0);
    }
}

function updatePagePhotoSpacing(val) {
    if (!state.pages || state.pages.length === 0) return;
    if (state.currentPageIndex < 0 || state.currentPageIndex >= state.pages.length) return;

    const v = Math.max(0, Math.min(40, parseInt(val, 10) || 0));
    const page = state.pages[state.currentPageIndex];
    page.photoSpacing = v;

    const label = document.getElementById('pagePhotoSpacingVal');
    if (label) label.textContent = `${v}px`;

    // Re-render so the layout gap changes immediately
    renderCurrentPage();
}

window.updatePagePhotoSpacing = updatePagePhotoSpacing;

function updatePageBackground() {
    if (state.pages.length === 0) return;
    const pageBgColorEl = document.getElementById('pageBgColor');
    let bgColor = '#ffffff';

    if (pageBgColorEl) {
        bgColor = pageBgColorEl.value;
        state.pages[state.currentPageIndex].backgroundColor = bgColor;
    }

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

    console.log(`Updated page ${state.currentPageIndex + 1} background to: ${bgColor} `);
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

// ============================================
// BACKGROUND GALLERY LOGIC
// ============================================

// Helper: Simple Toast Notification
function showToast(message, type = 'info') {
    // Check if existing toast container
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position:fixed; bottom:20px; left:50%; transform:translateX(-50%); z-index:10000; display:flex; flex-direction:column; gap:10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.textContent = message;
    toast.style.cssText = `
        background: ${type === 'success' ? '#4CAF50' : '#333'};
        color: white; padding: 12px 24px; border-radius: 4px; 
        box-shadow: 0 2px 10px rgba(0,0,0,0.2); font-size: 14px;
        opacity: 0; transform: translateY(20px); transition: all 0.3s ease;
    `;
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
        toast.style.opacity = '1';
        toast.style.transform = 'translateY(0)';
    });

    // Remove after 3s
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function openBackgroundGallery() {
    const modal = document.getElementById('backgroundGalleryModal');
    if (!modal) return;
    modal.style.display = 'flex'; // Ensure flex for centering

    // Only allow "Image Frames" in the gallery for the COVER.
    // For page photos, frames live inside the Design Studio.
    try {
        const isCover = state.currentPageIndex === -1;
        const btn = document.querySelector('.gallery-tab[data-gallery-tab="imageFrames"]');
        if (btn) btn.style.display = isCover ? '' : 'none';
        if (!isCover && typeof currentGalleryTab !== 'undefined' && currentGalleryTab === 'imageFrames') {
            currentGalleryTab = 'textures';
        }
    } catch { /* ignore */ }

    // Default to textures if not set
    if (typeof currentGalleryTab === 'undefined') currentGalleryTab = 'textures';
    switchGalleryTab(currentGalleryTab);
}

function triggerBackCoverBackgroundImageUpload() {
    document.getElementById('backCoverBgImageFile')?.click();
}

async function updateBackCoverBackgroundImage(event) {
    try {
        const file = event?.target?.files?.[0];
        if (!file) return;

        showToast('Processing back cover background…');
        const dataUrl = await fileToCompressedJpegDataUrl(file, { maxDimension: 2400, quality: 0.9 });

        state.backCover = state.backCover || {};
        // Store as data URL first (instant preview)
        state.backCover.backgroundImageData = dataUrl;
        state.backCover.backgroundImageUrl = null;
        state.backCover.backgroundImageName = file.name || 'background.jpg';

        const status = document.getElementById('backCoverBgImageStatus');
        if (status) status.textContent = `Selected: ${state.backCover.backgroundImageName}`;

        updateBackCoverPreview();
        renderCurrentPage();

        // Attempt upload to Storage for persistence + PDF friendliness
        try {
            const url = await uploadBackgroundImageToStorage(dataUrl, file.name);
            if (url) {
                state.backCover.backgroundImageUrl = url;
                state.backCover.backgroundImageData = null;
                updateBackCoverPreview();
                renderCurrentPage();
            }
        } catch (e) {
            console.warn('Back cover background upload failed (keeping data URL):', e);
        }
    } catch (e) {
        console.error(e);
        showToast('Failed to set back cover background', 'info');
    } finally {
        // Reset input so selecting the same file again triggers change
        const input = document.getElementById('backCoverBgImageFile');
        if (input) input.value = '';
    }
}

function clearBackCoverBackgroundImage() {
    state.backCover = state.backCover || {};
    state.backCover.backgroundImageUrl = null;
    state.backCover.backgroundImageData = null;
    state.backCover.backgroundImageName = null;
    const status = document.getElementById('backCoverBgImageStatus');
    if (status) status.textContent = 'No image set';
    updateBackCoverPreview();
    renderCurrentPage();
}

function showInputforSearchDesign() {
    // Ensure the gallery is open so the input is visible
    openBackgroundGallery();
    const c = document.getElementById('aiSearchContainer');
    if (!c) return;
    const isHidden = (c.style.display === 'none' || !c.style.display);
    c.style.display = isHidden ? 'block' : 'none';
    if (isHidden) {
        const input = document.getElementById('aiDesignPrompt');
        if (input) {
            input.focus();
            input.select?.();
        }
    }
}

function closeBackgroundGallery() {
    const modal = document.getElementById('backgroundGalleryModal');
    if (modal) modal.style.display = 'none';
}

// Close Design Gallery on backdrop click / ESC
document.addEventListener('DOMContentLoaded', () => {
    const modal = document.getElementById('backgroundGalleryModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            // Click outside the dialog closes
            if (e.target === modal) closeBackgroundGallery();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const m = document.getElementById('backgroundGalleryModal');
            if (m && getComputedStyle(m).display !== 'none') closeBackgroundGallery();
        }
    });
});

function switchGalleryTab(tab) {
    // Prevent opening Image Frames tab for inner pages.
    if (tab === 'imageFrames' && state.currentPageIndex !== -1) {
        showToast(getUiLang() === 'he' ? 'מסגרות לתמונה נמצאות בסטודיו העיצוב' : 'Image frames are in the Design Studio', 'info');
        tab = 'textures';
        try { currentGalleryTab = tab; } catch { /* ignore */ }
    }

    const tabs = document.querySelectorAll('.gallery-tab');
    tabs.forEach(t => {
        const k = t.getAttribute('data-gallery-tab');
        if (k) {
            t.classList.toggle('active', k === tab);
            return;
        }
        // Fallback to previous behavior if markup is older
        if (t.textContent.toLowerCase().includes(String(tab).toLowerCase())) t.classList.add('active');
        else t.classList.remove('active');
        if (tab === 'textures' && t.textContent.includes('Paper')) t.classList.add('active');
        if (tab === 'typography' && t.textContent.includes('Typography')) t.classList.add('active');
    });

    // Design gallery grid id in HTML is `backgroundGalleryGrid`.
    // Keep a fallback to `galleryGrid` for older markup.
    const grid = document.getElementById('backgroundGalleryGrid') || document.getElementById('galleryGrid');
    if (!grid) return;
    grid.innerHTML = ''; // Clear

    if (tab === 'textures') {
        renderGalleryTextures(grid);
    } else if (tab === 'frames') {
        renderGalleryFrames(grid);
    } else if (tab === 'imageFrames') {
        renderGalleryImageFrames(grid);
    } else if (tab === 'typography') {
        renderGalleryTypography(grid); // NEW
    }
}

function getActiveImageTarget() {
    // Cover photo
    if (state.currentPageIndex === -1) {
        const hasCoverPhoto = !!(state.cover?.photo?.editedData || state.cover?.photo?.thumbnailUrl || state.cover?.photoUrl);
        return hasCoverPhoto ? { type: 'cover' } : null;
    }

    // Inner pages
    const page = state.pages?.[state.currentPageIndex];
    const slot = state.selectedPhotoSlot;
    const item = (page && slot !== null && slot !== undefined) ? page.photos?.[slot] : null;
    if (!item || item.type === 'text') return null;
    return { type: 'page', pageIndex: state.currentPageIndex, slotIndex: slot };
}

function getCurrentImageShape() {
    const target = getActiveImageTarget();
    if (!target) return 'rect';
    if (target.type === 'cover') return state.cover?.photoShape || 'rect';
    const item = state.pages?.[target.pageIndex]?.photos?.[target.slotIndex];
    return item?.shape || 'rect';
}

function setImageShapeForTarget(shape) {
    const target = getActiveImageTarget();
    if (!target) {
        showToast(getUiLang() === 'he' ? 'בחר תמונה כדי לערוך מסגרת/צורה' : 'Select an image first', 'info');
        return;
    }
    const s = String(shape || 'rect');
    if (target.type === 'cover') {
        state.cover.photoShape = s;
    } else {
        const item = state.pages?.[target.pageIndex]?.photos?.[target.slotIndex];
        if (item) item.shape = s;
    }
    renderCurrentPage();
}

function applyImageShapeToAll(shape) {
    const s = String(shape || 'rect');
    if (state.cover) state.cover.photoShape = s;
    (state.pages || []).forEach(p => {
        (p.photos || []).forEach(it => {
            if (it && it.type !== 'text') it.shape = s;
        });
    });
    renderCurrentPage();
    showToast(getUiLang() === 'he' ? 'הצורה הוחלה על כל התמונות' : 'Shape applied to all images', 'success');
}

function setImageFrameForTarget(frameId) {
    const target = getActiveImageTarget();
    if (!target) {
        showToast(getUiLang() === 'he' ? 'בחר תמונה כדי לערוך מסגרת/צורה' : 'Select an image first', 'info');
        return;
    }
    const id = frameId ? String(frameId) : null;
    if (target.type === 'cover') {
        state.cover.photoFrameId = id;
    } else {
        const item = state.pages?.[target.pageIndex]?.photos?.[target.slotIndex];
        if (item) item.frameId = id;
    }
    renderCurrentPage();
}

function applyImageFrameToAll(frameId) {
    const id = frameId ? String(frameId) : null;
    if (state.cover) state.cover.photoFrameId = id;
    (state.pages || []).forEach(p => {
        (p.photos || []).forEach(it => {
            if (it && it.type !== 'text') it.frameId = id;
        });
    });
    renderCurrentPage();
    showToast(getUiLang() === 'he' ? 'המסגרת הוחלה על כל התמונות' : 'Frame applied to all images', 'success');
}

function renderGalleryImageFrames(grid) {
    const isHe = getUiLang() === 'he';
    const frames = window.IMAGE_FRAMES || [];
    const target = getActiveImageTarget();

    grid.innerHTML = '';

    // Gallery Image Frames are kept for COVER only (per UX request).
    if (!target || target.type !== 'cover') {
        const p = document.createElement('div');
        p.style.gridColumn = '1 / -1';
        p.style.textAlign = 'center';
        p.style.padding = '20px';
        p.style.color = '#475569';
        p.textContent = isHe ? 'מסגרות לתמונה בעמוד נמצאות בסטודיו העיצוב.' : 'Page photo frames are in the Design Studio.';
        grid.appendChild(p);
        return;
    }

    // Header / controls
    const panel = document.createElement('div');
    panel.style.gridColumn = '1 / -1';
    panel.style.display = 'flex';
    panel.style.flexWrap = 'wrap';
    panel.style.gap = '10px';
    panel.style.alignItems = 'center';
    panel.style.padding = '6px 2px 12px';

    const help = document.createElement('div');
    help.style.flex = '1 1 280px';
    help.style.color = '#475569';
    help.style.fontSize = '13px';
    help.textContent = target
        ? (isHe ? 'בחר צורת תמונה, ואז בחר מסגרת שמתאימה לצורה.' : 'Pick an image shape, then choose a matching frame.')
        : (isHe ? 'בחר תמונה בעמוד או בכריכה כדי לערוך מסגרת/צורה.' : 'Select an image on a page (or cover) to edit shape/frame.');

    const shapeLabel = document.createElement('span');
    shapeLabel.style.fontWeight = '700';
    shapeLabel.textContent = isHe ? 'צורת תמונה:' : 'Image shape:';

    const shapeSelect = document.createElement('select');
    shapeSelect.className = 'edo-select';
    shapeSelect.style.minWidth = '180px';
    shapeSelect.innerHTML = `
      <option value="rect">${isHe ? 'ריבוע/מלבן' : 'Square/Rectangle'}</option>
      <option value="rounded">${isHe ? 'פינות מעוגלות' : 'Rounded'}</option>
      <option value="circle">${isHe ? 'עיגול' : 'Circle'}</option>
      <option value="oval">${isHe ? 'אליפסה' : 'Oval'}</option>
    `;
    shapeSelect.value = getCurrentImageShape();
    shapeSelect.onchange = () => {
        setImageShapeForTarget(shapeSelect.value);
        try { renderGalleryImageFrames(grid); } catch { /* ignore */ }
    };

    const applyShapeAllBtn = document.createElement('button');
    applyShapeAllBtn.className = 'btn btn-secondary btn-small';
    applyShapeAllBtn.textContent = isHe ? 'החל צורה על הכל' : 'Apply shape to all';
    applyShapeAllBtn.onclick = () => applyImageShapeToAll(shapeSelect.value);

    const clearFrameBtn = document.createElement('button');
    clearFrameBtn.className = 'btn btn-ghost btn-small';
    clearFrameBtn.textContent = isHe ? 'הסר מסגרת' : 'Clear frame';
    clearFrameBtn.onclick = () => setImageFrameForTarget(null);

    panel.appendChild(help);
    panel.appendChild(shapeLabel);
    panel.appendChild(shapeSelect);
    panel.appendChild(applyShapeAllBtn);
    panel.appendChild(clearFrameBtn);
    grid.appendChild(panel);

    if (!frames.length) {
        const p = document.createElement('div');
        p.style.gridColumn = '1 / -1';
        p.style.textAlign = 'center';
        p.style.padding = '20px';
        p.textContent = isHe ? 'אין מסגרות לתמונות.' : 'No image frames available.';
        grid.appendChild(p);
        return;
    }

    const shape = shapeSelect.value;
    const filtered = frames.filter(f => !f.shapes || f.shapes.includes(shape));

    filtered.forEach(frame => {
        const item = document.createElement('div');
        item.className = 'gallery-item-card';
        item.style.border = '1px solid #ddd';
        item.style.borderRadius = '8px';
        item.style.overflow = 'hidden';
        item.style.background = '#fff';

        const preview = document.createElement('div');
        preview.style.height = '180px';
        preview.style.position = 'relative';
        preview.style.background = 'linear-gradient(135deg, #e2e8f0, #f8fafc)';
        preview.style.display = 'flex';
        preview.style.alignItems = 'center';
        preview.style.justifyContent = 'center';

        const previewBox = document.createElement('div');
        previewBox.style.width = '130px';
        previewBox.style.height = '130px';
        previewBox.style.position = 'relative';

        const maskDiv = document.createElement('div');
        maskDiv.style.position = 'absolute';
        maskDiv.style.inset = '0';
        maskDiv.style.background = 'rgba(255,255,255,0.7)';
        maskDiv.style.boxShadow = 'inset 0 0 0 1px rgba(0,0,0,0.06)';
        maskDiv.style.overflow = 'hidden';
        if (shape === 'circle') maskDiv.style.borderRadius = '50%';
        else if (shape === 'oval') maskDiv.style.borderRadius = '50% / 35%';
        else if (shape === 'rounded') maskDiv.style.borderRadius = '18px';
        else maskDiv.style.borderRadius = '2px';

        const svg = document.createElement('div');
        svg.style.position = 'absolute';
        svg.style.inset = '0';
        svg.style.pointerEvents = 'none';
        const svgContent = frame.svgGen ? frame.svgGen(1000, 1000, frame.color || '#111827', shape) : '';
        svg.innerHTML = `<svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">${svgContent}</svg>`;

        previewBox.appendChild(maskDiv);
        previewBox.appendChild(svg);
        preview.appendChild(previewBox);

        const info = document.createElement('div');
        info.style.padding = '12px';
        const name = (isHe && frame.nameHe) ? frame.nameHe : frame.name;
        const cat = (isHe && frame.categoryHe) ? frame.categoryHe : frame.category;
        info.innerHTML = `
          <div style="display:flex; justify-content:space-between; gap:8px; align-items:center;">
            <div style="min-width:0;">
              <div style="font-weight:700; font-size:14px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${escapeHtml(name || '')}</div>
              <div style="font-size:12px; color:#64748b;">${escapeHtml(cat || '')}</div>
            </div>
            <div style="display:flex; gap:6px;">
              <button class="btn btn-secondary btn-small" type="button">${isHe ? 'בחר' : 'Select'}</button>
              <button class="btn btn-secondary btn-small" type="button">${isHe ? 'החל על הכל' : 'Apply All'}</button>
            </div>
          </div>
        `;

        const btns = info.querySelectorAll('button');
        btns[0].onclick = (e) => { e.stopPropagation(); setImageFrameForTarget(frame.id); closeBackgroundGallery(); };
        btns[1].onclick = (e) => { e.stopPropagation(); applyImageFrameToAll(frame.id); closeBackgroundGallery(); };

        item.appendChild(preview);
        item.appendChild(info);
        item.onclick = () => { setImageFrameForTarget(frame.id); closeBackgroundGallery(); };
        grid.appendChild(item);
    });
}

function renderDesignStudioImageFrames() {
    const isHe = getUiLang() === 'he';
    const wrap = document.getElementById('designStudioImageFrames');
    const section = document.getElementById('designStudioImageFramesSection');
    if (!wrap || !section) return;

    // Only show for inner page photos. (Cover frames stay in gallery.)
    const target = getActiveImageTarget();
    const isPagePhoto = !!(target && target.type === 'page');
    section.style.display = isPagePhoto ? 'block' : 'none';
    if (!isPagePhoto) return;

    const frames = window.IMAGE_FRAMES || [];
    const shape = getCurrentImageShape();
    const pageItem = state.pages?.[target.pageIndex]?.photos?.[target.slotIndex];
    const activeFrameId = pageItem?.frameId || null;

    wrap.innerHTML = '';

    // Controls row
    const row = document.createElement('div');
    row.style.display = 'flex';
    row.style.flexWrap = 'wrap';
    row.style.gap = '8px';
    row.style.alignItems = 'center';
    row.style.marginBottom = '10px';

    const shapeSelect = document.createElement('select');
    shapeSelect.className = 'edo-select';
    shapeSelect.style.height = '36px';
    shapeSelect.style.padding = '0 10px';
    shapeSelect.style.fontSize = '13px';
    shapeSelect.style.minWidth = '160px';
    shapeSelect.innerHTML = `
      <option value="rect">${isHe ? 'ריבוע/מלבן' : 'Square/Rectangle'}</option>
      <option value="rounded">${isHe ? 'פינות מעוגלות' : 'Rounded'}</option>
      <option value="circle">${isHe ? 'עיגול' : 'Circle'}</option>
      <option value="oval">${isHe ? 'אליפסה' : 'Oval'}</option>
    `;
    shapeSelect.value = shape;
    shapeSelect.onchange = () => {
        setImageShapeForTarget(shapeSelect.value);
        setTimeout(() => { try { renderDesignStudioImageFrames(); } catch { /* ignore */ } }, 0);
    };

    const clearBtn = document.createElement('button');
    clearBtn.className = 'btn btn-secondary btn-small';
    clearBtn.type = 'button';
    clearBtn.textContent = isHe ? 'הסר מסגרת' : 'Clear frame';
    clearBtn.onclick = () => {
        setImageFrameForTarget(null);
        setTimeout(() => { try { renderDesignStudioImageFrames(); } catch { /* ignore */ } }, 0);
    };

    row.appendChild(shapeSelect);
    row.appendChild(clearBtn);
    wrap.appendChild(row);

    if (!frames.length) {
        const p = document.createElement('div');
        p.style.color = '#cbd5e1';
        p.style.fontSize = '13px';
        p.textContent = isHe ? 'אין מסגרות זמינות.' : 'No frames available.';
        wrap.appendChild(p);
        return;
    }

    // Frames grid
    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = 'repeat(2, minmax(0, 1fr))';
    grid.style.gap = '10px';

    const filtered = frames.filter(f => !f.shapes || f.shapes.includes(shapeSelect.value));
    filtered.forEach(frame => {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = 'btn';
        card.style.padding = '10px';
        card.style.borderRadius = '12px';
        card.style.border = (activeFrameId === frame.id) ? '2px solid #818cf8' : '1px solid rgba(255,255,255,0.12)';
        card.style.background = 'rgba(255,255,255,0.06)';
        card.style.color = '#f8fafc';
        card.style.textAlign = 'left';
        card.style.cursor = 'pointer';

        const name = (isHe && frame.nameHe) ? frame.nameHe : frame.name;
        const svgContent = frame.svgGen ? frame.svgGen(1000, 1000, frame.color || '#e2e8f0', shapeSelect.value) : '';

        card.innerHTML = `
          <div style="height: 86px; border-radius: 10px; background: rgba(255,255,255,0.10); position: relative; overflow: hidden;">
            <div style="position:absolute; inset: 10px; background: rgba(255,255,255,0.10); border-radius: ${shapeSelect.value === 'circle' ? '50%' : shapeSelect.value === 'oval' ? '50% / 35%' : shapeSelect.value === 'rounded' ? '16px' : '2px'};"></div>
            <div style="position:absolute; inset: 0; pointer-events: none;">
              <svg width="100%" height="100%" viewBox="0 0 1000 1000" preserveAspectRatio="none">${svgContent}</svg>
            </div>
          </div>
          <div style="margin-top: 8px; font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${escapeHtml(name || '')}
          </div>
        `;

        card.onclick = () => {
            setImageFrameForTarget(frame.id);
            setTimeout(() => { try { renderDesignStudioImageFrames(); } catch { /* ignore */ } }, 0);
        };

        grid.appendChild(card);
    });

    wrap.appendChild(grid);
}

window.renderGalleryImageFrames = renderGalleryImageFrames;
window.setImageShapeForTarget = setImageShapeForTarget;
window.applyImageShapeToAll = applyImageShapeToAll;
window.setImageFrameForTarget = setImageFrameForTarget;
window.applyImageFrameToAll = applyImageFrameToAll;

function renderGalleryTypography() {
    const grid = document.getElementById('backgroundGalleryGrid') || document.getElementById('galleryGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const isHe = getUiLang() === 'he';

    if (!window.TEXT_STYLES) {
        grid.innerHTML = `<p>${isHe ? 'טוען סגנונות טקסט…' : 'Loading text styles...'}</p>`;
        return;
    }

    window.TEXT_STYLES.forEach(style => {
        const div = document.createElement('div');
        div.className = 'gallery-item';
        // Render preview with the defined styles
        let styleString = '';
        for (const [key, value] of Object.entries(style.style)) {
            // Convert camelCase to kebab-case
            const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
            styleString += `${kebabKey}:${value};`;
        }

        // Handle webkit/fallback logic manually for preview if needed, or rely on inserted style
        // For gradient text (Elegant Gold), we need specifically inline styles

        div.innerHTML = `
            <div class="gallery-item-preview" style="display:flex; align-items:center; justify-content:center; background:#f5f5f5; height:120px;">
                <span style="font-size: 32px; ${styleString}">${(isHe && style.previewTextHe) ? style.previewTextHe : style.previewText}</span>
            </div>
            <div class="gallery-item-info">
                <span class="gallery-item-name">${(isHe && style.nameHe) ? style.nameHe : style.name}</span>
                <span class="gallery-item-category">${(isHe && style.categoryHe) ? style.categoryHe : style.category}</span>
            </div>
        `;
        div.onclick = () => applyTextStyle(style);
        grid.appendChild(div);
    });
}

function applyTextStyle(styleObj) {
    // 1. If we are on Cover, apply to Title/Subtitle
    // 2. If we are editing a Text Slot on a page, apply to that slot (TODO)

    const totalPages = Array.isArray(state.pages) ? state.pages.length : 0;

    if (state.currentPageIndex === -1) {
        // Cover Mode
        state.coverTextStyle = styleObj.id;

        // Apply key aspects into the cover state so the inspector reflects it.
        const fontFamily = styleObj?.style?.fontFamily;
        if (fontFamily) {
            state.cover.titleFont = fontFamily;
            state.cover.subtitleFont = fontFamily;
        }
        const color = styleObj?.style?.color || styleObj?.fallbackStyle?.color;
        if (color) {
            state.cover.titleColor = color;
            state.cover.subtitleColor = color;
        }

        showToast('Text style applied to Cover!');
        try { updateCoverFromState(); } catch { /* ignore */ }
        try { renderCurrentPage(); } catch { /* ignore */ }
    } else if (state.currentPageIndex >= totalPages) {
        // Back Cover Mode
        state.backCover = state.backCover || {};
        state.backCover.textStyleId = styleObj.id;

        const fontFamily = styleObj?.style?.fontFamily;
        if (fontFamily) state.backCover.textFont = fontFamily;
        const color = styleObj?.style?.color || styleObj?.fallbackStyle?.color;
        if (color && (!state.backCover.textColor || state.backCover.textColor === '#ffffff')) {
            state.backCover.textColor = color;
        }

        showToast('Text style applied to Back Cover!', 'success');
        try { updateBackCoverFromState(); } catch { /* ignore */ }
        try { renderCurrentPage(); } catch { /* ignore */ }
    } else {
        // Page Mode - Apply to selected text slot if present
        const page = state.pages?.[state.currentPageIndex];
        const slot = state.selectedPhotoSlot;
        const item = (page && slot !== null && slot !== undefined) ? page.photos?.[slot] : null;
        if (item && item.type === 'text') {
            item.styleId = styleObj.id;
            showToast('Text style applied!', 'success');
            renderCurrentPage();
        } else {
            showToast('Select a text slot to apply typography', 'info');
        }
    }
    closeBackgroundGallery();
}

function renderGalleryFramesLocal(grid) {
    const frames = window.PAGE_FRAMES || [];
    if (frames.length === 0) {
        grid.innerHTML = `<p>${getUiLang() === 'he' ? 'אין מסגרות זמינות.' : 'No frames available.'}</p>`;
        return;
    }
    const isHe = getUiLang() === 'he';
    frames.forEach(frame => {
        const item = document.createElement('div');
        // Simple SVG Preview
        const svgContent = frame.svgGen ? frame.svgGen(140, 180, frame.color) : '';
        const frameName = (isHe && frame.nameHe) ? frame.nameHe : frame.name;
        const frameCat = (isHe && frame.categoryHe) ? frame.categoryHe : frame.category;

        item.innerHTML = `
            <div class="gallery-item-card" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; transition: all 0.2s; position: relative;">
                <div style="height: 200px; background: #fff; position:relative; cursor: pointer; display:flex; align-items:center; justify-content:center; padding:10px;" onclick="applyFrameToPage('${frame.id}')">
                    <div style="width:140px; height:180px; background:#fafafa; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative; overflow:hidden;">
                        <svg width="100%" height="100%" viewBox="0 0 140 180" style="position:absolute; inset:0;">${svgContent}</svg>
                        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); opacity:0.1; font-family:serif; font-size:32px;">A</div>
                    </div>
                </div>
                <div style="padding: 12px; border-top:1px solid #eee;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                         <div>
                            <div style="font-weight: 600; font-size: 15px;">${frameName}</div>
                            <div style="font-size: 12px; color: #666;">${frameCat}</div>
                         </div>
                         <button class="btn btn-secondary btn-small" style="padding: 6px 10px; font-size: 11px;" onclick="applyFrameToAllPages('${frame.id}')">${isHe ? 'החל על הכל' : 'Apply All'}</button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(item);
    });
}

function renderGalleryTextures(grid) {
    // Standard Background Textures
    const textures = window.BACKGROUND_TEXTURES || [];
    if (textures.length === 0) {
        grid.innerHTML = `<p>${getUiLang() === 'he' ? 'אין רקעים זמינים.' : 'No backgrounds available.'}</p>`;
        return;
    }

    const isHe = getUiLang() === 'he';

    textures.forEach(bg => {
        const item = document.createElement('div');
        const isTheme = !!bg.theme;

        let themePreview = '';
        if (isTheme) {
            themePreview = `
            <div style="display:flex; gap:4px; margin-top:8px;">
                <div style="width:16px; height:16px; border-radius:50%; background:${bg.theme.colors.primary};" title="Primary"></div>
                <div style="width:16px; height:16px; border-radius:50%; background:${bg.theme.colors.secondary};" title="Secondary"></div>
                <div style="width:16px; height:16px; border-radius:50%; background:${bg.theme.colors.bg}; border:1px solid #ddd;" title="Background"></div>
            </div>`;
        }

        const typeLabel = isTheme ? (isHe ? 'תבנית מלאה' : 'Full Theme') : (isHe ? 'טקסטורה בלבד' : 'Texture Only');
        const bgName = (isHe && bg.nameHe) ? bg.nameHe : bg.name;

        item.innerHTML = `
            <div class="gallery-item-card" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; transition: all 0.2s; position: relative;">
            <div style="height: 180px; overflow: hidden; background: #eee; position:relative; cursor: pointer;" onclick="selectBackgroundFromGallery('${bg.id}')">
                <img src="${bg.thumbnail}" alt="${bgName}" style="width: 100%; height: 100%; object-fit: cover;">
                ${isTheme ? `<div style="position:absolute; top:8px; right:8px; background:rgba(255,255,255,0.9); color:#1a1a1a; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.1);">${isHe ? 'תבנית' : 'TEMPLATE'}</div>` : ''}
            </div>
            <div style="padding: 12px;">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                     <div>
                        <div style="font-weight: 600; font-size: 15px;">${bgName}</div>
                        <div style="font-size: 12px; color: #666;">${typeLabel}</div>
                     </div>
                     <button class="btn btn-secondary btn-small" style="padding: 6px 10px; font-size: 11px;" onclick="applyBackgroundToAllPages('${bg.id}')">${isHe ? 'החל על הכל' : 'Apply All'}</button>
                </div>
                ${themePreview}
            </div>
            </div>
        `;
        grid.appendChild(item);
    });
}

function applyBackgroundToAllPages(id) {
    if (!confirm(getUiLang() === 'he' ? 'להחיל את העיצוב הזה על כל העמודים באלבום?' : 'Apply this design to ALL pages in your book?')) return;

    const textures = window.BACKGROUND_TEXTURES || [];
    const bg = textures.find(t => t.id === id);
    if (!bg) return;

    // Use absolute URL
    const absUrl = new URL(bg.url, window.location.href).href;

    // 1. Apply to Cover if user wants (optional logic, applying blindly here as per request)
    if (state.cover) {
        state.cover.backgroundImageUrl = absUrl;
        if (bg.theme) {
            state.cover.themeColors = bg.theme.colors;
        }
    }

    // 2. Apply to All Pages
    state.pages.forEach(page => {
        page.backgroundImageUrl = absUrl;
        page.backgroundImageData = null;
        page.backgroundImageName = bg.name;
        if (bg.theme) {
            page.themeColors = bg.theme.colors;
        }
    });

    // 3. Re-render
    renderCurrentPage();
    closeBackgroundGallery();
    showToast(getUiLang() === 'he' ? 'העיצוב הוחל על כל העמודים!' : 'Design applied to all pages!', 'success');
}

function applyFrameToPage(frameId) {
    if (state.pages.length === 0) return;
    const page = state.pages[state.currentPageIndex];

    // Apply Frame
    page.frameId = frameId;

    // Clear conflicting decorations for a clean look
    page.decorations = [];
    page.themeDecorations = [];

    // Re-render
    renderCurrentPage();
    closeBackgroundGallery();
    showToast(getUiLang() === 'he' ? 'המסגרת הוחלה!' : 'Frame applied!');
}

function applyFrameToAllPages(frameId) {
    if (!confirm(getUiLang() === 'he' ? 'להחיל את המסגרת הזאת על כל העמודים?' : 'Apply this frame to ALL pages?')) return;

    state.pages.forEach(page => {
        page.frameId = frameId;
        // Optionally clear other decorations? Let's be safe and do it.
        page.decorations = [];
        page.themeDecorations = [];
    });

    renderCurrentPage();
    closeBackgroundGallery();
    showToast(getUiLang() === 'he' ? 'המסגרת הוחלה על כל העמודים!' : 'Frame applied to all pages!', 'success');
}

function renderGalleryFrames(grid) {
    const frames = window.PAGE_FRAMES || [];
    if (frames.length === 0) {
        grid.innerHTML = `<p>${getUiLang() === 'he' ? 'אין מסגרות זמינות.' : 'No frames available.'}</p>`;
        return;
    }
    const isHe = getUiLang() === 'he';
    grid.innerHTML = ''; // Clear
    frames.forEach(frame => {
        const item = document.createElement('div');
        // Simple SVG Preview
        const svgContent = frame.svgGen ? frame.svgGen(140, 180, frame.color) : '';
        const frameName = (isHe && frame.nameHe) ? frame.nameHe : frame.name;
        const frameCat = (isHe && frame.categoryHe) ? frame.categoryHe : frame.category;

        item.innerHTML = `
            <div class="gallery-item-card" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; transition: all 0.2s; position: relative;">
                <div style="height: 200px; background: #fff; position:relative; cursor: pointer; display:flex; align-items:center; justify-content:center; padding:10px;" onclick="applyFrameToPage('${frame.id}')">
                    <div style="width:140px; height:180px; background:#fafafa; box-shadow:0 2px 5px rgba(0,0,0,0.1); position:relative; overflow:hidden;">
                        <svg width="100%" height="100%" viewBox="0 0 140 180" style="position:absolute; inset:0;">${svgContent}</svg>
                        <div style="position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); opacity:0.1; font-family:serif; font-size:32px;">A</div>
                    </div>
                </div>
                <div style="padding: 12px; border-top:1px solid #eee;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                         <div>
                            <div style="font-weight: 600; font-size: 15px;">${frameName}</div>
                            <div style="font-size: 12px; color: #666;">${frameCat}</div>
                         </div>
                         <button class="btn btn-secondary btn-small" style="padding: 6px 10px; font-size: 11px;" onclick="applyFrameToAllPages('${frame.id}')">${isHe ? 'החל על הכל' : 'Apply All'}</button>
                    </div>
                </div>
            </div>
        `;
        grid.appendChild(item);
    });
}

function renderBackgroundGalleryItems(items) {
    const grid = document.getElementById('backgroundGalleryGrid');
    if (!grid) return;

    // If we passed specific items (e.g. from search), render them as textures
    if (items && Array.isArray(items)) {
        // Clear grid first? Yes, usually.
        grid.innerHTML = '';

        // Helper to render texture card
        items.forEach(bg => {
            const item = document.createElement('div');
            const isTheme = !!bg.theme;
            const typeLabel = isTheme ? 'Full Theme' : 'Texture Only';
            let themePreview = '';
            if (isTheme) {
                themePreview = `
                <div style="display:flex; gap:4px; margin-top:8px;">
                    <div style="width:16px; height:16px; border-radius:50%; background:${bg.theme.colors.primary};" title="Primary"></div>
                    <div style="width:16px; height:16px; border-radius:50%; background:${bg.theme.colors.secondary};" title="Secondary"></div>
                    <div style="width:16px; height:16px; border-radius:50%; background:${bg.theme.colors.bg}; border:1px solid #ddd;" title="Background"></div>
                </div>`;
            }

            item.innerHTML = `
                <div class="gallery-item-card" style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; transition: all 0.2s; position: relative;">
                <div style="height: 180px; overflow: hidden; background: #eee; position:relative; cursor: pointer;" onclick="selectBackgroundFromGallery('${bg.id}')">
                    <img src="${bg.thumbnail}" alt="${bg.name}" style="width: 100%; height: 100%; object-fit: cover;">
                    ${isTheme ? '<div style="position:absolute; top:8px; right:8px; background:rgba(255,255,255,0.9); color:#1a1a1a; padding:4px 8px; border-radius:4px; font-size:11px; font-weight:700; box-shadow:0 2px 4px rgba(0,0,0,0.1);">TEMPLATE</div>' : ''}
                </div>
                <div style="padding: 12px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                         <div>
                            <div style="font-weight: 600; font-size: 15px;">${bg.name}</div>
                            <div style="font-size: 12px; color: #666;">${typeLabel}</div>
                         </div>
                         <button class="btn btn-secondary btn-small" style="padding: 6px 10px; font-size: 11px;" onclick="applyBackgroundToAllPages('${bg.id}')">Apply All</button>
                    </div>
                    ${themePreview}
                </div>
                </div>
            `;
            grid.appendChild(item);
        });
        return;
    }

    // Default behavior
    if (typeof currentGalleryTab === 'undefined' || currentGalleryTab === 'textures') {
        renderGalleryTextures(grid);
    } else {
        renderGalleryFrames(grid);
    }
}

async function searchDesignApi() {
    const grid = document.getElementById('backgroundGalleryGrid');
    const prompt = (document.getElementById('aiDesignPrompt')?.value || '').trim();
    if (grid) grid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding: 20px;">Searching${prompt ? ` for “${escapeHtml(prompt)}”` : ''}... 🤖</div>`;

    // Simulate network delay
    await new Promise(r => setTimeout(r, 1500));

    // Mock results simulating "Brave Search / Coolors MCP"
    const mockResults = [
        {
            id: 'ai-generated-1',
            name: prompt ? `AI: ${prompt} (Sunset Minimal)` : 'Sunset Minimal',
            category: 'AI Generated',
            thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=300&q=80',
            url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1600&q=80',
            theme: {
                colors: { primary: '#FF7E5F', secondary: '#FEB47B', bg: '#FFF5F0', text: '#2D1E1E' },
                fonts: { serif: "'Playfair Display', serif", sans: "'Montserrat', sans-serif" }
            }
        },
        {
            id: 'ai-generated-2',
            name: prompt ? `AI: ${prompt} (Oceanic Blue)` : 'Oceanic Blue',
            category: 'AI Generated',
            thumbnail: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=300&q=80',
            url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?auto=format&fit=crop&w=1600&q=80',
            theme: {
                colors: { primary: '#006994', secondary: '#48A9C5', bg: '#F0F8FF', text: '#002233' },
                fonts: { serif: "'Merriweather', serif", sans: "'Open Sans', sans-serif" }
            }
        },
        {
            id: 'ai-generated-3',
            name: prompt ? `Inspiration: ${prompt} (Urban Architecture)` : 'Urban Architecture',
            category: 'Inspiration',
            thumbnail: 'https://images.unsplash.com/photo-1486718448742-163732cd1544?auto=format&fit=crop&w=300&q=80',
            url: 'https://images.unsplash.com/photo-1486718448742-163732cd1544?auto=format&fit=crop&w=1600&q=80',
            theme: {
                colors: { primary: '#2C3E50', secondary: '#95A5A6', bg: '#ECF0F1', text: '#2C3E50' },
                fonts: { serif: "'Roboto', sans-serif", sans: "'Lato', sans-serif" } // Modern look, sans as serif slot
            }
        }
    ];

    // Merge with existing for the view, or just show results
    // We'll prepend them to the existing list for a "richer" feel, or just show them.
    // Let's just show them to be clear "Search Results" came back.
    renderBackgroundGalleryItems(mockResults);

    // Hack: Add instances to global list so selection works by ID lookup
    if (!window.BACKGROUND_TEXTURES) window.BACKGROUND_TEXTURES = [];
    mockResults.forEach(r => {
        if (!window.BACKGROUND_TEXTURES.find(e => e.id === r.id)) {
            window.BACKGROUND_TEXTURES.push(r);
        }
    });

    // IMPORTANT: Keep the live editor cover text in-sync.
    // renderCurrentPage() sets inline styles on <h1>/<h3>, so without this the editor
    // won't reflect color changes until a full rerender.
    try {
        const styleObj = (state.coverTextStyle && window.TEXT_STYLES)
            ? window.TEXT_STYLES.find(s => s.id === state.coverTextStyle)
            : null;

        coverRoots.forEach(root => {
            const titleEl = root.querySelector('.book3d-cover-inner h1');
            if (titleEl) {
                titleEl.textContent = title;
                titleEl.style.fontSize = `${parseInt(titleSize) || 36}px`;
                titleEl.style.fontFamily = `'${titleFont}', serif`;

                // Reset, then apply style, then force user color
                titleEl.style.textShadow = 'none';
                titleEl.style.background = 'none';
                titleEl.style.webkitTextFillColor = 'initial';
                titleEl.style.transform = 'none';

                if (styleObj && styleObj.style) {
                    Object.assign(titleEl.style, styleObj.style);
                    titleEl.style.fontSize = `${parseInt(titleSize) || 36}px`;
                    if (!styleObj.style.fontFamily) {
                        titleEl.style.fontFamily = `'${titleFont}', serif`;
                    }
                }

                titleEl.style.color = titleColor;
                titleEl.style.webkitTextFillColor = titleColor;
            }

            const subtitleEl = root.querySelector('.book3d-cover-inner h3');
            if (subtitleEl) {
                subtitleEl.textContent = subtitle;
                subtitleEl.style.fontSize = `${parseInt(subtitleSize) || 14}px`;
                subtitleEl.style.fontFamily = `'${subtitleFont}', serif`;

                subtitleEl.style.textShadow = 'none';
                subtitleEl.style.background = 'none';
                subtitleEl.style.webkitTextFillColor = 'initial';
                subtitleEl.style.opacity = '0.9';

                if (styleObj && styleObj.style) {
                    const appliedStyle = { ...styleObj.style };
                    delete appliedStyle.fontSize; // keep manual size control
                    Object.assign(subtitleEl.style, appliedStyle);
                    subtitleEl.style.fontSize = `${parseInt(subtitleSize) || 14}px`;
                    if (!appliedStyle.fontFamily) {
                        subtitleEl.style.fontFamily = `'${subtitleFont}', serif`;
                    }
                }

                subtitleEl.style.color = subtitleColor;
                subtitleEl.style.webkitTextFillColor = subtitleColor;
            }
        });
    } catch { /* ignore */ }
}

function selectBackgroundFromGallery(id) {
    const textures = window.BACKGROUND_TEXTURES || [];
    const bg = textures.find(t => t.id === id);
    if (!bg) return;

    // Use absolute URL for the background functionality
    const absUrl = new URL(bg.url, window.location.href).href;

    const totalPages = Array.isArray(state.pages) ? state.pages.length : 0;

    // CHECK: Are we on the Cover, Back Cover, or an Inner Page?
    if (state.currentPageIndex < 0) {
        // === COVER ===
        state.cover.backgroundImageUrl = absUrl;
        if (bg.theme) {
            state.cover.themeColors = bg.theme.colors;
            // Apply Fonts if available
            if (bg.theme.fonts) {
                state.cover.titleFont = bg.theme.fonts.serif;
                state.cover.subtitleFont = bg.theme.fonts.sans;
            }
        }
    } else if (state.currentPageIndex >= totalPages) {
        // === BACK COVER ===
        state.backCover = state.backCover || {};
        state.backCover.backgroundImageUrl = absUrl;
        state.backCover.backgroundImageData = null;
        state.backCover.backgroundImageName = bg.name;
        if (bg.theme) {
            // Keep existing colors unless the user hasn't customized them.
            if (!state.backCover.backgroundColor) state.backCover.backgroundColor = bg.theme.colors.bg || state.backCover.backgroundColor;
            if (!state.backCover.textColor) state.backCover.textColor = bg.theme.colors.primary || state.backCover.textColor;
            if (bg.theme.fonts?.sans) state.backCover.textFont = bg.theme.fonts.sans;
        }
    } else {
        // === INNER PAGE ===
        const page = state.pages[state.currentPageIndex];

        // Apply Background
        page.backgroundImageUrl = absUrl;
        page.backgroundImageData = null; // clear any uploaded data
        page.backgroundImageName = bg.name; // metadata

        // Check if it's a Full Theme Template
        if (bg.theme) {
            console.log("Applying theme:", bg.theme);
            page.themeColors = bg.theme.colors;
        }
    }

    // Update UI
    const bgStatus = document.getElementById('pageBgImageStatus');
    if (bgStatus) bgStatus.textContent = `Selected: ${bg.name} `;

    renderCurrentPage();

    // If it's a theme, we might need to re-render more than just the canvas if we changed global fonts
    // For now, let's notify the user via console or UI

    closeBackgroundGallery();
    try { updateBackCoverFromState(); } catch { /* ignore */ }
}

// Expose to window for HTML attributes
window.openBackgroundGallery = openBackgroundGallery;
window.closeBackgroundGallery = closeBackgroundGallery;
window.renderBackgroundGalleryItems = renderBackgroundGalleryItems;
window.selectBackgroundFromGallery = selectBackgroundFromGallery;
window.searchDesignApi = searchDesignApi;    // Expose functions required by Gallery UI
window.switchGalleryTab = switchGalleryTab;
window.showInputforSearchDesign = showInputforSearchDesign;
window.triggerBackCoverBackgroundImageUpload = triggerBackCoverBackgroundImageUpload;
window.updateBackCoverBackgroundImage = updateBackCoverBackgroundImage;
window.clearBackCoverBackgroundImage = clearBackCoverBackgroundImage;
window.applyFrameToPage = applyFrameToPage;
window.applyFrameToAllPages = applyFrameToAllPages;
window.showToast = showToast;
window.renderGalleryTypography = renderGalleryTypography; // NEW
window.applyTextStyle = applyTextStyle; // NEW

function applyPageBackgroundStyles(element, page, fallbackBgColor) {
    if (!element) return;
    const url = page?.backgroundImageUrl;
    const data = page?.backgroundImageData;
    const imageSrc = (typeof url === 'string' && url) ? url : ((typeof data === 'string' && data) ? data : null);
    const hasImage = !!imageSrc;
    if (hasImage) {
        element.style.backgroundColor = fallbackBgColor || element.style.backgroundColor || '#ffffff';
        element.style.backgroundImage = `url("${imageSrc}")`;
        // Small pattern textures (e.g. TransparentTextures) should tile, not stretch.
        if (typeof imageSrc === 'string' && imageSrc.includes('transparenttextures.com/patterns/')) {
            element.style.backgroundRepeat = 'repeat';
            element.style.backgroundSize = 'auto';
            element.style.backgroundPosition = 'top left';
        } else {
            element.style.backgroundSize = 'cover';
            element.style.backgroundPosition = 'center';
            element.style.backgroundRepeat = 'no-repeat';
        }
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
    const path = `users / ${uid} /page-backgrounds/${Date.now()}_${safeName.replace(/\.(png|jpe?g)$/i, '')}.jpg`;

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
    const pageCaptionEl = document.getElementById('pageCaption');
    if (pageCaptionEl) {
        state.pages[state.currentPageIndex].caption = pageCaptionEl.value;
        renderCurrentPage();
    }
}

function updatePageNumber() {
    if (state.pages.length === 0) return;
    const showPageNumberEl = document.getElementById('showPageNumber');
    if (showPageNumberEl) {
        state.pages[state.currentPageIndex].showPageNumber = showPageNumberEl.checked;
    }
}

function updatePageBorder() {
    if (state.pages.length === 0) return;
    const pageBorderEl = document.getElementById('pageBorder');
    const hasBorder = pageBorderEl ? pageBorderEl.checked : false;
    if (hasBorder) {
        const pageBorderColorEl = document.getElementById('pageBorderColor');
        const pageBorderWeightEl = document.getElementById('pageBorderWeight');
        state.pages[state.currentPageIndex].photoBorder = {
            color: pageBorderColorEl ? pageBorderColorEl.value : '#cccccc',
            weight: pageBorderWeightEl ? parseInt(pageBorderWeightEl.value) : 1
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
        // Support both photos and "Text/WordArt" items from the picker
        if (photo && photo.type === 'text') {
            page.photos[slotIndex] = {
                type: 'text',
                id: photo.id || ('text-' + Date.now()),
                content: String(photo.content || ''),
                styleId: photo.styleId || 'default',
                rotation: Number.isFinite(photo.rotation) ? photo.rotation : 0,
                fontSize: Number.isFinite(photo.fontSize) ? photo.fontSize : 32,
                shadowStrength: Number.isFinite(photo.shadowStrength) ? photo.shadowStrength : 0,
            };
        } else {
            // Initialize photo with alignment and position data
            page.photos[slotIndex] = {
                ...photo,
                alignment: 'center',
                customX: undefined,
                customY: undefined
            };
        }
        state.selectedPhotoSlot = slotIndex;
        renderCurrentPage();

        // If user picked text, open Typography Studio (not Design Studio)
        if (page.photos[slotIndex] && page.photos[slotIndex].type === 'text') {
            try {
                requestAnimationFrame(() => setTimeout(() => openTextStudio(slotIndex), 0));
            } catch { /* ignore */ }
        }
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
    if (photo && photo.type === 'text') {
        // Text slots don't load into the image design editor.
        state.selectedPhotoSlot = slotIndex;
        renderCurrentPage();
        try { updateTextSlotControls(); } catch { /* ignore */ }
        return;
    }
    if (photo && (photo.baseUrl || photo.id)) {
        state.selectedPhotoSlot = slotIndex;
        // Track for the "Apply Design" button
        state.editingPhotoIndex = slotIndex;

        console.log(`Selected slot ${slotIndex} for editing.`);

        // Set global editing state for applyDesignToPhoto
        currentEditingPhotoIndex = slotIndex;
        currentEditingPageIndex = state.currentPageIndex;

        // Load into Design Editor
        // Prefer edited data, then high-res base URL, then thumbnail
        const imgUrl = photo.editedData || photo.baseUrl || photo.thumbnailUrl;

        // CRITICAL FIX: Switch tab FIRST to ensure canvas container is visible and has dimensions
        switchTab('design');

        if (window.designEditor && imgUrl) {
            // Wait for tab switch animation/render to complete
            requestAnimationFrame(() => {
                setTimeout(() => {
                    // Force resize now that it's visible
                    if (window.designEditor.resizeCanvas) window.designEditor.resizeCanvas();

                    // Load the image with Cloud Proxy fallback
                    const primaryUrl = photo.editedData || photo.baseUrl;
                    const fallbackUrl = photo.thumbnailUrl;

                    // Helper to load
                    const load = (u, fb) => window.designEditor.loadImage(u, fb)
                        .then(() => console.log("Image loaded from", u === primaryUrl ? "primary" : "proxy/fallback"))
                        .catch(err => {
                            alert("Failed to load photo: " + err.message);
                        });

                    // If we have a baseUrl, try to fetch high-res via proxy to avoid 403
                    if (primaryUrl && !photo.editedData) {
                        console.log("Fetching high-res via proxy...");
                        callFunction('fetchHighResImage', { url: primaryUrl })
                            .then(result => {
                                if (result && result.success && result.dataUri) {
                                    console.log("Proxy fetch success, loading Base64...");
                                    load(result.dataUri, fallbackUrl);
                                } else {
                                    console.warn("Proxy fetch failed, using fallback:", result);
                                    load(fallbackUrl, null);
                                }
                            })
                            .catch(e => {
                                console.error("Proxy error:", e);
                                load(fallbackUrl, null);
                            });
                    } else {
                        // Edited data or no baseUrl, just load normally
                        load(primaryUrl || fallbackUrl, fallbackUrl);
                    }
                }, 150); // Increased delay slightly to be safe
            });
        } else if (!imgUrl) {
            console.error("No image URL found for slot", slotIndex, photo);
            alert("This photo slot has no valid image URL to edit.");
        }

        renderCurrentPage(); // Highlight selection
    } else {
        // Empty slot - open picker
        state.selectedPhotoSlot = slotIndex;
        // Legacy flow (if somehow reached here via direct call)
        selectPhotoForSlot(slotIndex);
    }
}

// Replaces handleReplacePhotoClick with a menu option
function showPhotoOptions(slotIndex, event) {
    if (event) event.stopPropagation();

    // If this slot contains text, open Typography Studio instead of photo editor.
    const page = state.pages?.[state.currentPageIndex];
    const item = page?.photos?.[slotIndex];
    if (item && item.type === 'text') {
        try { openTextStudio(slotIndex); } catch { /* ignore */ }
        return;
    }

    // Create modal if not exists
    let modal = document.getElementById('photoOptionsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'photoOptionsModal';
        modal.className = 'modal';
        modal.style.zIndex = '30000'; // Higher than everything
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 300px; text-align: center;">
                <h3 style="margin-top:0;">Photo Options</h3>
                <div style="display: flex; flex-direction: column; gap: 10px; margin: 20px 0;">
                    <button id="poDesignBtn" class="btn btn-primary" style="justify-content: center;">
                        <span class="icon">🎨</span> Design / Edit
                    </button>
                    <button id="poReplaceBtn" class="btn btn-secondary" style="justify-content: center;">
                        <span class="icon">🔄</span> Replace Photo
                    </button>
                </div>
                <button class="btn btn-small" onclick="closePhotoOptions()">Cancel</button>
            </div>
            `;
        document.body.appendChild(modal);
    }

    // Bind events dynamically to current slot
    const designBtn = document.getElementById('poDesignBtn');
    const replaceBtn = document.getElementById('poReplaceBtn');

    designBtn.onclick = () => {
        closePhotoOptions();
        window.selectPhotoForSlot(slotIndex); // Set global selection state
        window.openDesignStudio(); // Open the large modal
    };

    replaceBtn.onclick = () => {
        closePhotoOptions();
        activatePage(state.currentPageIndex);
        selectPhotoForSlot(slotIndex); // Opens picker
    };

    modal.classList.add('active');
}

function showTextOptions(slotIndex, event) {
    if (event) event.stopPropagation();

    const page = state.pages?.[state.currentPageIndex];
    const item = page?.photos?.[slotIndex];
    if (!item || item.type !== 'text') {
        // Fallback to photo options if needed
        return showPhotoOptions(slotIndex, event);
    }

    let modal = document.getElementById('textOptionsModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'textOptionsModal';
        modal.className = 'modal';
        modal.style.zIndex = '30000';
        modal.innerHTML = `
            <div class="modal-content" style="max-width: 320px; text-align: center;">
                <h3 style="margin-top:0;">Text Options</h3>
                <div style="display: flex; flex-direction: column; gap: 10px; margin: 20px 0;">
                    <button id="toEditBtn" class="btn btn-primary" style="justify-content: center;">
                        <span class="icon">✏️</span> Edit Typography
                    </button>
                    <button id="toReplaceBtn" class="btn btn-secondary" style="justify-content: center;">
                        <span class="icon">🔄</span> Replace (Photo / Text)
                    </button>
                    <button id="toRemoveBtn" class="btn btn-secondary" style="justify-content: center; color:#dc3545; border-color:#dc3545;">
                        <span class="icon">🗑️</span> Remove
                    </button>
                </div>
                <button class="btn btn-small" onclick="closeTextOptions()">Cancel</button>
            </div>
        `;
        document.body.appendChild(modal);
    }

    // Bind
    const editBtn = document.getElementById('toEditBtn');
    const replaceBtn = document.getElementById('toReplaceBtn');
    const removeBtn = document.getElementById('toRemoveBtn');

    if (editBtn) editBtn.onclick = () => { closeTextOptions(); openTextStudio(slotIndex); };
    if (replaceBtn) replaceBtn.onclick = () => { closeTextOptions(); selectPhotoForSlot(slotIndex); };
    if (removeBtn) removeBtn.onclick = () => {
        closeTextOptions();
        const p = state.pages?.[state.currentPageIndex];
        if (p && Array.isArray(p.photos)) {
            p.photos[slotIndex] = null;
            if (state.selectedPhotoSlot === slotIndex) state.selectedPhotoSlot = null;
            renderCurrentPage();
        }
    };

    modal.classList.add('active');
}

function closeTextOptions() {
    document.getElementById('textOptionsModal')?.classList.remove('active');
}

function ensureTextStudioModal() {
    if (document.getElementById('textStudioModal')) return;
    const modal = document.createElement('div');
    modal.id = 'textStudioModal';
    modal.className = 'modal';
    modal.innerHTML = `
      <div class="modal-content" style="max-width: 720px; width: 92vw;">
        <div class="modal-header">
          <h3>Typography Studio</h3>
          <button class="close-btn" onclick="closeTextStudio()">&times;</button>
        </div>
        <div class="modal-body" style="display:flex; gap:16px; align-items:stretch;">
          <div style="flex:1; background:#0f1015; border-radius:12px; padding:16px; display:flex; align-items:center; justify-content:center; min-height:220px;">
            <div id="textStudioPreview" style="text-align:center; max-width: 100%;"></div>
          </div>
          <div style="width: 300px; display:flex; flex-direction:column; gap:12px;">
            <label style="font-size:12px; color:#6b7280; font-weight:700;">Text</label>
            <textarea id="tsContent" class="edo-textarea" rows="3" placeholder="Type..." style="resize:vertical;"></textarea>

            <label style="font-size:12px; color:#6b7280; font-weight:700;">Style</label>
            <select id="tsStyle" class="edo-select"></select>

            <label style="font-size:12px; color:#6b7280; font-weight:700;">Size</label>
            <div style="display:flex; align-items:center; gap:10px;">
              <input id="tsSize" type="range" min="10" max="120" value="32" style="flex:1;">
              <span id="tsSizeVal" style="width:48px; text-align:right; font-size:12px;">32px</span>
            </div>

            <label style="font-size:12px; color:#6b7280; font-weight:700;">Rotate</label>
            <div style="display:flex; align-items:center; gap:10px;">
              <input id="tsRotate" type="range" min="-180" max="180" value="0" style="flex:1;">
              <span id="tsRotateVal" style="width:40px; text-align:right; font-size:12px;">0°</span>
            </div>

            <label style="font-size:12px; color:#6b7280; font-weight:700;">Shadow</label>
            <div style="display:flex; align-items:center; gap:10px;">
              <input id="tsShadow" type="range" min="0" max="100" value="0" style="flex:1;">
              <span id="tsShadowVal" style="width:40px; text-align:right; font-size:12px;">0</span>
            </div>

            <div style="display:flex; gap:10px; margin-top: 6px;">
              <button class="btn btn-primary" style="flex:1;" onclick="applyTextStudio()">Apply</button>
              <button class="btn btn-secondary" style="flex:1;" onclick="closeTextStudio()">Cancel</button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) closeTextStudio();
    });
}

function openTextStudio(slotIndex) {
    ensureTextStudioModal();
    const modal = document.getElementById('textStudioModal');
    const page = state.pages?.[state.currentPageIndex];
    const item = page?.photos?.[slotIndex];
    if (!modal || !item || item.type !== 'text') return;

    state.selectedPhotoSlot = slotIndex;

    const sel = document.getElementById('tsStyle');
    const ta = document.getElementById('tsContent');
    const size = document.getElementById('tsSize');
    const sizeVal = document.getElementById('tsSizeVal');
    const rot = document.getElementById('tsRotate');
    const rotVal = document.getElementById('tsRotateVal');
    const sh = document.getElementById('tsShadow');
    const shVal = document.getElementById('tsShadowVal');

    // Populate styles
    if (sel) {
        sel.innerHTML = `<option value="default">Default</option>` +
            (window.TEXT_STYLES || []).map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
        if (document.activeElement !== sel) {
            sel.value = item.styleId || 'default';
        }
    }
    if (ta) ta.value = item.content || '';
    if (size) size.value = String(Number.isFinite(item.fontSize) ? item.fontSize : 32);
    if (sizeVal) sizeVal.textContent = `${size.value}px`;
    if (rot) rot.value = String(Number.isFinite(item.rotation) ? item.rotation : 0);
    if (rotVal) rotVal.textContent = `${rot.value}°`;
    if (sh) sh.value = String(Number.isFinite(item.shadowStrength) ? item.shadowStrength : 0);
    if (shVal) shVal.textContent = sh.value;

    const refresh = () => {
        const styleEntry = (window.TEXT_STYLES || []).find(s => s.id === (sel?.value || item.styleId));
        const css = styleEntry ? textStyleEntryToInlineCss(styleEntry) : 'font-family: Inter; font-weight: 700; color: #fff;';
        const fs = parseInt(size?.value || '32', 10) || 32;
        const r = parseInt(rot?.value || '0', 10) || 0;
        const ss = parseInt(sh?.value || '0', 10) || 0;
        const shadow = ss > 0 ? `filter: drop-shadow(0 2px ${Math.max(1, ss / 10)}px rgba(0,0,0,${Math.min(0.7, ss / 140)}));` : '';
        const preview = document.getElementById('textStudioPreview');
        if (preview) {
            preview.innerHTML = `<span style="${css}; font-size:${fs}px; display:inline-block; transform: rotate(${r}deg); transform-origin:center; max-width:100%; white-space:pre-wrap; word-break:break-word; ${shadow}">${escapeHtml(ta?.value || '')}</span>`;
        }
        if (sizeVal) sizeVal.textContent = `${fs}px`;
        if (rotVal) rotVal.textContent = `${r}°`;
        if (shVal) shVal.textContent = String(ss);
    };

    // Bind live preview
    ta?.addEventListener('input', refresh, { once: true });
    sel?.addEventListener('change', refresh, { once: true });
    size?.addEventListener('input', refresh, { once: true });
    rot?.addEventListener('input', refresh, { once: true });
    sh?.addEventListener('input', refresh, { once: true });
    // Re-bind without once by re-adding handlers each open:
    ta && (ta.oninput = refresh);
    sel && (sel.onchange = refresh);
    size && (size.oninput = refresh);
    rot && (rot.oninput = refresh);
    sh && (sh.oninput = refresh);

    refresh();
    modal.classList.add('active');
}

function applyTextStudio() {
    const page = state.pages?.[state.currentPageIndex];
    const slot = state.selectedPhotoSlot;
    const item = page?.photos?.[slot];
    if (!item || item.type !== 'text') return;

    const sel = document.getElementById('tsStyle');
    const ta = document.getElementById('tsContent');
    const size = document.getElementById('tsSize');
    const rot = document.getElementById('tsRotate');
    const sh = document.getElementById('tsShadow');

    item.content = String(ta?.value || '');
    item.styleId = sel?.value || 'default';
    item.fontSize = parseInt(size?.value || '32', 10) || 32;
    item.rotation = parseInt(rot?.value || '0', 10) || 0;
    item.shadowStrength = parseInt(sh?.value || '0', 10) || 0;

    closeTextStudio();
    renderCurrentPage();
    updateTextSlotControls();
}

function closeTextStudio() {
    document.getElementById('textStudioModal')?.classList.remove('active');
}

function closePhotoOptions() {
    const modal = document.getElementById('photoOptionsModal');
    if (modal) modal.classList.remove('active');
}

// Legacy handler kept for compatibility if needed, but redirects to options now
function handleReplacePhotoClick(slotIndex, event) {
    showPhotoOptions(slotIndex, event);
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
            designEditor.init('designStudioCanvasContainer', {
                filterControlsId: 'designStudioFilterControls',
                toolControlsId: 'designStudioToolControls',
                brushControlsId: 'designStudioBrushControls'
            });
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


async function applyDesignToPhoto() {
    if (!window.designEditor) return;

    // Save image to data URL (JPEG for smaller size, 0.85 quality)
    try {
        const editedDataUrl = await window.designEditor.exportImage('jpeg', 0.85);
        if (!editedDataUrl) throw new Error('Export returned empty data');

        const page = state.pages[state.currentPageIndex];
        const photo = page.photos[currentEditingPhotoIndex];

        if (!photo) {
            throw new Error('No photo active in slot');
        }

        // Save edited data
        photo.editedData = editedDataUrl;
        photo.lastEdited = Date.now();

        console.log('Saved edited photo for slot', currentEditingPhotoIndex);
        showStatus('Design saved to photo!', 'success');

        // Re-render to show updated look (if any layout changes, though filters are internal to data now)
        renderCurrentPage();

    } catch (e) {
        console.error('Failed to apply design:', e);
        alert('Failed to save design: ' + e.message);
    }
}

// Update UI label for sliders
function updateAdjustmentLabel(type, value) {
    // Label span is .slider-value inside .slider-header
    // We need to find the specific one. 
    // Best way is to pass the input element `this` and look at siblings
    // But since we are restricted to app.js, we assume IDs will be added to index.html
    const labelId = `val - ${type} `;
    const label = document.getElementById(labelId);
    if (label) label.textContent = value + '%';

    // Also call editor
    if (window.designEditor) {
        window.designEditor.setAdjustment(type, value);
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

function ensurePageTextControls() {
    const panel = document.getElementById('pages-settings-panel');
    if (!panel) return;

    if (document.getElementById('pageTextControlsGroup')) return;

    const group = document.createElement('div');
    group.id = 'pageTextControlsGroup';
    group.className = 'setting-group';
    group.style.marginTop = '14px';
    group.style.display = 'none';

    group.innerHTML = `
      <label class="setting-label">Selected Text</label>
      <div style="display:flex; flex-direction:column; gap:10px;">
        <div style="display:flex; gap:10px; align-items:center;">
          <select id="pageTextStyleSelect" class="edo-select" style="flex:1;">
            <option value="default">Default</option>
          </select>
          <button class="btn btn-secondary btn-sm" id="pageTextEditBtn" type="button">Edit</button>
        </div>
        <div class="sidebar-control-group flex-group" style="align-items:center;">
          <label class="setting-label" style="min-width:80px;">Size</label>
          <input type="range" id="pageTextSize" min="10" max="80" value="32" class="flex-expand">
          <span id="pageTextSizeVal" style="width:45px; text-align:right; font-size:12px;">32px</span>
        </div>
        <div class="sidebar-control-group flex-group" style="align-items:center;">
          <label class="setting-label" style="min-width:80px;">Rotate</label>
          <input type="range" id="pageTextRotate" min="-45" max="45" value="0" class="flex-expand">
          <span id="pageTextRotateVal" style="width:35px; text-align:right; font-size:12px;">0°</span>
        </div>
      </div>
    `;

    panel.appendChild(group);

    const select = group.querySelector('#pageTextStyleSelect');
    const size = group.querySelector('#pageTextSize');
    const sizeVal = group.querySelector('#pageTextSizeVal');
    const rotate = group.querySelector('#pageTextRotate');
    const rotateVal = group.querySelector('#pageTextRotateVal');
    const editBtn = group.querySelector('#pageTextEditBtn');

    const getActiveTextItem = () => {
        const page = state.pages?.[state.currentPageIndex];
        const slot = state.selectedPhotoSlot;
        const item = (page && slot !== null && slot !== undefined) ? page.photos?.[slot] : null;
        return (item && item.type === 'text') ? item : null;
    };

    // Populate styles when available
    const fillStyles = () => {
        const styles = window.TEXT_STYLES || [];
        const current = select.value;
        select.innerHTML = `<option value="default">Default</option>` +
            styles.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
        if (current && document.activeElement !== select) {
            select.value = current;
        }
    };
    fillStyles();

    select.addEventListener('change', () => {
        const item = getActiveTextItem();
        if (!item) return;
        item.styleId = select.value || 'default';
        renderCurrentPage();
    });

    size.addEventListener('input', () => {
        const item = getActiveTextItem();
        if (!item) return;
        const v = parseInt(size.value, 10) || 32;
        item.fontSize = v;
        if (sizeVal) sizeVal.textContent = `${v}px`;
        renderCurrentPage();
    });

    rotate.addEventListener('input', () => {
        const item = getActiveTextItem();
        if (!item) return;
        const v = parseInt(rotate.value, 10) || 0;
        item.rotation = v;
        if (rotateVal) rotateVal.textContent = `${v}°`;
        renderCurrentPage();
    });

    editBtn.addEventListener('click', () => {
        const item = getActiveTextItem();
        if (!item) return;
        const next = prompt('Edit text:', item.content || '');
        if (next === null) return;
        item.content = String(next);
        renderCurrentPage();
    });
}

function updateTextSlotControls() {
    ensurePageTextControls();
    const group = document.getElementById('pageTextControlsGroup');
    if (!group) return;

    const page = state.pages?.[state.currentPageIndex];
    const slot = state.selectedPhotoSlot;
    const item = (page && slot !== null && slot !== undefined) ? page.photos?.[slot] : null;
    const isText = !!(item && item.type === 'text');

    group.style.display = isText ? 'block' : 'none';
    if (!isText) return;

    const select = document.getElementById('pageTextStyleSelect');
    const size = document.getElementById('pageTextSize');
    const sizeVal = document.getElementById('pageTextSizeVal');
    const rotate = document.getElementById('pageTextRotate');
    const rotateVal = document.getElementById('pageTextRotateVal');

    if (select) {
        const styles = window.TEXT_STYLES || [];
        if (select.options.length <= 1 && styles.length) {
            select.innerHTML = `<option value="default">Default</option>` +
                styles.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        }
        // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
        if (document.activeElement !== select) {
            select.value = item.styleId || 'default';
        }
    }

    const rot = Number.isFinite(item.rotation) ? item.rotation : 0;
    if (rotate) rotate.value = String(rot);
    if (rotateVal) rotateVal.textContent = `${rot}°`;

    const fs = Number.isFinite(item.fontSize) ? item.fontSize : 32;
    if (size) size.value = String(fs);
    if (sizeVal) sizeVal.textContent = `${fs}px`;
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
// Enhanced Photo Picker with Text Support
function openPhotoPicker(callback) {
    // Some flows (e.g. cover photo selection) set `state.photoPickerCallback`
    // before opening the picker. Avoid overwriting it with `undefined`.
    if (typeof callback === 'function') {
        state.photoPickerCallback = callback;
    }
    const modal = document.getElementById('photoPickerModal');

    // Switch to Photos tab by default
    let activeTab = 'photos';

    const renderModalContent = () => {
        modal.innerHTML = `
        <div class="modal-content large-modal" style="height: 80vh; display: flex; flex-direction: column;">
            <div class="modal-header" style="flex-shrink: 0;">
                <div style="display:flex; justify-content:space-between; width:100%; align-items:center;">
                    <div class="gallery-tabs">
                        <button class="gallery-tab ${activeTab === 'photos' ? 'active' : ''}" id="ppTabPhotos">Photos</button>
                        <button class="gallery-tab ${activeTab === 'text' ? 'active' : ''}" id="ppTabText">Text / WordArt</button>
                    </div>
                     <div style="display:flex; align-items:center; gap:10px;">
                        ${activeTab === 'photos' ? `
                             <span style="font-size: 20px;">🔍</span>
                             <input type="range" min="100" max="400" value="150" data-album-zoom-range style="width: 100px;">
                        ` : ''}
                        <span class="close-modal" onclick="closePhotoPicker()">&times;</span>
                    </div>
                </div>
            </div>

            <div class="modal-body" style="flex: 1; overflow-y: auto; padding: 20px;">
                ${activeTab === 'photos' ? `
                    <div id="photoPickerGrid" class="photo-grid" style="grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));">
                        ${state.selectedPhotos.map((photo, index) => {
            const url = photo.editedImageData || (photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:') ? photo.thumbnailUrl : (photo.baseUrl || photo.url));
            return `
                            <div class="photo-item" onclick="pickPhoto(${index})">
                                <img src="${url}" loading="lazy" alt="Photo ${index + 1}">
                            </div>`;
        }).join('')}
                        ${state.selectedPhotos.length === 0 ? '<p style="grid-column: 1/-1; text-align:center; color:#666; margin-top:50px;">No photos selected. Upload photos first.</p>' : ''}
                    </div>
                ` : `
                    <!-- Text / WordArt Input -->
                    <div class="text-input-container" style="max-width: 600px; margin: 0 auto; text-align: center;">
                        <textarea id="ppTextInput" class="edo-textarea" placeholder="Type your text here..." style="font-size: 18px; width: 100%; min-height: 100px; margin-bottom: 20px;"></textarea>
                        
                        <h4 style="margin-bottom: 10px; text-align: left;">Select Style</h4>
                        <div class="text-style-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 15px;">
                            ${window.TEXT_STYLES ? window.TEXT_STYLES.map(style => {
            let styleString = '';
            for (const [key, value] of Object.entries(style.style)) {
                const kebabKey = key.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
                styleString += `${kebabKey}:${value};`;
            }
            return `
                                <div class="style-option" onclick="pickText('${style.id}', '${style.name}')" style="border: 1px solid #eee; padding: 10px; cursor: pointer; border-radius: 8px; hover:background:#f9f9f9;">
                                    <div style="font-size: 24px; text-align: center; margin-bottom: 5px; ${styleString}">Abc</div>
                                    <div style="font-size: 11px; text-align: center; color: #666;">${style.name}</div>
                                </div>
                                `;
        }).join('') : '<p>Loading styles...</p>'}
                             <!-- Default / Plain Text Option -->
                             <div class="style-option" onclick="pickText('default', 'Plain Text')" style="border: 1px solid #eee; padding: 10px; cursor: pointer; border-radius: 8px;">
                                    <div style="font-size: 24px; text-align: center; margin-bottom: 5px; font-family: sans-serif; color: #333;">Abc</div>
                                    <div style="font-size: 11px; text-align: center; color: #666;">Plain Text</div>
                             </div>
                        </div>

                        <button class="btn btn-primary" onclick="submitTextSelection()" style="margin-top: 30px; width: 100%; padding: 12px;">Insert Text</button>
                    </div>
                `}
            </div>
        </div>
        `;

        // Bind Tab Click Handlers
        document.getElementById('ppTabPhotos').onclick = () => { activeTab = 'photos'; renderModalContent(); };
        document.getElementById('ppTabText').onclick = () => { activeTab = 'text'; renderModalContent(); };

        // Re-bind Zoom Listener if on photos tab
        if (activeTab === 'photos') {
            const zoomInput = modal.querySelector('input[data-album-zoom-range]');
            const grid = document.getElementById('photoPickerGrid');
            if (zoomInput && grid) {
                zoomInput.oninput = function () {
                    const size = this.value + 'px';
                    grid.style.setProperty('grid-template-columns', `repeat(auto-fill, minmax(${size}, 1fr))`);
                };
            }
        }
    };

    renderModalContent();
    modal.classList.add('active');
}

// Global function to handle Text Selection
window.pickText = (styleId, styleName) => {
    // Highlight selection
    const opts = document.querySelectorAll('.style-option');
    opts.forEach(o => o.style.borderColor = '#eee');
    // We can't easily find "this" without passing event, so simpler implementation:
    // Just store selected style in a temp variable attached to modal or state
    state.tempSelectedTextStyle = styleId;

    // Ideally visuals update:
    event.currentTarget.style.borderColor = '#6366f1';
    event.currentTarget.style.borderWidth = '2px';
};

window.submitTextSelection = () => {
    const textInput = document.getElementById('ppTextInput').value;
    if (!textInput) {
        alert('Please enter some text');
        return;
    }
    const styleId = state.tempSelectedTextStyle || 'default';

    if (state.photoPickerCallback) {
        // Pass a special object structure for text
        state.photoPickerCallback({
            type: 'text',
            content: textInput,
            styleId: styleId,
            id: 'text-' + Date.now() // unique ID
        });
        state.photoPickerCallback = null;
    }
    closePhotoPicker();
};

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
    const bookTitleEl = document.getElementById('bookTitle');
    const defaultName = bookTitleEl ? bookTitleEl.value || 'My Photo Book' : 'My Photo Book';
    const projectName = prompt('Enter project name:', defaultName);

    if (!projectName) return;

    if (bookTitleEl) bookTitleEl.value = projectName;

    const pageFormatEl = document.getElementById('pageFormat');
    const projectData = {
        // If we already have a saved album open, overwrite it instead of creating a new one.
        id: state.activeProjectId || undefined,
        projectType: 'classic',
        title: projectName,
        pageFormat: pageFormatEl ? pageFormatEl.value : 'square-8x8',
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
    if (!firebase.auth().currentUser) {
        alert("Please wait for sign-in to complete, or sign in manually to load projects.");
        return;
    }
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
            const label = m.name || `Method ${id} `;
            return `< option value = "${escapeHtml(id)}" > ${escapeHtml(label)}</option > `;
        }).join('');
        // Prefer preserving selection; default to "2" if present.
        // Prefer preserving selection; default to "2" if present.
        const hasCurrent = Array.from(methodSel.options).some(o => o.value === current);
        const hasHome = Array.from(methodSel.options).some(o => o.value === '2');
        methodSel.value = hasCurrent ? current : (hasHome ? '2' : methodSel.options[0]?.value);

        // Trigger UI update
        toggleBookpodPickupUI(methodSel.value);
    }

    if (hint) {
        hint.textContent = options.note || 'Shipping methods loaded.';
    }
}

function toggleBookpodPickupUI(methodId) {
    const section = document.getElementById('bpPickupPointSection');
    // ID 1 is usually "Pickup point delivery" for HFD/BookPod
    if (section) {
        if (String(methodId) === '1') {
            section.style.display = 'block';
            // Auto-load if city is filled and list is empty
            const city = document.getElementById('bpShipCity')?.value;
            const select = document.getElementById('bpPickupPointSelect');
            if (city && select && select.options.length <= 1) {
                loadBookpodPickupPoints();
            }
        } else {
            section.style.display = 'none';
        }
    }
    previewBookpodOrder(); // Update preview price if needed (logic not fully here but good practice)
}

async function loadBookpodPickupPoints() {
    const city = document.getElementById('bpShipCity')?.value;
    const address1 = document.getElementById('bpShipAddress1')?.value;
    const statusEl = document.getElementById('bpPickupStatus');
    const select = document.getElementById('bpPickupPointSelect');

    if (!city) {
        alert('Please enter a City first to find pickup points.');
        return;
    }

    if (statusEl) statusEl.textContent = 'Searching points in ' + city + '...';
    select.innerHTML = '<option>Loading...</option>';
    select.disabled = true;

    try {
        const result = await callFunction('bookpodSearchPickupPoints', {
            address: { city, address1, country: 'Israel' } // Default to Israel for HFD
        });

        select.innerHTML = '<option value="">-- Select a Point --</option>';
        select.disabled = false;

        if (result && result.success && Array.isArray(result.pickupPoints)) {
            if (result.pickupPoints.length === 0) {
                if (statusEl) statusEl.textContent = 'No points found near ' + city;
                return;
            }

            result.pickupPoints.forEach(p => {
                // e.g. p.name, p.city, p.street, p.id
                const label = `${p.city} - ${p.name} (${p.street})`;
                const opt = document.createElement('option');
                opt.value = JSON.stringify({ id: p.id, name: p.name, city: p.city }); // Store simplified object
                opt.textContent = label;
                select.appendChild(opt);
            });
            if (statusEl) statusEl.textContent = `Found ${result.pickupPoints.length} points.`;
        } else {
            if (statusEl) statusEl.textContent = 'Failed to load points.';
        }
    } catch (e) {
        console.error(e);
        if (statusEl) statusEl.textContent = 'Error: ' + e.message;
        select.disabled = false;
    }
}

async function submitBookpodOrder() {
    const btn = document.querySelector('#bookpodOrderModal .btn-primary'); // "Create Order" button
    const methodId = document.getElementById('bpShipMethod')?.value;

    // Validate
    const required = ['bpShipName', 'bpShipPhone', 'bpShipCity', 'bpShipAddress1']; // Basic set
    for (const id of required) {
        const val = document.getElementById(id)?.value;
        if (!val || !val.trim()) {
            alert('Please fill in all shipping fields.');
            return;
        }
    }

    let pickupPoint = null;
    if (String(methodId) === '1') {
        const ppVal = document.getElementById('bpPickupPointSelect')?.value;
        if (!ppVal) {
            alert('Please select a Pickup Point.');
            return;
        }
        try {
            pickupPoint = JSON.parse(ppVal);
        } catch (e) { console.error('Invalid pickup point val', ppVal); }
    }

    if (!confirm('Ready to submit order to BookPod? This will generate the PDF and send the order.')) return;

    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Generating & Submitting...';
    }

    try {
        // We need to generate a PDF first, or have one ready via Memory Director.
        // For this flow, we assume we might need to regenerate or use existing logic.
        // Actually, bookpodSubmitPrintJob handles PDF generation internally if we pass bookData!
        // We just need a dummy PDF URL or let the function handle it.
        // Update: bookpodSubmitPrintJob expects `pdfDownloadUrl` (content) and `bookData`.

        // 1. Generate Content PDF (Client side trigger or Reuse Memory Director ID?)
        // The Cloud Function `bookpodSubmitPrintJob` takes `pdfDownloadUrl`.
        // We should ideally generate the high-res PDF now.
        // For now, let's assume we use the Print Ready Generator.

        // Quick hack: Use a placeholder or trigger generation.
        // REALITY: We need to call `generateMemoryDirectorPdf` first to get a URL, 
        // OR pass a flag to `bookpodSubmitPrintJob` to do it.
        // Let's call `generateMemoryDirectorPdf` here to be safe and get a fresh URL.

        // Create a sanitized payload to avoid circular references and ensure key props are passed
        const safeBookData = {
            pages: state.pages,
            cover: state.cover,
            // Pass template-specifics explicitly as backend expects them at root or mapped from cover
            decorations: state.decorations || state.selectedTemplate?.decorations,
            borderStyle: state.borderStyle || state.selectedTemplate?.illustrations?.border,
            template: state.template || state.selectedTemplate?.id || "custom",
            // Pass other necessary state configs
            pageFormat: state.pageFormat || "square-10x10",
            title: state.activeProjectTitle || state.cover?.title || "My Photo Book",
            globalCornerRadius: state.globalCornerRadius || 0
        };

        showStatus('Generating PDF for print...', 'info');
        const pdfRes = await callFunction('generateMemoryDirectorPdf', { bookData: safeBookData });
        if (!pdfRes || !pdfRes.success || !pdfRes.pdfDownloadUrl) {
            throw new Error('Failed to generate PDF: ' + (pdfRes?.error || 'Unknown error'));
        }

        const pdfUrl = pdfRes.pdfDownloadUrl || pdfRes.pdfUrl; // Prefer download URL

        showStatus('Submitting order to BookPod...', 'info');

        const shippingDetails = {
            name: document.getElementById('bpShipName').value,
            phone: document.getElementById('bpShipPhone').value,
            email: document.getElementById('bpShipEmail').value,
            city: document.getElementById('bpShipCity').value,
            address1: document.getElementById('bpShipAddress1').value,
            address2: document.getElementById('bpShipAddress2').value || '',
            postalCode: document.getElementById('bpShipPostalCode').value || '',
            country: document.getElementById('bpShipCountry').value || 'Israel',
            shippingMethod: Number(methodId)
        };

        const orderDraft = {
            shippingDetails,
            shippingMethod: Number(methodId),
            pickupPoint,
            quantity: 1, // Start with 1
            totalprice: 99 // Placeholder price
        };

        const result = await callFunction('bookpodSubmitPrintJob', {
            bookData: state,
            pdfDownloadUrl: pdfUrl,
            orderDraft
        });

        if (result && result.success) {
            alert('Order Created Successfully!\nOrder ID: ' + (result.bookpodOrder?.id || 'Unknown'));
            closeBookpodOrderModal();
        } else {
            throw new Error(result?.error || 'Order submission failed.');
        }

    } catch (e) {
        console.error(e);
        alert('Error: ' + e.message);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create Order';
        }
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

async function resizeBase64Image(base64, maxWidth) {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round(height * (maxWidth / width));
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);

            // JPEG 0.85 quality is good balance for print
            resolve(canvas.toDataURL('image/jpeg', 0.85));
        };
        img.onerror = () => resolve(base64); // Fallback
    });
}

async function optimizeBookDataForPdf(originalState) {
    showProgress('Optimizing...', 'Preparing images for upload...', 10);

    // Deep clone pertinent parts only
    const cleanState = {
        title: originalState.title || "My Photo Book",
        // Extract cover info
        cover: { ...originalState.cover },
        // Extract pages
        pages: originalState.pages ? originalState.pages.map(p => ({
            ...p,
            // Keep only essential photo data
            photos: p.photos ? p.photos.map(ph => ({ ...ph })) : []
        })) : [],
        // Template info
        template: originalState.template,
        selectedTemplate: originalState.selectedTemplate,
        borderStyle: originalState.borderStyle,
        borderColor: originalState.borderColor,
        decorations: originalState.decorations,
        globalCornerRadius: originalState.globalCornerRadius, // Pass corner radius to backend
        // Back cover
        backCover: originalState.backCover
    };

    const MAX_WIDTH = 2000;
    let processedCount = 0;
    const totalImages = (cleanState.cover?.photo ? 1 : 0) +
        cleanState.pages.reduce((acc, p) => acc + (p.photos?.length || 0), 0);

    // 1. Optimize Cover Photo
    if (cleanState.cover && cleanState.cover.photo) {
        const p = cleanState.cover.photo;
        // If it's a local Data URL
        if (p.baseUrl && String(p.baseUrl).startsWith('data:')) {
            p.baseUrl = await resizeBase64Image(p.baseUrl, MAX_WIDTH);
            // Ensure other fields leverage this
            p.thumbnailUrl = p.baseUrl;
            p.editedImageData = p.baseUrl;
        }
        processedCount++;
        if (totalImages > 0) updateProgress('Optimizing...', `Processing image ${processedCount} /${totalImages}`, 10 + (processedCount / totalImages) * 20);
    }

    // 2. Optimize Page Photos
    for (const page of cleanState.pages) {
        if (!page.photos) continue;
        for (const p of page.photos) {
            // If it's local
            if (p && p.baseUrl && String(p.baseUrl).startsWith('data:')) {
                p.baseUrl = await resizeBase64Image(p.baseUrl, MAX_WIDTH);
                p.thumbnailUrl = p.baseUrl;
                p.editedImageData = p.baseUrl;
            }
            // Strip unused bulky fields if they exist
            if (p) delete p.originalFile;

            processedCount++;
            if (totalImages > 0) updateProgress('Optimizing...', `Processing image ${processedCount}/${totalImages}`, 10 + (processedCount / totalImages) * 20);
        }
    }

    return cleanState;
}

async function downloadPdfOnly() {
    const user = state.user || firebase.auth().currentUser;
    if (!user) {
        alert('Please sign in to generate a PDF.');
        return;
    }

    if (!state.pages || state.pages.length === 0) {
        alert('Your book is empty! Please add some photos and pages first.');
        return;
    }

    if (!confirm('Generate high-resolution PDF preview? This may take a minute.')) return;

    try {
        // Optimize payload (Client-side resize of huge local photos)
        const optimizedData = await optimizeBookDataForPdf(state);

        showProgress('Generating PDF...', 'Combining photos and layout...', 35);

        // Use 600s timeout
        const pdfRes = await callFunction('generateMemoryDirectorPdf', { bookData: optimizedData }, 600000);

        if (!pdfRes || !pdfRes.success || !pdfRes.pdfDownloadUrl) {
            throw new Error('Failed to generate PDF: ' + (pdfRes?.error || 'Unknown error'));
        }

        const pdfUrl = pdfRes.pdfDownloadUrl;

        hideProgress();

        // Open PDF in new tab
        window.open(pdfUrl, '_blank');

    } catch (e) {
        console.error('PDF Generation Failed:', e);
        hideProgress();
        showError('PDF Generation Failed: ' + e.message);
    }
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

async function loadProject(projectId, options = {}) {
    console.log(`loadProject called for ID: ${projectId}`, options);
    const { suppressErrors = false, closeModal = true } = options;

    if (!projectId) {
        console.error("loadProject: No projectId provided");
        return;
    }
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

            // Update book title and page format if elements exist (they may not exist in all views)
            const bookTitleEl = document.getElementById('bookTitle');
            if (bookTitleEl) bookTitleEl.value = data.title || 'My Photo Book';
            const pageFormatEl = document.getElementById('pageFormat');
            if (pageFormatEl) pageFormatEl.value = data.pageFormat || 'square-8x8';
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

            // Ensure we are in the classic editor view first
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

            // Update UI - these functions may fail if elements don't exist, which is OK
            try { updateSelectedPhotosUI(); } catch (e) { console.warn('updateSelectedPhotosUI failed:', e); }
            try { updateCoverFromState(); } catch (e) { console.warn('updateCoverFromState failed:', e); }
            try { updateBackCoverPreview(); } catch (e) { console.warn('updateBackCoverPreview failed:', e); }
            try { renderPageThumbnails(); } catch (e) { console.warn('renderPageThumbnails failed:', e); }

            // Switch to pages tab if there are pages to show (do this before rendering)
            if (state.pages && state.pages.length > 0 && typeof switchEditorTab !== 'undefined') {
                try {
                    switchEditorTab('pages');
                } catch (e) {
                    console.warn('switchEditorTab failed:', e);
                }
            }

            try { renderCurrentPage(); } catch (e) { console.warn('renderCurrentPage failed:', e); }
            try { updatePageIndicator(); } catch (e) { console.warn('updatePageIndicator failed:', e); }

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
    const coverTitleEl = document.getElementById('coverTitle');
    if (coverTitleEl) coverTitleEl.value = state.cover.title || 'My Photo Book';

    const coverTitleSizeEl = document.getElementById('coverTitleSize');
    if (coverTitleSizeEl) coverTitleSizeEl.value = state.cover.titleSize || 36;

    const coverTitleSizeValEl = document.getElementById('coverTitleSizeVal');
    if (coverTitleSizeValEl) coverTitleSizeValEl.textContent = (state.cover.titleSize || 36) + 'px';

    const coverTitleColorEl = document.getElementById('coverTitleColor');
    if (coverTitleColorEl) coverTitleColorEl.value = state.cover.titleColor || '#ffffff';

    const coverTitleFontEl = document.getElementById('coverTitleFont');
    // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
    if (coverTitleFontEl && document.activeElement !== coverTitleFontEl) {
        coverTitleFontEl.value = state.cover.titleFont || 'Playfair Display';
    }

    const subtitleEl = document.getElementById('coverSubtitle');
    if (subtitleEl) subtitleEl.value = state.cover.subtitle || '';

    // NEW: Initialize subtitle color
    const subtitleColorEl = document.getElementById('coverSubtitleColor');
    if (subtitleColorEl) subtitleColorEl.value = state.cover.subtitleColor || '#ffffff';

    const subtitleSizeEl = document.getElementById('coverSubtitleSize');
    if (subtitleSizeEl) subtitleSizeEl.value = state.cover.subtitleSize || 14;

    const subtitleSizeValEl = document.getElementById('coverSubtitleSizeVal');
    if (subtitleSizeValEl) subtitleSizeValEl.textContent = (state.cover.subtitleSize || 14) + 'px';

    const coverSubtitleFontEl = document.getElementById('coverSubtitleFont');
    // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
    if (coverSubtitleFontEl && document.activeElement !== coverSubtitleFontEl) {
        coverSubtitleFontEl.value = state.cover.subtitleFont || (state.cover.titleFont || 'Playfair Display');
    }

    const showBorderEl = document.getElementById('coverShowBorder');
    if (showBorderEl) showBorderEl.checked = state.cover.showBorder !== false;

    const coverBgColorEl = document.getElementById('coverBgColor');
    if (coverBgColorEl) coverBgColorEl.value = state.cover.backgroundColor || '#1a1a2e';

    const coverPhotoBorderEl = document.getElementById('coverPhotoBorder');
    if (state.cover.photoBorder) {
        if (coverPhotoBorderEl) coverPhotoBorderEl.checked = true;
        const coverBorderColorEl = document.getElementById('coverBorderColor');
        if (coverBorderColorEl) coverBorderColorEl.value = state.cover.photoBorder.color || '#000000';
        const coverBorderWeightEl = document.getElementById('coverBorderWeight');
        if (coverBorderWeightEl) coverBorderWeightEl.value = state.cover.photoBorder.weight || 2;
    } else {
        if (coverPhotoBorderEl) coverPhotoBorderEl.checked = false;
    }

    // Update Layout & Custom Controls
    const layoutEl = document.getElementById('coverLayout');
    // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
    if (layoutEl && document.activeElement !== layoutEl) {
        layoutEl.value = state.cover.layout || 'standard';
    }

    const photoSizeEl = document.getElementById('coverPhotoSize');
    if (photoSizeEl) photoSizeEl.value = state.cover.photoSize || 100;
    const photoSizeValEl = document.getElementById('coverPhotoSizeVal');
    if (photoSizeValEl) photoSizeValEl.textContent = (state.cover.photoSize || 100) + '%';

    const photoAngleEl = document.getElementById('coverPhotoAngle');
    if (photoAngleEl) photoAngleEl.value = state.cover.photoAngle || 0;
    const photoAngleValEl = document.getElementById('coverPhotoAngleVal');
    if (photoAngleValEl) photoAngleValEl.textContent = (state.cover.photoAngle || 0) + '°';

    const globalCornerRadiusEl = document.getElementById('globalCornerRadius');
    // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
    if (globalCornerRadiusEl && document.activeElement !== globalCornerRadiusEl) {
        globalCornerRadiusEl.value = state.globalCornerRadius || 0;
    }

    const globalCornerRadiusCoverEl = document.getElementById('globalCornerRadiusCover');
    // Avoid mutating a focused <select> while user is interacting with it (can close the dropdown)
    if (globalCornerRadiusCoverEl && document.activeElement !== globalCornerRadiusCoverEl && document.activeElement !== globalCornerRadiusEl) {
        globalCornerRadiusCoverEl.value = state.globalCornerRadius || 0;
    }

    updateCoverPreview();

    const slot = document.getElementById('coverPhotoSlot');
    const isSafeImgSrc = (src) => {
        if (!src || typeof src !== 'string') return false;
        const s = src.trim();
        if (!s) return false;
        if (s.startsWith('data:') || s.startsWith('blob:')) return true;
        if (!/^https?:\/\//i.test(s)) return true;
        try { return new URL(s, window.location.href).origin === window.location.origin; } catch { return false; }
    };
    const coverThumb = state?.cover?.photo?.thumbnailUrl;
    if (slot && state.cover.photo && isSafeImgSrc(coverThumb)) {
        slot.innerHTML = `<img src="${coverThumb}" alt="Cover photo">`;
        slot.onclick = selectCoverPhoto;
        slot.style.cursor = 'pointer';
    } else if (slot) {
        slot.innerHTML = '<span>Click to add cover photo</span>';
        slot.onclick = selectCoverPhoto;
        slot.style.cursor = 'pointer';
    }
}

function selectCoverPhoto() {
    state.photoPickerCallback = (photo) => {
        // Uniformly update BOTH state properties
        state.cover.photo = {
            ...photo,
            alignment: 'center'
        };
        // Ensure legacy property is also set for 3D preview
        state.cover.photoUrl = photo.editedData || photo.thumbnailUrl || photo.baseUrl;

        updateCoverFromState();
        try { updateCoverPreview(); } catch (e) {/* ignore */ }

        // Force re-render of 3D view (which consumes photoUrl)
        if (typeof renderCurrentPage === 'function') renderCurrentPage();
    };
    openPhotoPicker();
}

function autoLayoutCurrentPage() {
    console.log("Auto Layout clicked. State:", { pages: state.pages ? state.pages.length : 'null', index: state.currentPageIndex, selectedPhotos: state.selectedPhotos ? state.selectedPhotos.length : 0 });

    // Auto-Fill Logic: If no pages but we have selected photos, create pages automatically
    if ((!state.pages || state.pages.length === 0) && state.selectedPhotos && state.selectedPhotos.length > 0) {
        showStatus(`Auto-creating pages from ${state.selectedPhotos.length} photos...`, 'info');

        const PHOTOS_PER_PAGE = 4;
        const photos = [...state.selectedPhotos]; // copy
        let photosProcessed = 0;

        while (photosProcessed < photos.length) {
            // Create a new page
            addPage();
            const pageIndex = state.pages.length - 1;
            const page = state.pages[pageIndex];

            // Get chunk of photos for this page
            const chunk = photos.slice(photosProcessed, photosProcessed + PHOTOS_PER_PAGE);
            page.photos = chunk.map(p => ({ ...p })); // Assign photos

            // Set layout based on count with randomization
            const count = chunk.length;
            if (count === 1) {
                page.layout = 'single';
            } else if (count === 2) {
                // Randomly choose horizontal or vertical
                page.layout = Math.random() > 0.5 ? 'two-horizontal' : 'two-vertical';
            } else if (count === 3) {
                // Randomly choose left or right large
                page.layout = Math.random() > 0.5 ? 'three-left' : 'three-right';
            } else if (count === 4) {
                page.layout = 'four-grid';
            } else if (count === 5) {
                page.layout = 'collage-5';
            } else if (count >= 6) {
                page.layout = 'collage-6';
            }

            photosProcessed += count;
        }

        state.currentPageIndex = 0;
        console.log(`Auto-created ${state.pages.length} pages.`);

        // Refresh UI
        updatePageIndicator();
        renderCurrentPage();
        renderPageThumbnails();

        showStatus(`Automatically created ${state.pages.length} pages.`, 'success');
        return;
    }

    if (!state.pages || state.pages.length === 0) {
        console.warn("Auto Layout: No pages found in state.");
        showStatus("No pages found to layout. Please add photos first.", 'warning');
        return;
    }

    // Check if we are on the cover
    if (state.currentPageIndex < 0 || state.currentPageIndex >= state.pages.length) {
        showStatus("Auto-layout applies to inner pages only.", 'warning');
        return;
    }

    const page = state.pages[state.currentPageIndex];
    if (!page) return;

    // Count non-empty photos
    const photoCount = page.photos.filter(p => p && (p.baseUrl || p.id)).length;

    if (photoCount === 0) {
        showStatus("Please add photos to this page before using Auto Layout.", 'warning');
        return;
    }
    let newLayout = 'single';

    switch (photoCount) {
        case 0:
        case 1:
            newLayout = 'single';
            break;
        case 2:
            newLayout = 'two-horizontal'; // Could randomize between horizontal/vertical
            break;
        case 3:
            newLayout = 'three-left'; // Could randomize
            break;
        case 4:
            newLayout = 'four-grid';
            break;
        case 5:
            newLayout = 'collage-5';
            break;
        case 6:
        default:
            newLayout = 'collage-6'; // Max supported or 6+
            break;
    }

    // Ensure state reflects the change
    page.layout = newLayout;

    // Update UI dropdown if present
    const layoutSelect = document.getElementById('pageLayout');
    if (layoutSelect) {
        layoutSelect.value = newLayout;
    }

    renderCurrentPage();
    console.log(`Auto-layout applied: ${newLayout} for ${photoCount} photos.`);
    showStatus(`Applied layout: ${newLayout}`, 'success');
}

function switchPageSide(side) {
    if (!state.pages || state.pages.length === 0) return;
    if (state.currentPageIndex < 0) return; // Cover

    const base = Math.floor(state.currentPageIndex / 2) * 2;
    const total = state.pages.length;
    const logicalLeftIndex = base;
    const logicalRightIndex = (base + 1 < total) ? (base + 1) : null;
    const isRtl = (document?.documentElement?.getAttribute('dir') || 'ltr') === 'rtl';
    const leftIndex = isRtl ? logicalRightIndex : logicalLeftIndex;
    const rightIndex = isRtl ? logicalLeftIndex : logicalRightIndex;

    if (side === 'left') {
        if (Number.isFinite(leftIndex) && state.currentPageIndex !== leftIndex) {
            state.currentPageIndex = leftIndex;
            renderCurrentPage();
        }
    } else if (side === 'right') {
        // Only if right page exists
        if (Number.isFinite(rightIndex) && rightIndex < state.pages.length) {
            if (state.currentPageIndex !== rightIndex) {
                state.currentPageIndex = rightIndex;
                renderCurrentPage();
            }
        }
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
            caption: photo.caption || null,
            // Per-image mask + frame (non-destructive)
            shape: photo.shape || null,
            frameId: photo.frameId || null,
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

    const bookTitleEl = document.getElementById('bookTitle');
    const pageFormatEl = document.getElementById('pageFormat');
    return {
        title: state.cover.title || (bookTitleEl ? bookTitleEl.value : null) || 'My Photo Book',
        pageFormat: (pageFormatEl ? pageFormatEl.value : null) || 'square-8x8',
        coverPhoto: coverPhoto,
        coverPhotoShape: state.cover?.photoShape || null,
        coverPhotoFrameId: state.cover?.photoFrameId || null,
        coverBackground: state.cover.backgroundColor || (template ? template.cover.backgroundColor : currentTheme.colors.bg),
        coverTextColor: state.cover.titleColor || (template ? template.cover.titleColor : currentTheme.colors.primary),
        coverTitleSize: state.cover.titleSize || (template ? template.cover.titleSize : 36),
        coverTitleFont: state.cover.titleFont || (template ? template.cover.titleFont : 'Playfair Display'),
        coverSubtitle: state.cover.subtitle || '',
        coverSubtitleSize: state.cover.subtitleSize || 14,
        coverSubtitle: state.cover.subtitle || '',
        coverSubtitleSize: state.cover.subtitleSize || 14,
        coverShowBorder: state.cover.showBorder !== false,
        coverLayout: state.cover.layout || 'standard',

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

    if (acBookTitle && bookTitle) acBookTitle.value = bookTitle?.value || '';
    if (acPageFormat && pageFormat) acPageFormat.value = pageFormat?.value || 'square-8x8';
    if (acAutoLayout && autoLayout) acAutoLayout.value = autoLayout?.value || 'random';

    if (acBpPrintColor && bpPrintColor) acBpPrintColor.value = bpPrintColor?.value || 'color';
    if (acBpSheetType && bpSheetType) acBpSheetType.value = bpSheetType?.value || 'white80';
    if (acBpLaminationType && bpLaminationType) acBpLaminationType.value = bpLaminationType?.value || 'none';
    if (acBpReadingDirection && bpReadingDirection) acBpReadingDirection.value = bpReadingDirection?.value || 'right';
    if (acBpBleed && bpBleed) acBpBleed.checked = !!bpBleed?.checked;
    if (acBpSizeCm && bpSizeCm) acBpSizeCm.value = bpSizeCm?.value || '15x22';
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

    if (bookTitle && acBookTitle) bookTitle.value = acBookTitle?.value || 'My Photo Book';
    if (pageFormat && acPageFormat) pageFormat.value = acPageFormat?.value || 'square-8x8';
    if (autoLayout && acAutoLayout) autoLayout.value = acAutoLayout?.value || 'random';
    /**
     * Updates the layout of the current page based on user selection
     * @param {string} layoutName - The layout identifier (e.g., 'two-horizontal')
     */
    function updatePageLayout(layoutName) {
        if (!state.pages || state.pages.length === 0 || state.currentPageIndex < 0) {
            return; // No valid page to update
        }

        const page = state.pages[state.currentPageIndex];
        page.layout = layoutName;
        console.log(`Manual layout update: ${layoutName}`);
        renderCurrentPage();
    }

    /**
     * Applies the current design (edits/filters) from the Design Editor
     * to the currently selected photo in the book.
     */
    function applyDesignToPhoto() {
        // 1. Export the image from the design editor (canvas)
        const editedDataUrl = window.designEditor.exportImage('png', 0.9);

        // 2. Identify where this photo belongs
        // We need to know which page and which slot we were editing.
        // Assuming 'state.selectedPhotoSlot' tracks the index of the photo being edited on the current page.
        const pageIndex = state.currentPageIndex;
        if (pageIndex < 0 || !state.pages[pageIndex]) {
            alert("Please select a page first.");
            return;
        }

        const page = state.pages[pageIndex];
        // If we don't track the exact slot, we might need a mechanism. 
        // For now, let's assume the user clicked "Edit" on a specific photo, 
        // and we stored that index in 'state.editingPhotoIndex'.
        // If not, we might need to add that tracking. Let's check if 'state.editingPhotoIndex' exists or add it.

        // fallback: if we don't have a specific slot, warn the user.
        if (typeof state.editingPhotoIndex === 'undefined' || state.editingPhotoIndex === null) {
            // Attempt to find the photo that matches the source, or if there's only 1 photo, use it.
            if (page.photos.length === 1) {
                state.editingPhotoIndex = 0;
            } else {
                alert("Could not determine which photo to apply edits to. Please click 'Edit' on a specific photo first.");
                return;
            }
        }

        // 3. Update the photo object with the edited version
        // We save it as 'editedData' so we preserve the original 'baseUrl' or 'thumbnailUrl'.
        if (page.photos[state.editingPhotoIndex]) {
            page.photos[state.editingPhotoIndex].editedData = editedDataUrl;
            console.log(`Applied design to page ${pageIndex}, photo ${state.editingPhotoIndex}`);

            // 4. Render the page to show the changes
            renderCurrentPage();

            // 5. Notify user
            // subtle toast or just log
            const applyBtn = document.querySelector("#designInspirationContent + .modal-footer .btn-primary") || document.activeElement;
            const originalText = applyBtn.innerHTML;
            applyBtn.innerHTML = "Saved! ✓";
            setTimeout(() => applyBtn.innerHTML = originalText, 1500);
        }
    }

    // Ensure 'state.editingPhotoIndex' is tracked when opening the editor.
    // We need to find where photos are clicked to edit. checking 'renderCurrentPage' might reveal this.

    if (bpPrintColor && acBpPrintColor) bpPrintColor.value = acBpPrintColor?.value || 'color';
    if (bpSheetType && acBpSheetType) bpSheetType.value = acBpSheetType?.value || 'white80';
    if (bpLaminationType && acBpLaminationType) bpLaminationType.value = acBpLaminationType?.value || 'none';
    if (bpReadingDirection && acBpReadingDirection) bpReadingDirection.value = acBpReadingDirection?.value || 'right';
    if (bpBleed && acBpBleed) bpBleed.checked = !!acBpBleed?.checked;
    if (bpSizeCm && acBpSizeCm) bpSizeCm.value = acBpSizeCm?.value || '15x22';

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
    console.log('openBookpodDeliveryConfigModal called');
    const modal = document.getElementById('bookpodDeliveryConfigModal');
    if (!modal) {
        console.error('bookpodDeliveryConfigModal NOT FOUND in DOM');
        return Promise.resolve('skip');
    }

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
        sel.innerHTML = '<option value="">Search to load pickup points…</option>';
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
            sel.innerHTML = '<option value="">No pickup points found</option>';
            if (status) status.textContent = res?.message || 'No pickup points found.';
            return;
        }

        points.forEach((p) => {
            const opt = document.createElement('option');
            opt.value = JSON.stringify(p);
            const dist = (typeof p.distanceKm === 'number') ? ` • ${p.distanceKm.toFixed(1)} km` : '';
            opt.textContent = `${p.name || p.label || 'Pickup point'} — ${[p.city, p.street, p.house].filter(Boolean).join(' ')}${dist}`;
            sel.appendChild(opt);
        });
        sel.value = sel.options[0]?.value || '';
        if (status) status.textContent = `Loaded ${points.length} pickup points.`;
    } catch (e) {
        console.warn('Pickup point search failed:', e);
        sel.innerHTML = '<option value="">Failed to load pickup points</option>';
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
            alert(`Sent to BookPod successfully.Order: ${orderNo}`);
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
        let authed = false;
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            console.log('Localhost detected: Bypassing Google Photos auth for testing.');
            authed = true;
            // Ensure we have a user object even if auth is bypassed
            if (!firebase.auth().currentUser) {
                console.log('No user found on localhost, creating mock user...');
                state.user = { uid: 'dev-mode-user', displayName: 'Developer', email: 'dev@local.host' };
            }
        } else {
            authed = await ensureGooglePhotosAuthorizedInteractive('generate your photo book PDF', 60000);
        }

        if (!authed) {
            hideProgress();
            alert('Google Photos authorization is required to load your saved photos. Please complete the authorization in the opened tab, then click “Generate Book” again.');
            return;
        }

        let bookData;
        try {
            bookData = collectBookData();
        } catch (e) {
            console.error('Error collecting book data:', e);
            hideProgress();
            alert('Error preparing book data: ' + (e.message || 'Unknown error'));
            return;
        }
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

                // Force layout flush to ensure visibility
                void document.getElementById('resultModal').offsetWidth;
                console.log('Result modal displayed');
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
        name: `Custom Palette ${new Date().toLocaleTimeString()} `,
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
    const themeId = `custom - ${Date.now()} `;
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
    preview.id = `preview - ${themeId} `;

    const bookCover = document.createElement('div');
    bookCover.className = 'book-cover-3d';
    bookCover.style.background = theme.colors.bg;
    bookCover.style.border = `2px solid ${theme.colors.primary} `;

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
    // Initialize editor tabs - set cover as default
    if (document.querySelector('.editor-tab[data-editortab="cover"]')) {
        switchEditorTab('cover');
    }

    // Wait a bit for DOM to be ready, then update previews
    setTimeout(() => {
        const coverTitle = document.getElementById('coverTitle');
        const coverShowBorder = document.getElementById('coverShowBorder');
        if (coverTitle && coverShowBorder) {
            updateCoverPreview();
        }

        if (backCoverText) {
            updateBackCoverPreview();
        }

        // Setup title sync and other enhancements *after* template has been applied
        setupCoverEnhancements();
    }, 100);

    initResizableSidebar();

    // Apply template styling if template is selected
    if (state.selectedTemplate && typeof applyTemplateToUI !== 'undefined') {
        applyTemplateToUI(state.selectedTemplate);
    }

    if (typeof designEditor !== 'undefined') {
        designEditor.init('designStudioCanvasContainer', {
            filterControlsId: 'designStudioFilterControls',
            toolControlsId: 'designStudioToolControls',
            brushControlsId: 'designStudioBrushControls'
        });
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
// DOMContentLoaded listener removed (duplicate of line 6731)

/* ADD TO BOTTOM */

// === REDESIGN COMPATIBILITY LAYER ===
// This ensures the new Rail Navigation updates visually when tabs are switched
const originalSwitchTab = window.switchTab;

window.switchTab = function (tabName) {
    // Call the original logic to handle content showing/hiding
    if (originalSwitchTab) originalSwitchTab(tabName);

    // Update the new visual rail items
    document.querySelectorAll('.rail-item').forEach(item => {
        // Remove active class from all
        item.classList.remove('active');
        // Add active class if this button matches the selected tab
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });
};

// Ensure layout locks logic if needed (optional)
// Initialize defaults when editor view is shown
if (document.getElementById('editorView')) {
    switchTab('picker');
}

// ============================================
// NEW COVER ENHANCEMENTS
// ============================================

function selectPhotoForCover() {
    // Delegate to the main robust handler to ensure state consistency
    selectCoverPhoto();
}

function setupCoverEnhancements() {
    // Subtitle
    const subInput = document.getElementById('coverSubtitle');
    if (subInput) {
        subInput.value = state.cover.subtitle || '';
        subInput.addEventListener('input', (e) => {
            state.cover.subtitle = e.target.value;
            renderCurrentPage();
        });
    }

    // Title Sync (Header <-> Sidebar <-> State) using Event Delegation
    // This allows it to work even if elements are re-rendered (e.g. by template application)
    document.addEventListener('input', (e) => {
        // Debug Title Sync
        if (e.target && (e.target.id === 'bookTitle' || e.target.id === 'coverTitle')) {
            console.log('Title Sync Input Detected:', e.target.id, e.target.value);
            const val = e.target.value;
            // Update State
            state.cover.title = val;
            state.activeProjectTitle = val;

            // Sync other inputs
            const otherId = e.target.id === 'bookTitle' ? 'coverTitle' : 'bookTitle';
            const other = document.getElementById(otherId);
            if (other && other.value !== val) other.value = val;

            // Update 3D Preview (debounced if needed, but direct is fine for now)
            renderCurrentPage();
        }
    });

    // Title Font
    const titleFontInput = document.getElementById('coverTitleFont');
    if (titleFontInput) {
        titleFontInput.value = state.cover.titleFont || 'Playfair Display';
        titleFontInput.addEventListener('change', (e) => {
            state.cover.titleFont = e.target.value;
            renderCurrentPage();
        });
    }

    // Subtitle Font
    const subFontInput = document.getElementById('coverSubtitleFont');
    if (subFontInput) {
        subFontInput.value = state.cover.subtitleFont || 'Playfair Display';
        subFontInput.addEventListener('change', (e) => {
            state.cover.subtitleFont = e.target.value;
            renderCurrentPage();
        });
    }

    // Back Cover Font
    const backFontInput = document.getElementById('backCoverFont');
    if (backFontInput) {
        backFontInput.value = state.backCover.textFont || 'Inter';
        backFontInput.addEventListener('change', (e) => {
            state.backCover.textFont = e.target.value;
            renderCurrentPage();
        });
    }
}

// Export for HTML access
window.selectPhotoForCover = selectPhotoForCover;
window.autoLayoutCurrentPage = autoLayoutCurrentPage;
window.renderDecorationSvg = renderDecorationSvg;
window.state = state;

// ============================================\n// ORDER PRINT FLOW (Classic Editor)\n// ============================================\nwindow.openBookpodOrderModal = async function() {\n    // 1. Open Delivery Config First\n    const action = await openBookpodDeliveryConfigModal();\n    if (action === 'cancel') return;\n\n    // 2. Capture draft details for the generation step\n    const draft = acBpReadOrderDraftFromModal();\n    if (draft) {\n        state.bookpodOrderDraft = draft;\n    }\n\n    // 3. Generate Book (PDF)\n    await generateBook();\n};\n\n// Initialize App\ndocument.addEventListener('DOMContentLoaded', initialize);

// Backup event listener for Auto Layout to ensure it's bound
document.addEventListener('DOMContentLoaded', () => {
    const autoLayoutBtn = document.getElementById('autoLayout');
    if (autoLayoutBtn) {
        autoLayoutBtn.addEventListener('click', (e) => {
            console.log("Auto Layout button clicked (via listener)");
            if (!autoLayoutBtn.onclick) {
                console.warn("Auto Layout onclick was missing, attaching manually.");
                autoLayoutCurrentPage();
            }
        });
    }
});

// ============================================
// DESIGN STUDIO MODAL LOGIC (ADDED)
// ============================================

window.openDesignStudio = function () {
    console.log("Opening Design Studio...");

    // 1. Check if we have a valid page and selected photo
    if (!state.pages || state.pages.length === 0) {
        showToast('Please create a page first.');
        return;
    }

    // Default to the first photo if none selected, or let user know
    const page = state.pages[state.currentPageIndex];
    let slotIndex = state.selectedPhotoSlot;

    // If the selected slot is text, open Typography Studio instead.
    if (slotIndex !== null && slotIndex !== undefined) {
        const candidate = page?.photos?.[slotIndex];
        if (candidate && candidate.type === 'text') {
            try { openTextStudio(slotIndex); } catch { /* ignore */ }
            return;
        }
    }

    // If no slot is strictly "selected" (clicked), try to find the first populated slot
    if (slotIndex === null || slotIndex === undefined) {
        // Find first slot with a photo
        const index = page.photos.findIndex(p => p && p.type !== 'text' && (p.editedData || p.thumbnailUrl || p.baseUrl));
        if (index >= 0) {
            slotIndex = index;
            // Select it visually
            state.selectedPhotoSlot = slotIndex;
            renderCurrentPage();
        } else {
            // If the page only has text, open Typography Studio on first text slot.
            const textIndex = page.photos.findIndex(p => p && p.type === 'text');
            if (textIndex >= 0) {
                state.selectedPhotoSlot = textIndex;
                renderCurrentPage();
                try { openTextStudio(textIndex); } catch { /* ignore */ }
                return;
            }
            showToast('Please select a photo to design.');
            return;
        }
    }

    const photo = page.photos[slotIndex];
    if (!photo || (!photo.editedData && !photo.thumbnailUrl && !photo.baseUrl)) {
        showToast('The selected slot is empty.');
        return;
    }

    // Ensure selection is set (used by frame/shape logic)
    state.selectedPhotoSlot = slotIndex;

    // 2. Open Modal
    const modal = document.getElementById('designStudioModal');
    if (modal) {
        modal.classList.add('active');

        // Render frame controls for this photo
        try { renderDesignStudioImageFrames(); } catch { /* ignore */ }

        // 3. Initialize Design Editor with the photo
        const src = photo.editedData || photo.thumbnailUrl || photo.baseUrl;

        // If we have a design editor instance
        if (window.designEditor) {
            // Re-init canvas in the new container if needed, or just load image
            // We need to ensure the canvas is inside #designCanvasContainer
            setTimeout(() => {
                window.designEditor.init('designStudioCanvasContainer', {
                    filterControlsId: 'designStudioFilterControls',
                    toolControlsId: 'designStudioToolControls',
                    brushControlsId: 'designStudioBrushControls'
                });
                window.designEditor.loadImage(src)
                    .then(() => {
                        console.log('Image loaded into Design Studio');
                    })
                    .catch(err => {
                        console.error('Failed to load image into studio:', err);
                        showToast('Could not load image for editing.');
                    });
            }, 100); // Small delay to ensure modal is visible/rendered
        } else {
            console.error("DesignEditor instance not found on window.");
        }
    } else {
        console.error("designStudioModal not found in DOM");
    }
};

window.applyDesignToPhoto = function () {
    console.log("Applying design to photo...");
    if (!window.designEditor || !window.designEditor.currentImage) {
        console.warn("Design editor not ready or no image");
        return;
    }

    // 1. Export High-Res Image from Canvas
    try {
        // Use exportImage which now handles aspect ratio (see design-editor.js fix)
        // format 'png', quality 1.0
        const dataUrl = window.designEditor.exportImage('png', 1.0);

        if (state.pages && state.pages[state.currentPageIndex] && state.selectedPhotoSlot !== null) {
            const page = state.pages[state.currentPageIndex];
            const photo = page.photos[state.selectedPhotoSlot];

            if (photo) {
                // Save as edited data
                photo.editedData = dataUrl;

                // 2. Update State & UI
                renderCurrentPage();

                // 3. Close Modal
                const modal = document.getElementById('designStudioModal');
                if (modal) modal.classList.remove('active');

                showToast('Design applied successfully!');

                // Persist draft locally so changes survive refresh, but don't force a Save Project prompt.
                try { if (typeof persistDraftToStorage === 'function') persistDraftToStorage('design_applied'); } catch { /* ignore */ }
            }
        }
    } catch (e) {
        console.error('Failed to export design:', e);
        showToast('Failed to save design. See console.');
    }
};

window.closeDesignStudio = function () {
    const modal = document.getElementById('designStudioModal');
    if (modal) modal.classList.remove('active');
};

// Expose for debugging / manual refresh
window.renderDesignStudioImageFrames = renderDesignStudioImageFrames;

// ============================================
// PDF DOWNLOAD HELPER (Global)
// ============================================
window.downloadPdfOnly = function () {
    console.log("[Global] downloadPdfOnly called.");
    if (window.pdfExport && state.pages) {
        window.pdfExport.generatePDF(state.pages, state.cover, state.assets);
    } else {
        console.error("PDF Export module or State not ready.");
        alert("Editor not ready for PDF export yet. Please wait.");
    }
};

// ============================================
// NANO BANANA MAGIC CREATE (Rebuild)
// ============================================

/**
 * Helper: Fetch photo URLs and convert to Base64
 */
async function fetchImagesAsBase64(photos) {
    const promises = photos.map(async (p) => {
        try {
            // Prefer thumbnail for speed/cors, fallback to full url
            const url = p.thumbnailUrl || p.baseUrl || p.url;
            if (!url) return null;

            const response = await fetch(url);
            const blob = await response.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve({ id: p.id, base64: reader.result.split(',')[1] }); // Remove data prefix
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn(`Failed to fetch image ${p.id}`, e);
            return null;
        }
    });

    const results = await Promise.all(promises);
    return results.filter(r => r !== null);
}

/**
 * Main Entry Point for Magic Create
 */
async function startMagicCreate() {
    console.log("Starting Nano Banana Magic Create...");

    // 1. Validation & Auto-Select for Dev
    if ((!state.selectedPhotos || state.selectedPhotos.length === 0) && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1")) {
        console.warn("Dev Mode: Auto-selecting photos for Magic Create...");
        // Use existing assets or default mocks
        if (state.assets && state.assets.photos && state.assets.photos.length >= 5) {
            state.selectedPhotos = state.assets.photos;
        } else {
            // Fallback mocks
            state.selectedPhotos = [
                { id: 'p1', url: 'https://images.unsplash.com/photo-1501854140884-074cf2cb3055?auto=format&fit=crop&w=500&q=60' },
                { id: 'p2', url: 'https://images.unsplash.com/photo-1472214103451-9374bd1c798e?auto=format&fit=crop&w=500&q=60' },
                { id: 'p3', url: 'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=500&q=60' },
                { id: 'p4', url: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=500&q=60' },
                { id: 'p5', url: 'https://images.unsplash.com/photo-1426604966848-d7adac402bff?auto=format&fit=crop&w=500&q=60' }
            ];
        }
    }

    if (!state.selectedPhotos || state.selectedPhotos.length < 5) {
        alert("Please select at least 5 photos first.");
        return;
    }

    const btn = document.getElementById('btn-magic-create');
    const originalText = btn ? btn.innerHTML : 'Magic Create';
    if (btn) {
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Analyzing...';
        btn.disabled = true;
    }

    // 2. Init Service
    if (window.geminiService && !window.geminiService.genAI) {
        const key = "AIzaSyCw0jvaapxUWW7zMWSTIzY2cNQf-0GkfPk"; // Hardcoded from ai-editor/app.js
        window.geminiService.init(key);
    }

    if (!window.geminiService || !window.geminiService.genAI) {
        alert("AI Service not available. Please refresh.");
        if (btn) { btn.innerHTML = originalText; btn.disabled = false; }
        return;
    }

    try {
        // 3. Prepare Images (Vision)
        // Limit to 16 to respect quotas/latency
        const subset = state.selectedPhotos.slice(0, 16);
        const images = await fetchImagesAsBase64(subset);

        if (images.length === 0) throw new Error("Could not load any photo data.");

        // 4. Analyze (Nano Banana Vibe Check)
        if (btn) btn.innerHTML = '<i class="fa-solid fa-brain fa-bounce"></i> Dreaming...';

        const analysisPrompt = `
            You are Nano Banana, an elite, avant-garde Design Intelligence.
            Your mission is to curate a high-end photo book from a set of user photos.
            
            I have provided ${images.length} photos.
            
            YOUR CREATIVE PROCESS:
            1. **Vibe Check**: Analyze the visual content, colors, mood, and setting of the actual photos. What is the "soul" of this collection?
            2. **Visual Clustering**: Group these photos into logical spreads (2-4 photos per spread) based on their visual similarity and narrative flow.
            3. **Design Direction**:
               - Create a HIGHLY SPECIFIC, ARTISTIC prompt for a background texture that matches the vibe. Do NOT say "generic gradient". Say "a soft watercolor wash in indigo and sand, wet-on-wet technique, paper texture" or "cyberpunk neon grid with bokeh, dark mode".
               - The background prompt must be suitable for an image generator.
               - Choose a Frame Style from: "frame-classic-gold", "frame-modern-bold", "frame-elegant-serif", "frame-botanical-leaf", "frame-geometric-modern".

            Return a strict JSON object:
            {
                "bookTitle": "Creative Title Based on Content",
                "visualStyleDescription": "Your detailed background texture prompt",
                "suggestedFrameId": "frame-modern-bold",
                "spreads": [
                    { 
                        "photoIndices": [0, 1, 2],
                        "caption": "Creative caption based on what is clearly visible"
                    }
                ]
            }
        `;

        const analysis = await window.geminiService.analyzePhotos(analysisPrompt, images.map(i => i.base64));
        console.log("Nano Banana Analysis:", analysis);

        // 5. Generate Asset (Creation)
        if (btn) btn.innerHTML = '<i class="fa-solid fa-paintbrush fa-flip"></i> Painting...';

        const bgPrompt = `Texture for photo book background. ${analysis.visualStyleDescription}. High resolution, seamless pattern, artistic style, no text, no realistic photos, just abstract texture.`;
        const bgUrl = await window.geminiService.generateImage(bgPrompt);

        // 6. Apply to Book
        if (btn) btn.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i> Assembling...';

        // Add Background Asset
        // Ensure backgrounds array exists
        if (!state.assets.backgrounds) state.assets.backgrounds = [];

        const bgAsset = {
            id: 'ai_bg_' + Date.now(),
            url: bgUrl,
            name: 'Nano Banana Custom',
            generated: true,
            category: 'AI'
        };
        state.assets.backgrounds.push(bgAsset);

        // Cover Update
        if (state.cover) {
            state.cover.title = analysis.bookTitle || state.cover.title;
        }

        // Create Spreads
        if (analysis.spreads) {
            analysis.spreads.forEach(spread => {
                const pagePhotos = spread.photoIndices.map(idx => subset[idx]).filter(Boolean);
                if (pagePhotos.length === 0) return;

                // Add Page
                // We use helper if available or manual
                // Reuse addPage() logic usually available in global scope if app.js exposes it
                // app.js has window.addPage line 8303 (I didn't verify line number but usually yes)
                // Let's manually push to state to be safe

                const newPage = {
                    id: 'page_' + Date.now() + Math.random(),
                    layout: { slots: pagePhotos.length, name: `Collage (${pagePhotos.length})` }, // Simple mock layout object
                    photos: Array(pagePhotos.length).fill(null).map((_, i) => ({
                        ...pagePhotos[i], // Copy photo data
                        edited: false
                    })),
                    background: { type: 'image', url: bgUrl, color: '#ffffff', opacity: 1 },
                    frameId: analysis.suggestedFrameId,
                    elements: [] // Text elements
                };

                // Add Caption if present
                if (spread.caption) {
                    newPage.elements.push({
                        id: 'txt_' + Date.now(),
                        type: 'text',
                        content: spread.caption,
                        x: 10, y: 90, width: 80, fontSize: 14,
                        fontFamily: 'Playfair Display', color: '#333333', align: 'center',
                        rotation: 0
                    });
                }

                state.pages.push(newPage);
            });

            // Trigger Render
            if (typeof renderPageThumbnails === 'function') renderPageThumbnails();
            if (typeof updatePageIndicator === 'function') updatePageIndicator();

            state.currentPageIndex = Math.max(0, state.pages.length - analysis.spreads.length);
            if (typeof renderCurrentPage === 'function') renderCurrentPage();
        }

        alert("✨ Magic Create Complete! ✨\nNano Banana has designed your book.");

    } catch (e) {
        console.error("Magic Create Error:", e);
        alert("Magic Create encountered an anomaly: " + e.message);
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
    }
}

// Bind Global Listener
document.addEventListener('DOMContentLoaded', () => {
    // Retry finding button in case of dynamic injection
    const interval = setInterval(() => {
        const btn = document.getElementById('btn-magic-create');
        if (btn) {
            // Remove old listeners by cloning
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            newBtn.addEventListener('click', startMagicCreate);
            console.log("Nano Banana Magic Create Button Activated 🍌");
            clearInterval(interval);
        }
    }, 1000);

    // Clear interval after 10s
    setTimeout(() => clearInterval(interval), 10000);
});
