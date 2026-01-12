/**
 * Client-Side PDF Generator for Shoso AI Editor
 * Uses jspdf to generate high-quality print PDFs from the editor state.
 */

import { layoutEngine } from './layout-engine.js';

export class PDFExport {
    constructor() {
        this.doc = null;
    }

    async generatePDF(pages, cover, assets, returnBlob = false) {
        console.log("PDF: Starting generation...");
        if (!window.jspdf) {
            console.error('PDF: jsPDF global not found!');
            alert('PDF Library Missing. Please refresh.');
            return;
        }

        const { jsPDF } = window.jspdf;
        console.log("PDF: jsPDF loaded. Creating doc...");

        try {
            // Use 'pt' units to better align with the hardcoded "pixel-like" values 
            // in the SVG generators (e.g., stoke-width=4, inset=20).
            // 200mm matches roughly 567pt.
            this.doc = new jsPDF({
                orientation: 'landscape',
                unit: 'pt',
                format: [567, 567]
            });
            console.log("PDF: Doc created (pt units).");

            // 1. Render Cover
            console.log("PDF: Rendering Cover...");
            await this.renderCoverToPDF(cover, assets);

            // 2. Render Pages
            console.log(`PDF: Rendering ${pages.length} pages...`);
            for (let i = 0; i < pages.length; i++) {
                this.doc.addPage();
                console.log(`PDF: Rendering Page ${i + 1}`);
                await this.renderPageToPDF(pages[i], assets);
            }

            console.log("PDF: Rendering complete. Saving...");
            // 3. Save or Return
            if (returnBlob) {
                return this.doc.output('blob');
            }
            // Robust download via Modal to avoid Async Blocking
            const blob = this.doc.output('blob');
            const url = URL.createObjectURL(blob);

            // Show Modal
            this.showDownloadModal(url);

            console.log("PDF: Download modal triggered.");
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Export Failed: " + err.message);
        }
    }

    async renderCoverToPDF(cover, assets) {
        const width = this.doc.internal.pageSize.getWidth();
        const height = this.doc.internal.pageSize.getHeight();

        // 1. Background (Texture or Color)
        await this.drawBackground(cover.color, cover.theme, width, height);

        // 2. Font & Text Color
        this.doc.setTextColor(cover.textColor || "#000000");
        const fontName = this.mapFont(cover.theme);
        this.doc.setFont(fontName, "bold");

        // 3. Layout Logic
        if (cover.layout === 'full-bleed') {
            if (cover.frontPhotoId) {
                await this.drawImage(cover.frontPhotoId, 0, 0, width, height, assets);
            }
            // Text Overlay
            this.doc.setFontSize(24);
            this.doc.text(cover.title, width / 2, height - 30, { align: 'center' });
            this.doc.setFontSize(14);
            this.doc.text(cover.subtitle, width / 2, height - 20, { align: 'center' });
        } else {
            // Standard
            if (cover.frontPhotoId) {
                // Photo inset based on layout
                await this.drawImage(cover.frontPhotoId, width * 0.1, height * 0.1, width * 0.8, height * 0.6, assets);
            }
            this.doc.setFontSize(24);
            this.doc.text(cover.title, width / 2, height - 80, { align: 'center' });
            this.doc.setFontSize(14);
            this.doc.text(cover.subtitle, width / 2, height - 60, { align: 'center' });
        }
    }

