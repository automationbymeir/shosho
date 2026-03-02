/**
 * Unified Cover Renderer
 * =====================
 * SINGLE SOURCE OF TRUTH for cover page rendering.
 * 
 * This module handles ALL cover rendering:
 * - Main canvas (editor mode)
 * - Preview mode (flipbook and 3D)
 * - PDF export
 * - Timeline thumbnails
 * 
 * All other cover rendering methods should be REMOVED and replaced with calls to this module.
 */

export class UnifiedCoverRenderer {
    /**
     * Available cover layout options
     */
    static LAYOUTS = [
        { id: 'standard', label: 'רגיל', description: 'תמונה למעלה, טקסט למטה' },
        { id: 'full-bleed', label: 'תמונה מלאה', description: 'התמונה ממלאת את כל הכריכה' },
        { id: 'photo-bottom', label: 'תמונה למטה', description: 'טקסט למעלה, תמונה למטה' },
        { id: 'centered', label: 'ממורכז', description: 'תמונה ממורכזת עם שכבת טקסט מעל' },
        { id: 'minimal', label: 'מינימליסטי', description: 'טקסט בלבד, ללא תמונה' },
        { id: 'split', label: 'מפוצל', description: 'תמונה משמאל, טקסט מימין' },
        { id: 'elegant', label: 'אלגנטי', description: 'עיטורי גבול על תוכן ממורכז' }
    ];

    /**
     * Available font options for cover
     */
    static FONTS = [
        { id: 'playfair', family: "'Playfair Display', serif", label: 'Playfair Display' },
        { id: 'montserrat', family: "'Montserrat', sans-serif", label: 'Montserrat' },
        { id: 'roboto', family: "'Roboto', sans-serif", label: 'Roboto' },
        { id: 'lato', family: "'Lato', sans-serif", label: 'Lato' },
        { id: 'opensans', family: "'Open Sans', sans-serif", label: 'Open Sans' },
        { id: 'cormorant', family: "'Cormorant Garamond', serif", label: 'Cormorant Garamond' },
        { id: 'dancing', family: "'Dancing Script', cursive", label: 'Dancing Script' },
        { id: 'great-vibes', family: "'Great Vibes', cursive", label: 'Great Vibes' },
        { id: 'cinzel', family: "'Cinzel', serif", label: 'Cinzel' },
        { id: 'raleway', family: "'Raleway', sans-serif", label: 'Raleway' },
        // Hebrew Fonts
        { id: 'heebo', family: "'Heebo', sans-serif", label: 'Heebo (היבו)' },
        { id: 'frankruhl', family: "'Frank Ruhl Libre', serif", label: 'Frank Ruhl Libre (פרנק ריהל)' },
        { id: 'rubik', family: "'Rubik', sans-serif", label: 'Rubik (רוביק)' },
        { id: 'varela', family: "'Varela Round', sans-serif", label: 'Varela Round (ורלה)' },
        { id: 'aleo', family: "'Aleo', serif", label: 'Aleo (אלאו)' },
        { id: 'caveat', family: "'Caveat', cursive", label: 'Caveat (כתב יד)' },
        { id: 'gveret-levin', family: "'Gveret Levin', cursive", label: 'Gveret Levin (גברת לוין)' },
        { id: 'playpen-hebrew', family: "'Playpen Sans Hebrew', cursive", label: 'Playpen Sans Hebrew (פלייפן)' },
        { id: 'amatic-sc', family: "'Amatic SC', cursive", label: 'Amatic SC (אמטיק)' },
        { id: 'fredoka', family: "'Fredoka', sans-serif", label: 'Fredoka (פרדוקה)' }
    ];

