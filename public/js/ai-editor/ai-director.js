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
        this.log("Starting Magic Create...");

        try {
            // STEP 0: Prepare Photos (Get Base64s for Analysis)
            // Ideally we send low-res thumbnails to save bandwidth
            // For now, assume we take first 10 for analysis to define the structure
            this.log("Step 1: Analyzing Photos (Curator Agent)...");

            // Extract base64/url data. If Google Photo URL, we might need to fetch blo or send URL if model supports
            // Gemini 1.5 accepts image bytes. We need to fetch.
            // Simplified: We verify we have some photos.
            if (photos.length === 0) throw new Error("No photos selected.");

            // We'll define a 'plan' prompt
            const analysisPrompt = `
                You are a professional Photo Book Curator.
                I have ${photos.length} photos.
                The user's theme is: "${userPrompt}".
                
                Please group these photos into Logical Double-Page Spreads (Pages).
                Each spread should have 1 to 4 photos.
                Return a JSON object with this structure:
                {
                    "themeKeywords": ["keyword1", "keyword2"],
                    "visualStyleDescription": "description for image generator",
                    "pages": [
                        { "pageId": 1, "photoIndices": [0, 1, 2], "caption": "Fun in the sun" },
                        ...
                    ]
                }
                
                Ignore photo content verification for now, just pretend you see them and group by hypothetical timestamps or logic.
                (Note: In real production, we'd send the image bytes. Here we trust the array indices).
            `;

            // Call Gemini (Text-only mode for speed/demo if we don't upload bytes, 
            // OR we upload bytes if we have them. Let's try Text logic first for robustness).
            const analysis = await geminiService.analyzePhotos(analysisPrompt, []); // Empty images for now to save bandwidth

            console.log("AI Plan:", analysis);
            this.log("Step 2: Generating Assets (Art Director)...");

            // STEP 2: Generate Theme Assets
            // Background
            const bgPrompt = `High quality, texture background for a photo book. Theme: ${analysis.visualStyleDescription || userPrompt}. seamless, artistic, faint pattern.`;
            const bgUrl = await geminiService.generateImage(bgPrompt);

            // Frame (Simulated)
            // We could generate a frame, or just pick a style. Let's generate a secondary 'sticker' or graphic
            // const stickerUrl = await geminiService.generateImage(`Sticker/Clipart for ${userPrompt}, transparent background`);

            // STEP 3: Assemble Book
            this.log("Step 3: Assembling Album...");

            // Clear existing pages? Or append? Let's Append.
            // Actually, "Magic Create" typically implies a fresh start or specific section.
            // Let's create new pages.

            // Register the new Background
            const bgAsset = {
                id: 'ai_bg_' + Date.now(),
                url: bgUrl,
                type: 'background',
                source: 'gemini'
            };
            store.state.assets.backgrounds.push(bgAsset);

            // Build Pages
            if (analysis.pages && Array.isArray(analysis.pages)) {
                analysis.pages.forEach((plan, idx) => {
                    // map indices to actual photo objects
                    const pagePhotos = plan.photoIndices
                        .map(i => photos[i])
                        .filter(p => p); // ensure existence

                    if (pagePhotos.length === 0) return;

                    // Create Page
                    store.addPage();
                    const newPage = store.state.pages[store.state.pages.length - 1];

                    // Apply Background
                    newPage.backgroundId = bgAsset.id;

                    // Apply Layout
                    // layoutEngine uses generateLayout(photos)
                    const layout = layoutEngine.generateLayout(pagePhotos);
                    newPage.layout = layout;

                    // Assign Photos to Slots (already done by generateLayout usually, but verifying)
                    // generateLayout returns { name, slots: [{x,y,w,h, photoId}] } where photoId is assigned

                    // Add Caption (Text)
                    if (plan.caption) {
                        // find a text slot or add random text element?
                        // Simplified: Just console log for now, or add a text element if layout supports
                    }
                });
            }

            store.notify('pages', store.state.pages);
            store.notify('assets', store.state.assets);
            this.log("Magic Create Complete!");
            alert("✨ Magic Album Created!");

        } catch (e) {
            console.error("AI Director Error:", e);
            alert("AI Magic Failed: " + e.message);
        } finally {
            this.isWorking = false;
        }
    }

    log(msg) {
        console.log(`[AI Director] ${msg}`);
        // Optionally update a UI status element
        const statusEl = document.getElementById('ai-status');
        if (statusEl) statusEl.textContent = msg;
    }
}

export const aiDirector = new AIDirector();