    async renderPageToPDF(page, assets) {
        const width = this.doc.internal.pageSize.getWidth();
        const height = this.doc.internal.pageSize.getHeight();

        // 1. Background
        await this.drawBackground(page.background, null, width, height);

        // 2. Page Frame
        if (page.pageFrameId && window.PAGE_FRAMES) {
            const frameDef = window.PAGE_FRAMES.find(f => f.id === page.pageFrameId);
            if (frameDef) {
                const svgContent = frameDef.svgGen(width, height, frameDef.color);
                await this.drawSvg(svgContent, 0, 0, width, height);
            }
        }

        // 3. Layout Slots
        let layoutSlots = [];
        if (page.layout && page.layout.slots) {
            layoutSlots = page.layout.slots;
        } else if (page.photos && page.photos.length > 0) {
            const generated = layoutEngine.generateLayout(page.photos);
            if (generated) layoutSlots = generated.slots;
        }

        if (layoutSlots.length > 0) {
            for (const slot of layoutSlots) {
                const x = (slot.x / 100) * width;
                const y = (slot.y / 100) * height;
                const w = (slot.width / 100) * width;
                const h = (slot.height / 100) * height;

                if (slot.photoId) {
                    // Draw Photo
                    await this.drawImage(slot.photoId, x, y, w, h, assets);

                    // Draw Photo Frame (SVG)
                    const frameId = slot.frameId || page.imageFrameId;
                    if (frameId && window.IMAGE_FRAMES) {
                        const frameDef = window.IMAGE_FRAMES.find(f => f.id === frameId);
                        if (frameDef) {
                            const shape = slot.shape || page.imageShape || 'rect';
                            const color = slot.frameColor || page.imageFrameColor || frameDef.color;
                            // Generate SVG string for this slot
                            const svgContent = frameDef.svgGen(w, h, color, shape);
                            // Draw it at slot coordinates
                            await this.drawSvg(svgContent, x, y, w, h);
                        }
                    } else {
                        // Minimal default border if no frame selected? Or clean?
                        // Leaving clean as default.
                    }
                }
            }
        }

        // 4. Text Elements
        if (page.elements) {
            page.elements.filter(el => el.type === 'text').forEach(text => {
                const x = (text.x / 100) * width;
                const y = (text.y / 100) * height;

                const fontSizePt = text.fontSize ? (text.fontSize * 0.75) : 12; // px to pt approx
                this.doc.setFontSize(fontSizePt);

                const fontName = this.mapFont(text.fontFamily, text.styleId);
                this.doc.setFont(fontName, "normal");

                this.doc.setTextColor(text.color || '#000000');
                this.doc.text(text.content, x, y + (fontSizePt / 2));
            });
        }
    }

    // --- Helpers ---

    async drawBackground(bgColorOrId, themeId, w, h) {
        // 1. Try generic Theme ID first
        if (themeId) {
            const theme = window.BACKGROUND_TEXTURES?.find(t => t.id === themeId);
            if (theme && await this.drawTexture(theme, w, h)) return;
        }

        // 2. Try specific bg ID (often same)
        if (bgColorOrId && !bgColorOrId.startsWith('#')) {
            const bg = window.BACKGROUND_TEXTURES?.find(t => t.id === bgColorOrId);
            if (bg && await this.drawTexture(bg, w, h)) return;
        }

        // 3. Fallback to Color
        const color = (bgColorOrId && bgColorOrId.startsWith('#')) ? bgColorOrId : '#ffffff';
        this.doc.setFillColor(color);
        this.doc.rect(0, 0, w, h, 'F');
    }

    async drawTexture(textureDef, w, h) {
        if (textureDef && textureDef.url) {
            try {
                const base64 = await this.loadImage(textureDef.url);
                this.doc.addImage(base64, 'JPEG', 0, 0, w, h);
                return true;
            } catch (e) {
                console.warn("PDF: Failed to load texture", textureDef.id, e);
            }
        }
        return false;
    }

