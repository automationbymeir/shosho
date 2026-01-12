/**
 * Order Flow Simulation
 * Handles the Review & Order process.
 */

export const orderFlow = {
    /**
     * Start the order process
     * @param {Blob} pdfBlob The generated PDF file
     */
    /**
     * Start the order process
     * @param {Blob} pdfBlob The generated PDF file
     */
    startOrderFlow(pdfBlob) {
        // Calculate Price based on Page Count
        const state = window.app.state;
        const pageCount = state.pages.length;
        const basePrice = 29.99; // Base for 20 pages
        const extraPagePrice = 1.00;
        const extraPages = Math.max(0, pageCount - 20);
        const bookPrice = basePrice + (extraPages * extraPagePrice);

        // Store for checkout
        this.currentOrder = {
            bookPrice: bookPrice,
            shipping: 5.99,
            total: bookPrice + 5.99,
            pageCount: pageCount,
            pdfBlob: pdfBlob // In real app, we upload this Blob
        };

        // 1. Show "Processing / Uploading" Modal
        const overlay = document.createElement('div');
        overlay.id = 'order-overlay';
        overlay.style.position = 'fixed';
        overlay.style.top = '0';
        overlay.style.left = '0';
        overlay.style.width = '100%';
        overlay.style.height = '100%';
        overlay.style.backgroundColor = 'rgba(0,0,0,0.85)';
        overlay.style.display = 'flex';
        overlay.style.flexDirection = 'column';
        overlay.style.alignItems = 'center';
        overlay.style.justifyContent = 'center';
        overlay.style.zIndex = '9999';
        overlay.style.color = 'white';
        overlay.fontFamily = '"Inter", sans-serif';

        overlay.innerHTML = `
            <div style="text-align:center;">
                <i class="fa-solid fa-cloud-arrow-up fa-3x fa-bounce" style="margin-bottom:20px;"></i>
                <h2>Preparing Your Album...</h2>
                <p>Generating print-ready PDF and uploading assets.</p>
                <div style="width: 300px; height: 6px; background: #333; margin: 20px auto; border-radius: 3px; overflow: hidden;">
                    <div id="upload-progress" style="width: 0%; height: 100%; background: #4285F4; transition: width 0.3s;"></div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Simulate Upload Progress
        let progress = 0;
        const interval = setInterval(() => {
            progress += Math.random() * 15;
            if (progress > 100) progress = 100;

            const bar = document.getElementById('upload-progress');
            if (bar) bar.style.width = `${progress}%`;

            if (progress === 100) {
                clearInterval(interval);
                setTimeout(() => {
                    this.showOrderConfirmation(overlay);
                }, 800);
            }
        }, 300);
    },

    showOrderConfirmation(overlay) {
        const order = this.currentOrder;

        overlay.innerHTML = `
            <div style="text-align:center; background: #1a1a1a; padding: 40px; border-radius: 12px; border: 1px solid #333; max-width: 500px;">
                <i class="fa-solid fa-check-circle fa-4x" style="color: #27ae60; margin-bottom: 20px;"></i>
                <h2 style="margin-bottom: 10px;">Ready to Print!</h2>
                <p style="color: #aaa; margin-bottom: 30px;">Your 8x8" Layflat Album (${order.pageCount} pages) is ready.</p>
                
                <div style="text-align:left; background: #222; padding: 15px; border-radius: 8px; margin-bottom: 30px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
                        <span>Hardcover Album (8x8)</span>
                        <span>$${order.bookPrice.toFixed(2)}</span>
                    </div>
                     ${order.pageCount > 20 ? `<div style="font-size:0.8em; color:#888; margin-left:10px;">(Includes ${order.pageCount - 20} extra pages @ $1.00/ea)</div>` : ''}
                    <div style="display:flex; justify-content:space-between; margin-bottom: 10px;">
                        <span>Shipping (Standard)</span>
                        <span>$${order.shipping.toFixed(2)}</span>
                    </div>
                    <div style="border-top: 1px solid #444; margin: 10px 0;"></div>
                    <div style="display:flex; justify-content:space-between; font-weight: bold; font-size: 1.1em;">
                        <span>Total</span>
                        <span>$${order.total.toFixed(2)}</span>
                    </div>
                </div>

                <button id="btn-pay" style="
                    background: #27ae60; 
                    color: white; 
                    border: none; 
                    padding: 12px 30px; 
                    font-size: 16px; 
                    border-radius: 6px; 
                    cursor: pointer; 
                    font-weight: 600;
                    width: 100%;
                ">PROCEED TO CHECKOUT</button>
                
                <button id="btn-cancel-order" style="
                    background: transparent; 
                    color: #888; 
                    border: none; 
                    margin-top: 15px; 
                    cursor: pointer; 
                    text-decoration: underline;
                ">Go Back to Editor</button>
            </div>
        `;

        const btnPay = document.getElementById('btn-pay');
        btnPay.addEventListener('click', () => {
            btnPay.textContent = 'Redirecting...';
            setTimeout(() => {
                alert(`Redirecting to payment gateway for $${order.total.toFixed(2)}...`);
                document.body.removeChild(overlay);
            }, 1000);
        });

        document.getElementById('btn-cancel-order').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });
    }
};
