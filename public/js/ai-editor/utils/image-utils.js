/**
 * Image Processing Utilities
 */

export const ImageUtils = {
    /**
     * Get image dimensions from a URL
     * @param {string} url 
     * @returns {Promise<{width: number, height: number}>}
     */
    getImageDimensions(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
            img.onerror = reject;
            img.src = url;
        });
    },

    /**
     * Calculate aspect ratio
     * @param {number} width 
     * @param {number} height 
     * @returns {number}
     */
    getAspectRatio(width, height) {
        if (!height) return 0;
        return width / height;
    }
};
