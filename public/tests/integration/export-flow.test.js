/**
 * Integration: Full Export Flow
 */
import { store } from '../../js/ai-editor/core/state.js';
import { PDFExport } from '../../js/ai-editor/engines/pdf-export.js';
import { eventBus, EVENTS } from '../../js/ai-editor/core/event-bus.js';

const runner = new TestRunner();

runner.describe('Integration: Export Flow', () => {
    let pdfExport;

    pdfExport = new PDFExport();
    store.reset();

    runner.it('should export album to PDF from store state', async () => {
        // Setup state
        store.state.cover = { title: 'Export Test', layout: 'standard' };
        store.state.pages = [
            { id: 'p1', background: '#ffffff', elements: [] }
        ];
        store.state.assets = { photos: [] };

        const blob = await pdfExport.generatePDF(
            store.state.pages,
            store.state.cover,
            store.state.assets,
            true // returnBlob
        );

        assert.instanceOf(blob, Blob, 'Should create PDF blob');
        assert.true(blob.size > 0, 'PDF should have content');
    });
});

runner.run();
