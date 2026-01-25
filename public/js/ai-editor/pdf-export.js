/**
 * Client-Side PDF Generator for Shoso AI Editor
 * Uses jspdf to generate high-quality print PDFs from the editor state.
 */

import { layoutEngine } from './layout-engine.js';
import { authService } from './firebase-auth.js';

export class PDFExport {
    constructor(templateConfig) {
        this.doc = null;
        this.templateConfig = templateConfig || {};
    }

    setTemplateConfig(config) {
        this.templateConfig = config;
        console.log("PDF: Template Config updated", config ? config.id : 'null');
    }

    async generatePDF(pages, cover, assets, returnBlob = false) {
        console.log("PDF: Starting generation...");
        console.log("PDF: Template config present:", !!this.templateConfig, this.templateConfig?.id);
        if (!window.jspdf) {
            console.error('PDF: jsPDF global not found!');
            alert('PDF Library Missing. Please refresh.');
            return;
        }

        const { jsPDF } = window.jspdf;
        console.log("PDF: jsPDF loaded. Creating doc...");
        this.hebrewFontLoaded = false;

        try {
            // --- DYNAMIC DIMENSION LOGIC ---
            // Editor defaults: 800x600 (4:3)
            let width = 800;
            let height = 600;

            if (this.templateConfig && this.templateConfig.designSystem && this.templateConfig.designSystem.canvas) {
                width = this.templateConfig.designSystem.canvas.width || width;
                height = this.templateConfig.designSystem.canvas.height || height;
            } else if (cover && cover.layout === 'full-bleed') {
                // Infer from cover preference if possible?
            }

            // Convert pixels to points (1px = 0.75pt approx)
            // Actually, if we use 'px' unit in jsPDF it works 1:1?
            // jsPDF support 'px' since recent versions. Let's try 'px' to match editor exactly.
            // If 'px' fails, we fallback to 'pt' * 0.75.
            // Let's stick to 'pt' for vector consistency, calculating ratio.
            const ptWidth = width * 0.75;
            const ptHeight = height * 0.75;

            console.log(`PDF: Using format [${ptWidth}, ${ptHeight}] (from ${width}x${height}px)`);

            this.doc = new jsPDF({
                orientation: width > height ? 'landscape' : 'portrait',
                unit: 'pt',
                format: [ptWidth, ptHeight]
            });

            // Set context flag for helpers
            this.pageWidth = ptWidth;
            this.pageHeight = ptHeight;

            console.log("PDF: Doc created.");

            // 1. Load Hebrew Font
            await this.loadHebrewFont();

            // 2. Render Cover
            if (cover) {
                console.log("PDF: Rendering Cover...");
                await this.renderCoverToPDF(cover, assets);
            }

            // 3. Render Pages
            console.log(`PDF: Rendering ${pages.length} pages...`);
            for (let i = 0; i < pages.length; i++) {
                this.doc.addPage([ptWidth, ptHeight]); // Explicitly set format for new pages
                console.log(`PDF: Rendering Page ${i + 1}`);
                await this.renderPageToPDF(pages[i], assets);
            }

            console.log("PDF: Rendering complete. Saving...");
            // 4. Save or Return
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
            this.doc.text(this.processText(cover.title), width / 2, height - 30, { align: 'center' });
            this.doc.setFontSize(14);
            this.doc.text(this.processText(cover.subtitle), width / 2, height - 20, { align: 'center' });
        } else {
            // Standard
            if (cover.frontPhotoId) {
                // Photo inset based on layout
                await this.drawImage(cover.frontPhotoId, width * 0.1, height * 0.1, width * 0.8, height * 0.6, assets);
            }
            this.doc.setFontSize(24);
            this.doc.text(this.processText(cover.title), width / 2, height - 80, { align: 'center' });
            this.doc.setFontSize(14);
            this.doc.text(this.processText(cover.subtitle), width / 2, height - 60, { align: 'center' });
        }
    }

