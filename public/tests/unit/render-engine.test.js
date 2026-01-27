/**
 * Render Engine Tests (DOM Based)
 */
import { RenderEngine } from '../../js/ai-editor/engines/render-engine.js';

const runner = new TestRunner();

runner.describe('Render Engine (DOM)', () => {
    let renderEngine;
    let container;

    // Setup before tests
    container = createTestContainer();
    // createTestContainer creates <div id="test-container">

    // Initialize engine with correct ID
    renderEngine = new RenderEngine('test-container');

    runner.it('should initialize correctly', () => {
        assert.exists(renderEngine, 'RenderEngine should exist');
        assert.exists(renderEngine.container, 'Container should exist');
        assert.equal(renderEngine.container.id, 'test-container', 'Container ID should match');
    });

    runner.it('should render page structure', () => {
        const page = {
            id: 'p1',
            background: '#ffffff',
            elements: [],
            layout: { slots: [] }
        };
        const assets = { photos: [] };

        renderEngine.renderPage(page, assets);

        // Query within the container
        const pageEl = container.querySelector('.shoso-page');
        assert.exists(pageEl, 'Should render page element');
        assert.equal(pageEl.dataset.pageId, 'p1', 'Page ID should match');
    });

    runner.it('should render photos in slots', () => {
        const photoId = 'photo1';
        const page = {
            id: 'p2',
            background: '#fff',
            layout: {
                slots: [
                    { photoId: photoId, x: 0, y: 0, width: 50, height: 50 }
                ]
            }
        };
        const assets = {
            photos: [{ id: photoId, url: 'test.jpg' }]
        };

        renderEngine.renderPage(page, assets);

        const slotEl = container.querySelector('.photo-slot');
        assert.exists(slotEl, 'Should render photo slot');

        const img = slotEl.querySelector('img');
        assert.exists(img, 'Should render img tag');
        assert.true(img.src.includes('test.jpg'), 'Image src should match');
    });

    runner.it('should render text elements', () => {
        const page = {
            id: 'p3',
            background: '#fff',
            elements: [
                { type: 'text', id: 't1', content: 'Hello World', x: 10, y: 10 }
            ]
        };

        renderEngine.renderPage(page, { photos: [] });

        const textEl = container.querySelector('.text-element');
        assert.exists(textEl, 'Should render text element');
        assert.equal(textEl.textContent, 'Hello World', 'Content should match');
    });

    // Cleanup
    cleanupTestContainer();
});

runner.run();