    /**
     * Template-specific default cover settings
     */
    static TEMPLATE_DEFAULTS = {
        'romantic-journey-v1': {
            title: 'Our Love Story',
            subtitle: '2024',
            spineText: 'Our Love Story',
            layout: 'elegant',
            titleFont: "'Playfair Display', serif",
            bodyFont: "'Montserrat', sans-serif",
            bgColor: '#1a1a2e',
            textColor: '#C9A227'
        },
        'travel-journey-v1': {
            title: 'Travel Adventures',
            subtitle: 'Memories & Journeys',
            spineText: 'Travel Memories',
            layout: 'full-bleed',
            titleFont: "'Montserrat', sans-serif",
            bodyFont: "'Open Sans', sans-serif",
            bgColor: '#2d3436',
            textColor: '#ffffff'
        },
        'bar-mitzvah-v1': {
            title: 'בר מצווה',
            subtitle: 'מזל טוב',
            spineText: 'Bar Mitzvah',
            layout: 'elegant',
            titleFont: "'Cinzel', serif",
            bodyFont: "'Montserrat', sans-serif",
            bgColor: '#1a1a2e',
            textColor: '#C9A227'
        },
        'wedding-prestige-hebrew-v1': {
            title: 'החתונה שלנו',
            subtitle: 'נצח',
            spineText: 'חתונה',
            layout: 'custom',
            titleFont: "'Frank Ruhl Libre', serif",
            bodyFont: "'Heebo', sans-serif",
            bgColor: '#0D0D0D',
            textColor: '#C9A962'
        },
        'family-roots-v1': {
            title: 'Our Family',
            subtitle: 'Generations of Love',
            spineText: 'Family Album',
            layout: 'standard',
            titleFont: "'Cormorant Garamond', serif",
            bodyFont: "'Lato', sans-serif",
            bgColor: '#f5f0eb',
            textColor: '#4a3728'
        },
        'photography-portfolio-v1': {
            title: 'Portfolio',
            subtitle: 'Selected Works',
            spineText: 'Portfolio',
            layout: 'minimal',
            titleFont: "'Raleway', sans-serif",
            bodyFont: "'Open Sans', sans-serif",
            bgColor: '#ffffff',
            textColor: '#1a1a1a'
        },
        'default': {
            title: 'My Photo Book',
            subtitle: new Date().getFullYear().toString(),
            spineText: 'Photo Book',
            layout: 'standard',
            titleFont: "'Playfair Display', serif",
            bodyFont: "'Montserrat', sans-serif",
            bgColor: '#ffffff',
            textColor: '#000000'
        },
        'cover': {
            title: 'My Photo Book',
            subtitle: new Date().getFullYear().toString(),
            spineText: 'My Photo Book',
            layout: 'standard',
            titleFont: "'Playfair Display', serif",
            bodyFont: "'Montserrat', sans-serif",
            bgColor: '#f5f0eb',
            textColor: '#333333'
        },
        'magic-page-v4': {
            title: 'My Photo Book',
            subtitle: new Date().getFullYear().toString(),
            spineText: 'My Photo Book',
            layout: 'standard',
            titleFont: "'Playfair Display', serif",
            bodyFont: "'Montserrat', sans-serif",
            bgColor: '#f5f0eb',
            textColor: '#333333'
        }
    };

    /**
     * Get template defaults
     */
    static getTemplateDefaults(templateId) {
        return this.TEMPLATE_DEFAULTS[templateId] || this.TEMPLATE_DEFAULTS['default'];
    }

    /**
     * Render a cover page
     * @param {Object} options - Rendering options
     * @param {Object} options.cover - Cover state from store
     * @param {Object} options.assets - Assets including photos
     * @param {Object} options.templateConfig - Template configuration (optional)
     * @param {HTMLElement} options.container - Container to render into
     * @param {boolean} options.interactive - Whether to add interactive elements (drag/drop)
     * @param {boolean} options.thumbnail - Whether this is a thumbnail render (simplified)
     * @returns {HTMLElement} - The rendered cover element
     */
    static render(options) {
        const { cover, assets, templateConfig, container, interactive = false, thumbnail = false } = options;

        // DEEP DIAGNOSTIC: What does the cover object actually look like?
        console.log('[UnifiedCoverRenderer] render() ENTRY - cover received:', JSON.stringify({
            background: cover?.background,
            theme: cover?.theme,
            title: cover?.title,
            templateId: cover?.templateId,
            id: cover?.id,
            keys: cover ? Object.keys(cover) : 'null'
        }));

        if (!cover) {
            const empty = document.createElement('div');
            empty.style.cssText = 'display:flex;align-items:center;justify-content:center;height:100%;color:#666;';
            empty.textContent = 'No Cover';
            if (container) {
                container.innerHTML = '';
                container.appendChild(empty);
            }
            return empty;
        }

        // Get template ID and defaults
        const templateId = cover.templateId || templateConfig?.templateId;
        const defaults = this.getTemplateDefaults(templateId);

        // Extract design system from template config (if available)
        const ds = templateConfig?.designSystem || {};
        const colors = ds.colors || {};
        const typography = ds.typography || {};

        // Determine styling with priority: user custom > template config > template defaults
        const bgColor = cover._userCustomColor
            ? cover.color
            : (colors.background || cover.color || defaults.bgColor);

        const textColor = cover._userCustomTextColor
            ? cover.textColor
            : (colors.text?.primary || cover.textColor || defaults.textColor);

        const accentColor = colors.decorative?.gold || colors.accent || '#C9A227';

        // Font selection: user custom > template typography > template defaults
        const titleFont = cover._userCustomTitleFont
            ? cover.titleFont
            : (typography.title?.family || typography.heading?.family || defaults.titleFont);

        const bodyFont = cover._userCustomBodyFont
            ? cover.bodyFont
            : (typography.body?.family || defaults.bodyFont);

        // Resolve background texture from cover.background (AI-set texture ID)
        let bgTextureUrl = null;
        // Check cover.background, cover.theme, then fallback to window._magicCover
        const magicFallback = window._magicCover || {};
        const bgId = typeof cover.background === 'string' ? cover.background
            : (cover.background?.textureId || cover.theme ||
                magicFallback.background || magicFallback.theme || null);
        if (bgId && window.BACKGROUND_TEXTURES) {
            const tex = window.BACKGROUND_TEXTURES.find(t => t.id === bgId);
            if (tex && tex.url) {
                bgTextureUrl = tex.url;
                console.log('[UnifiedCoverRenderer] Resolved texture:', bgId, '→ URL length:', tex.url.length);
            } else {
                console.warn('[UnifiedCoverRenderer] Texture NOT FOUND for ID:', bgId, 'Available:', window.BACKGROUND_TEXTURES.length);
            }
        } else {
            console.log('[UnifiedCoverRenderer] No background ID to resolve. cover.background:', cover.background, 'cover.theme:', cover.theme, 'magicFallback:', magicFallback.background);
        }

        // Use cover values with template defaults as fallback
        const title = cover.title || defaults.title;
        const subtitle = cover.subtitle || defaults.subtitle;
        const spineText = cover.spineText || cover.title || defaults.spineText;
        const layout = cover.layout || defaults.layout;

        // For thumbnails, render a simplified version
        if (thumbnail) {
            return this.renderThumbnail({ ...cover, title, subtitle, spineText }, assets, { bgColor, textColor, titleFont });
        }

        // Create the main cover wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'unified-cover-wrapper album-page'; // Add album-page class for shared styles

        // Use dimensions from config or default to 800x600 (Standard Landscape)
        // This ensures the cover matches the scale of inner pages
        const width = templateConfig?.designSystem?.canvas?.width || 800;
        const height = templateConfig?.designSystem?.canvas?.height || 600;

        wrapper.style.cssText = `
            display: flex;
            width: ${width}px;
            height: ${height}px;
            padding: 0; /* Remove padding from wrapper, let internal sections handle it */
            gap: 0; /* Remove gap, spine handles spacing */
            justify-content: center;
            align-items: center;
            background-color: transparent; /* Background handled by sections */
            box-sizing: border-box;
            margin: auto; /* Center in container */
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5); /* Match .album-page shadow */
        `;

        // 1. Back Cover
        const backCover = this.createBackCover(cover, assets, { bgColor, textColor, interactive, bgTextureUrl });
        wrapper.appendChild(backCover);

        // 2. Spine
        const spine = this.createSpine({ ...cover, spineText }, { bgColor, textColor, titleFont, bgTextureUrl });
        wrapper.appendChild(spine);

        // 3. Front Cover
        const frontCover = this.createFrontCover(
            { ...cover, title, subtitle, layout },
            assets,
            { bgColor, textColor, titleFont, bodyFont, accentColor, interactive, layout, bgTextureUrl }
        );
        wrapper.appendChild(frontCover);

        // Insert into container if provided
        if (container) {
            container.innerHTML = '';
            container.appendChild(wrapper);
        }

        return wrapper;
    }

