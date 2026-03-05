/**
 * Canvas-Based PDF Generator for Shoso AI Editor
 * Uses html2canvas to capture exact visual representation of pages rendered by template renderers.
 * This ensures 100% visual fidelity between the editor view and exported PDF.
 */

import { authService } from '../services/firebase-auth-service.js';

// Import all template renderers to ensure they are available
import { PhotographyPortfolioRenderer } from '../templates/photography-portfolio-renderer.js';
import { RomanticJourneyRenderer } from '../templates/romantic-journey-renderer.js';
import { TravelJourneyRenderer } from '../templates/travel-journey-renderer.js';
import { FamilyRootsRenderer } from '../templates/family-roots-renderer.js';
import { BarMitzvahRenderer } from '../templates/bar-mitzvah-renderer.js';
import { WeddingPrestigeRenderer } from '../templates/wedding-prestige-renderer.js';
import { RenderEngine } from './render-engine.js';
import { UnifiedCoverRenderer } from './unified-cover-renderer.js';

export class PDFCanvasExport {
    constructor() {
        this.templateConfig = null;
        this.rendererCache = {};
    }

    setTemplateConfig(config) {
        this.templateConfig = config;
        console.log("[PDFCanvas] Template Config updated:", config?.templateId);
    }

    /**
     * Get the appropriate renderer for a template
     */
    getRenderer(templateId) {
        if (!this.templateConfig) return null;

        // Check cache first
        if (this.rendererCache[templateId]) {
            return this.rendererCache[templateId];
        }

        let renderer = null;
        switch (templateId) {
            case 'photography-portfolio-v1':
                renderer = new PhotographyPortfolioRenderer(this.templateConfig);
                break;
            case 'romantic-journey-v1':
                renderer = new RomanticJourneyRenderer(this.templateConfig);
                break;
            case 'travel-journey-v1':
                renderer = new TravelJourneyRenderer(this.templateConfig);
                break;
            case 'family-roots-v1':
                renderer = new FamilyRootsRenderer(this.templateConfig);
                break;
            case 'bar-mitzvah-v1':
                renderer = new BarMitzvahRenderer(this.templateConfig);
                break;
            case 'wedding-prestige-hebrew-v1':
                renderer = new WeddingPrestigeRenderer(this.templateConfig);
                break;
            default:
                // Use generic render engine
                renderer = new RenderEngine('offscreen-render');
                break;
        }

        this.rendererCache[templateId] = renderer;
        return renderer;
    }

