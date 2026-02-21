export class PhotoPositionService {
    constructor() {
        this.functions = null;
    }

    getFunctions() {
        if (!this.functions && window.firebase) {
            this.functions = firebase.functions();
        }
        return this.functions;
    }

    /**
     * Analyze a photo and get the optimal crop for a specific layout box.
     * @param {string} photoUrl - The URL of the photo.
     * @param {number} photoWidth - Original width of the photo.
     * @param {number} photoHeight - Original height of the photo.
     * @param {object} layoutBox - Target slot dimensions { width, height }.
     * @returns {Promise<object>} - { crop: { x, y, width, height }, analysis: { ... } }
     */
    async getOptimalCrop(photoUrl, photoWidth, photoHeight, layoutBox) {
        try {
            console.log('[DEBUG] getOptimalCrop INITIATED with:', { photoUrl, photoWidth, photoHeight, layoutBox });
            const func = this.getFunctions().httpsCallable('analyzePhotoPosition');
            const result = await func({
                photoUrl,
                width: photoWidth,
                height: photoHeight,
                layoutBox
            });
            return result.data;
        } catch (error) {
            console.error('[PhotoPositionService] Error:', error);
            // Fallback
            return this.calculateCenterCrop({ width: photoWidth, height: photoHeight }, layoutBox);
        }
    }

    /**
     * Analyze a batch of photos synchronously to find their focal points.
     * @param {Array<Object>} photos - [{ id, url, width, height }]
     * @returns {Promise<Object>} - Dictionary of { focalX, focalY } mapped by photo ID
     */
    async batchAnalyzePhotos(photos) {
        try {
            if (!photos || photos.length === 0) return {};
            console.log(`[PhotoPositionService] Batch analyzing ${photos.length} photos...`);

            // To be safe, let's chunk to 50 photos max at a time
            const chunkSize = 50;
            const results = {};

            for (let i = 0; i < photos.length; i += chunkSize) {
                const chunk = photos.slice(i, i + chunkSize);
                const func = this.getFunctions().httpsCallable('analyzeBatchPhotoPositions');
                const result = await func({ photos: chunk });
                if (result.data) {
                    Object.assign(results, result.data);
                }
            }

            console.log('[PhotoPositionService] Batch analysis complete.', results);
            return results;
        } catch (error) {
            console.error('[PhotoPositionService] Batch Error:', error);
            return {};
        }
    }

    calculateCenterCrop(photo, layoutBox) {
        const photoAspect = photo.width / photo.height;
        const boxAspect = layoutBox.width / layoutBox.height;
        let cropWidth, cropHeight;
        if (photoAspect > boxAspect) {
            cropHeight = photo.height;
            cropWidth = Math.round(cropHeight * boxAspect);
        } else {
            cropWidth = photo.width;
            cropHeight = Math.round(cropWidth / boxAspect);
        }
        return {
            crop: {
                x: Math.round((photo.width - cropWidth) / 2),
                y: Math.round((photo.height - cropHeight) / 2),
                width: cropWidth,
                height: cropHeight
            },
            fallback: true
        };
    }
}

export const photoPositionService = new PhotoPositionService();
