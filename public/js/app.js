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
        backgroundColor: '#1a1a2e'
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
    // Default background for newly-created pages (can be set before any pages exist)
    defaultPageBackgroundColor: null,
    user: null,
    currentTheme: 'classic'
};

// ============================================
// THEME & DESIGN FUNCTIONS
// ============================================
// Apply template to the app
function applyTemplate(template) {
    if (!template) return;

    state.selectedTemplate = template;
    state.currentTheme = template.id;

    // Apply template styling to the entire editor UI
    applyTemplateToUI(template);

    // Apply template colors to cover
    if (state.cover && template.cover) {
        state.cover.backgroundColor = template.cover.backgroundColor;
        state.cover.titleColor = template.cover.titleColor;
        state.cover.titleFont = template.cover.titleFont;
        state.cover.titleSize = template.cover.titleSize;
        if (template.cover.subtitleColor) {
            // Store for subtitle if needed
        }
        updateCoverPreview();
    }

    // Apply template to all existing pages
    state.pages.forEach(page => {
        page.backgroundColor = template.colors.pageBackground;
        page.template = template.id;
        page.templateData = template;
        page.themeColors = template.colors;
        page.themeIllustrations = template.illustrations;
        page.themeDecorations = template.decorations;
    });

    // Re-render current page
    if (state.pages.length > 0) {
        renderCurrentPage();
    }

    // Update cover preview
    updateCoverPreview();
}

// Apply template styling to the entire editor UI
function applyTemplateToUI(template) {
    if (!template) return;

    const root = document.documentElement;
    const editorView = document.getElementById('editorView');

    if (!editorView) return;

    // Apply template colors as CSS custom properties to the editor view
    editorView.style.setProperty('--template-bg', template.colors.pageBackground || '#FFFFFF');
    editorView.style.setProperty('--template-surface', template.colors.pageBackground || '#FFFFFF');
    editorView.style.setProperty('--template-primary', template.colors.textColor || template.colors.accentColor || '#1E3932');
    editorView.style.setProperty('--template-accent', template.colors.accentColor || '#D4AF37');
    editorView.style.setProperty('--template-text', template.colors.textColor || '#333333');
    editorView.style.setProperty('--template-text-light', template.colors.captionColor || '#666666');
    editorView.style.setProperty('--template-border', template.colors.borderColor || '#E0E0E0');

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

    // Style input fields
    const inputs = editorView.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.style.borderColor = template.colors.borderColor || '#E0E0E0';
        input.style.color = template.colors.textColor || '#333333';
    });

    // Style tab content areas
    const tabContents = editorView.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.style.color = template.colors.textColor || '#333333';
    });

    // Update page preview background
    const pagePreview = document.getElementById('pagePreview');
    if (pagePreview) {
        pagePreview.style.backgroundColor = template.colors.pageBackground || '#FFFFFF';
    }

    // Update template indicator in header
    const templateIndicator = document.getElementById('selectedTemplateName');
    if (templateIndicator) {
        templateIndicator.textContent = `Template: ${template.name}`;
        templateIndicator.style.color = template.colors.captionColor || template.colors.textColor || '#666666';
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
            } else {
                console.log("User not signed in, showing login screen");
                // Show login screen as overlay
                document.getElementById('loginScreen').style.display = 'flex';
            }
        });

        // Show template gallery if no template selected
        if (!state.selectedTemplate) {
            const galleryView = document.getElementById('templateGalleryView');
            const editorView = document.getElementById('editorView');
            if (galleryView) galleryView.style.display = 'block';
            if (editorView) editorView.style.display = 'none';
        } else {
            const galleryView = document.getElementById('templateGalleryView');
            const editorView = document.getElementById('editorView');
            if (galleryView) galleryView.style.display = 'none';
            if (editorView) editorView.style.display = 'block';
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

            updateSelectedPhotosUI();
            switchTab('selected');

            if (result.needsThumbnails) {
                await loadThumbnailsInBatches(result.photos);
            }

            document.getElementById('picker-message').innerHTML =
                `<span style="color:green; font-weight:bold;">✅ Added ${result.count} photos!</span>`;
            resetPickerButton();
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

    showThumbnailProgress(0, totalPhotos);

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

                updateSelectedPhotosUI();
            }

            processed += batch.length;
            showThumbnailProgress(processed, totalPhotos);

        } catch (e) {
            console.error("Batch load error:", e);
            processed += batch.length;
            showThumbnailProgress(processed, totalPhotos);
        }
    }

    hideThumbnailProgress();
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
    count.textContent = state.selectedPhotos.length;

    if (state.selectedPhotos.length === 0) {
        list.innerHTML = '<div class="empty-state">No photos selected</div>';
        return;
    }

    list.innerHTML = state.selectedPhotos.map((photo, index) => {
        const thumbUrl = photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:') ? photo.thumbnailUrl : null;
        return `<div class="selected-photo-item" draggable="true" data-index="${index}">
      ${thumbUrl
                ? `<img src="${thumbUrl}" alt="Photo ${index + 1}">`
                : `<div class="thumbnail-placeholder">${index + 1}</div>`
            }
      <button class="remove-btn" onclick="removeSelectedPhoto(${index})">&times;</button>
      <button class="edit-btn" onclick="openDesignEditor(${index})" title="Edit Photo">✏️</button>
    </div>`;
    }).join('');

    setupDragAndDrop();
}

