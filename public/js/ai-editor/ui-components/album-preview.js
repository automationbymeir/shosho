/**
 * Album Preview Component
 * Provides a full-screen preview with:
 * - 3D book visualization
 * - Page flipping navigation
 * - PDF generation button
 */

import { store } from '../core/state.js';
import { pdfExport } from '../engines/pdf-export.js';
import { pdfCanvasExport } from '../engines/pdf-canvas-export.js';

// Template renderers for page preview
import { PhotographyPortfolioRenderer } from '../templates/photography-portfolio-renderer.js';
import { RomanticJourneyRenderer } from '../templates/romantic-journey-renderer.js';
import { TravelJourneyRenderer } from '../templates/travel-journey-renderer.js';
import { FamilyRootsRenderer } from '../templates/family-roots-renderer.js';
import { BarMitzvahRenderer } from '../templates/bar-mitzvah-renderer.js';
import { UnifiedCoverRenderer } from '../engines/unified-cover-renderer.js';
import { WeddingPrestigeRenderer } from '../templates/wedding-prestige-renderer.js';

export class AlbumPreview {
    constructor() {
        this.currentPageIndex = 0;
        this.pages = [];
        this.cover = null;
        this.assets = null;
        this.templateConfig = null;
        this.isOpen = false;
        this.renderedPages = []; // Cache for rendered page elements
    }

    /**
     * Open preview mode
     */
    open(pages, cover, assets, templateConfig) {
        this.pages = pages || [];
        this.cover = cover;
        this.assets = assets;
        this.templateConfig = templateConfig;
        this.currentPageIndex = 0;
        this.renderedPages = [];
        this.isOpen = true;

        // Filter out cover pages from pages array
        this.contentPages = this.pages.filter(page => {
            const layoutId = (page.rawLayoutId || page.layout?.id || '').toLowerCase();
            return !layoutId.includes('cover');
        });

        this.createModal();
        this.renderCurrentView();
        document.body.classList.add('preview-mode');
    }

    /**
     * Close preview mode
     */
    close() {
        this.isOpen = false;
        const modal = document.getElementById('album-preview-modal');
        if (modal) {
            modal.classList.add('closing');
            setTimeout(() => modal.remove(), 300);
        }
        document.body.classList.remove('preview-mode');
    }

    /**
     * Create the preview modal
     */
    createModal() {
        // Remove existing modal if any
        const existing = document.getElementById('album-preview-modal');
        if (existing) existing.remove();

        const modal = document.createElement('div');
        modal.id = 'album-preview-modal';
        modal.innerHTML = `
            <div class="preview-header">
                <div class="preview-title">
                    <i class="fa-solid fa-book-open"></i>
                    Album Preview
                </div>
                <div class="preview-controls">
                    <button class="preview-view-btn active" data-view="flipbook">
                        <i class="fa-solid fa-book"></i> Flipbook
                    </button>
                    <button class="preview-view-btn" data-view="3d">
                        <i class="fa-solid fa-cube"></i> 3D View
                    </button>
                </div>
                <button class="preview-close-btn">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>

            <div class="preview-content">
                <!-- Flipbook View -->
                <div class="preview-flipbook active" id="preview-flipbook">
                    <button class="flip-nav flip-prev" id="flip-prev">
                        <i class="fa-solid fa-chevron-left"></i>
                    </button>
                    
                    <div class="flipbook-container">
                        <div class="flipbook-page" id="flipbook-page">
                            <!-- Page content rendered here -->
                        </div>
                        <div class="page-indicator" id="page-indicator">
                            Cover
                        </div>
                    </div>
                    
                    <button class="flip-nav flip-next" id="flip-next">
                        <i class="fa-solid fa-chevron-right"></i>
                    </button>
                </div>

                <!-- 3D View -->
                <div class="preview-3d" id="preview-3d">
                    <div class="book-3d-container">
                        <div class="book-3d" id="book-3d">
                            <!-- 3D book renders here -->
                        </div>
                    </div>
                    <div class="book-3d-controls">
                        <label>Rotate Book (Front → Spine → Back)</label>
                        <input type="range" id="book-rotation" min="0" max="360" value="30">
                        <div class="hint">
                            <i class="fa-solid fa-hand-pointer"></i> Drag the book or use the slider
                        </div>
                    </div>
                </div>
            </div>

            <div class="preview-footer">
                <div class="preview-thumbnails" id="preview-thumbnails">
                    <!-- Thumbnail strip -->
                </div>
                <div class="preview-actions">
                    <button class="btn-generate-pdf" id="btn-generate-pdf">
                        <i class="fa-solid fa-file-pdf"></i>
                        Generate PDF
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.injectStyles();
        this.bindEvents();
        this.renderThumbnails();
    }

    /**
     * Inject CSS styles for the preview
     */
    injectStyles() {
        if (document.getElementById('album-preview-styles')) return;

        const style = document.createElement('style');
        style.id = 'album-preview-styles';
        style.textContent = `
            #album-preview-modal {
                position: fixed;
                inset: 0;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                animation: fadeIn 0.3s ease;
            }

