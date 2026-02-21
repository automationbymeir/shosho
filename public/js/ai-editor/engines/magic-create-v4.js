/**
 * Magic Create v4 - Enhanced with Trash Detection & Review Flow
 * 
 * Features:
 * - Photo quality analysis (blur, dark, duplicate)
 * - Pre-creation review dialog
 * - AI-generated themed backgrounds
 * - Decorative text elements
 */

class MagicCreateV4 {
    constructor(baseUrl = 'https://us-central1-shoso-photobook.cloudfunctions.net') {
        this.baseUrl = baseUrl;
        this.injectStyles();
    }

    /**
     * Main entry point
     */
    async run(prompt, photos, options = {}) {
        console.log('[MagicCreate v4] Starting with', photos.length, 'photos');
        console.log('[MagicCreate v4] Prompt:', prompt);

        try {
            // Step 1: Analyze photos for quality issues
            this.showProgress('Analyzing photos...');
            const analysis = await this.analyzePhotos(photos);
            this.hideProgress();

            // Step 2: Show review dialog if trash found
            if (analysis.trash_photos && analysis.trash_photos.length > 0) {
                return new Promise((resolve, reject) => {
                    this.showReviewDialog(analysis, async (approvedIds) => {
                        try {
                            const result = await this.createWithApprovedPhotos(
                                prompt, approvedIds, photos, options
                            );
                            resolve(result);
                        } catch (error) {
                            reject(error);
                        }
                    }, () => reject(new Error('Cancelled by user')));
                });
            } else {
                // No trash, proceed directly
                return await this.createWithApprovedPhotos(
                    prompt,
                    photos.map(p => p.id),
                    photos,
                    options
                );
            }

        } catch (error) {
            this.hideProgress();
            console.error('[MagicCreate v4] Error:', error);
            throw error;
        }
    }

