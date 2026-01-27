/**
 * Google Photos Service Tests
 */
import { googlePhotosService } from '../../../js/ai-editor/services/google-photos-service.js';

const runner = new TestRunner();

runner.describe('Google Photos Service', () => {

    runner.it('should export the service instance', () => {
        assert.exists(googlePhotosService, 'Service instance should exist');
    });

    runner.it('should have openPicker method', () => {
        assert.typeOf(googlePhotosService.openPicker, 'function', 'openPicker should be a function');
    });

    // Skip auth tests that require firebase initialization in strict mode
});

runner.run();
