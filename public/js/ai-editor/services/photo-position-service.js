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
