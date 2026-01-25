const { ai, MODELS } = require('../config/gemini');

/**
 * Parses user design prompt into actionable design parameters
 */
async function parseDesignPrompt(userPrompt) {
    const systemPrompt = `You are an expert album designer. Parse this user request into design parameters.

User prompt: "${userPrompt}"

Return a JSON object with design specifications:
{
  "theme": {
    "name": "theme identifier (wedding, birthday, travel, baby, memorial, graduation, etc.)",
    "mood": "elegant|playful|romantic|adventurous|nostalgic|modern|vintage|minimalist",
    "formality": "formal|semi-formal|casual"
  },
  "colors": {
    "primary": "#hexcode",
    "secondary": "#hexcode", 
    "accent": "#hexcode",
    "palette_name": "descriptive name",
    "avoid": ["colors to avoid"]
  },
  "typography": {
    "title_style": "serif|sans-serif|script|decorative",
    "body_style": "serif|sans-serif",
    "mood": "elegant|playful|modern|classic"
  },
  "layout_preferences": {
    "style": "minimalist|ornate|classic|modern|scrapbook",
    "density": "sparse|balanced|dense",
    "symmetry": "symmetric|asymmetric|mixed"
  },
  "decorative_elements": {
    "frames": "none|thin|decorative|vintage|modern",
    "borders": "none|subtle|prominent",
    "embellishments": ["flowers", "geometric", "none", etc.]
  },
  "special_requests": ["any specific user requests extracted"],
  "background_style": {
    "type": "solid|gradient|pattern|textured|image",
    "description": "detailed description for generation"
  }
}

Return ONLY valid JSON.`;

    try {
        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: systemPrompt
            // config: { responseMimeType: "application/json" } // Safe to remove if unsure, but Pro usually supports it. I'll stick to regex parsing for max compatibility.
        });

        const textResponse = response.text || (response.candidates && response.candidates[0].content.parts[0].text);
        const jsonMatch = textResponse.match(/```json\n?([\s\S]*?)\n?```/) || [null, textResponse];
        return JSON.parse(jsonMatch[1] || textResponse);
    } catch (error) {
        console.error("Error parsing design prompt:", error);
        return {
            theme: { name: "default", mood: "modern", formality: "casual" },
            colors: { primary: "#ffffff", secondary: "#000000", accent: "#888888" },
            typography: { title_style: "sans-serif", body_style: "sans-serif" },
            layout_preferences: { style: "modern", density: "balanced" },
            decorative_elements: { frames: "none" },
            background_style: { type: "solid", description: "clean white" }
        };
    }
}

module.exports = { parseDesignPrompt };
