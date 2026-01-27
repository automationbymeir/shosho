/**
 * BarMitzvahRenderer
 * Specialized renderer for Hebrew Bar Mitzvah template
 */

/* eslint-disable no-unused-vars */

/**
 * TextAlignmentRenderer
 * Handles precise text positioning and RTL logic
 */
class TextAlignmentRenderer {
    constructor(designSystem) {
        this.ds = designSystem;
    }

    /**
     * Calculate CSS for text element alignment
     * @param {Object} textEl - Text element definition from template
     * @returns {Object} - CSS properties object
     */
    getAlignmentCSS(textEl) {
        const css = {
            position: 'absolute',
            top: textEl.position.y,
            direction: 'rtl' // Enforce RTL for all text
        };

        const alignment = textEl.alignment || {};
        const method = alignment.method || '';

        // Prioritize explicit method from JSON if available (simplifies RTL handling)
        if (method.includes('transform: translateX(-50%)')) {
            // Centered
            css.left = '50%';
            css.transform = 'translateX(-50%)';
            css.textAlign = 'center';
        } else if (method.includes('right:')) {
            // Right Aligned
            const rightVal = method.match(/right:\s*([^;]+)/)[1];
            css.right = rightVal;
            css.left = 'auto'; // Reset left
            css.textAlign = 'right';
        } else if (method.includes('left:')) {
            // Left Aligned (rare for Hebrew but supported)
            const leftVal = method.match(/left:\s*([^;]+)/)[1];
            css.left = leftVal;
            css.right = 'auto';
            css.textAlign = 'left';
        } else {
            // Fallback to standard logic if method string not parsed
            if (alignment.horizontal === 'center' || (textEl.style && textEl.style.align === 'center')) {
                css.left = '50%';
                css.transform = 'translateX(-50%)';
                css.textAlign = 'center';
            } else if (alignment.horizontal === 'right' || (textEl.style && textEl.style.align === 'right')) {
                css.right = textEl.position.x || '6%';
                css.left = 'auto';
                css.textAlign = 'right';
            } else {
                // Default to right for Hebrew
                css.right = textEl.position.x || '6%';
                css.left = 'auto';
                css.textAlign = 'right';
            }
        }

        // Handle width for multi-line text
        if (textEl.size && textEl.size.width) {
            css.width = textEl.size.width;
        }

        return css;
    }
}

class BarMitzvahRenderer {
    constructor(templateConfig) {
        this.config = templateConfig || {};
        this.ds = this.config.designSystem || {};

        // Defaults
        this.ds.colors = this.ds.colors || {
            background: '#FAFAFA',
            decorative: { gold: '#C9A227' }
        };
        this.ds.colors.text = this.ds.colors.text || { primary: '#1B365D' };

        this.alignmentRenderer = new TextAlignmentRenderer(this.ds);
    }

    renderPage(pageLayout, photos, textContent, textPositions = {}) {
        const page = document.createElement('div');
        page.className = `album-page bar-mitzvah ${pageLayout.layoutId}`;

        const width = this.ds.canvas ? this.ds.canvas.width : 800;
        const height = this.ds.canvas ? this.ds.canvas.height : 600;

        page.style.cssText = `
            background-color: ${this.ds.colors.background};
            direction: rtl; /* Global RTL */
        `;

        // decorations
        this.renderDecorations(page, pageLayout.decorations);

        // photos
        if (pageLayout.photoSlots) {
            pageLayout.photoSlots.forEach((slot, index) => {
                const photo = photos[index];
                this.renderPhotoSlot(page, slot, photo, index);
            });
        }

        // text
        if (pageLayout.textElements) {
            pageLayout.textElements.forEach(textEl => {
                const content = textContent[textEl.elementId] || textEl.placeholder;
                const customPos = textPositions[textEl.elementId];
                this.renderTextElement(page, textEl, content, customPos);
            });
        }

        return page;
    }

