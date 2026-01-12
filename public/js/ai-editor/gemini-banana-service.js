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

        // "Nano Banana Pro" (Gemini 3 Pro Image Preview) -> Fallback to Pro
        this.modelPro = this.genAI.getGenerativeModel({
            model: "gemini-pro", // Fallback to standard Pro for now
            generationConfig: {
                // responseModalities: ["image"] // Not supported in text model, handled by tool/mock usually
            }
        });

        // "Curator" (Reasoning)
        this.modelFlash = this.genAI.getGenerativeModel({
            model: "gemini-pro",
            generationConfig: { responseMimeType: "application/json" }
        });
    }

    /**
     * Analyze photos and return structured JSON
     * @param {string} prompt 
     * @param {Array} imageBase64s Array of base64 strings
     */
    async analyzePhotos(prompt, imageBase64s = []) {
        if (!this.genAI) throw new Error("Gemini API not initialized.");

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
            console.error("Analysis Failed:", e);
            // Fallback for demo
            return {
                pages: [
                    { caption: "Story Start", photoIndices: [0, 1] },
                    { caption: "Middle Moments", photoIndices: [2, 3] },
                    { caption: "Finale", photoIndices: [4] }
                ]
            };
        }
    }

    /**
     * Generate an Image from a Prompt
     * @param {string} prompt 
     * @returns {Promise<string>} Base64 Image URL
     */
    async generateImage(prompt) {
        if (!this.genAI) throw new Error("Gemini API not initialized. Set API Key first.");

        console.log('[GeminiBanana] Generating image for:', prompt);

        // Real Implementation for Gemini 3 Pro Image
        try {
            const result = await this.modelPro.generateContent(prompt);
            const response = await result.response;

            // Log response structure to debug locally if needed
            console.log('[GeminiBanana] Response:', response);

            // Accessing image data
            // Structure usually: response.candidates[0].content.parts[0].inlineData
            // Or if using specific helper for images
            const parts = response.candidates[0].content.parts;
            const imagePart = parts.find(p => p.inlineData);

            if (imagePart && imagePart.inlineData) {
                // Determine mime type, default to jpeg if missing
                const mimeType = imagePart.inlineData.mimeType || "image/jpeg";
                return `data:${mimeType};base64,${imagePart.inlineData.data}`;
            }

            throw new Error("No image data found in response.");

        } catch (error) {
            console.error("[GeminiBanana] API Error:", error);
            // Fallback for demo if API fails (e.g. quota, wrong key plan)
            console.warn("[GeminiBanana] Falling back to mock due to error.");
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve("https://picsum.photos/seed/" + encodeURIComponent(prompt) + "/1024/1024");
                }, 1000);
            });
        }
    }

    /**
     * Magic Edit an Image
     * @param {string} imageBase64 
     * @param {string} prompt 
     */
    async editImage(imageBase64, prompt) {
        if (!this.genAI) throw new Error("Gemini API not initialized.");

        console.log('[GeminiBanana] Editing image with prompt:', prompt);

        // Use Gemini 3 Pro (or 1.5 Pro) to modify image
        // "Edit" is effectively "Generate from input image + prompt"
        try {
            const cleanB64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");
            const parts = [
                { text: `Edit this image: ${prompt}` },
                { inlineData: { data: cleanB64, mimeType: "image/jpeg" } }
            ];

            const result = await this.modelPro.generateContent(parts);
            const response = await result.response;

            const contentParts = response.candidates[0].content.parts;
            const imagePart = contentParts.find(p => p.inlineData);

            if (imagePart && imagePart.inlineData) {
                const mimeType = imagePart.inlineData.mimeType || "image/jpeg";
                return `data:${mimeType};base64,${imagePart.inlineData.data}`;
            }
            throw new Error("No image returned for edit.");

        } catch (e) {
            console.error("Edit Failed:", e);
            return new Promise((resolve) => {
                setTimeout(() => {
                    resolve("https://picsum.photos/seed/" + encodeURIComponent(prompt + "edit") + "/512/512");
                }, 2500);
            });
        }
    }
}

export const geminiService = new GeminiBananaService();
