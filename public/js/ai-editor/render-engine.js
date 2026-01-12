/**
 * Render Engine
 * Handles rendering the active page to the DOM.
 */

export class RenderEngine {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
    }

    renderPage(page, assets, selectionId = null) {
        console.log('[RenderEngine] renderPage called', page ? page.id : 'null', 'Slots:', page?.layout?.slots?.length);
        if (!page) {
            this.container.innerHTML = '<div class="empty-message">No Page Selected</div>';
            return;
        }

        // Clear container
        this.container.innerHTML = '';

        // Create Page Element
        const pageEl = document.createElement('div');
        pageEl.className = 'shoso-page';
        pageEl.dataset.pageId = page.id;

        // Apply Background based on Theme
        const theme = window.BACKGROUND_TEXTURES?.find(t => t.id === page.background);
        if (theme) {
            if (theme.url.startsWith('http') || theme.url.startsWith('assets')) {
                pageEl.style.backgroundImage = `url('${theme.url}')`;
                pageEl.style.backgroundSize = 'cover';
            } else {
                pageEl.style.backgroundColor = theme.url;
            }
        } else if (page.background && page.background.startsWith('#')) {
            pageEl.style.backgroundColor = page.background;
        }

        // 2. Render Photo Slots
        if (page.layout && page.layout.slots) {
            const pageWidth = this.container.clientWidth;
            const pageHeight = this.container.clientHeight;

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
                    img.src = photo.url;
                    img.style.width = '100%';
                    img.style.height = '100%';
                    img.style.objectFit = 'cover';

                    // console.log('[RenderEngine] Placing photo', photo.id, slot);

                    // Apply Filters (computed in App or raw here)
                    const filterStyle = slot.computedFilter || slot.filter;
                    if (filterStyle && filterStyle !== 'none') {
                        img.style.filter = filterStyle;
                    }

                    // Render Image Frame (if any)
                    // Priority: Slot overrides Page
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
                            svgEl.style.pointerEvents = 'none'; // Click through to photo
                            slotEl.appendChild(svgEl);
                        }
                    }
                    slotEl.appendChild(img);
                } else {
                    console.warn('[RenderEngine] Photo not found for slot', slot.photoId);
                }

                // Selection (Visual Only - handled by CSS)
                if (slot.photoId === selectionId) {
                    slotEl.classList.add('selected');
                    // Add handles visualization if selected
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
                const w = this.container.clientWidth;
                const h = this.container.clientHeight;
                const svgContent = frameDef.svgGen(w, h, frameDef.color); // TODO: Allow override color
                const frameEl = this.createSVG(svgContent, w, h);
                frameEl.className = 'page-frame';
                frameEl.style.position = 'absolute';
                frameEl.style.inset = '0';
                frameEl.style.pointerEvents = 'none';
                frameEl.style.zIndex = 5; // Above photos
                pageEl.appendChild(frameEl);
            }
        }

        // 4. Render Text Elements (Overlay)
        if (page.elements) {
            page.elements.filter(el => el.type === 'text').forEach(textEl => {
                const domEl = document.createElement('div');
                domEl.className = 'page-element text-element';
                domEl.style.position = 'absolute';
                domEl.style.left = `${textEl.x}%`;
                domEl.style.top = `${textEl.y}%`;
                domEl.style.minWidth = '200px'; // Initial width
                domEl.style.maxWidth = `${textEl.width || 50}%`;
                domEl.style.zIndex = 10;

                // Style Application
                const styleDef = window.TEXT_STYLES?.find(s => s.id === textEl.styleId);
                const cssStyle = styleDef ? styleDef.style : {};
                Object.assign(domEl.style, cssStyle);

                // Overrides
                if (textEl.fontSize) domEl.style.fontSize = `${textEl.fontSize}px`;
                if (textEl.color) domEl.style.color = textEl.color;
                if (textEl.fontFamily) domEl.style.fontFamily = textEl.fontFamily;
                if (textEl.textAlign) domEl.style.textAlign = textEl.textAlign;

                domEl.textContent = textEl.content;

                // Selection
                if (textEl.id === selectionId) {
                    domEl.classList.add('selected');
                    domEl.style.border = '2px solid var(--color-primary, #6366f1)';
                }

                domEl.dataset.selectableType = 'text';
                domEl.dataset.selectableId = textEl.id;

                pageEl.appendChild(domEl);
            });
        }

        this.container.appendChild(pageEl);
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

        // Background Logic (Shared)
        const applyCoverBg = (el) => {
            if (cover.theme) {
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
            el.style.backgroundColor = cover.color || '#fff';
        };

        applyCoverBg(backEl);

        // Back Content
        if (cover.backPhotoId) {
            const photo = assets.photos.find(p => p.id === cover.backPhotoId);
            if (photo) {
                const img = document.createElement('img');
                img.src = photo.url;
                img.style.width = '100%';
                img.style.height = '100%';
                img.style.objectFit = 'cover';
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
                photoEl.style.backgroundImage = `url(${photo.url})`;
                photoEl.style.backgroundSize = 'cover';
                photoEl.style.backgroundPosition = 'center';
                photoEl.dataset.selectableId = 'cover-photo';
                photoEl.dataset.selectableType = 'cover-photo';
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