            #album-preview-modal.closing {
                animation: fadeOut 0.3s ease forwards;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            @keyframes fadeOut {
                from { opacity: 1; }
                to { opacity: 0; }
            }

            .preview-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 16px 24px;
                background: rgba(0, 0, 0, 0.3);
                border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }

            .preview-title {
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 1.2rem;
                font-weight: 600;
                color: white;
            }

            .preview-title i {
                color: #8b5cf6;
            }

            .preview-controls {
                display: flex;
                gap: 8px;
            }

            .preview-view-btn {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 8px 16px;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 8px;
                color: #94a3b8;
                cursor: pointer;
                transition: all 0.2s;
            }

            .preview-view-btn:hover {
                background: rgba(255, 255, 255, 0.15);
                color: white;
            }

            .preview-view-btn.active {
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border-color: transparent;
                color: white;
            }

            .preview-close-btn {
                width: 40px;
                height: 40px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.1);
                border: none;
                border-radius: 50%;
                color: #94a3b8;
                cursor: pointer;
                transition: all 0.2s;
            }

            .preview-close-btn:hover {
                background: #ef4444;
                color: white;
            }

            .preview-content {
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                overflow: hidden;
                position: relative;
            }

            /* Flipbook View */
            .preview-flipbook {
                display: none;
                width: 100%;
                height: 100%;
                align-items: center;
                justify-content: center;
                gap: 24px;
            }

            .preview-flipbook.active {
                display: flex;
            }

            .flip-nav {
                width: 60px;
                height: 60px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255, 255, 255, 0.1);
                border: 1px solid rgba(255, 255, 255, 0.2);
                border-radius: 50%;
                color: white;
                font-size: 1.5rem;
                cursor: pointer;
                transition: all 0.2s;
            }

            .flip-nav:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.2);
                transform: scale(1.1);
            }

            .flip-nav:disabled {
                opacity: 0.3;
                cursor: not-allowed;
            }

            .flipbook-container {
                position: relative;
                perspective: 2000px;
            }

            .flipbook-page {
                width: 800px;
                height: 600px;
                background: white;
                border-radius: 4px;
                box-shadow: 
                    0 25px 50px rgba(0, 0, 0, 0.5),
                    0 0 0 1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                transform-style: preserve-3d;
            }

            .flipbook-page.flipping-left {
                animation: flipLeft 0.6s ease;
            }

            .flipbook-page.flipping-right {
                animation: flipRight 0.6s ease;
            }

            @keyframes flipLeft {
                0% { transform: rotateY(0deg); }
                50% { transform: rotateY(-15deg); }
                100% { transform: rotateY(0deg); }
            }

            @keyframes flipRight {
                0% { transform: rotateY(0deg); }
                50% { transform: rotateY(15deg); }
                100% { transform: rotateY(0deg); }
            }

            .page-indicator {
                text-align: center;
                margin-top: 16px;
                color: #64748b;
                font-size: 0.9rem;
            }

            /* 3D View */
            .preview-3d {
                display: none;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                width: 100%;
                height: 100%;
            }

            .preview-3d.active {
                display: flex;
            }

            .book-3d-container {
                perspective: 2000px;
                flex: 1;
                display: flex;
                align-items: center;
                justify-content: center;
                cursor: grab;
                user-select: none;
            }

            .book-3d-container:active {
                cursor: grabbing;
            }

            .book-3d {
                width: 600px;
                height: 450px;
                position: relative;
                transform-style: preserve-3d;
                transition: transform 0.3s ease;
            }

            .book-3d-wrapper {
                transform: rotateX(-15deg) rotateY(-30deg);
                transition: transform 0.5s ease;
            }

            .book-3d-page {
                position: absolute;
                width: 100%;
                height: 100%;
                background: white;
                border-radius: 2px;
                box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
                backface-visibility: hidden;
                overflow: hidden;
            }

            .book-3d-controls {
                padding: 20px;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 12px;
                background: rgba(0, 0, 0, 0.2);
                border-radius: 12px;
            }

            .book-3d-controls input[type="range"] {
                width: 400px;
                height: 6px;
                accent-color: #8b5cf6;
                cursor: pointer;
            }

            .book-3d-controls label {
                color: rgba(255, 255, 255, 0.9);
                font-size: 0.9rem;
                font-weight: 500;
            }

            .book-3d-controls .hint {
                color: rgba(255, 255, 255, 0.5);
                font-size: 0.8rem;
            }

            /* Footer */
            .preview-footer {
                padding: 16px 24px;
                background: rgba(0, 0, 0, 0.3);
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                display: flex;
                flex-direction: column;
                gap: 16px;
            }

            .preview-thumbnails {
                display: flex;
                gap: 12px;
                overflow-x: auto;
                padding: 8px 0;
                justify-content: center;
            }

            .preview-thumb {
                width: 100px;
                height: 75px;
                background: white;
                border-radius: 4px;
                overflow: hidden;
                cursor: pointer;
                border: 2px solid transparent;
                transition: all 0.2s;
                flex-shrink: 0;
            }

            .preview-thumb:hover {
                transform: scale(1.05);
            }

            .preview-thumb.active {
                border-color: #8b5cf6;
                box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3);
            }

            .preview-thumb img,
            .preview-thumb > div {
                width: 100%;
                height: 100%;
                object-fit: cover;
            }

            .preview-actions {
                display: flex;
                justify-content: center;
            }

            .btn-generate-pdf {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 14px 32px;
                background: linear-gradient(135deg, #6366f1, #8b5cf6);
                border: none;
                border-radius: 12px;
                color: white;
                font-size: 1rem;
                font-weight: 600;
                cursor: pointer;
                transition: all 0.2s;
            }

            .btn-generate-pdf:hover {
                transform: translateY(-2px);
                box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4);
            }

            .btn-generate-pdf:active {
                transform: translateY(0);
            }

            .btn-generate-pdf i {
                font-size: 1.2rem;
            }

            /* Responsive */
            @media (max-width: 900px) {
                .flipbook-page {
                    width: 90vw;
                    height: calc(90vw * 0.75);
                    max-width: 800px;
                    max-height: 600px;
                }

                .flip-nav {
                    width: 44px;
                    height: 44px;
                    font-size: 1rem;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /**
     * Bind event listeners
     */
    bindEvents() {
        // Close button
        document.querySelector('.preview-close-btn').addEventListener('click', () => {
            this.close();
        });

        // View toggle buttons
        document.querySelectorAll('.preview-view-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const view = btn.dataset.view;
                document.querySelectorAll('.preview-view-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                document.getElementById('preview-flipbook').classList.toggle('active', view === 'flipbook');
                document.getElementById('preview-3d').classList.toggle('active', view === '3d');

                if (view === '3d') {
                    this.render3DBook();
                }
            });
        });

        // Navigation buttons
        document.getElementById('flip-prev').addEventListener('click', () => this.prevPage());
        document.getElementById('flip-next').addEventListener('click', () => this.nextPage());

        // Keyboard navigation
        this.keyHandler = (e) => {
            if (!this.isOpen) return;
            if (e.key === 'ArrowLeft') this.prevPage();
            if (e.key === 'ArrowRight') this.nextPage();
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.keyHandler);

        // 3D rotation slider - rotate to show all sides
        const rotationSlider = document.getElementById('book-rotation');
        rotationSlider.addEventListener('input', (e) => {
            const bookWrapper = document.querySelector('.book-3d-wrapper');
            if (bookWrapper) {
                const rotation = parseInt(e.target.value);
                // Rotate from -30 (show front) to 210 (show back)
                const yRotation = (rotation / 360) * 240 - 30;
                bookWrapper.style.transform = `rotateX(-15deg) rotateY(${yRotation}deg)`;
                bookWrapper.dataset.currentRotation = yRotation;
            }
        });

        // Mouse drag rotation for 3D book
        let isDragging = false;
        let startX = 0;
        let startRotationY = -30;

        const book3DContainer = document.querySelector('.book-3d-container');
        if (book3DContainer) {
            book3DContainer.addEventListener('mousedown', (e) => {
                const bookWrapper = document.querySelector('.book-3d-wrapper');
                if (!bookWrapper) return;

                isDragging = true;
                startX = e.clientX;
                startRotationY = parseFloat(bookWrapper.dataset.currentRotation || -30);
                book3DContainer.style.cursor = 'grabbing';

                // Disable transition during drag for smooth interaction
                bookWrapper.style.transition = 'none';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const bookWrapper = document.querySelector('.book-3d-wrapper');
                if (!bookWrapper) return;

                const deltaX = e.clientX - startX;
                const rotationChange = deltaX * 0.5; // Sensitivity
                let newRotationY = startRotationY + rotationChange;

                // Clamp rotation between -30 and 210
                newRotationY = Math.max(-30, Math.min(210, newRotationY));

                bookWrapper.style.transform = `rotateX(-15deg) rotateY(${newRotationY}deg)`;
                bookWrapper.dataset.currentRotation = newRotationY;

                // Update slider to match
                const sliderValue = ((newRotationY + 30) / 240) * 360;
                rotationSlider.value = sliderValue;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    book3DContainer.style.cursor = 'grab';

                    // Re-enable transition
                    const bookWrapper = document.querySelector('.book-3d-wrapper');
                    if (bookWrapper) {
                        bookWrapper.style.transition = 'transform 0.3s ease';
                    }
                }
            });

            // Set initial cursor
            book3DContainer.style.cursor = 'grab';
        }

        // Generate PDF button
        document.getElementById('btn-generate-pdf').addEventListener('click', () => this.generatePDF());
    }

    /**
     * Navigate to previous page
     */
    prevPage() {
        if (this.currentPageIndex > 0) {
            const pageEl = document.getElementById('flipbook-page');
            pageEl.classList.add('flipping-right');
            setTimeout(() => {
                pageEl.classList.remove('flipping-right');
                this.currentPageIndex--;
                this.renderCurrentView();
                this.updateThumbnailSelection();
            }, 300);
        }
    }

    /**
     * Navigate to next page
     */
    nextPage() {
        const hasBackCover = this.cover?.backPhotoId;
        const totalPages = 1 + this.contentPages.length + (hasBackCover ? 1 : 0);
        if (this.currentPageIndex < totalPages - 1) {
            const pageEl = document.getElementById('flipbook-page');
            pageEl.classList.add('flipping-left');
            setTimeout(() => {
                pageEl.classList.remove('flipping-left');
                this.currentPageIndex++;
                this.renderCurrentView();
                this.updateThumbnailSelection();
            }, 300);
        }
    }

    /**
     * Go to specific page
     */
    goToPage(index) {
        this.currentPageIndex = index;
        this.renderCurrentView();
        this.updateThumbnailSelection();
    }

    /**
     * Render the current page view
     */
    renderCurrentView() {
        const container = document.getElementById('flipbook-page');
        const indicator = document.getElementById('page-indicator');
        const prevBtn = document.getElementById('flip-prev');
        const nextBtn = document.getElementById('flip-next');

        container.innerHTML = '';

        // Calculate total pages: front cover + content pages + back cover (if exists)
        const hasBackCover = this.cover?.backPhotoId;
        const totalPages = 1 + this.contentPages.length + (hasBackCover ? 1 : 0);

        // Update navigation buttons
        prevBtn.disabled = this.currentPageIndex === 0;
        nextBtn.disabled = this.currentPageIndex === totalPages - 1;

        if (this.currentPageIndex === 0) {
            // Render FRONT COVER ONLY
            indicator.textContent = 'Front Cover';
            this.renderFrontCoverToContainer(container);
        } else if (hasBackCover && this.currentPageIndex === totalPages - 1) {
            // Render BACK COVER ONLY (last page)
            indicator.textContent = 'Back Cover';
            this.renderBackCoverToContainer(container);
        } else {
            // Render content page
            const pageIndex = this.currentPageIndex - 1;
            indicator.textContent = `Page ${pageIndex + 1} of ${this.contentPages.length}`;
            this.renderPageToContainer(this.contentPages[pageIndex], container);
        }
    }

    /**
     * Render FRONT cover only to a container
     */
    renderFrontCoverToContainer(container) {
        // Create a modified cover object with only front photo
        const frontCoverOnly = {
            ...this.cover,
            backPhotoId: null // Hide back photo
        };

        // Use the UNIFIED cover renderer - same as editor
        UnifiedCoverRenderer.render({
            cover: frontCoverOnly,
            assets: this.assets,
            templateConfig: this.templateConfig,
            container,
            interactive: false,  // Preview mode - no interaction needed
            thumbnail: false
        });
    }

    /**
     * Render BACK cover only to a container
     */
    renderBackCoverToContainer(container) {
        // Full-page back cover photo
        const pageWidth = this.templateConfig?.designSystem?.canvas?.width || 800;
        const pageHeight = this.templateConfig?.designSystem?.canvas?.height || 600;

        const backCoverEl = document.createElement('div');
        backCoverEl.style.cssText = `
            width: ${pageWidth}px;
            height: ${pageHeight}px;
            position: relative;
            overflow: hidden;
            background: ${this.cover?.color || '#1a1a2e'};
        `;

        if (this.cover?.backPhotoId && this.assets?.photos) {
            const photo = this.assets.photos.find(p => p.id === this.cover.backPhotoId);
            if (photo) {
                const img = document.createElement('img');
                img.src = photo.thumbnailUrl || photo.url;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                `;
                backCoverEl.appendChild(img);
            }
        } else {
            // Placeholder
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: rgba(255,255,255,0.5);
                font-size: 24px;
            `;
            placeholder.textContent = 'Back Cover';
            backCoverEl.appendChild(placeholder);
        }

        container.appendChild(backCoverEl);
    }

    /**
     * Render cover to a container using UNIFIED cover renderer (LEGACY - not used)
     * This ensures the same cover is displayed in preview and editor
     */
    renderCoverToContainer(container) {
        // Use the UNIFIED cover renderer - same as editor
        UnifiedCoverRenderer.render({
            cover: this.cover,
            assets: this.assets,
            templateConfig: this.templateConfig,
            container,
            interactive: false,  // Preview mode - no interaction needed
            thumbnail: false
        });
    }

    /**
     * Render a page to a container
     */
    renderPageToContainer(page, container) {
        if (!page) {
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">Empty Page</div>';
            return;
        }

        const renderer = this.getRenderer(page.templateId);

        if (renderer && page.rawLayoutId && this.templateConfig?.pageLayouts) {
            const layout = this.templateConfig.pageLayouts.find(l => l.layoutId === page.rawLayoutId);
            if (layout && renderer.renderPage) {
                const pageEl = renderer.renderPage(layout, page.photos || [], page.textContent || {}, page.textPositions || {});
                if (pageEl) {
                    container.appendChild(pageEl);
                    return;
                }
            }
        }

        // Fallback
        container.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#666;">Page Content</div>`;
    }

    /**
     * Get the appropriate renderer for a template
     */
    getRenderer(templateId) {
        if (!this.templateConfig) return null;

        switch (templateId) {
            case 'photography-portfolio-v1':
                return new PhotographyPortfolioRenderer(this.templateConfig);
            case 'romantic-journey-v1':
                return new RomanticJourneyRenderer(this.templateConfig);
            case 'travel-journey-v1':
                return new TravelJourneyRenderer(this.templateConfig);
            case 'family-roots-v1':
                return new FamilyRootsRenderer(this.templateConfig);
            case 'bar-mitzvah-v1':
                return new BarMitzvahRenderer(this.templateConfig);
            case 'wedding-prestige-hebrew-v1':
                return new WeddingPrestigeRenderer(this.templateConfig);
            default:
                return null;
        }
    }

    /**
     * Render thumbnail strip
     */
    renderThumbnails() {
        const container = document.getElementById('preview-thumbnails');
        container.innerHTML = '';

        // Front Cover thumbnail
        const frontCoverThumb = document.createElement('div');
        frontCoverThumb.className = 'preview-thumb active';
        frontCoverThumb.dataset.index = '0';

        // Try to show front cover photo as thumbnail
        if (this.cover?.frontPhotoId && this.assets?.photos) {
            const photo = this.assets.photos.find(p => p.id === this.cover.frontPhotoId);
            if (photo) {
                frontCoverThumb.innerHTML = `<img src="${photo.thumbnailUrl || photo.url}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                frontCoverThumb.innerHTML = `<div style="background:${this.cover?.color || '#1a1a2e'};display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;">Front</div>`;
            }
        } else {
            frontCoverThumb.innerHTML = `<div style="background:${this.cover?.color || '#1a1a2e'};display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;">Front</div>`;
        }
        frontCoverThumb.addEventListener('click', () => this.goToPage(0));
        container.appendChild(frontCoverThumb);

        // Page thumbnails
        this.contentPages.forEach((page, idx) => {
            const thumb = document.createElement('div');
            thumb.className = 'preview-thumb';
            thumb.dataset.index = idx + 1;
            thumb.innerHTML = `<div style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;font-size:0.7rem;">Page ${idx + 1}</div>`;
            thumb.addEventListener('click', () => this.goToPage(idx + 1));
            container.appendChild(thumb);
        });

        // Back Cover thumbnail (if exists)
        if (this.cover?.backPhotoId) {
            const backCoverThumb = document.createElement('div');
            backCoverThumb.className = 'preview-thumb';
            const backCoverIndex = this.contentPages.length + 1;
            backCoverThumb.dataset.index = backCoverIndex.toString();

            // Try to show back cover photo as thumbnail
            if (this.assets?.photos) {
                const photo = this.assets.photos.find(p => p.id === this.cover.backPhotoId);
                if (photo) {
                    backCoverThumb.innerHTML = `<img src="${photo.thumbnailUrl || photo.url}" style="width:100%;height:100%;object-fit:cover;">`;
                } else {
                    backCoverThumb.innerHTML = `<div style="background:${this.cover?.color || '#1a1a2e'};display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;">Back</div>`;
                }
            } else {
                backCoverThumb.innerHTML = `<div style="background:${this.cover?.color || '#1a1a2e'};display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;">Back</div>`;
            }
            backCoverThumb.addEventListener('click', () => this.goToPage(backCoverIndex));
            container.appendChild(backCoverThumb);
        }
    }

    /**
     * Update thumbnail selection
     */
    updateThumbnailSelection() {
        document.querySelectorAll('.preview-thumb').forEach(thumb => {
            thumb.classList.toggle('active', parseInt(thumb.dataset.index) === this.currentPageIndex);
        });
    }

    /**
     * Render 3D book visualization with front cover, spine, and back cover
     */
    render3DBook() {
        const container = document.getElementById('book-3d');
        container.innerHTML = '';

        // Get design system colors
        const designSystem = this.templateConfig?.designSystem || {};
        const colors = designSystem.colors || {};
        const coverColor = this.cover?.color || colors.primary || colors.background || '#1a1a2e';

        // Page dimensions
        const pageWidth = this.templateConfig?.designSystem?.canvas?.width || 800;
        const pageHeight = this.templateConfig?.designSystem?.canvas?.height || 600;
        const scale = 0.5; // Scale down for 3D view
        const scaledWidth = pageWidth * scale;
        const scaledHeight = pageHeight * scale;
        const spineWidth = 30; // Spine thickness

        // Create book wrapper
        const book = document.createElement('div');
        book.className = 'book-3d-wrapper';
        book.dataset.currentRotation = '-30'; // Initial rotation
        book.style.cssText = `
            position: relative;
            width: ${scaledWidth + spineWidth}px;
            height: ${scaledHeight}px;
            transform-style: preserve-3d;
            transform: rotateX(-15deg) rotateY(-30deg);
            transition: transform 0.3s ease;
        `;

        // ========== FRONT COVER ==========
        const frontCover = document.createElement('div');
        frontCover.className = 'book-3d-front-cover';
        frontCover.style.cssText = `
            position: absolute;
            width: ${scaledWidth}px;
            height: ${scaledHeight}px;
            transform: translateZ(${spineWidth / 2}px);
            transform-style: preserve-3d;
            overflow: hidden;
            box-shadow:
                0 10px 30px rgba(0,0,0,0.3),
                inset 0 0 0 1px rgba(255,255,255,0.1);
            border-radius: 2px;
        `;

        // Render front cover content
        const frontCoverContent = document.createElement('div');
        frontCoverContent.style.cssText = `
            width: ${pageWidth}px;
            height: ${pageHeight}px;
            transform: scale(${scale});
            transform-origin: top left;
            background: white;
        `;
        this.renderFrontCoverToContainer(frontCoverContent);
        frontCover.appendChild(frontCoverContent);
        book.appendChild(frontCover);

        // ========== SPINE ==========
        const spine = document.createElement('div');
        spine.className = 'book-3d-spine';
        spine.style.cssText = `
            position: absolute;
            left: ${scaledWidth}px;
            width: ${spineWidth}px;
            height: ${scaledHeight}px;
            transform-origin: left center;
            transform: rotateY(90deg);
            background: linear-gradient(90deg,
                ${this.adjustBrightness(coverColor, -40)},
                ${this.adjustBrightness(coverColor, -20)},
                ${this.adjustBrightness(coverColor, -40)}
            );
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow:
                inset 2px 0 5px rgba(0,0,0,0.3),
                inset -2px 0 5px rgba(0,0,0,0.3);
        `;

        // Add spine text (rotated)
        const spineText = document.createElement('div');
        spineText.style.cssText = `
            transform: rotate(-90deg);
            color: white;
            font-size: 14px;
            font-weight: 600;
            white-space: nowrap;
            text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
            font-family: ${designSystem.typography?.heading?.family || 'serif'};
        `;
        spineText.textContent = this.cover?.title || 'Photo Book';
        spine.appendChild(spineText);
        book.appendChild(spine);

        // ========== BACK COVER ==========
        const backCover = document.createElement('div');
        backCover.className = 'book-3d-back-cover';
        backCover.style.cssText = `
            position: absolute;
            width: ${scaledWidth}px;
            height: ${scaledHeight}px;
            left: ${scaledWidth + spineWidth}px;
            transform: rotateY(180deg);
            transform-origin: left center;
            overflow: hidden;
            box-shadow:
                0 10px 30px rgba(0,0,0,0.3),
                inset 0 0 0 1px rgba(255,255,255,0.1);
            border-radius: 2px;
        `;

        // Render back cover content
        const backCoverContent = document.createElement('div');
        backCoverContent.style.cssText = `
            width: ${pageWidth}px;
            height: ${pageHeight}px;
            transform: scale(${scale}) rotateY(180deg);
            transform-origin: top left;
            background: ${coverColor};
        `;

        // Render back cover photo or placeholder
        if (this.cover?.backPhotoId && this.assets?.photos) {
            const photo = this.assets.photos.find(p => p.id === this.cover.backPhotoId);
            if (photo) {
                const img = document.createElement('img');
                img.src = photo.thumbnailUrl || photo.url;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                `;
                backCoverContent.appendChild(img);
            } else {
                // Placeholder if photo not found
                const placeholder = document.createElement('div');
                placeholder.style.cssText = `
                    width: 100%;
                    height: 100%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 18px;
                    opacity: 0.5;
                `;
                placeholder.textContent = 'Back Cover';
                backCoverContent.appendChild(placeholder);
            }
        } else {
            // No back photo - show placeholder
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-size: 18px;
                opacity: 0.5;
            `;
            placeholder.textContent = 'Back Cover';
            backCoverContent.appendChild(placeholder);
        }

        backCover.appendChild(backCoverContent);
        book.appendChild(backCover);

        // ========== PAGES (Inside the book) ==========
        // Render some sample pages between covers
        const numPagesToShow = Math.min(5, this.contentPages.length);
        for (let i = 0; i < numPagesToShow; i++) {
            const pageOffset = 2 + (i * 0.5); // Slight offset for depth effect
            const pageEl = document.createElement('div');
            pageEl.className = 'book-3d-inner-page';
            pageEl.style.cssText = `
                position: absolute;
                width: ${scaledWidth}px;
                height: ${scaledHeight}px;
                transform: translateZ(${(spineWidth / 2) - pageOffset}px);
                background: white;
                box-shadow: 0 0 3px rgba(0,0,0,0.2);
                border-radius: 1px;
            `;
            book.appendChild(pageEl);
        }

        container.appendChild(book);
    }


    /**
     * Generate PDF
     */
    async generatePDF() {
        const btn = document.getElementById('btn-generate-pdf');
        const originalHTML = btn.innerHTML;

        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Generating...';
        btn.disabled = true;

        try {
            // Use the template config
            if (this.templateConfig) {
                pdfExport.setTemplateConfig(this.templateConfig);
                pdfCanvasExport.setTemplateConfig(this.templateConfig);
            }

            const firstPage = this.pages[0];
            const isTemplateBased = firstPage && firstPage.templateId && this.templateConfig;

            if (isTemplateBased) {
                await pdfCanvasExport.generatePDF(this.pages, this.cover, this.assets);
            } else {
                await pdfExport.generatePDF(this.pages, this.cover, this.assets);
            }

        } catch (error) {
            console.error('PDF generation failed:', error);
            alert('Failed to generate PDF: ' + error.message);
        } finally {
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }
    }

    /**
     * Adjust color brightness for gradients
     * @param {string} color - Hex or rgb color
     * @param {number} amount - Amount to adjust (positive = lighter, negative = darker)
     * @returns {string} Adjusted color
     */
    adjustBrightness(color, amount) {
        // Simple fallback if color parsing fails
        if (!color || color === 'transparent') return '#2d2d4a';

        // Handle hex colors
        if (color.startsWith('#')) {
            const num = parseInt(color.slice(1), 16);
            const r = Math.min(255, Math.max(0, (num >> 16) + amount));
            const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
            const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
            return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
        }

        return color; // Return original if not hex
    }
}

// Export singleton
export const albumPreview = new AlbumPreview();
