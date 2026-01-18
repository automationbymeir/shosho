/**
 * TemplateManager
 * Orchestrates fetching config, assigning photos, and generating App State.
 */
import { PhotoAssigner } from './photo-assigner.js';

export class TemplateManager {
    constructor() {
        this.currentTemplateId = null;
        this.config = null;
    }

    async loadTemplate(templateId) {
        console.log("TemplateManager v2 loaded. ensure family-roots-v1 is supported.");
        console.log("TemplateManager.loadTemplate called with:", templateId);
        let path = '';
        if (templateId === 'romantic-journey-v1') path = 'templates/romantic-journey-template.json';
        else if (templateId === 'photography-portfolio-v1') path = 'templates/photography-portfolio-template.json';
        else if (templateId === 'travel-journey-v1') path = 'templates/travel-journey-template.json';
        else if (templateId === 'family-roots-v1') path = 'templates/family-roots-template.json';
        else if (templateId === 'bar-mitzvah-v1') path = 'templates/bar-mitzvah-template.json';

        if (path) {
            console.log("Loading template path:", path);
            try {
                const response = await fetch(path);
                this.config = await response.json();
                this.currentTemplateId = templateId;
                return this.config;
            } catch (e) {
                console.error("Failed to load template config:", e);
                throw e;
            }
        }
    }

    /**
     * Generate complete album including cover as first page
     * @param {Array} photos
     * @returns {Array} Array of Page Objects (State) including cover
     */
    generateAlbumWithCover(photos) {
        if (!this.config) {
            console.error("Template not loaded");
            return [];
        }

        const allPages = [];

        // 1. Generate Cover Page
        const coverLayout = this.config.pageLayouts.find(l => l.pageType === 'cover' || l.layoutId === 'cover' || l.layoutId === 'cover-elegant');
        if (coverLayout) {
            // Use first photo for cover
            const coverPhotos = photos.length > 0 ? [photos[0]] : [];
            const coverTextContent = this.generateCoverTextContent();

            const coverAssignment = {
                layout: coverLayout,
                photos: coverPhotos,
                textContent: coverTextContent
            };

            const coverPage = this.convertToState(coverAssignment, 0);
            allPages.push(coverPage);
        }

        // 2. Generate Content Pages (skip photos used in cover)
        const contentPhotos = coverLayout ? photos.slice(1) : photos;
        const assigner = new PhotoAssigner(this.config, contentPhotos);
        const assignments = assigner.assignPhotos();

        const contentPages = assignments.map((assignment, index) => {
            return this.convertToState(assignment, index + 1);
        });

        allPages.push(...contentPages);

        return allPages;
    }

    /**
     * Generate content pages State Objects from photos
     * @param {Array} photos
     * @returns {Array} Array of Page Objects (State)
     */
    generateAlbum(photos) {
        if (!this.config) {
            console.error("Template not loaded");
            return [];
        }

        // Filter out cover photo if handled separately?
        // For now, let's assume photos passed here are for content pages.
        const assigner = new PhotoAssigner(this.config, photos);
        const assignments = assigner.assignPhotos();

        return assignments.map((assignment, index) => {
            return this.convertToState(assignment, index);
        });
    }

    /**
     * Generate text content for cover page
     * @returns {Object} Text content keyed by elementId
     */
    generateCoverTextContent() {
        if (!this.config || !this.config.autoGenerateText) {
            return {
                childName: 'Daniel Cohen',
                hebrewDate: 'י״ג באדר תשפ״ה',
                gregorianDate: '15 במרץ 2025',
                barMitzvahLabel: 'בר מצווה'
            };
        }

        // Use default values from config or fallbacks
        return {
            childName: this.config.autoGenerateText.childName || 'דניאל כהן',
            hebrewDate: this.config.autoGenerateText.hebrewDate || 'י״ג באדר תשפ״ה',
            gregorianDate: this.config.autoGenerateText.gregorianDate || '15 במרץ 2025',
            barMitzvahLabel: this.config.autoGenerateText.barMitzvahLabel || 'בר מצווה'
        };
    }

