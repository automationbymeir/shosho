const { ai, MODELS } = require('../config/gemini');
const fs = require('fs');
const path = require('path');

/**
 * Analyzes a single photo for content, faces, and scene information
 */
async function analyzePhoto(imagePath) {
    const imageData = fs.readFileSync(imagePath);
    const base64Image = imageData.toString('base64');
    const mimeType = getMimeType(imagePath);

    const prompt = `Analyze this photo and return a JSON object with the following structure:
{
  "faces": {
    "count": number,
    "descriptions": ["brief description of each person"],
    "emotions": ["dominant emotion for each face"]
  },
  "scene": {
    "type": "indoor|outdoor|studio|nature|urban|event",
    "description": "brief scene description",
    "lighting": "natural|artificial|mixed|low-light|golden-hour"
  },
  "objects": ["list of prominent objects"],
  "colors": {
    "dominant": ["top 3 dominant colors as hex codes"],
    "mood": "warm|cool|neutral|vibrant|muted"
  },
  "composition": {
    "orientation": "portrait|landscape|square",
    "focus": "center|rule-of-thirds|leading-lines|symmetrical",
    "quality_indicators": ["sharp", "well-exposed", "good-contrast"]
  },
  "suggested_tags": ["relevant tags for grouping"]
}

Return ONLY valid JSON, no additional text.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.FAST,
            contents: [
                { text: prompt },
                {
                    inlineData: {
                        mimeType: mimeType,
                        data: base64Image,
                    },
                },
            ]
        });

        const textResponse = response.text || (response.candidates && response.candidates[0].content.parts[0].text);

        // Parse JSON from response
        const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || [null, textResponse];
        return JSON.parse(jsonMatch[1] || textResponse);
    } catch (error) {
        console.error(`Error analyzing photo ${path.basename(imagePath)}:`, error);
        return null;
    }
}

/**
 * Batch analyze multiple photos
 */
async function analyzePhotoBatch(imagePaths, onProgress) {
    const results = [];

    for (let i = 0; i < imagePaths.length; i++) {
        const analysis = await analyzePhoto(imagePaths[i]);
        if (analysis) {
            results.push({
                path: imagePaths[i],
                filename: path.basename(imagePaths[i]),
                analysis
            });
        }

        if (onProgress) {
            onProgress(i + 1, imagePaths.length);
        }

        if (i < imagePaths.length - 1) {
            await delay(1000);
        }
    }

    return results;
}

function getMimeType(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.heic': 'image/heic'
    };
    return mimeTypes[ext] || 'image/jpeg';
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { analyzePhoto, analyzePhotoBatch };
