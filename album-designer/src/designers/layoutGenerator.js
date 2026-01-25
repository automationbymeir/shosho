const { ai, MODELS } = require('../config/gemini');
const fs = require('fs');

/**
 * Generates page layout based on photos and design parameters
 */
async function generatePageLayout(photos, designParams, pageNumber) {
    const photoDescriptions = photos.map((p, i) => ({
        id: i,
        orientation: p.analysis.composition.orientation,
        quality: p.quality?.recommendation || 'supporting',
        hasText: p.analysis.scene.type === 'event'
    }));

    const prompt = `Design a photo album page layout for these ${photos.length} photos.

Photos: ${JSON.stringify(photoDescriptions)}
Design theme: ${designParams.theme.name}
Layout style: ${designParams.layout_preferences.style}
Page number: ${pageNumber}

Return a JSON layout specification:
{
  "page_type": "single-hero|two-photo|three-photo|collage|grid",
  "dimensions": { "width": 3000, "height": 2000 },
  "background": {
    "type": "solid|gradient|pattern",
    "value": "color code or gradient spec"
  },
  "photo_placements": [
    {
      "photo_id": 0,
      "x": number (pixels from left),
      "y": number (pixels from top),
      "width": number,
      "height": number,
      "rotation": number (degrees),
      "frame": {
        "type": "none|thin|shadow|decorative",
        "color": "#hex",
        "width": number
      },
      "effects": ["shadow", "rounded-corners", etc.]
    }
  ],
  "text_areas": [
    {
      "type": "title|caption|date",
      "x": number,
      "y": number,
      "width": number,
      "height": number,
      "alignment": "left|center|right",
      "suggested_content": "placeholder text"
    }
  ],
  "decorative_elements": [
    {
      "type": "line|shape|flourish",
      "position": { "x": number, "y": number },
      "size": { "width": number, "height": number },
      "style": "description"
    }
  ]
}

Ensure no overlapping elements and proper visual balance.
Return ONLY valid JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: prompt
        });

        const textResponse = response.text || (response.candidates && response.candidates[0].content.parts[0].text);
        const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || [null, textResponse];
        return JSON.parse(jsonMatch[1] || textResponse);
    } catch (error) {
        console.error("Error generating layout:", error);
        return {
            page_type: "grid",
            dimensions: { width: 3000, height: 2000 },
            photo_placements: photos.map((_, i) => ({
                photo_id: i, x: 10 + i * 100, y: 10, width: 300, height: 200, rotation: 0, frame: { type: "none" }
            })),
            text_areas: [],
            decorative_elements: []
        };
    }
}

/**
 * Generate a complete visual page using Nano Banana image generation
 */
async function generateVisualPage(layout, photos, designParams) {
    // Load photo images
    const photoContents = [];
    for (const placement of layout.photo_placements) {
        const photo = photos[placement.photo_id];
        // Handle mock photos if path is invalid or missing
        if (fs.existsSync(photo.path)) {
            const imageData = fs.readFileSync(photo.path);
            photoContents.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData.toString('base64')
                }
            });
        }
    }

    const prompt = `Create a professional photo album page with these specifications:

Layout: ${layout.page_type}
Theme: ${designParams.theme.name} - ${designParams.theme.mood}
Color palette: Primary ${designParams.colors.primary}, Secondary ${designParams.colors.secondary}
Background: ${designParams.background_style.description}
Frame style: ${designParams.decorative_elements.frames}

Photo positions and sizes:
${layout.photo_placements.map((p, i) =>
        `Photo ${i + 1}: Position (${p.x}, ${p.y}), Size ${p.width}x${p.height}, Frame: ${p.frame.type}`
    ).join('\n')}

Text areas:
${(layout.text_areas || []).map(t =>
        `${t.type}: "${t.suggested_content}" at (${t.x}, ${t.y})`
    ).join('\n')}

Create a cohesive, professional album page incorporating all provided photos in the specified layout.
The design should feel ${designParams.theme.mood} and match the ${designParams.layout_preferences.style} aesthetic.
Ensure proper alignment, visual balance, and professional quality suitable for printing.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: [
                { text: prompt },
                ...photoContents
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: "3:2",
                    imageSize: "2K"
                }
            }
        });

        // Extract generated image
        // Note: The structure for Nano Banana Pro Image might put the image in inlineData
        // We check parts.
        const parts = response.candidates[0].content.parts;
        for (const part of parts) {
            if (part.inlineData) {
                return {
                    imageData: part.inlineData.data,
                    mimeType: part.inlineData.mimeType || 'image/png'
                };
            }
        }

        // Fallback: Check if response has valid image output if not in parts[0]
        throw new Error('No image generated in response');
    } catch (error) {
        console.error("Visual Page Generation Failed:", error);
        return null;
    }
}

module.exports = { generatePageLayout, generateVisualPage };
