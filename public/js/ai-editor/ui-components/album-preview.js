/**
 * Album Preview Component
 * Provides a full-screen preview with:
 * - 3D book visualization
 * - Page flipping navigation
 * - PDF generation button
 */

import { store } from '../core/state.js';
import { pdfCanvasExport } from '../engines/pdf-canvas-export.js';
import { RenderEngine } from '../engines/render-engine.js';

// Template renderers for page preview
import { PhotographyPortfolioRenderer } from '../templates/photography-portfolio-renderer.js';
import { RomanticJourneyRenderer } from '../templates/romantic-journey-renderer.js';
import { TravelJourneyRenderer } from '../templates/travel-journey-renderer.js';
import { FamilyRootsRenderer } from '../templates/family-roots-renderer.js';
import { BarMitzvahRenderer } from '../templates/bar-mitzvah-renderer.js';
import { UnifiedCoverRenderer } from '../engines/unified-cover-renderer.js';
import { WeddingPrestigeRenderer } from '../templates/wedding-prestige-renderer.js';
import { UltimateBook3D } from './ultimate-book-3d.js';

export class AlbumPreview {
    constructor() {
        this.currentPageIndex = 0;
        this.pages = [];
        this.cover = null;
        this.assets = null;
        this.templateConfig = null;
        this.isOpen = false;
        this.isOpen = false;
        this.renderedPages = []; // Cache for rendered page elements
        // Initialize generic renderer for fallback
        this.fallbackRenderer = new RenderEngine(null); // No main container needed
    }

    /**
     * Open preview mode
     */
    open(pages, cover, assets, templateConfig) {
        // Use window._magicPages as fallback if store pages are empty/default
        let effectivePages = pages || [];
        if (effectivePages.length <= 1 && window._magicPages && window._magicPages.length > 0) {
            console.log('[Preview] Using _magicPages fallback:', window._magicPages.length, 'pages');
            effectivePages = window._magicPages;
        }
        this.pages = effectivePages;

        // Use window._magicAssets as fallback if assets are empty
        let effectiveAssets = assets;
        if ((!effectiveAssets?.photos || effectiveAssets.photos.length === 0) && window._magicAssets) {
            console.log('[Preview] Using _magicAssets fallback:', window._magicAssets.photos?.length, 'photos');
            effectiveAssets = window._magicAssets;
        }

        // Merge _magicCover fallback data into cover
        if (window._magicCover && cover) {
            if (!cover.background && window._magicCover.background) {
                cover.background = window._magicCover.background;
            }
            if (cover.theme === 'classic' && window._magicCover.theme && window._magicCover.theme !== 'classic') {
                cover.theme = window._magicCover.theme;
            }
            if (cover.title === 'My Photo Book' && window._magicCover.title) {
                cover.title = window._magicCover.title;
            }
        }
        this.cover = cover;
        this.assets = effectiveAssets;
        this.templateConfig = templateConfig;

        console.log('[Preview] Opening with', this.pages.length, 'pages. Cover bg:', this.cover?.background, 'theme:', this.cover?.theme);
        console.log('[Preview] First page ID:', this.pages[0]?.id, 'templateId:', this.pages[0]?.templateId);
        console.log('[Preview] Assets photos:', this.assets?.photos?.length);

        // Separate content pages (excluding cover) if needed
        this.contentPages = this.pages.filter(p => p.templateId !== 'cover' && p.templateId !== 'back-cover');

        this.currentPageIndex = -1; // Start Closed
        this.isOpen = true;

        this.createModal();
        this.renderCurrentView();
        document.body.classList.add('preview-mode');
    }

    /**
     * Close preview mode
     */
    close() {
        if (this.ultimateBook) {
            this.ultimateBook.dispose();
            this.ultimateBook = null;
        }
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
                <!-- Shared Navigation Controls -->
                <button class="flip-nav flip-prev" id="flip-prev" style="z-index: 20;">
                    <i class="fa-solid fa-chevron-left"></i>
                </button>

                <!-- Flipbook View -->
                <div class="preview-flipbook active" id="preview-flipbook">
                    <div class="flipbook-container">
                        <div class="flipbook-page" id="flipbook-page">
                            <!-- Page content rendered here -->
                        </div>
                        <div class="page-indicator" id="page-indicator">
                            Cover
                        </div>
                    </div>
                </div>

                <!-- 3D View -->
                <div class="preview-3d" id="preview-3d">
                    <div class="book-3d-container" style="display:block; width:100%; height:100%;">
                        <div class="book-3d" id="book-3d" style="width:100%; height:100%;">
                            <!-- 3D book renders here -->
                        </div>
                    </div>
                    <div class="book-3d-controls">
                        <label>Rotate Book View</label>
                        <input type="range" id="book-rotation" min="0" max="360" value="30">
                        <div class="hint">
                            <i class="fa-solid fa-arrows-rotate"></i> Drag or slide to see front/spine/back •
                            <i class="fa-solid fa-hand-pointer"></i> Click arrows to flip pages
                        </div>
                    </div>
                </div>

                <button class="flip-nav flip-next" id="flip-next" style="z-index: 20;">
                    <i class="fa-solid fa-chevron-right"></i>
                </button>
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

            #book-3d {
                width: 100%;
                height: 100%;
                min-width: 400px;
                min-height: 400px;
                position: relative;
            }

            /* ============================================
               BOOK PREVIEW (Pure CSS 3D)
               ============================================ */
            .book-container {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
                transform-style: preserve-3d;
                perspective: 1200px;
                position: relative;
            }

            .book {
                --book-width: 420px;  /* Shoso Landscape */
                --book-height: 310px;
                --book-depth: 50px;
                
                width: var(--book-width);
                height: var(--book-height);
                position: relative;
                transform-style: preserve-3d;
                
                /* Hero angle defaults */
                transform: rotateY(-35deg) rotateX(10deg);
                transition: transform 0.1s ease-out;
            }

