const { ai, MODELS } = require('../config/gemini');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

/**
 * Remove or replace photo background
 */
async function processPhotoBackground(photoPath, action, options = {}) {
    const imageData = fs.readFileSync(photoPath);
    const base64Image = imageData.toString('base64');

    let prompt;
    if (action === 'remove') {
        prompt = `Remove the background from this photo, keeping only the main subject(s). 
Make the background transparent or white.
Maintain clean edges around the subject.`;
    } else if (action === 'replace') {
        prompt = `Replace the background of this photo with: ${options.newBackground}
Keep the main subject(s) intact with clean edges.
Make the new background blend naturally with the subject.
Style: ${options.style || 'natural'}`;
    } else if (action === 'blur') {
        prompt = `Blur the background of this photo to create a professional portrait effect.
Keep the main subject(s) in sharp focus.
Apply a natural-looking bokeh blur to the background.`;
    }

    try {
        const response = await ai.models.generateContent({
            model: MODELS.PRO, // Use PRO for high fidelity editing
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: "3:2", // Ideally match input AR
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

        throw new Error('Background processing failed');
    } catch (error) {
        console.error("Background processing error:", error);
        return null;
    }
}

/**
 * Apply color/style treatment to match album theme
 */
async function applyPhotoTreatment(photoPath, treatmentStyle, designParams) {
    const imageData = fs.readFileSync(photoPath);
    const base64Image = imageData.toString('base64');

    const prompt = `Apply a ${treatmentStyle} treatment to this photo.

Style requirements:
- Match the ${designParams.theme.mood} mood
- Color palette should harmonize with: ${designParams.colors.primary}, ${designParams.colors.secondary}
- Maintain natural skin tones if faces are present
- Keep the photo looking professional, not over-processed

Treatment: ${treatmentStyle}
The result should feel cohesive with a ${designParams.theme.name} themed album.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.FAST, // Flash is okay for style transfer/simple edits
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE']
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

        throw new Error('Photo treatment failed');
    } catch (error) {
        console.error("Treatment error:", error);
        return null;
    }
}

/**
 * Ensure photo meets print resolution requirements
 */
async function ensurePrintQuality(photoPath, targetDPI = 300) {
    try {
        const metadata = await sharp(photoPath).metadata();

        // Calculate if upscaling is needed
        // Assuming 3:2 standard album constraint for now, or use original AR
        const currentPixels = metadata.width * metadata.height;
        const minPixels = (8 * targetDPI) * (10 * targetDPI); // 8x10 at target DPI ~ 7.2MP

        if (currentPixels < minPixels) {
            // Use AI upscaling
            const imageData = fs.readFileSync(photoPath);
            const base64Image = imageData.toString('base64');

            const response = await ai.models.generateContent({
                model: MODELS.PRO,
                contents: [
                    { text: "Upscale this image to high resolution while maintaining quality and adding appropriate detail. The result should be suitable for high-quality printing." },
                    { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
                ],
                config: {
                    responseModalities: ['TEXT', 'IMAGE'],
                    imageConfig: {
                        imageSize: "4K" // Nano Banana Pro supports 4K
                    }
                }
            });

            for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                    return {
                        imageData: part.inlineData.data,
                        upscaled: true,
                        originalResolution: `${metadata.width}x${metadata.height}`
                    };
                }
            }
        }

        return {
            imageData: fs.readFileSync(photoPath).toString('base64'),
            upscaled: false,
            resolution: `${metadata.width}x${metadata.height}`
        };
    } catch (error) {
        console.error("Print quality check error:", error);
        return { imageData: null, error: true };
    }
}

/**
 * Process all photos in batch with consistent treatment
 */
async function processPhotosBatch(photos, designParams, options = {}) {
    const processedPhotos = [];

    for (const photo of photos) {
        let processedData = { ...photo };
        let currentPath = photo.path;

        // Apply background processing if requested
        if (options.backgroundAction) {
            const bgResult = await processPhotoBackground(
                currentPath,
                options.backgroundAction,
                options.backgroundOptions
            );
            if (bgResult) {
                // Save intermediate result to tmp
                const tempPath = path.join(path.dirname(photo.path), `processed_bg_${path.basename(photo.path)}`);
                fs.writeFileSync(tempPath, Buffer.from(bgResult.imageData, 'base64'));
                currentPath = tempPath;
                processedData.processedImageData = bgResult.imageData;
            }
        }

        // Apply color treatment
        if (options.treatment) {
            const treatResult = await applyPhotoTreatment(
                currentPath,
                options.treatment,
                designParams
            );
            if (treatResult) {
                const tempPath = path.join(path.dirname(photo.path), `processed_treat_${path.basename(photo.path)}`);
                fs.writeFileSync(tempPath, Buffer.from(treatResult.imageData, 'base64'));
                currentPath = tempPath;
                processedData.processedImageData = treatResult.imageData;
            }
        }

        // Ensure print quality (upscale if needed)
        // Only perform if we haven't already generated a high-res AI image (AI gen usually results in 2K/4K)
        // If we just generated a 2K image from treatment, verify if we need 4K logic.
        // For now, let's skip expensive 4K upscale in batch unless explicitly flagged or very low res.
        if (options.upscale) {
            const qualityResult = await ensurePrintQuality(currentPath);
            if (qualityResult && qualityResult.imageData) {
                processedData.finalImageData = qualityResult.imageData;
                processedData.upscaled = qualityResult.upscaled;
            }
        } else {
            // Just use whatever we have at currentPath
            processedData.finalImageData = fs.readFileSync(currentPath).toString('base64');
        }

        processedPhotos.push(processedData);

        // Rate limiting
        await new Promise(r => setTimeout(r, 4000));
    }

    return processedPhotos;
}

module.exports = {
    processPhotoBackground,
    applyPhotoTreatment,
    ensurePrintQuality,
    processPhotosBatch
};
