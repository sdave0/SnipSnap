// Utility functions for SnipSnap extension

/**
 * Debounces a function call
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 */
export const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

/**
 * Process template variables in text
 * @param {string} text - Text containing template variables
 * @returns {string} Processed text with variables replaced
 */
export const processTemplate = (text) => {
    const now = new Date();
    return text.replace(/{{(\w+)}}/g, (match, variable) => {
        switch(variable.toLowerCase()) {
            case 'date':
                return now.toLocaleDateString();
            case 'time':
                return now.toLocaleTimeString();
            default:
                return match; // Keep custom variables as is
        }
    });
};

/**
 * Get a light color based on tag color
 * @param {string} color - Base color name
 * @returns {string} Light color hex code
 */
export const getLightColor = color => {
    const colors = {
        red: "#ff7676",
        blue: "#BDD9F2",
        green: "#6ad068",
        yellow: "#F2E8CF"
    };
    return colors[color] || "";
};
