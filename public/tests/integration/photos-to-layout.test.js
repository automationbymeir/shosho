/**
 * Integration: Photos → Layout Engine → Render
 */
import { layoutEngine } from '../../js/ai-editor/engines/layout-engine.js';
import { RenderEngine } from '../../js/ai-editor/engines/render-engine.js';

const runner = new TestRunner();

runner.describe('Integration: Photos to Layout', () => {
    let renderEngine;
    let container;

    container = createTestContainer();
    container.id = 'layout-integration-canvas-v2';

    // Use exported instance
    const engine = layoutEngine;
    renderEngine = new RenderEngine('layout-integration-canvas-v2');

    runner.it('should generate layout and render it', async () => {
        const photos = [createMockPhoto(), createMockPhoto()];

        // 1. Generate Layout
        const layout = engine.generateLayout(photos);
        assert.exists(layout.slots, 'Should generate slots');

        // 2. Create Page Structure expected by RenderEngine
        // RenderEngine expects page.layout.slots OR page.layout.photoSlots?
        // Let's check RenderEngine code (line 60): page.layout.slots.forEach...
        const page = {
            id: 'layout-test-page-v2',
            background: '#fff',
            layout: {
                slots: layout.slots // Engine returns { name, slots: [{...}] }
            }
        };

        // 3. Render
        const assets = { photos: photos };

        await renderEngine.renderPage(page, assets);

        // 4. Verify DOM
        // RenderEngine creates div.page-slot.photo-slot
        const slots = container.querySelectorAll('.photo-slot');
        assert.equal(slots.length, 2, 'Should render 2 photo slots in DOM');

        // Verify positioning on one slot
        const slotEl = slots[0];
        const layoutSlot = layout.slots[0];
        // DOM styles will be like "left: 10%"
        assert.true(slotEl.style.left === `${layoutSlot.x}%` || parseFloat(slotEl.style.left) === layoutSlot.x, 'Left position should match');
    });

    cleanupTestContainer();
});

runner.run();
