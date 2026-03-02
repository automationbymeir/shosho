/**
 * Assign photos to pages based on template rules
 */
export class PhotoAssigner {
    constructor(templateConfig, photos) {
        this.config = templateConfig;
        this.photos = photos; // Array of photo objects {url, width, height, ...}
        this.layouts = templateConfig.pageLayouts;
    }

    /**
     * Auto-assign photos to create album pages
     * NOTE: This method DOES NOT include cover pages - cover is handled separately by generateCover()
     * @returns {Array} Array of { layout, photos, textContent }
     */
    assignPhotos() {
        const strategy = this.config.photoAssignmentRules?.groupingStrategy || 'sequential';

        if (strategy === 'by_category_similarity') {
            return this.assignPhotosByCategoryNoCover();
        } else if (strategy === 'chronological_by_location') {
            return this.assignPhotosByLocationNoCover();
        }

        // Default Sequential Logic (WITHOUT COVER - cover handled separately)
        const pages = [];
        let remainingPhotos = [...this.photos];
        const sequence = this.config.defaultPageSequence ||
            this.config.pageLayouts.map(l => ({ layoutId: l.layoutId })); // Fallback if no sequence defined

        // Filter out cover layouts from the sequence
        const bodySequence = sequence.filter(s =>
            !s.layoutId.toLowerCase().includes('cover')
        );

        for (const seqItem of bodySequence) {
            if (remainingPhotos.length === 0) break;
            const layout = this.getLayout(seqItem.layoutId);
            if (!layout) continue;

            const slotsCount = layout.photoSlots ? layout.photoSlots.length : 0;
            if (slotsCount === 0 || remainingPhotos.length >= slotsCount) {
                const pagePhotos = remainingPhotos.splice(0, slotsCount);
                pages.push({
                    layout: layout,
                    photos: pagePhotos,
                    textContent: this.generateDefaultText(layout)
                });
            }
        }

        // Handle remaining photos with overflow layouts
        while (remainingPhotos.length > 0) {
            // Try 2 photos first
            if (remainingPhotos.length >= 2) {
                // Try specific layouts first, then any 2-slot layout
                let layout = this.getLayout('side-by-side') ||
                    this.getLayout('two-photos-vertical') ||
                    this.getLayout('duo-horizontal') ||
                    this.findLayoutWithSlotCount(2);

                if (layout) {
                    const pagePhotos = remainingPhotos.splice(0, 2);
                    pages.push({ layout, photos: pagePhotos, textContent: this.generateDefaultText(layout) });
                } else {
                    // Fallback to single photo logic if no 2-slot layout found
                    // Push back to 1-photo logic below
                    const layout1 = this.getLayout('story-right') ||
                        this.getLayout('hero-with-caption') ||
                        this.getLayout('full-bleed-hero') ||
                        this.findLayoutWithSlotCount(1);

                    if (layout1) {
                        const pagePhotos = remainingPhotos.splice(0, 1);
                        pages.push({ layout: layout1, photos: pagePhotos, textContent: this.generateDefaultText(layout1) });
                    } else {
                        console.warn('PhotoAssigner: No valid 1 or 2 slot layouts found for remaining photos.');
                        remainingPhotos = []; // Prevent infinite loop
                    }
                }
            } else {
                // Single photo remaining
                const layout = this.getLayout('story-right') ||
                    this.getLayout('hero-with-caption') ||
                    this.getLayout('full-bleed-hero') ||
                    this.findLayoutWithSlotCount(1);

                if (layout) {
                    const pagePhotos = remainingPhotos.splice(0, 1);
                    pages.push({ layout, photos: pagePhotos, textContent: this.generateDefaultText(layout) });
                } else {
                    console.warn('PhotoAssigner: No valid 1-slot layout found for remaining photo.');
                    remainingPhotos = []; // Prevent infinite loop
                }
            }
        }

        // Closing Page (thank-you page, not cover)
        const closingLayout = this.getLayout('thank-you') || this.getLayout('single-hero-centered');
        if (closingLayout && !closingLayout.layoutId.toLowerCase().includes('cover')) {
            pages.push({
                layout: closingLayout,
                photos: [],
                textContent: this.generateDefaultText(closingLayout)
            });
        }

        return pages;
    }

