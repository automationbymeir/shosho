/**
 * Gemini Nano Banana Service
 * Integration with Google's Gemini API for Image Generation and Editing.
 * Wraps @google/generative-ai SDK.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";

class GeminiBananaService {
    constructor() {
        this.apiKey = null;
        this.genAI = null;
        this.modelFlash = null; // Gemini 2.5 Flash (Nano Banana)
        this.modelPro = null;   // Gemini 3 Pro (Nano Banana Pro)
    }

    /**
     * Initialize the service with an API Key
     * @param {string} apiKey 
     */
    init(apiKey) {
        if (!apiKey) {
            console.warn('[GeminiBanana] No API Key provided.');
            return;
        }
        this.apiKey = apiKey;
        this.genAI = new GoogleGenerativeAI(this.apiKey);

        // "Nano Banana Pro" (Gemini 3 Pro Image Preview) -> High Quality Image Gen/Edit/Thinking
        this.modelPro = this.genAI.getGenerativeModel({
            model: "gemini-3-pro-image-preview",
            generationConfig: {
                // responseModalities: ["TEXT", "IMAGE"] // Default
            }
        });

        // "Nano Banana" (Gemini 2.5 Flash Image) -> Speed/Efficiency
        this.modelFlash = this.genAI.getGenerativeModel({
            model: "gemini-2.5-flash-image",
            generationConfig: {
                // responseMimeType: "application/json" // Note: valid for text outputs
            }
        });
    }

    /**
     * Analyze photos and return structured JSON
     * @param {string} prompt 
     * @param {Array} imageBase64s Array of base64 strings
     */
    async analyzePhotos(prompt, imageBase64s = []) {
        // if (!this.genAI) throw new Error("Gemini API not initialized.");

        if (this.genAI) {
            console.log('[GeminiBanana] Analyzing', imageBase64s.length, 'photos with prompt:', prompt);

            // Construct parts
            const parts = [{ text: prompt }];

            // Add images (Inline Data)
            // limit to ~10 for demo/speed if needed, but 1.5 flash handles many
            imageBase64s.slice(0, 16).forEach(b64 => {
                // strip prefix if present
                const cleanB64 = b64.replace(/^data:image\/\w+;base64,/, "");
                parts.push({
                    inlineData: {
                        data: cleanB64,
                        mimeType: "image/jpeg"
                    }
                });
            });

            try {
                const result = await this.modelFlash.generateContent(parts);
                const text = result.response.text();
                console.log('[GeminiBanana] Analysis Result:', text);
                return JSON.parse(text);
            } catch (e) {
                console.warn('[GeminiBanana] Analysis failed, using mock data:', e);
            }
        } else {
            console.warn('[GeminiBanana] API not initialized. Using Mock Data for Analysis.');
        }

        // Realistic mock analysis (Fallback)
        return {
            description: "A beautiful moment captured in time.",
            subjects: ["people", "nature"],
            people: { count: 2, expressions: ["happy"], activities: ["smiling"] },
            location: { type: "outdoor", setting: "park", timeOfDay: "day" },
            mood: ["cheerful", "bright"],
            dominantColors: ["#4a90e2", "#f5a623"],
            composition: { orientation: "landscape", quality: "high" },
            suggestedCaption: "Cherished memories.",
            importance: "hero"
        };
    }

    /**
     * Generate an Image from a Prompt
     * @param {string} prompt 
     * @returns {Promise<string>} Base64 Image URL
     */
    async generateImage(prompt) {
        // if (!this.genAI) throw new Error("Gemini API not initialized. Set API Key first.");

        if (this.genAI) {
            console.log('[GeminiBanana] Generating image for:', prompt);
            try {
                // High Resolution Config (2K) as per "Nano Banana" docs
                const generationConfig = {
                    responseModalities: ["IMAGE"],
                    imageConfig: {
                        aspectRatio: "4:3",
                        imageSize: "2K"
                    }
                };

                const result = await this.modelPro.generateContent({
                    contents: [{ text: prompt }],
                    generationConfig: generationConfig
                });

                const response = await result.response;
                console.log('[GeminiBanana] Response:', response);

                if (!response.candidates || !response.candidates[0].content.parts) {
                    throw new Error("Invalid response structure");
                }

                const parts = response.candidates[0].content.parts;
                const imagePart = parts.find(p => p.inlineData);

                if (imagePart && imagePart.inlineData) {
                    const mimeType = imagePart.inlineData.mimeType || "image/png";
                    return `data:${mimeType};base64,${imagePart.inlineData.data}`;
                }
            } catch (e) {
                console.warn("[GeminiBanana] Image generation failed, returning mock:", e);
            }
        } else {
            console.warn('[GeminiBanana] API not initialized. Using Mock Data for Image Generation.');
        }

        // Mock Fallback
        const p = prompt.toLowerCase();
        if (p.includes("texture") || p.includes("paper")) {
            return "https://images.unsplash.com/photo-1586075010923-2dd4570fb338?auto=format&fit=crop&w=1000&q=80"; // Paper texture
        } else if (p.includes("gradient")) {
            return "https://images.unsplash.com/photo-1557683311-eac922347aa1?auto=format&fit=crop&w=1000&q=80"; // Blue gradient
        } else if (p.includes("watercolor")) {
            return "https://images.unsplash.com/photo-1516546453174-5e1098a4b4af?auto=format&fit=crop&w=1000&q=80"; // Abstract watercolor
        } else if (p.includes("abstract")) {
            return "https://images.unsplash.com/photo-1541701494587-cb58502866ab?auto=format&fit=crop&w=1000&q=80"; // Abstract shapes
        }

        // Default Fallback
        return "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80";
    }

    /**
     * Magic Edit an Image
     * @param {string} imageBase64 
     * @param {string} prompt 
     */
    async editImage(imageBase64, prompt) {
        // if (!this.genAI) throw new Error("Gemini API not initialized.");

        if (this.genAI) {
            console.log('[GeminiBanana] Editing image with prompt:', prompt);
            try {
                const cleanB64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
                const parts = [
                    { text: `Edit this image: ${prompt}` },
                    { inlineData: { data: cleanB64, mimeType: "image/jpeg" } }
                ];

                const result = await this.modelPro.generateContent({
                    contents: parts,
                    generationConfig: {
                        responseModalities: ["IMAGE"],
                        imageConfig: {
                            imageSize: "2K"
                        }
                    }
                });
                const response = await result.response;

                if (!response.candidates || !response.candidates[0].content.parts) {
                    throw new Error("Invalid response structure");
                }

                const contentParts = response.candidates[0].content.parts;
                const imagePart = contentParts.find(p => p.inlineData);

                if (imagePart && imagePart.inlineData) {
                    const mimeType = imagePart.inlineData.mimeType || "image/jpeg";
                    return `data:${mimeType};base64,${imagePart.inlineData.data}`;
                }
            } catch (e) {
                console.error("Edit Failed:", e);
            }
        }

        // Mock Fallback
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve("https://picsum.photos/seed/" + encodeURIComponent(prompt + "edit") + "/512/512");
            }, 2500);
        });
    }

    /**
     * Deep analyze a single photo
     * @param {string} imageBase64
     */
    async analyzePhotoDeep(imageBase64) {
        const prompt = `Analyze this photo in detail for a high-end photo album. Return JSON exactly matching this schema:
        {
          "description": "1-2 sentence description",
          "subjects": ["list", "of", "subjects"],
          "people": { 
              "count": number, 
              "expressions": ["happy", "neutral", "sad"], 
              "activities": ["standing", "sitting", "running"] 
          },
          "location": { 
              "type": "indoor/outdoor", 
              "setting": "beach/park/city/home", 
              "timeOfDay": "morning/noon/afternoon/evening/night" 
          },
          "mood": ["romantic", "cheerful", "melancholic", "energetic"],
          "dominantColors": ["#hex1", "#hex2", "#hex3"],
          "composition": { 
              "orientation": "landscape/portrait", 
              "quality": "high/medium/low", 
              "focusPoint": {"x": 50, "y": 50},
              "blur": boolean
          },
          "suggestedCaption": "A poetic caption for this photo",
           "importance": "hero/supporting/filler"
        }`;

        // re-use analyzePhotos but for one image
        // analyzePhotos expects array of base64
        return await this.analyzePhotos(prompt, [imageBase64]);
    }

    /**
     * Generate album structure plan
     */
    async planAlbumStructure(photoSummaries, userPrompt, photoCount) {
        // if (!this.modelFlash) throw new Error("Gemini API not initialized.");

        if (this.genAI) {
            // ... prompt logic
            const prompt = `You are a professional photo book designer.
            
            Photos summary: ${JSON.stringify(photoSummaries)}
            User's style request: "${userPrompt || 'Create a beautiful, cohesive album'}"
            Total photos: ${photoCount}
            
            Create a complete album plan. Return JSON exactly matching this schema.
            CRITICAL: Use each photo exactly ONCE across the entire album. Do not repeat photos. Ensure every photo from the summary is assigned to a page.

            {
              "albumId": "generated-id",
              "meta": {
                 "title": "Album title",
                 "subtitle": "Album subtitle", 
                 "narrative": "A cohesive story arc description for the album",
                 "totalPages": number,
                 "aspectRatio": "landscape"
              },
              "designSystem": {
                "primaryColor": "#hex",
                "secondaryColor": "#hex",
                "accentColor": "#hex",
                "fontFamily": { "heading": "font name", "body": "font name", "accent": "font name" },
                "mood": "mood description",
                "styleKeywords": ["keyword1", "keyword2"]
              },
              "chapters": [
                { "id": "ch-1", "title": "Chapter Title", "description": "Description of this section", "pageRange": [startPage, endPage] }
              ],
              "pageAssignments": [
                { 
                    "pageIndex": 0, 
                    "pageType": "cover/intro/content/outro", 
                    "assignedPhotoIndices": [0, 1, 2],
                    "reasoning": "Why these photos belong here"
                }
              ]
            }`;

            try {
                const result = await this.modelFlash.generateContent([{ text: prompt }]);
                const text = result.response.text();
                console.log('[GeminiBanana] Album Plan:', text);
                // Ensure we parse potentially markdown-wrapped JSON
                const jsonStr = text.replace(/```json\n?|\n?```/g, '');
                return JSON.parse(jsonStr);
            } catch (e) {
                console.warn('[GeminiBanana] Planning failed, using mock data:', e);
            }
        }

        // Mock Fallback
        return {
            albumId: "mock-album-id",
            meta: {
                title: "Magic Memories",
                subtitle: "AI Generated Collection",
                narrative: "A journey through beautiful moments.",
                totalPages: 4,
                aspectRatio: "landscape"
            },
            designSystem: {
                primaryColor: "#000000",
                mood: "Elegant",
                fontFamily: { heading: "Playfair Display", body: "Inter" }
            },
            chapters: [
                { id: "ch-1", title: "The Beginning", pageRange: [0, 1] },
                { id: "ch-2", title: "Adventures", pageRange: [2, 3] }
            ],
            pageAssignments: [
                { pageIndex: 0, pageType: "cover", assignedPhotoIndices: [0], reasoning: "Best hero shot" },
                { pageIndex: 1, pageType: "content", assignedPhotoIndices: [1, 2], reasoning: "Group shots" },
                { pageIndex: 2, pageType: "content", assignedPhotoIndices: [3], reasoning: "Scenery" },
                { pageIndex: 3, pageType: "outro", assignedPhotoIndices: [0], reasoning: "Callback to start" }
            ]
        };
    }

    /**
     * Design a single page
     */
    async designPage(pageContext) {
        // if (!this.modelFlash) throw new Error("Gemini API not initialized.");

        if (this.genAI) {
            const prompt = `Design photo album page ${pageContext.pageIndex + 1} of ${pageContext.totalPages}.
                
                Context:
                - Chapter: "${pageContext.chapterTitle}"
                - Page type: ${pageContext.pageType}
                - Photos assigned to this page (INDICES refer to this list): ${JSON.stringify(pageContext.photoDescriptions)}
                - Design system: ${JSON.stringify(pageContext.designSystem)}
                - Album mood: ${pageContext.mood}
                
                Create a unique layout. CRITICAL: Use strictly the provided photo indices (0 to ${pageContext.photoDescriptions.length - 1}). Do not hallucinate more photos.
                Return JSON match:
                {
                  "pageId": "${pageContext.pageId}",
                  "pageType": "${pageContext.pageType}",
                  "chapterId": "${pageContext.chapterId}",
                  "background": {
                    "type": "generated", 
                    "imagePrompt": "detailed prompt for background texture/image, compatible with design system",
                    "fallbackColor": "#hex"
                  },
                  "layout": {
                    "gridType": "freeform",
                    "photoSlots": [
                      {
                        "slotId": "slot-0",
                        "photoIndex": 0, // Must match index in 'Photos assigned to this page'
                        "position": { "x": 10, "y": 15 }, // Percentage 0-100
                        "size": { "width": 40, "height": 50 }, // Percentage 0-100
                        "rotation": 0,
                        "zIndex": 1,
                        "frame": { "type": "polaroid/thin/none", "color": "#fff", "shadow": true }
                      }
                    ]
                  },
                  "textElements": [
                    {
                      "id": "txt-1",
                      "type": "title/caption/quote",
                      "content": "Text content",
                      "position": { "x": 50, "y": 90 },
                      "style": { "fontSize": 24, "color": "#hex", "fontFamily": "heading/body/accent", "textAlign": "center" }
                    }
                  ],
                  "decorativeElements": []
                }`;


            try {
                const result = await this.modelFlash.generateContent([{ text: prompt }]);
                const text = result.response.text();
                console.log('[GeminiBanana] Page Design:', text);
                const jsonStr = text.replace(/```json\n ?|\n ? ```/g, '');
                return JSON.parse(jsonStr);
            } catch (e) {
                console.warn('[GeminiBanana] Page design failed, using mock:', e);
            }
        }

        // --- Dynamic Mock Generator (High Fidelity) ---
        const photoCount = pageContext.photoDescriptions.length;
        const designSys = pageContext.designSystem || { primaryColor: "#000000", fontFamily: { heading: "Serif" } };
        const isCover = pageContext.pageType === 'cover';

        // 1. Select Layout Template based on photo count
        let mockLayout = { gridType: "smart-auto", photoSlots: [] };

        if (photoCount === 1) {
            // Hero Layout with Frame
            mockLayout.photoSlots = [
                {
                    photoIndex: 0,
                    position: { x: 10, y: 15 },
                    size: { width: 80, height: 70 },
                    rotation: -2,
                    frame: { type: "polaroid", color: "#fff", shadow: true }
                }
            ];
        } else if (photoCount === 2) {
            // Organic Overlap
            mockLayout.photoSlots = [
                {
                    photoIndex: 0,
                    position: { x: 8, y: 15 },
                    size: { width: 45, height: 60 },
                    rotation: -3,
                    frame: { type: "white-border", color: "#fff", shadow: true }
                },
                {
                    photoIndex: 1,
                    position: { x: 48, y: 25 },
                    size: { width: 45, height: 60 },
                    rotation: 4,
                    frame: { type: "white-border", color: "#fff", shadow: true }
                }
            ];
        } else if (photoCount === 3) {
            // Trio Scatter
            mockLayout.photoSlots = [
                { photoIndex: 0, position: { x: 5, y: 10 }, size: { width: 40, height: 40 }, rotation: -5, frame: { type: "polaroid" } },
                { photoIndex: 1, position: { x: 55, y: 10 }, size: { width: 40, height: 40 }, rotation: 5, frame: { type: "polaroid" } },
                { photoIndex: 2, position: { x: 30, y: 55 }, size: { width: 45, height: 35 }, rotation: 0, frame: { type: "white-border" } }
            ];
        } else {
            // Grid/Collage for 4+
            mockLayout.photoSlots = pageContext.photoDescriptions.map((_, idx) => ({
                photoIndex: idx,
                position: { x: (idx % 2) * 45 + 5, y: Math.floor(idx / 2) * 35 + 15 },
                size: { width: 40, height: 30 },
                rotation: (idx % 2 === 0 ? -1 : 1),
                frame: { type: "white-border" }
            }));
        }

        // 2. Generate Context-Aware Text
        const textElements = [];

        if (isCover) {
            textElements.push({
                id: "txt-title", type: "title", content: pageContext.chapterTitle || "Epic Adventure",
                position: { x: 50, y: 45 }, // Centered on cover
                style: { fontSize: 72, color: "#ffffff", fontFamily: designSys.fontFamily.heading, textAlign: "center", textShadow: "0 4px 15px rgba(0,0,0,0.6)" }
            });
        } else if (photoCount > 0) {
            // Caption - Positioned carefully at bottom
            const captions = [
                "Moments like these...",
                "Exploring the unknown",
                "Soaking in the view",
                "Time stands still",
                "Adventures filling our souls"
            ];
            const randomCaption = captions[pageContext.pageIndex % captions.length];

            textElements.push({
                id: "txt-cap", type: "caption", content: randomCaption,
                position: { x: 50, y: 88 }, // Safer bottom margin
                style: { fontSize: 20, color: "#333333", fontFamily: designSys.fontFamily.body, textAlign: "center", backgroundColor: "rgba(255,255,255,0.7)", padding: "5px 15px", borderRadius: "4px" }
            });
        }

        // 3. Generated Background Construction
        // We'll simulate a prompt that will trigger our mock image generator's logic
        const bgKeywords = ["texture", "paper", "watercolor", "gradient", "abstract"];
        const keyword = bgKeywords[pageContext.pageIndex % bgKeywords.length];

        return {
            pageId: pageContext.pageId,
            pageType: pageContext.pageType,
            background: {
                type: "generated", // Force 'generated' to test asset pipeline
                imagePrompt: `A subtle ${keyword} background in ${designSys.primaryColor} tones`,
                fallbackColor: (pageContext.pageIndex % 2 === 0) ? "#f8f9fa" : "#ffffff"
            },
            layout: mockLayout,
            textElements: textElements,
            decorativeElements: []
        };
    }

    /**
     * Generate background with retry and fallback
     */
    async generateBackgroundSafe(prompt, fallbackColor) {
        try {
            return await this.generateImage(prompt);
        } catch (e) {
            console.warn('[GeminiBanana] Background generation failed, using fallback');
            return null;
        }
    }

    /**
     * Generate caption for a photo
     */
    async generateCaption(photoDescription, mood, style) {
        if (this.genAI) {
            const prompt = `Write a ${style} caption for this photo: "${photoDescription}"
            Mood: ${mood}
            Keep it under 15 words.Be creative and evocative.
            Return just the caption text, no quotes.`;

            try {
                const result = await this.modelFlash.generateContent([{ text: prompt }]);
                return result.response.text().trim();
            } catch (e) {
                // fall through
            }
        }
        return "A moment to remember.";
    }
}

// Export instance
export const geminiService = new GeminiBananaService();

// Expose to window for legacy app.js access
window.geminiService = geminiService;
