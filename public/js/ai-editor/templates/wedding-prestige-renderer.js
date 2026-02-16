/**
 * WeddingPrestigeRenderer
 * Specialized renderer for "Nitzach - Eternity" Wedding Template
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

        // Prioritize explicit method from JSON if available
        if (method.includes('transform: translateX(-50%)')) {
            // Centered
            css.left = '50%';
            css.transform = 'translateX(-50%)';
            css.textAlign = 'center';
        } else if (method.includes('right:') || (alignment.horizontal === 'right')) {
            // Right Aligned
            const rightVal = method.match(/right:\s*([^;]+)/) ? method.match(/right:\s*([^;]+)/)[1] : textEl.position.x;
            css.right = rightVal;
            css.left = 'auto'; // Reset left
            css.textAlign = 'right';
        } else if (method.includes('left:') || (alignment.horizontal === 'left')) {
            // Left Aligned
            const leftVal = method.match(/left:\s*([^;]+)/) ? method.match(/left:\s*([^;]+)/)[1] : textEl.position.x;
            css.left = leftVal;
            css.right = 'auto';
            css.textAlign = 'left';
        } else {
            // Fallback
            if (alignment.horizontal === 'center') {
                css.left = '50%';
                css.transform = 'translateX(-50%)';
                css.textAlign = 'center';
            } else {
                // Default to right for Hebrew
                css.right = textEl.position.x || '6%';
                css.left = 'auto';
                css.textAlign = 'right';
            }
        }

        // Handle width
        if (textEl.size && textEl.size.width) {
            css.width = textEl.size.width;
        }

        return css;
    }
}

class WeddingPrestigeRenderer {
    constructor(templateConfig) {
        this.config = templateConfig || {};
        this.ds = this.config.designSystem || {};

        // Defaults if missing
        this.ds.colors = this.ds.colors || {
            background: '#0D0D0D',
            decorative: { gold: '#C9A962' },
            text: { primary: '#FDFCFA' }
        };

        this.alignmentRenderer = new TextAlignmentRenderer(this.ds);
    }

    renderPage(pageLayout, photos, textContent, textPositions = {}) {
        const page = document.createElement('div');
        // Add template ID class for scoped CSS
        page.className = `album-page wedding-prestige ${pageLayout.layoutId || ''} ${pageLayout.backgroundType || ''}`;

        // Add specific layout class from JSON if layoutId is camelCase/kebab-case
        // The CSS expects classes like 'cover', 'intro', 'split', etc.
        // We can try to derive 'cover' from 'cover-dramatic'
        if (pageLayout.layoutId) {
            const parts = pageLayout.layoutId.split('-');
            if (parts.length > 0) page.classList.add(parts[0]); // e.g. 'cover', 'intro'
            if (parts.length > 1) page.classList.add(parts[1]); // e.g. 'dramatic', 'intro'
        }

        page.style.cssText = `
            background-color: ${this.ds.colors.background};
            direction: rtl;
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
                const content = textContent[textEl.elementId] || textEl.placeholder || textEl.content;
                const customPos = textPositions[textEl.elementId];
                this.renderTextElement(page, textEl, content, customPos);
            });
        }

        return page;
    }

    renderTextElement(page, textEl, content, customPos = null) {
        const element = document.createElement('div');

        // Construct classes
        let classes = ['text-element'];
        if (textEl.style && textEl.style.font) {
            classes.push(`text-${textEl.style.font}`);
        }
        if (textEl.elementId) {
            // Convert camelCase to kebab-case for CSS targeting (e.g. groomName -> groom-name)
            const kebabId = textEl.elementId.replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, '$1-$2').toLowerCase();
            classes.push(kebabId);
        }

        element.className = classes.join(' ');
        element.dataset.selectableType = 'text';
        element.dataset.selectableId = textEl.elementId;

        if (textEl.editable !== false) {
            element.contentEditable = 'false';
            element.setAttribute('spellcheck', 'false');
        }

        // Resolve Color
        const colorKey = textEl.style ? textEl.style.color : 'primary';
        const color = this.resolveColor(colorKey);

        const fontSize = textEl.style ? textEl.style.size : '14px';
        const fontWeight = textEl.style ? textEl.style.weight : 400;
        const letterSpacing = textEl.style ? textEl.style.letterSpacing : 'normal';

        // Use custom position if available, otherwise use layout position
        const topPos = customPos ? customPos.y : textEl.position.y;

        let styles = `
            position: absolute;
            top: ${topPos};
            font-size: ${fontSize};
            font-weight: ${fontWeight};
            color: ${color};
            letter-spacing: ${letterSpacing};
            z-index: 20;
            cursor: grab;
        `;

        const alignCSS = this.alignmentRenderer.getAlignmentCSS(textEl);

        // If custom position exists
        if (customPos && customPos.x) {
            styles += `left: ${customPos.x};`;
            styles += `text-align: ${alignCSS.textAlign || 'right'};`;
            if (alignCSS.width) styles += `width: ${alignCSS.width};`;
        } else {
            // Alignment System
            if (alignCSS.left !== undefined) styles += `left: ${alignCSS.left};`;
            if (alignCSS.right !== undefined) styles += `right: ${alignCSS.right};`;
            if (alignCSS.transform) styles += `transform: ${alignCSS.transform};`;
            if (alignCSS.textAlign) styles += `text-align: ${alignCSS.textAlign};`;
            if (alignCSS.width) styles += `width: ${alignCSS.width};`;
        }

        if (textEl.style) {
            if (textEl.style.lineHeight) styles += `line-height: ${textEl.style.lineHeight};`;
            if (textEl.style.textShadow) styles += `text-shadow: ${textEl.style.textShadow};`;
            if (textEl.style.opacity) styles += `opacity: ${textEl.style.opacity};`;
            if (textEl.style.fontStyle) styles += `font-style: ${textEl.style.fontStyle};`;
        }

        element.style.cssText = styles;
        element.innerHTML = content ? content.replace(/\n/g, '<br>') : '';

        page.appendChild(element);
    }

    renderPhotoSlot(page, slot, photo, index) {
        const container = document.createElement('div');
        // Classes for CSS styling
        const classes = ['photo', 'photo-slot'];
        if (slot.photoStyle) classes.push(slot.photoStyle);
        if (slot.slotId) classes.push(slot.slotId); // e.g. photo-1, photo-hero

        container.className = classes.join(' ');
        container.dataset.slotId = slot.slotId;
        container.dataset.selectableType = 'photo';
        if (photo) {
            container.dataset.selectableId = photo.id || `photo-${index}`;
        }

        // Inline Styles from JSON
        let containerStyles = `
            position: absolute;
            left: ${slot.position.x};
            top: ${slot.position.y};
            width: ${slot.size.width};
            height: ${slot.size.height};
            z-index: 10;
        `;

        // Apply clip-path if in definitions
        const styleDef = this.ds.photoStyles && slot.photoStyle ? this.ds.photoStyles[slot.photoStyle] : null;
        if (styleDef) {
            if (styleDef.clipPath) containerStyles += `clip-path: ${styleDef.clipPath};`;
            // Border radius handled by CSS usually, but JSON has it too
            if (styleDef.borderRadius) containerStyles += `border-radius: ${styleDef.borderRadius};`;
            if (styleDef.border && styleDef.border !== 'none') containerStyles += `border: ${styleDef.border};`;
            if (styleDef.shadow && styleDef.shadow !== 'none') containerStyles += `box-shadow: ${styleDef.shadow};`;
        }

        container.style.cssText = containerStyles;

        if (photo) {
            const img = document.createElement('img');
            const isString = typeof photo === 'string';
            img.src = isString ? photo : (photo.thumbnailUrl || photo.baseUrl || photo.url);

            img.style.cssText = `
                width: 100%;
                height: 100%;
                object-fit: ${slot.photoFit || 'cover'};
                display: block;
            `;
            container.appendChild(img);
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
        } else {
            // Placeholder
            container.classList.add('empty-slot');
            container.dataset.selectableType = 'empty-slot';
            container.dataset.slotIndex = index;

            container.style.backgroundColor = '#222';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.innerHTML = '<span style="color:#444; font-size: 24px;">+</span>';
        }

        page.appendChild(container);
    }

    renderDecorations(page, decorations) {
        if (!decorations) return;
        decorations.forEach(dec => {
            if (dec.type === 'goldLine') {
                const line = document.createElement('div');
                line.className = 'gold-line';
                line.style.left = dec.position.x;
                line.style.top = dec.position.y;
                line.style.width = dec.size.width;
                line.style.height = dec.size.height;
                page.appendChild(line);
            } else if (dec.type === 'verticalLine') {
                const line = document.createElement('div');
                line.className = 'vertical-line';
                line.style.left = dec.position.x;
                line.style.top = dec.position.y;
                line.style.width = dec.size.width;
                line.style.height = dec.size.height;
                page.appendChild(line);
            } else if (dec.type === 'filmStrip') {
                const strip = document.createElement('div');
                strip.className = 'film-strip';
                strip.style.left = dec.position.x;
                strip.style.top = dec.position.y;
                strip.style.width = dec.size.width;
                strip.style.height = dec.size.height;
                page.appendChild(strip);
            }
        });
    }

    resolveColor(key) {
        if (!key) return '#FFFFFF';
        if (key.startsWith('#')) return key;

        const colors = this.ds.colors;
        if (key === 'primary') return colors.text.primary;
        if (key === 'secondary') return colors.text.secondary;
        if (key === 'gold') return colors.text.gold || '#C9A227';
        if (key === 'dark') return colors.text.dark || '#0D0D0D';
        if (key === 'darkSecondary') return colors.text.darkSecondary;
        if (key === 'light') return '#FDFCFA';

        return key;
    }
}

if (typeof window !== 'undefined') {
    window.WeddingPrestigeRenderer = WeddingPrestigeRenderer;
}

export { WeddingPrestigeRenderer };
