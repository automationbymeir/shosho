/**
 * Input Validators
 */

export const Validators = {
    /**
     * Validate an email address
     * @param {string} email 
     * @returns {boolean}
     */
    isValidEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    },

    /**
     * Check if a value is a non-empty string
     * @param {any} str 
     * @returns {boolean}
     */
    isNonEmptyString(str) {
        return typeof str === 'string' && str.trim().length > 0;
    },

    /**
     * Validate a photo object structure
     * @param {Object} photo 
     * @returns {boolean}
     */
    isValidPhoto(photo) {
        return photo && typeof photo.id === 'string' && typeof photo.url === 'string';
    }
};