    /**
     * Category-based assignment WITHOUT cover (cover handled separately)
     */
    assignPhotosByCategoryNoCover() {
        const pages = [];
        const categorized = this.categorizePhotos();

        // 2. About (NO COVER - cover handled separately)
        const aboutLayout = this.getLayout('about-studio');
        if (aboutLayout) {
            pages.push({
                layout: aboutLayout,
                photos: [this.photos[0]],
                textContent: this.generateDefaultText(aboutLayout)
            });
        }

        // 3. ToC
        if (Object.keys(categorized).length >= 3) {
            const tocLayout = this.getLayout('table-of-contents');
            if (tocLayout) {
                const tocPhotos = Object.values(categorized).map(list => list[0]).slice(0, 6);
                pages.push({
                    layout: tocLayout,
                    photos: tocPhotos,
                    textContent: this.generateTocLabels(categorized)
                });
            }
        }

        // 4. Categories
        Object.entries(categorized).forEach(([category, photos]) => {
            if (photos.length > 0) {
                let layoutId = 'category-hero-left';
                if (photos.length >= 5) layoutId = 'category-hero-grid';
                else if (photos.length === 4) layoutId = 'category-collage';

                const layout = this.getLayout(layoutId);
                if (layout) {
                    const slots = layout.photoSlots.length;
                    const pagePhotos = photos.slice(0, slots);
                    pages.push({
                        layout: layout,
                        photos: pagePhotos,
                        textContent: { categoryTitle: category, categorySubtitle: 'Collection' }
                    });

                    let remaining = photos.slice(slots);
                    this.addGalleryPages(pages, remaining);
                }
            }
        });

        // 5. Closing
        const closingLayout = this.getLayout('thank-you');
        if (closingLayout) {
            pages.push({ layout: closingLayout, photos: [], textContent: this.generateDefaultText(closingLayout) });
        }

        return pages;
    }

    /**
     * Location-based assignment WITHOUT cover (cover handled separately)
     */
    assignPhotosByLocationNoCover() {
        const pages = [];
        let photoIndex = 0;

        // Group photos by location/date
        const locationGroups = this.groupPhotosByLocation();

        // NO COVER - cover handled separately

        // 1. Title/intro page
        const titleLayout = this.getLayout('title-hero');
        if (titleLayout) {
            pages.push({
                layout: titleLayout,
                photos: [this.findBestHeroPhoto(this.photos)] || [this.photos[0]],
                textContent: {
                    destination: this.detectDestination() || 'Adventure Awaits'
                }
            });
            photoIndex += 1;
        }

        // 2. Process each location group
        let locationNumber = 1;
        locationGroups.forEach((groupPhotos, location) => {
            if (groupPhotos.length >= 2) {
                const locationLayout = this.getLayout('location-page');
                if (locationLayout) {
                    pages.push({
                        layout: locationLayout,
                        photos: [this.findBestHeroFromGroup(groupPhotos)],
                        textContent: {
                            locationTitle: location || `Place ${this.numberToWord(locationNumber)}`,
                            description: ''
                        }
                    });
                }

                const remainingPhotos = groupPhotos.slice(1);
                this.addTravelGalleryPages(pages, remainingPhotos);
                locationNumber++;
            } else if (groupPhotos.length === 1) {
                this.addTravelGalleryPages(pages, groupPhotos);
            }
        });

        // 3. Closing page
        const closingLayout = this.getLayout('closing-grid');
        if (closingLayout) {
            const closingPhotos = this.selectFinalPhotos(4);
            pages.push({
                layout: closingLayout,
                photos: closingPhotos,
                textContent: {
                    thanks: 'The End'
                }
            });
        }

        return pages;
    }

