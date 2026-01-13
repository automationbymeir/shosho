/**
 * AI Director
 * Orchestrates the automated book creation process using Gemini Agents.
 */
import { store } from './state.js';
import { geminiService } from './gemini-banana-service.js';
import { layoutEngine } from './layout-engine.js';
import { googlePhotosService } from './google-photos-service.js'; // to fetch content if needed

class AIDirector {
    constructor() {
        this.isWorking = false;
    }

    /**
     * Main Entry Point: Create a full album from selected photos
     * @param {Array} photos Array of photo objects from store
     * @param {string} userPrompt Theme instructions (e.g. "Beach Vacation")
     */
    async magicCreate(photos, userPrompt) {
        if (this.isWorking) return;
        this.isWorking = true;
        this.log("Starting Magic Create (Nano Banana Edition)...");

        try {
            // STEP 1: PREPARE AND "SEE" PHOTOS
            if (photos.length === 0) throw new Error("No photos selected.");

            this.log(`Step 1: Reading ${photos.length} photos for Vision Analysis...`);

            // Limit to 16 for vision context window efficiency, though 1.5 Pro handles many.
            const visionPhotos = photos.slice(0, 16);
            const imageBase64s = await this.fetchImagesAsBase64(visionPhotos);

            this.log("Step 2: Analyzing Visuals (Nano Banana Curator)...");

            // Fetch available frames for context
            const availableFrames = window.PAGE_FRAMES
                ? window.PAGE_FRAMES.map(f => `${f.id} (${f.name})`).join(', ')
                : "frame-classic-gold, frame-modern-bold, frame-elegant-serif";

            // CREATIVE VISION PROMPT
            const analysisPrompt = `
                You are "Nano Banana", an elite, avant-garde Design Intelligence.
                I am showing you ${imageBase64s.length} photos from a user's collection.
                The user's intent is: "${userPrompt}".

                **YOUR MISSION:**
                1. **VIBE CHECK**: Look deeply at the photos. What is the *real* mood? Is it sunny/vibrant? Dark/cinematic? Soft/pastel? Chaotic/fun?
                2. **VISUAL CLUSTERING**: Group these photos into Double-Page Spreads (Pages) based on their *visual* content and time. 
                   - Put similar "scenes" together (e.g. all food shots, all beach shots).
                3. **DESIGN GENERATION**:
                   - **Background**: Describe a *unique, artistic* background texture that perfectly complements the specific colors and mood you see. 
                     - DO NOT be generic. 
                     - Example: "A textured oil painting in varying shades of deep teal and burnt orange, mimicking the sunset shadows seen in the photos."
                   - **Frame**: selected from [${availableFrames}]. Pick the one that fits the vibe.
                4. **STORYTELLING**:
                   - Title: A creative, non-generic title.
                   - Captions: Write short, witty, or heartfelt captions based on what is *actually happening* in the photos.

                Return JSON EXACTLY:
                {
                    "bookTitle": "String",
                    "bookSubtitle": "String",
                    "visualStyleDescription": "String (The specific prompt for the background generator)",
                    "suggestedFrameId": "String (id from list)",
                    "pages": [
                        { 
                          "pageId": Number, 
                          "photoIndices": [Number, Number...], 
                          "caption": "String" 
                        }
                    ]
                }
            `;

            // Call Gemini with REAL IMAGES
            const analysis = await geminiService.analyzePhotos(analysisPrompt, imageBase64s);
            console.log("Nano Banana Analysis:", analysis);

            // STEP 3: GENERATE ASSETS
            this.log("Step 3: Dreaming up the Background...");

            // Use the AI's *specific* visual description for the background
            const bgPrompt = `Artistic texture background. ${analysis.visualStyleDescription}. High resolution, seamless, no text, abstract art style.`;
            const bgUrl = await geminiService.generateImage(bgPrompt);

            // Frame Validation
            let frameId = analysis.suggestedFrameId;
            if (window.PAGE_FRAMES && !window.PAGE_FRAMES.find(f => f.id === frameId)) {
                frameId = window.PAGE_FRAMES[0].id;
            }

            // STEP 4: ASSEMBLE
            this.log("Step 4: Assembling Content...");

            // Register Background
            const bgAsset = {
                id: 'ai_bg_' + Date.now(),
                url: bgUrl,
                type: 'background',
                source: 'gemini-nano-banana',
                name: 'Nano Art: ' + (analysis.visualStyleDescription?.substring(0, 20) || 'Custom')
            };
            store.state.assets.backgrounds.push(bgAsset);

            // Update Cover
            if (store.state.cover) {
                store.state.cover.title = analysis.bookTitle || userPrompt;
                store.state.cover.subtitle = analysis.bookSubtitle || "Curated by Nano Banana";
                store.notify('cover', store.state.cover);
            }

            // Build Pages
            if (analysis.pages && Array.isArray(analysis.pages)) {
                analysis.pages.forEach((plan, idx) => {
                    const pagePhotos = plan.photoIndices
                        .map(i => visionPhotos[i]) // Map back to the vision set we sent (indices must match sent array)
                        .filter(p => p);

                    if (pagePhotos.length === 0) return;

                    store.addPage();
                    const newPage = store.state.pages[store.state.pages.length - 1];

                    // Apply AI Assets
                    newPage.backgroundId = bgAsset.id;
                    newPage.frameId = frameId;

                    // Layout
                    newPage.layout = layoutEngine.generateLayout(pagePhotos);

                    // Typography
                    if (plan.caption) {
                        const textElement = {
                            id: `txt_${Date.now()}_${idx}`,
                            type: 'text',
                            content: plan.caption,
                            x: 10,
                            y: 90,
                            width: 80,
                            height: 8,
                            fontSize: 16,
                            align: 'center',
                            fontFamily: 'Playfair Display',
                            color: '#1a1a1a',
                            styleId: 'caption-default'
                        };
                        if (!newPage.elements) newPage.elements = [];
                        newPage.elements.push(textElement);
                    }
                });
            }

            store.notify('pages', store.state.pages);
            store.notify('assets', store.state.assets);
            this.log("Magic Create Complete!");
            alert("✨ Nano Banana has spoken! Album Created.");

        } catch (e) {
            console.error("AI Director Error:", e);
            alert("AI Magic Failed: " + e.message);
        } finally {
            this.isWorking = false;
        }
    }

    /**
     * Helper: Fetch photo URLs and convert to Base64
     * @param {Array} photos 
     * @returns {Promise<Array<string>>}
     */
    async fetchImagesAsBase64(photos) {
        const promises = photos.map(async (p) => {
            try {
                // Use thumbnailUrl if available (faster), else url
                // Note: Google Photos URLs might need proxying if CORS is an issue, 
                // but usually thumbnail links (lh3.googleusercontent.com) are permissible for <img>.
                // For fetch(), we might hit CORS. 
                // If CORS fails, we might need to rely on the backend or a proxy.
                // Assuming standard "blob fetch" works for loaded images or permitted domains.
                const url = p.thumbnailUrl || p.url;
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn(`Failed to fetch image ${p.id} for analysis`, e);
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results.filter(r => r !== null);
    }

    log(msg) {
        console.log(`[AI Director] ${msg}`);
        // Optionally update a UI status element
        const statusEl = document.getElementById('ai-status');
        if (statusEl) statusEl.textContent = msg;
    }
}

export const aiDirector = new AIDirector();