    /**
     * Create back cover element
     */
    static createBackCover(cover, assets, { bgColor, textColor, interactive, bgTextureUrl }) {
        const backEl = document.createElement('div');
        backEl.className = 'cover-section back-cover';
        backEl.style.cssText = `
            flex: 1;
            height: 100%;
            position: relative;
            background-color: ${bgColor};
            box-shadow: 3px 3px 10px rgba(0,0,0,0.4);
            border-radius: 2px 0 0 2px;
            overflow: hidden;
        `;
        // Apply texture background if available
        if (bgTextureUrl) {
            backEl.style.backgroundImage = `url('${bgTextureUrl}')`;
            backEl.style.backgroundSize = 'cover';
            backEl.style.backgroundPosition = 'center';
        }

        // Add photo if exists
        if (cover.backPhotoId && assets?.photos) {
            const photo = assets.photos.find(p => p.id === cover.backPhotoId);
            if (photo) {
                const img = document.createElement('img');
                img.src = photo.thumbnailUrl || photo.url;
                const backCrop = cover.backCrop || {};
                const backPanX = backCrop.panX !== undefined ? backCrop.panX : 50;
                const backPanY = backCrop.panY !== undefined ? backCrop.panY : 50;
                img.style.cssText = `width:100%;height:100%;object-fit:cover;object-position:${backPanX}% ${backPanY}%;`;
                img.onerror = () => { img.src = 'assets/placeholder-image.png'; };
                backEl.appendChild(img);
            }
        } else if (interactive) {
            // Show empty placeholder for back cover
            const placeholder = document.createElement('div');
            placeholder.style.cssText = `
                width: 100%; height: 100%;
                display: flex; align-items: center; justify-content: center;
                border: 2px dashed rgba(128,128,128,0.3);
                color: rgba(128,128,128,0.5);
                font-size: 13px;
                direction: rtl;
            `;
            placeholder.textContent = 'גרור תמונה לכריכה האחורית';
            backEl.appendChild(placeholder);
        }

        if (interactive) {
            backEl.dataset.selectableId = 'cover-back-photo';
            backEl.dataset.selectableType = 'cover-photo';
            // IMPORTANT: Do NOT apply textPositions to structural cover sections.
            // The back cover must stay in its flex position — it's not a draggable element.
        }

        return backEl;
    }

    /**
     * Create spine element
     */
    static createSpine(cover, { bgColor, textColor, titleFont, bgTextureUrl }) {
        const spineEl = document.createElement('div');
        spineEl.className = 'cover-section spine';
        spineEl.style.cssText = `
            width: 30px;
            height: 100%;
            background-color: ${bgColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: inset 2px 0 5px rgba(0,0,0,0.2);
        `;
        if (bgTextureUrl) {
            spineEl.style.backgroundImage = `url('${bgTextureUrl}')`;
            spineEl.style.backgroundSize = 'cover';
            spineEl.style.backgroundPosition = 'center';
        }

        const spineTextEl = document.createElement('div');
        const spineContent = cover.spineText || cover.title || '';
        spineTextEl.textContent = spineContent;
        spineTextEl.style.cssText = `
            writing-mode: vertical-rl;
            transform: rotate(180deg);
            font-family: ${titleFont};
            font-size: 12px;
            color: ${textColor};
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-height: 90%;
        `;
        // Hebrew spine text: use Hebrew font
        const _heRegex = /[\u0590-\u05FF]/;
        if (_heRegex.test(spineContent)) {
            spineTextEl.style.fontFamily = "'Fredoka', 'Heebo', sans-serif";
        }
        spineEl.appendChild(spineTextEl);

        return spineEl;
    }