    async renderPageToPDF(page, assets) {
        const width = this.doc.internal.pageSize.getWidth();
        const height = this.doc.internal.pageSize.getHeight();

        // 0. Hydrate Layout Definition (if available)
        let layoutDef = null;
        // Fix: Check multiple properties for layout ID (rawLayoutId is used by TemplateManager)
        const targetLayoutId = page.layoutId || page.rawLayoutId || (page.layout ? page.layout.id : null);

        if (this.templateConfig && this.templateConfig.pageLayouts && targetLayoutId) {
            layoutDef = this.templateConfig.pageLayouts.find(l => l.layoutId === targetLayoutId);
            if (layoutDef) {
                console.log(`PDF: Hydrating page ${page.id} with layout ${targetLayoutId}`);
                console.log(`PDF: Layout Stats - Slots: ${layoutDef.photoSlots?.length}, Text: ${layoutDef.textElements?.length}, Decos: ${layoutDef.decorations?.length}`);
            } else {
                console.warn(`PDF: Layout ${targetLayoutId} not found in template config!`);
            }
        } else if (page.layout && page.layout.slots) {
            // Fallback to legacy page.layout object if fully populated (has slots)
            layoutDef = page.layout;
            console.log(`PDF: Using legacy page.layout for page ${page.id}`);
        } else {
            console.warn(`PDF: No layout definition found for page ${page.id} (targetId: ${targetLayoutId})`);
        }

        // 1. Background
        await this.drawBackground(page.background, null, width, height);

        // 2. Page Frame
        if (page.pageFrameId && window.PAGE_FRAMES) {
            const frameDef = window.PAGE_FRAMES.find(f => f.id === page.pageFrameId);
            if (frameDef) {
                // Draw SVG Frame
                // Note: Frame usually adds borders/SVGs on top or behind?
                // If it's a "frame" it might be on top, but here it seemed to be drawing a background too?
                // The legacy code drew background again. Let's trust page.background handled in step 1.
                // Just draw the frame if it's an overlay or border.
                try {
                    const svgContent = frameDef.svgGen(width, height, frameDef.color);
                    await this.drawSvg(svgContent, 0, 0, width, height);
                } catch (e) {
                    console.warn("PDF: Failed to draw frame", e);
                }
            }
        }

        // 3. Photos
        // Use layout photo slots if available/hydrated. 
        // If layoutDef comes from page.layout, it has .slots, not .photoSlots.
        const photoSlots = (layoutDef && layoutDef.photoSlots) ? layoutDef.photoSlots :
            (layoutDef && layoutDef.slots) ? layoutDef.slots :
                page.slots;

        if (photoSlots) {
            console.log(`PDF: Processing ${photoSlots.length} photo slots...`);
            // We need to map the user's photos (array) to these slots
            // user photos are in page.photos or derived from page.slots in legacy
            const userPhotos = page.photos || []; // Assuming array of photo objects or asset IDs
            console.log(`PDF: User photos available: ${userPhotos.length}`, userPhotos);

            for (let i = 0; i < photoSlots.length; i++) {
                const slot = photoSlots[i];
                const photo = userPhotos[i]; // Simple index matching for now

                if (photo) {
                    const sX = (slot.position && slot.position.x !== undefined) ? slot.position.x : slot.x;
                    const sY = (slot.position && slot.position.y !== undefined) ? slot.position.y : slot.y;
                    const sW = (slot.size && slot.size.width !== undefined) ? slot.size.width : slot.width;
                    const sH = (slot.size && slot.size.height !== undefined) ? slot.size.height : slot.height;

                    // Ensure we have numbers
                    const x = (parseFloat(sX) / 100) * width;
                    const y = (parseFloat(sY) / 100) * height;
                    const w = (parseFloat(sW) / 100) * width;
                    const h = (parseFloat(sH) / 100) * height;

                    // Slot specific styling (border radius / frame)
                    // If template has photoStyles, use them
                    // ... (Simplifying for now, standard drawImage)
                    await this.drawImage(photo.assetId || photo.id || photo, x, y, w, h, assets, slot);
                } else {
                    console.log(`PDF: No photo for slot ${i}`);
                }
            }
        } else {
            console.log("PDF: No photo slots defined.");
        }

        // 4. Decorations (from Layout Definition)
        const decorations = (layoutDef && layoutDef.decorations) ? layoutDef.decorations : page.decorations;
        if (decorations) {
            this.renderDecorations(decorations, width, height);
        }

        // 5. Text Elements (from Layout Definition, merged with Content)
        // If layoutDef is page.layout, it usually doesn't have textElements. page.elements does.
        const textElements = (layoutDef && layoutDef.textElements) ? layoutDef.textElements :
            (page.elements && page.elements.length > 0) ? page.elements :
                null;

        if (textElements) {
            console.log(`PDF: Processing ${textElements.length} text elements...`);
            // If hydrating, we need to merge with page.textContent
            // page.textContent is { elementId: "Actual Text" }
            textElements.forEach(textDef => {
                // Merge content
                let contentToRender = textDef.content || textDef.placeholder;
                if (page.textContent && page.textContent[textDef.elementId]) {
                    contentToRender = page.textContent[textDef.elementId];
                }

                const tX = (textDef.position && textDef.position.x !== undefined) ? textDef.position.x : textDef.x;
                const tY = (textDef.position && textDef.position.y !== undefined) ? textDef.position.y : textDef.y;

                // Construct a temporary text object for rendering logic
                const text = {
                    ...textDef,
                    content: contentToRender || "",
                    x: parseFloat(tX), // Remove % string if present
                    y: parseFloat(tY),
                    fontSize: textDef.style ? parseInt(textDef.style.size) : (textDef.fontSize || 12),
                    fontFamily: textDef.style ? textDef.style.font : (textDef.fontFamily || 'body'),
                    color: textDef.style ? textDef.style.color : (textDef.color || '#000000'),
                    alignment: textDef.alignment || { horizontal: textDef.align || 'left' }, // Normalize
                    style: textDef.style
                };

                if (!text.content) {
                    console.log(`PDF: Skipping empty text element ${textDef.elementId}`);
                    return; // Skip empty text
                }

                // Remove '%' if it was parsed as NaN (e.g. "50%"), strictly speaking parseFloat handles "50%" -> 50 correctly.

                let x = 0;
                let align = 'left';

                // Determine Alignment & Position Logic (Mirroring BarMitzvahRenderer)
                const alignMethod = (text.alignment && text.alignment.method) || '';
                const hAlign = (text.alignment && text.alignment.horizontal) || (text.style && text.style.align) || 'left';

                if (alignMethod.includes('transform: translateX(-50%)') || hAlign === 'center') {
                    // Center Aligned
                    x = width / 2; // Default center
                    if (text.x) x = (text.x / 100) * width; // Should be around 50%
                    align = 'center';
                } else if (alignMethod.includes('right:') || hAlign === 'right') {
                    // Right Aligned
                    // In template, x likely represents "right: 6%" -> distance from right edge
                    const rightOffset = text.x || 6;
                    x = width - ((rightOffset / 100) * width);
                    align = 'right';
                } else {
                    // Left Aligned (DefaultL)
                    const leftOffset = text.x || 6;
                    x = (leftOffset / 100) * width;
                    align = 'left';
                }

                const y = (text.y / 100) * height;

                const fontSizePt = text.fontSize ? (text.fontSize * 0.75) : 12; // px to pt approx
                this.doc.setFontSize(fontSizePt);

                const fontName = this.mapFont(text.fontFamily, text.styleId, text.content);
                console.log(`PDF: Text "${text.content?.substring(0, 20)}..." -> fontFamily key: "${text.fontFamily}" -> mapped to: "${fontName}"`);
                this.doc.setFont(fontName, "normal");

                const rawColor = text.color || (text.style && text.style.color) || '#000000';
                const safeColor = this.resolveColorSafe(rawColor);
                this.doc.setTextColor(safeColor);

                const processedContent = this.processText(text.content);
                if (!processedContent) return;

                // Validate Coordinates
                if (isNaN(x) || isNaN(y)) {
                    console.warn("PDF: Invalid coordinates for text", text, { x, y });
                    return;
                }

                // Debug Log
                // console.log(`PDF: Drawing text "${processedContent.substring(0, 10)}..." at ${x.toFixed(1)},${y.toFixed(1)} align:${align}`);

                try {
                    this.doc.text(String(processedContent), x, y + (fontSizePt / 2), { align: align });
                } catch (e) {
                    console.error("PDF: Failed to render text element:", processedContent, e);
                    // Fallback: Default Font
                    try {
                        this.doc.setFont("helvetica", "normal");
                        this.doc.text(String(processedContent), x, y + (fontSizePt / 2), { align: align });
                    } catch (e2) {
                        console.error("PDF: Fallback failed too", e2);
                    }
                }
            });
        } else {
            console.log("PDF: No text elements defined.");
        }
    }

