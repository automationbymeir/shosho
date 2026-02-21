import { photoPositionService } from '../services/photo-position-service.js';

export class RenderEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }
    /**
     * Render a page into a specific container.
     * Used by the main workspace and by the preview generator to ensure 1:1 match.
     */
    renderPageToContainer(page, assets, container, selectionId = null) {
        if (!page || !container) {
            if (container) container.innerHTML = '<div class="empty-message">No Page Selected</div>';
            return;
        }

        // Clear container
        container.innerHTML = '';

        // Create Page Element
        const pageEl = document.createElement('div');
        pageEl.className = 'shoso-page';
        if (page.templateId) {
            pageEl.classList.add(page.templateId);
        }
        pageEl.dataset.pageId = page.id;
        pageEl.style.width = '100%';
        pageEl.style.height = '100%';
        pageEl.style.position = 'relative';
        pageEl.style.overflow = 'hidden';

        // Apply Background based on Theme
        // Apply Background based on Theme or DesignedPage
        const theme = window.BACKGROUND_TEXTURES?.find(t => t.id === page.background);
        if (theme) {
            if (theme.url.startsWith('http') || theme.url.startsWith('assets')) {
                pageEl.style.backgroundImage = `url('${theme.url}')`;
                pageEl.style.backgroundSize = 'cover';
            } else {
                pageEl.style.backgroundColor = theme.url;
            }
        }
        // Magic Create V2 / V3 Object Support
        else if (typeof page.background === 'object') {
            const bg = page.background;
            if (bg.textureId) {
                const theme = window.BACKGROUND_TEXTURES?.find(t => t.id === bg.textureId);
                if (theme) {
                    if (theme.url.startsWith('http') || theme.url.startsWith('assets')) {
                        pageEl.style.backgroundImage = `url('${theme.url}')`;
                        pageEl.style.backgroundSize = 'cover';
                    } else {
                        pageEl.style.backgroundColor = theme.url;
                    }
                }
            } else if (bg.type === 'image' || bg.imageUrl) {
                pageEl.style.backgroundImage = `url('${bg.imageUrl}')`;
                pageEl.style.backgroundSize = 'cover';
            } else if (bg.type === 'ai_generated' && bg.ai_image_url) {
                pageEl.style.backgroundImage = `url('${bg.ai_image_url}')`;
                pageEl.style.backgroundSize = 'cover';
            } else if (bg.type === 'gradient' && bg.gradient_colors) {
                const angle = bg.gradient_angle || 180;
                pageEl.style.background = `linear-gradient(${angle}deg, ${bg.gradient_colors.join(', ')})`;
            } else if (bg.type === 'pattern' && bg.pattern_name) {
                // TODO: Implement pattern rendering
                pageEl.style.backgroundColor = bg.color || '#ffffff';
            } else if (bg.color) {
                pageEl.style.backgroundColor = bg.color;
            }
        }
        // Legacy String Support
        else if (typeof page.background === 'string') {
            if (page.background.startsWith('http') || page.background.startsWith('data:')) {
                pageEl.style.backgroundImage = `url('${page.background}')`;
                pageEl.style.backgroundSize = 'cover';
            } else if (page.background.startsWith('#') || page.background.startsWith('rgb')) {
                pageEl.style.backgroundColor = page.background;
            }
        }

        // 2. Render Photo Slots
        if (page.layout && page.layout.slots) {
            const pageWidth = container.clientWidth || 800; // Fallback for headless/hidden
            const pageHeight = container.clientHeight || 600;

            page.layout.slots.forEach(slot => {
                const slotEl = document.createElement('div');
                slotEl.className = 'page-slot photo-slot';
                // Positioning
                slotEl.style.position = 'absolute';
                slotEl.style.left = `${parseFloat(slot.x)}%`;
                slotEl.style.top = `${parseFloat(slot.y)}%`;
                slotEl.style.width = `${parseFloat(slot.width)}%`;
                slotEl.style.height = `${parseFloat(slot.height)}%`;
                slotEl.style.overflow = 'hidden';

                // Draggable for Swapping
                slotEl.draggable = true;

                // Spacing (Padding)
                if (page.spacing) {
                    slotEl.style.boxSizing = 'border-box';
                    slotEl.style.padding = `${page.spacing}px`;
                }

                // DND Events (Only attached if not in preview mode? - Actually harmless in preview usually, but let's allow)
                slotEl.addEventListener('dragstart', (e) => {
                    e.stopPropagation();
                    e.dataTransfer.setData('application/json', JSON.stringify({
                        type: 'slot-swap',
                        photoId: slot.photoId,
                        pageId: page.id
                    }));
                    slotEl.style.opacity = '0.5';
                });
                slotEl.addEventListener('dragend', () => {
                    slotEl.style.opacity = '1';
                });

                // Add Photo
                // Fallback for assetId (Legacy/Backend format mismatch)
                const targetId = slot.photoId || slot.assetId;
                slotEl.dataset.selectableId = targetId; // Required for drag-and-drop (frames/swaps)

                const photo = assets.photos.find(p => p.id == targetId); // Relaxed matching

                // DEBUG: Trace rendering
                if (!photo) {
                    // Only warn if we actually have a targetId but can't find the photo
                    if (targetId) {
                        console.warn(`[RenderEngine] Photo NOT FOUND for slot. ID: ${targetId}. Available: ${assets.photos.length}`);
                    }
                }

                if (photo) {
                    const img = document.createElement('img');

                    // --- MEMORY OPTIMIZATION: ENFORCE THUMBNAILS ON CANVAS ---
                    // The Canvas ONLY needs thumbnails (low memory). High-res is only pulled by PDF export engine.
                    let src = photo.thumbnailUrl || photo.url || photo.rawBaseUrl;

                    img.style.width = '100%';
                    img.style.height = '100%';

                    // --- VERY FAST SMART CROP (SYNCHRONOUS) ---
                    img.style.objectFit = 'cover';
                    img.style.width = '100%';
                    img.style.height = '100%';

                    // 1. Check if user manually panned it
                    if (slot.manualObjectPosition) {
                        img.style.objectPosition = slot.manualObjectPosition;
                    }
                    // 2. Legacy save state (if old `crop` object exists)
                    else if (slot.crop) {
                        const cw = slot.crop.width || 100;
                        const ch = slot.crop.height || 100;
                        const focalX = slot.crop.x + (cw / 2);
                        const focalY = slot.crop.y + (ch / 2);
                        let pw = photo.width || 1000 * (photo.ratio || 1.5);
                        let ph = photo.height || 1000;
                        const posX = (focalX / pw) * 100;
                        const posY = (focalY / ph) * 100;
                        img.style.objectPosition = `${posX}% ${posY}%`;
                    }
                    // 3. New Synchronous Batch Vision Focal Point
                    else if (photo.visionFocalPoint) {
                        img.style.objectPosition = `${photo.visionFocalPoint.focalX}% ${photo.visionFocalPoint.focalY}%`;
                    }
                    // 4. Default Base Center
                    else {
                        img.style.objectPosition = '50% 50%';
                    }


                    // Memory Limit Enforcer: Only assign URL/Thumbnail directly. Do NOT preload 4K proxy URLs on browser
                    if (photo.source === 'google-photos' || (src && src.includes('googleusercontent.com'))) {
                        // Google Photos allows direct rendering of standard URLs with `=w` params without hitting 403 on standard tags
                        // Apply reasonable generic limit `=w800` to Google Photos URLs if no equal sign is present to save memory.
                        let targetParams = src;
                        if (!targetParams.includes('=')) targetParams += '=w800';
                        else if (targetParams.includes('=d')) targetParams = targetParams.replace('=d', '=w800'); // downgrade =d to =w800 on UI

                        img.src = photo.thumbnailUrl || targetParams;

                        // Fallback
                        img.onerror = () => {
                            if (!photo.thumbnailUrl) img.src = 'assets/placeholder-image.png';
                        };
                    } else {
                        // Non-Google Photos - load directly
                        if (src && src.includes('unsplash.com') && src.includes('&w=') && !src.includes('&w=2048')) {
                            // Upgrade unsplash quality if possible
                            src = src.replace(/&w=\d+/, '&w=2048');
                        }
                        img.src = src;

                        // Fallback for other sources
                        img.onerror = () => {
                            if (photo.thumbnailUrl && img.src !== photo.thumbnailUrl) {
                                img.src = photo.thumbnailUrl;
                            } else {
                                img.src = 'assets/placeholder-image.png';
                            }
                        };
                    }

                    // Apply Filters
                    const filterStyle = slot.computedFilter || slot.filter;
                    if (filterStyle && filterStyle !== 'none') {
                        img.style.filter = filterStyle;
                    }

                    // Render Image Frame
                    const frameId = slot.frameId || page.imageFrameId;
                    if (frameId && window.IMAGE_FRAMES) {
                        const frameDef = window.IMAGE_FRAMES.find(f => f.id === frameId);
                        if (frameDef) {
                            const slotW = (pageWidth * parseFloat(slot.width)) / 100;
                            const slotH = (pageHeight * parseFloat(slot.height)) / 100;
                            const shape = slot.shape || page.imageShape || 'rect';
                            const color = slot.frameColor || page.imageFrameColor || frameDef.color;

                            const svgContent = frameDef.svgGen(slotW, slotH, color, shape);
                            const svgEl = this.createSVG(svgContent, slotW, slotH);
                            svgEl.style.position = 'absolute';
                            svgEl.style.inset = '0';
                            svgEl.style.pointerEvents = 'none';
                            slotEl.appendChild(svgEl);
                        }
                    }
                    slotEl.appendChild(img);

                    // --- MANUAL CROP PANNING (DOUBLE CLICK) ---
                    slotEl.addEventListener('dblclick', (e) => {
                        if (window.store && window.store.state && !window.store.state.isPreview) {
                            e.stopPropagation();
                            e.preventDefault();

                            const isActive = slotEl.classList.contains('mc-crop-active');
                            if (!isActive) {
                                slotEl.classList.add('mc-crop-active');
                                img.style.cursor = 'grab';
                                slotEl.style.outline = '4px solid #007bff';
                                slotEl.style.boxShadow = '0 0 15px rgba(0, 123, 255, 0.5)';
                                slotEl.style.zIndex = '100';

                                // Disable drag and drop functionality while cropping
                                slotEl.setAttribute('draggable', 'false');

                                const hint = document.createElement('div');
                                hint.className = 'mc-crop-hint';
                                hint.innerHTML = '<span style="background:rgba(0,0,0,0.8); color:#fff; padding:6px 12px; border-radius:6px; font-size:13px; pointer-events:none; font-weight:bold; letter-spacing:0.5px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);"><i class="fa-solid fa-arrows-up-down-left-right"></i> Drag to reposition. Double-click to set.</span>';
                                hint.style.position = 'absolute';
                                hint.style.bottom = '15px';
                                hint.style.left = '50%';
                                hint.style.transform = 'translateX(-50%)';
                                hint.style.zIndex = '101';
                                slotEl.appendChild(hint);
                            } else {
                                // Finish crop
                                slotEl.classList.remove('mc-crop-active');
                                img.style.cursor = '';
                                slotEl.style.outline = '';
                                slotEl.style.boxShadow = '';
                                slotEl.style.zIndex = '';
                                slotEl.setAttribute('draggable', 'true');

                                const hint = slotEl.querySelector('.mc-crop-hint');
                                if (hint) hint.remove();

                                // Save explicit position and force database sync
                                slot.manualObjectPosition = img.style.objectPosition;
                                if (window.store) {
                                    window.store.pushState('Repositioned Photo');
                                    window.store.notify('pages', window.store.state.pages);
                                }
                            }
                        }
                    });

                    // Mouse Drag Logic for Repositioning
                    img.addEventListener('mousedown', (e) => {
                        if (slotEl.classList.contains('mc-crop-active')) {
                            e.preventDefault(); // Stop standard DND API from hijacking mouse
                            img.style.cursor = 'grabbing';

                            const startX = e.clientX;
                            const startY = e.clientY;

                            const currentPos = img.style.objectPosition || '50% 50%';
                            const parts = currentPos.split(' ');
                            const cX = parseFloat(parts[0]) || 50;
                            const cY = parseFloat(parts[1]) || 50;

                            // Map pixel mouse movement to percentage shifts
                            const imgRect = img.getBoundingClientRect();
                            const sensitivityX = 100 / (imgRect.width || 200);
                            const sensitivityY = 100 / (imgRect.height || 200);

                            const onMouseMove = (moveEvt) => {
                                const deltaX = moveEvt.clientX - startX;
                                const deltaY = moveEvt.clientY - startY;

                                // Subtracting mouse delta means moving mouse right shifts the image to the right boundaries (0%)
                                let nX = cX - (deltaX * sensitivityX);
                                let nY = cY - (deltaY * sensitivityY);

                                nX = Math.max(0, Math.min(100, nX));
                                nY = Math.max(0, Math.min(100, nY));

                                img.style.objectPosition = `${nX}% ${nY}%`;
                            };

                            const onMouseUp = () => {
                                img.style.cursor = 'grab';
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            };

                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                        }
                    });
                }

                // Selection (Visual Only - handled by CSS)
                if (slot.photoId === selectionId) {
                    slotEl.classList.add('selected');
                    const handles = document.createElement('div');
                    handles.className = 'selection-overlay';
                    slotEl.appendChild(handles);
                }

                // Click to Select
                slotEl.addEventListener('click', (e) => {
                    e.stopPropagation();
                    slotEl.dataset.selectableType = 'photo';
                    slotEl.dataset.selectableId = slot.photoId;
                });

                pageEl.appendChild(slotEl);
            });
        }

        // 3. Render Page Frame
        if (page.pageFrameId && window.PAGE_FRAMES) {
            const frameDef = window.PAGE_FRAMES.find(f => f.id === page.pageFrameId);
            if (frameDef) {
                const w = container.clientWidth || 800;
                const h = container.clientHeight || 600;
                const svgContent = frameDef.svgGen(w, h, frameDef.color);
                const frameEl = this.createSVG(svgContent, w, h);
                frameEl.className = 'page-frame';
                frameEl.style.position = 'absolute';
                frameEl.style.inset = '0';
                frameEl.style.pointerEvents = 'none';
                frameEl.style.zIndex = 5;
                pageEl.appendChild(frameEl);
            }
        }

        // 4. Render Elements (Text, Shapes)
        if (page.elements) {
            page.elements.forEach(el => {
                const domEl = document.createElement('div');
                domEl.className = `page-element element-${el.type}`;
                domEl.style.position = 'absolute';
                domEl.style.left = `${el.x}%`;
                domEl.style.top = `${el.y}%`;
                if (el.zIndex !== undefined) domEl.style.zIndex = el.zIndex;

                domEl.dataset.selectableType = el.type;
                domEl.dataset.selectableId = el.id;

                if (el.type === 'text') {
                    domEl.classList.add('text-element');
                    domEl.style.minWidth = '200px';
                    domEl.style.maxWidth = `${el.width || 50}%`;
                    if (!el.zIndex) domEl.style.zIndex = 10;

                    const styleDef = window.TEXT_STYLES?.find(s => s.id === el.styleId);
                    const cssStyle = styleDef ? styleDef.style : {};
                    Object.assign(domEl.style, cssStyle);

                    if (el.fontSize) domEl.style.fontSize = `${el.fontSize}px`;
                    if (el.color) domEl.style.color = el.color;
                    if (el.fontFamily) domEl.style.fontFamily = el.fontFamily;
                    if (el.textAlign) domEl.style.textAlign = el.textAlign;

                    domEl.textContent = el.content;
                }

                // (Shapes/Containers simplified for brevity in this view, same logic as before)
                else if (el.type === 'shape') {
                    domEl.classList.add('shape-element');
                    if (el.subtype) domEl.classList.add(el.subtype);
                    domEl.style.width = `${el.width}%`;
                    domEl.style.height = `${el.height}%`;
                    if (el.color) domEl.style.backgroundColor = el.color;
                }

                if (el.id === selectionId) {
                    domEl.classList.add('selected');
                    domEl.style.border = '2px solid var(--color-primary, #6366f1)';
                }

                pageEl.appendChild(domEl);
            });
        }

        // 5. Render Decorations (New V3 Feature)
        if (page.decorations && Array.isArray(page.decorations)) {
            page.decorations.forEach((deco, index) => {
                const decoEl = document.createElement('div');
                decoEl.className = `page-decoration deco-${deco.type}`;
                decoEl.style.position = 'absolute';

                // Position
                if (deco.position) {
                    decoEl.style.left = `${deco.position.x}%`;
                    decoEl.style.top = `${deco.position.y}%`;
                    decoEl.style.width = `${deco.position.width}%`;
                    decoEl.style.height = `${deco.position.height}%`;
                    if (deco.position.rotation) {
                        decoEl.style.transform = `rotate(${deco.position.rotation}deg)`;
                    }
                    decoEl.style.zIndex = deco.position.z_index || 4; // Below text (10) but above background
                }

                // Opacity & Color
                if (deco.opacity) decoEl.style.opacity = deco.opacity;

                // Content
                if (deco.asset_url) {
                    const img = document.createElement('img');
                    img.src = deco.asset_url;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'contain';
                    if (deco.color) {
                        // Simple SVG coloring hack using filters if simple icon, 
                        // or we assume assets are pre-colored. 
                        // For V1 we just render the asset.
                    }
                    decoEl.appendChild(img);
                } else if (deco.type === 'flourish') {
                    // Placeholder for CSS/SVG flourish
                    decoEl.innerHTML = `<svg viewBox="0 0 100 100" style="width:100%;height:100%;fill:${deco.color || '#000'}"><path d="M10,50 Q25,25 50,50 T90,50" stroke="currentColor" fill="none" class="mock-flourish"/></svg>`;
                }

                pageEl.appendChild(decoEl);
            });
        }

        container.appendChild(pageEl);
    }

    /**
     * Primary Render Proxy
     */
    renderPage(page, assets, selectionId = null) {
        this.renderPageToContainer(page, assets, this.container, selectionId);
    }

    createSVG(content, w, h) {
        const div = document.createElement('div');
        div.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" xmlns="http://www.w3.org/2000/svg" style="display:block; width:100%; height:100%">${content}</svg>`;
        return div.firstElementChild;
    }

    /**
     * Render cover page with template-aware styling
     * @param {Object} cover - Cover state from store
     * @param {Object} assets - Assets including photos
     * @param {Object} templateConfig - Optional template configuration for styling
     */
    renderCover(cover, assets, templateConfig = null) {
        this.container.innerHTML = '';

        // Extract design system from template if available
        const ds = templateConfig?.designSystem || {};
        const colors = ds.colors || {};
        const typography = ds.typography || {};
        const decorativeColors = colors.decorative || {};

        // Determine colors based on template or cover state
        const bgColor = cover.color || colors.background || cover.theme || '#fff';
        const textColor = cover.textColor || colors.text?.primary || '#000';
        const accentColor = decorativeColors.gold || colors.accent || '#C9A227';
        const titleFont = typography.title?.family || typography.heading?.family || 'Playfair Display, serif';
        const bodyFont = typography.body?.family || 'Montserrat, sans-serif';

        const wrapper = document.createElement('div');
        wrapper.className = 'cover-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.width = '100%';
        wrapper.style.height = '100%';
        wrapper.style.padding = '40px';
        wrapper.style.gap = '20px';
        wrapper.style.justifyContent = 'center';
        wrapper.style.alignItems = 'center';
        wrapper.style.backgroundColor = '#222';

        // 1. Back Cover
        const backEl = document.createElement('div');
        backEl.className = 'cover-page back-cover';
        backEl.style.width = '45%';
        backEl.style.height = '100%';
        backEl.style.position = 'relative';
        backEl.style.boxShadow = '5px 5px 15px rgba(0,0,0,0.5)';

        // Background Logic (Shared) - Template-aware
        const applyCoverBg = (el) => {
            // First check if we have a template-specific theme
            if (cover.theme && typeof cover.theme === 'string') {
                // Check if it's a color code
                if (cover.theme.startsWith('#') || cover.theme.startsWith('rgb')) {
                    el.style.backgroundColor = cover.theme;
                    return;
                }
                // Check global textures
                const globalTheme = window.BACKGROUND_TEXTURES?.find(t => t.id === cover.theme);
                if (globalTheme) {
                    if (globalTheme.url.startsWith('http') || globalTheme.url.startsWith('assets')) {
                        el.style.backgroundImage = `url('${globalTheme.url}')`;
                        el.style.backgroundSize = 'cover';
                    } else {
                        el.style.backgroundColor = globalTheme.url;
                    }
                    return;
                }
            }
            // Use template background color if available
            if (colors.background) {
                el.style.backgroundColor = colors.background;
                return;
            }
            // Fallback
            el.style.backgroundColor = cover.color || cover.theme || '#fff';
        };

        applyCoverBg(backEl);

        // Back Content
        if (cover.backPhotoId) {
            const photo = assets.photos.find(p => p.id === cover.backPhotoId);
            if (photo) {
                const img = document.createElement('img');
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';

                // Use standard UI sizing for Google Photos (Edge CDN caching)
                if (photo.source === 'google-photos' || (photo.url && photo.url.includes('googleusercontent.com'))) {
                    let targetUrl = photo.rawBaseUrl || photo.url;
                    if (!targetUrl.includes('=')) {
                        targetUrl += '=w1200';
                    } else if (targetUrl.includes('=d')) {
                        targetUrl = targetUrl.replace('=d', '=w1200');
                    }
                    img.src = photo.thumbnailUrl || targetUrl;
                } else {
                    img.src = photo.url;
                }

                backEl.appendChild(img);
            }
        }

        // Selectable
        backEl.dataset.selectableId = 'cover-back-photo';
        backEl.dataset.selectableType = 'cover-back-photo';
        backEl.addEventListener('click', (e) => {
            // Handled by delegated listener in App, but dataset needs to be here
        });

        wrapper.appendChild(backEl);

        // 2. Spine
        const spineEl = document.createElement('div');
        spineEl.className = 'cover-spine';
        spineEl.style.width = '40px';
        spineEl.style.height = '100%';
        spineEl.style.backgroundColor = bgColor;
        spineEl.style.display = 'flex';
        spineEl.style.alignItems = 'center';
        spineEl.style.justifyContent = 'center';
        spineEl.style.boxShadow = 'inset 2px 0 5px rgba(0,0,0,0.2)';

        const spineText = document.createElement('div');
        spineText.textContent = cover.spineText || cover.title;
        spineText.style.writingMode = 'vertical-rl';
        spineText.style.transform = 'rotate(180deg)';
        spineText.style.fontFamily = titleFont;
        spineText.style.fontSize = '14px';
        spineText.style.color = textColor;
        spineEl.appendChild(spineText);
        wrapper.appendChild(spineEl);

        // 3. Front Cover
        const frontEl = document.createElement('div');
        frontEl.className = 'cover-page front-cover';
        frontEl.style.width = '45%';
        frontEl.style.height = '100%';
        applyCoverBg(frontEl); // Use shared helper
        frontEl.style.position = 'relative';
        frontEl.style.boxShadow = '-5px 5px 15px rgba(0,0,0,0.5)';
        frontEl.style.overflow = 'hidden';

        // Select logic for click
        frontEl.addEventListener('click', (e) => {
            e.stopPropagation();
            // For cover, we select the "cover" itself or sub-elements? 
            // Let's rely on specific element clicks, but set base selection
        });

        const layout = cover.layout || 'standard';

        // Render Title/Subtitle
        const titleGroup = document.createElement('div');
        titleGroup.style.position = 'absolute';
        titleGroup.style.zIndex = 10;
        titleGroup.style.textAlign = 'center';
        titleGroup.style.width = '100%';

        const titleEl = document.createElement('h1');
        titleEl.textContent = cover.title;
        titleEl.style.margin = '0';
        titleEl.style.fontFamily = titleFont;
        titleEl.style.color = textColor;
        titleEl.style.fontSize = '2.5rem';
        titleEl.dataset.selectableId = 'cover-title';
        titleEl.dataset.selectableType = 'cover-text';

        const subEl = document.createElement('h3');
        subEl.textContent = cover.subtitle;
        subEl.style.margin = '10px 0 0 0';
        subEl.style.fontFamily = bodyFont;
        subEl.style.color = textColor;
        subEl.style.opacity = '0.85';
        subEl.dataset.selectableId = 'cover-subtitle';
        subEl.dataset.selectableType = 'cover-text';

        titleGroup.appendChild(titleEl);
        titleGroup.appendChild(subEl);

        // Render Photo
        let photoEl = null;
        if (cover.frontPhotoId) {
            const photo = assets.photos.find(p => p.id === cover.frontPhotoId);
            if (photo) {
                photoEl = document.createElement('div');
                photoEl.style.position = 'absolute';
                photoEl.style.backgroundSize = 'cover';
                photoEl.style.backgroundPosition = 'center';
                photoEl.dataset.selectableId = 'cover-photo';
                photoEl.dataset.selectableType = 'cover-photo';

                // Use standard UI sizing for Google Photos (Edge CDN caching)
                if (photo.source === 'google-photos' || (photo.url && photo.url.includes('googleusercontent.com'))) {
                    let targetUrl = photo.rawBaseUrl || photo.url;
                    if (!targetUrl.includes('=')) {
                        targetUrl += '=w1200';
                    } else if (targetUrl.includes('=d')) {
                        targetUrl = targetUrl.replace('=d', '=w1200');
                    }
                    photoEl.style.backgroundImage = `url(${photo.thumbnailUrl || targetUrl})`;
                } else {
                    photoEl.style.backgroundImage = `url(${photo.url})`;
                }
                // Removed local drop listeners to allow bubbling to app.js
                // photoEl.addEventListener('dragover', (e) => e.preventDefault());
                // photoEl.addEventListener('drop', (e) => { ... });
            }
        }

        // Empty Slot Placeholder if no photo
        if (!photoEl) {
            photoEl = document.createElement('div');
            photoEl.className = 'empty-slot';
            photoEl.textContent = 'Drop Cover Photo Here';
            photoEl.style.display = 'flex';
            photoEl.style.alignItems = 'center';
            photoEl.style.justifyContent = 'center';
            photoEl.style.border = '2px dashed #999';
            photoEl.style.color = '#666';
            photoEl.style.position = 'absolute';
            photoEl.dataset.selectableId = 'cover-photo';
            photoEl.dataset.selectableType = 'cover-photo';
        }

        // Layout Logic
        if (layout === 'full-bleed') {
            photoEl.style.inset = '0';
            titleGroup.style.bottom = '10%';
            titleEl.style.color = '#fff';
            subEl.style.color = '#fff';
            titleEl.style.textShadow = '0 2px 4px rgba(0,0,0,0.5)';
            frontEl.appendChild(photoEl);
            frontEl.appendChild(titleGroup);
        } else if (layout === 'photo-bottom') {
            titleGroup.style.top = '10%';
            photoEl.style.bottom = '10%';
            photoEl.style.left = '10%';
            photoEl.style.width = '80%';
            photoEl.style.height = '60%';
            frontEl.appendChild(titleGroup);
            frontEl.appendChild(photoEl);
        } else {
            // Standard
            titleGroup.style.bottom = '10%';
            photoEl.style.top = '10%';
            photoEl.style.left = '10%';
            photoEl.style.width = '80%';
            photoEl.style.height = '60%';
            frontEl.appendChild(photoEl);
            frontEl.appendChild(titleGroup);
        }

        wrapper.appendChild(frontEl);
        this.container.appendChild(wrapper);
    }


}
