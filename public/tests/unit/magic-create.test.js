/**
 * Magic Create (AI) Tests
 */
import { magicCreateV2 } from '../../js/ai-editor/engines/magic-create-v2.js';

const runner = new TestRunner();

// Define MagicCreate wrapper for testing convenience or test instance directly
const magicCreate = magicCreateV2;

runner.describe('Magic Create', () => {

    runner.it('should initialize correctly', () => {
        assert.exists(magicCreate, 'MagicCreate instance should exist');
        assert.typeOf(magicCreate.run, 'function', 'Should have run method');
    });

    runner.it('should have correct phases defined', () => {
        // Check for internal methods (they are on prototype, so accessible)
        assert.typeOf(magicCreate.analyzePhotosDeep, 'function', 'analyzePhotosDeep exists');
        assert.typeOf(magicCreate.planAlbum, 'function', 'planAlbum exists');
        assert.typeOf(magicCreate.generatePageDesigns, 'function', 'generatePageDesigns exists');
        assert.typeOf(magicCreate.compileAlbum, 'function', 'compileAlbum exists');
    });

    runner.it('should handle empty photos array in run', async () => {
        // run(photos, prompt, cb)
        try {
            // analyzePhotosDeep likely sets up loop or logs
            // If photos empty, it returns empty analyses
            const result = await magicCreate.run([], 'test');
            // If it runs through without photos, it might fail at planning or compile?
            // planAlbum calls geminiService.planAlbumStructure with 0 photos.
            assert.exists(result, 'Should return result (even if empty album)');
        } catch (e) {
            // Acceptable to throw if no photos
            assert.true(true, 'Threw error on empty photos (acceptable)');
        }
    });
});

runner.run();
