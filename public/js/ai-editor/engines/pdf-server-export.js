import { authService } from '../services/firebase-auth-service.js';
import { store } from '../core/state.js';

export class PDFServerExport {
    constructor() {
        this.templateConfig = null;
    }

    setTemplateConfig(config) {
        this.templateConfig = config;
        console.log("[PDFServerExport] Template Config updated:", config?.templateId);
    }

    /**
     * Call Firebase Cloud Function to generate PDF
     */
    async generatePDF(pages, cover, assets, returnBlob = false) {
        console.log("[PDFServerExport] Requesting server-side PDF generation...");
        this.showProgress('Initiating secure generation...', 0, 100);

        try {
            // Get Firebase Functions instance
            if (!window.firebase || !window.firebase.functions) {
                throw new Error("Firebase Functions not initialized");
            }

            const functions = window.firebase.functions();

            // Note: Cloud Functions v1 mapped differently than v2 locally sometimes,
            // but typical call:
            const generateMemoryDirectorPdf = functions.httpsCallable('generateMemoryDirectorPdf');

            // Format data payload for Cloud Function
            const bookData = {
                pages: pages,
                cover: cover,
                assets: assets,
                title: cover?.title || "My Photo Book",
                template: this.templateConfig?.templateId || null,
                globalCornerRadius: store.state.globalCornerRadius || 0,
                pageFormat: store.state.pageFormat || "square-10x10"
            };

            this.showProgress('Processing high-resolution images mapping...', 20, 100);

            // Call function (Timeout extended for large PDFs)
            const result = await generateMemoryDirectorPdf({ bookData });
            const pdfRes = result.data;

            if (!pdfRes || !pdfRes.success || !pdfRes.pdfDownloadUrl) {
                throw new Error('Failed to generate PDF: ' + (pdfRes?.error || 'Unknown server error'));
            }

            console.log(`[PDFServerExport] Generation Success! PDF Download URL: ${pdfRes.pdfDownloadUrl}`);
            this.showProgress('Downloading final PDF...', 80, 100);

            // Hide progress
            this.hideProgress();

            if (returnBlob) {
                // Fetch the generated PDF URL and convert to blob
                console.log("[PDFServerExport] Fetching PDF Blob from URL...");
                const fileResponse = await fetch(pdfRes.pdfDownloadUrl);
                if (!fileResponse.ok) {
                    throw new Error(`Failed to fetch PDF Blob: ${fileResponse.statusText}`);
                }
                const blob = await fileResponse.blob();
                console.log(`[PDFServerExport] Fetched Blob length: ${blob.size}`);
                return blob;
            } else {
                // Just trigger the download natively
                this.showDownloadModal(pdfRes.pdfDownloadUrl);
            }

        } catch (error) {
            console.error('[PDFServerExport] PDF generation failed:', error);
            this.hideProgress();
            alert('Server PDF Generation Failed: ' + error.message);
        }
    }

    showProgress(message, current, total) {
        let overlay = document.getElementById('pdf-progress-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'pdf-progress-overlay';
            overlay.innerHTML = `
                <div class="pdf-progress-content">
                    <div class="pdf-progress-spinner"></div>
                    <div class="pdf-progress-message"></div>
                    <div class="pdf-progress-bar-container">
                        <div class="pdf-progress-bar"></div>
                    </div>
                </div>
            `;
            // Keep CSS inline or injected
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 10000;
            `;
            // Quick CSS injection
            const style = document.createElement('style');
            style.textContent = `
                .pdf-progress-content { background: white; padding: 40px; border-radius: 12px; text-align: center; min-width: 300px; }
                .pdf-progress-spinner { width: 40px; height: 40px; border: 4px solid #e0e0e0; border-top: 4px solid #6366f1; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 20px; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                .pdf-progress-message { font-size: 16px; color: #333; margin-bottom: 16px; }
                .pdf-progress-bar-container { height: 8px; background: #e0e0e0; border-radius: 4px; overflow: hidden; }
                .pdf-progress-bar { height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); transition: width 0.3s ease; }
            `;
            document.head.appendChild(style);
            document.body.appendChild(overlay);
        }

        overlay.querySelector('.pdf-progress-message').textContent = message;
        const percent = Math.round((current / total) * 100);
        overlay.querySelector('.pdf-progress-bar').style.width = `${percent}%`;
    }

    hideProgress() {
        const overlay = document.getElementById('pdf-progress-overlay');
        if (overlay) overlay.remove();
    }

    showDownloadModal(url, filenameProvided = null) {
        const modal = document.getElementById('pdfDownloadModal');
        const btn = document.getElementById('btn-download-trigger');
        const filename = filenameProvided || `photo-book-${new Date().toISOString().slice(0, 10)}.pdf`;

        if (modal && btn) {
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            newBtn.onclick = (e) => {
                e.preventDefault();
                newBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Downloading...';
                try {
                    const a = document.createElement('a');
                    a.style.display = 'none';
                    a.href = url;
                    a.download = filename;
                    a.type = 'application/pdf';
                    document.body.appendChild(a);
                    a.click();
                    setTimeout(() => {
                        newBtn.innerHTML = 'Download PDF';
                        if (document.body.contains(a)) document.body.removeChild(a);
                    }, 3000);
                } catch (err) {
                    alert("Download Error: " + err.message);
                    newBtn.innerHTML = 'Download PDF';
                }
            };
            modal.classList.add('active');
        } else {
            // Fallback
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }
    }
}

export const pdfServerExport = new PDFServerExport();