    assignPhotosByCategory() {
        const pages = [];
        const categorized = this.categorizePhotos();

        // 1. Cover
        const coverLayout = this.getLayout('cover-hero');
        const heroPhoto = this.findBestHeroPhoto(this.photos) || this.photos[0];
        if (coverLayout) {
            pages.push({
                layout: coverLayout,
                photos: [heroPhoto],
                textContent: { title: 'Photography', subtitle: 'Portfolio', handle: '@STUDIO' }
            });
        }

        // 2. About
        const aboutLayout = this.getLayout('about-studio');
        if (aboutLayout) {
            pages.push({
                layout: aboutLayout,
                photos: [this.photos[1] || heroPhoto], // specific logic would be better
                textContent: this.generateDefaultText(aboutLayout)
            });
        }

        // 3. ToC
        if (Object.keys(categorized).length >= 3) {
            const tocLayout = this.getLayout('table-of-contents');
            if (tocLayout) {
                const tocPhotos = Object.values(categorized).map(list => list[0]).slice(0, 6);
                pages.push({
                    layout: tocLayout,
                    photos: tocPhotos,
                    textContent: this.generateTocLabels(categorized)
                });
            }
        }

        // 4. Categories
        Object.entries(categorized).forEach(([category, photos]) => {
            // Need at least X photos? Let's be flexible
            if (photos.length > 0) {
                // Pick layout based on count
                let layoutId = 'category-hero-left'; // default
                if (photos.length >= 5) layoutId = 'category-hero-grid';
                else if (photos.length === 4) layoutId = 'category-collage';

                const layout = this.getLayout(layoutId);
                if (layout) {
                    const slots = layout.photoSlots.length;
                    const pagePhotos = photos.slice(0, slots);
                    pages.push({
                        layout: layout,
                        photos: pagePhotos,
                        textContent: { categoryTitle: category, categorySubtitle: 'Collection' }
                    });

                    // Remaining photos in category -> Gallery
                    let remaining = photos.slice(slots);
                    this.addGalleryPages(pages, remaining);
                }
            }
        });

        // 5. Closing
        const closingLayout = this.getLayout('thank-you');
        if (closingLayout) {
            pages.push({ layout: closingLayout, photos: [], textContent: this.generateDefaultText(closingLayout) });
        }

        return pages;
    }

    categorizePhotos() {
        const categories = {};
        const rules = this.config.photoAssignmentRules?.categoryDetection || {};

        // Default categories if none detected
        const defaults = ['Portrait', 'Maternity', 'Events', 'Product'];

        this.photos.forEach((photo, index) => {
            let cat = 'General';
            // Mock logic: Distribute by index if no metadata
            // In real app, check photo.metadata.tags
            if (photo.metadata && photo.metadata.tags) {
                // Check rules
                for (const [key, keywords] of Object.entries(rules)) {
                    if (photo.metadata.tags.some(t => keywords.includes(t))) {
                        cat = key;
                        break;
                    }
                }
            } else {
                // Round robin for simulation
                cat = defaults[index % defaults.length];
            }

            if (!categories[cat]) categories[cat] = [];
            categories[cat].push(photo);
        });
        return categories;
    }

    addGalleryPages(pages, photos) {
        while (photos.length > 0) {
            let layout;
            let take = 0;
            if (photos.length >= 6) {
                layout = this.getLayout('gallery-six');
                take = 6;
            } else if (photos.length >= 4) {
                layout = this.getLayout('gallery-four-large');
                take = 4;
            } else if (photos.length >= 2) {
                layout = this.getLayout('duo-horizontal');
                take = 2;
            } else {
                layout = this.getLayout('full-bleed-single'); // fallback for 1
                take = 1;
            }

            if (layout) {
                pages.push({
                    layout: layout,
                    photos: photos.splice(0, take),
                    textContent: {}
                });
            } else {
                break; // Should not happen with fallbacks
            }
        }
    }

    findBestHeroPhoto(photos) {
        return photos[0]; // Simple fallback
    }

    generateTocLabels(categorized) {
        const labels = {};
        Object.keys(categorized).slice(0, 6).forEach((cat, i) => {
            labels[`label${i + 1}`] = cat;
        });
        return {
            title: 'Content',
            titleSans: 'List',
            ...labels
        };
    }

    getLayout(layoutId) {
        return this.layouts.find(l => l.layoutId === layoutId);
    }

