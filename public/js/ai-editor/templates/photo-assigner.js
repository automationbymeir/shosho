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
     * @returns {Array} Array of { layout, photos, textContent }
     */
    assignPhotos() {
        const strategy = this.config.photoAssignmentRules?.groupingStrategy || 'sequential';

        if (strategy === 'by_category_similarity') {
            return this.assignPhotosByCategory();
        } else if (strategy === 'chronological_by_location') {
            return this.assignPhotosByLocation();
        }

        // Default Sequential Logic
        const pages = [];
        let remainingPhotos = [...this.photos];
        const sequence = this.config.defaultPageSequence;

        // ... existing sequential logic ...
        // (Since I'm replacing the whole method block, I need to keep the sequential part or move it to a helper)

        // Re-implementing sequential logic here for clarity as fallback
        const heroIndex = this.findBestHeroIndex(remainingPhotos);
        let heroPhoto = null;
        if (heroIndex !== -1) {
            heroPhoto = remainingPhotos[heroIndex];
            remainingPhotos.splice(heroIndex, 1);
        } else if (remainingPhotos.length > 0) {
            heroPhoto = remainingPhotos.shift();
        }

        const coverLayout = this.getLayout('cover') || this.getLayout('cover-hero'); // Fallback for new template
        if (coverLayout) {
            pages.push({
                layout: coverLayout,
                photos: [heroPhoto].filter(Boolean),
                textContent: this.config.autoGenerateText?.defaultTitles?.cover
                    ? { title: this.config.autoGenerateText.defaultTitles.cover[0] }
                    : { title: 'Our Love Story' }
            });
        }

        const bodySequence = sequence.filter(s => s.layoutId !== 'cover' && s.layoutId !== 'cover-hero' && s.layoutId !== 'thank-you' && s.layoutId !== 'single-hero-centered');

        for (const seqItem of bodySequence) {
            if (remainingPhotos.length === 0) break;
            const layout = this.getLayout(seqItem.layoutId);
            if (!layout) continue;

            const slotsCount = layout.photoSlots ? layout.photoSlots.length : 0;
            if (remainingPhotos.length >= slotsCount) {
                const pagePhotos = remainingPhotos.splice(0, slotsCount);
                pages.push({
                    layout: layout,
                    photos: pagePhotos,
                    textContent: this.generateDefaultText(layout)
                });
            }
        }

        while (remainingPhotos.length > 0) {
            // Overflow logic
            // Try to use gallery layouts if available
            if (remainingPhotos.length >= 2) {
                const layout = this.getLayout('two-photos-vertical') || this.getLayout('duo-horizontal');
                const pagePhotos = remainingPhotos.splice(0, 2);
                if (layout) pages.push({ layout, photos: pagePhotos, textContent: this.generateDefaultText(layout) });
            } else {
                const layout = this.getLayout('story-right-photo') || this.getLayout('about-studio'); // safe fallback
                const pagePhotos = remainingPhotos.splice(0, 1);
                if (layout) pages.push({ layout, photos: pagePhotos, textContent: this.generateDefaultText(layout) });
                else remainingPhotos = []; // prevent infinite loop if no fallback
            }
        }

        // Closing Page
        const closingLayout = this.getLayout('thank-you') || this.getLayout('single-hero-centered');
        if (closingLayout) {
            pages.push({
                layout: closingLayout,
                photos: [],
                textContent: this.generateDefaultText(closingLayout)
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
        if (layout.textElements) {
            layout.textElements.forEach(te => {
                content[te.elementId] = te.placeholder;
                if (te.children) {
                    te.children.forEach(c => content[c.elementId] = c.placeholder);
                }
            });
        }
        return content;
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
            const layoutId = this.selectTravelGalleryLayout(photos.length);
            const layout = this.getLayout(layoutId);
            if (!layout) break;

            const slotCount = layout.photoSlots.length;

            const pagePhotos = photos.splice(0, slotCount);
            pages.push({
                layout: layout,
                photos: pagePhotos,
                textContent: this.generateDefaultText(layout)
            });
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
