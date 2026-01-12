/**
 * 'Gemini' Photo Ratio AI Layout Engine
 * Calculates optimal layouts based on photo aspect ratios.
 */

export class LayoutEngine {
    constructor() {
        this.layouts = {
            // 1 Photo
            '1-landscape': { type: 'grid', slots: [{ x: 10, y: 10, w: 80, h: 60 }] },
            '1-portrait': { type: 'grid', slots: [{ x: 25, y: 5, w: 50, h: 90 }] },
            '1-full': { type: 'grid', slots: [{ x: 0, y: 0, w: 100, h: 100 }] },
            '1-square': { type: 'grid', slots: [{ x: 25, y: 25, w: 50, h: 50 }] },

            // 2 Photos
            '2-landscape-stack': {
                type: 'grid',
                slots: [
                    { x: 10, y: 10, w: 80, h: 38 },
                    { x: 10, y: 52, w: 80, h: 38 }
                ]
            },
            '2-side-by-side': {
                type: 'grid',
                slots: [
                    { x: 5, y: 20, w: 42.5, h: 60 },
                    { x: 52.5, y: 20, w: 42.5, h: 60 }
                ]
            },
            '2-diagonal': {
                type: 'grid',
                slots: [
                    { x: 5, y: 5, w: 55, h: 55 },
                    { x: 40, y: 40, w: 55, h: 55 } // overlapped z-index handled by dom order
                ]
            },

            // 3 Photos
            '3-hero-left': {
                type: 'grid',
                slots: [
                    { x: 5, y: 5, w: 45, h: 90 },     // Left Hero
                    { x: 55, y: 5, w: 40, h: 42.5 },  // Top Right
                    { x: 55, y: 52.5, w: 40, h: 42.5 } // Bottom Right
                ]
            },
            '3-grid-uniform': {
                type: 'grid',
                slots: [
                    { x: 5, y: 30, w: 28, h: 40 },
                    { x: 36, y: 30, w: 28, h: 40 },
                    { x: 67, y: 30, w: 28, h: 40 }
                ]
            },
            '3-stack-left': {
                type: 'grid',
                slots: [
                    { x: 5, y: 5, w: 40, h: 28 },
                    { x: 5, y: 36, w: 40, h: 28 },
                    { x: 5, y: 67, w: 40, h: 28 }
                ]
            },
            '3-row-stack': {
                type: 'grid',
                slots: [
                    { x: 5, y: 5, w: 90, h: 28 },
                    { x: 5, y: 36, w: 90, h: 28 },
                    { x: 5, y: 67, w: 90, h: 28 }
                ]
            },

            // 4 Photos
            '4-grid': {
                type: 'grid',
                slots: [
                    { x: 5, y: 5, w: 42.5, h: 42.5 },
                    { x: 52.5, y: 5, w: 42.5, h: 42.5 },
                    { x: 5, y: 52.5, w: 42.5, h: 42.5 },
                    { x: 52.5, y: 52.5, w: 42.5, h: 42.5 }
                ]
            },
            '4-hero-center': {
                type: 'grid',
                slots: [
                    { x: 25, y: 15, w: 50, h: 70 }, // Center Hero
                    { x: 5, y: 5, w: 15, h: 25 },   // Top Left
                    { x: 80, y: 5, w: 15, h: 25 },  // Top Right
                    { x: 42.5, y: 90, w: 15, h: 10 } // Bottom labelish? Or just another photo
                ]
            },

            // 5 Photos
            '5-collage': {
                type: 'grid',
                slots: [
                    { x: 5, y: 5, w: 45, h: 45 },
                    { x: 50, y: 5, w: 45, h: 45 },
                    { x: 5, y: 50, w: 30, h: 45 },
                    { x: 35, y: 50, w: 30, h: 45 },
                    { x: 65, y: 50, w: 30, h: 45 }
                ]
            }
        };
    }

    /**
     * Generates a layout for a set of photos.
     * @param {Array<{id: string, ratio: number}>} photos
     * @returns {Object} Layout definition
     */
    generateLayout(photos) {
        const count = photos.length;
        if (count === 0) return null;

        // Default logic (First best fit)
        // We can just rely on getNextLayout starting from null/undefined
        return this.getNextLayout(photos, null);
    }

    /**
     * Cycles to the next valid layout for the photo count.
     */
    getNextLayout(photos, currentLayoutName) {
        const count = photos.length;
        if (count === 0) return null;

        // Find all templates that match this count
        // For 4+, we use dynamic only for now, or could define static 4s.
        // Simple heuristic: key starts with "N-"
        const keys = Object.keys(this.layouts).filter(k => k.startsWith(`${count}-`));

        if (keys.length === 0) {
            // Fallback to dynamic loop
            return this.generateDynamicGrid(photos);
        }

        let nextIndex = 0;
        if (currentLayoutName) {
            const currIdx = keys.indexOf(currentLayoutName);
            if (currIdx > -1) {
                nextIndex = (currIdx + 1) % keys.length;
            }
        }

        return this.createSlotsFromGrid(keys[nextIndex], photos);
    }

    createSlotsFromGrid(key, photos) {
        const template = this.layouts[key];
        if (!template) return null;

        const slots = photos.map((photo, index) => {
            const slotDef = template.slots[index % template.slots.length];
            return {
                photoId: photo.id,
                x: slotDef.x,
                y: slotDef.y,
                width: slotDef.w,
                height: slotDef.h
            };
        });

        return {
            name: key,
            slots: slots
        };
    }

    // Dynamic Grid Generator for any number of photos
    generateDynamicGrid(photos) {
        const count = photos.length;
        // Calculate optimal cols/rows (e.g., 4 -> 2x2, 5 -> 3x2, 6 -> 3x2 or 2x3)
        // Heuristic: Try to keep aspect ratio of the GRID similar to page (Landscape)

        let cols = Math.ceil(Math.sqrt(count));
        let rows = Math.ceil(count / cols);

        // Adjust for specific counts to look better
        if (count === 4) { cols = 2; rows = 2; }
        if (count === 5) { cols = 3; rows = 2; } // 3 top, 2 bottom? or Grid with empty spot. 
        // Simple Grid Logic: Center the last row if incomplete? 
        // For existing legacy parity, let's just do valid X/Y grids.

        if (cols * rows < count) rows++; // Ensure enough slots

        const slots = [];
        const gap = 2;
        const totalW = 100 - (gap * 2); // 2% margin sides
        const totalH = 100 - (gap * 2); // 2% margin top/bottom

        const cellW = (totalW - (gap * (cols - 1))) / cols;
        const cellH = (totalH - (gap * (rows - 1))) / rows;

        for (let i = 0; i < count; i++) {
            const col = i % cols;
            const row = Math.floor(i / cols);

            // Center the last row if it has fewer items
            let xOffset = 0;
            const itemsInLastRow = count % cols || cols;
            const isLastRow = row === rows - 1;

            if (isLastRow && itemsInLastRow < cols) {
                const emptySpace = (cols - itemsInLastRow) * (cellW + gap);
                xOffset = emptySpace / 2;
            }

            // Assign photo ID
            const photoId = photos[i] ? photos[i].id : null;

            slots.push({
                photoId: photoId,
                x: gap + (col * (cellW + gap)) + xOffset,
                y: gap + (row * (cellH + gap)),
                width: cellW,
                height: cellH
            });
        }
        return { name: `dynamic-${count}`, slots: slots };
    }
}

export const layoutEngine = new LayoutEngine();