    /**
     * Generate Cover State Object
     * @param {Object} photos - Specific cover photos { front: photoObj, back: photoObj }
     */
    generateCover(coverPhotos = {}) {
        if (!this.config) return null;

        const coverLayout = this.config.pageLayouts.find(l => l.layoutId === 'cover' || l.pageType === 'cover');
        if (!coverLayout) return null;

        return {
            layout: 'custom', // Use renderer's custom logic
            title: this.config.autoGenerateText?.title || 'Our Love Story',
            subtitle: this.config.autoGenerateText?.subtitle || '2025',
            spineText: this.config.autoGenerateText?.title || 'Our Love Story',
            frontPhotoId: coverPhotos.front?.id || null,
            backPhotoId: coverPhotos.back?.id || null,
            theme: this.config.designSystem.colors.background, // store background color here
            textColor: this.config.designSystem.colors.text.primary,
            // Store template config for renderer to access styles
            templateId: this.currentTemplateId,
            customLayout: coverLayout // Pass full layout spec for the renderer
        };
    }

    /**
     * Regenerate a page with a new layout while preserving photos
     * @param {Object} currentPage - Current page state object
     * @param {String} newLayoutId - ID of the layout to switch to
     * @returns {Object} New page state object
     */
    regeneratePage(currentPage, newLayoutId) {
        if (!this.config) return null;

        const targetLayout = this.config.pageLayouts.find(l => l.layoutId === newLayoutId);
        if (!targetLayout) {
            console.error("Layout not found:", newLayoutId);
            return null;
        }

        // Create assignment object reusing current photos
        // We preserve order of photos from the current page state
        const assignment = {
            layout: targetLayout,
            photos: currentPage.photos || [],
            textContent: {} // Reset text to placeholders for now (complex to map)
        };

        // Reuse the conversion logic
        const newPage = this.convertToState(assignment, 0);

        // Preserve the original Page ID to avoid flickering/loss of selection context if desired?
        // Actually, replacing ID is fine, but keeping it is smoother for React-like diffs.
        // Let's keep the ID.
        newPage.id = currentPage.id;

        return newPage;
    }

    getAlternativeLayoutId(currentLayoutId, photoCount) {
        if (!this.config) return null;
        const candidates = this.config.pageLayouts.filter(l =>
            l.photoSlots.length === photoCount && l.layoutId !== currentLayoutId && l.pageType !== 'cover'
        );
        if (candidates.length === 0) return null;
        const next = candidates[Math.floor(Math.random() * candidates.length)];
        return next.layoutId;
    }

    // ... (helper methods)

