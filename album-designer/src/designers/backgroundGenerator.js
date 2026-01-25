const { ai, MODELS } = require('../config/gemini');
const fs = require('fs');

/**
 * Generates background images/patterns for album pages
 */
async function generateBackground(designParams, pageContext) {
    const prompt = `Generate a ${designParams.background_style.type} background for a photo album page.

Theme: ${designParams.theme.name}
Mood: ${designParams.theme.mood}
Colors: Primary ${designParams.colors.primary}, Secondary ${designParams.colors.secondary}
Style: ${designParams.background_style.description}
Page context: ${pageContext}

Requirements:
- Subtle enough to not compete with photos
- Professional quality suitable for printing
- Consistent with the ${designParams.layout_preferences.style} aesthetic
- Should complement, not distract from, the photos that will be placed on top

Create a beautiful, subtle background that enhances the album design.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: prompt,
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: "3:2",
                    imageSize: "2K"
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return {
                    imageData: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'image/png'
                };
            }
        }

        throw new Error('No background generated');
    } catch (error) {
        console.error("Background generation failed:", error);
        return { imageData: null };
    }
}

/**
 * Generates a set of coordinated backgrounds for the entire album
 */
async function generateBackgroundSet(designParams, pageCount) {
    const backgrounds = [];
    const variations = ['cover', 'opening', 'content', 'closing'];

    for (let i = 0; i < pageCount; i++) {
        const variation = i === 0 ? 'cover' :
            i === 1 ? 'opening' :
                i === pageCount - 1 ? 'closing' : 'content';

        const bg = await generateBackground(
            designParams,
            `${variation} page - page ${i + 1} of ${pageCount}`
        );

        backgrounds.push({
            pageIndex: i,
            variation,
            ...bg
        });

        await new Promise(r => setTimeout(r, 4000));
    }

    return backgrounds;
}

module.exports = { generateBackground, generateBackgroundSet };