    renderDecorations(decorations, pageWidth, pageHeight) {
        if (!decorations) return;

        decorations.forEach(dec => {
            const pos = dec.position || { x: 0, y: 0 };
            const x = (parseFloat(pos.x) / 100) * pageWidth;
            const y = (parseFloat(pos.y) / 100) * pageHeight;
            const w = (dec.size && dec.size.width) ? (parseFloat(dec.size.width) / 100) * pageWidth : 0;
            const h = (dec.size && dec.size.height) ? (parseFloat(dec.size.height) / 100) * pageHeight : 0;

            const color = this.resolveColorSafe(dec.color || 'gold');
            this.doc.setDrawColor(color);
            this.doc.setFillColor(color);

            if (dec.type === 'goldLine') {
                this.doc.setLineWidth(2); // thicker line
                this.doc.rect(x, y, w, 2, 'F'); // Draw as filled rect for consistency
            } else if (dec.type === 'starOfDavid') {
                // Approximate Star of David with two triangles
                // Center x,y. Size w,h.
                // This is a rough drawing for PDF vector.
                const cx = x;
                const cy = y;
                const r = w / 2; // Radius approx

                // Set opacity if needed - jsPDF handling of opacity isn't great in standard mode without GState
                // We'll draw lines.
                this.doc.setLineWidth(1);

                // Triangle 1 (Point Up)
                this.doc.triangle(
                    cx, cy - r,
                    cx - (r * 0.866), cy + (r * 0.5),
                    cx + (r * 0.866), cy + (r * 0.5),
                    'S'
                );

                // Triangle 2 (Point Down)
                this.doc.triangle(
                    cx, cy + r,
                    cx - (r * 0.866), cy - (r * 0.5),
                    cx + (r * 0.866), cy - (r * 0.5),
                    'S'
                );

            } else if (dec.type === 'ornament') {
                // Simple diamond
                const r = 10;
                this.doc.setLineWidth(1);
                this.doc.line(x, y - r, x + r, y);
                this.doc.line(x + r, y, x, y + r);
                this.doc.line(x, y + r, x - r, y);
                this.doc.line(x - r, y, x, y - r);
            }
        });
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

    async drawImage(photoId, x, y, w, h, assets, slot = null) {
        // Find URL from provided assets or fallback to window.app
        const photo = (assets && assets.photos ? assets.photos.find(p => p.id === photoId) : null) ||
            (window.app && window.app.state ? window.app.state.assets.photos.find(p => p.id === photoId) : null);

        if (photo) {
            console.log(`[PDF] Drawing image ${photoId} at ${x.toFixed(1)},${y.toFixed(1)} (${w.toFixed(1)}x${h.toFixed(1)})`);
            try {
                let success = false;

                // Strategy 1: High Res Proxy (Google Photos)
                // We want high res for PDF, so we try the backend proxy first which bypasses CORS
                // and authenticates with Google.
                const isGoogle = photo.source === 'google-photos' || (photo.url && photo.url.includes('googleusercontent.com'));

                if (isGoogle) {
                    try {
                        console.log(`[PDF] Attempting High Res Proxy for ${photoId} (isGoogle=true)...`);
                        const targetUrl = photo.url || photo.rawBaseUrl;
                        console.log(`[PDF] Proxy Target URL: ${targetUrl ? targetUrl.substring(0, 50) + '...' : 'null'}`);

                        const base64HighRes = await this.fetchHighResViaProxy(targetUrl);
                        if (base64HighRes) {
                            console.log(`[PDF] High Res Proxy SUCCESS for ${photoId}. Length: ${base64HighRes.length}`);
                            this.doc.addImage(base64HighRes, 'JPEG', x, y, w, h, undefined, 'FAST');
                            success = true;
                        } else {
                            console.warn(`[PDF] High Res Proxy returned empty/null for ${photoId}`);
                        }
                    } catch (proxyErr) {
                        console.warn(`[PDF] High Res Proxy FAILED for ${photoId}:`, proxyErr);
                        // Fallthrough to thumbnail
                    }
                } else {
                    console.log(`[PDF] Image is NOT identified as Google Photo. Source: ${photo.source}, URL: ${photo.url ? photo.url.substring(0, 30) : 'null'}`);
                }

                // Strategy 2: Pre-fetched Thumbnail (Base64) or Standard Loader
                if (!success) {
                    console.log(`[PDF] Method 2: Standard Load for ${photoId}`);

                    // FIXED: Prioritize High Res!
                    // Old: let src = photo.thumbnailUrl || photo.url || photo.baseUrl;
                    let src = photo.highResUrl || photo.rawBaseUrl || photo.url || photo.thumbnailUrl;

                    if (typeof photo === 'string') src = photo;

                    // Upgrade Quality Params
                    if (src && src.includes('unsplash.com') && src.includes('&w=')) {
                        src = src.replace(/&w=\d+/, '&w=2048');
                    }
                    // Google Photos params (if rawBaseUrl used)
                    if (src && photo.source === 'google-photos' && !src.includes('=w')) {
                        src = `${src}=w2048-h2048`;
                    }

                    if (src && src.startsWith('data:')) {
                        console.log(`[PDF] Using Data URI for ${photoId}`);
                        this.doc.addImage(src, 'JPEG', x, y, w, h, undefined, 'FAST');
                        success = true;
                    } else if (src) {
                        // Valid URL but not data URI (e.g. local asset or non-CORS external)
                        console.log(`[PDF] Loading Image from URL: ${src.substring(0, 50)}...`);
                        const base64 = await this.loadImage(src);
                        this.doc.addImage(base64, 'JPEG', x, y, w, h, undefined, 'FAST');
                        success = true;
                    }
                }

                if (!success) {
                    console.error(`[PDF] CRITICAL: All image loading strategies failed for ${photoId}`);
                    throw new Error("All image loading strategies failed");
                }

            } catch (e) {
                console.warn('Failed to load image for PDF:', photoId, e);
                // Draw placeholder
                this.doc.setDrawColor(200, 200, 200);
                this.doc.setFillColor(240, 240, 240);
                this.doc.rect(x, y, w, h, 'FD');

                // Optional: X mark
                this.doc.line(x, y, x + w, y + h);
                this.doc.line(x + w, y, x, y + h);
            }
        } else {
            console.warn(`[PDF] Photo with ID ${photoId} NOT FOUND in assets.`);
        }
    }

    async fetchHighResViaProxy(url) {
        try {
            const functions = authService.getFunctions();
            // Ensure we catch early if functions not ready
            if (!functions) throw new Error("Firebase Functions not initialized");

            const fetchHighRes = functions.httpsCallable('fetchHighResImage');
            const result = await fetchHighRes({ url: url });

            if (result.data && result.data.success && result.data.dataUri) {
                return result.data.dataUri;
            }
            if (result.data && result.data.error) {
                throw new Error(`Proxy Error: ${result.data.error}`);
            }
            throw new Error("Invalid proxy response structure");
        } catch (e) {
            console.warn("High Res Proxy Call Error:", e.message, e.details || '');
            throw e;
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



    resolveColorSafe(color) {
        if (!color) return '#000000';

        // First, try to resolve from template config design system
        if (this.templateConfig && this.templateConfig.designSystem && this.templateConfig.designSystem.colors) {
            const colors = this.templateConfig.designSystem.colors;

            // Check text colors
            if (colors.text) {
                if (color === 'primary' && colors.text.primary) {
                    color = colors.text.primary;
                } else if (color === 'secondary' && colors.text.secondary) {
                    color = colors.text.secondary;
                }
            }

            // Check direct color references
            if (color === 'accent' && colors.accent) color = colors.accent;
            if (color === 'background' && colors.background) color = colors.background;

            // Check palette colors (for decorations)
            if (colors.palette && colors.palette[color]) color = colors.palette[color];
        }

        // Fallback: Handle Bar Mitzvah Template abstract names (legacy)
        const PALETTE = {
            'primary': '#1B365D',
            'secondary': '#4A5568',
            'light': '#718096',
            'gold': '#C9A227',
            'navy': '#1B365D',
            'white': '#FFFFFF'
        };

        if (PALETTE[color]) color = PALETTE[color];

        // Convert rgba to rgb (jsPDF doesn't support alpha)
        if (typeof color === 'string' && color.startsWith('rgba')) {
            const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)/);
            if (match) {
                const [_, r, g, b] = match;
                return `rgb(${r},${g},${b})`;
            }
        }

        // If it's a valid hex/rgb string, return it
        if (typeof color === 'string') {
            if (color.startsWith('#')) return color;
            if (color.startsWith('rgb')) return color;
        }

        // Fallback for unknown strings to avoid crash
        console.warn('PDF: Unknown color encountered, using black:', color);
        return '#000000';
    }

    async loadHebrewFont() {
        if (this.hebrewFontLoaded) return;
        try {
            console.log("PDF: Fetching Hebrew Font (Alef)...");
            const response = await fetch('fonts/Alef-Regular.ttf');
            if (!response.ok) throw new Error("Font fetch failed: " + response.statusText);

            const blob = await response.blob();
            const reader = new FileReader();

            return new Promise((resolve, reject) => {
                reader.onloadend = () => {
                    if (!reader.result) {
                        console.error("PDF: Font load result empty");
                        resolve();
                        return;
                    }
                    // reader.result is "data:font/ttf;base64,..."
                    const parts = reader.result.split(',');
                    const base64data = parts.length > 1 ? parts[1] : null;

                    console.log("PDF: Hebrew font base64 length:", base64data ? base64data.length : 0);
                    if (base64data) {
                        console.log("PDF: Base64 first 20 chars:", base64data.substring(0, 20));
                        if (base64data.substring(0, 20).includes('PCFET0NUWQ')) { // "<!DOCTY" in base64
                            console.error("PDF: Font file seems to be HTML (404/Error page). Aborting font load.");
                            this.hebrewFontLoaded = false;
                            resolve();
                            return;
                        }

                        try {
                            // Register Alef as "Rubik" to satisfy existing mapFont logic without refactoring
                            this.doc.addFileToVFS('Alef-Regular.ttf', base64data);
                            this.doc.addFont('Alef-Regular.ttf', 'Rubik', 'normal');

                            // Verify Font Usability
                            console.log("PDF: Verifying Hebrew font...");
                            this.doc.setFont('Rubik', 'normal');
                            this.hebrewFontLoaded = true;
                            console.log("PDF: Hebrew Font Loaded and Verified.");
                            resolve();
                        } catch (e) {
                            console.error("PDF: Error registering or verifying font", e);
                            this.hebrewFontLoaded = false;
                            resolve(); // Resolve anyway to allow fallback
                        }
                    } else {
                        console.warn("PDF: Empty or invalid font data");
                        resolve();
                    }
                };
                reader.onerror = (e) => {
                    console.error("PDF: FileReader error", e);
                    reject(e);
                };
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            console.warn("PDF: Could not load Hebrew font. Text may not render correctly.", e);
            // Non-blocking
        }
    }

    processText(text) {
        if (!text) return "";
        // Check for Hebrew
        if (/[\u0590-\u05FF]/.test(text)) {
            // Simple visual reversal for PDF rendering
            // We remove control characters to avoid font issues
            // Note: This relies on the font supporting the glyphs.
            return text.split('').reverse().join('');
        }
        return text;
    }

    mapFont(fontFamily, textStyleId, content) {
        // 0. Priorities Hebrew
        if (content && /[\u0590-\u05FF]/.test(content)) {
            if (this.hebrewFontLoaded) {
                return 'Rubik';
            } else {
                console.warn("PDF: Hebrew content detected but font not loaded. Using fallback.");
                return 'helvetica';
            }
        }

        // 1. Try to resolve from template config design system
        if (this.templateConfig && this.templateConfig.designSystem && this.templateConfig.designSystem.typography) {
            const typography = this.templateConfig.designSystem.typography;
            console.log(`PDF mapFont: Checking "${fontFamily}" in typography:`, Object.keys(typography));

            // fontFamily might be a key like 'body', 'heading', 'accent', 'sans', 'script'
            if (fontFamily && typography[fontFamily]) {
                const fontConfig = typography[fontFamily];
                console.log(`PDF mapFont: Found config for "${fontFamily}":`, fontConfig.family);

                if (fontConfig.family) {
                    // Map the actual font family to PDF standard fonts
                    const actualFamily = fontConfig.family.toLowerCase();

                    if (actualFamily.includes('serif') || actualFamily.includes('playfair') || actualFamily.includes('merriweather') || actualFamily.includes('cormorant') || actualFamily.includes('garamond')) {
                        console.log(`PDF mapFont: "${fontConfig.family}" -> times (serif)`);
                        return 'times';
                    }
                    if (actualFamily.includes('mono') || actualFamily.includes('courier')) {
                        console.log(`PDF mapFont: "${fontConfig.family}" -> courier (mono)`);
                        return 'courier';
                    }
                    if (actualFamily.includes('script') || actualFamily.includes('cursive') || actualFamily.includes('pinyon') || actualFamily.includes('allura')) {
                        console.log(`PDF mapFont: "${fontConfig.family}" -> times-italic (script fallback)`);
                        // Use times-italic for script fonts as a visual approximation
                        return 'times';
                    }
                    console.log(`PDF mapFont: "${fontConfig.family}" -> helvetica (sans default)`);
                    return 'helvetica'; // Default sans
                }
            } else {
                console.warn(`PDF mapFont: No typography config found for "${fontFamily}"`);
            }
        } else {
            console.warn('PDF mapFont: No template config available');
        }

        // Basic mapping to Standard PDF Fonts
        // Standard: times, helvetica, courier

        // 2. Map from Style ID if present
        if (textStyleId) {
            if (textStyleId.includes('serif')) return 'times';
            if (textStyleId.includes('typewriter')) return 'courier';
        }

        // 3. Map from family string
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
