const { ai, MODELS } = require('../config/gemini');
const fs = require('fs');

/**
 * Groups photos by event/theme using AI analysis
 */
async function groupPhotosByRelevance(analyzedPhotos) {
    // Prepare summary for grouping analysis
    const photoSummaries = analyzedPhotos.map((p, idx) => ({
        id: idx,
        filename: p.filename,
        scene: p.analysis.scene,
        tags: p.analysis.suggested_tags,
        faces: p.analysis.faces.count,
        colors: p.analysis.colors.mood
    }));

    const prompt = `Given these analyzed photos, group them into logical sections for a photo album.
Consider: similar scenes, same people, chronological events, color themes, and storytelling flow.

Photos:
${JSON.stringify(photoSummaries, null, 2)}

Return a JSON object:
{
  "groups": [
    {
      "name": "Group name (e.g., 'Beach Day', 'Family Portraits')",
      "theme": "Brief theme description",
      "photo_ids": [array of photo indices],
      "suggested_order": [photo indices in storytelling order],
      "design_hints": {
        "mood": "emotional tone",
        "color_scheme": ["suggested colors"],
        "layout_style": "collage|timeline|hero-focused|grid"
      }
    }
  ],
  "album_flow": [group indices in recommended order],
  "cover_candidates": [photo indices best for cover]
}

Return ONLY valid JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.PRO, // Use Pro for complex reasoning
            contents: prompt
            // removed responseMimeType to be safe
        });

        const textResponse = response.text || (response.candidates && response.candidates[0].content.parts[0].text);
        const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || [null, textResponse];
        return JSON.parse(jsonMatch[1] || textResponse);
    } catch (error) {
        console.error("Error grouping photos:", error);
        // Return a fallback single group
        const allIds = analyzedPhotos.map((_, i) => i);
        return {
            groups: [{
                name: "Collection",
                theme: "Photo Collection",
                photo_ids: allIds,
                suggested_order: allIds,
                design_hints: { mood: "neutral", color_scheme: ["#000000"], layout_style: "grid" }
            }],
            album_flow: [0],
            cover_candidates: [0]
        };
    }
}

/**
 * Select best photos when duplicates exist
 */
async function selectBestFromDuplicates(photoGroup, maxSelect = 1) {
    // Load all images from the group
    const imageContents = [];

    const contentParts = [
        {
            text: `These ${photoGroup.length} photos are similar/duplicates. 
Select the best ${maxSelect} photo(s) based on:
- Technical quality (sharpness, exposure)
- Composition
- Expression (if faces present)
- Overall appeal

Return JSON: { "selected_ids": [photo indices], "reasoning": "brief explanation" }` }
    ];

    for (let i = 0; i < photoGroup.length; i++) {
        const photo = photoGroup[i];
        const imageData = fs.readFileSync(photo.path);
        contentParts.push({ text: `Photo ${photo.id || i}: ${photo.filename}` });
        contentParts.push({
            inlineData: {
                mimeType: 'image/jpeg',
                data: imageData.toString('base64')
            }
        });
    }

    try {
        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: contentParts
            // removed responseMimeType
        });

        const textResponse = response.text || (response.candidates && response.candidates[0].content.parts[0].text);
        const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || [null, textResponse];
        return JSON.parse(jsonMatch[1] || textResponse);
    } catch (error) {
        console.error("Error selecting best duplicates:", error);
        return { selected_ids: [0], reasoning: "Fallback due to error" };
    }
}

module.exports = { groupPhotosByRelevance, selectBestFromDuplicates };
