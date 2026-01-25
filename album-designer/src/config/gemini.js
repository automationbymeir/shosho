require('dotenv').config();
const { GoogleGenAI } = require("@google/genai");

// Initialize the Google AI client
const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

// Model configurations
const MODELS = {
    FAST: "gemini-2.5-flash-image",
    PRO: "gemini-3-pro-image-preview"
};

// Default image generation config
const DEFAULT_IMAGE_CONFIG = {
    responseModalities: ['TEXT', 'IMAGE'],
    imageConfig: {
        aspectRatio: "3:2",
        imageSize: "2K"
    }
};

module.exports = { ai, MODELS, DEFAULT_IMAGE_CONFIG };
