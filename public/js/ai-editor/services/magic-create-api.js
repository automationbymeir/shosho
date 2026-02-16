
// public/js/ai-editor/services/magic-create-api.js

/**
 * Client for interacting with the Magic Create Backend.
 * Replaces direct calls to Gemini with structured API requests.
 */

// In production this would be an env var. For now, we point to localhost.
// Note: When running locally, ensure backend is running continuously.
const API_BASE = "http://127.0.0.1:8001";

export class MagicCreateApi {
    constructor() {
        this.baseUrl = API_BASE;
    }

    /**
     * Send a Magic Create request to the backend.
     * @param {Object} request - The creation parameters
     * @param {string} request.prompt - User description
     * @param {string} request.user_id - User identifier
     * @param {number} [request.max_pages=20]
     */
    async create(request) {
        // Correct the request format to match backend expectations
        // request.photos usually comes in as just {id, url, ...} 

        // IMPORTANT: Ensure request.photos has clean IDs that match store.state.assets.photos
        // The backend expects key "photos" which is array of {id, url, ...}

        const photoData = request.photos.map(p => ({
            id: p.id,
            url: p.url || p.rawBaseUrl,
            thumbnailUrl: p.thumbnailUrl,
            rawBaseUrl: p.rawBaseUrl,
            name: p.name || p.filename
        }));

        const cleanRequest = {
            user_id: request.user_id || 'web_user',
            prompt: request.prompt || '',
            photos: photoData, // Send clean photo data
            max_pages: request.max_pages || 10,
            photos_per_page: request.photos_per_page || 3
        };

        try {
            console.log('[MagicCreateAPI] Sending request:', cleanRequest);
            const response = await fetch(`${this.baseUrl}/magic/create`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(cleanRequest)
            });

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Magic Create failed: ${response.status} - ${err}`);
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('[MagicCreateAPI] Request error:', error);
            throw error;
        }
    }

    /**
     * Get available album styles.
     */
    async getStyles() {
        try {
            const response = await fetch(`${this.baseUrl}/magic/styles`);
            if (!response.ok) throw new Error('Failed to fetch styles');
            const data = await response.json();
            return data.styles;
        } catch (error) {
            console.warn('[MagicCreateAPI] Styles fetch failed, returning default', error);
            return [
                { id: 'modern', name: 'Modern', description: 'Clean and contemporary' },
                { id: 'classic', name: 'Classic', description: 'Timeless elegance' }
            ];
        }
    }

    /**
     * Preview theme without full generation
     */
    async preview(request) {
        // Phase 1: Not fully implemented in backend yet, fallback to create
        return this.create({ ...request, max_pages: 1 });
    }
}

// Singleton instance
export const magicCreateApi = new MagicCreateApi();
