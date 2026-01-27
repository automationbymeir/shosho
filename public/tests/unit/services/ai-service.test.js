/**
 * AI Service Tests
 */
import { AIService } from '../../../js/ai-editor/services/ai-service.js';

const runner = new TestRunner();

runner.describe('AI Service', () => {
    let aiService;

    aiService = new AIService({ apiKey: 'test-api-key' });

    runner.it('should initialize with config', () => {
        assert.exists(aiService, 'AIService should exist');
        assert.exists(aiService.apiKey, 'API key should be set');
    });

    runner.it('should throw error without API key', async () => {
        const noKeyService = new AIService();

        // Using a mock photo helper if available or inline simple string
        const mockImage = 'base64data';

        await assert.asyncThrows(
            () => noKeyService.analyzePhoto(mockImage),
            'API key not configured',
            'Should throw without API key'
        );
    });

    runner.it('should have correct model configurations', () => {
        assert.equal(aiService.models.FAST, 'gemini-2.5-flash-image', 'FAST model correct');
        assert.equal(aiService.models.PRO, 'gemini-3-pro-image-preview', 'PRO model correct');
    });

    runner.it('should parse JSON from response correctly', () => {
        const response = {
            candidates: [{
                content: {
                    parts: [{ text: '```json\n{"test": true}\n```' }]
                }
            }]
        };

        const parsed = aiService.parseJsonResponse(response);
        assert.deepEqual(parsed, { test: true }, 'Should parse JSON');
    });

    runner.it('should extract image from response', () => {
        const response = {
            candidates: [{
                content: {
                    parts: [
                        { text: 'Here is your image' },
                        { inlineData: { data: 'base64data', mimeType: 'image/png' } }
                    ]
                }
            }]
        };

        const image = aiService.extractImage(response);
        assert.equal(image.base64, 'base64data', 'Should extract base64');
        assert.equal(image.mimeType, 'image/png', 'Should extract mimeType');
    });

    runner.it('should handle missing image in response', () => {
        const response = {
            candidates: [{
                content: {
                    parts: [{ text: 'No image here' }]
                }
            }]
        };

        assert.throws(
            () => aiService.extractImage(response),
            'No image',
            'Should throw when no image'
        );
    });
});

runner.run();