    renderTextElement(page, textEl, content, customPos = null) {
        const element = document.createElement('div');
        element.className = `text-element text-${textEl.type}`;
        element.dataset.selectableType = 'text';
        element.dataset.selectableId = textEl.elementId;
        // Text editing is controlled by app.js double-click handler
        // Start as non-editable to allow dragging
        if (textEl.editable !== false) {
            element.contentEditable = 'false';
            element.setAttribute('spellcheck', 'false');
        }

        const fontKey = textEl.style ? textEl.style.font : 'body';
        const fontConfig = this.ds.typography && this.ds.typography[fontKey] ? this.ds.typography[fontKey] : { family: 'Heebo', fallback: 'sans-serif' };

        const colorKey = textEl.style ? textEl.style.color : 'primary';
        const color = this.resolveColor(colorKey);

        const fontSize = textEl.style ? textEl.style.size : '14px';
        const fontWeight = textEl.style ? textEl.style.weight : 400;

        // Use custom position if available, otherwise use layout position
        const topPos = customPos ? customPos.y : textEl.position.y;
        const leftPos = customPos ? customPos.x : null;

        let styles = `
            position: absolute;
            top: ${topPos};
            font-family: '${fontConfig.family}', ${fontConfig.fallback};
            font-size: ${fontSize};
            font-weight: ${fontWeight};
            color: ${color};
            z-index: 10;
            cursor: grab;
            direction: rtl;
        `;

        const alignCSS = this.alignmentRenderer.getAlignmentCSS(textEl);

        // If custom position exists, use it for left/right instead of alignment
        if (customPos && customPos.x) {
            styles += `left: ${customPos.x};`;
            // Don't set transform or right when using custom position
            if (alignCSS.textAlign) {
                styles += `text-align: ${alignCSS.textAlign};`;
            } else {
                styles += `text-align: right;`; // Default for RTL
            }
            if (alignCSS.width) {
                styles += `width: ${alignCSS.width};`;
            }
        } else {
            // Use alignment system
            // Only add properties that are explicitly defined to avoid "undefined" in CSS
            if (alignCSS.left !== undefined && alignCSS.left !== 'auto') {
                styles += `left: ${alignCSS.left};`;
            } else if (alignCSS.left === 'auto') {
                styles += `left: auto;`;
            }

            if (alignCSS.right !== undefined && alignCSS.right !== 'auto') {
                styles += `right: ${alignCSS.right};`;
            } else if (alignCSS.right === 'auto') {
                styles += `right: auto;`;
            }

            if (alignCSS.transform) {
                styles += `transform: ${alignCSS.transform};`;
            }

            if (alignCSS.textAlign) {
                styles += `text-align: ${alignCSS.textAlign};`;
            } else {
                styles += `text-align: right;`; // Default for RTL
            }

            if (alignCSS.width) {
                styles += `width: ${alignCSS.width};`;
            }
        }

        if (textEl.style) {
            if (textEl.style.letterSpacing) styles += `letter-spacing: ${textEl.style.letterSpacing};`;
            if (textEl.style.lineHeight) styles += `line-height: ${textEl.style.lineHeight};`;
        }

        element.style.cssText = styles;
        element.innerHTML = content ? content.replace(/\n/g, '<br>') : '';

        page.appendChild(element);
    }

