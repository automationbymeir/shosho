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

        paymentStage.style.maxWidth = '600px';

        // Helper to recalculate total
        const updatePrice = () => {
            const shipMethod = document.getElementById('ship-method')?.value || '2';
            let shipCost = (shipMethod === '2') ? 25.00 : 0.00;
            const totalEl = document.getElementById('ui-total-price');
            const shipEl = document.getElementById('ui-shipping-price');
            order.shipping = shipCost;
            order.total = order.bookPrice + order.shipping;
            if (shipEl) shipEl.textContent = `₪${order.shipping.toFixed(2)}`;
            if (totalEl) totalEl.textContent = `₪${order.total.toFixed(2)}`;
        };

        paymentStage.innerHTML = `
            <div style="background: #1a1a1a; padding: 30px; border-radius: 12px; border: 1px solid #333; text-align: right; direction: rtl; max-height: 85vh; overflow-y: auto;">
                <h2 style="margin-bottom: 20px; text-align: center;">סקירה והזמנה נשלחת להדפסה</h2>
                
                <!-- BookPod Options -->
                <div style="background: #222; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #ccc;"><i class="fa-solid fa-book-open"></i> הגדרות הפקה (Bookpod)</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">סוג דפים</label>
                            <select id="book-paper-type" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="white80">כרומו לבן לח ליין 170 גרם (קלאסי)</option>
                                <option value="matte130">מט פרימיום 130 גרם</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">למינציה בכריכה</label>
                            <select id="book-lamination" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="none" selected>ללא למינציה (מראה טבעי)</option>
                                <option value="glossy">מבריק</option>
                                <option value="matte">מט</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Shipping Form -->
                <div style="background: #222; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #ccc;"><i class="fa-solid fa-truck"></i> פרטי משלוח</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="ship-fname" placeholder="שם פרטי" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${window.app.state.user?.displayName?.split(' ')[0] || ''}">
                        <input type="text" id="ship-lname" placeholder="שם משפחה" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${window.app.state.user?.displayName?.split(' ')[1] || ''}">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="tel" id="ship-phone" placeholder="מס׳ טלפון מדויק לשליח" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                        <input type="text" id="ship-city" placeholder="עיר מגורים" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                    </div>
                    <input type="text" id="ship-address" placeholder="רחוב, מספר בית ודירה" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white; margin-bottom: 10px; box-sizing: border-box;">
                    <div>
                        <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">שיטת משלוח</label>
                        <select id="ship-method" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                            <option value="2" selected>שליח עד הבית (₪25)</option>
                            <option value="pickup">איסוף עצמי - תל אביב (₪0)</option>
                        </select>
                    </div>
                </div>

                <div style="text-align:right; background: #333; padding: 15px; border-radius: 8px; margin-bottom: 25px;">
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <span>₪${order.bookPrice.toFixed(2)}</span>
                        <span>אלבום כריכה קשה (≈20x20 ס״מ)</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <span id="ui-shipping-price">₪${order.shipping.toFixed(2)}</span>
                        <span>דמי משלוח</span>
                    </div>
                    <div style="border-top: 1px solid #555; margin: 10px 0;"></div>
                    <div style="display:flex; justify-content:space-between; font-weight: bold; font-size: 1.2em; color: #6366f1;">
                        <span id="ui-total-price">₪${order.total.toFixed(2)}</span>
                        <span>סה״כ לתשלום</span>
                    </div>
                </div>
                
                <div id="paypal-button-container" style="direction: ltr;"></div>

                ${this.MOCK_MODE ? `
                <div style="margin-top: 20px; border-top: 1px dashed #555; padding-top: 20px;">
                    <p style="color: #eda50d; font-size: 0.9em; margin-bottom: 10px; text-align: center;">🚧 מצב הדגמה פעיל</p>
                    <button id="btn-mock-pay" style="width: 100%; background: #eda50d; color: black; font-weight: bold; padding: 12px; border: none; border-radius: 4px; cursor: pointer;">
                        Simulate Payment Success (Test)
                    </button>
                    <div style="margin-top: 10px; font-size: 0.8em; color: #888; text-align: center;">
                        הזמנה תישלח ל-API הוירטואלי של בוקפוד.
                    </div>
                </div>
                ` : ''}
                
                <div style="text-align: center;">
                    <button id="btn-cancel-order" style="background: transparent; color: #888; border: none; margin-top: 20px; cursor: pointer; text-decoration: underline; font-family: 'Inter', sans-serif;">
                        ביטול וחזרה
                    </button>
                </div>
            </div>
        `;

        document.getElementById('ship-method').addEventListener('change', updatePrice);

        document.getElementById('btn-cancel-order').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        // Validation Extractor
        const extractFormData = () => {
            const fname = document.getElementById('ship-fname').value.trim();
            const lname = document.getElementById('ship-lname').value.trim();
            const phone = document.getElementById('ship-phone').value.trim();
            const city = document.getElementById('ship-city').value.trim();
            const address = document.getElementById('ship-address').value.trim();
            const method = document.getElementById('ship-method').value;

            const paperType = document.getElementById('book-paper-type').value;
            const lamination = document.getElementById('book-lamination').value;

            if (!fname || !phone || !city || !address) {
                alert("אנא מלא את כל פרטי המשלוח (שם, טלפון, עיר וכתובת).");
                return null;
            }

            return {
                shipping: {
                    firstName: fname,
                    lastName: lname,
                    phone: phone,
                    city: city,
                    address1: address,
                    shippingMethod: method === 'pickup' ? 0 : 2
                },
                bookpod: {
                    printcolor: "color",
                    sheettype: paperType,
                    laminationtype: lamination,
                    finishtype: "soft", // Bookpod API requires 'soft'
                    width: 20.0, // Requires CM (10.50-22.00)
                    height: 20.0, // Requires CM (14.80-29.70)
                    readingdirection: "right", // API expects 'right' or 'left'
                    bleed: true // Required
                }
            };
        };

        // Mock Payment Handler
        if (this.MOCK_MODE) {
            document.getElementById('btn-mock-pay').addEventListener('click', async () => {
                const data = extractFormData();
                if (!data) return;
                await this.handleOrderSuccess(paymentStage, 'MOCK-ORDER-ID-12345', pdfUrl, data);
            });
            return;
        }

        // Initialize PayPal
        await loadPayPalSDK();

        paypal.Buttons({
            createOrder: async (data, actions) => {
                const formData = extractFormData();
                if (!formData) {
                    // Prevent PayPal popup if validation fails
                    throw new Error("Validation Failed");
                }

                // Call Cloud Function to create order
                try {
                    const createFn = firebase.functions().httpsCallable('createPayPalOrder');
                    const result = await createFn({
                        amount: order.total.toFixed(2),
                        currency: order.currency
                    });

                    // Storing formData temporarily so onApprove can use it
                    window._currentCheckoutFormData = formData;

                    return result.data.id;
                } catch (e) {
                    console.error("Create Order Error:", e);
                    alert("Could not initialize payment. Please try again.");
                    throw e;
                }
            },
            onApprove: async (data, actions) => {
                await this.handleOrderSuccess(paymentStage, data.orderID, pdfUrl, window._currentCheckoutFormData);
            },
            onError: (err) => {
                // Ignore if it's the custom validation error
                if (err.message === "Validation Failed") return;
                console.error("PayPal Error:", err);
                alert("PayPal Payment Error. Please try again.");
            }
        }).render('#paypal-button-container');
    },

    async handleOrderSuccess(paymentStage, orderId, pdfUrl, formData) {
        // Show processing state
        paymentStage.innerHTML = `
            <div style="padding: 40px; text-align: center; direction: rtl;">
                <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #4285F4; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom:10px;">מעבד תשלום ושולח לדפוס...</h3>
                <p>אנא המתן בזמן שאנו סוגרים את ההזמנה שלך מול המפעל (Bookpod).</p>
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
                    shippingDraft: formData.shipping,
                    productionDraft: formData.bookpod
                };
                console.log("--------------- BOOKPOD API PAYLOAD (MOCK) ---------------");
                console.log(JSON.stringify(bookData, null, 2));
                console.log("----------------------------------------------------------");

                // Success
                this.renderSuccessUI(paymentStage, orderId);
                return;
            }

            // Real Backend Call
            const captureFn = firebase.functions().httpsCallable('capturePayPalOrder');

            // Prepare Book Data for Fulfillment (BookPod standard schema mapping)
            const bookData = {
                title: window.app.state.cover?.title || "My Photo Book",
                pages: window.app.state.pages, // Full page data required for any backend rendering pipeline
                cover: window.app.state.cover,
                bookpodPrint: formData.bookpod // Injected from HTML Form selection
            };

            const orderDraft = {
                quantity: 1,
                totalprice: this.currentOrder.total,
                shippingDetails: formData.shipping, // Injected from HTML Form selection
                invoiceUrl: pdfUrl
            };

            const result = await captureFn({
                orderId: orderId,
                bookData: bookData,
                pdfDownloadUrl: pdfUrl,
                orderDraft: orderDraft
            });

            if (result.data.success) {
                this.renderSuccessUI(paymentStage, orderId);
            } else {
                throw new Error(result.data.error || "Unknown error during fulfillment API.");
            }
        } catch (e) {
            console.error("Capture Error:", e);
            paymentStage.innerHTML = `
                <div style="padding: 40px; text-align: center; direction: rtl;">
                    <i class="fa-solid fa-circle-exclamation fa-3x" style="color: #e74c3c; margin-bottom: 20px;"></i>
                    <h3>שגיאה בחיוב</h3>
                    <p>${e.message}</p>
                    <button onclick="document.body.removeChild(document.getElementById('order-overlay'))" style="margin-top:20px; padding:10px 20px; border:none; background:#333; color:white; border-radius:5px; cursor:pointer;">
                        סגור וחזור לעורך
                    </button>
                </div>
            `;
        }
    },

    renderSuccessUI(paymentStage, orderId = "MOCK") {
        paymentStage.innerHTML = `
            <div style="padding: 40px; text-align: center; direction: rtl;">
                <i class="fa-solid fa-check-circle fa-4x" style="color: #27ae60; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom: 10px;">ההזמנה הושלמה בהצלחה!</h3>
                <p>תודה רבה! האלבום שלך בדרך לדפוס.</p>
                <div style="margin-top: 15px; font-size: 0.9em; color: #888; background: #222; padding: 10px; border-radius: 4px; border: 1px solid #444;">
                    מספר הזמנה: #${orderId.includes('MOCK') ? Math.floor(Math.random() * 1000000) : orderId}<br>
                    <span style="color: #4285F4; font-weight: bold; display: block; margin-top: 5px;">הועבר לייצור Bookpod</span>
                </div>
                <button onclick="location.reload()" style="margin-top:20px; padding:12px 24px; border:none; background:#6366f1; color:white; border-radius:5px; cursor:pointer; font-weight: bold; font-family: 'Inter', sans-serif;">
                    צור אלבום נוסף
                </button>
            </div>
        `;
    }
};
