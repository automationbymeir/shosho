/**
 * Client-Side PDF Generator for Shoso AI Editor
 * Uses jspdf to generate high-quality print PDFs from the editor state.
 */

import { layoutEngine } from './layout-engine.js';
import { authService } from '../services/firebase-auth-service.js';

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
            // Editor defaults: 900x600 (3:2) - Matches .shoso-page CSS ratio (1.5)
            // This fixes alignment mismatches where Preview is 3:2 but PDF was 4:3
            let width = 900;
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

            // 2. Render Front Cover (Page 1)
            // Fix: Render cover even if title/photo missing (e.g. just background)
            if (cover) {
                console.log("PDF: Rendering Front Cover...");
                await this.renderFrontCover(cover, assets);
            }

            // 3. Render Content Pages
            console.log(`PDF: Rendering ${pages.length} content pages...`);
            for (let i = 0; i < pages.length; i++) {
                this.doc.addPage([ptWidth, ptHeight]); // Explicitly set format for new pages
                console.log(`PDF: Rendering Page ${i + 1}`);
                await this.renderPageToPDF(pages[i], assets);
            }

            // 4. Render Spine Page (if title exists)
            if (cover && (cover.title || cover.subtitle)) {
                this.doc.addPage([ptWidth, ptHeight]);
                console.log("PDF: Rendering Spine...");
                await this.renderSpine(cover, assets);
            }

            // 5. Render Back Cover (Last Page)
            if (cover && cover.backPhotoId) {
                this.doc.addPage([ptWidth, ptHeight]);
                console.log("PDF: Rendering Back Cover...");
                await this.renderBackCover(cover, assets);
            }

            console.log("PDF: Rendering complete. Saving...");

            // Generate filename with .pdf extension
            const filename = `photo-book-${new Date().toISOString().slice(0, 10)}.pdf`;

            // 4. Save or Return
            if (returnBlob) {
                // For blob return, use arraybuffer method with explicit MIME type
                const pdfData = this.doc.output('arraybuffer');
                const blob = new Blob([pdfData], { type: 'application/pdf' });
                console.log(`[PDF] Blob created for return. Size: ${blob.size} bytes, Type: ${blob.type}`);
                return blob;
            }

            // For download, use jsPDF's built-in save method which handles everything properly
            console.log(`[PDF] Triggering direct download: ${filename}`);
            this.doc.save(filename);

            console.log("PDF: Download triggered successfully.");

            // Show success modal
            this.showSuccessModal(filename);
        } catch (err) {
            console.error("PDF Export Error:", err);
            alert("Export Failed: " + err.message);
        }
    }

    async renderFrontCover(cover, assets) {
        const width = this.doc.internal.pageSize.getWidth();
        const height = this.doc.internal.pageSize.getHeight();

        console.log(`[PDF] Rendering Front Cover - frontPhotoId: ${cover.frontPhotoId}`);

        // 1. Background (Texture or Color)
        await this.drawBackground(cover.color, cover.theme, width, height);

        // 2. Render front photo in FULL BLEED (entire page)
        if (cover.frontPhotoId) {
            console.log(`[PDF] Drawing front cover photo (full page): ${cover.frontPhotoId}`);
            // Use full page dimensions for cover photo
            await this.drawImage(cover.frontPhotoId, 0, 0, width, height, assets, { photoStyle: 'default' });
        }

        // 3. Check for template-defined cover layout for TEXT ONLY
        const coverLayout = cover.customLayout ||
            (this.templateConfig?.pageLayouts?.find(l => l.pageType === 'cover' || l.layoutId === 'cover-elegant'));

        if (coverLayout) {

            // Render cover text elements from template
            if (coverLayout.textElements) {
                for (const textEl of coverLayout.textElements) {
                    // Determine content - use cover object or placeholder
                    let content = textEl.content || textEl.placeholder;
                    if (textEl.elementId === 'childName' && cover.title) content = cover.title;
                    else if (textEl.elementId === 'hebrewDate' && cover.subtitle) content = cover.subtitle;
                    else if (textEl.elementId === 'barMitzvahLabel' && textEl.content) content = textEl.content;

                    if (!content) continue;

                    // Calculate position
                    const tX = (textEl.position && textEl.position.x !== undefined) ? textEl.position.x : textEl.x;
                    const tY = (textEl.position && textEl.position.y !== undefined) ? textEl.position.y : textEl.y;

                    // Calculate proper alignment based on template definition
                    let x = 0;
                    let align = 'left';
                    const alignMethod = (textEl.alignment && textEl.alignment.method) || '';
                    const hAlign = (textEl.alignment && textEl.alignment.horizontal) || (textEl.style && textEl.style.align) || 'left';

                    // Parse position values
                    const posX = parseFloat(tX) || 50;
                    const posY = parseFloat(tY) || 50;

                    if (alignMethod.includes('transform: translateX(-50%)') || hAlign === 'center') {
                        // Center alignment: position is the center point
                        x = (posX / 100) * width;
                        align = 'center';
                    } else if (alignMethod.includes('right:') || hAlign === 'right') {
                        // Right alignment: position is from right edge
                        x = width - ((posX / 100) * width);
                        align = 'right';
                    } else {
                        // Left alignment: position is from left edge
                        x = (posX / 100) * width;
                        align = 'left';
                    }

                    const y = (posY / 100) * height;
                    const fontSizePt = textEl.style ? (parseInt(textEl.style.size) * 0.75) : 12;

                    this.doc.setFontSize(fontSizePt);
                    const fontName = this.mapFont(textEl.style?.font, null, content);
                    this.doc.setFont(fontName, "normal");

                    const rawColor = textEl.style?.color || cover.textColor || '#000000';
                    const safeColor = this.resolveColorSafe(rawColor);
                    this.doc.setTextColor(safeColor);

                    const processedContent = this.processText(content);
                    if (!processedContent) continue;

                    try {
                        this.doc.text(String(processedContent), x, y + (fontSizePt / 2), { align: align });
                    } catch (e) {
                        console.error("PDF: Failed to render cover text:", e);
                    }
                }
            }

            // Render cover decorations
            if (coverLayout.decorations) {
                this.renderDecorations(coverLayout.decorations, width, height);
            }

        } else {
            // === FALLBACK: LEGACY COVER LAYOUT ===
            console.log('PDF: Using fallback cover layout');

            // 2. Font & Text Color
            this.doc.setTextColor(cover.textColor || "#000000");

            // 3. Layout Logic
            if (cover.layout === 'full-bleed') {
                if (cover.frontPhotoId) {
                    await this.drawImage(cover.frontPhotoId, 0, 0, width, height, assets);
                }
                // Text Overlay - FIX: Pass content for Hebrew font detection
                this.doc.setFontSize(24);
                const titleFont = this.mapFont(cover.titleFont || cover.theme, null, cover.title);
                this.doc.setFont(titleFont, "bold");
                this.doc.text(this.processText(cover.title), width / 2, height - 30, { align: 'center' });

                this.doc.setFontSize(14);
                const subFont = this.mapFont(cover.subtitleFont || cover.theme, null, cover.subtitle);
                this.doc.setFont(subFont, "normal");
                this.doc.text(this.processText(cover.subtitle), width / 2, height - 20, { align: 'center' });
            } else {
                // Standard
                if (cover.frontPhotoId) {
                    // Photo inset based on layout
                    await this.drawImage(cover.frontPhotoId, width * 0.1, height * 0.1, width * 0.8, height * 0.6, assets);
                }
                this.doc.setFontSize(24);
                const titleFont = this.mapFont(cover.titleFont || cover.theme, null, cover.title);
                this.doc.setFont(titleFont, "bold");
                this.doc.text(this.processText(cover.title), width / 2, height - 80, { align: 'center' });

                this.doc.setFontSize(14);
                const subFont = this.mapFont(cover.subtitleFont || cover.theme, null, cover.subtitle);
                this.doc.setFont(subFont, "normal");
                this.doc.text(this.processText(cover.subtitle), width / 2, height - 60, { align: 'center' });
            }
        }
    }

    async renderSpine(cover, assets) {
        const width = this.doc.internal.pageSize.getWidth();
        const height = this.doc.internal.pageSize.getHeight();

        console.log(`[PDF] Rendering Spine Page`);

        // 1. Background - Use same as cover
        await this.drawBackground(cover.color, cover.theme, width, height);

        // 2. Render spine text vertically centered
        if (cover.title || cover.subtitle) {
            // Set text color
            this.doc.setTextColor(cover.textColor || "#FFFFFF");

            // Calculate center of page
            const centerX = width / 2;
            const centerY = height / 2;

            // Save graphics state
            this.doc.saveGraphicsState();

            // For spine text, we rotate and position vertically
            // Title
            if (cover.title) {
                this.doc.setFontSize(18);
                // FIX: Pass actual text content to mapFont for correct Hebrew detection
                const fontName = this.mapFont(cover.titleFont || cover.theme, null, cover.title);
                this.doc.setFont(fontName, "bold");

                const processedTitle = this.processText(cover.title);
                // Position for vertical spine text
                this.doc.text(processedTitle, centerX, centerY - 20, {
                    align: 'center',
                    angle: 90
                });
            }

            // Subtitle (if exists)
            if (cover.subtitle) {
                this.doc.setFontSize(12);
                // FIX: Pass actual text content to mapFont for correct Hebrew detection
                const fontName = this.mapFont(cover.subtitleFont || cover.theme, null, cover.subtitle);
                this.doc.setFont(fontName, "normal");

                const processedSubtitle = this.processText(cover.subtitle);
                this.doc.text(processedSubtitle, centerX, centerY + 40, {
                    align: 'center',
                    angle: 90
                });
            }

            // Restore graphics state
            this.doc.restoreGraphicsState();
        }
    }

    async renderBackCover(cover, assets) {
        const width = this.doc.internal.pageSize.getWidth();
        const height = this.doc.internal.pageSize.getHeight();

        console.log(`[PDF] Rendering Back Cover - backPhotoId: ${cover.backPhotoId}`);

        // 1. Background (Texture or Color)
        await this.drawBackground(cover.color, cover.theme, width, height);

        // 2. Render back photo in FULL BLEED (entire page)
        if (cover.backPhotoId) {
            console.log(`[PDF] Drawing back cover photo (full page): ${cover.backPhotoId}`);
            // Use full page dimensions - no slots, no template layouts
            // Just the back photo covering the entire page
            await this.drawImage(cover.backPhotoId, 0, 0, width, height, assets, { photoStyle: 'default' });
        } else {
            console.warn('[PDF] No backPhotoId provided for back cover');
        }
    }

    async renderPageToPDF(page, assets) {
        const width = this.doc.internal.pageSize.getWidth();
        const height = this.doc.internal.pageSize.getHeight();

        // 0. Hydrate Layout Definition (if available)
        // 0. Hydrate Layout Definition (if available)
        let layoutDef = null;
        // Fix: Check multiple properties for layout ID (rawLayoutId is used by TemplateManager)
        const targetLayoutId = page.layoutId || page.rawLayoutId || (page.layout ? page.layout.id : null);

        // PRIORITY FIX: Always prefer the specific page.layout slots if they exist.
        // This ensures that manual position adjustments or generated layouts (Magic Create) 
        // are respected instead of reverting to the static template definition.
        if (page.layout && page.layout.slots && page.layout.slots.length > 0) {
            layoutDef = page.layout;
            console.log(`PDF: Using specific page.layout for page ${page.id} (Prioritizing over template ID)`);
        } else if (this.templateConfig && this.templateConfig.pageLayouts && targetLayoutId) {
            layoutDef = this.templateConfig.pageLayouts.find(l => l.layoutId === targetLayoutId);
            if (layoutDef) {
                console.log(`PDF: Hydrating page ${page.id} with layout ${targetLayoutId}`);
                console.log(`PDF: Layout Stats - Slots: ${layoutDef.photoSlots?.length}, Text: ${layoutDef.textElements?.length}, Decos: ${layoutDef.decorations?.length}`);
            } else {
                console.warn(`PDF: Layout ${targetLayoutId} not found in template config!`);
            }
        } else if (page.layout) {
            // Fallback to legacy page.layout object
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
            let userPhotos = page.photos || [];

            // Legacy/MagicCreate Format Support: 
            // If page.photos is empty, but slots define 'photoId', use the slots themselves as photo sources.
            if (userPhotos.length === 0 && photoSlots.length > 0) {
                // Check if slots have photoId
                const hasEmbeddedPhotos = photoSlots.some(s => s.photoId);
                if (hasEmbeddedPhotos) {
                    console.log('PDF: Detected embedded photoIds in slots. Extracting...');
                    // Map slots to a pseudo-photos array to match the loop below, 
                    // OR just let the loop handle it if we adjust logic.
                    // The loop expects userPhotos[i] to correspond to photoSlots[i]
                    userPhotos = photoSlots.map(s => s.photoId ? { id: s.photoId } : null);
                }
            }

            console.log(`PDF: User photos available: ${userPhotos.length}`, userPhotos);

            for (let i = 0; i < photoSlots.length; i++) {
                const slot = photoSlots[i];
                let photo = userPhotos[i];

                // Fallback: If no photo object at this index, check the slot for embedded photoId
                // (Common in Magic Create / Legacy structures)
                if (!photo && (slot.photoId || slot.assetId)) {
                    photo = { id: slot.photoId || slot.assetId };
                }

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

                    // Apply shape clipping mask
                    const photoShape = slot.shape || page.imageShape || 'rect';
                    const needsClip = photoShape !== 'rect';
                    if (needsClip) {
                        this.doc.saveGraphicsState();
                        if (photoShape === 'circle') {
                            const radius = Math.min(w, h) / 2;
                            const cx = x + w / 2;
                            const cy = y + h / 2;
                            this.doc.circle(cx, cy, radius);
                            this.doc.clip();
                        } else if (photoShape === 'oval') {
                            const rx = w / 2;
                            const ry = h * 0.45;
                            const cx = x + w / 2;
                            const cy = y + h / 2;
                            this.doc.ellipse(cx, cy, rx, ry);
                            this.doc.clip();
                        } else if (photoShape === 'rounded') {
                            const r = 12; // rounded corner radius in pt
                            this.doc.roundedRect(x, y, w, h, r, r);
                            this.doc.clip();
                        }
                    }

                    // Draw the photo with template styling
                    await this.drawImage(photo.assetId || photo.id || photo, x, y, w, h, assets, slot);

                    if (needsClip) {
                        this.doc.restoreGraphicsState();
                    }

                    // Draw image frame overlay if specified
                    const frameId = slot.frameId || page.imageFrameId;
                    if (frameId && window.IMAGE_FRAMES) {
                        const frameDef = window.IMAGE_FRAMES.find(f => f.id === frameId);
                        if (frameDef) {
                            const shape = slot.shape || page.imageShape || 'rect';
                            const color = slot.frameColor || page.imageFrameColor || frameDef.color;
                            try {
                                const svgContent = frameDef.svgGen(w, h, color, shape);
                                await this.drawSvg(svgContent, x, y, w, h);
                                console.log(`PDF: Drew image frame ${frameId} at slot ${i}`);
                            } catch (e) {
                                console.warn(`PDF: Failed to draw image frame ${frameId}`, e);
                            }
                        }
                    }
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
            console.log(`PDF: Processing ${textElements.length} text/visual elements...`);
            // If hydrating, we need to merge with page.textContent
            // page.textContent is { elementId: "Actual Text" }
            for (const textDef of textElements) {
                if (textDef.type === 'element') {
                    await this.drawVisualElement(textDef, width, height);
                    continue;
                }

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
            }
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

    async drawVisualElement(el, pageWidth, pageHeight) {
        if (!el.url) return;
        try {
            const x = (parseFloat(el.x) / 100) * pageWidth;
            const y = (parseFloat(el.y) / 100) * pageHeight;
            // Map pixel sizes assuming 100vw = 800px standard editor view width
            const w = ((parseFloat(el.pixelWidth) || 100) / 800) * pageWidth;
            const h = ((parseFloat(el.pixelHeight) || 100) / 600) * pageHeight;

            let filterStr = '';
            if (el.filterHue) filterStr += `hue-rotate(${el.filterHue}deg) `;
            if (el.filterBrightness && el.filterBrightness !== 100) filterStr += `brightness(${el.filterBrightness}%) `;
            if (el.filterShadow) filterStr += `drop-shadow(4px 8px 12px ${el.filterShadowColor || 'rgba(0,0,0,0.5)'}) `;
            filterStr = filterStr.trim();

            const imgData = await new Promise((resolve, reject) => {
                const img = new Image();
                img.crossOrigin = 'Anonymous';
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    // Use higher resolution for crisp pdf elements
                    canvas.width = (img.width || w) * 2;
                    canvas.height = (img.height || h) * 2;
                    const ctx = canvas.getContext('2d');
                    ctx.scale(2, 2);
                    if (filterStr) {
                        ctx.filter = filterStr;
                    }
                    ctx.drawImage(img, 0, 0, img.width || w, img.height || h);
                    // Use PNG to preserve element transparency!
                    resolve(canvas.toDataURL('image/png'));
                };
                img.onerror = () => reject(new Error('Visual Element load failed'));
                img.src = el.url;
            });

            // Retain scale from Moveable if possible (simplified approach ignores rotation for now to avoid transform logic complexity in basic jsPDF)
            let scaleMultiplier = 1;
            if (el.transform && el.transform.includes('scale')) {
                const match = el.transform.match(/scale\(([^)]+)\)/);
                if (match && match[1]) {
                    scaleMultiplier = parseFloat(match[1]);
                }
            }

            const ew = w * scaleMultiplier;
            const eh = h * scaleMultiplier;
            // Center the image around coordinate if scaled
            const eX = x - (ew - w) / 2;
            const eY = y - (eh - h) / 2;

            this.doc.addImage(imgData, 'PNG', eX, eY, ew, eh, undefined, 'FAST');
        } catch (e) {
            console.warn("PDF: Failed to draw visual element", el.url, e);
        }
    }

    // --- Helpers ---

    async drawBackground(bgColorOrId, themeId, w, h) {
        // 1. Try generic Theme ID first
        if (themeId) {
            const theme = window.BACKGROUND_TEXTURES?.find(t => t.id === themeId);
            if (theme && await this.drawTexture(theme, w, h)) return;
        }

        // 2. Handle Object-Based Backgrounds (Magic Create V2/V3)
        // Check strictly that it IS an object and NOT null.
        if (bgColorOrId && typeof bgColorOrId === 'object') {
            const bg = bgColorOrId;
            if (bg.type === 'image' || bg.imageUrl) {
                // Construct temp texture def
                const tex = { url: bg.imageUrl, id: 'temp-bg-image' };
                if (await this.drawTexture(tex, w, h)) return;
            } else if (bg.type === 'ai_generated' && bg.ai_image_url) {
                const tex = { url: bg.ai_image_url, id: 'temp-ai-bg' };
                if (await this.drawTexture(tex, w, h)) return;
            } else if (bg.color) {
                this.doc.setFillColor(bg.color);
                this.doc.rect(0, 0, w, h, 'F');
                return;
            } else if (bg.type === 'gradient' && bg.gradient_colors) {
                // Naive fallback: use first color
                this.doc.setFillColor(bg.gradient_colors[0]);
                this.doc.rect(0, 0, w, h, 'F');
                return;
            }
            // If object matches nothing, fall through to default.
        }

        // 3. String Handlers
        // STRICT CHECK: Type must be string.
        if (typeof bgColorOrId === 'string' && bgColorOrId) {
            // A) Texture ID (if not a hex color)
            if (!bgColorOrId.startsWith('#') && !bgColorOrId.startsWith('rgb')) {
                const bg = window.BACKGROUND_TEXTURES?.find(t => t.id === bgColorOrId);
                if (bg && await this.drawTexture(bg, w, h)) return;
            }

            // B) Color String (Hex or RGB)
            // jsPDF usually needs hex or specific color args.
            if (bgColorOrId.startsWith('#') || bgColorOrId.startsWith('rgb')) {
                this.doc.setFillColor(bgColorOrId);
                this.doc.rect(0, 0, w, h, 'F');
                return;
            }

            if (bgColorOrId === 'classic') {
                this.doc.setFillColor('#1e293b'); // Dark Slate Blue for "Classic" (matches Editor panel)
                this.doc.rect(0, 0, w, h, 'F');
                return;
            }

            // Fallback for string: treat as color? Or ignored? 
            // If it was a texture ID not found, it might be a weird color name.
            // Let's try setting it as fill color just in case (e.g. "red", "blue")
            try {
                this.doc.setFillColor(bgColorOrId);
                this.doc.rect(0, 0, w, h, 'F');
                return;
            } catch (e) {
                console.warn('PDF: Invalid color string', bgColorOrId);
            }
        }

        // 4. Default White
        // If we got here, nothing matched.
        this.doc.setFillColor('#ffffff');
        this.doc.rect(0, 0, w, h, 'F');
    }

    async drawTexture(textureDef, w, h) {
        if (textureDef && textureDef.url) {
            try {
                // Fix: Upgrade texture resolution
                let url = textureDef.url;
                if (url.includes('unsplash.com') && url.includes('&w=')) {
                    url = url.replace(/&w=\d+/, '&w=2048');
                }
                const result = await this.loadImage(url);

                // Simulate background-size: cover to prevent distortion/blur
                const dims = this.calculateCoverDimensions(0, 0, w, h, result.width, result.height);

                // Clip to page bounds (in case cover extends beyond)
                this.doc.saveGraphicsState();
                this.doc.rect(0, 0, w, h); // Define clipping path
                this.doc.clip();

                // Draw image with calculated cover dimensions
                // Remove 'FAST' to ensure quality
                this.doc.addImage(result.data, 'JPEG', dims.x, dims.y, dims.width, dims.height);

                this.doc.restoreGraphicsState();
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
                let imageData = null;
                let imgWidth = 0;
                let imgHeight = 0;

                // === RESOLVE PHOTO STYLE FROM TEMPLATE ===
                const photoStyleName = slot?.photoStyle || 'default';
                const photoStyles = this.templateConfig?.designSystem?.photoStyles || {};
                const styleConfig = photoStyles[photoStyleName] || {};
                console.log(`[PDF] Photo style: ${photoStyleName}`, styleConfig);

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
                            imageData = base64HighRes;
                            // Get dimensions from the base64 image
                            const dims = await this.getBase64Dimensions(base64HighRes);
                            imgWidth = dims.width;
                            imgHeight = dims.height;
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
                    // PDF Resolution Priority: prefer rawBaseUrl > url > thumbnailUrl
                    let src = photo.rawBaseUrl || photo.url || photo.highResUrl || photo.thumbnailUrl;

                    if (typeof photo === 'string') src = photo;

                    // Upgrade Quality Params for Unsplash
                    if (src && src.includes('unsplash.com') && src.includes('&w=')) {
                        src = src.replace(/&w=\d+/, '&w=3000');
                    }
                    // Google Photos params - Use high-res (=w2048-h2048) for reliable access
                    // NOTE: =d (original download) often triggers 403; =w2048-h2048 is safer and print-quality
                    if (src && (photo.source === 'google-photos' || (src && src.includes('googleusercontent.com')))) {
                        const baseUrl = src.includes('=') ? src.split('=')[0] : src;
                        src = baseUrl + '=w2048-h2048';
                    }

                    if (src && src.startsWith('data:')) {
                        console.log(`[PDF] Using Data URI for ${photoId}`);
                        imageData = src;
                        // Get dimensions from the data URI
                        const dims = await this.getBase64Dimensions(src);
                        imgWidth = dims.width;
                        imgHeight = dims.height;
                        success = true;
                    } else if (src) {
                        // Valid URL but not data URI (e.g. local asset or non-CORS external)
                        console.log(`[PDF] Loading Image from URL: ${src.substring(0, 50)}...`);
                        const result = await this.loadImage(src);
                        imageData = result.data;
                        imgWidth = result.width;
                        imgHeight = result.height;
                        success = true;
                    }
                }

                if (!success || !imageData) {
                    console.error(`[PDF] CRITICAL: All image loading strategies failed for ${photoId}`);
                    throw new Error("All image loading strategies failed");
                }

                // === ASPECT RATIO PRESERVING RENDERING ===
                // Use "cover" mode: scale to fill slot while maintaining aspect ratio, clip overflow
                console.log(`[PDF] Image natural size: ${imgWidth}x${imgHeight}, slot: ${w.toFixed(1)}x${h.toFixed(1)}`);

                const coverDims = this.calculateCoverDimensions(x, y, w, h, imgWidth, imgHeight);
                console.log(`[PDF] Cover dimensions: x=${coverDims.x.toFixed(1)}, y=${coverDims.y.toFixed(1)}, w=${coverDims.width.toFixed(1)}, h=${coverDims.height.toFixed(1)}`);

                // === SHAPE-AWARE CLIPPING ===
                // Parse border radius to determine shape
                const borderRadiusStr = styleConfig.borderRadius || '0px';
                const borderRadius = parseFloat(borderRadiusStr) * 0.75; // px to pt
                const isCircle = borderRadiusStr === '50%';

                // Save graphics state, apply clipping, draw image, restore state
                this.doc.saveGraphicsState();

                // Create clipping path based on shape
                if (isCircle) {
                    // Circle clipping: use the smaller dimension as diameter
                    const diameter = Math.min(w, h);
                    const cx = x + w / 2;
                    const cy = y + h / 2;
                    const radius = diameter / 2;
                    this.drawCircleClipPath(cx, cy, radius);
                } else if (borderRadius > 0) {
                    // Rounded rectangle clipping
                    this.drawRoundedRectClipPath(x, y, w, h, borderRadius);
                } else {
                    // Standard rectangle clipping
                    this.doc.rect(x, y, w, h);
                }
                this.doc.clip();

                // Draw image with cover dimensions (may extend beyond slot, but will be clipped)
                // Remove 'FAST' to ensure high quality (using default 'NONE' or 'SLOW' equivalent)
                this.doc.addImage(imageData, 'JPEG', coverDims.x, coverDims.y, coverDims.width, coverDims.height);

                // Restore graphics state (removes clipping)
                this.doc.restoreGraphicsState();

                // === DRAW BORDER/FRAME ===
                if (styleConfig.border && styleConfig.border !== 'none') {
                    this.drawPhotoFrame(x, y, w, h, styleConfig, isCircle, borderRadius);
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

    /**
     * Draw a circular clipping path
     */
    drawCircleClipPath(cx, cy, radius) {
        // Use bezier curves to approximate a circle
        const kappa = 0.5522848; // Approximation constant for circle with bezier
        const ox = radius * kappa;
        const oy = radius * kappa;

        // Move to the rightmost point
        // jsPDF doesn't have native circle clipping, so we draw a path
        // Using the internal path API
        const doc = this.doc;

        // Start path - move to right of circle
        doc.moveTo(cx + radius, cy);

        // Draw 4 bezier curves for the circle
        doc.curveTo(cx + radius, cy + oy, cx + ox, cy + radius, cx, cy + radius);
        doc.curveTo(cx - ox, cy + radius, cx - radius, cy + oy, cx - radius, cy);
        doc.curveTo(cx - radius, cy - oy, cx - ox, cy - radius, cx, cy - radius);
        doc.curveTo(cx + ox, cy - radius, cx + radius, cy - oy, cx + radius, cy);
    }

    /**
     * Draw a rounded rectangle clipping path
     */
    drawRoundedRectClipPath(x, y, w, h, radius) {
        const doc = this.doc;
        const r = Math.min(radius, w / 2, h / 2); // Ensure radius doesn't exceed half dimensions

        // Start at top-left corner after the arc
        doc.moveTo(x + r, y);

        // Top edge and top-right corner
        doc.lineTo(x + w - r, y);
        doc.curveTo(x + w, y, x + w, y + r, x + w, y + r);

        // Right edge and bottom-right corner
        doc.lineTo(x + w, y + h - r);
        doc.curveTo(x + w, y + h, x + w - r, y + h, x + w - r, y + h);

        // Bottom edge and bottom-left corner
        doc.lineTo(x + r, y + h);
        doc.curveTo(x, y + h, x, y + h - r, x, y + h - r);

        // Left edge and top-left corner
        doc.lineTo(x, y + r);
        doc.curveTo(x, y, x + r, y, x + r, y);
    }

    /**
     * Draw photo frame/border based on style config
     */
    drawPhotoFrame(x, y, w, h, styleConfig, isCircle, borderRadius) {
        // Parse border style: e.g. "4px solid #C9A227"
        const borderStr = styleConfig.border || '';
        const borderMatch = borderStr.match(/(\d+)px\s+(\w+)\s+(#[A-Fa-f0-9]+|rgba?\([^)]+\)|\w+)/);

        if (!borderMatch) return;

        const borderWidth = parseFloat(borderMatch[1]) * 0.75; // px to pt
        const borderStyle = borderMatch[2]; // 'solid', 'dashed', etc.
        const borderColor = this.resolveColorSafe(borderMatch[3]);

        console.log(`[PDF] Drawing frame: ${borderWidth}pt ${borderStyle} ${borderColor}`);

        this.doc.setDrawColor(borderColor);
        this.doc.setLineWidth(borderWidth);

        if (borderStyle === 'dashed') {
            this.doc.setLineDashPattern([4, 4], 0);
        } else {
            this.doc.setLineDashPattern([], 0);
        }

        if (isCircle) {
            // Draw circle border
            const diameter = Math.min(w, h);
            const cx = x + w / 2;
            const cy = y + h / 2;
            const radius = diameter / 2;
            this.doc.circle(cx, cy, radius, 'S');
        } else if (borderRadius > 0) {
            // Draw rounded rectangle border
            this.drawRoundedRect(x, y, w, h, borderRadius, 'S');
        } else {
            // Draw standard rectangle border
            this.doc.rect(x, y, w, h, 'S');
        }

        // Reset dash pattern
        this.doc.setLineDashPattern([], 0);
    }

    /**
     * Draw a rounded rectangle (stroke or fill)
     */
    drawRoundedRect(x, y, w, h, radius, style = 'S') {
        const doc = this.doc;
        const r = Math.min(radius, w / 2, h / 2);

        // Start path
        doc.moveTo(x + r, y);

        // Top edge
        doc.lineTo(x + w - r, y);

        // Top-right corner (quadratic bezier approximation for quarter circle)
        doc.curveTo(x + w, y, x + w, y + r, x + w, y + r);

        // Right edge
        doc.lineTo(x + w, y + h - r);

        // Bottom-right corner
        doc.curveTo(x + w, y + h, x + w - r, y + h, x + w - r, y + h);

        // Bottom edge
        doc.lineTo(x + r, y + h);

        // Bottom-left corner
        doc.curveTo(x, y + h, x, y + h - r, x, y + h - r);

        // Left edge
        doc.lineTo(x, y + r);

        // Top-left corner
        doc.curveTo(x, y, x + r, y, x + r, y);

        // Close and apply style
        if (style === 'F') {
            doc.fill();
        } else if (style === 'FD' || style === 'DF') {
            doc.fillStroke();
        } else {
            doc.stroke();
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
        // Print-quality image loader.
        // Upscales to minimum 2048px on longest side for crisp PDF output.
        const MIN_PRINT_DIM = 2048;

        const tryLoad = (targetUrl) => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'Anonymous';
            img.onload = () => {
                // Calculate scale to ensure minimum print resolution
                const naturalW = img.width;
                const naturalH = img.height;
                const maxDim = Math.max(naturalW, naturalH);
                const scale = maxDim < MIN_PRINT_DIM ? (MIN_PRINT_DIM / maxDim) : 1;

                const canvasW = Math.round(naturalW * scale);
                const canvasH = Math.round(naturalH * scale);

                const canvas = document.createElement('canvas');
                canvas.width = canvasW;
                canvas.height = canvasH;
                const ctx = canvas.getContext('2d');
                // Enable high-quality image scaling
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, canvasW, canvasH);
                try {
                    // Use 98% JPEG quality for print-ready PDFs
                    const data = canvas.toDataURL('image/jpeg', 0.98);
                    if (scale > 1) {
                        console.log(`[PDF] Image upscaled: ${naturalW}x${naturalH} → ${canvasW}x${canvasH} (${scale.toFixed(2)}x)`);
                    }
                    resolve({
                        data: data,
                        width: canvasW,
                        height: canvasH
                    });
                } catch (e) {
                    reject(e);
                }
            };
            img.onerror = () => reject(new Error(`Image load failed: ${targetUrl?.substring(0, 50)}`));
            img.src = targetUrl;
        });

        try {
            return await tryLoad(url);
        } catch (e) {
            // Retry with fallback URL strategies
            console.warn(`[PDF] Primary load failed, trying fallbacks...`, e.message);

            // If Google Photos URL, try with different size params
            if (url && url.includes('googleusercontent.com')) {
                const baseUrl = url.includes('=') ? url.split('=')[0] : url;
                const fallbacks = [
                    baseUrl + '=w1600-h1600',
                    baseUrl + '=w1200-h1200',
                    baseUrl + '=s1200',
                ];
                for (const fallbackUrl of fallbacks) {
                    try {
                        console.log(`[PDF] Trying fallback: ${fallbackUrl.substring(0, 60)}...`);
                        return await tryLoad(fallbackUrl);
                    } catch (e2) {
                        continue;
                    }
                }
            }
            throw e;
        }
    }

    /**
    * Calculate dimensions for "cover" mode - fill the slot while maintaining aspect ratio
    * Image is scaled to cover the entire slot area, then centered (with cropping at edges)
    * @returns {Object} { x, y, width, height } - position and size for the image
    */
    calculateCoverDimensions(slotX, slotY, slotW, slotH, imgW, imgH) {
        const slotRatio = slotW / slotH;
        const imgRatio = imgW / imgH;

        let drawW, drawH, drawX, drawY;

        if (imgRatio > slotRatio) {
            // Image is wider than slot - match height, crop sides
            drawH = slotH;
            drawW = slotH * imgRatio;
            drawX = slotX - (drawW - slotW) / 2;
            drawY = slotY;
        } else {
            // Image is taller than slot - match width, crop top/bottom
            drawW = slotW;
            drawH = slotW / imgRatio;
            drawX = slotX;
            drawY = slotY - (drawH - slotH) / 2;
        }

        return { x: drawX, y: drawY, width: drawW, height: drawH };
    }

    /**
     * Get dimensions from a base64 data URI
     * @returns {Promise<{width: number, height: number}>}
     */
    async getBase64Dimensions(base64) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.width, height: img.height });
            img.onerror = reject;
            img.src = base64;
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
                            // Also register as bold - jsPDF needs explicit registration per style
                            // Using same font file for bold since we only have regular weight
                            this.doc.addFont('Alef-Regular.ttf', 'Rubik', 'bold');

                            // Verify Font Usability
                            console.log("PDF: Verifying Hebrew font...");
                            this.doc.setFont('Rubik', 'normal');
                            this.hebrewFontLoaded = true;
                            console.log("PDF: Hebrew Font Loaded and Verified (normal + bold).");
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

    showDownloadModal(url, filenameProvided) {
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
                console.log(`[PDF] Button Clicked. Filename: ${filename}`);
                console.log(`[PDF] URL MIME type check - URL: ${url.substring(0, 50)}...`);

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

                    console.log(`[PDF] Download triggered for ${filename} (Type: application/pdf)`);

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
                    console.error("[PDF] Download error:", err);
                    alert("Download Error: " + err.message);
                    newBtn.innerHTML = 'Download PDF';
                }
            };

            modal.classList.add('active');
        } else {
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
}

export const pdfExport = new PDFExport();