    /**
     * Mini SVG Parser for Frames
     * Parses simple internal SVGs (rect, path, circle, ellipse) and draws them to PDF.
     */
    async drawSvg(svgString, offsetX, offsetY, width, height) {
        if (!svgString) return;

        // Wrap if missing namespace for parser (though usually inner content)
        const wrappedSvg = `<svg xmlns="http://www.w3.org/2000/svg">${svgString}</svg>`;
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(wrappedSvg, "image/svg+xml");
        const svgRoot = xmlDoc.documentElement;

        if (svgRoot.nodeName === "parsererror") {
            console.error("PDF: SVG Parse Error", svgString);
            return;
        }

        // Process children
        for (const node of Array.from(svgRoot.childNodes)) {
            if (node.nodeType !== 1) continue; // Element nodes only

            const type = node.nodeName.toLowerCase();
            // Helper to get float attr
            const getFl = (name, def = 0) => parseFloat(node.getAttribute(name)) || def;
            const getStr = (name) => node.getAttribute(name);

            // Styles
            const stroke = getStr("stroke");
            const strokeWidth = getFl("stroke-width", 0);
            const fill = getStr("fill");
            const dashArray = getStr("stroke-dasharray");

            // Apply Styles
            if (stroke && stroke !== 'none') {
                this.doc.setDrawColor(stroke);
                this.doc.setLineWidth(strokeWidth);
            } else {
                // ensure invalid stroke doesn't draw
                // but rect/circle might rely on default? assume manual set
            }

            if (fill && fill !== 'none') {
                this.doc.setFillColor(fill);
            }

            // Simple dash mapping "4 4" -> [4, 4] (approx)
            if (dashArray) {
                const dashes = dashArray.split(/[\s,]+/).map(parseFloat);
                this.doc.setLineDashPattern(dashes, 0);
            } else {
                this.doc.setLineDashPattern([], 0);
            }

            const styleType = (fill && fill !== 'none' ? 'F' : '') + (stroke && stroke !== 'none' ? 'D' : '');
            if (!styleType) continue; // nothing to draw

            // Draw based on Shape
            if (type === 'rect') {
                const x = getFl('x') + offsetX;
                const y = getFl('y') + offsetY;
                const w = getFl('width');
                const h = getFl('height');
                this.doc.rect(x, y, w, h, styleType);

            } else if (type === 'circle') {
                const cx = getFl('cx') + offsetX;
                const cy = getFl('cy') + offsetY;
                const r = getFl('r');
                this.doc.circle(cx, cy, r, styleType);

            } else if (type === 'ellipse') {
                const cx = getFl('cx') + offsetX;
                const cy = getFl('cy') + offsetY;
                const rx = getFl('rx');
                const ry = getFl('ry');
                this.doc.ellipse(cx, cy, rx, ry, styleType);

            } else if (type === 'path') {
                // Handling Paths is complex. 
                // We rely on simple paths generated by our frame generator.
                // We'll use a simplified implementation leveraging jspdf's path support if available
                // OR since our frames are usually simple lines (L, M, Z), we can try to parse.

                // NOTE: jsPDF doesn't natively parse "d" strings easily without a plugin.
                // We will implement a VERY basic "d" parser for M (move), L (line), Z (close).
                const d = getStr('d');
                if (d) {
                    this.drawPathPrimitive(d, offsetX, offsetY, styleType);
                }
            }
        }

        // Reset Dash
        this.doc.setLineDashPattern([], 0);
    }