    /**
     * Create front cover element
     */
    static createFrontCover(cover, assets, options) {
        const { bgColor, textColor, titleFont, bodyFont, accentColor, interactive, layout, bgTextureUrl } = options;

        const frontEl = document.createElement('div');
        frontEl.className = 'cover-section front-cover';
        frontEl.style.cssText = `
            flex: 1;
            height: 100%;
            position: relative;
            background-color: ${bgColor};
            box-shadow: -3px 3px 10px rgba(0,0,0,0.4);
            border-radius: 0 2px 2px 0;
            overflow: hidden;
            display: flex;
            flex-direction: column;
        `;
        // Apply texture background if available
        if (bgTextureUrl) {
            frontEl.style.backgroundImage = `url('${bgTextureUrl}')`;
            frontEl.style.backgroundSize = 'cover';
            frontEl.style.backgroundPosition = 'center';
        }

        // Handle different layouts
        switch (layout) {
            case 'full-bleed':
                this.applyFullBleedLayout(frontEl, cover, assets, options);
                break;
            case 'photo-bottom':
                this.applyPhotoBottomLayout(frontEl, cover, assets, options);
                break;
            case 'centered':
                this.applyCenteredLayout(frontEl, cover, assets, options);
                break;
            case 'minimal':
                this.applyMinimalLayout(frontEl, cover, options);
                break;
            case 'split':
                this.applySplitLayout(frontEl, cover, assets, options);
                break;
            case 'elegant':
                this.applyElegantLayout(frontEl, cover, assets, options);
                break;
            case 'custom':
                if (cover.customLayout) {
                    this.applyCustomLayout(frontEl, cover, assets, options);
                } else {
                    this.applyStandardLayout(frontEl, cover, assets, options);
                }
                break;
            default: // 'standard'
                this.applyStandardLayout(frontEl, cover, assets, options);
                break;
        }

        return frontEl;
    }

    /**
     * Standard layout - photo on top, text below
     */
    static applyStandardLayout(frontEl, cover, assets, options) {
        const { interactive } = options;
        const photoEl = this.createPhotoArea(cover, assets, { layout: 'standard', interactive });
        photoEl.style.cssText += 'flex:1;margin:10%;';

        const textArea = this.createTextArea(cover, options);
        textArea.style.cssText += 'padding:5% 10% 15%;';

        frontEl.appendChild(photoEl);
        frontEl.appendChild(textArea);
    }

    /**
     * Full bleed layout - photo fills cover, text overlaid
     */
    static applyFullBleedLayout(frontEl, cover, assets, options) {
        const { interactive } = options;
        const photoEl = this.createPhotoArea(cover, assets, { layout: 'full-bleed', interactive });
        photoEl.style.cssText += 'position:absolute;inset:0;';

        const textArea = this.createTextArea(cover, { ...options, textColor: '#ffffff' });
        textArea.style.cssText += 'position:absolute;bottom:10%;left:0;right:0;z-index:10;text-shadow:0 2px 4px rgba(0,0,0,0.7);padding:0 5%;box-sizing:border-box;';
        textArea.querySelectorAll('*').forEach(el => el.style.color = '#ffffff');

        frontEl.appendChild(photoEl);
        frontEl.appendChild(textArea);
    }

    /**
     * Photo bottom layout - text on top, photo below
     */
    static applyPhotoBottomLayout(frontEl, cover, assets, options) {
        const { interactive } = options;
        const textArea = this.createTextArea(cover, options);
        textArea.style.cssText += 'padding:15% 10% 5%;';

        const photoEl = this.createPhotoArea(cover, assets, { layout: 'photo-bottom', interactive });
        photoEl.style.cssText += 'flex:1;margin:0 10% 10%;';

        frontEl.appendChild(textArea);
        frontEl.appendChild(photoEl);
    }

    /**
     * Centered layout - centered photo with text overlay
     */
    static applyCenteredLayout(frontEl, cover, assets, options) {
        const { interactive, bgColor } = options;
        frontEl.style.justifyContent = 'center';
        frontEl.style.alignItems = 'center';

        const photoEl = this.createPhotoArea(cover, assets, { layout: 'centered', interactive });
        photoEl.style.cssText += 'width:70%;height:60%;border-radius:8px;box-shadow:0 4px 20px rgba(0,0,0,0.3);';

        const textArea = this.createTextArea(cover, options);
        textArea.style.cssText += 'margin-top:5%;';

        frontEl.appendChild(photoEl);
        frontEl.appendChild(textArea);
    }

