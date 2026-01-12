/**
 * Shoso App Configuration
 * 
 * IMPORTANT: In a production environment, these values should be injected 
 * via environment variables or fetched from a secure backend.
 */

const SHOSO_CONFIG = {
    GOOGLE_PHOTOS: {
        CLIENT_ID: '982613325804-c98ieqjvg4e92ssb8s81a7tdmjjvj1jo.apps.googleusercontent.com',
        API_KEY: 'AIzaSyCw0jvaapxUWW7zMWSTIzY2cNQf-0GkfPk',
        PROJECT_ID: 'shoso-photobook',
        SCOPES: 'https://www.googleapis.com/auth/photospicker.mediaitems.readonly'
    },
    GEMINI: {
        // Models
        IMAGE_MODEL: 'gemini-pro',
        TEXT_MODEL: 'gemini-pro'
    }
};

window.SHOSO_CONFIG = SHOSO_CONFIG;
