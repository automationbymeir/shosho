/**
 * Order Flow Simulation
 * Handles the Review & Order process.
 */

const PAYPAL_CLIENT_ID = "AeaBp323CjqYmHp-xUAI75zxRjYdV-zZBX9qoxbipdeQooVrakI7aAdfbPizQ3QmsUe0MjZ-4X71PuiC";
const MOCK_MODE = true; // Enable for testing/demo without backend

// Load PayPal SDK dynamically
function loadPayPalSDK() {
    return new Promise((resolve, reject) => {
        if (MOCK_MODE) {
            console.log("[OrderFlow] Mock Mode: Skipping PayPal SDK load.");
            resolve({ Buttons: () => ({ render: () => { } }) }); // Mock object
            return;
        }
        if (window.paypal) {
            resolve(window.paypal);
            return;
        }
        const script = document.createElement('script');
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=ILS`; // Changed to ILS to match backend default
        script.onload = () => resolve(window.paypal);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export const orderFlow = {
    MOCK_MODE: true,

    async startOrderFlow(pdfBlob) {
        const state = window.app.state;
        const user = state.user;

        if (!user && !this.MOCK_MODE) {
            alert("Please sign in to order.");
            return;
        }

        // Calculate Price (Simple Logic)
        const pageCount = state.pages.length || 20;
        const basePrice = 119.00; // ILS
        const extraPagePrice = 5.00; // ILS
        const extraPages = Math.max(0, pageCount - 20);
        const bookPrice = basePrice + (extraPages * extraPagePrice);
        const shippingPrice = 25.00; // ILS
        const total = bookPrice + shippingPrice;

        this.currentOrder = {
            bookPrice,
            shipping: shippingPrice,
            total,
            currency: 'ILS',
            pageCount,
            pdfBlob
        };

        // 1. Show Upload UI
        const overlay = this.createOverlay();
        document.body.appendChild(overlay);

        try {
            // 2. Upload PDF
            const pdfUrl = await this.uploadPdfToStorage(pdfBlob, user?.uid || 'anon', (progress) => {
                const bar = document.getElementById('upload-progress');
                if (bar) bar.style.width = `${progress}%`;
            });

            // 3. Show Payment UI
            await this.showPaymentUI(overlay, pdfUrl);

        } catch (error) {
            console.error("Order Flow Error:", error);
            alert("Failed to process order: " + error.message);
            document.body.removeChild(overlay);
        }
    },

    createOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'order-overlay';
        Object.assign(overlay.style, {
            position: 'fixed', top: '0', left: '0', width: '100%', height: '100%',
            backgroundColor: 'rgba(0,0,0,0.9)', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', zIndex: '9999', color: 'white',
            fontFamily: '"Inter", sans-serif'
        });

        overlay.innerHTML = `
            <div id="upload-stage" style="text-align:center;">
                <i class="fa-solid fa-cloud-arrow-up fa-3x fa-bounce" style="margin-bottom:20px;"></i>
                <h2>Uploading Your Album...</h2>
                <p>Securing your memories in the cloud.</p>
                <div style="width: 300px; height: 6px; background: #333; margin: 20px auto; border-radius: 3px; overflow: hidden;">
                    <div id="upload-progress" style="width: 0%; height: 100%; background: #4285F4; transition: width 0.3s;"></div>
                </div>
            </div>
            <div id="payment-stage" style="display:none; text-align:center; width: 100%; max-width: 500px;">
                <!-- Payment UI injected here -->
            </div>
        `;
        return overlay;
    },

    async uploadPdfToStorage(blob, uid, onProgress) {
        if (this.MOCK_MODE) {
            console.log("[OrderFlow] Mock Uploading PDF...");
            for (let i = 0; i <= 100; i += 10) {
                onProgress(i);
                await new Promise(r => setTimeout(r, 100));
            }
            return "https://mock-storage.com/album.pdf";
        }

        const timestamp = Date.now();
        const filename = `orders/${uid}/${timestamp}_album.pdf`;
        const ref = firebase.storage().ref().child(filename);
        const task = ref.put(blob);

        return new Promise((resolve, reject) => {
            task.on('state_changed',
                (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    onProgress(progress);
                },
                (error) => reject(error),
                async () => {
                    const url = await task.snapshot.ref.getDownloadURL();
                    resolve(url);
                }
            );
        });
    },

    async showPaymentUI(overlay, pdfUrl) {
        const order = this.currentOrder;
        const uploadStage = overlay.querySelector('#upload-stage');
        const paymentStage = overlay.querySelector('#payment-stage');

        uploadStage.style.display = 'none';
        paymentStage.style.display = 'block';

        paymentStage.innerHTML = `
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #333;">
                <h2 style="margin-bottom: 20px;">Review & Pay</h2>
                <div style="text-align:left; background: #222; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <span>Hardcover Album (8x8)</span>
                        <span>₪${order.bookPrice.toFixed(2)}</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <span>Shipping (HFD Courier)</span>
                        <span>₪${order.shipping.toFixed(2)}</span>
                    </div>
                    <div style="border-top: 1px solid #444; margin: 10px 0;"></div>
                    <div style="display:flex; justify-content:space-between; font-weight: bold; font-size: 1.2em;">
                        <span>Total</span>
                        <span>₪${order.total.toFixed(2)}</span>
                    </div>
                </div>
                
                <div id="paypal-button-container"></div>

                ${this.MOCK_MODE ? `
                <div style="margin-top: 20px; border-top: 1px dashed #555; padding-top: 20px;">
                    <p style="color: #eda50d; font-size: 0.9em; margin-bottom: 10px;">🚧 Test Mode Active</p>
                    <button id="btn-mock-pay" style="width: 100%; background: #eda50d; color: black; font-weight: bold; padding: 12px; border: none; border-radius: 4px; cursor: pointer;">
                        Simulate PayPal Success
                    </button>
                    <div style="margin-top: 10px; font-size: 0.8em; color: #888;">
                        Bookpod API will be mocked.
                    </div>
                </div>
                ` : ''}
                
                <button id="btn-cancel-order" style="background: transparent; color: #888; border: none; margin-top: 20px; cursor: pointer; text-decoration: underline;">
                    Cancel
                </button>
            </div>
        `;

        document.getElementById('btn-cancel-order').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // Mock Payment Handler
        if (this.MOCK_MODE) {
            document.getElementById('btn-mock-pay').addEventListener('click', async () => {
                await this.handleOrderSuccess(paymentStage, 'MOCK-ORDER-ID-12345', pdfUrl);
            });
            return;
        }

        // Initialize PayPal
        await loadPayPalSDK();

        paypal.Buttons({
            createOrder: async (data, actions) => {
                // Call Cloud Function to create order
                try {
                    const createFn = firebase.functions().httpsCallable('createPayPalOrder');
                    const result = await createFn({
                        amount: order.total.toFixed(2),
                        currency: order.currency
                    });
                    return result.data.id;
                } catch (e) {
                    console.error("Create Order Error:", e);
                    alert("Could not initialize payment. Please try again.");
                    throw e;
                }
            },
            onApprove: async (data, actions) => {
                await this.handleOrderSuccess(paymentStage, data.orderID, pdfUrl);
            },
            onError: (err) => {
                console.error("PayPal Error:", err);
                alert("PayPal Payment Error. Please try again.");
            }
        }).render('#paypal-button-container');
    },

    async handleOrderSuccess(paymentStage, orderId, pdfUrl) {
        // Show processing state
        paymentStage.innerHTML = `
            <div style="padding: 40px;">
                <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #4285F4; margin-bottom: 20px;"></i>
                <h3>Processing Payment...</h3>
                <p>We are finalizing your order.</p>
            </div>
        `;

        try {
            if (this.MOCK_MODE) {
                console.log("[OrderFlow] Mocking Capture & Bookpod API...");
                await new Promise(r => setTimeout(r, 1500)); // Simulate delay

                // Simulate Bookpod API Payload
                const bookData = {
                    title: window.app.state.cover?.title || "My Photo Book",
                    pages: window.app.state.pages.length,
                    cover: window.app.state.cover,
                    pdfUrl: pdfUrl,
                    shipping: "MOCK ADDRESS"
                };
                console.log("--------------- BOOKPOD API PAYLOAD (MOCK) ---------------");
                console.log(JSON.stringify(bookData, null, 2));
                console.log("----------------------------------------------------------");

                // Success
                this.renderSuccessUI(paymentStage);
                return;
            }

            // Real Backend Call
            const captureFn = firebase.functions().httpsCallable('capturePayPalOrder');

            // Prepare Book Data for Fulfillment
            const bookData = {
                title: window.app.state.cover?.title || "My Photo Book",
                pages: window.app.state.pages, // Full page data
                cover: window.app.state.cover,
                // Add print specific options if needed
                bookpodPrint: {
                    printcolor: "color",
                    sheettype: "white80",
                    laminationtype: "none",
                    finishtype: "hard", // Hardcover
                    width: 200, // 20x20cm approx
                    height: 200
                }
            };

            const orderDraft = {
                quantity: 1,
                totalprice: this.currentOrder.total,
                shippingDetails: {
                    // Mock shipping details - in real app, collect in UI BEFORE PayPal
                    firstName: window.app.state.user.displayName?.split(' ')[0] || "Valued",
                    lastName: window.app.state.user.displayName?.split(' ')[1] || "Customer",
                    phone: "0500000000",
                    city: "Tel Aviv",
                    address1: "Rothschild 1",
                    shippingMethod: 2 // Home Delivery
                },
                invoiceUrl: pdfUrl
            };

            const result = await captureFn({
                orderId: orderId,
                bookData: bookData,
                pdfDownloadUrl: pdfUrl,
                orderDraft: orderDraft
            });

            if (result.data.success) {
                this.renderSuccessUI(paymentStage);
            } else {
                throw new Error(result.data.error || "Unknown error");
            }
        } catch (e) {
            console.error("Capture Error:", e);
            paymentStage.innerHTML = `
                <div style="padding: 40px;">
                    <i class="fa-solid fa-circle-exclamation fa-3x" style="color: #e74c3c; margin-bottom: 20px;"></i>
                    <h3>Payment Failed</h3>
                    <p>${e.message}</p>
                    <button onclick="document.body.removeChild(document.getElementById('order-overlay'))" style="margin-top:20px; padding:10px 20px; border:none; background:#333; color:white; border-radius:5px; cursor:pointer;">
                        Close
                    </button>
                </div>
            `;
        }
    },

    renderSuccessUI(paymentStage) {
        paymentStage.innerHTML = `
            <div style="padding: 40px;">
                <i class="fa-solid fa-check-circle fa-4x" style="color: #27ae60; margin-bottom: 20px;"></i>
                <h3>Order Confirmed!</h3>
                <p>Thank you! Your album is on its way.</p>
                <div style="margin-top: 15px; font-size: 0.9em; color: #888; background: #222; padding: 10px; border-radius: 4px;">
                    Order ID: #${Math.floor(Math.random() * 1000000)}<br>
                    Sent to Bookpod Production
                </div>
                <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; border:none; background:#333; color:white; border-radius:5px; cursor:pointer;">
                    Make Another Book
                </button>
            </div>
        `;
    }
};