    /**
     * Minimal layout - text only, no photo
     */
    static applyMinimalLayout(frontEl, cover, options) {
        const { titleFont, bodyFont, textColor } = options;
        frontEl.style.justifyContent = 'center';
        frontEl.style.alignItems = 'center';
        frontEl.style.padding = '15%';

        const textArea = this.createTextArea(cover, options);
        textArea.style.cssText += 'text-align:center;';

        // Add decorative line
        const line = document.createElement('div');
        line.style.cssText = `
            width: 60px;
            height: 2px;
            background-color: ${textColor};
            margin: 20px auto;
            opacity: 0.5;
        `;

        const textAreaWithLine = document.createElement('div');
        textAreaWithLine.style.cssText = 'display:flex;flex-direction:column;align-items:center;';
        textAreaWithLine.appendChild(textArea);
        textAreaWithLine.appendChild(line);

        frontEl.appendChild(textAreaWithLine);
    }

    /**
     * Split layout - photo left, text right
     */
    static applySplitLayout(frontEl, cover, assets, options) {
        const { interactive } = options;
        frontEl.style.flexDirection = 'row';

        // Detect Hebrew for correct alignment in split layout
        const _heRegex = /[\u0590-\u05FF]/;
        const isHebrew = _heRegex.test(cover.title || '') || _heRegex.test(cover.subtitle || '');
        const splitAlign = isHebrew ? 'right' : 'left';

        const photoEl = this.createPhotoArea(cover, assets, { layout: 'split', interactive });
        photoEl.style.cssText += 'flex:1;height:100%;';

        const textContainer = document.createElement('div');
        textContainer.style.cssText = 'flex:1;display:flex;flex-direction:column;justify-content:center;padding:10%;';

        const textArea = this.createTextArea(cover, { ...options, textAlign: splitAlign });
        textArea.style.textAlign = splitAlign;

        textContainer.appendChild(textArea);
        frontEl.appendChild(photoEl);
        frontEl.appendChild(textContainer);
    }

    /**
     * Elegant layout - decorative borders with centered content
     */
    static applyElegantLayout(frontEl, cover, assets, options) {
        const { interactive, accentColor, textColor } = options;

        // Outer decorative border
        const borderFrame = document.createElement('div');
        borderFrame.style.cssText = `
            position: absolute;
            inset: 5%;
            border: 2px solid ${accentColor};
            pointer-events: none;
        `;
        frontEl.appendChild(borderFrame);

        // Inner decorative border
        const innerFrame = document.createElement('div');
        innerFrame.style.cssText = `
            position: absolute;
            inset: 7%;
            border: 1px solid ${accentColor};
            opacity: 0.5;
            pointer-events: none;
        `;
        frontEl.appendChild(innerFrame);

        // Content container
        const content = document.createElement('div');
        content.style.cssText = `
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            padding: 10%;
            box-sizing: border-box;
        `;

        const photoEl = this.createPhotoArea(cover, assets, { layout: 'elegant', interactive });
        photoEl.style.cssText += 'width:60%;max-height:40%;flex-shrink:0;margin-bottom:5%;';

        const textArea = this.createTextArea(cover, options);

        // Add decorative divider
        const divider = document.createElement('div');
        divider.style.cssText = `
            width: 80px;
            height: 2px;
            background: linear-gradient(90deg, transparent, ${accentColor}, transparent);
            margin: 15px 0;
        `;

        content.appendChild(photoEl);
        content.appendChild(divider);
        content.appendChild(textArea);
        frontEl.appendChild(content);
    }

