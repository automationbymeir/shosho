/**
 * Canvas-Based PDF Generator for Shoso AI Editor
 * Uses html2canvas to capture exact visual representation of pages rendered by template renderers.
 * This ensures 100% visual fidelity between the editor view and exported PDF.
 */

import { authService } from '../services/firebase-auth-service.js';

// Import all template renderers to ensure they are available
import { UnifiedTemplateRenderer } from '../templates/unified-template-renderer.js';
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
     * Set the physical book size in centimetres.
     * This overrides the canvas-derived PDF page dimensions so the output PDF
     * is at the correct physical size for printing (e.g. 20×20 cm).
     * @param {number} widthCm
     * @param {number} heightCm
     */
    setBookSizeCm(widthCm, heightCm) {
        this.bookSizeCm = { width: widthCm, height: heightCm };
        console.log(`[PDFCanvas] Book size set: ${widthCm}×${heightCm} cm`);
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
        if (templateId && this.templateConfig) {
            // Unified renderer for ALL templates
            renderer = new UnifiedTemplateRenderer(this.templateConfig);
        } else {
            // Fallback for non-template pages
            renderer = new RenderEngine('offscreen-render');
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

                // INJECT USER ELEMENTS (text, shapes, visual elements like flags)
                await this._injectPageElements(page, pageElement, width, height);
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
     * Inject user-placed elements (text, shapes, visual elements like flags) into a rendered page.
     * These are stored in page.elements and include drag transforms from Moveable.
     * Made async to support SVG rasterization for html2canvas compatibility.
     */
    async _injectPageElements(page, pageElement, width, height) {
        if (!page.elements || !Array.isArray(page.elements) || page.elements.length === 0) return;

        console.log(`[PDFCanvas] Injecting ${page.elements.length} elements into page ${page.id}`);

        for (const el of page.elements) {
            // SKIP TemplateManager-managed elements — they have id prefixes text_/dec_/container_
            // and are already rendered by UnifiedTemplateRenderer (layout.textElements + decorations).
            // The editor view (app.js renderActivePage) uses the same guard at line 1072.
            // Without this skip the same text/decoration renders twice in the PDF.
            if (el.id && (el.id.startsWith('text_') || el.id.startsWith('dec_') || el.id.startsWith('container_'))) {
                console.log(`[PDFCanvas] Skipping TemplateManager element "${el.id}" — already rendered by template renderer`);
                continue;
            }

            const domEl = document.createElement('div');
            domEl.className = `page-element element-${el.type}`;
            domEl.style.position = 'absolute';
            domEl.style.left = `${el.x}%`;
            domEl.style.top = `${el.y}%`;
            if (el.zIndex !== undefined) domEl.style.zIndex = el.zIndex;

            // Apply drag/resize transform from Moveable
            if (el.transform) domEl.style.transform = el.transform;

            if (el.type === 'text') {
                // Secondary dedup guard: skip if a [data-selectable-id] with the same id
                // already exists in the page (e.g. from a different template renderer).
                if (el.id && pageElement.querySelector(`[data-selectable-id="${el.id}"]`)) {
                    console.log(`[PDFCanvas] Skipping duplicate text element "${el.id}" — already rendered by template`);
                    continue;
                }

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
                // Support both 'color' and 'fill' (rgba/gradient)
                if (el.fill)  domEl.style.backgroundColor = el.fill;
                if (el.color) domEl.style.backgroundColor = el.color;
                if (el.borderRadius) domEl.style.borderRadius = `${el.borderRadius}px`;
            } else if (el.type === 'element') {
                domEl.classList.add('visual-element');
                domEl.style.width = el.pixelWidth || '100px';
                domEl.style.height = el.pixelHeight || '100px';

                // For SVG data URIs: decode and embed as inline <svg>
                // html2canvas renders inline SVGs natively (unlike background-image SVGs)
                if (el.url && el.url.includes('data:image/svg+xml')) {
                    try {
                        let svgMarkup = '';
                        if (el.url.includes(';utf8,') || el.url.includes(';charset=utf-8,')) {
                            // URL-encoded SVG
                            const dataStart = el.url.indexOf(',') + 1;
                            svgMarkup = decodeURIComponent(el.url.substring(dataStart));
                        } else if (el.url.includes(';base64,')) {
                            // Base64-encoded SVG
                            const dataStart = el.url.indexOf(',') + 1;
                            svgMarkup = atob(el.url.substring(dataStart));
                        }
                        if (svgMarkup && svgMarkup.includes('<svg')) {
                            domEl.innerHTML = svgMarkup;
                            const svgEl = domEl.querySelector('svg');
                            if (svgEl) {
                                svgEl.style.width = '100%';
                                svgEl.style.height = '100%';
                                svgEl.setAttribute('width', '100%');
                                svgEl.setAttribute('height', '100%');
                            }
                            console.log(`[PDFCanvas] Embedded inline SVG for element ${el.id}`);
                        } else {
                            // Could not parse, fallback to img
                            const img = document.createElement('img');
                            img.src = el.url;
                            img.style.cssText = 'width:100%;height:100%;';
                            domEl.appendChild(img);
                        }
                    } catch (e) {
                        console.warn('[PDFCanvas] SVG decode error:', e);
                        const img = document.createElement('img');
                        img.src = el.url;
                        img.style.cssText = 'width:100%;height:100%;';
                        domEl.appendChild(img);
                    }
                } else {
                    // Non-SVG image URL
                    const img = document.createElement('img');
                    img.src = el.url;
                    img.crossOrigin = 'anonymous';
                    img.style.cssText = 'width:100%;height:100%;object-fit:contain;';
                    domEl.appendChild(img);
                }

                let filterStr = '';
                if (el.filterHue) filterStr += `hue-rotate(${el.filterHue}deg) `;
                if (el.filterBrightness && el.filterBrightness !== 100) filterStr += `brightness(${el.filterBrightness}%) `;
                if (el.filterShadow) filterStr += `drop-shadow(2px 4px 6px ${el.filterShadowColor || 'rgba(0,0,0,0.5)'}) `;
                if (filterStr) domEl.style.filter = filterStr.trim();
            }

            pageElement.appendChild(domEl);
        }
    }

    /**
     * Rasterize an SVG data URI to a PNG data URI via canvas.
     */
    _rasterizeSvgToCanvas(svgDataUri, targetWidth, targetHeight) {
        return new Promise((resolve) => {
            if (!svgDataUri || !svgDataUri.includes('data:image/svg+xml')) {
                resolve(svgDataUri);
                return;
            }
            const img = new Image();
            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    canvas.width = targetWidth * 2;
                    canvas.height = targetHeight * 2;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    const pngUri = canvas.toDataURL('image/png');
                    console.log(`[PDFCanvas] Rasterized element SVG → PNG`);
                    resolve(pngUri);
                } catch (e) {
                    console.warn('[PDFCanvas] Element SVG rasterization error:', e);
                    resolve(svgDataUri);
                }
            };
            img.onerror = () => {
                console.warn('[PDFCanvas] Element SVG load error');
                resolve(svgDataUri);
            };
            img.src = svgDataUri;
        });
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

            return { frontCanvas, spineCanvas, backCanvas, spreadCanvas, spreadWidth, height };
        } catch (error) {
            console.error('[PDFCanvas] Cover Spread capture error:', error);
            return null;
        }
    }

    /**
     * Generate a print-ready cover PDF — single page, split evenly:
     *   Left half  = front cover
     *   Right half = back cover
     * Page dimensions = 2× book width × book height (+ 3 mm bleed on all outer edges).
     *
     * @param {Object} cover  - Cover state from store
     * @param {Object} assets - Assets with photos array
     * @returns {Promise<Blob|null>}
     */
    async generateCoverPDF(cover, assets) {
        if (!window.jspdf) {
            console.error('[PDFCanvas] jsPDF not found for cover PDF');
            return null;
        }
        const { jsPDF } = window.jspdf;

        const CM_TO_PT = 28.3465;
        const MM_TO_PT = 2.83465;
        const BLEED_PT = 3 * MM_TO_PT;          // 3 mm bleed

        let trimWPt, trimHPt;
        if (this.bookSizeCm) {
            trimWPt = this.bookSizeCm.width  * CM_TO_PT;
            trimHPt = this.bookSizeCm.height * CM_TO_PT;
        } else {
            const canvW = this.templateConfig?.designSystem?.canvas?.width  || 800;
            const canvH = this.templateConfig?.designSystem?.canvas?.height || 600;
            trimWPt = canvW * 0.75;
            trimHPt = canvH * 0.75;
        }

        // Page = 2 covers side by side, bleed on outer edges only
        // Total media: (2 × trimW + 2 × bleed) × (trimH + 2 × bleed)
        const mediaWPt = trimWPt * 2 + 2 * BLEED_PT;
        const mediaHPt = trimHPt + 2 * BLEED_PT;
        // Each half (cover + its outer bleed) occupies half the media width
        const halfW = mediaWPt / 2;

        console.log(`[PDFCanvas] Cover PDF (2-up) | ${trimWPt.toFixed(1)}×${trimHPt.toFixed(1)}pt per side | media=${mediaWPt.toFixed(1)}×${mediaHPt.toFixed(1)}pt`);

        try {
            const cc = await this.renderCoverSpreadToCanvas(cover, assets);
            if (!cc) {
                console.error('[PDFCanvas] Cover spread render failed');
                return null;
            }

            // Always landscape — the 2-up spread is always wider than tall.
            // MUST pass orientation explicitly: without it jsPDF silently swaps
            // width/height back to portrait when width > height.
            const doc = new jsPDF({ unit: 'pt', format: [mediaWPt, mediaHPt], orientation: 'landscape' });
            doc.setProperties({
                title:   cover?.title || 'Shoso Cover',
                author:  'Shoso',
                creator: 'Shoso AI Photo Book Creator'
            });

            // TrimBox covers both halves (full trim area, excluding bleed)
            const trimBoxVal  = `${BLEED_PT.toFixed(3)} ${BLEED_PT.toFixed(3)} ${(BLEED_PT + trimWPt * 2).toFixed(3)} ${(BLEED_PT + trimHPt).toFixed(3)}`;
            const bleedBoxVal = `0 0 ${mediaWPt.toFixed(3)} ${mediaHPt.toFixed(3)}`;
            try {
                doc.internal.events.subscribe('putPage', function () {
                    doc.internal.write(`/TrimBox [${trimBoxVal}]`);
                    doc.internal.write(`/BleedBox [${bleedBoxVal}]`);
                });
            } catch (e) { /* non-fatal */ }

            // Left half: front cover
            doc.addImage(cc.frontCanvas.toDataURL('image/jpeg', 0.95), 'JPEG',
                0, 0, halfW, mediaHPt, undefined, 'FAST');

            // Right half: back cover
            doc.addImage(cc.backCanvas.toDataURL('image/jpeg', 0.95), 'JPEG',
                halfW, 0, halfW, mediaHPt, undefined, 'FAST');

            const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
            console.log(`[PDFCanvas] Cover PDF 2-up blob: ${blob.size} bytes`);
            return blob;
        } catch (err) {
            console.error('[PDFCanvas] generateCoverPDF failed:', err);
            return null;
        }
    }

    /**
     * Main PDF generation method.
     *
     * Print mode  (returnBlob = true):
     *   • No cover (cover PDF is generated server-side by generateBookpodCoverPdf)
     *   • MediaBox = TrimBox + 3mm bleed on all sides
     *   • Content canvas is scaled to fill the MediaBox so backgrounds "bleed"
     *     3mm beyond the trim edge — correct bleed behaviour
     *   • Page count is padded to an even number (required for soft-cover binding)
     *   • TrimBox + BleedBox injected into every page dictionary
     *   • PDF metadata (Title, Author, Creator)
     *
     * Preview mode (returnBlob = false):
     *   • Cover spread included (first pages)
     *   • MediaBox = TrimBox (no bleed padding)
     *   • Saved to file as a full-book preview PDF
     */
    async generatePDF(pages, cover, assets, returnBlob = false) {
        console.log("[PDFCanvas] Starting canvas-based PDF generation...");

        if (!window.jspdf) {
            console.error('[PDFCanvas] jsPDF not found!');
            alert('ספריית PDF חסרה. אנא רענן את הדף.');
            return;
        }
        if (!window.html2canvas) {
            console.error('[PDFCanvas] html2canvas not found!');
            alert('ספריית Canvas חסרה. אנא רענן את הדף.');
            return;
        }

        const { jsPDF } = window.jspdf;

        // ── Constants ──────────────────────────────────────────────────────────
        const CM_TO_PT  = 28.3465;
        const MM_TO_PT  = 2.83465;
        const BLEED_MM  = 3;                       // 3 mm bleed on every side
        const BLEED_PT  = BLEED_MM * MM_TO_PT;     // ≈ 8.504 pt
        const SAFE_PT   = 5 * MM_TO_PT;            // 5 mm safe zone from trim edge

        const isPrintMode = returnBlob;

        try {
            // ── Trim (physical book) dimensions ────────────────────────────────
            let trimWPt, trimHPt;
            if (this.bookSizeCm) {
                trimWPt = this.bookSizeCm.width  * CM_TO_PT;
                trimHPt = this.bookSizeCm.height * CM_TO_PT;
            } else {
                const canvW = this.templateConfig?.designSystem?.canvas?.width  || 800;
                const canvH = this.templateConfig?.designSystem?.canvas?.height || 600;
                trimWPt = canvW * 0.75;
                trimHPt = canvH * 0.75;
            }

            // Orientation derived from the selected physical size, not pixel canvas
            const orientation = trimWPt > trimHPt ? 'landscape' : 'portrait';

            // In print mode add bleed; preview uses trim size directly
            const bleedPt  = isPrintMode ? BLEED_PT : 0;
            const mediaWPt = trimWPt + 2 * bleedPt;
            const mediaHPt = trimHPt + 2 * bleedPt;

            console.log(
                `[PDFCanvas] ${isPrintMode ? 'PRINT' : 'PREVIEW'} | ` +
                `${orientation} | ` +
                `trim=${trimWPt.toFixed(1)}×${trimHPt.toFixed(1)}pt | ` +
                `media=${mediaWPt.toFixed(1)}×${mediaHPt.toFixed(1)}pt`
            );

            // ── Create jsPDF document ──────────────────────────────────────────
            // Pass orientation explicitly so jsPDF never swaps width/height for
            // landscape books (trimWPt > trimHPt). Without this param jsPDF
            // defaults to portrait and silently swaps dimensions.
            const doc = new jsPDF({ unit: 'pt', format: [mediaWPt, mediaHPt], orientation });

            // PDF metadata (satisfies BookPod's XMP/metadata requirement)
            doc.setProperties({
                title:    cover?.title   || 'Shoso Photo Book',
                author:   'Shoso',
                creator:  'Shoso AI Photo Book Creator',
                subject:  'Photo Book',
                keywords: 'photobook, photos, memories'
            });

            // ── TrimBox + BleedBox in every page dictionary ────────────────────
            // The image is placed at (0,0) and sized to mediaWPt×mediaHPt,
            // so the trim box is inset by bleedPt from each edge.
            if (isPrintMode && bleedPt > 0) {
                const trimBoxVal  = `${bleedPt.toFixed(3)} ${bleedPt.toFixed(3)} ${(bleedPt + trimWPt).toFixed(3)} ${(bleedPt + trimHPt).toFixed(3)}`;
                const bleedBoxVal = `0 0 ${mediaWPt.toFixed(3)} ${mediaHPt.toFixed(3)}`;
                // ArtBox marks the "safe zone" — 5 mm inside the trim edge
                const artBoxVal   = `${(bleedPt + SAFE_PT).toFixed(3)} ${(bleedPt + SAFE_PT).toFixed(3)} ${(bleedPt + trimWPt - SAFE_PT).toFixed(3)} ${(bleedPt + trimHPt - SAFE_PT).toFixed(3)}`;
                try {
                    doc.internal.events.subscribe('putPage', function () {
                        // Fires for every page during doc.output() serialisation
                        doc.internal.write(`/TrimBox [${trimBoxVal}]`);
                        doc.internal.write(`/BleedBox [${bleedBoxVal}]`);
                        doc.internal.write(`/ArtBox [${artBoxVal}]`);
                    });
                } catch (e) {
                    console.warn('[PDFCanvas] TrimBox/BleedBox injection skipped:', e.message);
                }
            }

            // ── Helper: place image filling the full MediaBox ──────────────────
            // Scaling the trim-size canvas to fill the MediaBox (trim + bleed) means
            // edge content extends ~3 mm into the bleed zone — correct bleed behaviour.
            // Safe-zone content (≥5 mm from trim) is never cut.
            const placeImage = (imgData) => {
                doc.addImage(imgData, 'JPEG', 0, 0, mediaWPt, mediaHPt, undefined, 'FAST');
            };

            // ── Helper: add a blank white page ────────────────────────────────
            const addBlankPage = () => {
                doc.addPage([mediaWPt, mediaHPt], orientation);
                doc.setFillColor(255, 255, 255);
                doc.rect(0, 0, mediaWPt, mediaHPt, 'F');
            };

            // ── Exclude cover-layout pages from content array ──────────────────
            // Filter by rawLayoutId / layout.id containing 'cover' OR pageType === 'cover'
            const contentPages = pages.filter(page => {
                const lid = (page.rawLayoutId || page.layout?.id || '').toLowerCase();
                const ptype = (page.pageType || page.layout?.pageType || '').toLowerCase();
                if (lid.includes('cover') || ptype === 'cover') {
                    console.log(`[PDFCanvas] Skipping cover-layout page: ${lid || ptype}`);
                    return false;
                }
                return true;
            });

            console.log(`[PDFCanvas] Content pages: ${contentPages.length} (of ${pages.length} total)`);

            // In preview mode include cover; in print mode cover is generated server-side
            const hasCover = !isPrintMode && cover &&
                (cover.frontPhotoId || cover.title || cover.templateId ||
                 cover.layout || cover._coverGalleryId || cover.background);

            const totalItems = (hasCover ? 2 : 0) + contentPages.length;
            let progressIdx  = 0;

            // ── Cover spread (preview mode only) ──────────────────────────────
            if (hasCover) {
                this.showProgress('Rendering Cover...', progressIdx, totalItems);
                const cc = await this.renderCoverSpreadToCanvas(cover, assets);
                if (cc) {
                    placeImage(cc.frontCanvas.toDataURL('image/jpeg', 0.95));
                    progressIdx++;
                    doc.addPage([mediaWPt, mediaHPt], orientation);
                    placeImage(cc.backCanvas.toDataURL('image/jpeg', 0.95));
                    progressIdx++;
                }
            }

            // ── Content pages ──────────────────────────────────────────────────
            for (let i = 0; i < contentPages.length; i++) {
                this.showProgress(`מעבד עמוד ${i + 1} מתוך ${contentPages.length}...`, progressIdx + i, totalItems);

                if (progressIdx > 0 || i > 0) doc.addPage([mediaWPt, mediaHPt], orientation);

                const pageCanvas = await this.renderPageToCanvas(contentPages[i], assets);
                if (pageCanvas) {
                    placeImage(pageCanvas.toDataURL('image/jpeg', 0.95));
                    console.log(`[PDFCanvas] Page ${i + 1} added`);
                } else {
                    // Blank page fallback so page count stays consistent
                    doc.setFillColor(255, 255, 255);
                    doc.rect(0, 0, mediaWPt, mediaHPt, 'F');
                }
            }

            // ── Pad to even page count (BookPod soft-cover requirement) ────────
            if (isPrintMode) {
                const nPages = doc.internal.getNumberOfPages();
                if (nPages % 2 !== 0) {
                    console.log(`[PDFCanvas] Adding blank page — page count ${nPages} → ${nPages + 1} (even)`);
                    addBlankPage();
                }
                console.log(`[PDFCanvas] Final page count: ${doc.internal.getNumberOfPages()}`);
            }

            // ── Finalise ───────────────────────────────────────────────────────
            this.hideProgress();
            const container = document.getElementById('pdf-offscreen-render');
            if (container) container.remove();

            const filename = `photo-book-${new Date().toISOString().slice(0, 10)}.pdf`;

            if (returnBlob) {
                const blob = new Blob([doc.output('arraybuffer')], { type: 'application/pdf' });
                console.log(`[PDFCanvas] Print-ready blob: ${blob.size} bytes, ${doc.internal.getNumberOfPages()} pages`);
                return blob;
            }

            doc.save(filename);
            this.showSuccessModal(filename);

        } catch (error) {
            console.error('[PDFCanvas] PDF generation failed:', error);
            this.hideProgress();
            alert('יצירת ה-PDF נכשלה: ' + error.message);
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
                    alert("שגיאת הורדה: " + err.message);
                    newBtn.innerHTML = 'הורד PDF';
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
