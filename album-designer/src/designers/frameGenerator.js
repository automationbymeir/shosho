const { ai, MODELS } = require('../config/gemini');
const fs = require('fs');

/**
 * Applies decorative frames to photos
 */
async function applyFrame(photoPath, frameStyle, designParams) {
    const imageData = fs.readFileSync(photoPath);
    const base64Image = imageData.toString('base64');

    const prompt = `Add a ${frameStyle} frame to this photo.

Frame specifications:
- Style: ${designParams.decorative_elements.frames}
- Color scheme: ${designParams.colors.primary} and ${designParams.colors.secondary}
- Theme: ${designParams.theme.mood}

The frame should:
- Complement the photo without overwhelming it
- Match the ${designParams.layout_preferences.style} aesthetic
- Be suitable for a professional photo album
- Maintain the photo's original aspect ratio

Apply the frame elegantly to enhance the photo's presentation.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.PRO, // Can use FAST if edit support is good, but Plan says FAST for generic ops. Nano Banana Pro is best for edit.
            // Actually, frame addition is an implicit "Edit" operation if input is image+text -> image.
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: "3:2", // Ideally matches input, but API requires specific AR enums often.
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

        throw new Error('No framed image generated');
    } catch (error) {
        console.error("Frame application failed:", error);
        return null;
    }
}

/**
 * Batch apply consistent frames to multiple photos
 */
async function applyFramesToBatch(photos, frameStyle, designParams) {
    const framedPhotos = [];

    for (const photo of photos) {
        const framed = await applyFrame(photo.path, frameStyle, designParams);
        if (framed) {
            framedPhotos.push({
                originalPath: photo.path,
                framedImageData: framed.imageData,
                mimeType: framed.mimeType
            });
        } else {
            framedPhotos.push({
                originalPath: photo.path,
                error: true
            });
        }

        await new Promise(r => setTimeout(r, 3000));
    }

    return framedPhotos;
}

module.exports = { applyFrame, applyFramesToBatch };