    // Basic Path Parser for 'M x y L x y Z'
    drawPathPrimitive(dPath, offX, offY, style) {
        // Tokenize: split by spaces, but respect commands
        const tokens = dPath.trim().split(/[\s,]+|[A-Za-z]/).filter(x => x !== "");
        const commands = dPath.match(/[A-Za-z]/g);

        // This regex split is tricky. Let's do a robust split.
        // Or better: manual parsing loop.

        let cursor = 0;
        let pIndex = 0;
        const numbers = dPath.replace(/[A-Za-z]/g, ' ').trim().split(/[\s,]+/).map(parseFloat);

        // Safety: ensure we have numbers
        if (numbers.length === 0 || !commands) return;

        // Construct lines
        // jsPDF lines: lines(lines, x, y, scale, style, closed)
        // This is hard to map generic path to.

        // Alternate: use current 'lines' API which is relative, or just use `line` multiple times?
        // But fill requires proper path closure.

        // Using context2d shim logic manually:
        // Or construct usage of `doc.path` if available in this jspdf version? 
        // Checking imports: using `jspdf.umd.min.js`.

        // Strategy: Use generic lines builder.
        // Since our frames are mostly lines, let's try to map M/L.

        let startX = 0, startY = 0;
        let currX = 0, currY = 0;

        // Since constructing a filled path from scratch with low-level API is tedious,
        // and we have `doc.path` in recent jsPDF. Let's try `doc.path`.
        // If not, we fallback to specific "Frame lines" logic.
        // Actually, our custom legacy frames use paths for corners.
        // Let's implement M and L.

        // We will perform pixel-op drawing (moveTo, lineTo) then stroke/fill.
        // doc.advancedAPI is implied usually.
        // Use implicit context-like methods if wrappers exist, else raw.
        // jsPDF has `.line(x1, y1, x2, y2)`.

        // If fill is needed, we MUST use construction.
        // `doc.moveTo(x,y)` and `doc.lineTo(x,y)` exist in newer versions?
        // Let's check typical jspdf usage.

        // Safest for basic paths: use the raw PDF construction operator or `lines` method.
        // `doc.lines` takes an array of vectors relative to start.

        // Let's stick to parsing "M x y L x y..." and drawing separate Lines for STROKE.
        // Fill might be broken for complex paths but our frames are usually stroked.

        let numPtr = 0;
        let lastMoveX = 0, lastMoveY = 0;

        // Parse loop
        // Regex to separate commands and coordinates
        const instructions = dPath.match(/([a-zA-Z])([^a-zA-Z]*)/g);
        if (!instructions) return;

        instructions.forEach(instruction => {
            const cmd = instruction[0];
            const args = instruction.slice(1).trim().split(/[\s,]+/).map(parseFloat).filter(n => !isNaN(n));

            if (cmd === 'M') {
                currX = args[0] + offX;
                currY = args[1] + offY;
                lastMoveX = currX;
                lastMoveY = currY;
                // Ideally start path here
            } else if (cmd === 'L') {
                const nextX = args[0] + offX;
                const nextY = args[1] + offY;
                this.doc.line(currX, currY, nextX, nextY); // Stroke only
                currX = nextX;
                currY = nextY;
            } else if (cmd === 'Z' || cmd === 'z') {
                this.doc.line(currX, currY, lastMoveX, lastMoveY); // Close loop
            }
            // Support H, V if needed? Frame logic usually uses M/L/Z only in my SVG gens.
        });
    }

    async drawImage(photoId, x, y, w, h, assets) {
        // Find URL from provided assets or fallback to window.app
        const photo = (assets && assets.photos ? assets.photos.find(p => p.id === photoId) : null) ||
            (window.app && window.app.state ? window.app.state.assets.photos.find(p => p.id === photoId) : null);

        if (photo) {
            try {
                if (photo.url.startsWith('data:')) {
                    this.doc.addImage(photo.url, 'JPEG', x, y, w, h, undefined, 'FAST');
                    return;
                }
                const base64 = await this.loadImage(photo.url);
                this.doc.addImage(base64, 'JPEG', x, y, w, h, undefined, 'FAST');
            } catch (e) {
                console.warn('Failed to load image for PDF:', photoId, e);
                this.doc.setDrawColor(200, 200, 200);
                this.doc.setFillColor(240, 240, 240);
                this.doc.rect(x, y, w, h, 'FD');
            }
        }
    }

    async loadImage(url) {
        // Check cache if implemented, or just load
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = img.width;
                canvas.height = img.height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0);
                try {
                    const data = canvas.toDataURL('image/jpeg', 0.8);
                    resolve(data);
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error('Image load failed'));
            img.src = url;
        });
    }

    mapFont(fontFamily, textStyleId) {
        // Basic mapping to Standard PDF Fonts
        // Standard: times, helvetica, courier

        // 1. Map from Style ID if present
        if (textStyleId) {
            if (textStyleId.includes('serif')) return 'times';
            if (textStyleId.includes('typewriter')) return 'courier';
        }

        // 2. Map from family string
        const lower = (fontFamily || '').toLowerCase();
        if (lower.includes('serif') || lower.includes('playfair') || lower.includes('merriweather') || lower.includes('dm serif')) {
            return 'times';
        }
        if (lower.includes('mono') || lower.includes('courier')) {
            return 'courier';
        }
        // Default sans
        return 'helvetica';
    }

    showDownloadModal(url) {
        const modal = document.getElementById('pdfDownloadModal');
        const btn = document.getElementById('btn-download-trigger');

        if (modal && btn) {
            btn.href = url;
            btn.download = `photo-book-${new Date().toISOString().slice(0, 10)}.pdf`;
            modal.classList.add('active');
        } else {
            // Fallback if modal missing
            window.open(url, '_blank');
        }
    }
}

export const pdfExport = new PDFExport();
