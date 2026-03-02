/**
 * TravelJourneyRenderer
 * Renders pages according to the Travel Journey template spec
 */
export class TravelJourneyRenderer {
    constructor(templateConfig) {
        this.config = templateConfig;
        this.designSystem = templateConfig.designSystem;
        this.canvas = templateConfig.designSystem.canvas;
    }

    /**
     * Render a single page
     * @param {Object} pageLayout - Layout definition from template
     * @param {Array} photos - Photos assigned to this page
     * @param {Object} textContent - User-provided or AI-generated text
     * @returns {HTMLElement} - Rendered page element
     */
    renderPage(pageLayout, photos, textContent = {}, textPositions = {}) {
        const page = document.createElement('div');
        page.className = 'album-page travel-journey';
        page.style.cssText = `
      background-color: ${this.designSystem.colors.background};
    `;

        // Render photo slots
        if (pageLayout.photoSlots) {
            pageLayout.photoSlots.forEach((slot, index) => {
                const photo = photos[index];
                // Always render slot to allow drag-and-drop
                this.renderPhotoSlot(page, slot, photo, index);
            });
        }

        // Render decorations (overlays, etc.)
        if (pageLayout.decorations) {
            pageLayout.decorations.forEach(decoration => {
                this.renderDecoration(page, decoration);
            });
        }

        // Render text elements
        if (pageLayout.textElements) {
            pageLayout.textElements.forEach(textEl => {
                const content = textContent[textEl.elementId] || textEl.placeholder;
                const customPos = textPositions[textEl.elementId];
                this.renderTextElement(page, textEl, content, customPos);
            });
        }

        return page;
    }

    renderCover(coverState, assets) {
        // Reuse renderPage logic but with cover-specific layout if defined, or custom build
        // Travel Journey Cover: Full bleed photo + Title Overlay

        const page = document.createElement('div');
        page.className = 'album-page travel-journey-cover';
        page.style.cssText = `
            background-color: ${this.designSystem.colors.background || '#fff'};
            display: flex;
            align-items: center;
            justify-content: center;
        `;

        // Background Photo (Full Bleed? Or specific slot?)
        // Design Spec: "Clean, white backgrounds" but cover might be full photo?
        // Let's assume standard cover layout from template JSON or fallback
        // Current fallback logic:

        // 1. Background Photo
        if (coverState.frontPhotoId) {
            const photo = assets.photos.find(p => p.id === coverState.frontPhotoId);
            if (photo) {
                const img = document.createElement('img');
                // Priority: thumbnailUrl (Base64) to avoid 403
                img.src = photo.thumbnailUrl || photo.url || photo.baseUrl;
                img.style.cssText = `
                    position: absolute;
                    top: 0; left: 0;
                    width: 100%; height: 100%;
                    object-fit: cover;
                    z-index: 0;
                    opacity: ${coverState.layout === 'full-bleed' ? 1 : 0.9}; 
                 `;

                img.onerror = () => { img.src = photo.url || 'assets/placeholder-image.png'; };
                page.appendChild(img);
            }
        }

        // 2. Title Overlay
        const titleContainer = document.createElement('div');
        titleContainer.style.cssText = `
            position: absolute;
            z-index: 10;
            text-align: center;
            width: 80%;
            padding: 20px;
            background: rgba(255, 255, 255, 0.85); /* Boxed title for Travel Journey style */
            border: 2px solid ${this.designSystem.colors.accent};
        `;

        const h1 = document.createElement('h1');
        h1.textContent = coverState.title || 'My Journey';
        h1.style.cssText = `
            font-family: 'Playfair Display', serif; /* Or ${this.designSystem.typography.title.family} */
            font-size: 48px;
            color: ${this.designSystem.colors.text.title};
            margin: 0 0 10px 0;
        `;

        const h2 = document.createElement('h2');
        h2.textContent = coverState.subtitle || '2026';
        h2.style.cssText = `
            font-family: 'Lato', sans-serif;
            font-size: 24px;
            color: ${this.designSystem.colors.text.primary};
            margin: 0;
            text-transform: uppercase;
            letter-spacing: 2px;
        `;

        titleContainer.appendChild(h1);
        titleContainer.appendChild(h2);
        page.appendChild(titleContainer);

        return page;
    }

