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
import { UnifiedTemplateRenderer } from '../templates/unified-template-renderer.js';
import { UnifiedCoverRenderer } from '../engines/unified-cover-renderer.js';
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

        // Detect RTL: Hebrew templates default to RTL
        const templateId = this.templateConfig?.templateId || this.pages[0]?.templateId || '';
        const isHebrew = /[\u0590-\u05FF]/.test(this.cover?.title || '') || 
                         templateId.includes('-he') || 
                         templateId.includes('hebrew') ||
                         (this.templateConfig?.language === 'he');
        this._isRTL = isHebrew; // Default based on language

        this.createModal();
        this._applyDirection(); // Apply RTL/LTR to book
        this.buildMixbookPages();
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
                    <div style="width:1px;height:24px;background:rgba(255,255,255,0.2);margin:0 4px;"></div>
                    <button class="preview-dir-btn" id="btn-toggle-dir" title="Toggle reading direction">
                        <i class="fa-solid fa-right-left"></i> <span id="dir-label">RTL</span>
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

                <!-- Flipbook View (Mixbook-style Open Book) -->
                <div class="preview-flipbook active" id="preview-flipbook">
                    <div class="flipbook-container">
                        <div class="mb-book-ed" id="mb-book-ed">
                            <!-- Left page (static, updates on flip) -->
                            <div class="mb-left-page-ed" id="mb-left-page-ed"></div>
                            <!-- Right static (last page, visible when all flipped) -->
                            <div class="mb-right-static-ed" id="mb-right-static-ed"></div>
                            <!-- Spine -->
                            <div class="mb-spine-ed"></div>
                            <!-- Cover overlay: visible when book is closed, sits on top of everything -->
                            <div class="mb-cover-overlay" id="mb-cover-overlay"></div>
                            <!-- Flip pages are injected directly here by buildMixbookPages -->
                        </div>
                        <div class="page-indicator" id="page-indicator">
                            <i class="fa-solid fa-book-open" style="color: #6366f1; font-size: 12px;"></i>
                            <span id="page-indicator-text">Cover</span>
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
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
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
                z-index: 100;
            }

            .flip-prev { left: 16px; }
            .flip-next { right: 16px; }

            .flip-nav:hover:not(:disabled) {
                background: rgba(255, 255, 255, 0.2);
                transform: translateY(-50%) scale(1.1);
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
                max-width: min(800px, calc(100vw - 40px));
                max-height: min(600px, calc(100vh - 200px));
                width: 100%;
                background: white;
                border-radius: 4px;
                box-shadow: 
                    0 25px 50px rgba(0, 0, 0, 0.5),
                    0 0 0 1px rgba(0, 0, 0, 0.1);
                overflow: hidden;
                transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                transform-style: preserve-3d;
            }

            @media (max-width: 600px) {
                .flip-prev { left: 4px; }
                .flip-next { right: 4px; }
                .flip-nav { width: 40px; height: 40px; font-size: 1rem; }
                .preview-content { padding: 0 2px; }
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
        document.querySelectorAll('.preview-view-btn[data-view]').forEach(btn => {
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
                } else if (view === 'flipbook') {
                    // Rebuild Mixbook pages when switching back
                    this.buildMixbookPages();
                    this.renderCurrentView();
                    this._attachNavHandlers();
                }
            });
        });

        // Navigation buttons
        const isLTR = () => {
            const container = document.getElementById('canvas-container');
            return container ? container.classList.contains('force-ltr') : false;
        };

        this._flipPrevHandler = () => { if (this._isRTL) this.nextPage(); else this.prevPage(); };
        this._flipNextHandler = () => { if (this._isRTL) this.prevPage(); else this.nextPage(); };
        this._attachNavHandlers();


        // Direction toggle button — use querySelector scoped to modal to avoid
        // matching the duplicate #btn-toggle-dir in the main toolbar
        const dirToggle = document.querySelector('#album-preview-modal #btn-toggle-dir');
        console.log('[Preview] Dir toggle button found:', !!dirToggle);
        if (dirToggle) {
            dirToggle.addEventListener('click', (e) => {
                e.stopPropagation();
                console.log('[Preview] Dir toggle CLICKED! Current _isRTL:', this._isRTL);
                this._isRTL = !this._isRTL;
                console.log('[Preview] Toggled _isRTL to:', this._isRTL);
                this._applyDirection();
            });
        }

        // Keyboard navigation
        this.keyHandler = (e) => {
            if (!this.isOpen) return;
            if (e.key === 'ArrowLeft') {
                if (this._isRTL) this.nextPage(); else this.prevPage();
            }
            if (e.key === 'ArrowRight') {
                if (this._isRTL) this.prevPage(); else this.nextPage();
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

        // Touch swipe navigation for mobile flipbook
        const flipbookEl = document.getElementById('preview-flipbook');
        if (flipbookEl) {
            let swipeStartX = 0;
            let swipeStartY = 0;
            flipbookEl.addEventListener('touchstart', (e) => {
                swipeStartX = e.touches[0].clientX;
                swipeStartY = e.touches[0].clientY;
            }, { passive: true });
            flipbookEl.addEventListener('touchend', (e) => {
                const deltaX = e.changedTouches[0].clientX - swipeStartX;
                const deltaY = e.changedTouches[0].clientY - swipeStartY;
                // Only trigger on dominant horizontal swipe >= 50px
                if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) >= 50) {
                    if (deltaX < 0) this._flipNextHandler();
                    else this._flipPrevHandler();
                }
            }, { passive: true });
        }
    }

    /**
     * Navigate to previous page
     */
    prevPage() {
        const is3DView = document.getElementById('preview-3d')?.classList.contains('active');

        if (is3DView && this.ultimateBook) {
            if (this.ultimateBook.isAnimating) return;
            const flipped = this.ultimateBook.pages.filter(p => p.isFlipped);
            if (flipped.length > 0) {
                this.ultimateBook.prevPage();
            }
        } else {
            if (this._isFlipping || this.currentPageIndex <= -1) return;
            this._isFlipping = true;

            if (this.currentPageIndex === 0) {
                // Closing the book: go from first spread back to closed cover
                this.currentPageIndex = -1;
                const bookEl = document.getElementById('mb-book-ed');
                if (bookEl) bookEl.classList.add('book-closed');
                this._updateLeftPageForIndex();
            } else {
                // Normal page flip backwards
                this.currentPageIndex--;
                const totalFlipPages = this._mbFlipPages ? this._mbFlipPages.length : 0;
                // Unflip the page at current index (the page that needs to go back)
                const page = this._mbFlipPages ? this._mbFlipPages[this.currentPageIndex] : null;
                if (page) {
                    page.classList.remove('flipped');
                    setTimeout(() => { page.style.zIndex = totalFlipPages - this.currentPageIndex; }, 350);
                }
                setTimeout(() => { this._updateLeftPageForIndex(); }, 300);
            }

            this._updateIndicator();
            this._updateNavButtons();
            setTimeout(() => { this._isFlipping = false; }, 650);
        }
    }

    /**
     * Navigate to next page
     */
    nextPage() {
        const is3DView = document.getElementById('preview-3d')?.classList.contains('active');

        if (is3DView && this.ultimateBook) {
            if (this.ultimateBook.isAnimating) return;
            const unflipped = this.ultimateBook.pages.filter(p => !p.isFlipped);
            if (unflipped.length > 0) {
                this.ultimateBook.nextPage();
            }
        } else {
            const spreadCount = Math.ceil(this.contentPages.length / 2);
            const maxIndex = spreadCount;
            if (this._isFlipping || this.currentPageIndex >= maxIndex) return;
            this._isFlipping = true;

            if (this.currentPageIndex === -1) {
                // Opening the book: transition from closed cover to first spread
                this.currentPageIndex = 0;
                const bookEl = document.getElementById('mb-book-ed');
                if (bookEl) bookEl.classList.remove('book-closed');
                this._updateLeftPageForIndex();
            } else {
                // Normal page flip forward
                const totalFlipPages = this._mbFlipPages ? this._mbFlipPages.length : 0;
                const page = this._mbFlipPages ? this._mbFlipPages[this.currentPageIndex] : null;
                if (page) {
                    page.style.zIndex = totalFlipPages + 10 + this.currentPageIndex;
                    page.classList.add('flipped');
                }
                this.currentPageIndex++;
                setTimeout(() => { this._updateLeftPageForIndex(); }, 300);
            }

            this._updateIndicator();
            this._updateNavButtons();
            setTimeout(() => { this._isFlipping = false; }, 700);
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
     * Build the Mixbook-style book.
     * The book starts CLOSED with a static cover overlay.
     * Flip pages are ONLY content pages (standard half-width).
     * Cover is shown/hidden via a static overlay (not a flip page).
     */
    buildMixbookPages() {
        const bookEl = document.getElementById('mb-book-ed');
        const leftPageEl = document.getElementById('mb-left-page-ed');
        const rightStaticEl = document.getElementById('mb-right-static-ed');
        const coverOverlay = document.getElementById('mb-cover-overlay');
        
        if (!bookEl || !leftPageEl || !rightStaticEl) return;
        
        // Clear any old flip pages
        bookEl.querySelectorAll('.mb-flip-page-ed').forEach(el => el.remove());
        leftPageEl.innerHTML = '';
        rightStaticEl.innerHTML = '';
        
        // Track flip page elements
        this._mbFlipPages = [];
        this._mbCurrentFlipped = 0;
        this._isFlipping = false;
        
        const isRTL = this._isRTL;
        const pages = isRTL ? [...this.contentPages].reverse() : this.contentPages;
        const spreadCount = Math.ceil(pages.length / 2);
        
        // Apply RTL visual mirror on the book container
        if (isRTL) {
            bookEl.style.transform = 'scaleX(-1)';
        } else {
            bookEl.style.transform = '';
        }
        
        // Helper: counter-mirror for RTL
        const applyContentMirror = (container) => {
            if (!isRTL) return;
            Array.from(container.children).forEach(child => {
                child.style.transform = (child.style.transform || '') + ' scaleX(-1)';
            });
        };
        
        // --- Cover Overlay ---
        // Render the front cover into the overlay (shown when book is closed)
        if (coverOverlay) {
            coverOverlay.innerHTML = '';
            this.renderFrontCoverToContainer(coverOverlay);
            applyContentMirror(coverOverlay);
        }
        
        // --- Left static page ---
        // Shows the front cover initially (when book opens, the left page = front cover inside)
        this.renderFrontCoverToContainer(leftPageEl);
        applyContentMirror(leftPageEl);
        
        // --- Right static page = Back Cover ---
        this.renderBackCoverToContainer(rightStaticEl);
        applyContentMirror(rightStaticEl);
        
        // === BUILD CONTENT FLIP PAGES ===
        // Standard half-width flip pages sitting at left: 50%
        // First flip page: front = page[1] (right of first spread), back = page[2] (left of second spread)
        // The left page of the first spread (page[0]) is shown as the left static page.
        
        const totalFlipPages = spreadCount + 1; // +1 for back cover
        
        for (let i = 0; i < totalFlipPages; i++) {
            const flipPage = document.createElement('div');
            flipPage.className = 'mb-flip-page-ed';
            flipPage.dataset.page = String(i);
            flipPage.style.zIndex = totalFlipPages - i;
            
            const front = document.createElement('div');
            front.className = 'mb-flip-front-ed';
            
            const back = document.createElement('div');
            back.className = 'mb-flip-back-ed';
            
            if (i === 0) {
                // First flip page:
                // front = right page of first spread (page index 1)
                // back = left page of second spread (page index 2)
                const rightPage = pages[1];
                const leftPage = pages[2];
                
                if (rightPage) {
                    this.renderPageToContainer(rightPage, front);
                } else {
                    front.style.background = '#fcfaf7';
                    front.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#bbb;font-style:italic;font-size:14px;">End of Album</div>';
                }
                
                if (leftPage) {
                    this.renderPageToContainer(leftPage, back);
                } else {
                    back.style.background = '#fcfaf7';
                }
                
            } else if (i === totalFlipPages - 1) {
                // Last flip page: front = back cover, back = empty
                this.renderBackCoverToContainer(front);
                back.style.background = '#fcfaf7';
                
            } else {
                // Middle flip pages
                const rightIdx = i * 2 + 1;
                const leftIdx = (i + 1) * 2;
                
                const rightPage = pages[rightIdx];
                const leftPage = pages[leftIdx];
                
                if (rightPage) {
                    this.renderPageToContainer(rightPage, front);
                } else {
                    front.style.background = '#fcfaf7';
                    if (rightIdx >= pages.length) {
                        front.innerHTML = '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:#bbb;font-style:italic;font-size:14px;">End of Album</div>';
                    }
                }
                
                if (leftPage) {
                    this.renderPageToContainer(leftPage, back);
                } else {
                    back.style.background = '#fcfaf7';
                }
            }
            
            applyContentMirror(front);
            applyContentMirror(back);
            
            front.appendChild(this._createShadowEl('right'));
            back.appendChild(this._createShadowEl('left'));
            
            flipPage.appendChild(front);
            flipPage.appendChild(back);
            bookEl.appendChild(flipPage);
            this._mbFlipPages.push(flipPage);
        }
        
        // Handle click on the book to flip pages
        if (bookEl) {
            bookEl.onclick = (e) => {
                // If book is closed, any click opens it
                if (this.currentPageIndex === -1) {
                    this.nextPage();
                    return;
                }
                const rect = bookEl.getBoundingClientRect();
                const x = e.clientX - rect.left;
                if (this._isRTL) {
                    if (x < rect.width / 2) {
                        this.nextPage();
                    } else {
                        this.prevPage();
                    }
                } else {
                    if (x > rect.width / 2) {
                        this.nextPage();
                    } else {
                        this.prevPage();
                    }
                }
            };
        }
    }
    
    /**
     * Create a spine shadow element
     */
    _createShadowEl(side) {
        const el = document.createElement('div');
        el.className = side === 'right' ? 'mb-page-shadow-right-ed' : 'mb-page-shadow-left-ed';
        return el;
    }

    /**
     * Apply reading direction (RTL/LTR) to the book
     */
    _applyDirection() {
        console.log('[Preview] _applyDirection called. _isRTL:', this._isRTL);
        const dirLabel = document.getElementById('dir-label');
        const dirBtn = document.querySelector('#album-preview-modal #btn-toggle-dir');
        
        if (dirLabel) {
            dirLabel.textContent = this._isRTL ? 'RTL' : 'LTR';
            console.log('[Preview] Label set to:', dirLabel.textContent);
        } else {
            console.warn('[Preview] dir-label element NOT found!');
        }
        if (dirBtn) {
            if (this._isRTL) {
                dirBtn.classList.add('active');
            } else {
                dirBtn.classList.remove('active');
            }
        }

        // Swap nav button icons to match reading direction
        const prevBtn = document.getElementById('flip-prev');
        const nextBtn = document.getElementById('flip-next');
        if (prevBtn) prevBtn.innerHTML = this._isRTL
            ? '<i class="fa-solid fa-chevron-right"></i>'
            : '<i class="fa-solid fa-chevron-left"></i>';
        if (nextBtn) nextBtn.innerHTML = this._isRTL
            ? '<i class="fa-solid fa-chevron-left"></i>'
            : '<i class="fa-solid fa-chevron-right"></i>';

        // Rebuild flip pages to apply new direction.
        // Guard on DOM presence rather than _mbFlipPages state, because
        // _mbFlipPages is only set after the early-return check in buildMixbookPages,
        // so it may stay undefined if elements weren't ready on first call.
        const bookEl = document.getElementById('mb-book-ed');
        if (this.isOpen && bookEl) {
            this.currentPageIndex = -1;
            this.buildMixbookPages();
            this.renderCurrentView();
            this.renderThumbnails(); // Re-render in new direction's page order
        }
    }

    /**
     * Attach direction-aware click handlers to the nav buttons.
     * Must be called after any DOM replacement of those buttons.
     */
    _attachNavHandlers() {
        const prevBtn = document.getElementById('flip-prev');
        const nextBtn = document.getElementById('flip-next');
        if (prevBtn) prevBtn.addEventListener('click', this._flipPrevHandler);
        if (nextBtn) nextBtn.addEventListener('click', this._flipNextHandler);
    }

    /**
     * Update nav button disabled states
     */
    _updateNavButtons() {
        const prevBtn = document.getElementById('flip-prev');
        const nextBtn = document.getElementById('flip-next');
        const spreadCount = Math.ceil(this.contentPages.length / 2);
        // maxIndex: cover flip (0) + content flips (spreadCount) = spreadCount total flips
        // currentPageIndex: -1 = closed, 0..spreadCount = open states
        const maxIndex = spreadCount;
        if (this._isRTL) {
            if (prevBtn) prevBtn.disabled = this.currentPageIndex >= maxIndex;
            if (nextBtn) nextBtn.disabled = this.currentPageIndex <= -1;
        } else {
            if (prevBtn) prevBtn.disabled = this.currentPageIndex <= -1;
            if (nextBtn) nextBtn.disabled = this.currentPageIndex >= maxIndex;
        }
    }

    /**
     * Update the page indicator text
     */
    _updateIndicator() {
        const indicatorText = document.getElementById('page-indicator-text');
        if (!indicatorText) return;
        const spreadCount = Math.ceil(this.contentPages.length / 2);
        const maxIndex = spreadCount;
        if (this.currentPageIndex === -1) {
            indicatorText.textContent = 'Cover (Closed)';
        } else if (this.currentPageIndex === 0) {
            // Book just opened - first spread
            const p1 = 1;
            const p2 = Math.min(2, this.contentPages.length);
            indicatorText.textContent = `Pages ${p1}-${p2}`;
        } else if (this.currentPageIndex >= maxIndex) {
            indicatorText.textContent = 'Back Cover';
        } else {
            const p1 = this.currentPageIndex * 2 + 1;
            const p2 = Math.min(this.currentPageIndex * 2 + 2, this.contentPages.length);
            indicatorText.textContent = `Pages ${p1}-${p2}`;
        }
        this.updateThumbnailSelection();
    }

    /**
     * Update the left page content based on current page index.
     * Cover-overlay model:
     *   -1 = closed (left hidden behind cover overlay)
     *    0 = book open to first spread (left = front cover / page[0])
     *    N = spread N (left = pages[N*2])
     *    maxIndex = back cover (left = last right page)
     */
    _updateLeftPageForIndex() {
        const leftPageEl = document.getElementById('mb-left-page-ed');
        if (!leftPageEl) return;
        
        const isRTL = this._isRTL;
        const pages = isRTL ? [...this.contentPages].reverse() : this.contentPages;
        const spreadCount = Math.ceil(pages.length / 2);
        const maxIndex = spreadCount;

        leftPageEl.innerHTML = '';
        leftPageEl.style.background = '#faf8f3';

        if (this.currentPageIndex === -1) {
            // Book is closed — left page hidden behind cover overlay
            return;
        }
        
        if (this.currentPageIndex === 0) {
            // First spread: left page shows first content page (page[0])
            const firstPage = pages[0];
            if (firstPage) {
                this.renderPageToContainer(firstPage, leftPageEl);
            } else {
                // If no content pages, show front cover
                this.renderFrontCoverToContainer(leftPageEl);
            }
        } else if (this.currentPageIndex >= maxIndex) {
            // All pages flipped — show last right page on left
            const lastRightIdx = (spreadCount - 1) * 2 + 1;
            const lastRight = pages[lastRightIdx];
            if (lastRight) {
                this.renderPageToContainer(lastRight, leftPageEl);
            }
            const shadow = this._createShadowEl('left');
            shadow.style.position = 'absolute';
            shadow.style.top = '0';
            shadow.style.zIndex = '10';
            shadow.style.right = '0';
            leftPageEl.appendChild(shadow);
        } else {
            // Show the left page of the current spread
            const leftIdx = this.currentPageIndex * 2;
            const leftPage = pages[leftIdx];
            if (leftPage) {
                this.renderPageToContainer(leftPage, leftPageEl);
            }
        }
        
        // Apply RTL counter-mirror on updated left page content
        if (isRTL) {
            Array.from(leftPageEl.children).forEach(child => {
                if (!child.classList.contains('mb-page-shadow-left-ed') && 
                    !child.classList.contains('mb-page-shadow-right-ed')) {
                    child.style.transform = (child.style.transform || '') + ' scaleX(-1)';
                }
            });
        }
    }

    /**
     * Render the current page view (Flipbook Mode) - Mixbook Style
     * Updates the left page content and page indicator based on current flip state.
     */
    renderCurrentView() {
        console.log('[Preview] renderCurrentView index:', this.currentPageIndex);
        if (!this._mbFlipPages || this._mbFlipPages.length === 0) return;

        const bookEl = document.getElementById('mb-book-ed');
        const totalPages = this._mbFlipPages.length;
        const targetFlipped = this.currentPageIndex + 1;
        
        // Apply/remove closed state
        if (bookEl) {
            if (this.currentPageIndex === -1) {
                bookEl.classList.add('book-closed');
            } else {
                bookEl.classList.remove('book-closed');
            }
        }
        
        // Instantly sync all flip states (no animation — used for initial load and goToPage)
        this._mbFlipPages.forEach((page, i) => {
            if (i < targetFlipped) {
                page.classList.add('flipped');
                page.style.zIndex = totalPages + 10 + i;
            } else {
                page.classList.remove('flipped');
                page.style.zIndex = totalPages - i;
            }
        });
        
        this._updateLeftPageForIndex();
        this._updateNavButtons();
        this._updateIndicator();
    }

    /**
     * Render a standard page to a container
     */
    renderPageToContainer(page, container) {
        if (!page || !container) return;

        container.innerHTML = '';

        // ── CANVAS-RESOLUTION SCALER ──────────────────────────────────────────────
        // Render at the editor's actual canvas size so that all pixel-based values
        // (font sizes, element dimensions, Moveable translate transforms) are correct.
        // A single CSS scale() then shrinks the whole page to fit the container.
        // Using offsetWidth/offsetHeight (CSS pixels, unaffected by parent transforms)
        // means thumbnail slots (already at canvas size) get scale=1 — no double-scale.
        const canvasW = this.templateConfig?.designSystem?.canvas?.width  ||
                        this.templateConfig?.pageSize?.width  || 800;
        const canvasH = this.templateConfig?.designSystem?.canvas?.height ||
                        this.templateConfig?.pageSize?.height || 600;

        // Ensure container clips the scaler (containers already have correct positioning from CSS)
        container.style.overflow = 'hidden';
        // Set container background to match page background so letterbox areas blend in
        const pageBg = page?.backgroundColor || page?.background || page?.bg || '#f5f0e8';
        container.style.background = pageBg;

        const scaler = document.createElement('div');
        scaler.className = 'preview-page-scaler';
        scaler.style.cssText = `width:${canvasW}px;height:${canvasH}px;position:absolute;top:0;left:0;transform-origin:top left;overflow:hidden;`;
        container.appendChild(scaler);

        // Apply uniform scale after layout — preserves aspect ratio (no stretch/squish).
        // Center the scaler within the container so content is visually centered.
        // offsetWidth/offsetHeight are CSS pixels, unaffected by ancestor CSS transform:scale()
        // (thumbnail spreads), so thumbnail slots (already at canvas size) get scale≈1 — no double-scale.
        // We also preserve any scaleX(-1) counter-mirror that RTL applyContentMirror() adds after this call.
        requestAnimationFrame(() => {
            const w = container.offsetWidth  || parseFloat(container.style.width)  || 0;
            const h = container.offsetHeight || parseFloat(container.style.height) || 0;
            if (w > 0 && h > 0) {
                const s = Math.min(w / canvasW, h / canvasH);
                // Center the scaled content within the container
                const offsetX = (w - canvasW * s) / 2;
                const offsetY = (h - canvasH * s) / 2;
                scaler.style.left = `${offsetX}px`;
                scaler.style.top  = `${offsetY}px`;
                // Keep RTL counter-mirror if applyContentMirror() has set it
                const hasMirror = (scaler.style.transform || '').includes('scaleX(-1)');
                scaler.style.transform = (hasMirror ? 'scaleX(-1) ' : '') + `scale(${s})`;
            }
        });
        // ─────────────────────────────────────────────────────────────────────────

        // RESILIENCE: Sanitize photo URLs before rendering
        // If thumbnailUrl is a dead blob URL, fall back to url
        if (this.assets?.photos) {
            this.assets.photos.forEach(photo => {
                if (photo.thumbnailUrl && photo.thumbnailUrl.startsWith('blob:')) {
                    // Blob URLs from previous sessions are dead - fall back to url
                    photo.thumbnailUrl = photo.url || '';
                }
            });
        }

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
                // Fix: Prevent text duplication!
                // If the page already has editable DOM elements (v3.2+ pattern), hide the
                // underlying static template texts to avoid rendering text twice.
                let renderLayoutDef = layoutDef || {};
                if (page.elements && page.elements.some(e => e.type === 'text')) {
                    renderLayoutDef = { ...renderLayoutDef, textElements: [] };
                }

                const pageEl = renderer.renderPage(
                    renderLayoutDef,
                    photosArray,
                    page.textContent || {},
                    page.textPositions || {}
                );

                // Ensure page element fills the scaler (canvas-size wrapper)
                if (pageEl) {
                    pageEl.style.width = '100%';
                    pageEl.style.height = '100%';
                    pageEl.style.overflow = 'hidden';
                    scaler.appendChild(pageEl);

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
                this.fallbackRenderer.renderPageToContainer(page, this.assets, scaler);
                // Elements are already injected by RenderEngine at canvas scale
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

        // NOTE: pageEl is now inside a canvas-resolution scaler, so all pixel values
        // (font sizes, widths, heights, translate transforms) are correct as-is.
        // No per-element RAF scaling is needed — the scaler handles the overall zoom.

        page.elements.forEach(el => {
            const domEl = document.createElement('div');
            domEl.className = `page-element element-${el.type}`;
            domEl.style.position = 'absolute';
            domEl.style.left = `${el.x}%`;
            domEl.style.top = `${el.y}%`;
            if (el.zIndex !== undefined) domEl.style.zIndex = el.zIndex;

            // Determine centering for text
            const isCentered = el.textAlign === 'center' ||
                (el.alignment && el.alignment.horizontal === 'center') ||
                (el.alignment && el.alignment.method && el.alignment.method.includes('translateX(-50%)'));

            // Apply full Moveable transform (translate values are in canvas-px → correct at canvas scale)
            if (el.type === 'text' && isCentered) {
                domEl.style.transform = el.transform
                    ? `translateX(-50%) ${el.transform}`
                    : 'translateX(-50%)';
            } else if (el.transform) {
                domEl.style.transform = el.transform;
            }

            if (el.type === 'text') {
                domEl.classList.add('text-element');
                // Width: use stored pixel width (correct at canvas scale)
                const pxW = parseFloat(el.pixelWidth);
                domEl.style.width = (pxW > 0) ? `${pxW}px` : `${el.width || 80}%`;
                domEl.style.boxSizing = 'border-box';
                domEl.style.wordBreak = 'break-word';
                domEl.style.overflowWrap = 'break-word';
                if (!el.zIndex) domEl.style.zIndex = 10;

                if (window.TEXT_STYLES) {
                    const styleDef = window.TEXT_STYLES.find(s => s.id === el.styleId);
                    if (styleDef) Object.assign(domEl.style, styleDef.style);
                }

                // Font size in canvas-px (correct at canvas scale — scaler will shrink visually)
                if (el.fontSize) domEl.style.fontSize = `${el.fontSize}px`;
                if (el.color) domEl.style.color = el.color;
                if (el.fontFamily) domEl.style.fontFamily = el.fontFamily;
                if (el.textAlign) domEl.style.textAlign = el.textAlign;
                domEl.textContent = el.content;

                // Hebrew auto-detection
                if (/[\u0590-\u05FF]/.test(el.content)) {
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
                domEl.style.width  = `${el.width}%`;
                domEl.style.height = `${el.height}%`;
                if (el.color) domEl.style.backgroundColor = el.color;

            } else if (el.type === 'element') {
                domEl.classList.add('visual-element');
                // Pixel dimensions are at canvas scale — correct as-is
                domEl.style.width  = `${parseFloat(el.pixelWidth)  || 100}px`;
                domEl.style.height = `${parseFloat(el.pixelHeight) || 100}px`;

                const img = document.createElement('img');
                img.src = el.url;
                img.style.width  = '100%';
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
        // No RAF scaling needed — the preview-page-scaler wrapper handles the zoom.
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

        // Default MUST match RenderEngine fallback (container.clientWidth||800, clientHeight||600)
        let editorW = 800;
        let editorH = 600;

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
        // Unified renderer for ALL templates — no per-template dispatch
        if (templateId && this.templateConfig) {
            return new UnifiedTemplateRenderer(this.templateConfig);
        }
        return null;
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
        this._renderCoverThumb(frontCoverThumb, 'front');
        frontCoverThumb.addEventListener('click', () => this.goToPage(-1));
        container.appendChild(frontCoverThumb);

        // Page/Spread Thumbnails (Index 0..N)
        const spreadCount = Math.ceil(this.contentPages.length / 2);

        // Determine page size for rendering
        let pageW = 400, pageH = 300;
        if (this.templateConfig?.designSystem?.canvas) {
            pageW = this.templateConfig.designSystem.canvas.width || 400;
            pageH = this.templateConfig.designSystem.canvas.height || 300;
        } else if (this.templateConfig?.pageSize) {
            pageW = this.templateConfig.pageSize.width || 400;
            pageH = this.templateConfig.pageSize.height || 300;
        }

        // Create offscreen container for rendering (must be in DOM for CSS to work)
        const offscreen = document.createElement('div');
        offscreen.style.cssText = `position:fixed;left:-9999px;top:-9999px;pointer-events:none;z-index:-1;`;
        document.body.appendChild(offscreen);

        // Measure actual CSS thumbnail dimensions dynamically so the scale is correct
        // regardless of whether we're on desktop (90×68) or mobile (52×40).
        const tempThumb = document.createElement('div');
        tempThumb.className = 'preview-thumb';
        tempThumb.style.cssText = 'visibility:hidden;position:absolute;pointer-events:none;';
        container.appendChild(tempThumb);
        const thumbW = tempThumb.offsetWidth  || 90;
        const thumbH = tempThumb.offsetHeight || 68;
        container.removeChild(tempThumb);

        const spreadW = pageW * 2;
        const spreadH = pageH;
        // Use Math.min to FIT the full spread inside the thumbnail (no cropping)
        const thumbScale = Math.min(thumbW / spreadW, thumbH / spreadH);

        // Match navigation order: RTL reverses the page sequence
        const thumbPages = this._isRTL ? [...this.contentPages].reverse() : this.contentPages;

        for (let i = 0; i < spreadCount; i++) {
            const thumb = document.createElement('div');
            thumb.className = 'preview-thumb';
            thumb.dataset.index = i.toString();
            thumb.style.position = 'relative';
            thumb.style.overflow = 'hidden';

            const leftPage = thumbPages[i * 2];
            const rightPage = thumbPages[(i * 2) + 1];

            // Create full-size spread in offscreen container
            const spreadEl = document.createElement('div');
            spreadEl.style.cssText = `display:flex;width:${spreadW}px;height:${spreadH}px;`;

            const leftSlot = document.createElement('div');
            leftSlot.style.cssText = `width:${pageW}px;height:${pageH}px;position:relative;overflow:hidden;background:#fcfaf7;`;
            const rightSlot = document.createElement('div');
            rightSlot.style.cssText = `width:${pageW}px;height:${pageH}px;position:relative;overflow:hidden;background:#fcfaf7;`;

            spreadEl.appendChild(leftSlot);
            spreadEl.appendChild(rightSlot);
            offscreen.appendChild(spreadEl);

            if (leftPage) {
                try { this.renderPageToContainer(leftPage, leftSlot); } catch (e) { /* skip */ }
            }
            if (rightPage) {
                try { this.renderPageToContainer(rightPage, rightSlot); } catch (e) { /* skip */ }
            }

            // Scale to cover the thumbnail fully (centered)
            const scaledW = spreadW * thumbScale;
            const scaledH = spreadH * thumbScale;
            spreadEl.style.cssText = `
                width: ${spreadW}px;
                height: ${spreadH}px;
                transform: scale(${thumbScale});
                transform-origin: top left;
                display: flex;
                position: absolute;
                top: ${(thumbH - scaledH) / 2}px;
                left: ${(thumbW - scaledW) / 2}px;
                pointer-events: none;
            `;

            // Move the rendered spread from offscreen to thumbnail
            thumb.appendChild(spreadEl);

            // In RTL mode, mirror the thumbnail visually to match the book's scaleX(-1) appearance
            if (this._isRTL) {
                thumb.style.transform = 'scaleX(-1)';
            }

            thumb.addEventListener('click', () => this.goToPage(i));
            container.appendChild(thumb);
        }

        // Remove offscreen container (all spreads have been moved to thumbnails)
        offscreen.remove();

        // Back Cover Thumbnail (Index = spreadCount)
        const backCoverThumb = document.createElement('div');
        backCoverThumb.className = 'preview-thumb';
        backCoverThumb.dataset.index = spreadCount.toString();
        this._renderCoverThumb(backCoverThumb, 'back');
        backCoverThumb.addEventListener('click', () => this.goToPage(spreadCount));
        container.appendChild(backCoverThumb);
    }

    /**
     * Render a cover thumbnail (front or back)
     */
    _renderCoverThumb(thumb, side) {
        const cover = this.cover;
        if (!cover) {
            thumb.innerHTML = `<div style="background:#1a1a2e;width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:white;font-size:0.5rem;">${side === 'front' ? 'Front' : 'Back'}</div>`;
            return;
        }

        const bgColor = cover.color || '#f5f0e8';
        const photoId = side === 'front' ? cover.frontPhotoId : cover.backPhotoId;

        // Photo on cover
        if (photoId && this.assets?.photos) {
            const photo = this.assets.photos.find(p => p.id === photoId);
            if (photo) {
                thumb.innerHTML = `<div style="width:100%;height:100%;background-image:url('${photo.thumbnailUrl || photo.url}');background-size:cover;background-position:center;"></div>`;
                return;
            }
        }

        // Gallery cover with SVG illustration
        if (side === 'front' && cover._coverGalleryId && cover.background) {
            const el = document.createElement('div');
            el.style.cssText = `width:100%;height:100%;background-color:${bgColor};position:relative;overflow:hidden;`;

            // SVG illustration
            const illEl = document.createElement('div');
            illEl.style.cssText = `position:absolute;inset:0;background-image:url('${cover.background}');background-size:contain;background-position:center;background-repeat:no-repeat;`;
            el.appendChild(illEl);

            // Title text overlay
            if (cover.title) {
                const titleEl = document.createElement('div');
                titleEl.style.cssText = `position:absolute;top:3px;left:0;right:0;text-align:center;font-size:0.4rem;font-weight:bold;color:${cover.textColor || '#333'};z-index:1;`;
                titleEl.textContent = cover.title;
                el.appendChild(titleEl);
            }
            thumb.appendChild(el);
            return;
        }

        // Back cover with pattern
        if (side === 'back' && cover._backSvgDataUri) {
            thumb.innerHTML = `<div style="width:100%;height:100%;background-color:${bgColor};background-image:url('${cover._backSvgDataUri}');background-size:cover;background-position:center;"></div>`;
            return;
        }

        // Plain color fallback
        thumb.innerHTML = `<div style="background:${bgColor};width:100%;height:100%;display:flex;align-items:center;justify-content:center;color:${cover.textColor || '#333'};font-size:0.5rem;">${cover.title || (side === 'front' ? 'Front' : 'Back')}</div>`;
    }

    /**
     * Create a lightweight page mini-thumbnail from page data.
     * Shows background color and photo thumbnails in a simple layout.
     */
    _createPageMiniThumb(page) {
        const mini = document.createElement('div');
        mini.style.cssText = `flex:1;height:100%;position:relative;overflow:hidden;`;
        if (!page) { mini.style.background = '#f5f5f5'; return mini; }

        // Page background
        mini.style.backgroundColor = page.backgroundColor || page.color || '#ffffff';
        if (page.background) {
            mini.style.backgroundImage = `url("${page.background}")`;
            mini.style.backgroundSize = 'cover';
            mini.style.backgroundPosition = 'center';
        }

        // Extract photo IDs from slots
        const photoIds = [];
        if (page.layout && page.layout.slots) {
            page.layout.slots.forEach(slot => { if (slot.photoId) photoIds.push(slot.photoId); });
        }

        if (photoIds.length > 0 && this.assets?.photos) {
            const count = Math.min(photoIds.length, 4);
            const grid = document.createElement('div');
            if (count === 1) {
                grid.style.cssText = `position:absolute;inset:2px;`;
            } else if (count === 2) {
                grid.style.cssText = `position:absolute;inset:1px;display:flex;gap:1px;`;
            } else {
                grid.style.cssText = `position:absolute;inset:1px;display:grid;grid-template-columns:1fr 1fr;gap:1px;`;
            }
            for (let j = 0; j < count; j++) {
                const photo = this.assets.photos.find(p => p.id === photoIds[j]);
                const cell = document.createElement('div');
                if (photo) {
                    cell.style.cssText = `flex:1;background-image:url("${photo.thumbnailUrl || photo.url}");background-size:cover;background-position:center;border-radius:1px;min-height:0;`;
                } else {
                    cell.style.cssText = `flex:1;background:#ddd;border-radius:1px;min-height:0;`;
                }
                grid.appendChild(cell);
            }
            mini.appendChild(grid);
        }
        return mini;
    }

    /**
     * Update thumbnail selection
     */
    updateThumbnailSelection() {
        let activeThumb = null;
        document.querySelectorAll('.preview-thumb').forEach(thumb => {
            const isActive = parseInt(thumb.dataset.index) === this.currentPageIndex;
            thumb.classList.toggle('active', isActive);
            if (isActive) activeThumb = thumb;
        });
        if (activeThumb) {
            activeThumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
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
        // Always overwrite - remove old style if present (prevents stale cached CSS)
        const existing = document.getElementById('album-preview-styles');
        if (existing) existing.remove();

        const style = document.createElement('style');
        style.id = 'album-preview-styles';
        style.textContent = `
            @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
            @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }

            #album-preview-modal {
                position: fixed;
                inset: 0;
                background: linear-gradient(180deg, #e8eaf0 0%, #f1f3f8 40%, #e8eaf0 100%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                animation: fadeIn 0.3s ease;
            }
            #album-preview-modal.closing { animation: fadeOut 0.3s ease forwards; }

            /* Header */
            .preview-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); border-bottom: 1px solid rgba(0,0,0,0.08); }
            .preview-title { display: flex; align-items: center; gap: 10px; font-size: 1.15rem; font-weight: 700; color: #1e293b; }
            .preview-title i { color: #6366f1; }
            .preview-controls { display: flex; gap: 8px; }
            .preview-view-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; color: #64748b; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
            .preview-view-btn:hover { background: rgba(0,0,0,0.08); color: #1e293b; }
            .preview-view-btn.active { background: linear-gradient(135deg, #6366f1, #8b5cf6); border-color: transparent; color: white; }
            .preview-dir-btn { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 8px; color: #64748b; cursor: pointer; transition: all 0.2s; font-size: 0.9rem; }
            .preview-dir-btn:hover { background: rgba(0,0,0,0.08); color: #1e293b; }
            .preview-dir-btn.active { background: linear-gradient(135deg, #10b981, #059669); border-color: transparent; color: white; }
            .preview-close-btn { width: 40px; height: 40px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.05); border: 1px solid rgba(0,0,0,0.08); border-radius: 50%; color: #64748b; cursor: pointer; transition: all 0.2s; }
            .preview-close-btn:hover { background: #ef4444; color: white; border-color: transparent; }

            /* Content area */
            .preview-content { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; position: relative; background: linear-gradient(180deg, #e8eaf0 0%, #f4f5f9 50%, #e8eaf0 100%); }
            
            /* NAV BUTTONS */
            .flip-nav {
                width: 48px;
                height: 48px;
                display: flex;
                align-items: center;
                justify-content: center;
                background: rgba(255,255,255,0.92);
                border: 1px solid rgba(0,0,0,0.1);
                border-radius: 50%;
                color: #475569;
                font-size: 1.2rem;
                cursor: pointer;
                transition: all 0.2s;
                position: absolute;
                top: 50%;
                transform: translateY(-50%);
                z-index: 1000;
                box-shadow: 0 4px 16px rgba(0,0,0,0.1);
            }
            #flip-prev { left: 24px; }
            #flip-next { right: 24px; }
            .flip-nav:hover:not(:disabled) {
                background: white;
                transform: translateY(-50%) scale(1.1);
                box-shadow: 0 6px 24px rgba(0,0,0,0.15);
            }
            .flip-nav:disabled { opacity: 0.3; cursor: not-allowed; }
            
            /* Flipbook container */
            .preview-flipbook { display: none; width: 100%; height: 100%; align-items: center; justify-content: center; }
            .preview-flipbook.active { display: flex; }
            .flipbook-container { position: relative; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 12px 16px 8px; width: 100%; height: 100%; }

            /* ===== MIXBOOK-STYLE BOOK ===== */
            .mb-book-ed {
                position: relative;
                width: min(80vw, 900px);
                aspect-ratio: 2 / 1.2;
                max-height: calc(100vh - 280px);
                cursor: pointer;
                perspective: 2000px;
                filter: drop-shadow(0 12px 40px rgba(0,0,0,0.22));
                transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1),
                            max-width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
            }
            /* When max-height constrains, recalculate width from height */
            @media (max-height: 800px) {
                .mb-book-ed {
                    width: min(80vw, calc((100vh - 280px) * 2 / 1.2));
                }
            }

            /* === CLOSED BOOK STATE === */
            /* Book looks like a single portrait rectangle (front cover only) */
            .mb-book-ed.book-closed {
                width: min(40vw, 450px);
                aspect-ratio: 1 / 1.2;
            }
            @media (max-height: 800px) {
                .mb-book-ed.book-closed {
                    width: min(40vw, calc((100vh - 280px) / 1.2));
                }
            }
            /* Hide internal book elements when closed */
            .mb-book-ed.book-closed .mb-left-page-ed,
            .mb-book-ed.book-closed .mb-right-static-ed,
            .mb-book-ed.book-closed .mb-spine-ed {
                opacity: 0;
                pointer-events: none;
            }

            /* Left page (static background) */
            .mb-left-page-ed {
                position: absolute;
                top: 0; left: 0;
                width: 50%; height: 100%;
                background: #faf8f3;
                border-radius: 4px 0 0 4px;
                overflow: hidden;
                z-index: 1;
                box-shadow: -2px 1px 6px rgba(0,0,0,0.1);
                transition: opacity 0.3s ease;
            }
            /* Inner spine shadow - left page */
            .mb-left-page-ed::after {
                content: '';
                position: absolute;
                top: 0; right: 0;
                width: 30px; height: 100%;
                background: linear-gradient(to left, rgba(0,0,0,0.06), transparent);
                z-index: 10;
                pointer-events: none;
            }

            /* Right static (visible when all pages flipped) */
            .mb-right-static-ed {
                position: absolute;
                top: 0; right: 0;
                width: 50%; height: 100%;
                background: #faf8f3;
                border-radius: 0 4px 4px 0;
                overflow: hidden;
                z-index: 0;
                transition: opacity 0.3s ease;
            }
            /* Inner spine shadow - right page */
            .mb-right-static-ed::before {
                content: '';
                position: absolute;
                top: 0; left: 0;
                width: 30px; height: 100%;
                background: linear-gradient(to right, rgba(0,0,0,0.06), transparent);
                z-index: 10;
                pointer-events: none;
            }

            /* Spine */
            .mb-spine-ed {
                position: absolute;
                top: -1px; bottom: -1px;
                left: calc(50% - 2px);
                width: 4px;
                background: linear-gradient(to right, 
                    rgba(0,0,0,0.15) 0%, 
                    rgba(255,255,255,0.3) 30%, 
                    rgba(0,0,0,0.12) 60%, 
                    rgba(0,0,0,0.2) 100%);
                z-index: 200;
                pointer-events: none;
                transition: opacity 0.3s ease;
            }

            /* Flippable pages */
            .mb-flip-page-ed {
                position: absolute;
                top: 0; left: 50%;
                width: 50%; height: 100%;
                transform-origin: left center;
                transform-style: preserve-3d;
                transition: transform 0.6s cubic-bezier(0.4, 0.0, 0.2, 1);
            }
            .mb-flip-page-ed.flipped {
                transform: rotateY(-180deg);
            }
            
            /* === COVER OVERLAY (closed-book state) === */
            /* A static div that covers the entire book with the front cover.
               Only visible when .book-closed is active. */
            .mb-cover-overlay {
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                z-index: 300;
                border-radius: 4px;
                overflow: hidden;
                box-shadow: 0 4px 16px rgba(0,0,0,0.15);
                transition: opacity 0.4s ease;
                pointer-events: none;
            }
            /* Show overlay only when book is closed */
            .mb-book-ed:not(.book-closed) .mb-cover-overlay {
                opacity: 0;
                pointer-events: none;
            }
            .mb-book-ed.book-closed .mb-cover-overlay {
                opacity: 1;
                pointer-events: auto;
            }

            .mb-flip-front-ed,
            .mb-flip-back-ed {
                position: absolute;
                inset: 0;
                backface-visibility: hidden;
                overflow: hidden;
                background: #faf8f3;
                border-radius: 0 4px 4px 0;
            }
            .mb-flip-front-ed { z-index: 2; }
            .mb-flip-back-ed {
                transform: rotateY(180deg);
                border-radius: 4px 0 0 4px;
            }

            /* Inner edge shadows on flip pages */
            .mb-page-shadow-right-ed {
                position: absolute;
                top: 0; left: 0;
                width: 25px; height: 100%;
                background: linear-gradient(to right, rgba(0,0,0,0.05), transparent);
                pointer-events: none;
                z-index: 5;
            }
            .mb-page-shadow-left-ed {
                position: absolute;
                top: 0; right: 0;
                width: 25px; height: 100%;
                background: linear-gradient(to left, rgba(0,0,0,0.05), transparent);
                pointer-events: none;
                z-index: 5;
            }

            /* Page indicator badge */
            .page-indicator {
                display: flex;
                align-items: center;
                gap: 8px;
                justify-content: center;
                margin-top: 14px;
                background: rgba(255,255,255,0.9);
                backdrop-filter: blur(8px);
                padding: 6px 16px;
                border-radius: 20px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.08);
                border: 1px solid rgba(0,0,0,0.06);
                color: #475569;
                font-size: 0.85rem;
                font-weight: 600;
                width: fit-content;
                margin-left: auto;
                margin-right: auto;
            }

            /* 3D View */
            .preview-3d { display: none; flex-direction: column; align-items: center; justify-content: center; width: 100%; height: 100%; }
            .preview-3d.active { display: flex; }
            .book-3d-container { perspective: 2000px; flex: 1; display: flex; align-items: center; justify-content: center; cursor: grab; user-select: none; }
            .book-3d-container:active { cursor: grabbing; }
            .book-3d-controls { padding: 20px; color: #475569; display: flex; flex-direction: column; align-items: center; gap: 10px; z-index: 10; }

            /* Footer */
            .preview-footer { padding: 14px 24px; background: rgba(255,255,255,0.85); backdrop-filter: blur(10px); border-top: 1px solid rgba(0,0,0,0.08); display: flex; flex-direction: column; gap: 14px; }
            .preview-thumbnails { display: flex; gap: 10px; overflow-x: auto; padding: 6px 0; justify-content: center; }
            .preview-thumb { width: 90px; height: 68px; background: white; border-radius: 6px; overflow: hidden; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; flex-shrink: 0; box-shadow: 0 2px 8px rgba(0,0,0,0.08); }
            .preview-thumb:hover { transform: scale(1.05); box-shadow: 0 4px 12px rgba(0,0,0,0.12); }
            .preview-thumb.active { border-color: #6366f1; box-shadow: 0 0 0 2px rgba(99,102,241,0.3); }
            .preview-thumb img, .preview-thumb > div { width: 100%; height: 100%; object-fit: cover; }
            .preview-actions { display: flex; justify-content: center; }
            .btn-generate-pdf { display: flex; align-items: center; gap: 10px; padding: 12px 28px; background: linear-gradient(135deg, #6366f1, #8b5cf6); border: none; border-radius: 10px; color: white; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 14px rgba(99,102,241,0.3); }
            .btn-generate-pdf:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.4); }
            /* RTL direction is handled via CSS scaleX(-1) on .mb-book-ed to mirror the book visually.
               Page content is counter-mirrored with scaleX(-1) so text/images remain readable.
               Content pages array is reversed in JS for correct Hebrew reading order. */

            /* ── Responsive: Mobile ── */
            @media (max-width: 768px) {

                /* Header: icon-only buttons, compact single row */
                .preview-header { padding: 8px 12px; gap: 6px; }
                .preview-title { font-size: 0.88rem; gap: 6px; }
                .preview-controls { gap: 4px; }

                /* Icon-only view/dir buttons — hide text via font-size trick */
                .preview-view-btn, .preview-dir-btn {
                    font-size: 0;
                    padding: 0;
                    width: 36px;
                    height: 36px;
                    justify-content: center;
                    border-radius: 8px;
                }
                .preview-view-btn i, .preview-dir-btn i { font-size: 0.95rem; }
                .preview-close-btn { width: 36px; height: 36px; }

                /* Separator inside controls */
                .preview-controls > div[style*="width:1px"] { display: none; }

                /* Book: maximize — constrain by available height */
                .mb-book-ed {
                    width: min(92vw, calc((100vh - 200px) * 2 / 1.2));
                    max-height: calc(100vh - 200px);
                }
                @media (max-height: 800px) {
                    .mb-book-ed {
                        width: min(92vw, calc((100vh - 200px) * 2 / 1.2));
                    }
                }
                .mb-book-ed.book-closed {
                    width: min(56vw, calc((100vh - 200px) / 1.2));
                }

                /* Nav arrows: smaller, tucked into book edges */
                .flip-nav { width: 32px; height: 32px; font-size: 0.8rem; opacity: 0.85; }
                #flip-prev { left: 3px; }
                #flip-next { right: 3px; }

                /* Page indicator: compact */
                .page-indicator { margin-top: 6px; padding: 4px 12px; font-size: 0.75rem; }

                /* Footer: compact thumbnails + full-width PDF button */
                .preview-footer { padding: 8px 10px; gap: 6px; }
                .preview-thumbnails { gap: 5px; padding: 3px 0; justify-content: flex-start; }
                .preview-thumb { width: 52px; height: 40px; border-radius: 4px; }
                .preview-thumb:hover { transform: scale(1.04); }
                .preview-actions { width: 100%; }
                .btn-generate-pdf { width: 100%; justify-content: center; padding: 10px 16px; font-size: 0.875rem; gap: 8px; border-radius: 8px; }

                /* 3D controls: more compact */
                .book-3d-controls { padding: 10px 16px; font-size: 0.8rem; }
            }
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
        }

        if (nextBtn) {
            const newNext = nextBtn.cloneNode(true);
            nextBtn.parentNode.replaceChild(newNext, nextBtn);
            newNext.addEventListener('click', handleNext);
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