    /**
     * Custom layout - renders elements based on JSON definition
     */
    static applyCustomLayout(frontEl, cover, assets, options) {
        const layout = cover.customLayout;
        const { interactive, assets: globalAssets } = options;

        // 1. Render Background / Overlay
        if (layout.backgroundType === 'dark') {
            frontEl.style.backgroundColor = '#0D0D0D';
        }

        // 2. Render Photo Slots
        if (layout.photoSlots) {
            layout.photoSlots.forEach(slot => {
                const photoEl = document.createElement('div');
                photoEl.className = 'cover-photo-slot';
                photoEl.style.cssText = `
                    position: absolute;
                    left: ${slot.position.x};
                    top: ${slot.position.y};
                    width: ${slot.size.width};
                    height: ${slot.size.height};
                    overflow: hidden;
                    z-index: 1;
                `;

                // Calculate CSS properties for style
                if (slot.photoStyle === 'fullBleed') {
                    // Default
                }

                // Find Photo
                // For cover, we map front/back ID. 
                // But custom layout might have multiple slots? 
                // For 'cover-dramatic' there is one 'heroPhoto'.
                // We use cover.frontPhotoId for the first slot found.
                let photoUrl = null;
                if (cover.frontPhotoId && assets?.photos) {
                    const photo = assets.photos.find(p => p.id === cover.frontPhotoId);
                    if (photo) photoUrl = photo.thumbnailUrl || photo.url;
                }

                if (photoUrl) {
                    const img = document.createElement('img');
                    img.src = photoUrl;
                    img.style.cssText = `
                        width: 100%;
                        height: 100%;
                        object-fit: ${slot.photoFit || 'cover'};
                    `;
                    photoEl.appendChild(img);
                } else {
                    photoEl.style.backgroundColor = 'rgba(255,255,255,0.05)';
                }

                if (slot.overlay) {
                    const overlay = document.createElement('div');
                    overlay.style.cssText = `
                        position: absolute;
                        inset: 0;
                        background: ${slot.overlay};
                        z-index: 2;
                        pointer-events: none;
                    `;
                    photoEl.appendChild(overlay);
                }

                frontEl.appendChild(photoEl);
            });
        }

        // 3. Render Text Elements
        if (layout.textElements) {
            layout.textElements.forEach(textSpec => {
                const el = document.createElement('div');
                el.className = 'cover-text-element';

                // Content priority: manual textContent > existing override > placeholder > default
                let content = textSpec.content || textSpec.placeholder || '';

                if (cover.textContent && cover.textContent[textSpec.elementId] !== undefined) {
                    content = cover.textContent[textSpec.elementId];
                } else {
                    // Pre-population logic if not manually edited yet:
                    if (textSpec.elementId === 'groomName' || textSpec.elementId === 'brideName') {
                        // Very basic split if they put "A & B" in title
                        if (cover.title && cover.title.includes('&')) {
                            const parts = cover.title.split('&').map(s => s.trim());
                            if (textSpec.elementId === 'groomName' && parts.length > 0) content = parts[0];
                            if (textSpec.elementId === 'brideName' && parts.length > 1) content = parts[1];
                        } else {
                            if (textSpec.elementId === 'groomName') content = 'אריאל';
                            if (textSpec.elementId === 'brideName') content = 'מיכל';
                        }
                    } else if (textSpec.elementId === 'title' && cover.title) {
                        content = cover.title;
                    } else if (textSpec.elementId === 'date') {
                        content = cover.subtitle || new Date().getFullYear();
                    }
                }

                el.textContent = content;

                const style = textSpec.style || {};

                // Font Family Resolution
                let fontFamily = 'sans-serif';
                if (style.font === 'hebrew') fontFamily = "'Frank Ruhl Libre', serif";
                else if (style.font === 'script') fontFamily = "'Pinyon Script', 'Great Vibes', cursive";
                else if (style.font === 'accent') fontFamily = "'Cinzel', serif";
                else if (style.font === 'display') fontFamily = "'Cormorant Garamond', serif";
                else if (style.font === 'serif') fontFamily = "'Cormorant Garamond', 'Playfair Display', serif";
                else if (style.font === 'sans') fontFamily = "'Montserrat', 'Open Sans', sans-serif";
                else if (style.font === 'body') fontFamily = "'Heebo', serif";
                // If cover has a custom titleFont, apply it to the main template title fields:
                if (options.titleFont && (textSpec.elementId === 'title' || textSpec.elementId === 'groomName' || textSpec.elementId === 'brideName')) {
                    fontFamily = options.titleFont;
                }
                if (options.bodyFont && (textSpec.elementId === 'date' || textSpec.elementId === 'subtitle')) {
                    fontFamily = options.bodyFont;
                }

                // Color Resolution
                let color = style.color;
                if (color === 'gold') color = options.accentColor || '#C9A962';
                if (color === 'light') color = '#FDFCFA';
                if (color === 'secondary') color = '#B8B0A0';
                if (color === 'primary') color = options.textColor || '#000000';

                // Allow direct override from cover text color
                if (options.interactive && cover._userCustomTextColor) {
                    color = options.textColor;
                }

                // Fetch custom position if user dragged it
                const customPos = (cover.textPositions && cover.textPositions[textSpec.elementId]) ? cover.textPositions[textSpec.elementId] : null;

                // Calculate proper width and position
                const elWidth = textSpec.size?.width || '100%';
                // Cap large font sizes on cover to prevent overflow
                let fontSize = style.size || '16px';
                const fontSizePx = parseInt(fontSize);
                if (fontSizePx > 48) {
                    fontSize = '48px';
                }

                let cssString = `
                    position: absolute;
                    font-family: ${fontFamily};
                    font-size: ${fontSize};
                    font-weight: ${style.weight || 400};
                    color: ${color || 'white'};
                    z-index: 10;
                    box-sizing: border-box;
                    overflow: hidden;
                    word-break: break-word;
                    line-height: ${style.lineHeight || '1.3'};
                `;

                if (customPos && customPos.x) {
                    cssString += `
                        left: ${customPos.x};
                        top: ${customPos.y};
                        text-align: right;
                    `;
                    // If moving, we might need width for alignment properly, or keep it auto
                    if (customPos.width) cssString += `width: ${customPos.width};`;
                } else {
                    // Default x to 0 if not specified (common for centered cover titles)
                    const posX = textSpec.position.x || '0%';
                    const posY = textSpec.position.y || '0%';
                    cssString += `
                        left: ${posX};
                        top: ${posY};
                        width: ${elWidth};
                        text-align: ${style.align || 'center'};
                        letter-spacing: ${style.letterSpacing || 'normal'};
                        ${textSpec.alignment?.method || ''}
                    `;
                }

                el.style.cssText = cssString;

                // Auto-detect Hebrew content and apply RTL + Hebrew font
                const hebrewRegex = /[\u0590-\u05FF]/;
                if (hebrewRegex.test(content)) {
                    el.style.direction = 'rtl';
                    el.style.unicodeBidi = 'plaintext';
                    // Only override font if it's not already a Hebrew-supporting font
                    if (!fontFamily.includes('Heebo') && !fontFamily.includes('Rubik') && !fontFamily.includes('Frank Ruhl')) {
                        el.style.fontFamily = "'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif";
                    }
                }

                // Apply custom text styles (size scale and alignment)
                const customStyles = (cover.textStyles && cover.textStyles[textSpec.elementId]) || {};
                if (customStyles.textAlign) {
                    el.style.setProperty('text-align', customStyles.textAlign, 'important');
                }
                if (customStyles.size) {
                    const scaleVal = customStyles.size / 100;
                    // Preserve existing transform if any, then append scaling
                    el.style.transform = `scale(${scaleVal})`;
                    el.style.transformOrigin = 'center center';
                }

                if (interactive && textSpec.editable !== false) {
                    el.dataset.selectableId = textSpec.elementId;
                    el.dataset.selectableType = 'cover-text';
                    el.style.cursor = 'grab';
                    el.style.border = '1px solid transparent';
                    // Let hover outline it, etc.
                }

                // Apply Text Scale
                if (cover.textStyles && cover.textStyles[textSpec.elementId] && cover.textStyles[textSpec.elementId].size) {
                    const inlineScale = cover.textStyles[textSpec.elementId].size / 100;
                    if (el.style.transform && el.style.transform !== 'none') {
                        el.style.transform += ` scale(${inlineScale})`;
                    } else {
                        el.style.transform = `scale(${inlineScale})`;
                        el.style.transformOrigin = 'center center';
                    }
                }

                frontEl.appendChild(el);
            });
        }

        // 4. Decorations
        if (layout.decorations) {
            layout.decorations.forEach(dec => {
                if (dec.type === 'goldLine') {
                    const line = document.createElement('div');
                    line.style.cssText = `
                        position: absolute;
                        left: ${dec.position.x};
                        top: ${dec.position.y};
                        width: ${dec.size.width};
                        height: ${dec.size.height};
                        background-color: #C9A962;
                        z-index: 5;
                    `;
                    frontEl.appendChild(line);
                }
            });
        }
    }