            /* ============================================
               FRONT COVER
               ============================================ */
            .book > .front {
                position: absolute;
                width: var(--book-width);
                height: var(--book-height);
                /* Push forward by half depth */
                transform: translateZ(calc(var(--book-depth) / 2));
                
                background: #1a1a2e; /* Fallback */
                border-radius: 0 4px 4px 0;
                /* Hinge crease */
                border-left: 2px solid rgba(255,255,255,0.1);
                
                box-shadow: 
                    6px 6px 20px rgba(0,0,0,0.25),
                    inset -2px 0 5px rgba(0,0,0,0.1);
                overflow: hidden;
            }

            /* ... (Back Cover Glossy Overlay remains) ... */

            /* ============================================
               PAGES (Right Edge - ::before)
               ============================================ */
            .book::before {
                content: '';
                position: absolute;
                height: calc(var(--book-height) - 6px);
                width: var(--book-depth);
                top: 3px;
                
                /* Paper texture (White/Cream) */
                background: 
                    linear-gradient(90deg, #fdfbf7 0%, #fff 50%, #fdfbf7 100%),
                    repeating-linear-gradient(0deg,
                        transparent 0px, transparent 2px,
                        rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 3px
                    );
                
                /* Position: 
                   Move to the visual right edge (Width - Recess). 
                   Recess: 4px from edge.  
                   Rotate 90 to face Right. 
                   Transform Origin is Center (25px).
                   We want center to be at X = Width - 4px.
                */
                transform: 
                    translateX(calc(var(--book-width) - 4px))
                    rotateY(90deg);
                
                border-radius: 0 2px 2px 0;
            }

            /* ============================================
               TOP/BOTTOM EDGES (Paper Block)
               ============================================ */
            .book > .edge-top {
                position: absolute;
                width: calc(var(--book-width) - 4px); /* Stop at the page face */
                height: var(--book-depth);
                top: 0;
                left: 0;
                
                /* Match Paper Texture */
                background: 
                    linear-gradient(90deg, #fdfbf7 0%, #fff 50%, #fdfbf7 100%),
                    repeating-linear-gradient(90deg,
                        transparent 0px, transparent 2px,
                        rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 3px
                    );
                
                /* Top Edge: rotated 90 around X. Center Y shifts to -Depth/2. */
                transform: translateY(calc(var(--book-depth) / -2)) rotateX(90deg);
            }

            .book > .edge-bottom {
                position: absolute;
                width: calc(var(--book-width) - 4px);
                height: var(--book-depth);
                bottom: 0;
                left: 0;
                
                /* Match Paper Texture */
                background: 
                    linear-gradient(90deg, #fdfbf7 0%, #fff 50%, #fdfbf7 100%),
                    repeating-linear-gradient(90deg,
                        transparent 0px, transparent 2px,
                        rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 3px
                    );
                
                transform: translateY(calc(var(--book-depth) / 2)) rotateX(-90deg);
            }

            /* Shadow */
            .book-shadow {
                position: absolute;
                bottom: 20px;
                width: 300px;
                height: 40px;
                background: radial-gradient(ellipse, rgba(0,0,0,0.3) 0%, transparent 70%);
                filter: blur(15px);
                transform: rotateX(90deg) translateZ(-160px); /* Position on "floor" */
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
                    // Slight delay to ensure visibility before render
                    setTimeout(() => {
                        this.render3DBook();
                    }, 50);
                }
            });
        });

        // Navigation buttons
        const isLTR = () => {
            const container = document.getElementById('canvas-container');
            return container ? container.classList.contains('force-ltr') : false;
        };

        document.getElementById('flip-prev').addEventListener('click', () => {
            isLTR() ? this.prevPage() : this.nextPage();
        });
        document.getElementById('flip-next').addEventListener('click', () => {
            isLTR() ? this.nextPage() : this.prevPage();
        });

        // Keyboard navigation
        this.keyHandler = (e) => {
            if (!this.isOpen) return;
            if (e.key === 'ArrowLeft') {
                isLTR() ? this.prevPage() : this.nextPage();
            }
            if (e.key === 'ArrowRight') {
                isLTR() ? this.nextPage() : this.prevPage();
            }
            if (e.key === 'Escape') this.close();
        };
        document.addEventListener('keydown', this.keyHandler);

        // 3D rotation slider
        const rotationSlider = document.getElementById('book-rotation');
        rotationSlider.addEventListener('input', (e) => {
            const rotation = parseInt(e.target.value);

            // Check active view
            const is3D = document.getElementById('preview-3d').classList.contains('active');

            if (is3D && this.ultimateBook) {
                this.ultimateBook.setRotation(rotation);
            } else {
                const book = document.querySelector('.book');
                if (book) {
                    book.style.transform = `rotateY(${rotation}deg) rotateX(10deg)`;
                }
            }
        });

        // Mouse drag rotation for 3D book
        let isDragging = false;
        let startX = 0;
        let startRotationY = -35;

        const book3DContainer = document.querySelector('.book-3d-container');
        if (book3DContainer) {
            book3DContainer.addEventListener('mousedown', (e) => {
                const book = document.querySelector('.book');
                if (!book) return;

                isDragging = true;
                startX = e.clientX;
                // Get current rotation
                const transform = book.style.transform;
                const match = transform.match(/rotateY\((-?\d+)deg\)/);
                startRotationY = match ? parseInt(match[1]) : -35;

                book3DContainer.style.cursor = 'grabbing';
                book.style.transition = 'none';
                e.preventDefault();
            });

            document.addEventListener('mousemove', (e) => {
                if (!isDragging) return;

                const deltaX = e.clientX - startX;
                const newRotationY = startRotationY + deltaX * 0.5;
                const normalizedRotation = (newRotationY % 360 + 360) % 360;

                const is3D = document.getElementById('preview-3d').classList.contains('active');

                if (is3D && this.ultimateBook) {
                    this.ultimateBook.setRotation(normalizedRotation);
                } else {
                    const book = document.querySelector('.book');
                    if (book) {
                        book.style.transform = `rotateY(${newRotationY}deg) rotateX(10deg)`;
                    }
                }

                // Sync slider
                rotationSlider.value = normalizedRotation;
            });

            document.addEventListener('mouseup', () => {
                if (isDragging) {
                    isDragging = false;
                    book3DContainer.style.cursor = 'grab';
                    const book = document.querySelector('.book');
                    if (book && !this.ultimateBook) book.style.transition = 'transform 0.1s ease-out';
                }
            });

            book3DContainer.style.cursor = 'grab';
        }

        // Generate PDF button
        document.getElementById('btn-generate-pdf').addEventListener('click', () => this.generatePDF());
    }

    /**
     * Navigate to previous page
     */
    prevPage() {
        const is3DView = document.getElementById('preview-3d')?.classList.contains('active');

        if (is3DView && this.ultimateBook) {
            // Let the 3D book handle its own boundaries
            if (this.ultimateBook.isAnimating) return;
            const flipped = this.ultimateBook.pages.filter(p => p.isFlipped);
            if (flipped.length > 0) {
                this.ultimateBook.prevPage();
            }
        } else if (this.currentPageIndex > -1) {
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
        const is3DView = document.getElementById('preview-3d')?.classList.contains('active');

        if (is3DView && this.ultimateBook) {
            // Let the 3D book handle its own boundaries
            if (this.ultimateBook.isAnimating) return;
            const unflipped = this.ultimateBook.pages.filter(p => !p.isFlipped);
            if (unflipped.length > 0) {
                this.ultimateBook.nextPage();
            }
        } else {
            const spreadCount = Math.ceil(this.contentPages.length / 2);
            const maxIndex = spreadCount;
            if (this.currentPageIndex < maxIndex) {
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
    }

    /**
     * Go to specific page
     */
    goToPage(index) {
        this.currentPageIndex = index;

        const is3DView = document.getElementById('preview-3d').classList.contains('active');

        if (is3DView && this.ultimateBook) {
            this.ultimateBook.jumpToPage(this.currentPageIndex);
            // Also need to update thumbnails for UI consistency
            this.updateThumbnailSelection();
        } else {
            this.renderCurrentView();
            // renderCurrentView calls updateThumbnailSelection internally? No, separate call usually.
            // But let's check renderCurrentView... it updates DOM but maybe not thumbs?
            // Existing code for goToPage click (in renderThumbnails, not shown) likely calls goToPage.
            // So we should update thumbs here if not done.
            // renderCurrentView updates the view.
        }

        this.updateThumbnailSelection();
    }

    /**
     * Render the current page view (Flipbook Mode)
     * Handles Spread Rendering:
     * - Index -1: Front Cover
     * - Index 0: Page 1 + Page 2
     * - Index N: Page (2N+1) + Page (2N+2)
     * - Index Last: Back Cover
     */
    /**
     * Render the current page view (Flipbook Mode)
     */
    renderCurrentView() {
        console.log('[Preview] renderCurrentView index:', this.currentPageIndex);
        const container = document.getElementById('flipbook-page');
        const indicator = document.getElementById('page-indicator');
        const prevBtn = document.getElementById('flip-prev');
        const nextBtn = document.getElementById('flip-next');

        if (!container) return;
        container.innerHTML = '';
        container.className = 'flipbook-page';

        const spreadCount = Math.ceil(this.contentPages.length / 2);
        const maxIndex = spreadCount;

        // In RTL (Hebrew), arrows are swapped: left=next, right=prev
        // So disabled states must also be swapped
        const isAtStart = this.currentPageIndex <= -1;
        const isAtEnd = this.currentPageIndex >= maxIndex;
        const canvasContainer = document.getElementById('canvas-container');
        const ltr = canvasContainer ? canvasContainer.classList.contains('force-ltr') : false;

        if (ltr) {
            prevBtn.disabled = isAtStart;
            nextBtn.disabled = isAtEnd;
        } else {
            // RTL: left arrow (prevBtn) = nextPage, right arrow (nextBtn) = prevPage
            prevBtn.disabled = isAtEnd;   // left arrow disabled at end
            nextBtn.disabled = isAtStart; // right arrow disabled at start
        }

        // 1. FRONT COVER 
        if (this.currentPageIndex === -1) {
            indicator.textContent = 'Front Cover';
            container.classList.add('view-cover');
            this.renderFrontCoverToContainer(container);
            return;
        }

        // 2. BACK COVER 
        if (this.currentPageIndex === spreadCount) {
            indicator.textContent = 'Back Cover';
            container.classList.add('view-cover');
            this.renderBackCoverToContainer(container);
            return;
        }

        // 3. SPREAD VIEW 
        container.classList.add('view-spread');

        const leftPageIndex = this.currentPageIndex * 2;
        const rightPageIndex = (this.currentPageIndex * 2) + 1;

        console.log('[Preview] Spread Indices:', leftPageIndex, rightPageIndex);

        const leftPage = this.contentPages[leftPageIndex];
        const rightPage = this.contentPages[rightPageIndex];

        const p1Num = leftPageIndex + 1;
        const p2Num = rightPageIndex + 1;
        indicator.textContent = `Pages ${p1Num}-${Math.min(p2Num, this.contentPages.length)}`;

        container.style.display = 'flex';
        container.style.flexDirection = 'row';

        // Left Slot
        const leftSlot = document.createElement('div');
        leftSlot.className = 'spread-slot left-page';
        leftSlot.style.flex = '1';
        leftSlot.style.height = '100%';
        leftSlot.style.position = 'relative';
        leftSlot.style.overflow = 'hidden';
        leftSlot.style.borderRight = '1px solid rgba(0,0,0,0.1)';

        if (leftPage) {
            this.renderPageToContainer(leftPage, leftSlot);
        } else {
            leftSlot.style.background = '#fcfaf7';
        }
        container.appendChild(leftSlot);

        // Right Slot
        const rightSlot = document.createElement('div');
        rightSlot.className = 'spread-slot right-page';
        rightSlot.style.flex = '1';
        rightSlot.style.height = '100%';
        rightSlot.style.position = 'relative';
        rightSlot.style.overflow = 'hidden';

        if (rightPage) {
            this.renderPageToContainer(rightPage, rightSlot);
        } else {
            rightSlot.style.background = '#fcfaf7';
            rightSlot.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#ccc;font-style:italic;">End of Album</div>';
        }
        container.appendChild(rightSlot);

        // --- DYNAMIC SIZING ---
        let editorW = 1200;
        let editorH = 1600;

        if (this.templateConfig?.designSystem?.canvas) {
            editorW = this.templateConfig.designSystem.canvas.width || 800;
            editorH = this.templateConfig.designSystem.canvas.height || 600;
        } else if (this.templateConfig?.pageSize) {
            editorW = this.templateConfig.pageSize.width;
            editorH = this.templateConfig.pageSize.height;
        }

        const MAX_H = 600;
        const MAX_W = 1000;

        const spreadW = editorW * 2;
        const spreadH = editorH;

        let targetH = MAX_H;
        let targetW = targetH * (spreadW / spreadH);

        if (targetW > MAX_W) {
            targetW = MAX_W;
            targetH = targetW * (spreadH / spreadW);
        }

        container.style.width = `${targetW}px`;
        container.style.height = `${targetH}px`;

        // Apply fit to Left and Right Pages
        if (leftPage && leftSlot) {
            this.fitContentToContainer(leftSlot, 'right'); // Align right (to spine)
        }
        if (rightPage && rightSlot) {
            this.fitContentToContainer(rightSlot, 'left'); // Align left (to spine)
        }
    }

    /**
     * Render a standard page to a container
     */
    renderPageToContainer(page, container) {
        if (!page || !container) return;

        container.innerHTML = '';

        // Try to identify the correct renderer
        // Pages usually have a templateId if they were created with one
        // Fallback to the global template config ID, checking both 'id' and 'templateId' keys
        const templateId = page.templateId || this.templateConfig?.templateId || this.templateConfig?.id;
        const renderer = this.getRenderer(templateId);

        if (renderer) {
            try {
                // RESOLVE LAYOUT DEFINITION
                let layoutDef = page.layout; // Default to what's on the page

                // 1. Try to find the static layout definition in the template config
                // Store pages typically have layout: { id: '...' } or just an ID string
                if (this.templateConfig && this.templateConfig.pageLayouts) {
                    const layoutId = (page.layout && page.layout.id) ? page.layout.id :
                        (typeof page.layout === 'string' ? page.layout : page.layoutId);

                    const foundLayout = this.templateConfig.pageLayouts.find(l => l.layoutId === layoutId);
                    if (foundLayout) {
                        layoutDef = foundLayout;
                        console.log(`[Preview] Resolved layout '${layoutId}' from template.`);
                    }
                }

                // 2. Compatibility Shim: If layout has 'slots' (LayoutEngine) but not 'photoSlots' (TemplateRenderer), map it.
                if (layoutDef && layoutDef.slots && !layoutDef.photoSlots) {
                    layoutDef = {
                        ...layoutDef,
                        layoutId: layoutDef.id || 'dynamic',
                        photoSlots: layoutDef.slots.map(s => ({
                            slotId: s.id || s.slotId,
                            position: { x: s.x + '%', y: s.y + '%' },
                            size: { width: s.w + '%', height: s.h + '%' },
                            photoFit: 'cover',
                            photoStyle: 'default'
                        })),
                        textElements: []
                    };
                    console.log('[Preview] Shimmed dynamic layout for template renderer.');
                }

                // 3. Rebuild accurate photos array from slots to prevent 'undefined' photo crashes
                let photosArray = [];
                if (layoutDef.photoSlots && page.layout && page.layout.slots) {
                    layoutDef.photoSlots.forEach((slotDef, i) => {
                        const pageSlot = page.layout.slots.find(s => s.slotId === slotDef.slotId || (s.id && s.id.includes(slotDef.slotId))) || page.layout.slots[i];
                        if (pageSlot && pageSlot.photoId && this.assets && this.assets.photos) {
                            const photoObj = this.assets.photos.find(p => p.id === pageSlot.photoId);
                            photosArray.push(photoObj || null);
                        } else {
                            photosArray.push(null);
                        }
                    });
                } else {
                    // Fallback to minimal array if not layout based
                    photosArray = page.photos || [];
                }

                // 4. Render
                const pageEl = renderer.renderPage(
                    layoutDef || {},
                    photosArray,
                    page.textContent || {},
                    page.textPositions || {}
                );

                // Ensure page element fills the container
                if (pageEl) {
                    pageEl.style.width = '100%';
                    pageEl.style.height = '100%';
                    container.appendChild(pageEl);

                    // INJECT CROP STYLES FOR PREVIEW MATCH
                    if (page.layout && page.layout.slots) {
                        page.layout.slots.forEach((slot, index) => {
                            const slotContainers = pageEl.querySelectorAll('.photo-slot');
                            const slotContainer = pageEl.querySelector(`.photo-slot[data-selectable-id="${slot.photoId}"]`) || slotContainers[index];
                            if (slotContainer) {
                                const img = slotContainer.querySelector('img');
                                if (img && slot.crop && slot.photoId && this.assets && this.assets.photos) {
                                    const asset = this.assets.photos.find(a => a.id === slot.photoId);
                                    if (asset) {
                                        const panX = slot.crop.panX !== undefined ? slot.crop.panX : 50;
                                        const panY = slot.crop.panY !== undefined ? slot.crop.panY : 50;
                                        const zoom = slot.crop.zoom || 1;
                                        img.style.objectPosition = `${panX}% ${panY}%`;
                                        img.style.transform = `scale(${zoom})`;
                                        img.style.transformOrigin = 'center center';
                                    }
                                }
                            }
                        });
                    }

                    // INJECT USER ELEMENTS (text, shapes, visual elements like flags)
                    this._injectPageElements(page, pageEl);
                } else {
                    console.error('[Preview] Renderer returned null for page:', page);
                    container.innerHTML = '<div style="color:red;padding:20px;">Render Error</div>';
                }
            } catch (err) {
                console.error('[Preview] Error rendering page:', err);
                container.innerHTML = `<div style="color:red;padding:20px;">Error: ${err.message}</div>`;
            }
        } else {
            // Fallback to Generic RenderEngine
            // This handles Magic Create pages and standard layouts that don't need a specific class
            try {
                this.fallbackRenderer.renderPageToContainer(page, this.assets, container);
                // Elements are already injected by RenderEngine
            } catch (err) {
                console.error('[Preview] Generic render error:', err);
                container.innerHTML = `<div style="color:red;padding:20px;">Generic Render Error: ${err.message}</div>`;
            }
        }
    }

    /**
     * Inject user-placed elements (text, shapes, visual elements) into a rendered page.
     * These are stored in page.elements and include drag transforms from Moveable.
     */
    _injectPageElements(page, pageEl) {
        if (!page.elements || !Array.isArray(page.elements) || page.elements.length === 0) return;

        console.log(`[Preview] Injecting ${page.elements.length} elements into page ${page.id}`);

        page.elements.forEach(el => {
            const domEl = document.createElement('div');
            domEl.className = `page-element element-${el.type}`;
            domEl.style.position = 'absolute';
            domEl.style.left = `${el.x}%`;
            domEl.style.top = `${el.y}%`;
            if (el.zIndex !== undefined) domEl.style.zIndex = el.zIndex;

            // Apply drag/resize transform from Moveable
            if (el.transform) domEl.style.transform = el.transform;

            if (el.type === 'text') {
                domEl.classList.add('text-element');
                domEl.style.minWidth = '200px';
                if (el.pixelWidth) domEl.style.width = el.pixelWidth;
                if (el.pixelHeight) domEl.style.height = el.pixelHeight;
                domEl.style.maxWidth = `${el.width || 50}%`;
                if (!el.zIndex) domEl.style.zIndex = 10;

                if (window.TEXT_STYLES) {
                    const styleDef = window.TEXT_STYLES.find(s => s.id === el.styleId);
                    if (styleDef) Object.assign(domEl.style, styleDef.style);
                }

                if (el.fontSize) domEl.style.fontSize = `${el.fontSize}px`;
                if (el.color) domEl.style.color = el.color;
                if (el.fontFamily) domEl.style.fontFamily = el.fontFamily;
                if (el.textAlign) domEl.style.textAlign = el.textAlign;
                domEl.textContent = el.content;

                // Hebrew detection
                const hebrewRegex = /[\u0590-\u05FF]/;
                if (hebrewRegex.test(el.content)) {
                    domEl.style.direction = 'rtl';
                    domEl.style.textAlign = el.textAlign || 'right';
                    domEl.style.unicodeBidi = 'plaintext';
                    if (!el.fontFamily) {
                        domEl.style.fontFamily = "'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif";
                    }
                }
            } else if (el.type === 'shape') {
                domEl.classList.add('shape-element');
                if (el.subtype) domEl.classList.add(el.subtype);
                domEl.style.width = `${el.width}%`;
                domEl.style.height = `${el.height}%`;
                if (el.color) domEl.style.backgroundColor = el.color;
            } else if (el.type === 'element') {
                domEl.classList.add('visual-element');
                domEl.style.width = el.pixelWidth || '100px';
                domEl.style.height = el.pixelHeight || '100px';

                const img = document.createElement('img');
                img.src = el.url;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'contain';
                img.draggable = false;

                let filterStr = '';
                if (el.filterHue) filterStr += `hue-rotate(${el.filterHue}deg) `;
                if (el.filterBrightness && el.filterBrightness !== 100) filterStr += `brightness(${el.filterBrightness}%) `;
                if (el.filterShadow) filterStr += `drop-shadow(2px 4px 6px ${el.filterShadowColor || 'rgba(0,0,0,0.5)'}) `;
                if (filterStr) img.style.filter = filterStr.trim();

                domEl.appendChild(img);
            }

            pageEl.appendChild(domEl);
        });
    }

    /**
     * Render FRONT cover only to a container
     */
    renderFrontCoverToContainer(container) {
        // Normalize config to ensure templateId is available
        const config = this.templateConfig || {};
        const fallbackId = this.cover?.templateId || (this.contentPages && this.contentPages[0] && this.contentPages[0].templateId);
        const safeConfig = {
            ...config,
            templateId: config.templateId || config.id || fallbackId
        };

        // Use the UNIFIED cover renderer to generate the full spread in memory
        // We pass 'container: null' so we can manipulate the result before attaching
        const fullSpreadWrapper = UnifiedCoverRenderer.render({
            cover: this.cover,
            assets: this.assets,
            templateConfig: safeConfig,
            container: null,
            interactive: false,
            thumbnail: false
        });

        // Extract only the FRONT COVER section
        const frontSection = fullSpreadWrapper.querySelector('.front-cover');

        container.innerHTML = '';

        if (frontSection) {
            frontSection.style.width = '100%';
            frontSection.style.height = '100%';
            frontSection.style.boxShadow = 'none'; // Container has shadow
            container.appendChild(frontSection);
        } else {
            container.appendChild(fullSpreadWrapper);
        }
    }

    /**
     * Render BACK cover only to a container
     */
    renderBackCoverToContainer(container) {
        // Normalize config to ensure templateId is available
        const config = this.templateConfig || {};
        const fallbackId = this.cover?.templateId || (this.contentPages && this.contentPages[0] && this.contentPages[0].templateId);
        const safeConfig = {
            ...config,
            templateId: config.templateId || config.id || fallbackId
        };

        // Use the UNIFIED cover renderer to generate the full spread in memory
        const fullSpreadWrapper = UnifiedCoverRenderer.render({
            cover: this.cover,
            assets: this.assets,
            templateConfig: safeConfig,
            container: null,
            interactive: false,
            thumbnail: false
        });

        // Extract only the BACK COVER section
        const backSection = fullSpreadWrapper.querySelector('.back-cover');

        container.innerHTML = '';

        if (backSection) {
            backSection.style.width = '100%';
            backSection.style.height = '100%';
            backSection.style.boxShadow = 'none';
            container.appendChild(backSection);
        } else {
            // Fallback
            container.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;background:#f0f0f0;">Back Cover</div>';
        }
    }

    /**
     * Scale content to fit container (contain)
     * @param {HTMLElement} container 
     * @param {string} align - 'center' | 'left' | 'right'
     */
    fitContentToContainer(container, align = 'center') {
        const content = container.firstElementChild;
        if (!content) return;

        let editorW = 1200;
        let editorH = 1600;

        if (this.templateConfig?.designSystem?.canvas) {
            editorW = this.templateConfig.designSystem.canvas.width || 800;
            editorH = this.templateConfig.designSystem.canvas.height || 600;
        } else if (this.templateConfig?.pageSize) {
            editorW = this.templateConfig.pageSize.width;
            editorH = this.templateConfig.pageSize.height;
        }

        const parentW = parseFloat(container.parentElement?.style.width) || (editorW * 2);
        const parentH = parseFloat(container.parentElement?.style.height) || editorH;

        const targetW = parentW / 2;
        const targetH = parentH;

        // Create stage
        const stage = document.createElement('div');
        stage.style.cssText = `
            position: absolute;
            width: ${editorW}px;
            height: ${editorH}px;
            transform-origin: top left;
            overflow: hidden; 
            direction: ltr;
        `;
        stage.appendChild(content);
        container.appendChild(stage);

        const scaleX = targetW / editorW;
        const scaleY = targetH / editorH;
        const scale = Math.min(scaleX, scaleY);

        stage.style.transform = `scale(${scale})`;

        const scaledW = editorW * scale;
        const scaledH = editorH * scale;

        let offsetX = (targetW - scaledW) / 2; // Default Center

        if (align === 'left') {
            offsetX = 0;
        } else if (align === 'right') {
            offsetX = targetW - scaledW;
        }

        const offsetY = (targetH - scaledH) / 2;

        stage.style.left = `${offsetX}px`;
        stage.style.top = `${offsetY}px`;

        if (content.style) {
            content.style.width = '100%';
            content.style.height = '100%';
        }
    }

    /**
     * Scale the preview content to fit the 3D face 1:1
     * Uses explicit dimensions to avoid 3D transform distortion from getBoundingClientRect
     */
    fitPreviewToFace(faceEl, targetWidth, targetHeight) {
        const pageEl = faceEl.firstElementChild;
        if (!pageEl) return;

        // Force the page element to fill its container (the stage)
        pageEl.style.width = '100%';
        pageEl.style.height = '100%';
        pageEl.style.position = 'absolute';
        pageEl.style.top = '0';
        pageEl.style.left = '0';

        let editorW = 1200;
        let editorH = 1600;

        if (this.templateConfig?.designSystem?.canvas) {
            editorW = this.templateConfig.designSystem.canvas.width || 800;
            editorH = this.templateConfig.designSystem.canvas.height || 600;
        } else if (this.templateConfig?.pageSize) {
            editorW = this.templateConfig.pageSize.width;
            editorH = this.templateConfig.pageSize.height;
        }

        // Create a scaling stage
        const stage = document.createElement('div');
        stage.style.cssText = `
            position: absolute;
            width: ${editorW}px;
            height: ${editorH}px;
            transform-origin: top left;
            pointer-events: none;
            overflow: hidden; /* Ensure content doesn't bleed */
        `;

        // Wrap content
        stage.appendChild(pageEl);

        faceEl.innerHTML = '';
        faceEl.appendChild(stage);

        // Calculate Scale Factors (Stretch/Fill)
        const w = targetWidth || 288;
        const h = targetHeight || 384;

        const scaleX = w / editorW;
        const scaleY = h / editorH;

        stage.style.transform = `scale(${scaleX}, ${scaleY})`;

        // Position at origin (since we are filling exact dimensions)
        stage.style.left = '0px';
        stage.style.top = '0px';
    }

    /**
     * Get the appropriate renderer for a template
     */
    getRenderer(templateId) {
        // if (!this.templateConfig) return null; // Allow renderers to fallback to defaults

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

        // Front Cover thumbnail (Index -1)
        const frontCoverThumb = document.createElement('div');
        frontCoverThumb.className = 'preview-thumb active';
        frontCoverThumb.dataset.index = '-1';

        // Front Cover Photo or Gallery Cover Thumbnail
        if (this.cover?.frontPhotoId && this.assets?.photos) {
            const photo = this.assets.photos.find(p => p.id === this.cover.frontPhotoId);
            if (photo) {
                frontCoverThumb.innerHTML = `<img src="${photo.thumbnailUrl || photo.url}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                frontCoverThumb.innerHTML = `<div style="background:${this.cover?.color || '#1a1a2e'};display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;">Front</div>`;
            }
        } else if (this.cover?._coverGalleryId && this.cover?.background) {
            // Gallery cover with SVG illustration — render as thumbnail background
            frontCoverThumb.innerHTML = `<div style="background-color:${this.cover?.color || '#f5f0e8'};background-image:url('${this.cover.background}');background-size:cover;background-position:center;width:100%;height:100%;display:flex;align-items:flex-end;justify-content:center;"><span style="color:${this.cover?.textColor || '#333'};font-size:0.45rem;text-align:center;padding:2px;">${this.cover?.title || ''}</span></div>`;
        } else {
            frontCoverThumb.innerHTML = `<div style="background:${this.cover?.color || '#1a1a2e'};display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;">Front</div>`;
        }
        frontCoverThumb.addEventListener('click', () => this.goToPage(-1));
        container.appendChild(frontCoverThumb);

        // Page/Spread Thumbnails (Index 0..N)
        const spreadCount = Math.ceil(this.contentPages.length / 2);
        for (let i = 0; i < spreadCount; i++) {
            const thumb = document.createElement('div');
            thumb.className = 'preview-thumb';
            thumb.dataset.index = i.toString();
            const pageNum1 = (i * 2) + 1;
            const pageNum2 = (i * 2) + 2;
            let thumbText = `${pageNum1}`;
            if (pageNum2 <= this.contentPages.length) {
                thumbText += `-${pageNum2}`;
            }
            thumb.innerHTML = `<div style="background:#f0f0f0;display:flex;align-items:center;justify-content:center;color:#666;font-size:0.7rem;">${thumbText}</div>`;
            thumb.addEventListener('click', () => this.goToPage(i));
            container.appendChild(thumb);
        }

        // Back Cover Thumbnail (Index = spreadCount)
        const backCoverThumb = document.createElement('div');
        backCoverThumb.className = 'preview-thumb';
        backCoverThumb.dataset.index = spreadCount.toString();

        if (this.cover?.backPhotoId && this.assets?.photos) {
            const photo = this.assets.photos.find(p => p.id === this.cover.backPhotoId);
            if (photo) {
                backCoverThumb.innerHTML = `<img src="${photo.thumbnailUrl || photo.url}" style="width:100%;height:100%;object-fit:cover;">`;
            } else {
                backCoverThumb.innerHTML = `<div style="background:${this.cover?.color || '#1a1a2e'};display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;">Back</div>`;
            }
        } else {
            backCoverThumb.innerHTML = `<div style="background:${this.cover?.color || '#1a1a2e'};display:flex;align-items:center;justify-content:center;color:white;font-size:0.6rem;">Back</div>`;
        }
        backCoverThumb.addEventListener('click', () => this.goToPage(spreadCount));
        container.appendChild(backCoverThumb);
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
     * Animate Z-Index for flipping sheet
     */
    /**
     * Animate Z-Index for flipping sheet (Legacy Flipbook)
     */
    /**
     * Animate Z-Index for flipping sheet (Legacy)
     */
    animateFlip(sheetIndex) {
        // Not used
    }

    /**
     * Updates the 3D transforms (Legacy)
     */
    update3DPageFlips(activeIndex) {
        // Not used - handled by UltimateBook3D
    }

    /**
     * Renders the Ultimate High-Fidelity 3D book.
     */
    render3DBook() {
        const container = document.getElementById('book-3d');
        if (!container) return;

        // Callback to render specific page data to a DOM container (for rasterization)
        const renderCallback = async (sheetData, renderContainer) => {
            // sheetData: { type, part, data, index }

            // Clear
            renderContainer.innerHTML = '';

            if (sheetData.type === 'cover') {
                const wrapper = UnifiedCoverRenderer.render({
                    cover: sheetData.data,
                    assets: this.assets,
                    templateConfig: this.templateConfig,
                    container: null,
                    interactive: false
                });

                let partEl = null;
                // Determine which part to show based on `part` string
                // My UltimateBook3D uses: 'front', 'back', 'inner', 'inner-back'

                if (sheetData.part === 'front') partEl = wrapper.querySelector('.front-cover');
                else if (sheetData.part === 'back') partEl = wrapper.querySelector('.back-cover');
                else {
                    // Inner covers
                    partEl = document.createElement('div');
                    partEl.style.width = '100%';
                    partEl.style.height = '100%';
                    partEl.style.background = '#fcfbf8'; // Paper white
                }

                if (partEl) {
                    partEl.style.width = '100%';
                    partEl.style.height = '100%';
                    partEl.style.boxShadow = 'none';
                    renderContainer.appendChild(partEl);
                } else {
                    renderContainer.appendChild(wrapper);
                }

            } else if (sheetData.type === 'page') {
                // Render Page Content
                this.renderPageToContainer(sheetData.data, renderContainer);

                // Force size to container (Scaling)
                // Force size to container (No Scaling needed if container matches template)
                const content = renderContainer.firstElementChild;
                if (content && content.style) {
                    content.style.transformOrigin = 'top left';
                    content.style.transform = 'none';
                    content.style.width = '100%';
                    content.style.height = '100%';
                }
            }
        };

        this.ultimateBook = new UltimateBook3D(container, renderCallback);

        // Ensure container has layout before init (fix for 0x0 issue)
        requestAnimationFrame(() => {
            if (container.clientWidth === 0) {
                // Force display if needed or wait
                setTimeout(() => this.ultimateBook.init(this.contentPages, this.cover, this.templateConfig), 50);
            } else {
                this.ultimateBook.init(this.contentPages, this.cover, this.templateConfig);
            }
        });
    }

    // --- STYLING UPDATE FOR BUTTONS ---
    injectStyles() {
        if (document.getElementById('album-preview-styles')) return;

        const style = document.createElement('style');
        style.id = 'album-preview-styles';
        style.textContent = `
            /* ... (Previous Styles) ... */
             
             /* NAV BUTTONS */
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
                position: absolute; /* Changed to Absolute */
                top: 50%;
                transform: translateY(-50%);
                z-index: 1000;
            }
            
            #flip-prev {
                 left: 40px;
            }
            
            #flip-next {
                 right: 40px;
            }

            .flip-nav:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-50%) scale(1.1); /* Keep vertical align */
            }

            /* ... (Rest of Styles) ... */
            
            #album-preview-modal {
                position: fixed;
                inset: 0;
                background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                animation: fadeIn 0.3s ease;
            }
            
            /* (Include truncated styles for completeness) */
            .preview-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 24px; background: rgba(0, 0, 0, 0.3); border-bottom: 1px solid rgba(255, 255, 255, 0.1); }
            .preview-title { display: flex; align-items: center; gap: 12px; font-size: 1.2rem; font-weight: 600; color: white; }
            .preview-title i { color: #8b5cf6; }
            .preview-controls { display: flex; gap: 8px; }
            .preview-view-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(255, 255, 255, 0.1); border: 1px solid rgba(255, 255, 255, 0.2); border-radius: 8px; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
            .preview-view-btn:hover { background: rgba(255, 255, 255, 0.15); color: white; }
            .preview-view-btn.active { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-color: transparent; color: white; }
            .preview-close-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 50%; color: #94a3b8; cursor: pointer; transition: all 0.2s; }
            .preview-close-btn:hover { background: #ef4444; color: white; }
            .preview-content { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; }
            
            /* Flipbook */
            .preview-flipbook { display: none; width: 100%; height: 100%; align-items: center; justify-content: center; gap: 24px; }
            .preview-flipbook.active { display: flex; }
            .flipbook-container { position: relative; perspective: 2000px; }
            .flipbook-page { width: 800px; height: 600px; background: white; border-radius: 4px; box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0, 0, 0, 0.1); overflow: hidden; transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1); transform-style: preserve-3d; }
            .flipbook-page.flipping-left { animation: flipLeft 0.6s ease; }
            .flipbook-page.flipping-right { animation: flipRight 0.6s ease; }
            @keyframes flipLeft { 0% { transform: rotateY(0deg); } 50% { transform: rotateY(-15deg); } 100% { transform: rotateY(0deg); } }
            @keyframes flipRight { 0% { transform: rotateY(0deg); } 50% { transform: rotateY(15deg); } 100% { transform: rotateY(0deg); } }
            .page-indicator { text-align: center; margin-top: 16px; color: #64748b; font-size: 0.9rem; }
            
            /* 3D View - Styles now loaded from css/book-3d-enhanced.css */
            .preview-3d { display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; }
            .preview-3d.active { display: flex; }
            .book-3d-container { perspective: 2000px; flex: 1; display: flex; align-items: center; justify-content: center; cursor: grab; user-select: none; }
            .book-3d-container:active { cursor: grabbing; }
            
            /* Responsive */
            @media (max-width: 900px) {
                height: var(--book-thickness);
                top: 0;
                bottom: auto;
                transform: rotateX(90deg);
                transform-origin: top;
                background-image: repeating-linear-gradient(to bottom, #fdfbf7 0px, #fdfbf7 2px, #e2e8f0 3px);
            }
            .book3d-page-block-face.bottom {
                height: var(--book-thickness);
                bottom: 0;
                top: auto;
                transform: rotateX(-90deg);
                transform-origin: bottom;
                background-image: repeating-linear-gradient(to bottom, #fdfbf7 0px, #fdfbf7 2px, #e2e8f0 3px);
            }
            
            .book-3d-controls { padding: 20px; color: white; display: flex; flex-direction: column; align-items: center; gap: 10px; z-index: 10; }
            .preview-footer { padding: 16px 24px; background: rgba(0, 0, 0, 0.3); border-top: 1px solid rgba(255, 255, 255, 0.1); display: flex; flex-direction: column; gap: 16px; }
            .preview-thumbnails { display: flex; gap: 12px; overflow-x: auto; padding: 8px 0; justify-content: center; }
            .preview-thumb { width: 100px; height: 75px; background: white; border-radius: 4px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; flex-shrink: 0; }
            .preview-thumb:hover { transform: scale(1.05); }
            .preview-thumb.active { border-color: #8b5cf6; box-shadow: 0 0 0 2px rgba(139, 92, 246, 0.3); }
            .preview-thumb img, .preview-thumb > div { width: 100%; height: 100%; object-fit: cover; }
            .preview-actions { display: flex; justify-content: center; }
            .btn-generate-pdf { display: flex; align-items: center; gap: 12px; padding: 14px 32px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 12px; color: white; font-size: 1rem; font-weight: 600; cursor: pointer; transition: all 0.2s; }
            .btn-generate-pdf:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(99, 102, 241, 0.4); }
        `;
        document.head.appendChild(style);
    }

    /**
     * Interaction Logic (Strict Match to Snippet)
     */
    initBookInteraction(root, stage) {
        let isDragging = false;
        let startX = 0;
        let currentRotY = -25;

        const slider = document.getElementById('book-rotation'); // Changed ID to match APP HTML

        // Helper to set rotation
        const setRot = (y) => {
            stage.style.transform = `rotateX(10deg) rotateY(${y}deg)`;
            // Sync slider if rotated manually
            if (slider) slider.value = (y + 25);
        };

        // Initialize 3D Navigation Buttons explicitly
        const prevBtn = document.getElementById('flip-prev');
        const nextBtn = document.getElementById('flip-next');

        const handleNext = (e) => {
            e.stopPropagation();
            if (this.book3D) this.book3D.nextPage();
        };

        const handlePrev = (e) => {
            e.stopPropagation();
            if (this.book3D) this.book3D.prevPage();
        };

        if (prevBtn) {
            // Remove old listeners by cloning
            const newPrev = prevBtn.cloneNode(true);
            prevBtn.parentNode.replaceChild(newPrev, prevBtn);
            newPrev.addEventListener('click', handlePrev);
            // newPrev.addEventListener('touchend', handlePrev);
        }

        if (nextBtn) {
            const newNext = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            newNext.addEventListener('click', handleNext);
            // newNext.addEventListener('touchend', handleNext);
        }

        // Slider Event
        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value);
                // Rotate the Book Group inside UltimateBook3D, not the stage div?
                // Actually UltimateBook3D has orbit controls, but we can override Y rotation of group?
                // The current implementation rotates the #book-3d DIV via CSS transform3d?
                // No, UltimateBook3D uses WebGL. CSS transforms on container won't rotate the 3D camera.
                // We should hook this slider to orbital controls or bookGroup rotation.

                if (this.book3D && this.book3D.bookGroup) {
                    // Map 0-100 to -180 to 180?
                    // val is rotation offset?
                    // Let's just rotate the group
                    const deg = (val - 50) * 3.6; // -180 to 180
                    this.book3D.bookGroup.rotation.y = deg * (Math.PI / 180);
                }
            });
        }

        // Drag Events (Optional - OrbitControls handles this usually)
        // If we want to keep CSS interactions for fallback css-book:
        const onStart = (x) => {
            isDragging = true;
            startX = x;
            if (stage) stage.style.transition = 'none';
            if (root) root.style.cursor = 'grabbing';
        };

        const onMove = (x) => {
            if (!isDragging) return;
            const diff = x - startX;
            // setRot(currentRotY + (diff * 0.5)); 
        };

        const onEnd = (x) => {
            if (!isDragging) return;
            isDragging = false;
            const diff = x - startX;
            currentRotY += (diff * 0.5);
            stage.style.transition = 'transform 0.2s ease-out'; // 0.2s from snippet
            root.style.cursor = 'grab';
        };

        // Mouse
        root.onmousedown = (e) => onStart(e.clientX);
        window.onmousemove = (e) => onMove(e.clientX);
        window.onmouseup = (e) => onEnd(e.clientX);

        // Touch (Added helper for touch support as per previous best practice, maintaining snippet logic)
        root.ontouchstart = (e) => onStart(e.touches[0].clientX);
        window.ontouchmove = (e) => onMove(e.touches[0].clientX);
        window.ontouchend = (e) => onEnd(e.changedTouches[0].clientX);
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
                pdfCanvasExport.setTemplateConfig(this.templateConfig);
            }

            await pdfCanvasExport.generatePDF(this.pages, this.cover, this.assets);

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
