/**
 * Integration: State → Render Engine
 */
import { store } from '../../js/ai-editor/core/state.js';
import { RenderEngine } from '../../js/ai-editor/engines/render-engine.js';
import { eventBus, EVENTS } from '../../js/ai-editor/core/event-bus.js';

const runner = new TestRunner();

runner.describe('Integration: State to Render', () => {
    let renderEngine;
    let container;

    container = createTestContainer();
    // Ensure ID matches what we pass to RenderEngine
    container.id = 'integration-canvas';
    renderEngine = new RenderEngine('integration-canvas');
    store.reset();

    runner.it('should render when state changes', async () => {
        // We need to verify that we can trigger a render from state data.
        // Since RenderEngine is DOM based, we check DOM.

        const page = {
            id: 'page1',
            background: '#FF0000',
            elements: [],
            layout: { slots: [] }
        };

        store.state.pages = [page];
        store.state.activePageId = 'page1';

        // Manual trigger as in app controller
        renderEngine.renderPage(page, store.state.assets);

        const pageEl = container.querySelector('.shoso-page');
        assert.exists(pageEl, 'Page should be rendered');

        // Check background style
        // rgb(255, 0, 0) or hex
        assert.true(
            pageEl.style.backgroundColor === 'rgb(255, 0, 0)' ||
            pageEl.style.backgroundColor.toLowerCase() === '#ff0000',
            'Background color should match'
        );
    });

    cleanupTestContainer();
});

runner.run();