    /**
     * Create photo area for front cover
     */
    static createPhotoArea(cover, assets, { layout, interactive }) {
        const photoEl = document.createElement('div');
        photoEl.className = 'cover-photo-area';
        // Apply saved crop position if available
        const frontCrop = cover.frontCrop || {};
        const bgPosX = frontCrop.panX !== undefined ? frontCrop.panX : 50;
        const bgPosY = frontCrop.panY !== undefined ? frontCrop.panY : 50;
        photoEl.style.cssText = `
            background-size: cover;
            background-position: ${bgPosX}% ${bgPosY}%;
            background-repeat: no-repeat;
        `;

        if (cover.frontPhotoId && assets?.photos) {
            const photo = assets.photos.find(p => p.id === cover.frontPhotoId);
            if (photo) {
                const imgUrl = photo.thumbnailUrl || photo.url;
                photoEl.style.backgroundImage = `url(${imgUrl})`;
            }
        } else {
            // Empty placeholder
            photoEl.style.cssText += `
                display: flex;
                align-items: center;
                justify-content: center;
                border: 2px dashed rgba(128,128,128,0.3);
                color: rgba(128,128,128,0.5);
                font-size: 14px;
                direction: rtl;
            `;
            photoEl.textContent = 'גרור תמונה לכריכה הקדמית';
        }

        if (interactive) {
            photoEl.dataset.selectableId = 'cover-photo';
            photoEl.dataset.selectableType = 'cover-photo';
            // IMPORTANT: Do NOT apply textPositions to the photo area.
            // It's a structural layout element, not a draggable text.
        }

        return photoEl;
    }