    findLayoutWithSlotCount(count) {
        // Find any layout with exactly `count` photo slots
        // Optionally prioritize layouts that don't look like covers or special pages if needed
        return this.layouts.find(l => {
            const slots = l.photoSlots ? l.photoSlots.length : 0;
            // Exclude covers from general fallback
            const isCover = l.layoutId.toLowerCase().includes('cover') || l.pageType === 'cover';
            return slots === count && !isCover;
        });
    }

    // ... existing helpers ...
    findBestHeroIndex(photos) {
        // Look for landscape
        return photos.findIndex(p => {
            // Assume p.width/p.height exist, or check logic
            if (p.width && p.height) {
                return p.width > p.height;
            }
            return false; // Default to not finding if no metadata
        });
    }

    generateDefaultText(layout) {
        const content = {};

        // Track how many times each layout has been used
        if (!this._layoutUsageCount) this._layoutUsageCount = {};
        const layoutId = layout.layoutId;
        this._layoutUsageCount[layoutId] = (this._layoutUsageCount[layoutId] || 0);
        const usageIndex = this._layoutUsageCount[layoutId];
        this._layoutUsageCount[layoutId]++;

        if (layout.textElements) {
            layout.textElements.forEach(te => {
                // Check if we have variant text for this element
                const variants = this._getTextVariants(layoutId, te.elementId);
                if (variants && variants.length > 0) {
                    content[te.elementId] = variants[usageIndex % variants.length];
                } else {
                    content[te.elementId] = te.placeholder;
                }

                if (te.children) {
                    te.children.forEach(c => content[c.elementId] = c.placeholder);
                }
            });
        }
        return content;
    }

    /**
     * Get text variant pool for a specific layout + element combination.
     * Returns null if no variants exist (falls back to placeholder).
     */
    _getTextVariants(layoutId, elementId) {
        // Text variant pools for layouts that may be reused
        const variantPools = {
            // Bar Mitzvah variants
            'hero-with-caption': {
                'caption': [
                    'הרגע שחיכינו לו',
                    'יום של גאווה',
                    'רגע של קדושה',
                    'חגיגה של שמחה',
                    'הדרך לבגרות',
                    'רגעים מיוחדים',
                    'ברגע הזה הכל השתנה',
                    'עליית מדרגה'
                ],
                'subcaption': [
                    'בית הכנסת',
                    'עם המשפחה',
                    'רגע של התרגשות',
                    'חוויה בלתי נשכחת',
                    'יום שלא נשכח',
                    'זיכרונות לכל החיים',
                    'תחילת דרך חדשה',
                    'הרגע שלנו'
                ]
            },
            'story-right-photo': {
                'storyTitle': [
                    'ההכנות לקראת היום הגדול',
                    'הדרך עד לכאן',
                    'מחשבות לפני העלייה',
                    'רגעים של גיוס',
                    'הסיפור שלנו'
                ],
                'storyText': [
                    'חודשים של הכנה, לימוד הפרשה וההפטרה, בחירת הנושא לדרשה - כל אלה הובילו לרגע המיוחד הזה.\n\nצפינו לראות את הילד שלנו עולה לתורה, וליבנו מלא גאווה.',
                    'מרגע שהתחלנו לתכנן, ידענו שזה יהיה יום מיוחד.\nכל פרט קטן תוכנן בקפידה, כל רגע נבחר בזהירות.',
                    'הרגע הזה מסמל את המעבר מילדות לבגרות.\nתקופה חדשה מתחילה, מלאה באתגרים והזדמנויות.',
                    'כל הדרך הביאה אותנו לרגע הזה.\nרגע של אושר, גאווה והתרגשות.',
                    'הסיפור המשפחתי שלנו מקבל היום פרק חדש.\nפרק של אחריות, גאווה ושמחה.'
                ]
            },
            'story-left-photo': {
                'storyTitle': [
                    'רגעים של שמחה',
                    'ברגע הזה',
                    'חגיגה אמיתית',
                    'הזיכרונות היפים',
                    'יום של אהבה'
                ],
                'storyText': [
                    'החגיגה עם כל המשפחה והחברים הקרובים. רגעים של אושר טהור שנזכור לתמיד.',
                    'כשכל אלה שאהבנו מתאספים יחד, הלב מתמלא בשמחה עצומה.',
                    'הצחוקים, הריקודים, החיבוקים - כל רגע נחרט בזיכרון.',
                    'היום הזה הוכיח שוב כמה משפחה זה הדבר הכי חשוב.',
                    'רגעים כאלה לא קורים כל יום. שמחנו על כל שניה.'
                ]
            },
            'grid-four-celebration': {
                'pageTitle': [
                    'רגעים מהחגיגה',
                    'תמונות מהאירוע',
                    'רגעים בלתי נשכחים',
                    'מהרגעים היפים',
                    'זיכרונות מתוקים'
                ],
                'caption1': [
                    'עם סבא וסבתא',
                    'רגע משפחתי',
                    'חיוכים של אושר',
                    'יחד'
                ],
                'caption2': [
                    'החברים הכי טובים',
                    'חברים לדרך',
                    'צמד בלתי מנוצח',
                    'רגע של חברות'
                ],
                'caption3': [
                    'ריקודים',
                    'על הרחבה',
                    'שמחה אמיתית',
                    'רגע של שמחה'
                ],
                'caption4': [
                    'עוגת הבר מצווה',
                    'המתוקים',
                    'חגיגה של טעמים',
                    'רגע מתוק'
                ]
            },
            'grid-six': {
                'pageTitle': [
                    'עוד רגעים יפים',
                    'גלריה',
                    'רגעי שיא',
                    'עוד מהחגיגה',
                    'רגעים נבחרים'
                ]
            },
            // Romantic Journey variants
            'full-photo-quote': {
                'quoteText': [
                    'האהבה שלנו היא הסיפור הכי יפה',
                    'כל רגע איתך הוא מתנה',
                    'ביחד אנחנו יכולים הכל',
                    'את/ה הבית שלי'
                ]
            },
            // Wedding Prestige variants
            'split-diagonal': {
                'centerText': [
                    'לנצח',
                    'יחד',
                    'אהבה',
                    'רגע קסום'
                ]
            },
            'filmstrip-moments': {
                'title': [
                    'רגעים מהערב',
                    'הקסם של הלילה',
                    'רגעים בלתי נשכחים',
                    'מהחגיגה שלנו'
                ],
                'subtitle': [
                    'כל רגע שווה זהב',
                    'זיכרונות של אושר',
                    'יום שלא נשכח',
                    'חגיגה של אהבה'
                ]
            }
        };

        const pool = variantPools[layoutId];
        if (!pool) return null;
        return pool[elementId] || null;
    }