    renderPhotoSlot(page, slot, photo, index) {
        const container = document.createElement('div');
        container.className = 'photo-slot';


        // Make draggable for photo swapping
        container.draggable = true;
        container.dataset.selectableType = 'photo';
        if (photo) {
            container.dataset.selectableId = photo.id || `photo-${index}`;
        }
        container.style.cssText = `
      position: absolute;
      left: ${slot.position.x};
      top: ${slot.position.y};
      width: ${slot.size.width};
      height: ${slot.size.height};
      overflow: hidden;
      cursor: pointer;
    `;

        const img = document.createElement('img');

        // Priority: thumbnailUrl (Base64) to avoid 403, then url/baseUrl
        const isString = typeof photo === 'string';
        img.src = isString ? photo : (photo.thumbnailUrl || photo.baseUrl || photo.url || photo.src || '');

        img.alt = photo.description || '';
        img.style.cssText = `
      width: 100%;
      height: 100%;
      object-fit: ${slot.photoFit || 'cover'};
    `;

        img.onerror = () => {
            // Try fallback if thumbnail fails
            if (!isString && photo.url && img.src !== photo.url) {
                img.src = photo.url;
            } else {
                img.src = 'assets/placeholder-image.png';
            }
        };

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

        const removeBtn = document.createElement('button');
        removeBtn.className = 'btn-remove-slot-photo';
        removeBtn.innerHTML = '×';
        removeBtn.dataset.slotIndex = index;
        removeBtn.title = "Remove photo";
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
            font-size: 16px;
            line-height: 1;
            padding-bottom: 2px;
            opacity: 0;
            transition: opacity 0.2s;
            pointer-events: auto;
        `;

        container.addEventListener('mouseenter', () => removeBtn.style.opacity = '1');
        container.addEventListener('mouseleave', () => removeBtn.style.opacity = '0');


        if (photo) {
            container.appendChild(img);
            if (removeBtn) container.appendChild(removeBtn);
        } else {
            container.classList.add('empty-slot');
            container.dataset.selectableType = 'empty-slot';
            container.dataset.slotIndex = index;

            // Travel Journey Empty Slot Style
            container.style.backgroundColor = 'rgba(0,0,0,0.05)';
            container.style.border = '1px dashed #ccc';
            container.style.display = 'flex';
            container.style.alignItems = 'center';
            container.style.justifyContent = 'center';
            container.innerHTML = '<span style="color:#aaa; font-size: 24px;">+</span>';
        }

        page.appendChild(container);
    }

    renderDecoration(page, decoration) {
        if (decoration.type === 'overlay') {
            const overlay = document.createElement('div');
            overlay.className = 'decoration-overlay';
            overlay.style.cssText = `
        position: absolute;
        left: ${decoration.position.x};
        top: ${decoration.position.y};
        width: ${decoration.size.width};
        height: ${decoration.size.height};
        background-color: ${decoration.style.backgroundColor};
        border-radius: ${decoration.style.borderRadius || '0'};
        z-index: 5;
      `;
            page.appendChild(overlay);
        }
    }

    renderTextElement(page, textEl, content, customPos = null) {
        const element = document.createElement('div');
        element.className = `text-element text-${textEl.type}`;
        // Add interaction hooks
        element.dataset.selectableId = textEl.elementId;
        element.dataset.selectableType = 'text';

        const fontConfig = this.designSystem.typography[textEl.style.font] || this.designSystem.typography.body;
        const color = this.resolveColor(textEl.style.color);
        // Ensure fallbacks
        const fontFamily = fontConfig ? `${fontConfig.family}, ${fontConfig.fallback}` : 'sans-serif';

        element.style.cssText = `
      position: absolute;
      left: ${customPos && customPos.x !== undefined ? customPos.x : textEl.position.x};
      top: ${customPos && customPos.y !== undefined ? customPos.y : textEl.position.y};
      ${textEl.size ? `width: ${textEl.size.width};` : 'width: auto; max-width: 90%;'}
      font-family: ${fontFamily};
      font-size: ${textEl.style.size};
      font-weight: ${textEl.style.weight || 400};
      ${textEl.style.style ? `font-style: ${textEl.style.style};` : ''}
      color: ${color};
      text-align: ${textEl.style.align || 'left'};
      ${textEl.style.lineHeight ? `line-height: ${textEl.style.lineHeight};` : ''}
      ${textEl.style.textShadow ? `text-shadow: ${textEl.style.textShadow};` : ''}
      z-index: 10;
      cursor: pointer;
      pointer-events: auto;
      overflow: hidden;
      word-break: break-word;
      overflow-wrap: break-word;
      box-sizing: border-box;
    `;

        // Transform handling
        let transformX = '0';
        let transformY = '0';
        if (textEl.style.align === 'center') transformX = '-50%';
        if (textEl.position.y === '50%' || textEl.type === 'title') transformY = '-50%'; // Heuristic
        // Override if simple logic
        // Usually center alignment implies center anchor

        if (transformX !== '0' || transformY !== '0') {
            element.style.transform = `translate(${transformX}, ${transformY})`;
        }

        element.textContent = content;

        // Selection Frame
        const frame = document.createElement('div');
        frame.className = 'selection-frame';
        frame.style.cssText = `
        position: absolute;
        top: -4px; right: -4px; bottom: -4px; left: -4px;
        border: 2px solid #398458; /* Theme accent */
        display: none;
        pointer-events: none;
    `;
        element.appendChild(frame);

        page.appendChild(element);
    }

    resolveColor(colorKey) {
        const colors = this.designSystem.colors;
        if (!colorKey) return colors.text.primary;
        if (colorKey === 'primary') return colors.text.primary;
        if (colorKey === 'title') return colors.text.title;
        if (colorKey === 'light') return colors.text.light;
        // Check if it's a hex
        if (colorKey.startsWith('#') || colorKey.startsWith('rgb')) return colorKey;
        return colors.text.primary;
    }
}
