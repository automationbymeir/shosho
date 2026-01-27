/**
 * DOM Manipulation Utilities
 */

export const DomUtils = {
    /**
     * Create an element with class and text
     * @param {string} tag 
     * @param {string} className 
     * @param {string} text 
     * @returns {HTMLElement}
     */
    createElement(tag, className, text = '') {
        const el = document.createElement(tag);
        if (className) el.className = className;
        if (text) el.textContent = text;
        return el;
    },

    /**
     * Clear all children from an element
     * @param {HTMLElement} element 
     */
    clear(element) {
        while (element.firstChild) {
            element.removeChild(element.firstChild);
        }
    }
};