    // --- Travel Journey Strategy Methods ---

    assignPhotosByLocation() {
        const pages = [];
        let photoIndex = 0;

        // Group photos by location/date
        const locationGroups = this.groupPhotosByLocation();

        // 1. Cover page (4 photos)
        const coverLayout = this.getLayout('cover-grid');
        if (coverLayout) {
            pages.push({
                layout: coverLayout,
                photos: this.selectDiversePhotos(4),
                textContent: {
                    destination: this.detectDestination() || 'My Journey'
                }
            });
            photoIndex += 4;
        }

        // 2. Title/intro page
        const titleLayout = this.getLayout('title-hero');
        if (titleLayout) {
            pages.push({
                layout: titleLayout,
                photos: [this.findBestHeroPhoto(this.photos.slice(photoIndex))] || [this.photos[0]],
                textContent: {
                    destination: this.detectDestination() || 'Adventure Awaits'
                }
            });
            photoIndex += 1;
        }

        // 3. Process each location group
        let locationNumber = 1;
        locationGroups.forEach((groupPhotos, location) => {
            if (groupPhotos.length >= 2) { // Relaxed constraint from 3 to 2 for better flow
                // Add location header page
                const locationLayout = this.getLayout('location-page');
                if (locationLayout) {
                    pages.push({
                        layout: locationLayout,
                        photos: [this.findBestHeroFromGroup(groupPhotos)],
                        textContent: {
                            locationTitle: location || `Place ${this.numberToWord(locationNumber)}`,
                            description: ''
                        }
                    });
                }

                // Add gallery pages for remaining photos
                const remainingPhotos = groupPhotos.slice(1);
                this.addTravelGalleryPages(pages, remainingPhotos);

                locationNumber++;
            } else if (groupPhotos.length === 1) {
                this.addTravelGalleryPages(pages, groupPhotos);
            }
        });

        // 4. Closing page
        const closingLayout = this.getLayout('closing-grid');
        if (closingLayout) {
            const closingPhotos = this.selectFinalPhotos(4);
            pages.push({
                layout: closingLayout,
                photos: closingPhotos,
                textContent: {
                    thanks: 'The End'
                }
            });
        }

        return pages;
    }