    renderPhotoSlot(page, slot, photo, index) {
        const container = document.createElement('div');
        container.className = `photo-slot photo-${slot.photoStyle || 'default'}`;
        container.dataset.slotId = slot.slotId;

        // Make draggable for photo swapping
        container.draggable = true;
        container.dataset.selectableType = 'photo';
        if (photo) {
            container.dataset.selectableId = photo.id || `photo-${index}`;
        }

        const styleName = slot.photoStyle || 'default';
        const styleConfig = this.ds.photoStyles ? this.ds.photoStyles[styleName] : {};
        const borderRadius = styleConfig.borderRadius || '0px';
        const shadow = styleConfig.shadow || 'none';
        const border = styleConfig.border || 'none';

        let containerStyles = `
            position: absolute;
            left: ${slot.position.x};
            top: ${slot.position.y};
            width: ${slot.size.width};
            height: ${slot.size.height};
            overflow: hidden;
            border-radius: ${borderRadius};
            box-shadow: ${shadow};
            border: ${border};
            z-index: ${slot.zIndex || 1};
            background-color: rgba(0,0,0,0.03);
            direction: ltr; /* Reset direction for image container */
            cursor: pointer;
        `;

        if (styleConfig.outerShadow) {
            // If outer shadow is unique, maybe use filter? sticking to box-shadow above.
        }

        container.style.cssText = containerStyles;

        // Add drag event listeners for photo swapping
        if (photo) {
            container.addEventListener('dragstart', (e) => {
                e.stopPropagation();
                e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'slot-swap',
                    photoId: photo.id || `photo-${index}`,
                    slotId: slot.slotId
                }));
                container.style.opacity = '0.5';
            });
            container.addEventListener('dragend', () => {
                container.style.opacity = '1';
            });
        }

        if (photo) {
            const img = document.createElement('img');

            // Priority: thumbnailUrl (Base64) to avoid 403, then url/baseUrl
            const isString = typeof photo === 'string';
            img.src = isString ? photo : (photo.thumbnailUrl || photo.baseUrl || photo.url || photo.src || '');

            img.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: ${slot.photoFit || 'cover'};
                display: block;
            `;

            img.onerror = () => {
                // Try fallback if thumbnail fails
                if (!isString && photo.url && img.src !== photo.url) {
                    img.src = photo.url;
                } else {
                    img.src = 'assets/placeholder-image.png';
                }
            };
            container.appendChild(img);

            const removeBtn = document.createElement('button');
            removeBtn.className = 'btn-remove-slot-photo';
            removeBtn.innerHTML = '×';
            removeBtn.dataset.slotIndex = index;
            removeBtn.style.cssText = `
                position: absolute;
                top: 6px;
                right: 6px;
                width: 24px;
                height: 24px;
                border-radius: 50%;
                background: rgba(0, 0, 0, 0.6);
                color: white;
                border: 1px solid rgba(255,255,255,0.4);
                cursor: pointer;
                z-index: 100;
                display: flex;
                align-items: center;
                justify-content: center;
                opacity: 0;
                transition: opacity 0.2s;
                pointer-events: auto;
            `;
            container.addEventListener('mouseenter', () => removeBtn.style.opacity = '1');
            container.addEventListener('mouseleave', () => removeBtn.style.opacity = '0');
            container.appendChild(removeBtn);
        } else {
            const help = document.createElement('div');
            help.innerText = "+";
            help.style.cssText = "position:absolute; top:50%; left:50%; transform:translate(-50%, -50%); color: #CCC; font-size: 24px; pointer-events: none;";
            container.appendChild(help);
        }

        page.appendChild(container);
    }

    renderDecorations(page, decorations) {
        if (!decorations) return;
        decorations.forEach(dec => {
            if (dec.type === 'goldLine') {
                this.renderGoldLine(page, dec);
            } else if (dec.type === 'starOfDavid') {
                this.renderStarOfDavid(page, dec);
            } else if (dec.type === 'ornament') {
                this.renderOrnament(page, dec);
            }
        });
    }

    renderGoldLine(page, dec) {
        const line = document.createElement('div');
        line.style.cssText = `
            position: absolute;
            left: ${dec.position.x};
            top: ${dec.position.y};
            width: ${dec.size.width};
            height: ${dec.size.height};
            background-color: ${dec.color || this.resolveColor('gold')};
            z-index: 0;
        `;
        page.appendChild(line);
    }

    renderStarOfDavid(page, dec) {
        const star = document.createElement('div');
        // Simple SVG Star of David
        star.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M12 2L15 9H21L16 13L18 20L12 16L6 20L8 13L3 9H9L12 2Z" fill="none" /> 
           <!-- Actually Star of David is two triangles, let's use a simpler unicode or correct path if needed. 
              The path above is a 5-point star. Updating to hexagram... -->
        </svg>`;

        // Correct Magen David SVG
        star.innerHTML = `
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="2">
             <polygon points="50,10 85,75 15,75" stroke="${dec.color || this.resolveColor('gold')}" fill="none" />
             <polygon points="50,90 85,25 15,25" stroke="${dec.color || this.resolveColor('gold')}" fill="none" />
        </svg>
        `;

        star.style.cssText = `
            position: absolute;
            left: ${dec.position.x};
            top: ${dec.position.y};
            width: ${dec.size.width};
            height: ${dec.size.height};
            opacity: ${dec.opacity || 0.15};
            color: ${dec.color || this.resolveColor('gold')};
            transform: translate(-50%, -50%);
            z-index: 0;
        `;
        page.appendChild(star);
    }

    renderOrnament(page, dec) {
        const el = document.createElement('div');
        // Simple diamond ornament
        el.innerHTML = '❖';
        el.style.cssText = `
             position: absolute;
             left: ${dec.position.x};
             top: ${dec.position.y};
             font-size: 24px;
             color: ${this.resolveColor('gold')};
             transform: translate(-50%, -50%);
             opacity: 0.6;
             z-index: 0;
        `;
        page.appendChild(el);
    }

    resolveColor(key) {
        if (!key) return '#000000';
        if (key.startsWith('#')) return key;

        const colors = this.ds.colors;
        if (key === 'primary') return colors.text.primary;
        if (key === 'secondary') return colors.text.secondary;
        if (key === 'gold') return colors.text.gold || '#C9A227';
        if (key === 'light') return colors.text.light;

        return key;
    }

    /**
     * Render cover page using template styling
     * @param {Object} coverState - Cover state object with title, subtitle, frontPhotoId, etc.
     * @param {Object} assets - Assets with photos array
     * @returns {HTMLElement} - Cover DOM element
     */
    renderCover(coverState, assets) {
        // Find cover layout from config
        const coverLayout = this.config.pageLayouts?.find(
            l => l.pageType === 'cover' || l.layoutId === 'cover-elegant' || l.layoutId?.includes('cover')
        );

        if (!coverLayout) {
            // Fallback: Create a styled cover without layout
            return this.createFallbackCover(coverState, assets);
        }

        // Prepare photos for cover
        const coverPhotos = [];
        if (coverState.frontPhotoId && assets?.photos) {
            const photo = assets.photos.find(p => p.id === coverState.frontPhotoId);
            if (photo) coverPhotos.push(photo);
        }

        // Prepare text content for cover
        const textContent = {
            childName: coverState.title || 'דניאל כהן',
            hebrewDate: coverState.subtitle || 'י״ג באדר תשפ״ה',
            barMitzvahLabel: 'בר מצווה',
            gregorianDate: '',
            title: coverState.title || ''
        };

        // Use renderPage with cover layout
        return this.renderPage(coverLayout, coverPhotos, textContent, {});
    }

    /**
     * Create a fallback cover with template styling when no layout is available
     */
    createFallbackCover(coverState, assets) {
        const cover = document.createElement('div');
        cover.className = 'album-cover bar-mitzvah-cover';

        const width = this.ds.canvas?.width || 800;
        const height = this.ds.canvas?.height || 600;

        cover.style.cssText = `
            width: ${width}px;
            height: ${height}px;
            background-color: ${this.ds.colors.background || '#FAFAFA'};
            position: relative;
            overflow: hidden;
            direction: rtl;
            font-family: ${this.ds.fonts?.heading || "'Playfair Display', serif"};
        `;

        // Add decorative border
        const border = document.createElement('div');
        border.style.cssText = `
            position: absolute;
            inset: 20px;
            border: 2px solid ${this.ds.colors.decorative?.gold || '#C9A227'};
            pointer-events: none;
        `;
        cover.appendChild(border);

        // Add cover photo if available
        if (coverState.frontPhotoId && assets?.photos) {
            const photo = assets.photos.find(p => p.id === coverState.frontPhotoId);
            if (photo) {
                const photoContainer = document.createElement('div');
                photoContainer.style.cssText = `
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -60%);
                    width: 50%;
                    height: 50%;
                    border-radius: 8px;
                    overflow: hidden;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
                `;

                const img = document.createElement('img');
                img.src = photo.thumbnailUrl || photo.url;
                img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
                photoContainer.appendChild(img);
                cover.appendChild(photoContainer);
            }
        }

        // Add title text
        const titleEl = document.createElement('div');
        titleEl.style.cssText = `
            position: absolute;
            bottom: 25%;
            left: 50%;
            transform: translateX(-50%);
            text-align: center;
            color: ${this.ds.colors.text?.primary || '#1B365D'};
        `;
        titleEl.innerHTML = `
            <div style="font-size: 14px; color: ${this.ds.colors.decorative?.gold || '#C9A227'}; margin-bottom: 8px;">בר מצווה</div>
            <div style="font-size: 36px; font-weight: 600; margin-bottom: 8px;">${coverState.title || 'דניאל כהן'}</div>
            <div style="font-size: 16px; opacity: 0.7;">${coverState.subtitle || 'י״ג באדר תשפ״ה'}</div>
        `;
        cover.appendChild(titleEl);

        // Add corner decorations
        this.addCornerDecorations(cover);

        return cover;
    }

    /**
     * Add corner decorations to an element
     */
    addCornerDecorations(element) {
        const goldColor = this.ds.colors.decorative?.gold || '#C9A227';
        const corners = ['top-left', 'top-right', 'bottom-left', 'bottom-right'];

        corners.forEach(corner => {
            const deco = document.createElement('div');
            const [vertical, horizontal] = corner.split('-');
            deco.style.cssText = `
                position: absolute;
                ${vertical}: 30px;
                ${horizontal}: 30px;
                width: 40px;
                height: 40px;
                border-${vertical}: 2px solid ${goldColor};
                border-${horizontal}: 2px solid ${goldColor};
            `;
            element.appendChild(deco);
        });
    }
}

if (typeof window !== 'undefined') {
    window.BarMitzvahRenderer = BarMitzvahRenderer;
}

export { BarMitzvahRenderer };