    /**
     * Create text area with title and subtitle
     */
    static createTextArea(cover, options) {
        const { textColor, titleFont, bodyFont, interactive, textAlign = 'center' } = options;

        const textArea = document.createElement('div');
        textArea.className = 'cover-text-area';
        textArea.style.cssText = `
            text-align: ${textAlign};
            width: 100%;
            flex-shrink: 1;
            min-height: 0;
            overflow: hidden;
        `;

        // Title
        const titleEl = document.createElement('h1');
        titleEl.textContent = cover.title || 'Album Title';
        titleEl.style.cssText = `
            margin: 0;
            font-family: ${titleFont};
            font-size: 28px;
            font-weight: 600;
            color: ${textColor};
            line-height: 1.2;
            word-break: break-word;
            overflow-wrap: break-word;
        `;
        if (interactive) {
            titleEl.dataset.selectableId = 'cover-title';
            titleEl.dataset.selectableType = 'cover-text';

            if (cover.textPositions && cover.textPositions['cover-title']) {
                titleEl.style.position = 'absolute';
                titleEl.style.left = cover.textPositions['cover-title'].x;
                titleEl.style.top = cover.textPositions['cover-title'].y;
            }
        }

        // Subtitle
        const subEl = document.createElement('h3');
        subEl.textContent = cover.subtitle || '';
        subEl.style.cssText = `
            margin: 8px 0 0;
            font-family: ${bodyFont};
            font-size: 16px;
            font-weight: 400;
            color: ${textColor};
            opacity: 0.85;
        `;
        if (interactive) {
            subEl.dataset.selectableId = 'cover-subtitle';
            subEl.dataset.selectableType = 'cover-text';

            if (cover.textPositions && cover.textPositions['cover-subtitle']) {
                subEl.style.position = 'absolute';
                subEl.style.left = cover.textPositions['cover-subtitle'].x;
                subEl.style.top = cover.textPositions['cover-subtitle'].y;
            }
        }

        // Apply global text scales for non-custom layouts
        if (cover.textStyles) {
            if (cover.textStyles['cover-title'] && cover.textStyles['cover-title'].size) {
                const ts = cover.textStyles['cover-title'].size / 100;
                titleEl.style.transform = titleEl.style.transform && titleEl.style.transform !== 'none'
                    ? titleEl.style.transform + ` scale(${ts})`
                    : `scale(${ts})`;
            }
            if (cover.textStyles['cover-subtitle'] && cover.textStyles['cover-subtitle'].size) {
                const ss = cover.textStyles['cover-subtitle'].size / 100;
                subEl.style.transform = subEl.style.transform && subEl.style.transform !== 'none'
                    ? subEl.style.transform + ` scale(${ss})`
                    : `scale(${ss})`;
            }
        }

        textArea.appendChild(titleEl);
        if (cover.subtitle) {
            textArea.appendChild(subEl);
        }

        // Auto-detect Hebrew in cover text and apply RTL + Hebrew fonts
        // IMPORTANT: We preserve the layout's text-align (e.g. 'center' for elegant/minimal)
        // and only add direction:rtl so text flows correctly without breaking centered layouts.
        const hebrewRegex = /[\u0590-\u05FF]/;
        const titleIsHebrew = hebrewRegex.test(cover.title || '');
        const subtitleIsHebrew = hebrewRegex.test(cover.subtitle || '');
        if (titleIsHebrew || subtitleIsHebrew) {
            textArea.style.direction = 'rtl';
            // Only set text-align to right if the layout didn't specify center
            // (centered, elegant, minimal layouts use center; standard/split use left/right)
            if (textAlign !== 'center') {
                textArea.style.textAlign = 'right';
            }
            if (titleIsHebrew) {
                titleEl.style.fontFamily = "'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif";
                titleEl.style.direction = 'rtl';
            }
            if (subtitleIsHebrew) {
                subEl.style.fontFamily = "'Fredoka', 'Gveret Levin', 'Playpen Sans Hebrew', 'Heebo', sans-serif";
                subEl.style.direction = 'rtl';
            }
        }

        return textArea;
    }

    /**
     * Render a simplified thumbnail version of the cover
     */
    static renderThumbnail(cover, assets, { bgColor, textColor, titleFont }) {
        const thumb = document.createElement('div');
        thumb.className = 'cover-thumbnail';
        thumb.style.cssText = `
            width: 100%;
            height: 100%;
            display: flex;
            background-color: ${bgColor};
            position: relative;
            border-radius: 2px;
            overflow: hidden;
        `;

        // Simple layout: small spine + front cover preview
        const spine = document.createElement('div');
        spine.style.cssText = `
            width: 4px;
            height: 100%;
            background-color: ${bgColor};
            filter: brightness(0.9);
        `;

        const front = document.createElement('div');
        front.style.cssText = `
            flex: 1;
            height: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            padding: 5%;
            box-sizing: border-box;
        `;

        // Photo preview
        if (cover.frontPhotoId && assets?.photos) {
            const photo = assets.photos.find(p => p.id === cover.frontPhotoId);
            if (photo) {
                const img = document.createElement('div');
                img.style.cssText = `
                    width: 60%;
                    height: 50%;
                    background-image: url(${photo.thumbnailUrl || photo.url});
                    background-size: cover;
                    background-position: center;
                    margin-bottom: 5%;
                `;
                front.appendChild(img);
            }
        }

        // Title
        const title = document.createElement('div');
        const thumbTitle = cover.title || 'Cover';
        title.textContent = thumbTitle;
        title.style.cssText = `
            font-family: ${titleFont};
            font-size: 8px;
            color: ${textColor};
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 90%;
        `;
        // Hebrew thumbnail title: apply RTL direction + Hebrew font
        const _heRegex = /[\u0590-\u05FF]/;
        if (_heRegex.test(thumbTitle)) {
            title.style.direction = 'rtl';
            title.style.fontFamily = "'Fredoka', 'Heebo', sans-serif";
        }
        front.appendChild(title);

        thumb.appendChild(spine);
        thumb.appendChild(front);

        // Add "Cover" label
        const label = document.createElement('div');
        label.textContent = 'Cover';
        label.style.cssText = `
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 6px;
            color: ${textColor};
            opacity: 0.6;
        `;
        thumb.appendChild(label);

        return thumb;
    }

    /**
     * Convenience method for rendering into a container with common defaults
     */
    static renderToContainer(container, cover, assets, templateConfig, interactive = true) {
        return this.render({
            cover,
            assets,
            templateConfig,
            container,
            interactive,
            thumbnail: false
        });
    }

    /**
     * Create a thumbnail for the timeline
     */
    static renderTimelineThumbnail(cover, assets, templateConfig) {
        return this.render({
            cover,
            assets,
            templateConfig,
            container: null,
            interactive: false,
            thumbnail: true
        });
    }
}

// Export singleton for convenience
export const unifiedCoverRenderer = UnifiedCoverRenderer;