function removeSelectedPhoto(index) {
    state.selectedPhotos.splice(index, 1);
    updateSelectedPhotosUI();
}

function clearSelectedPhotos() {
    if (confirm('Clear all selected photos?')) {
        state.selectedPhotos = [];
        updateSelectedPhotosUI();
    }
}

function shuffleSelectedPhotos() {
    state.selectedPhotos = state.selectedPhotos.sort(() => Math.random() - 0.5);
    updateSelectedPhotosUI();
}

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
    const title = document.getElementById('coverTitle').value;
    const titleSize = document.getElementById('coverTitleSize').value;
    const titleColor = document.getElementById('coverTitleColor').value;
    const titleFont = document.getElementById('coverTitleFont').value;
    const subtitle = document.getElementById('coverSubtitle').value;
    const bgColor = document.getElementById('coverBgColor').value;

    state.cover.title = title;
    state.cover.titleSize = parseInt(titleSize);
    state.cover.titleColor = titleColor;
    state.cover.titleFont = titleFont;
    state.cover.subtitle = subtitle;
    state.cover.backgroundColor = bgColor;

    document.getElementById('coverTitleSizeVal').textContent = titleSize + 'px';

    // Update title preview with styling
    const titlePreview = document.getElementById('coverTitlePreview');
    titlePreview.textContent = title;
    titlePreview.style.fontSize = titleSize + 'px';
    titlePreview.style.color = titleColor;
    titlePreview.style.fontFamily = titleFont;

    // Update subtitle preview
    document.getElementById('coverSubtitlePreview').textContent = subtitle;

    // Update cover background and decorative border color
    const coverPreview = document.getElementById('coverPreview');
    coverPreview.style.backgroundColor = bgColor;
    coverPreview.style.backgroundImage = 'none'; // CRITICAL: Clear any texture/gradient
    coverPreview.style.color = titleColor; // For the decorative border

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
function updateBackCoverPreview() {
    const text = document.getElementById('backCoverText').value;
    const bgColor = document.getElementById('backCoverBgColor').value;

    state.backCover.text = text;
    state.backCover.backgroundColor = bgColor;

    document.getElementById('backCoverTextPreview').textContent = text;
    document.getElementById('backCoverPreview').style.backgroundColor = bgColor;
}

// ============================================
// PAGE EDITOR
// ============================================
function autoArrange() {
    if (state.selectedPhotos.length === 0) {
        alert('Please select some photos first');
        return;
    }

    const layoutPref = document.getElementById('autoLayout').value;
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
            caption: '',
            theme: state.currentTheme || 'classic',
            template: template ? template.id : null,
            templateData: template || null,
            themeColors: template ? template.colors : currentTheme.colors,
            themeIllustrations: template ? template.illustrations : currentTheme.illustrations,
            themeDecorations: template ? template.decorations : currentTheme.decorations,
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
        caption: '',
        theme: state.currentTheme || 'classic',
        template: template ? template.id : null,
        templateData: template || null,
        themeColors: template ? template.colors : currentTheme.colors,
        themeIllustrations: template ? template.illustrations : currentTheme.illustrations,
        themeDecorations: template ? template.decorations : currentTheme.decorations,
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
    if (state.currentPageIndex > 0) {
        state.currentPageIndex--;
        renderCurrentPage();
        updatePageIndicator();
        highlightCurrentThumbnail();
    }
}

function nextPage() {
    if (state.currentPageIndex < state.pages.length - 1) {
        state.currentPageIndex++;
        renderCurrentPage();
        updatePageIndicator();
        highlightCurrentThumbnail();
    }
}