    /**
     * Wait for all images in an element to load
     */
    async waitForImages(element, timeout = 30000) {
        const images = element.querySelectorAll('img');
        const promises = Array.from(images).map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve, reject) => {
                const timer = setTimeout(() => {
                    console.warn('[PDFCanvas] Image load timeout:', img.src?.substring(0, 50));
                    resolve(); // Don't reject, just continue
                }, timeout);
                img.onload = () => { clearTimeout(timer); resolve(); };
                img.onerror = () => { clearTimeout(timer); resolve(); };
            });
        });
        await Promise.all(promises);
    }

    /**
     * Wait for background images to load
     */
    async waitForBackgroundImages(element, timeout = 10000) {
        const allElements = element.querySelectorAll('*');
        const promises = [];

        for (const el of allElements) {
            const style = window.getComputedStyle(el);
            const bgImage = style.backgroundImage;

            if (bgImage && bgImage !== 'none' && bgImage.startsWith('url(')) {
                const urlMatch = bgImage.match(/url\(["']?([^"')]+)["']?\)/);
                if (urlMatch && urlMatch[1]) {
                    const url = urlMatch[1];
                    if (url.startsWith('http') || url.startsWith('data:')) {
                        promises.push(new Promise(resolve => {
                            const img = new Image();
                            img.crossOrigin = 'anonymous';
                            const timer = setTimeout(resolve, timeout);
                            img.onload = () => { clearTimeout(timer); resolve(); };
                            img.onerror = () => { clearTimeout(timer); resolve(); };
                            img.src = url;
                        }));
                    }
                }
            }
        }

        await Promise.all(promises);
    }

    /**
     * Create an off-screen container for rendering
     */
    createOffscreenContainer(width, height) {
        let container = document.getElementById('pdf-offscreen-render');
        if (!container) {
            container = document.createElement('div');
            container.id = 'pdf-offscreen-render';
            document.body.appendChild(container);
        }

        // Style for off-screen rendering (visible during debug, hidden in production)
        container.style.cssText = `
            position: fixed;
            left: -9999px;
            top: 0;
            width: ${width}px;
            height: ${height}px;
            background: white;
            overflow: hidden;
            z-index: -1;
        `;

        container.innerHTML = '';
        return container;
    }

    /**
     * Render a page using the template renderer and capture as canvas
     */
    async renderPageToCanvas(page, assets) {
        const width = this.templateConfig?.designSystem?.canvas?.width || 800;
        const height = this.templateConfig?.designSystem?.canvas?.height || 600;

        const container = this.createOffscreenContainer(width, height);

        // Get the appropriate renderer
        const renderer = this.getRenderer(page.templateId);

        if (!renderer) {
            console.log('[PDFCanvas] No template renderer for:', page.templateId, '— will use RenderEngine fallback');
        }

        // Render the page to DOM
        let pageElement;

        if (page.templateId && this.templateConfig?.pageLayouts) {
            // Template-based rendering
            const layoutId = page.rawLayoutId || page.layout?.id || page.layoutId;
            const layout = this.templateConfig.pageLayouts.find(l => l.layoutId === layoutId);

            if (layout && renderer.renderPage) {
                // Rebuild accurate photos array from slots to prevent 'undefined' photo crashes and ensure layout sorting
                let photosArray = [];
                if (layout.photoSlots && page.layout && page.layout.slots) {
                    layout.photoSlots.forEach((slotDef, i) => {
                        const pageSlot = page.layout.slots.find(s => s.slotId === slotDef.slotId || (s.id && s.id.includes(slotDef.slotId))) || page.layout.slots[i];
                        if (pageSlot && pageSlot.photoId && assets && assets.photos) {
                            const photoObj = assets.photos.find(p => p.id === pageSlot.photoId);
                            photosArray.push(photoObj || null);
                        } else {
                            photosArray.push(null);
                        }
                    });
                } else {
                    photosArray = page.photos || page.elements?.filter(e => e.type === 'photo') || [];
                }

                pageElement = renderer.renderPage(
                    layout,
                    photosArray,
                    page.textContent || {},
                    page.textPositions || {},
                    page
                );

                // Apply custom text styles/scales universally exactly like app.js
                if (page.textStyles) {
                    Object.entries(page.textStyles).forEach(([elementId, styles]) => {
                        const targetEl = pageElement.querySelector(`[data-selectable-id="${elementId}"]`);
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

                // INJECT CROP STYLES AND FIX HTML2CANVAS COMPATIBILITY
                if (page.layout && page.layout.slots) {
                    page.layout.slots.forEach((slot, index) => {
                        const slotContainers = pageElement.querySelectorAll('.photo-slot');
                        const slotContainer = pageElement.querySelector(`.photo-slot[data-selectable-id="${slot.photoId}"]`) || slotContainers[index];
                        if (slotContainer) {
                            const img = slotContainer.querySelector('img');
                            if (img && slot.photoId && assets && assets.photos) {
                                const panX = slot.crop && slot.crop.panX !== undefined ? slot.crop.panX : 50;
                                const panY = slot.crop && slot.crop.panY !== undefined ? slot.crop.panY : 50;
                                const zoom = slot.crop && slot.crop.zoom ? slot.crop.zoom : 1;

                                // HTML2Canvas does not support object-fit and object-position on <img> elements.
                                // We MUST convert the <img> to a <div> with background-image to persist the edits in PDF.
                                const src = img.src;
                                const div = document.createElement('div');
                                div.style.width = '100%';
                                div.style.height = '100%';
                                div.style.backgroundImage = `url("${src}")`;
                                div.style.backgroundSize = 'cover';
                                div.style.backgroundPosition = `${panX}% ${panY}%`;
                                div.style.backgroundRepeat = 'no-repeat';
                                div.style.transform = `scale(${zoom})`;
                                div.style.transformOrigin = 'center center';

                                // Copy over filters
                                if (img.style.filter) {
                                    div.style.filter = img.style.filter;
                                }

                                img.parentNode.replaceChild(div, img);
                            }
                        }
                    });
                }
            }
        }

        if (!pageElement) {
            // Fallback: Use RenderEngine directly for Magic Create and other non-template pages
            console.log('[PDFCanvas] Using RenderEngine fallback for page:', page.templateId || 'unknown');
            const fallbackRenderer = new RenderEngine(null);
            const tempContainer = document.createElement('div');
            tempContainer.style.width = `${width}px`;
            tempContainer.style.height = `${height}px`;
            tempContainer.style.position = 'relative';
            tempContainer.style.overflow = 'hidden';

            // Use the fallback assets or the passed assets
            const effectiveAssets = assets || window._magicAssets || { photos: [] };
            fallbackRenderer.renderPageToContainer(page, effectiveAssets, tempContainer);

            // The renderPageToContainer creates a child .shoso-page element
            pageElement = tempContainer.firstChild || tempContainer;

            if (!pageElement || pageElement === tempContainer) {
                // Last resort fallback
                pageElement = document.createElement('div');
                pageElement.innerHTML = '<div style="padding: 20px;">Page render failed</div>';
            }
        }

        // Apply exact dimensions
        pageElement.style.width = `${width}px`;
        pageElement.style.height = `${height}px`;
        pageElement.style.position = 'relative';
        pageElement.style.overflow = 'hidden';
        pageElement.style.boxSizing = 'border-box';

        container.appendChild(pageElement);

        // Wait for all resources to load
        console.log('[PDFCanvas] Waiting for images to load...');
        await this.waitForImages(pageElement);
        await this.waitForBackgroundImages(pageElement);

        // CRITICAL: Convert all img elements in photo-slots to background-image divs
        // html2canvas does NOT support object-fit/object-position on <img> elements
        const photoSlots = pageElement.querySelectorAll('.photo-slot');
        photoSlots.forEach(slot => {
            const img = slot.querySelector('img');
            if (img && img.src) {
                const div = document.createElement('div');
                div.style.width = '100%';
                div.style.height = '100%';
                div.style.backgroundImage = `url("${img.src}")`;
                div.style.backgroundSize = 'cover';
                div.style.backgroundPosition = img.style.objectPosition || '50% 50%';
                div.style.backgroundRepeat = 'no-repeat';
                if (img.style.filter) div.style.filter = img.style.filter;
                if (img.style.transform) {
                    div.style.transform = img.style.transform;
                    div.style.transformOrigin = img.style.transformOrigin || 'center center';
                }
                img.parentNode.replaceChild(div, img);
            }
        });

        // Small delay for fonts to render
        await new Promise(resolve => setTimeout(resolve, 100));

        // Capture using html2canvas
        console.log('[PDFCanvas] Capturing page with html2canvas...');

        try {
            const canvas = await window.html2canvas(pageElement, {
                width: width,
                height: height,
                scale: 2, // 2x for better quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
                imageTimeout: 30000,
                onclone: (clonedDoc) => {
                    // Ensure fonts are loaded in cloned document
                    const clonedElement = clonedDoc.getElementById('pdf-offscreen-render');
                    if (clonedElement) {
                        clonedElement.style.left = '0';
                        clonedElement.style.visibility = 'visible';
                    }
                }
            });

            console.log('[PDFCanvas] Canvas captured:', canvas.width, 'x', canvas.height);
            return canvas;
        } catch (error) {
            console.error('[PDFCanvas] html2canvas error:', error);
            return null;
        }
    }

    /**
     * Render the entire cover spread (Back, Spine, Front) exactly as seen in editor.
     */
    async renderCoverSpreadToCanvas(cover, assets) {
        const width = this.templateConfig?.designSystem?.canvas?.width || 800;
        const height = this.templateConfig?.designSystem?.canvas?.height || 600;

        // Spread includes Back Cover (flex: 1), Spine (40px approx), Front Cover (flex: 1)
        const spineWidth = 40;
        const spreadWidth = (width * 2) + spineWidth;

        const container = this.createOffscreenContainer(spreadWidth, height);
        console.log(`[PDFCanvas] Rendering Unified Cover Spread as ${spreadWidth}x${height}`);

        // PRE-RASTERIZE: Convert SVG data URIs to PNG BEFORE rendering to DOM
        // html2canvas cannot render SVG at all. We must rasterize to PNG first.
        const renderCover = { ...cover };

        // Helper: rasterize SVG data URI to PNG data URI
        const rasterizeSvg = (svgDataUri, targetWidth, targetHeight) => {
            return new Promise((resolve) => {
                if (!svgDataUri || !svgDataUri.includes('data:image/svg+xml')) {
                    resolve(svgDataUri); // Not an SVG, return as-is
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        canvas.width = targetWidth * 2; // 2x for quality
                        canvas.height = targetHeight * 2;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                        const pngUri = canvas.toDataURL('image/png');
                        console.log(`[PDFCanvas] Rasterized SVG (${svgDataUri.length} chars) → PNG (${pngUri.length} chars)`);
                        resolve(pngUri);
                    } catch (e) {
                        console.warn('[PDFCanvas] SVG rasterization error:', e);
                        resolve(svgDataUri); // Fall back to original
                    }
                };
                img.onerror = () => {
                    console.warn('[PDFCanvas] SVG load error during rasterization');
                    resolve(svgDataUri);
                };
                img.src = svgDataUri;
            });
        };

        // Rasterize front cover background
        if (renderCover.background && renderCover.background.includes('data:image/svg+xml')) {
            const frontWidth = width; // front cover width
            const frontHeight = height;
            renderCover.background = await rasterizeSvg(renderCover.background, frontWidth, frontHeight);
            renderCover.theme = renderCover.background; // Keep in sync
            console.log('[PDFCanvas] Front cover SVG rasterized to PNG');
        }

        // Rasterize back cover SVG
        if (renderCover._backSvgDataUri && renderCover._backSvgDataUri.includes('data:image/svg+xml')) {
            renderCover._backSvgDataUri = await rasterizeSvg(renderCover._backSvgDataUri, width, height);
            console.log('[PDFCanvas] Back cover SVG rasterized to PNG');
        }

        const wrapper = UnifiedCoverRenderer.render({
            cover: renderCover,
            assets,
            templateConfig: this.templateConfig,
            container: null,
            interactive: false
        });

        // Ensure dimensions match for the spread
        wrapper.style.width = `${spreadWidth}px`;
        wrapper.style.height = `${height}px`;
        container.appendChild(wrapper);

        // Wait for resources
        await this.waitForImages(wrapper);
        await this.waitForBackgroundImages(wrapper);
        await new Promise(resolve => setTimeout(resolve, 500)); // Extra time for fonts

        try {
            const spreadCanvas = await window.html2canvas(wrapper, {
                width: spreadWidth,
                height: height,
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });

            // html2canvas uses scale: 2, so all canvas pixel values are doubled
            const scale = 2;

            // 1. Front Canvas (Right side of the spread)
            const frontCanvas = document.createElement('canvas');
            frontCanvas.width = width * scale;
            frontCanvas.height = height * scale;
            const fCtx = frontCanvas.getContext('2d');
            fCtx.drawImage(
                spreadCanvas,
                (width + spineWidth) * scale, 0, width * scale, height * scale, // Source
                0, 0, width * scale, height * scale // Destination
            );

            // 2. Spine Canvas (Center of the spread)
            const spineCanvas = document.createElement('canvas');
            spineCanvas.width = spineWidth * scale;
            spineCanvas.height = height * scale;
            const sCtx = spineCanvas.getContext('2d');
            sCtx.drawImage(
                spreadCanvas,
                width * scale, 0, spineWidth * scale, height * scale, // Source
                0, 0, spineWidth * scale, height * scale // Destination
            );

            // 3. Back Canvas (Left side of the spread)
            const backCanvas = document.createElement('canvas');
            backCanvas.width = width * scale;
            backCanvas.height = height * scale;
            const bCtx = backCanvas.getContext('2d');
            bCtx.drawImage(
                spreadCanvas,
                0, 0, width * scale, height * scale, // Source
                0, 0, width * scale, height * scale // Destination
            );

            return { frontCanvas, spineCanvas, backCanvas };
        } catch (error) {
            console.error('[PDFCanvas] Cover Spread capture error:', error);
            return null;
        }
    }

    /**
     * Main PDF generation method
     */
    async generatePDF(pages, cover, assets, returnBlob = false) {
        console.log("[PDFCanvas] Starting canvas-based PDF generation...");
        console.log("[PDFCanvas] Template config:", this.templateConfig?.templateId);

        // Check for required libraries
        if (!window.jspdf) {
            console.error('[PDFCanvas] jsPDF not found!');
            alert('PDF Library Missing. Please refresh.');
            return;
        }

        if (!window.html2canvas) {
            console.error('[PDFCanvas] html2canvas not found!');
            alert('Canvas Library Missing. Please refresh.');
            return;
        }

        const { jsPDF } = window.jspdf;

        try {
            // Get dimensions from template
            const width = this.templateConfig?.designSystem?.canvas?.width || 800;
            const height = this.templateConfig?.designSystem?.canvas?.height || 600;

            // Convert to points (1px = 0.75pt)
            const ptWidth = width * 0.75;
            const ptHeight = height * 0.75;

            console.log(`[PDFCanvas] Creating PDF: ${ptWidth}pt x ${ptHeight}pt`);

            const doc = new jsPDF({
                orientation: width > height ? 'landscape' : 'portrait',
                unit: 'pt',
                format: [ptWidth, ptHeight]
            });

            // Filter out cover pages from the pages array to avoid duplication
            // Cover pages are identified by having 'cover' in their layoutId or rawLayoutId
            const contentPages = pages.filter(page => {
                const layoutId = (page.rawLayoutId || page.layout?.id || '').toLowerCase();
                const isCoverPage = layoutId.includes('cover');
                if (isCoverPage) {
                    console.log(`[PDFCanvas] Skipping cover page: ${layoutId}`);
                }
                return !isCoverPage;
            });

            console.log(`[PDFCanvas] Total pages: ${pages.length}, Content pages (excluding covers): ${contentPages.length}`);

            // Determine if cover spread is needed
            const hasCover = cover && (cover.frontPhotoId || cover.title || cover.templateId || cover.layout || cover._coverGalleryId || cover.background);
            // If hasCover, we're adding 3 pages (Front, Back, Spine)
            const totalItems = (hasCover ? 3 : 0) + contentPages.length; // front + back + spine

            let pageIndex = 0;
            let backImageData = null;
            let spineImageData = null;

            // 1. Render Cover Spread & Print Front Cover (Page 1)
            if (hasCover) {
                this.showProgress('Rendering Cover Spread...', pageIndex, totalItems);
                const coverCanvases = await this.renderCoverSpreadToCanvas(cover, assets);
                if (coverCanvases) {
                    const frontImgData = coverCanvases.frontCanvas.toDataURL('image/jpeg', 0.95);
                    doc.addImage(frontImgData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
                    console.log('[PDFCanvas] Front Cover added to PDF');

                    backImageData = coverCanvases.backCanvas.toDataURL('image/jpeg', 0.95);
                    spineImageData = coverCanvases.spineCanvas.toDataURL('image/jpeg', 0.95);
                }
                pageIndex++;
            }

            // 2. Render Content Pages
            for (let i = 0; i < contentPages.length; i++) {
                this.showProgress(`Rendering page ${i + 1}...`, pageIndex + i, totalItems);

                if (pageIndex > 0 || i > 0) {
                    doc.addPage([ptWidth, ptHeight]);
                }

                const pageCanvas = await this.renderPageToCanvas(contentPages[i], assets);
                if (pageCanvas) {
                    const imgData = pageCanvas.toDataURL('image/jpeg', 0.95);
                    doc.addImage(imgData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
                    console.log(`[PDFCanvas] Page ${i + 1} added to PDF`);
                }
            }

            // 3. Render Back Cover (Last Content-Sized Page)
            if (backImageData) {
                this.showProgress('Rendering Back Cover...', totalItems - 2, totalItems);
                if (pageIndex > 0 || contentPages.length > 0) {
                    doc.addPage([ptWidth, ptHeight]);
                }
                doc.addImage(backImageData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
                console.log('[PDFCanvas] Back Cover added to PDF');
            }

            // 4. Render Spine as full-width page (centered) for print
            if (spineImageData) {
                this.showProgress('Rendering Spine...', totalItems - 1, totalItems);
                doc.addPage([ptWidth, ptHeight]);
                // Center the narrow spine on a full-size page
                const spinePtWidth = 40 * 0.75;
                const spineX = (ptWidth - spinePtWidth) / 2;
                // Draw a background matching the cover
                doc.setFillColor(240, 240, 240);
                doc.rect(0, 0, ptWidth, ptHeight, 'F');
                doc.addImage(spineImageData, 'JPEG', spineX, 0, spinePtWidth, ptHeight, undefined, 'FAST');
                console.log('[PDFCanvas] Spine added to PDF (centered on full page)');
            }

            // Hide progress
            this.hideProgress();

            // Cleanup
            const container = document.getElementById('pdf-offscreen-render');
            if (container) container.remove();

            console.log("[PDFCanvas] PDF generation complete!");

            // Generate Filename with .pdf extension
            const filename = `photo-book-${new Date().toISOString().slice(0, 10)}.pdf`;

            // Return or download
            if (returnBlob) {
                // For blob return, use arraybuffer method with explicit MIME type
                const pdfData = doc.output('arraybuffer');
                const blob = new Blob([pdfData], { type: 'application/pdf' });
                console.log(`[PDFCanvas] Blob created for return. Size: ${blob.size} bytes, Type: ${blob.type}`);
                return blob;
            }

            // For download, use jsPDF's built-in save method which handles everything properly
            console.log(`[PDFCanvas] Triggering direct download: ${filename}`);
            doc.save(filename);

            console.log("[PDFCanvas] Download triggered successfully.");

            // Show success modal
            this.showSuccessModal(filename);

        } catch (error) {
            console.error('[PDFCanvas] PDF generation failed:', error);
            this.hideProgress();
            alert('PDF Generation Failed: ' + error.message);
        }
    }

    /**
     * Show progress indicator
     */
    showProgress(message, current, total) {
        let overlay = document.getElementById('pdf-progress-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pdf-progress-overlay';
            overlay.innerHTML = `
                <div class="pdf-progress-content">
                    <div class="pdf-progress-spinner"></div>
                    <div class="pdf-progress-message"></div>
                    <div class="pdf-progress-bar-container">
                        <div class="pdf-progress-bar"></div>
                    </div>
                </div>
            `;
            overlay.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.7);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10000;
            `;
            const style = document.createElement('style');
            style.textContent = `
                .pdf-progress-content {
                    background: white;
                    padding: 40px;
                    border-radius: 12px;
                    text-align: center;
                    min-width: 300px;
                }
                .pdf-progress-spinner {
                    width: 40px;
                    height: 40px;
                    border: 4px solid #e0e0e0;
                    border-top: 4px solid #6366f1;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 20px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                .pdf-progress-message {
                    font-size: 16px;
                    color: #333;
                    margin-bottom: 16px;
                }
                .pdf-progress-bar-container {
                    height: 8px;
                    background: #e0e0e0;
                    border-radius: 4px;
                    overflow: hidden;
                }
                .pdf-progress-bar {
                    height: 100%;
                    background: linear-gradient(90deg, #6366f1, #8b5cf6);
                    transition: width 0.3s ease;
                }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);
        }

        overlay.querySelector('.pdf-progress-message').textContent = message;
        const percent = Math.round((current / total) * 100);
        overlay.querySelector('.pdf-progress-bar').style.width = `${percent}%`;
    }

    /**
     * Hide progress indicator
     */
    hideProgress() {
        const overlay = document.getElementById('pdf-progress-overlay');
        if (overlay) overlay.remove();
    }

    /**
     * Show success modal after download starts
     */
    showSuccessModal(filename) {
        const modal = document.getElementById('pdfDownloadModal');
        const btn = document.getElementById('btn-download-trigger');

        if (modal && btn) {
            // Clone button to clear previous event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // Change button text to indicate download has started
            newBtn.innerHTML = '<i class="fa-solid fa-check"></i> Download Started';

            // Button just closes the modal
            newBtn.onclick = (e) => {
                e.preventDefault();
                modal.classList.remove('active');
            };

            // Show modal
            modal.classList.add('active');

            // Auto-close after 3 seconds
            setTimeout(() => {
                modal.classList.remove('active');
            }, 3000);
        }
    }

    /**
     * Show download modal
     */
    showDownloadModal(url, docInstance = null, filenameProvided = null) {
        const modal = document.getElementById('pdfDownloadModal');
        const btn = document.getElementById('btn-download-trigger');
        const filename = filenameProvided || `photo-book-${new Date().toISOString().slice(0, 10)}.pdf`;

        if (modal && btn) {
            // Clone button to clear previous event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            // Add robust download handler
            newBtn.onclick = (e) => {
                e.preventDefault();
                console.log(`[PDFCanvas] Button Clicked. Filename: ${filename}`);
                console.log(`[PDFCanvas] URL MIME type check - URL: ${url.substring(0, 50)}...`);

                // Visual feedback
                newBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';

                // FORCE MANUAL DOWNLOAD - Multiple attempts for browser compatibility
                try {
                    // Create anchor element for download
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    a.type = 'application/pdf'; // Explicitly set type attribute

                    // Append to body and trigger click
                    document.body.appendChild(a);

                    // Trigger download
                    a.click();

                    console.log(`[PDFCanvas] Download triggered for ${filename} (Type: application/pdf)`);

                    // Cleanup after delay
                    setTimeout(() => {
                        newBtn.innerHTML = 'Download PDF';
                        if (document.body.contains(a)) {
                            document.body.removeChild(a);
                        }
                        // Revoke object URL after download completes
                        URL.revokeObjectURL(url);
                    }, 3000);

                } catch (err) {
                    console.error("[PDFCanvas] Download error:", err);
                    alert("Download Error: " + err.message);
                    newBtn.innerHTML = 'Download PDF';
                }
            };

            modal.classList.add('active');
        } else {
            // Fallback: Direct save
            // Fallback: Direct save
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        }
    }

    triggerDownload(url, filename) {
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        // Revoke manually later or let garbage collector handle it logic outside
    }
}

// Export singleton
export const pdfCanvasExport = new PDFCanvasExport();
