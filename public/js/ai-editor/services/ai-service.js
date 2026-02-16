/**
 * AI Service - Handles all Nano Banana API interactions
 */
class AIService {
    constructor(config = {}) {
        this.apiKey = config.apiKey || null;
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta';
        this.models = {
            FAST: 'gemini-2.5-flash-image',
            PRO: 'gemini-3-pro-image-preview'
        };
        this.rateLimiter = new RateLimiter(15, 60000); // 15 requests per minute
    }

    setApiKey(key) {
        this.apiKey = key;
    }

    init(key) {
        this.setApiKey(key);
    }

    async generateContent(options) {
        const { model, contents, imageConfig } = options;

        if (!this.apiKey) {
            throw new Error('API key not configured');
        }

        await this.rateLimiter.acquire();

        const response = await fetch(
            `${this.baseUrl}/models/${model}:generateContent`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-goog-api-key': this.apiKey
                },
                body: JSON.stringify({
                    contents: Array.isArray(contents) ? contents : [{ parts: contents }],
                    generationConfig: {
                        responseModalities: ['TEXT', 'IMAGE'],
                        ...(imageConfig && { imageConfig })
                    }
                })
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || 'API request failed');
        }

        return response.json();
    }

    // Analyze photo content
    async analyzePhoto(imageBase64, mimeType = 'image/jpeg') {
        const prompt = `Analyze this photo and return JSON:
{
  "faces": { "count": number, "descriptions": [] },
  "scene": { "type": "indoor|outdoor|event|portrait", "description": "" },
  "colors": { "dominant": ["#hex"], "mood": "warm|cool|neutral" },
  "quality": { "score": 1-100, "issues": [] },
  "tags": []
}
Return ONLY valid JSON.`;

        const response = await this.generateContent({
            model: this.models.FAST,
            contents: [
                { text: prompt },
                { inlineData: { mimeType, data: imageBase64 } }
            ]
        });

        return this.parseJsonResponse(response);
    }

    // Helper methods for MagicCreateV2 compatibility
    async analyzePhotoDeep(imageBase64) {
        return this.analyzePhoto(imageBase64);
    }

    async planAlbumStructure(photoSummaries, userPrompt, totalPhotos) {
        // Mock or implement planning logic
        // For now returning a mock structure to satisfy interface
        return {
            albumId: `album_${Date.now()}`,
            meta: { totalPages: Math.ceil(totalPhotos / 4) },
            chapters: [],
            pageAssignments: [],
            designSystem: { mood: 'mock' }
        };
    }

    async designPage(context) {
        return {
            layout: { gridType: 'grid', photoSlots: [] },
            background: { type: 'solid', color: '#fff' }
        };
    }

    async generateBackgroundSafe(prompt, fallback) {
        try {
            const res = await this.generateBackground('style', ['#fff'], 'mood'); // simplified
            return res.base64 ? `data:image/png;base64,${res.base64}` : null;
        } catch (e) {
            return null;
        }
    }

    // Generate album page
    async generateAlbumPage(photos, designPrompt, pageType = 'content') {
        const photoContents = photos.map(p => ({
            inlineData: { mimeType: p.mimeType || 'image/jpeg', data: p.base64 }
        }));

        const prompt = `Create a professional ${pageType} album page.
Design: ${designPrompt}
Photos: ${photos.length}
Requirements:
- Arrange photos harmoniously
- Add appropriate backgrounds
- Include subtle frames
- Professional print quality`;

        const response = await this.generateContent({
            model: this.models.PRO,
            contents: [{ text: prompt }, ...photoContents],
            imageConfig: {
                aspectRatio: '3:2',
                imageSize: '2K'
            }
        });

        return this.extractImage(response);
    }

    // Generate background
    async generateBackground(style, colors, mood) {
        const prompt = `Generate a subtle album page background.
Style: ${style}
Colors: ${colors.join(', ')}
Mood: ${mood}
Requirements: Subtle, professional, won't compete with photos`;

        const response = await this.generateContent({
            model: this.models.FAST,
            contents: [{ text: prompt }],
            imageConfig: {
                aspectRatio: '3:2',
                imageSize: '2K'
            }
        });

        return this.extractImage(response);
    }

    // Apply frame to photo
    async applyFrame(photoBase64, frameStyle, colors) {
        const prompt = `Add a ${frameStyle} frame to this photo.
Colors: ${colors.join(', ')}
Keep the photo intact, add decorative frame around it.`;

        const response = await this.generateContent({
            model: this.models.FAST,
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: photoBase64 } }
            ]
        });

        return this.extractImage(response);
    }

    // Helper: Parse JSON from response
    parseJsonResponse(response) {
        const text = response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text;
        if (!text) throw new Error('No text in response');

        const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || [null, text];
        return JSON.parse(jsonMatch[1] || text);
    }

    // Helper: Extract image from response
    extractImage(response) {
        const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);
        if (!imagePart) throw new Error('No image in response');

        return {
            base64: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || 'image/png'
        };
    }
}

// Rate limiter helper
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = [];
    }

    async acquire() {
        const now = Date.now();
        this.requests = this.requests.filter(t => now - t < this.windowMs);

        if (this.requests.length >= this.maxRequests) {
            const waitTime = this.requests[0] + this.windowMs - now;
            await new Promise(r => setTimeout(r, waitTime));
            return this.acquire();
        }

        this.requests.push(now);
    }
}

export const geminiService = new AIService();
export { AIService };