    convertToState(assignment, index) {
        const { layout, photos, textContent } = assignment;

        // 1. Basic Page Structure
        const page = {
            id: `page_${crypto.randomUUID()}`,
            layout: {
                id: layout.layoutId,
                name: layout.layoutName,
                slots: []
            },
            photos: photos,
            elements: [],
            background: this.config.designSystem.colors.background,
            templateId: this.config.templateId,
            // Added for specialized renderers
            rawLayoutId: layout.layoutId,
            textContent: textContent
        };

        // 2. Map Photo Slots
        if (layout.photoSlots) {
            layout.photoSlots.forEach((slotSpec, i) => {
                const photo = photos[i];
                if (photo) {
                    page.layout.slots.push({
                        id: `slot_${crypto.randomUUID()}`,
                        photoId: photo.id,
                        x: parseFloat(slotSpec.position.x),
                        y: parseFloat(slotSpec.position.y),
                        width: parseFloat(slotSpec.size.width),
                        height: parseFloat(slotSpec.size.height),
                        rotation: slotSpec.rotation || 0,
                        styleId: slotSpec.style || 'default'
                    });
                }
            });
        }

        // 3. Map Text Elements
        if (layout.textElements) {
            layout.textElements.forEach(textSpec => {
                const content = textContent[textSpec.elementId] || textSpec.placeholder;

                if (textSpec.children) {
                    // Container Logic (Title Cards)
                    // REMOVED: Redundant 'shape' element. The container handles background.

                    // 2. Container Element
                    const container = {
                        id: `container_${crypto.randomUUID()}`,
                        type: 'container',
                        x: parseFloat(textSpec.position.x) - (parseFloat(textSpec.size.width) / 2),
                        y: parseFloat(textSpec.position.y) - (parseFloat(textSpec.size.height) / 2),
                        width: parseFloat(textSpec.size.width),
                        height: parseFloat(textSpec.size.height),
                        backgroundColor: this.resolveColor(textSpec.background),
                        elements: []
                    };

                    textSpec.children.forEach(child => {
                        const childContent = textContent[child.elementId] || child.placeholder;
                        container.elements.push({
                            id: `text_${crypto.randomUUID()}`,
                            type: 'text',
                            content: childContent,
                            fontSize: parseInt(child.style.size) || 14,
                            fontFamily: this.resolveFont(child.style.font),
                            color: this.resolveColor(child.style.color),
                            textAlign: child.style.align || 'center'
                        });
                    });

                    page.elements.push(container);

                } else {
                    // Normal Text Element
                    page.elements.push({
                        id: `text_${crypto.randomUUID()}`,
                        type: 'text',
                        content: content,
                        x: parseFloat(textSpec.position.x),
                        y: parseFloat(textSpec.position.y),
                        width: textSpec.size ? parseFloat(textSpec.size.width) : undefined,
                        fontSize: parseInt(textSpec.style.size) || 24,
                        fontFamily: this.resolveFont(textSpec.style.font),
                        color: this.resolveColor(textSpec.style.color),
                        align: textSpec.style.align
                    });
                }
            });
        }

        // 4. Map Decorations -> Shape Elements
        if (layout.decorations) {
            layout.decorations.forEach(dec => {
                let w, h, color;

                // Case A: Catalog Reference
                if (dec.element && this.config.decorativeElements && this.config.decorativeElements[dec.element]) {
                    const config = this.config.decorativeElements[dec.element];
                    w = config.width;
                    h = config.height;
                    color = config.color;
                    if (config.sizes && dec.size) {
                        if (config.sizes[dec.size]) {
                            w = config.sizes[dec.size].width;
                            h = config.sizes[dec.size].height;
                        }
                    }
                }
                // Case B: Inline Styles (Travel Journey)
                else if (dec.type === 'overlay' || dec.style) {
                    w = dec.size ? dec.size.width : '0';
                    h = dec.size ? dec.size.height : '0';
                    color = dec.style ? dec.style.backgroundColor : 'rgba(0,0,0,0.1)';
                }

                if (w && h) {
                    page.elements.push({
                        id: `dec_${crypto.randomUUID()}`,
                        type: 'shape',
                        subtype: 'rect', // simplified
                        x: parseFloat(dec.position.x),
                        y: parseFloat(dec.position.y),
                        width: parseFloat(w),
                        height: parseFloat(h),
                        color: this.resolveColor(color),
                        zIndex: 0 // Background
                    });
                }
            });
        }

        return page;
    }

    resolveFont(fontKey) {
        if (!fontKey) return 'sans-serif';
        const typography = this.config.designSystem.typography;
        const fontConfig = typography[fontKey] || typography.sans;
        return fontConfig.family ? `'${fontConfig.family}', ${fontConfig.fallback}` : 'sans-serif';
    }

    resolveColor(key) {
        if (!key) return '#000000';
        const colors = this.config.designSystem.colors;
        if (key === 'primary') return colors.text.primary;
        if (key === 'secondary') return colors.text.secondary;
        if (key === 'accent') return colors.accent;
        if (key === 'background') return colors.background;
        return key;
    }
}
