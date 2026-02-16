
/**
 * Magic Create V2 (Backend Integrated)
 * Orchestrates the AI Design Flow via Python Microservice
 */

import { magicCreateApi } from '../services/magic-create-api.js';

class MagicCreateV2 {
    constructor() {
        this.isProcessing = false;
        this.progressCallback = null;
    }

    /**
     * Run Magic Create Pipeline
     * @param {Array} photos - Array of frontend photo objects
     * @param {string} userPrompt - User's design prompt
     * @param {Function} onProgress - Callback(stage, percent)
     */
    async run(photos, userPrompt = "", onProgress = () => { }) {
        if (this.isProcessing) {
            console.warn('[MagicCreateV2] Already processing');
            return;
        }

        this.isProcessing = true;
        this.progressCallback = onProgress;

        try {
            console.log('[MagicCreateV2] Starting pipeline via Backend API');
            this._updateProgress('Analyzing & Designing...', 10);

            // 1. Prepare Request
            // In a real full-stack app, we might upload IDs. 
            // Here we send metadata or just prompt, and we'll map the result back.
            const request = {
                user_id: 'web_user', // TODO: Real user ID
                prompt: userPrompt || "Auto curated album",
                photos: photos, // Pass the photos array here!
                max_pages: Math.ceil(photos.length / 3) + 2, // Estimate pages
                photos_per_page: 3
            };

            // 2. Call API
            this._updateProgress('Generating Layouts (Gemini)...', 40);
            const response = await magicCreateApi.create(request);

            if (!response.success) {
                throw new Error(response.error || 'Failed to generate album');
            }

            // Backend now returns { success, album_id, theme, pages }
            const pages = response.pages;
            const theme = response.theme;
            const albumId = response.album_id;

            this._updateProgress('Compiling Assets...', 80);

            // 3. Map Backend Response -> Frontend Editor Format
            // Since backend is now fully aligned, we just pass through
            const mappedPages = this._mapBackendToEditor({ pages }, photos);

            this._updateProgress('Ready!', 100);
            return {
                albumId: albumId,
                theme: theme,
                pages: mappedPages
            };

        } catch (error) {
            console.error('[MagicCreateV2] Pipeline failed:', error);
            this._updateProgress('Error: ' + error.message, 0);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    _updateProgress(stage, percent) {
        if (this.progressCallback) {
            this.progressCallback(stage, percent);
        }
    }

    /**
     * Map Backend DesignedPage -> Frontend Editor Page
     */
    _mapBackendToEditor(album, sourcePhotos) {
        // Backend now returns pages in the exact format the render engine expects.
        // We just need to make sure photo IDs are preserved.

        console.log('[MagicCreateV2] Mapping', album.pages.length, 'pages from backend');

        // Pass through pages directly, possibly adding extra metadata if needed
        return album.pages.map(page => ({
            ...page,
            // Ensure ID is unique if not already
            id: page.id || `page_${Math.random().toString(36).substr(2, 9)}`
        }));
    }

    _convertPage(backendPage, sourcePhotos, photoCursor, isCover) {
        // Deprecated: Backend handles this layout logic now 
        return backendPage;
    }
}

export const magicCreateV2 = new MagicCreateV2();
window.magicCreateV2 = magicCreateV2;
