const { ai, MODELS } = require('../config/gemini');
const fs = require('fs');

/**
 * Scores photo quality on multiple dimensions
 */
async function scorePhotoQuality(imagePath) {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');

    const prompt = `Rate this photo's quality for use in a professional photo album.
Return a JSON object with scores from 0-100:
{
  "overall_score": number,
  "technical": {
    "sharpness": number,
    "exposure": number,
    "noise": number,
    "color_accuracy": number
  },
  "composition": {
    "framing": number,
    "balance": number,
    "interest": number
  },
  "emotional_impact": number,
  "album_suitability": number,
  "issues": ["list any quality issues"],
  "recommendation": "hero|feature|supporting|exclude"
}

hero = Best photos, use as full-page spreads
feature = Strong photos, good for prominent placement
supporting = Decent photos, use in collages or smaller
exclude = Poor quality, suggest removal

Return ONLY valid JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.FAST,
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: base64Image } }
            ]
        });

        const textResponse = response.text || (response.candidates && response.candidates[0].content.parts[0].text);
        const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || [null, textResponse];
        return JSON.parse(jsonMatch[1] || textResponse);
    } catch (error) {
        console.error(`Error scoring photo quality for ${imagePath}:`, error);
        return {
            overall_score: 50,
            recommendation: "supporting",
            issues: ["Analysis failed"]
        };
    }
}

module.exports = { scorePhotoQuality };