    groupPhotosByLocation() {
        const groups = new Map();

        this.photos.forEach(photo => {
            const location = photo.metadata?.location ||
                photo.metadata?.geoLocation?.name ||
                this.extractDateGroup(photo) ||
                'Unknown Location';

            if (!groups.has(location)) {
                groups.set(location, []);
            }
            groups.get(location).push(photo);
        });

        return groups;
    }

    extractDateGroup(photo) {
        if (photo.metadata?.dateTaken) {
            const date = new Date(photo.metadata.dateTaken);
            // Group by Day if we have start date, else just Date String
            return date.toLocaleDateString();
        }
        return null;
    }

    addTravelGalleryPages(pages, photos) {
        while (photos.length > 0) {
            let layout = null;
            let take = 0;

            if (photos.length >= 4) {
                // Try to find a layout for 4+ photos
                layout = this.getLayout('hero-three-thumbnails') ||
                    this.getLayout('gallery-four-large') ||
                    this.findLayoutWithSlotCount(4) ||
                    this.findLayoutWithSlotCount(5) ||
                    this.findLayoutWithSlotCount(6);
                if (layout) take = layout.photoSlots.length;
            } else if (photos.length === 3) {
                layout = this.getLayout('tall-left-stacked-right') || this.findLayoutWithSlotCount(3);
                if (layout) take = layout.photoSlots.length;
            } else if (photos.length === 2) {
                layout = this.getLayout('two-tall-photos') ||
                    this.getLayout('duo-horizontal') ||
                    this.findLayoutWithSlotCount(2);
                take = 2;
            }

            // If still no layout found (e.g. only 1 photo left or above failed), fallback to 1
            if (!layout) {
                layout = this.getLayout('single-centered') ||
                    this.getLayout('full-bleed-hero') ||
                    this.findLayoutWithSlotCount(1);
                take = 1;
            }

            if (layout) {
                // Determine how many to take based on layout
                // In case findLayoutWithSlotCount returned something with specific slot count
                const actualTake = Math.min(photos.length, layout.photoSlots ? layout.photoSlots.length : take);

                pages.push({
                    layout: layout,
                    photos: photos.splice(0, actualTake),
                    textContent: this.generateDefaultText(layout)
                });
            } else {
                console.warn('PhotoAssigner: No valid gallery layouts found. Stopping.');
                break;
            }
        }
    }

    selectTravelGalleryLayout(remainingPhotos) {
        if (remainingPhotos >= 4) return 'hero-three-thumbnails';
        if (remainingPhotos === 3) return 'tall-left-stacked-right';
        if (remainingPhotos === 2) return 'two-tall-photos';
        return 'single-centered';
    }

    selectDiversePhotos(count) {
        const selected = [];
        const available = [...this.photos];

        for (let i = 0; i < count && available.length > 0; i++) {
            const idx = Math.floor(i * available.length / count);
            if (available[idx]) {
                selected.push(available.splice(idx, 1)[0]);
            } else {
                selected.push(available.shift());
            }
        }

        return selected;
    }

    findBestHeroFromGroup(photos) {
        return photos.find(p =>
            p.metadata?.orientation === 'landscape'
        ) || photos[0];
    }

    selectFinalPhotos(count) {
        return this.photos.slice(-count);
    }

    detectDestination() {
        for (const photo of this.photos) {
            if (photo.metadata?.location) {
                return photo.metadata.location;
            }
            if (photo.metadata?.geoLocation?.country) {
                return photo.metadata.geoLocation.country;
            }
        }
        return null; // Let UI handle default
    }

    numberToWord(num) {
        const words = ['One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
        return words[num - 1] || num.toString();
    }
}