function goToPage(index) {
    state.currentPageIndex = index;
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

function renderCurrentPage() {
    const preview = document.getElementById('pagePreview');
    if (state.pages.length === 0) {
        preview.innerHTML = '<div class="empty-state">No pages yet. Select photos and click "Auto-Arrange"</div>';
        return;
    }

    const page = state.pages[state.currentPageIndex];
    const layoutClass = `layout-${page.layout}`;
    const slots = state.config.LAYOUTS[page.layout].slots;

    // Get template or theme for this page
    const template = page.templateData || state.selectedTemplate;
    const theme = template || (page.theme ? state.config.THEMES[page.theme] : null) || state.config.THEMES[state.currentTheme] || state.config.THEMES['classic'];

    // Apply background color from template/theme
    const bgColor = page.backgroundColor || (template ? template.colors.pageBackground : theme.colors.bg);
    preview.style.backgroundColor = bgColor;
    preview.style.backgroundImage = 'none'; // CRITICAL: Clear any texture/gradient

    console.log(`Rendering page ${state.currentPageIndex + 1} with background: ${bgColor}`);

    let slotsHtml = '';
    for (let i = 0; i < slots; i++) {
        const photo = page.photos[i];
        const hasPhoto = photo && photo.thumbnailUrl && photo.thumbnailUrl.startsWith('data:');
        const hasPhotoData = photo && (photo.baseUrl || photo.id);
        const isSelected = state.selectedPhotoSlot === i;
        const alignment = photo?.alignment || 'center';

        slotsHtml += `
      <div class="layout-slot slot-${i} ${hasPhotoData ? 'has-photo' : ''} ${isSelected ? 'selected' : ''}" 
           data-slot-index="${i}"
           draggable="${hasPhotoData ? 'true' : 'false'}">
        ${hasPhoto
                ? `<img src="${photo.thumbnailUrl}" alt="" draggable="false">`
                : (hasPhotoData
                    ? `<div class="thumbnail-placeholder">Photo ${i + 1}</div>`
                    : `<div class="empty-slot" onclick="selectPhotoForSlot(${i})">Click to add photo</div>`
                )
            }
        <span class="slot-number">${i + 1}</span>
        ${hasPhotoData ? `
          <button class="edit-photo-btn" onclick="selectPhotoSlot(${i}); event.stopPropagation();" title="Edit this photo">
            ✏️ Edit
          </button>
          <span class="alignment-indicator" title="Alignment: ${alignment}">${alignment === 'left' ? '⬅' : alignment === 'right' ? '➡' : '⬌'}</span>
        ` : ''}
      </div>
    `;
    }

    // Get template/theme decorations (already defined above)
    const decorations = page.themeDecorations || (template ? template.decorations : theme.decorations) || [];
    const illustrations = page.themeIllustrations || (template ? template.illustrations : theme.illustrations) || {};

    // Create decorative elements
    let decorationsHtml = '';
    if (decorations.length > 0 && illustrations.pattern !== 'none') {
        decorationsHtml = `
            <div class="page-decorations" style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1;">
                ${decorations.map((dec, i) => {
            const positions = [
                { top: '10%', left: '5%', rotate: '0deg' },
                { top: '10%', right: '5%', rotate: '90deg' },
                { bottom: '10%', left: '5%', rotate: '-90deg' },
                { bottom: '10%', right: '5%', rotate: '180deg' }
            ];
            const pos = positions[i % positions.length];
            const primaryColor = template ? template.colors.primary : theme.colors.primary;
            return `<div style="position: absolute; ${pos.top ? `top: ${pos.top};` : ''} ${pos.left ? `left: ${pos.left};` : ''} ${pos.right ? `right: ${pos.right};` : ''} ${pos.bottom ? `bottom: ${pos.bottom};` : ''} font-size: 2rem; opacity: 0.15; color: ${primaryColor}; transform: rotate(${pos.rotate});">${dec}</div>`;
        }).join('')}
            </div>
        `;
    }

    preview.innerHTML = `
    <div class="layout-grid ${layoutClass}" id="pageLayoutGrid" style="position: relative; z-index: 2;">
      ${slotsHtml}
    </div>
    ${decorationsHtml}
    ${page.caption ? `<div style="text-align: center; font-style: italic; margin-top: 0.5rem; font-size: 12px; color: ${template ? template.colors.captionColor || template.colors.text : theme.colors.text};">${escapeHtml(page.caption)}</div>` : ''}
  `;
    
    // Ensure background color persists after innerHTML update
    preview.style.backgroundColor = bgColor;
    preview.style.backgroundImage = 'none';

    // Setup drag and drop for photo slots
    setupPhotoDragAndDrop();

    // Update alignment controls
    updateAlignmentControls();

    document.getElementById('pageLayout').value = page.layout;
    document.getElementById('pageBgColor').value = page.backgroundColor || bgColor;
    document.getElementById('pageCaption').value = page.caption || '';
    document.getElementById('showPageNumber').checked = page.showPageNumber;

    if (page.photoBorder) {
        document.getElementById('pageBorder').checked = true;
        document.getElementById('pageBorderColor').value = page.photoBorder.color;
        document.getElementById('pageBorderWeight').value = page.photoBorder.weight;
    } else {
        document.getElementById('pageBorder').checked = false;
    }
}

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
    const pagePreview = document.getElementById('pagePreview');
    if (pagePreview) {
        pagePreview.style.backgroundColor = bgColor;
        pagePreview.style.backgroundImage = 'none'; // CRITICAL: Override any texture/gradient
    }

    // Also update the layout grid background
    const layoutGrid = document.getElementById('pageLayoutGrid');
    if (layoutGrid) {
        // Also clear it on the parent in case it was applied there
        if (layoutGrid.parentElement) {
            layoutGrid.parentElement.style.backgroundColor = bgColor;
            layoutGrid.parentElement.style.backgroundImage = 'none';
        }
    }

    console.log(`Updated page ${state.currentPageIndex + 1} background to: ${bgColor}`);
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
        title: projectName,
        pageFormat: document.getElementById('pageFormat').value,
        cover: state.cover,
        backCover: state.backCover,
        pages: state.pages,
        selectedPhotos: state.selectedPhotos,
        template: state.selectedTemplate ? state.selectedTemplate.id : state.currentTheme,
        currentTheme: state.currentTheme,
        savedAt: new Date().toISOString()
    };

    console.log("Saving project data:", projectData);
    showProgress('Saving project...');

    try {
        const result = await callFunction('saveProject', { projectData });
        hideProgress();
        if (result.success) {
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

async function loadProject(projectId) {
    closeLoadModal();
    showProgress('Loading project...', 'Fetching project data...', 10);

    try {
        const result = await callFunction('loadProject', { projectId });
        console.log("Loaded project result:", result);

        if (result.success && result.data) {
            const data = result.data;

            document.getElementById('bookTitle').value = data.title || 'My Photo Book';
            document.getElementById('pageFormat').value = data.pageFormat || 'square-8x8';

            // Restore template if saved
            if (data.template && PHOTO_BOOK_TEMPLATES && PHOTO_BOOK_TEMPLATES[data.template]) {
                state.selectedTemplate = PHOTO_BOOK_TEMPLATES[data.template];
                state.currentTheme = data.template;
                applyTemplate(state.selectedTemplate);
            }

            state.cover = data.cover || state.cover;
            state.backCover = data.backCover || state.backCover;
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

            // --- HYDRATION STEP: Fetch fresh URLs for all photos ---
            updateProgress('Restoring photos...', 'Refreshing photo links from Google...', 40);

            const photoIds = new Set();

            // Collect page photo IDs
            state.pages.forEach(page => {
                if (page.photos) {
                    page.photos.forEach(p => {
                        if (p && p.id) photoIds.add(p.id);
                    });
                }
            });

            // Collect cover photo ID
            if (state.cover.photo && state.cover.photo.id) {
                photoIds.add(state.cover.photo.id);
            }

            if (photoIds.size > 0) {
                console.log(`Hydrating ${photoIds.size} photos...`);
                try {
                    const hydrationResult = await callFunction('fetchThumbnailBatch', {
                        photoIds: Array.from(photoIds)
                    });

                    if (hydrationResult.success && hydrationResult.photos) {
                        const urlMap = hydrationResult.photos; // map of id -> baseUrl

                        // Update pages
                        state.pages.forEach(page => {
                            if (page.photos) {
                                page.photos.forEach(p => {
                                    if (p && p.id && urlMap[p.id]) {
                                        p.baseUrl = urlMap[p.id];
                                        p.thumbnailUrl = `${urlMap[p.id]}=w400-h400-c`;
                                        p.fullUrl = `${urlMap[p.id]}=d`;
                                    }
                                });
                            }
                        });

                        // Update cover
                        if (state.cover.photo && state.cover.photo.id && urlMap[state.cover.photo.id]) {
                            const p = state.cover.photo;
                            p.baseUrl = urlMap[p.id];
                            p.thumbnailUrl = `${urlMap[p.id]}=w400-h400-c`;
                            p.fullUrl = `${urlMap[p.id]}=d`;
                        }
                    }
                } catch (e) {
                    console.warn("Failed to hydrate photos:", e);
                    // Continue anyway, maybe some URLs invoke 403 but UI should load
                }
            }
            // -------------------------------------------------------

            updateSelectedPhotosUI();
            updateCoverFromState();
            updateBackCoverPreview();
            renderPageThumbnails();
            renderCurrentPage();
            updatePageIndicator();

            hideProgress();
            // alert(`Project "${data.title || 'Untitled'}" loaded successfully!`);
        } else {
            throw new Error(result.error || 'No data returned');
        }
    } catch (error) {
        hideProgress();
        showError('Failed to load project: ' + error.message);
    }
}

function updateCoverFromState() {
    document.getElementById('coverTitle').value = state.cover.title || 'My Photo Book';
    document.getElementById('coverTitleSize').value = state.cover.titleSize || 36;
    document.getElementById('coverTitleSizeVal').textContent = (state.cover.titleSize || 36) + 'px';
    document.getElementById('coverTitleColor').value = state.cover.titleColor || '#ffffff';
    document.getElementById('coverTitleFont').value = state.cover.titleFont || 'Playfair Display';
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
// BOOK GENERATION
// ============================================
function collectBookData() {
    // Get cover photo - make sure it's a separate object, not referenced from pages
    let coverPhoto = null;
    if (state.cover.photo) {
        // Create a copy to avoid reference issues
        coverPhoto = {
            id: state.cover.photo.id,
            baseUrl: state.cover.photo.baseUrl,
            fullUrl: state.cover.photo.fullUrl,
            thumbnailUrl: state.cover.photo.thumbnailUrl,
            editedImageData: state.cover.photo.editedImageData,
            editedData: state.cover.photo.editedData
        };
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
            photos: filteredPhotos
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
        backCover: state.backCover,
        theme: state.currentTheme || 'classic',
        template: templateData ? templateData.id : (state.currentTheme || null),
        templateData: templateData || null,
        themeData: templateData ? null : currentTheme,
        pages: filteredPages
    };
}

async function generateBook() {
    try {
        console.log('=== generateBook START ===');

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
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP ${response.status}`);
        }

        updateProgress('Finalizing...', 'Almost done! Preparing your presentation...', 80);

        const result = await response.json();
        console.log('Server response:', result);

        updateProgress('Complete!', 'Your photo book is ready!', 100);

        setTimeout(() => {
            hideProgress();

            if (result && result.presentationId) {
                state.generatedPresentationId = result.presentationId;

                document.getElementById('viewPresentationLink').href = result.presentationUrl;
                document.getElementById('resultModal').classList.add('active');

                if (result.pdfUrl) {
                    document.getElementById('pdfResult').style.display = 'block';
                    document.getElementById('downloadPdfLink').href = result.pdfUrl;
                }
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
}

async function exportToPdf() {
    if (!state.generatedPresentationId) {
        alert('Please generate the book first');
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
async function searchDesignInspiration() {
    const searchInput = document.getElementById('designSearchInput');
    const query = searchInput.value.trim();
    const statusDiv = document.getElementById('designSearchStatus');

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

        // Show modal
        document.getElementById('designInspirationModal').classList.add('active');
        document.getElementById('designInspirationContent').innerHTML = '<div class="loading">Searching for design inspiration...</div>';

        // Call backend function
        const result = await callFunction('searchDesignInspiration', {
            query: query,
            count: 10
        });

        if (result.success) {
            displayDesignInspirationResults(result);
            statusDiv.textContent = `Found ${result.total} results`;
            statusDiv.style.color = 'var(--color-success)';
        } else {
            throw new Error(result.error || 'Search failed');
        }

    } catch (error) {
        console.error('Design inspiration search error:', error);
        statusDiv.textContent = 'Search failed: ' + error.message;
        statusDiv.style.color = 'var(--color-error)';
        document.getElementById('designInspirationContent').innerHTML =
            `<div style="padding: 2rem; text-align: center; color: var(--color-error);">
                <p>Failed to search: ${error.message}</p>
                <button class="btn btn-secondary" onclick="closeDesignInspirationModal()">Close</button>
            </div>`;
    }
}

function displayDesignInspirationResults(result) {
    const content = document.getElementById('designInspirationContent');

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
// INITIALIZATION ON LOAD
// ============================================
document.addEventListener('DOMContentLoaded', initialize);