    /**
     * Analyze photos for quality issues
     */
    async analyzePhotos(photos) {
        const BATCH_SIZE = 10;
        const results = { valid_photos: [], trash_photos: [], analysis_available: true };

        console.log(`[MagicCreate v4] Analyzing ${photos.length} photos in batches of ${BATCH_SIZE}...`);

        for (let i = 0; i < photos.length; i += BATCH_SIZE) {
            const batch = photos.slice(i, i + BATCH_SIZE);
            try {
                // Optimization: Use thumbnail if available, or strip large base64
                const payloadPhotos = batch.map(p => {
                    const isBase64 = p.url && p.url.startsWith('data:image');
                    const isHuge = isBase64 && p.url.length > 5000;

                    // Prefer Thumbnail > Raw URL > Null (if huge base64)
                    let urlToSend = p.thumbnailUrl || (p.rawBaseUrl ? p.rawBaseUrl + '=w800-h800' : null);

                    if (!urlToSend && !isHuge) {
                        urlToSend = p.url;
                    }

                    return {
                        id: p.id,
                        url: urlToSend, // Might be null if it was huge base64
                        thumbnailUrl: p.thumbnailUrl,
                        rawBaseUrl: p.rawBaseUrl,
                        name: p.name,
                        width: p.width,
                        height: p.height
                    };
                });

                const response = await fetch(`${this.baseUrl}/magic/analyze-photos`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ photos: payloadPhotos })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.valid_photos) results.valid_photos.push(...data.valid_photos);
                    if (data.trash_photos) results.trash_photos.push(...data.trash_photos);
                } else {
                    console.warn(`[MagicCreate v4] Batch ${i / BATCH_SIZE + 1} failed: ${response.status}`);
                    // Fallback: assume all valid
                    results.valid_photos.push(...batch);
                }
            } catch (error) {
                console.warn(`[MagicCreate v4] Batch ${i / BATCH_SIZE + 1} analysis error:`, error);
                results.valid_photos.push(...batch);
            }
        }

        return results;
    }

    /**
     * Create album with approved photos
     */
    async createWithApprovedPhotos(prompt, approvedIds, allPhotos, options) {
        this.showProgress('Creating your album...');

        const approvedPhotos = allPhotos.filter(p => approvedIds.includes(p.id));
        console.log('[MagicCreate v4] Creating with', approvedPhotos.length, 'approved photos');

        try {
            const response = await fetch(`${this.baseUrl}/magic/create`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user_id: options.userId || 'web_user',
                    prompt: prompt,
                    photos: approvedPhotos.map((p, i) => {
                        // CRITICAL FIX: STRIP ALL IMAGE DATA.
                        // The backend 'create' endpoint (aiAutoDesign) ONLY uses metadata.
                        // It does NOT need the image content.

                        return {
                            id: p.id,
                            // Send NO image data to save bandwidth and avoid string length errors
                            url: null,
                            thumbnailUrl: null,
                            rawBaseUrl: null,

                            name: p.name,
                            width: p.width,
                            height: p.height,
                            date: p.date,
                            location: p.location,
                            index: i // Ensure strictly sequential index for AI context
                        };
                    }),
                    max_pages: options.maxPages || 20,
                    photos_per_page: options.photosPerPage || 4,
                    include_ai_backgrounds: options.includeAiBackgrounds !== false,
                    include_decorative_text: options.includeDecorativeText !== false
                })
            });

            this.hideProgress();

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || `Failed: ${response.status}`);
            }

            const result = await response.json();
            console.log('[MagicCreate v4] Created', result.pages?.length, 'pages');

            // Load into editor
            this.loadIntoEditor(result);

            return result;

        } catch (error) {
            this.hideProgress();
            console.error('[MagicCreate v4] Create error:', error);
            throw error;
        }
    }

    /**
     * Show review dialog for trash photos
     */
    showReviewDialog(analysis, onConfirm, onCancel) {
        const { valid_photos, trash_photos } = analysis;

        const modal = document.createElement('div');
        modal.className = 'mc4-modal';
        modal.innerHTML = `
            <div class="mc4-modal-content">
                <div class="mc4-header">
                    <h2>📸 Photo Quality Check</h2>
                    <p>We found <strong>${trash_photos.length}</strong> photo(s) that might not look great:</p>
                </div>
                
                <div class="mc4-trash-grid">
                    ${trash_photos.map(photo => `
                        <div class="mc4-trash-item" data-id="${photo.id}">
                            <div class="mc4-thumb">
                                <img src="${photo.url}" alt="Photo" onerror="this.src='data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><rect fill=%22%23333%22 width=%22100%22 height=%22100%22/><text x=%2250%22 y=%2250%22 fill=%22%23666%22 text-anchor=%22middle%22 dy=%22.3em%22>?</text></svg>'">
                                <span class="mc4-badge mc4-badge-${photo.reason}">${this.formatReason(photo.reason)}</span>
                            </div>
                            <div class="mc4-details">
                                <p>${photo.details}</p>
                                <label class="mc4-keep">
                                    <input type="checkbox" data-photo-id="${photo.id}">
                                    <span>Keep anyway</span>
                                </label>
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="mc4-summary">
                    <span class="mc4-count">
                        <strong id="mc4-photo-count">${valid_photos.length}</strong> photos will be used
                    </span>
                </div>
                
                <div class="mc4-actions">
                    <button class="mc4-btn mc4-btn-cancel" id="mc4-cancel">Cancel</button>
                    <button class="mc4-btn mc4-btn-confirm" id="mc4-confirm">
                        ✨ Create Album
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Update count when checkboxes change
        const updateCount = () => {
            const kept = modal.querySelectorAll('input[type="checkbox"]:checked').length;
            modal.querySelector('#mc4-photo-count').textContent = valid_photos.length + kept;
        };

        modal.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', updateCount);
        });

        // Cancel
        modal.querySelector('#mc4-cancel').addEventListener('click', () => {
            modal.remove();
            onCancel();
        });

        // Confirm
        modal.querySelector('#mc4-confirm').addEventListener('click', () => {
            const validIds = valid_photos.map(p => p.id);
            const keptIds = Array.from(modal.querySelectorAll('input:checked'))
                .map(cb => cb.dataset.photoId);

            modal.remove();
            onConfirm([...validIds, ...keptIds]);
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
                onCancel();
            }
        });
    }

    formatReason(reason) {
        const labels = {
            'blurry': '🔍 Blurry',
            'too_dark': '🌑 Too Dark',
            'too_bright': '☀️ Overexposed',
            'duplicate': '👯 Duplicate',
            'low_quality': '⚠️ Low Quality'
        };
        return labels[reason] || reason;
    }

    /**
     * Load result into editor
     */
    loadIntoEditor(result) {
        // Apply theme CSS variables
        if (result.theme?.colors) {
            const root = document.documentElement;
            Object.entries(result.theme.colors).forEach(([key, value]) => {
                root.style.setProperty(`--theme-${key}`, value);
            });
        }

        // Load pages into store
        if (window.store && result.pages) {

            let coverPage = null;
            const contentPages = [];

            result.pages.forEach(page => {
                // Identify cover: templateId is 'cover' OR id starts with 'page_cover_'
                const isCover = page.templateId === 'cover' || (page.id && page.id.startsWith('page_cover_'));

                // Hydrate page.photos from layout.slots if missing
                if (!page.photos && page.layout && page.layout.slots) {
                    const assetPhotos = window.store.state.assets.photos;
                    const pagePhotos = [];
                    // Inject layout metrics if missing
                    const LAYOUTS = {
                        "single": [{ "x": 10, "y": 10, "width": 80, "height": 80 }],
                        "two-vertical": [{ "x": 10, "y": 5, "width": 80, "height": 43 }, { "x": 10, "y": 52, "width": 80, "height": 43 }],
                        "two-horizontal": [{ "x": 5, "y": 15, "width": 43, "height": 70 }, { "x": 52, "y": 15, "width": 43, "height": 70 }],
                        "three-left": [{ "x": 5, "y": 5, "width": 55, "height": 90 }, { "x": 63, "y": 5, "width": 32, "height": 43 }, { "x": 63, "y": 52, "width": 32, "height": 43 }],
                        "three-right": [{ "x": 10, "y": 5, "width": 80, "height": 50 }, { "x": 10, "y": 58, "width": 38, "height": 37 }, { "x": 52, "y": 58, "width": 38, "height": 37 }],
                        "four-grid": [{ "x": 5, "y": 5, "width": 43, "height": 43 }, { "x": 52, "y": 5, "width": 43, "height": 43 }, { "x": 5, "y": 52, "width": 43, "height": 43 }, { "x": 52, "y": 52, "width": 43, "height": 43 }],
                        "collage-5": [{ "x": 5, "y": 5, "width": 43, "height": 43 }, { "x": 52, "y": 5, "width": 43, "height": 43 }, { "x": 5, "y": 52, "width": 43, "height": 43 }, { "x": 52, "y": 52, "width": 20, "height": 20 }, { "x": 75, "y": 52, "width": 20, "height": 20 }],
                        "collage-6": [{ "x": 5, "y": 5, "width": 30, "height": 40 }, { "x": 38, "y": 5, "width": 24, "height": 40 }, { "x": 65, "y": 5, "width": 30, "height": 40 }, { "x": 5, "y": 50, "width": 30, "height": 40 }, { "x": 38, "y": 50, "width": 24, "height": 40 }, { "x": 65, "y": 50, "width": 30, "height": 40 }]
                    };
                    const layoutMetrics = LAYOUTS[page.layout.id] || LAYOUTS["single"];

                    page.layout.slots.forEach((slot, idx) => {
                        if (slot.width === undefined) {
                            const metrics = layoutMetrics[idx] || layoutMetrics[0];
                            slot.x = metrics.x;
                            slot.y = metrics.y;
                            slot.width = metrics.width;
                            slot.height = metrics.height;
                        }
                        if (slot.photoId) {
                            const p = assetPhotos.find(ap => ap.id == slot.photoId);
                            if (p) pagePhotos.push(p);
                        }
                    });
                    page.photos = pagePhotos;
                }

                if (isCover && !coverPage) {
                    coverPage = page;
                } else {
                    contentPages.push(page);
                }
            });

            // Set Cover using direct assignment to trigger Proxy listeners
            if (coverPage) {
                console.log('[MagicCreate v4] identified cover:', coverPage.id);
                // Ensure cover has expected structure
                window.store.state.cover = coverPage;
            }

            // Set content pages trigger Proxy listeners
            window.store.state.pages = contentPages;

            if (contentPages.length > 0) {
                window.store.state.activePageId = contentPages[0].id;
            }

            // Force Update View Mode if needed
            if (window.store.state.viewMode !== 'pages') {
                window.store.state.viewMode = 'pages';
            }
        }

        // Show success message
        this.showToast(`✨ Created ${result.pages ? result.pages.length : 0} pages!`);
    }

    /**
     * Progress indicator
     */
    /**
     * Progress indicator with Magic Wand Animation
     */
    showProgress(step = 'initializing') {
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
            this._progressInterval = null;
        }

        let progress = document.querySelector('.mc4-progress');
        if (!progress) {
            progress = document.createElement('div');
            progress.className = 'mc4-progress';
            document.body.appendChild(progress);
        }

        // Build initial HTML structure
        progress.innerHTML = `
            <div class="mc4-magic-scene">
                <div class="mc4-book">
                    <div class="mc4-page mc4-page-1"></div>
                    <div class="mc4-page mc4-page-2"></div>
                    <div class="mc4-page mc4-page-3"></div>
                </div>
                <div class="mc4-wand">
                    <i class="fa-solid fa-wand-magic-sparkles"></i>
                </div>
                <div class="mc4-sparkles">
                    <span>✨</span><span>✨</span><span>✨</span>
                </div>
            </div>
            <div class="mc4-status">
                <h3>Creating Magic</h3>
                <p id="mc4-dynamic-msg">Initializing...</p>
            </div>
        `;
        progress.style.display = 'flex';

        // Set up real-time visible steps interval to reflect Vision processing
        const steps = [
            '🔍 Analyzing your photos with Google Vision...',
            '⚖️ Finding optimal crops and focal points...',
            '✨ Dreaming up a theme...',
            '📐 Designing optimal layouts...',
            '🎨 Painting custom backgrounds...',
            '✒️ Writing decorative text...',
            '📚 Assembling your album...'
        ];

        let idx = step === 'analyzing' ? 0 : 2;
        document.getElementById('mc4-dynamic-msg').innerText = step === 'initializing' ? 'Initializing...' : steps[idx];

        if (step !== 'initializing') {
            this._progressInterval = setInterval(() => {
                idx = (idx + 1) % steps.length;
                const el = document.getElementById('mc4-dynamic-msg');
                if (el) el.innerText = steps[idx];
            }, 3500);
        }
    }

    hideProgress() {
        if (this._progressInterval) {
            clearInterval(this._progressInterval);
            this._progressInterval = null;
        }
        const progress = document.querySelector('.mc4-progress');
        if (progress) {
            progress.classList.add('mc4-fade-out');
            setTimeout(() => progress.remove(), 500);
        }
    }

    /**
     * Toast notification
     */
    showToast(message, duration = 3000) {
        const toast = document.createElement('div');
        toast.className = 'mc4-toast';
        toast.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${message}`;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('mc4-toast-show'), 10);
        setTimeout(() => {
            toast.classList.remove('mc4-toast-show');
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    /**
     * Inject styles
     */
    injectStyles() {
        if (document.querySelector('#mc4-styles')) return;

        const style = document.createElement('style');
        style.id = 'mc4-styles';
        style.textContent = `
            /* Modal & Shared */
            .mc4-modal {
                position: fixed;
                inset: 0;
                background: rgba(10, 10, 15, 0.9);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: mc4-fadeIn 0.3s ease;
                font-family: 'Rubik', sans-serif;
            }
            @keyframes mc4-fadeIn { from { opacity: 0; } to { opacity: 1; } }
            
            .mc4-modal-content {
                background: linear-gradient(135deg, #13131f 0%, #1e1e2e 100%);
                border-radius: 20px;
                padding: 30px;
                max-width: 800px;
                width: 90%;
                max-height: 85vh;
                overflow-y: auto;
                color: #fff;
                box-shadow: 0 25px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.1);
                border: 1px solid rgba(139, 92, 246, 0.2);
            }

            /* Animations */
            .mc4-progress {
                position: fixed;
                inset: 0;
                background: radial-gradient(circle at center, #1e1e2e 0%, #0f0f16 100%);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 100001;
                color: #fff;
            }
            .mc4-fade-out {
                 opacity: 0;
                 transition: opacity 0.5s ease;
                 pointer-events: none;
            }

            .mc4-magic-scene {
                position: relative;
                width: 200px;
                height: 200px;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .mc4-book {
                position: relative;
                width: 80px;
                height: 100px;
                background: #333;
                border-radius: 2px 6px 6px 2px;
                box-shadow: inset 4px 0 10px rgba(0,0,0,0.5);
                transform-style: preserve-3d;
                perspective: 600px;
            }
            .mc4-book::before {
                content: '';
                position: absolute;
                left: 0; top: 0; bottom: 0; width: 8px;
                background: #111;
                border-radius: 2px 0 0 2px;
            }

            .mc4-page {
                position: absolute;
                top: 2px; bottom: 2px; right: 2px; width: 68px;
                background: #fff;
                transform-origin: left;
                animation: mc4-flipPage 2s infinite ease-in-out;
                border: 1px solid #ddd;
            }
            .mc4-page-1 { animation-delay: 0s; }
            .mc4-page-2 { animation-delay: 0.4s; }
            .mc4-page-3 { animation-delay: 0.8s; }

            @keyframes mc4-flipPage {
                0% { transform: rotateY(0deg); opacity: 1; }
                50% { transform: rotateY(-160deg); opacity: 0.8; }
                100% { transform: rotateY(0deg); opacity: 0; }
            }

            .mc4-wand {
                position: absolute;
                top: 20px;
                right: 20px;
                font-size: 40px;
                background: linear-gradient(45deg, #a855f7, #ec4899);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
                animation: mc4-waveWand 2s infinite ease-in-out;
                filter: drop-shadow(0 0 10px rgba(168, 85, 247, 0.5));
            }
            @keyframes mc4-waveWand {
                0% { transform: rotate(0deg) translate(0,0); }
                50% { transform: rotate(-20deg) translate(-10px, 10px); }
                100% { transform: rotate(0deg) translate(0,0); }
            }

            .mc4-sparkles span {
                position: absolute;
                font-size: 20px;
                animation: mc4-sparkleFloat 1.5s infinite linear;
                opacity: 0;
            }
            .mc4-sparkles span:nth-child(1) { top: 40px; right: 60px; animation-delay: 0.2s; }
            .mc4-sparkles span:nth-child(2) { top: 80px; right: 30px; animation-delay: 0.5s; font-size: 15px; }
            .mc4-sparkles span:nth-child(3) { top: 60px; right: 80px; animation-delay: 0.8s; font-size: 12px; }

            @keyframes mc4-sparkleFloat {
                0% { transform: translateY(0) scale(0); opacity: 0; }
                50% { opacity: 1; }
                100% { transform: translateY(-20px) scale(1.5); opacity: 0; }
            }

            .mc4-status {
                margin-top: 20px;
                text-align: center;
            }
            .mc4-status h3 {
                margin: 0;
                font-size: 24px;
                background: linear-gradient(90deg, #fff, #a855f7);
                -webkit-background-clip: text;
                -webkit-text-fill-color: transparent;
            }
            .mc4-status p {
                margin: 8px 0 0;
                color: #888;
                font-size: 14px;
            }

            /* Toast */
            .mc4-toast {
                position: fixed;
                bottom: 30px;
                left: 50%;
                transform: translateX(-50%) translateY(100px);
                background: rgba(16, 16, 24, 0.95);
                border: 1px solid rgba(168, 85, 247, 0.3);
                color: #fff;
                padding: 16px 32px;
                border-radius: 50px;
                font-weight: 500;
                font-size: 16px;
                z-index: 100002;
                transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                box-shadow: 0 10px 40px rgba(0,0,0,0.4);
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .mc4-toast i { color: #4ade80; }
            .mc4-toast-show { transform: translateX(-50%) translateY(0); }
            /* Trash Grid (Review Dialog) & Actions */
            .mc4-trash-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 16px; margin: 24px 0; }
            .mc4-trash-item { background: rgba(255,255,255,0.05); border-radius: 12px; overflow: hidden; border: 1px solid rgba(255,255,255,0.08); transition: transform 0.2s, border-color 0.2s; }
            .mc4-trash-item:hover { transform: translateY(-2px); border-color: rgba(255,255,255,0.15); }
            .mc4-thumb { position: relative; height: 120px; background: #000; }
            .mc4-thumb img { width: 100%; height: 100%; object-fit: cover; }
            .mc4-badge { position: absolute; top: 8px; left: 8px; padding: 4px 10px; border-radius: 6px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
            .mc4-badge-blurry { background: linear-gradient(135deg, #e74c3c, #c0392b); }
            .mc4-badge-too_dark { background: linear-gradient(135deg, #2c3e50, #1a252f); }
            .mc4-badge-too_bright { background: linear-gradient(135deg, #f39c12, #d68910); }
            .mc4-badge-duplicate { background: linear-gradient(135deg, #9b59b6, #8e44ad); }
            .mc4-badge-low_quality { background: linear-gradient(135deg, #e67e22, #d35400); }
            .mc4-details { padding: 12px; }
            .mc4-details p { margin: 0 0 10px 0; font-size: 12px; opacity: 0.7; line-height: 1.4; }
            .mc4-keep { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; padding: 6px 0; }
            .mc4-keep input { width: 18px; height: 18px; cursor: pointer; accent-color: #a855f7; }
            .mc4-summary { text-align: center; padding: 12px; background: rgba(168, 85, 247, 0.15); border-radius: 10px; margin-bottom: 20px; border: 1px solid rgba(168, 85, 247, 0.2); }
            .mc4-count { font-size: 15px; }
            .mc4-actions { display: flex; gap: 12px; justify-content: flex-end; }
            .mc4-btn { padding: 12px 24px; border-radius: 10px; border: none; cursor: pointer; font-weight: 600; font-size: 14px; transition: all 0.2s; }
            .mc4-btn-cancel { background: rgba(255,255,255,0.1); color: #fff; }
            .mc4-btn-cancel:hover { background: rgba(255,255,255,0.15); }
            .mc4-btn-confirm { background: linear-gradient(135deg, #a855f7 0%, #ec4899 100%); color: #fff; }
            .mc4-btn-confirm:hover { transform: translateY(-1px); box-shadow: 0 4px 15px rgba(168, 85, 247, 0.4); }
        `;
        document.head.appendChild(style);
    }
}

// Export
window.MagicCreateV4 = MagicCreateV4;

// Usage example:
// const mc = new MagicCreateV4();
// mc.run('Beach vacation', store.state.assets.photos);
