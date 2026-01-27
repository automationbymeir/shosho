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
            console.warn('[PDFCanvas] No renderer found for template:', page.templateId);
            return null;
        }

        // Render the page to DOM
        let pageElement;

        if (page.templateId && this.templateConfig?.pageLayouts) {
            // Template-based rendering
            const layout = this.templateConfig.pageLayouts.find(l => l.layoutId === page.rawLayoutId);

            if (layout && renderer.renderPage) {
                pageElement = renderer.renderPage(
                    layout,
                    page.photos || [],
                    page.textContent || {},
                    page.textPositions || {}
                );
            }
        }

        if (!pageElement) {
            // Fallback: Create a basic page representation
            pageElement = document.createElement('div');
            pageElement.innerHTML = '<div style="padding: 20px;">Page render failed</div>';
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
     * Render front cover page to canvas - FULL PAGE PHOTO with text overlay
     */
    async renderFrontCoverToCanvas(cover, assets) {
        const width = this.templateConfig?.designSystem?.canvas?.width || 800;
        const height = this.templateConfig?.designSystem?.canvas?.height || 600;

        const container = this.createOffscreenContainer(width, height);

        console.log(`[PDFCanvas] Rendering front cover with frontPhotoId: ${cover.frontPhotoId}`);

        // Create a full-page front cover element
        const frontCoverEl = document.createElement('div');
        frontCoverEl.style.cssText = `
            width: ${width}px;
            height: ${height}px;
            position: relative;
            overflow: hidden;
            background-color: ${cover.color || '#ffffff'};
        `;

        // Add front photo if exists - FULL BLEED
        if (cover.frontPhotoId && assets?.photos) {
            const photo = assets.photos.find(p => p.id === cover.frontPhotoId);
            if (photo) {
                const img = document.createElement('img');
                img.src = photo.highResUrl || photo.url || photo.thumbnailUrl;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                `;
                frontCoverEl.appendChild(img);
                console.log(`[PDFCanvas] Front cover photo loaded: ${photo.id}`);
            }
        }

        // Add text overlay if title/subtitle exist
        if (cover.title || cover.subtitle) {
            const textOverlay = document.createElement('div');
            textOverlay.style.cssText = `
                position: absolute;
                bottom: 10%;
                left: 50%;
                transform: translateX(-50%);
                text-align: center;
                color: ${cover.textColor || '#ffffff'};
                text-shadow: 2px 2px 4px rgba(0,0,0,0.7);
                z-index: 10;
            `;

            if (cover.title) {
                const titleEl = document.createElement('h1');
                titleEl.textContent = cover.title;
                titleEl.style.cssText = `
                    font-size: 48px;
                    font-weight: bold;
                    margin: 0 0 10px 0;
                    font-family: ${this.templateConfig?.designSystem?.typography?.heading?.family || 'serif'};
                `;
                textOverlay.appendChild(titleEl);
            }

            if (cover.subtitle) {
                const subtitleEl = document.createElement('h2');
                subtitleEl.textContent = cover.subtitle;
                subtitleEl.style.cssText = `
                    font-size: 24px;
                    font-weight: normal;
                    margin: 0;
                    font-family: ${this.templateConfig?.designSystem?.typography?.body?.family || 'sans-serif'};
                `;
                textOverlay.appendChild(subtitleEl);
            }

            frontCoverEl.appendChild(textOverlay);
        }

        container.appendChild(frontCoverEl);

        // Wait for resources
        await this.waitForImages(frontCoverEl);
        await this.waitForBackgroundImages(frontCoverEl);
        await new Promise(resolve => setTimeout(resolve, 200)); // Extra time for high-res

        // Capture at high resolution
        try {
            const canvas = await window.html2canvas(frontCoverEl, {
                width: width,
                height: height,
                scale: 2, // 2x for high quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });
            return canvas;
        } catch (error) {
            console.error('[PDFCanvas] Front cover capture error:', error);
            return null;
        }
    }

    /**
     * Render spine page to canvas
     */
    async renderSpineToCanvas(cover, assets) {
        const width = this.templateConfig?.designSystem?.canvas?.width || 800;
        const height = this.templateConfig?.designSystem?.canvas?.height || 600;

        const container = this.createOffscreenContainer(width, height);

        console.log(`[PDFCanvas] Rendering spine page`);

        // Create spine element
        const spineEl = document.createElement('div');
        spineEl.style.cssText = `
            width: ${width}px;
            height: ${height}px;
            position: relative;
            overflow: hidden;
            background-color: ${cover.color || '#1a1a1a'};
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Add spine text rotated vertically
        const textContainer = document.createElement('div');
        textContainer.style.cssText = `
            transform: rotate(90deg);
            white-space: nowrap;
            color: ${cover.textColor || '#ffffff'};
            text-align: center;
        `;

        if (cover.title) {
            const titleEl = document.createElement('span');
            titleEl.textContent = cover.title;
            titleEl.style.cssText = `
                font-size: 36px;
                font-weight: bold;
                font-family: ${this.templateConfig?.designSystem?.typography?.heading?.family || 'serif'};
            `;
            textContainer.appendChild(titleEl);
        }

        if (cover.subtitle) {
            const subtitleEl = document.createElement('span');
            subtitleEl.textContent = ' • ' + cover.subtitle;
            subtitleEl.style.cssText = `
                font-size: 24px;
                font-weight: normal;
                font-family: ${this.templateConfig?.designSystem?.typography?.body?.family || 'sans-serif'};
                margin-left: 20px;
            `;
            textContainer.appendChild(subtitleEl);
        }

        spineEl.appendChild(textContainer);
        container.appendChild(spineEl);

        await new Promise(resolve => setTimeout(resolve, 100));

        // Capture
        try {
            const canvas = await window.html2canvas(spineEl, {
                width: width,
                height: height,
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: cover.color || '#1a1a1a',
                logging: false
            });
            return canvas;
        } catch (error) {
            console.error('[PDFCanvas] Spine capture error:', error);
            return null;
        }
    }

    /**
     * Render back cover page to canvas - FULL PAGE PHOTO
     */
    async renderBackCoverToCanvas(cover, assets) {
        const width = this.templateConfig?.designSystem?.canvas?.width || 800;
        const height = this.templateConfig?.designSystem?.canvas?.height || 600;

        const container = this.createOffscreenContainer(width, height);

        console.log(`[PDFCanvas] Rendering back cover with backPhotoId: ${cover.backPhotoId}`);

        // Create a simple full-page back cover element
        const backCoverEl = document.createElement('div');
        backCoverEl.style.cssText = `
            width: ${width}px;
            height: ${height}px;
            position: relative;
            overflow: hidden;
            background-color: ${cover.color || '#ffffff'};
        `;

        // Add back photo if exists - FULL BLEED
        if (cover.backPhotoId && assets?.photos) {
            const photo = assets.photos.find(p => p.id === cover.backPhotoId);
            if (photo) {
                const img = document.createElement('img');
                img.src = photo.highResUrl || photo.url || photo.thumbnailUrl;
                img.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    object-position: center;
                `;
                backCoverEl.appendChild(img);
                console.log(`[PDFCanvas] Back cover photo loaded: ${photo.id}`);
            }
        }

        container.appendChild(backCoverEl);

        // Wait for resources
        await this.waitForImages(backCoverEl);
        await this.waitForBackgroundImages(backCoverEl);
        await new Promise(resolve => setTimeout(resolve, 200)); // Extra time for high-res

        // Capture at high resolution
        try {
            const canvas = await window.html2canvas(backCoverEl, {
                width: width,
                height: height,
                scale: 2, // 2x for high quality
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false
            });
            return canvas;
        } catch (error) {
            console.error('[PDFCanvas] Back cover capture error:', error);
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

            // Calculate total items for progress (front cover + content pages + spine + back cover)
            const hasFrontCover = cover && (cover.frontPhotoId || cover.title);
            const hasBackCover = cover && cover.backPhotoId;
            const hasSpine = cover && (cover.title || cover.subtitle);
            const totalItems = (hasFrontCover ? 1 : 0) + contentPages.length + (hasSpine ? 1 : 0) + (hasBackCover ? 1 : 0);

            let pageIndex = 0;

            // 1. Render Front Cover (Page 1)
            if (hasFrontCover) {
                this.showProgress('Rendering front cover...', pageIndex, totalItems);
                const frontCoverCanvas = await this.renderFrontCoverToCanvas(cover, assets);
                if (frontCoverCanvas) {
                    const imgData = frontCoverCanvas.toDataURL('image/jpeg', 0.95); // Increased quality to 95%
                    doc.addImage(imgData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
                    console.log('[PDFCanvas] Front cover added to PDF');
                }
                pageIndex++;
            }

            // 2. Render Content Pages (excluding cover pages)
            for (let i = 0; i < contentPages.length; i++) {
                this.showProgress(`Rendering page ${i + 1}...`, pageIndex + i, totalItems);

                // Add new page (first page after cover, or first page if no cover)
                if (pageIndex > 0 || i > 0) {
                    doc.addPage([ptWidth, ptHeight]);
                }

                const pageCanvas = await this.renderPageToCanvas(contentPages[i], assets);
                if (pageCanvas) {
                    const imgData = pageCanvas.toDataURL('image/jpeg', 0.95); // Increased quality to 95%
                    doc.addImage(imgData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
                    console.log(`[PDFCanvas] Page ${i + 1} added to PDF`);
                }
            }

            // 3. Render Spine Page (if title exists)
            if (hasSpine) {
                this.showProgress('Rendering spine...', totalItems - (hasBackCover ? 2 : 1), totalItems);
                doc.addPage([ptWidth, ptHeight]);
                const spineCanvas = await this.renderSpineToCanvas(cover, assets);
                if (spineCanvas) {
                    const imgData = spineCanvas.toDataURL('image/jpeg', 0.95);
                    doc.addImage(imgData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
                    console.log('[PDFCanvas] Spine added to PDF');
                }
            }

            // 4. Render Back Cover (Last Page)
            if (hasBackCover) {
                this.showProgress('Rendering back cover...', totalItems - 1, totalItems);
                doc.addPage([ptWidth, ptHeight]);
                const backCoverCanvas = await this.renderBackCoverToCanvas(cover, assets);
                if (backCoverCanvas) {
                    const imgData = backCoverCanvas.toDataURL('image/jpeg', 0.95); // Increased quality to 95%
                    doc.addImage(imgData, 'JPEG', 0, 0, ptWidth, ptHeight, undefined, 'FAST');
                    console.log('[PDFCanvas] Back cover added to PDF');
                }
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
