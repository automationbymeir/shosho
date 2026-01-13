
/**
 * Magic Create Module
 * Orchestrates the AI Photo Book creation process using Gemini Nano Banana.
 * Decoupled from main app state for clean architecture.
 */

window.MagicCreate = class MagicCreate {

    /**
     * Run the Magic Create pipeline.
     * @param {Array} photos - Array of photo objects from the app state
     * @returns {Promise<Object>} - The generated book structure (story, chapters, etc)
     */
    static async run(photos) {
        console.log("[MagicCreate] Starting pipeline with", photos.length, "photos");

        if (!photos || photos.length < 4) {
            throw new Error("Please select at least 4 photos to start Magic Create.");
        }

        try {
            // 1. Fetch Images
            // Use global functions or existing window helpers if available, otherwise implement here.
            // We'll implement a static helper to be self-contained.
            const b64Images = await this.fetchImagesAsBase64(photos);

            if (b64Images.length === 0) {
                throw new Error("No images could be loaded for analysis.");
            }

            // 2. Analyze (Vibe Check + Organization)
            const analysis = await this.analyzePhotos(b64Images);

            // 3. Generate Assets (Backgrounds)
            const bgImage = await this.generateAssets(analysis);

            // 4. Construct Result Object
            const result = {
                success: true,
                story: {
                    title: analysis.storyTitle || "My Photo Story",
                    subtitle: analysis.storySubtitle || "",
                },
                chapters: this.mapChapters(analysis.chapters, photos),
                settings: {
                    frameId: analysis.suggestedFrameId || null,
                    background: bgImage || null, // Blob URL or similar
                    backgroundId: bgImage ? 'custom-ai-' + Date.now() : null
                }
            };

            console.log("[MagicCreate] Pipeline complete:", result);
            return result;

        } catch (e) {
            console.error("[MagicCreate] Failed:", e);
            throw e;
        }
    }

    /**
     * Fetch and encode images to Base64
     */
    static async fetchImagesAsBase64(photos) {
        console.log("[MagicCreate] Fetching images...");
        const promises = photos.slice(0, 16).map(async (p, idx) => {
            try {
                const url = p.thumbnailUrl || p.baseUrl || p.url;
                if (!url) return null;

                const res = await fetch(url);

                if (!res.ok) {
                    console.warn(`[MagicCreate] Failed to fetch photo ${idx} (${url}): ${res.status}`);
                    return null;
                }

                const contentType = res.headers.get("content-type");
                if (!contentType || !contentType.startsWith("image/")) {
                    console.warn(`[MagicCreate] Photo ${idx} is not an image: ${contentType}`);
                    return null;
                }

                const blob = await res.blob();
                return new Promise(resolve => {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                        const b64 = reader.result;
                        // Extra safety: Verify it looks like an image
                        if (typeof b64 === 'string' && b64.startsWith("data:image/")) {
                            resolve(b64);
                        } else {
                            console.warn(`[MagicCreate] Encoded data for photo ${idx} is invalid:`, b64.substring(0, 50));
                            resolve(null);
                        }
                    };
                    reader.onerror = () => resolve(null);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn(`[MagicCreate] Failed to fetch photo ${idx}`, e);
                return null;
            }
        });
        const results = await Promise.all(promises);
        return results.filter(Boolean);
    }

    /**
     * Call Gemini for analysis
     */
    static async analyzePhotos(b64Images) {
        console.log("[MagicCreate] Analyzing photos...");

        // Ensure service is ready (assumes window.geminiService is exposed from index.html)
        if (!window.geminiService) throw new Error("Gemini Service not found (geminiService).");

        // Init if needed (using the known key)
        window.geminiService.init("AIzaSyCw0jvaapxUWW7zMWSTIzY2cNQf-0GkfPk");

        // get available frames from global if possible
        const frameOptions = window.PAGE_FRAMES ? window.PAGE_FRAMES.map(f => f.id).join(", ") : "simple, ornate, modern";

        const prompt = `
        You are an expert creative director. 
        Analyze these photos for a photo book.
        1. **Vibe Check**: Identify the theme, mood, and colors.
        2. **Storytelling**: Group them into logical chapters.
        3. **Design**: Describe a unique background texture.
        4. **Frame**: Choose the best frame from: [${frameOptions}].
        5. **Typography**: Create a title and subtitle.

        Return JSON:
        {
          "storyTitle": "string",
          "storySubtitle": "string",
          "visualStyleDescription": "string (texture prompt)",
          "suggestedFrameId": "string",
          "chapters": [ { "title": "string", "subtitle": "string", "photoIndices": [0, 1] } ]
        }
        `;

        return await window.geminiService.analyzePhotos(prompt, b64Images);
    }

    /**
     * Generate custom assets
     */
    static async generateAssets(analysis) {
        if (!analysis.visualStyleDescription) return null;
        console.log("[MagicCreate] Generating background...");
        // Append safeguards for texture usage
        const prompt = `${analysis.visualStyleDescription} seamless texture, high resolution wallpaper, abstract, no text, no faces`;
        return await window.geminiService.generateImage(prompt);
    }

    /**
     * Helper to map analysis indices back to photo objects
     */
    static mapChapters(aiChapters, sourcePhotos) {
        if (!Array.isArray(aiChapters)) return [];
        return aiChapters.map((ch, idx) => ({
            id: `ch-${idx}`,
            name: ch.title || `Chapter ${idx + 1}`,
            subtitle: ch.subtitle || "",
            photoIndices: ch.photoIndices,
            photos: (ch.photoIndices || []).map(i => sourcePhotos[i]).filter(Boolean)
        }));
    }
}
