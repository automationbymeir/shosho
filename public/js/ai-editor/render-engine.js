/**
 * Render Engine
 * Handles rendering the active page to the DOM.
 */

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
        pageEl.dataset.pageId = page.id;
        pageEl.style.width = '100%';
        pageEl.style.height = '100%';
        pageEl.style.position = 'relative';
        pageEl.style.overflow = 'hidden';

        // Apply Background based on Theme
        const theme = window.BACKGROUND_TEXTURES?.find(t => t.id === page.background);
        if (theme) {
            if (theme.url.startsWith('http') || theme.url.startsWith('assets')) {
                pageEl.style.backgroundImage = `url('${theme.url}')`;
                pageEl.style.backgroundSize = 'cover';
            } else {
                pageEl.style.backgroundColor = theme.url;
            }
        } else if (typeof page.background === 'object' && page.background.imageUrl) {
            // Magic Create V2 Generated Background Object
            pageEl.style.backgroundImage = `url('${page.background.imageUrl}')`;
            pageEl.style.backgroundSize = 'cover';
        } else if (typeof page.background === 'string' && (page.background.startsWith('http') || page.background.startsWith('data:'))) {
            // Direct URL
            pageEl.style.backgroundImage = `url('${page.background}')`;
            pageEl.style.backgroundSize = 'cover';
        } else if (typeof page.background === 'string' && page.background.startsWith('#')) {
            // Solid Color
            pageEl.style.backgroundColor = page.background;
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
                const photo = assets.photos.find(p => p.id === slot.photoId);
                if (photo) {
                    const img = document.createElement('img');

                    // --- HIGH RESOLUTION LOGIC ---
                    // Force high-res for Google Photos if available
                    // Priority: 1. highResUrl (explicit), 2. rawBaseUrl (google), 3. url (standard), 4. thumbnail
                    let src = photo.highResUrl || photo.rawBaseUrl || photo.url || photo.thumbnailUrl;

                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';

                    // Google Photos - Use backend proxy to avoid 403 errors
                    if (photo.source === 'google-photos' || (src && src.includes('googleusercontent.com'))) {
                        // Show thumbnail immediately while loading high-res via proxy
                        if (photo.thumbnailUrl) {
                            img.src = photo.thumbnailUrl;
                        }

                        // Fetch high-res via backend proxy
                        import('./google-photos-service.js?v=forceNew6').then(({ googlePhotosService }) => {
                            // Prepare high-res URL
                            let targetUrl = photo.rawBaseUrl || photo.url;
                            if (targetUrl.includes('=w') || targetUrl.includes('=h') || targetUrl.includes('=s')) {
                                targetUrl = targetUrl.split('=')[0] + '=d';
                            } else if (!targetUrl.includes('=d')) {
                                targetUrl = `${targetUrl}=d`;
                            }

                            googlePhotosService.fetchHighResImage(targetUrl)
                                .then(dataUri => {
                                    img.src = dataUri;
                                })
                                .catch(err => {
                                    console.warn('[RenderEngine] Proxy fetch failed:', err);
                                    // Keep thumbnail if proxy fails
                                    if (!photo.thumbnailUrl) {
                                        img.src = 'assets/placeholder-image.png';
                                    }
                                });
                        });
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
                    domEl.style.width = `${el.width}%`;
                    domEl.style.height = `${el.height}%`;
                    domEl.style.backgroundColor = el.color;
                }

                if (el.id === selectionId) {
                    domEl.classList.add('selected');
                    domEl.style.border = '2px solid var(--color-primary, #6366f1)';
                }

                pageEl.appendChild(domEl);
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

    renderCover(cover, assets) {
        this.container.innerHTML = '';
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

                // Use proxy for Google Photos
                if (photo.source === 'google-photos' || (photo.url && photo.url.includes('googleusercontent.com'))) {
                    if (photo.thumbnailUrl) {
                        img.src = photo.thumbnailUrl;
                    }
                    import('./google-photos-service.js?v=forceNew6').then(({ googlePhotosService }) => {
                        let targetUrl = photo.rawBaseUrl || photo.url;
                        if (targetUrl.includes('=w') || targetUrl.includes('=h') || targetUrl.includes('=s')) {
                            targetUrl = targetUrl.split('=')[0] + '=d';
                        } else if (!targetUrl.includes('=d')) {
                            targetUrl = `${targetUrl}=d`;
                        }
                        googlePhotosService.fetchHighResImage(targetUrl)
                            .then(dataUri => { img.src = dataUri; })
                            .catch(err => console.warn('[RenderEngine] Cover back photo proxy failed:', err));
                    });
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
        spineEl.style.backgroundColor = cover.color || '#ddd';
        spineEl.style.display = 'flex';
        spineEl.style.alignItems = 'center';
        spineEl.style.justifyContent = 'center';
        spineEl.style.boxShadow = 'inset 2px 0 5px rgba(0,0,0,0.2)';

        const spineText = document.createElement('div');
        spineText.textContent = cover.spineText || cover.title;
        spineText.style.writingMode = 'vertical-rl';
        spineText.style.transform = 'rotate(180deg)';
        spineText.style.fontFamily = 'var(--font-serif)';
        spineText.style.fontSize = '14px';
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
        titleEl.style.fontFamily = 'Playfair Display, serif'; // Hardcoded for now, should come from theme
        titleEl.style.color = cover.textColor || '#000';
        titleEl.dataset.selectableId = 'cover-title';
        titleEl.dataset.selectableType = 'cover-text';

        const subEl = document.createElement('h3');
        subEl.textContent = cover.subtitle;
        subEl.style.margin = '10px 0 0 0';
        subEl.style.fontFamily = 'Montserrat, sans-serif';
        subEl.style.color = cover.textColor || '#000';
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

                // Use proxy for Google Photos
                if (photo.source === 'google-photos' || (photo.url && photo.url.includes('googleusercontent.com'))) {
                    if (photo.thumbnailUrl) {
                        photoEl.style.backgroundImage = `url(${photo.thumbnailUrl})`;
                    }
                    import('./google-photos-service.js?v=forceNew6').then(({ googlePhotosService }) => {
                        let targetUrl = photo.rawBaseUrl || photo.url;
                        if (targetUrl.includes('=w') || targetUrl.includes('=h') || targetUrl.includes('=s')) {
                            targetUrl = targetUrl.split('=')[0] + '=d';
                        } else if (!targetUrl.includes('=d')) {
                            targetUrl = `${targetUrl}=d`;
                        }
                        googlePhotosService.fetchHighResImage(targetUrl)
                            .then(dataUri => { photoEl.style.backgroundImage = `url(${dataUri})`; })
                            .catch(err => console.warn('[RenderEngine] Cover front photo proxy failed:', err));
                    });
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
