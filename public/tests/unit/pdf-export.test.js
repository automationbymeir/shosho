/**
 * PDF Export Tests
 */
import { PDFExport } from '../../js/ai-editor/engines/pdf-export.js';

const runner = new TestRunner();

runner.describe('PDF Export', () => {
    let pdfExport;

    pdfExport = new PDFExport();

    runner.it('should initialize correctly', () => {
        assert.exists(pdfExport, 'PDFExport should exist');
    });

    runner.it('should generate PDF from state', async () => {
        // Mock Data
        const pages = [
            { id: 'p1', background: '#fff', elements: [] },
            { id: 'p2', background: '#000', elements: [] }
        ];
        const cover = {
            title: 'Test Album',
            subtitle: '2025',
            layout: 'standard',
            background: '#fff'
        };
        const assets = { photos: [] };

        // Mock global jspdf if needed (it is in test-runner.html)
        // generatePDF(pages, cover, assets, returnBlob)

        try {
            const blob = await pdfExport.generatePDF(pages, cover, assets, true);
            assert.instanceOf(blob, Blob, 'Should return Blob');
            assert.equal(blob.type, 'application/pdf', 'Should be PDF type');
            assert.true(blob.size > 0, 'PDF should have content');
        } catch (e) {
            // If it alerts, we might catch it?
            // pdf-export.js alerts on error lines 25/100.
            // We can mock alert to avoid browser popup during test?
            console.error(e);
            throw e;
        }
    });

    runner.it('should handle empty pages gracefully', async () => {
        const blob = await pdfExport.generatePDF([], null, { photos: [] }, true);
        assert.instanceOf(blob, Blob, 'Should return Blob even with no pages (empty PDF)');
    });
});

runner.run();
