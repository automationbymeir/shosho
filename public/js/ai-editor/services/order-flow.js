/**
 * Order Flow Simulation
 * Handles the Review & Order process.
 */

const PAYPAL_CLIENT_ID = "AeaBp323CjqYmHp-xUAI75zxRjYdV-zZBX9qoxbipdeQooVrakI7aAdfbPizQ3QmsUe0MjZ-4X71PuiC";
const MOCK_MODE = false; // Disable mock mode for real orders

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
        script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=ILS`; 
        script.onload = () => resolve(window.paypal);
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

export const orderFlow = {
    MOCK_MODE: false,

    async startOrderFlow(pdfBlob) {
        let state = window.app.state;
        let user = state.user;

        if (!user) {
            const overlay = document.createElement('div');
            overlay.innerHTML = `
                <div style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); z-index:99999; display:flex; align-items:center; justify-content:center; backdrop-filter: blur(5px); direction: rtl; font-family: 'Inter', sans-serif;">
                    <div style="background:#1e1e1e; padding:40px; border-radius:12px; border: 1px solid #333; color:white; text-align:center; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <i class="fa-solid fa-user-lock fa-3x" style="color: #4285F4; margin-bottom: 20px;"></i>
                        <h2 style="margin-bottom:15px; font-weight: 600;">התחברות חובה להמשך</h2>
                        <p style="margin-bottom:25px; color: #aaa; line-height: 1.5;">כדי שנוכל לשמור את פרטי ההזמנה שלך, לעקוב אחר המשלוח ולעדכן אותך במייל – עליך להתחבר למערכת.</p>
                        <button id="btn-force-login" style="background:#4285F4; color:white; border:none; padding:12px 24px; border-radius:8px; font-size:16px; font-weight: 500; cursor:pointer; width: 100%; transition: background 0.2s;">
                            <i class="fa-brands fa-google" style="margin-left: 8px;"></i> התחבר עם Google
                        </button>
                        <button id="btn-force-cancel" style="background:transparent; color:#888; margin-top:20px; border:none; cursor:pointer; font-size: 14px; text-decoration: underline;">חזור לעריכה</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            return new Promise((resolve) => {
                document.getElementById('btn-force-login').addEventListener('click', async () => {
                    document.body.removeChild(overlay);
                    try {
                        const { authService } = await import('./firebase-auth-service.js');
                        await authService.signInWithGoogle();
                        // Wait briefly for observer
                        await new Promise(r => setTimeout(r, 1000));
                        // Restart the order flow after successful login
                        resolve(this.startOrderFlow(pdfBlob)); 
                    } catch (e) {
                        console.error(e);
                        alert("ההתחברות נכשלה, אנא נסה שוב.");
                        resolve();
                    }
                });
                document.getElementById('btn-force-cancel').addEventListener('click', () => {
                    document.body.removeChild(overlay);
                    resolve();
                });
            });
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
            alert("שגיאה בעיבוד ההזמנה: " + error.message);
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

    async uploadPdfToStorage(blob, uid, onProgress, suffix = 'album') {
        if (this.MOCK_MODE) {
            console.log(`[OrderFlow] Mock Uploading PDF (${suffix})...`);
            for (let i = 0; i <= 100; i += 10) {
                onProgress(i);
                await new Promise(r => setTimeout(r, 100));
            }
            return `https://mock-storage.com/${suffix}.pdf`;
        }

        const timestamp = Date.now();
        const filename = `orders/${uid}/${timestamp}_${suffix}.pdf`;
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

        // Load saved shipping address
        let savedAddress = {};
        if (window.app.state.user) {
            try {
                const { authService } = await import('./firebase-auth-service.js');
                const db = authService.getDB();
                const doc = await db.collection("users").doc(window.app.state.user.uid).get();
                if (doc.exists && doc.data().shippingAddress) {
                    savedAddress = doc.data().shippingAddress;
                }
            } catch (e) {
                console.error("Failed to load saved address", e);
            }
        }

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

            const pickupContainer = document.getElementById('pickup-point-container');
            if (pickupContainer) {
                pickupContainer.style.display = (shipMethod === '1') ? 'block' : 'none';
            }
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
                                <option value="chromo170">כרומו לבן לח ליין 170 גרם (קלאסי)</option>
                                <option value="chromo130">מט פרימיום 130 גרם</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">למינציה בכריכה</label>
                            <select id="book-lamination" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="none" selected>ללא למינציה (מראה טבעי)</option>
                                <option value="flat">מבריק (Flat)</option>
                                <option value="matt">מט (Matt)</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">רוחב ספר (ס"מ)</label>
                            <select id="book-width" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="10.5">10.5</option>
                                <option value="11">11</option>
                                <option value="12">12</option>
                                <option value="13">13</option>
                                <option value="14">14</option>
                                <option value="14.8">14.8</option>
                                <option value="15">15</option>
                                <option value="16">16</option>
                                <option value="17">17</option>
                                <option value="18">18</option>
                                <option value="19">19</option>
                                <option value="20" selected>20</option>
                                <option value="21">21</option>
                                <option value="22">22</option>
                            </select>
                        </div>
                        <div>
                            <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">גובה ספר (ס"מ)</label>
                            <select id="book-height" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                                <option value="14.8">14.8</option>
                                <option value="15">15</option>
                                <option value="16">16</option>
                                <option value="17">17</option>
                                <option value="18">18</option>
                                <option value="19">19</option>
                                <option value="20" selected>20</option>
                                <option value="21">21</option>
                                <option value="22">22</option>
                                <option value="23">23</option>
                                <option value="24">24</option>
                                <option value="25">25</option>
                                <option value="26">26</option>
                                <option value="27">27</option>
                                <option value="28">28</option>
                                <option value="29">29</option>
                                <option value="29.7">29.7</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Shipping Form -->
                <div style="background: #222; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                    <h4 style="margin-bottom: 10px; color: #ccc;"><i class="fa-solid fa-truck"></i> פרטי משלוח</h4>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="ship-name" placeholder="שם מלא" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${savedAddress.name || window.app.state.user?.displayName || ''}">
                        <input type="email" id="ship-email" placeholder="אימייל" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${savedAddress.email || window.app.state.user?.email || ''}">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="tel" id="ship-phone" placeholder="טלפון מדוייק (חובה)" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${savedAddress.phoneNumber || ''}">
                        <input type="text" id="ship-city" placeholder="עיר מגורים" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${savedAddress.city || ''}">
                    </div>
                    <div style="display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="ship-street" placeholder="רחוב" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${savedAddress.street || ''}">
                        <input type="text" id="ship-house" placeholder="מס' בניין" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${savedAddress.house || ''}">
                        <input type="text" id="ship-apartment" placeholder="דירה" title="דירה" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${savedAddress.apartment || ''}">
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr; gap: 10px; margin-bottom: 10px;">
                        <input type="text" id="ship-zip" placeholder="מיקוד (אופציונלי)" style="padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;" value="${savedAddress.zipCode || ''}">
                    </div>
                    <div>
                        <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">שיטת משלוח</label>
                        <select id="ship-method" style="width:100%; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white;">
                            <option value="2" selected>שליח עד הבית (₪25)</option>
                            <option value="1">נקודת איסוף K.Express (₪0)</option>
                            <option value="3">איסוף עצמי מהמפעל (₪0)</option>
                        </select>
                    </div>
                    <div id="pickup-point-container" style="display:none; margin-top: 10px;">
                        <label style="display:block; margin-bottom:4px; font-size:13px; color:#aaa;">בחירת נקודת חלוקה</label>
                        <div style="display: flex; gap: 8px;">
                            <button id="btn-fetch-points" type="button" style="padding:8px 12px; border-radius:4px; border:none; background:#4285f4; color:white; cursor:pointer; font-family: 'Inter', sans-serif;">חפש נקודות</button>
                            <select id="ship-pickup-point" style="flex:1; padding:8px; border-radius:4px; border:1px solid #444; background:#333; color:white; max-width: 300px;">
                                <option value="">יש לחפש ולבחור נקודה</option>
                            </select>
                        </div>
                        <div id="pickup-point-loading" style="display:none; color:#aaa; font-size:12px; margin-top:4px;">מחפש נקודות קרובות...</div>
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

        const shipMethodSelect = document.getElementById('ship-method');
        const cityInput = document.getElementById('ship-city');
        const streetInput = document.getElementById('ship-street');
        const fetchPointsBtn = document.getElementById('btn-fetch-points');

        shipMethodSelect.addEventListener('change', (e) => {
            updatePrice();
            if (e.target.value === '1' && cityInput.value.trim()) {
                fetchPointsBtn.click();
            }
        });

        const tryAutoFetch = () => {
            if (shipMethodSelect.value === '1' && cityInput.value.trim()) {
                fetchPointsBtn.click();
            }
        };
        
        cityInput.addEventListener('blur', tryAutoFetch);
        streetInput.addEventListener('blur', tryAutoFetch);

        document.getElementById('btn-cancel-order').addEventListener('click', () => {
            document.body.removeChild(overlay);
        });

        document.getElementById('btn-fetch-points').addEventListener('click', async () => {
            const city = document.getElementById('ship-city').value.trim();
            const street = document.getElementById('ship-street').value.trim();
            const loading = document.getElementById('pickup-point-loading');
            const selectEl = document.getElementById('ship-pickup-point');

            if (!city) {
                alert("אנא הזן עיר מגורים כדי לחפש נקודות איסוף.");
                return;
            }

            try {
                loading.style.display = 'block';
                const searchFn = firebase.functions().httpsCallable('bookpodSearchPickupPoints');
                const result = await searchFn({ address: { city: city, address1: street } });
                const points = result.data.pickupPoints || [];

                selectEl.innerHTML = '';
                if (points.length === 0) {
                    selectEl.innerHTML = '<option value="">לא נמצאו נקודות, נסה שנית.</option>';
                } else {
                    points.forEach(p => {
                        const opt = document.createElement('option');
                        opt.value = p.id || p.n_code;
                        opt.textContent = `${p.name} - ${p.city}, ${p.street} ${p.house || ''}`;
                        selectEl.appendChild(opt);
                    });
                }
            } catch (err) {
                console.error("Failed to fetch pickup points:", err);
                alert("שגיאה בחיפוש נקודות איסוף.");
            } finally {
                loading.style.display = 'none';
            }
        });

        // Validation Extractor
        const extractFormData = () => {
            const name = document.getElementById('ship-name').value.trim();
            const phone = document.getElementById('ship-phone').value.trim();
            const email = document.getElementById('ship-email').value.trim();
            const city = document.getElementById('ship-city').value.trim();
            const street = document.getElementById('ship-street').value.trim();
            const house = document.getElementById('ship-house').value.trim();
            const apartment = document.getElementById('ship-apartment').value.trim();
            const zipCode = document.getElementById('ship-zip').value.trim();
            const method = document.getElementById('ship-method').value;
            const pickupPoint = document.getElementById('ship-pickup-point')?.value;

            const paperType = document.getElementById('book-paper-type').value;
            const lamination = document.getElementById('book-lamination').value;
            // book-width and book-height are read inside the bookpod object below

            if (!name || !phone || !city) {
                alert("אנא מלא את כל פרטי המשלוח (שם עיר וטלפון חובה).");
                return null;
            }

            if (method === '2') {
                if (!street || !house) {
                    alert("במשלוח עד הבית חובה להזין רחוב ומספר בית.");
                    return null;
                }
            }
            
            if (method === '1' && !pickupPoint) {
                alert("אנא בחר נקודת איסוף.");
                return null;
            }

            return {
                shipping: {
                    name: name,
                    phoneNumber: phone,
                    email: email,
                    city: city,
                    street: street,
                    house: house,
                    apartment: apartment,
                    zipCode: zipCode,
                    shippingMethod: parseInt(method, 10),
                    pickupPoint: method === '1' ? pickupPoint : undefined,
                    reference_num1: 'REF_' + Date.now() // required by API
                },
                bookpod: {
                    printcolor: "color",
                    sheettype: paperType,
                    laminationtype: lamination,
                    finishtype: "soft", // Bookpod API requires 'soft'
                    width: parseFloat(document.getElementById('book-width')?.value || '20'),
                    height: parseFloat(document.getElementById('book-height')?.value || '20'),
                    readingdirection: window.app?.state?.language === 'en' ? 'left' : 'right',
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

        // Mutable refs for final PDF URLs (may be replaced after re-generation)
        let finalPdfUrl    = pdfUrl;
        let finalCoverPdfUrl = null;

        paypal.Buttons({
            createOrder: async (data, actions) => {
                const formData = extractFormData();
                if (!formData) {
                    throw new Error("Validation Failed");
                }

                // Re-generate content PDF + cover PDF at the selected physical dimensions
                const wCm = formData.bookpod.width;
                const hCm = formData.bookpod.height;
                if (window.pdfCanvasExport?.setBookSizeCm) {
                    window.pdfCanvasExport.setBookSizeCm(wCm, hCm);
                    // Ensure templateConfig is set so template-based text (textContent) is applied in PDF
                    const tmConfig = window.app?.templateSidebar?.manager?.config;
                    if (tmConfig && window.pdfCanvasExport.setTemplateConfig) {
                        window.pdfCanvasExport.setTemplateConfig(tmConfig);
                    }
                    const uid = window.app?.state?.user?.uid || 'anon';

                    // --- Content PDF ---
                    try {
                        const newBlob = await window.pdfCanvasExport.generatePDF(
                            window.app.state.pages, window.app.state.cover, window.app.state.assets, true
                        );
                        if (newBlob) {
                            finalPdfUrl = await this.uploadPdfToStorage(newBlob, uid, () => {});
                        }
                    } catch (regenErr) {
                        console.warn('[OrderFlow] Content PDF regen failed, using original:', regenErr);
                    }

                    // --- Cover PDF (designed cover, client-side rendered) ---
                    try {
                        if (window.pdfCanvasExport.generateCoverPDF) {
                            const coverBlob = await window.pdfCanvasExport.generateCoverPDF(
                                window.app.state.cover, window.app.state.assets
                            );
                            if (coverBlob) {
                                finalCoverPdfUrl = await this.uploadPdfToStorage(
                                    coverBlob, uid, () => {}, 'cover'
                                );
                                console.log('[OrderFlow] Cover PDF uploaded:', finalCoverPdfUrl);
                            }
                        }
                    } catch (coverErr) {
                        console.warn('[OrderFlow] Cover PDF generation failed:', coverErr);
                    }
                }

                // Call Cloud Function to create PayPal order
                try {
                    const createFn = firebase.functions().httpsCallable('createPayPalOrder');
                    const result = await createFn({
                        amount: order.total.toFixed(2),
                        currency: order.currency
                    });

                    window._currentCheckoutFormData = formData;
                    return result.data.id;
                } catch (e) {
                    console.error("Create Order Error:", e);
                    alert("לא ניתן לאתחל את התשלום. אנא נסה שוב.");
                    throw e;
                }
            },
            onApprove: async (data, actions) => {
                await this.handleOrderSuccess(paymentStage, data.orderID, finalPdfUrl, window._currentCheckoutFormData, finalCoverPdfUrl);
            },
            onError: (err) => {
                // Ignore if it's the custom validation error
                if (err.message === "Validation Failed") return;
                console.error("PayPal Error:", err);
                alert("שגיאת תשלום PayPal. אנא נסה שוב.");
            }
        }).render('#paypal-button-container');

        // Optional UI polish: Make sure PayPal starts rendering correctly
    },

    async saveAddressToProfile(formData) {
        if (!formData || !formData.shipping) return;
        const user = window.app.state.user;
        if (!user) return;

        try {
            const { authService } = await import('./firebase-auth-service.js');
            const db = authService.getDB();
            // Preserve the address they just submitted for future checkout
            await db.collection("users").doc(user.uid).set({
                shippingAddress: {
                    name: formData.shipping.name || '',
                    phoneNumber: formData.shipping.phoneNumber || '',
                    email: formData.shipping.email || '',
                    city: formData.shipping.city || '',
                    street: formData.shipping.street || '',
                    house: formData.shipping.house || '',
                    apartment: formData.shipping.apartment || '',
                    zipCode: formData.shipping.zipCode || ''
                }
            }, { merge: true });
        } catch (e) {
            console.warn("Could not save address locally:", e);
        }
    },

    async handleOrderSuccess(paymentStage, orderId, pdfUrl, formData, coverPdfUrl = null) {
        // Show processing state
        paymentStage.innerHTML = `
            <div style="padding: 40px; text-align: center; direction: rtl;">
                <i class="fa-solid fa-circle-notch fa-spin fa-3x" style="color: #4285F4; margin-bottom: 20px;"></i>
                <h3 style="margin-bottom:10px;">מעבד תשלום ושולח לדפוס...</h3>
                <p>אנא המתן בזמן שאנו סוגרים את ההזמנה שלך מול המפעל (Bookpod).</p>
            </div>
        `;

        try {
            // Save address right as we start processing the success step
            await this.saveAddressToProfile(formData);

            if (this.MOCK_MODE) {
                console.log("[OrderFlow] Mocking Capture & Bookpod API...");
                await new Promise(r => setTimeout(r, 2000));

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
                bookpodPrint: formData.bookpod, // Injected from HTML Form selection
                // Client-generated cover PDF (designed cover); if present the server uses it
                // directly instead of generating a generic cover server-side.
                coverPdfUrl: coverPdfUrl || null
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

    async startTestFlow(pdfBlob) {
        const overlay = this.createOverlay();
        document.body.appendChild(overlay);

        try {
            const user = window.app?.state?.user;
            const pdfUrl = await this.uploadPdfToStorage(pdfBlob, user?.uid || 'test', (progress) => {
                const bar = document.getElementById('upload-progress');
                if (bar) bar.style.width = `${progress}%`;
            });

            const uploadStage = overlay.querySelector('#upload-stage');
            const paymentStage = overlay.querySelector('#payment-stage');
            if (uploadStage) uploadStage.style.display = 'none';
            if (paymentStage) {
                paymentStage.style.display = 'block';
                paymentStage.style.maxWidth = '500px';
                paymentStage.style.textAlign = 'right';
            }

            const contentArea = paymentStage || overlay;
            contentArea.innerHTML = `
                <div style="padding: 30px; direction: rtl; max-width: 500px; margin: 0 auto; font-family: 'Inter', sans-serif; color: white;">
                    <div style="background: rgba(255, 193, 7, 0.15); border: 1px solid #ffc107; border-radius: 8px; padding: 12px 16px; margin-bottom: 24px; display: flex; align-items: center; gap: 10px;">
                        <i class="fa-solid fa-flask" style="color: #ffc107; font-size: 1.2rem;"></i>
                        <span style="color: #ffc107; font-weight: 600;">מצב בדיקה — ללא תשלום</span>
                    </div>

                    <h2 style="margin: 0 0 20px 0; font-size: 1.4rem;">שליחה ישירה לדפוס (בדיקה)</h2>

                    <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 24px;">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.85rem; color: #94a3b8;">שם מלא</label>
                            <input id="test-name" type="text" value="Test User" style="padding: 10px; background: #1e1e2f; color: white; border: 1px solid #444; border-radius: 6px; font-family: inherit; direction: rtl;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.85rem; color: #94a3b8;">טלפון</label>
                            <input id="test-phone" type="text" value="0500000000" style="padding: 10px; background: #1e1e2f; color: white; border: 1px solid #444; border-radius: 6px; font-family: inherit; direction: ltr; text-align: left;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.85rem; color: #94a3b8;">עיר</label>
                            <input id="test-city" type="text" value="תל אביב" style="padding: 10px; background: #1e1e2f; color: white; border: 1px solid #444; border-radius: 6px; font-family: inherit; direction: rtl;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.85rem; color: #94a3b8;">רחוב ומספר בית</label>
                            <input id="test-street" type="text" value="הרצל 1" style="padding: 10px; background: #1e1e2f; color: white; border: 1px solid #444; border-radius: 6px; font-family: inherit; direction: rtl;">
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <label style="font-size: 0.85rem; color: #94a3b8;">סוג נייר</label>
                            <select id="test-paper" style="padding: 10px; background: #1e1e2f; color: white; border: 1px solid #444; border-radius: 6px; font-family: inherit;">
                                <option value="white80">לבן רגיל 80g</option>
                                <option value="coated115">מצופה 115g</option>
                                <option value="coated150">מצופה 150g</option>
                            </select>
                        </div>
                    </div>

                    <div id="test-status" style="display: none; margin-bottom: 16px; padding: 12px; border-radius: 6px; text-align: center;"></div>

                    <div style="display: flex; gap: 10px;">
                        <button id="test-cancel-btn" style="flex: 1; padding: 12px; background: rgba(255,255,255,0.05); color: #a1a1aa; border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; cursor: pointer; font-size: 1rem;">
                            ביטול
                        </button>
                        <button id="test-send-btn" style="flex: 2; padding: 12px; background: linear-gradient(135deg, #f59e0b, #d97706); color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i class="fa-solid fa-flask"></i> שלח לדפוס (בדיקה)
                        </button>
                    </div>
                </div>
            `;

            document.getElementById('test-cancel-btn').addEventListener('click', () => {
                document.body.removeChild(overlay);
            });

            document.getElementById('test-send-btn').addEventListener('click', async () => {
                const sendBtn = document.getElementById('test-send-btn');
                const statusDiv = document.getElementById('test-status');
                sendBtn.disabled = true;
                sendBtn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> מייצר כריכה ושולח לדפוס...';

                const name = document.getElementById('test-name').value.trim();
                const phone = document.getElementById('test-phone').value.trim();
                const city = document.getElementById('test-city').value.trim();
                const street = document.getElementById('test-street').value.trim();
                const paper = document.getElementById('test-paper').value;

                // Read actual selected dimensions from pdfCanvasExport
                const bookSz = window.pdfCanvasExport?.bookSizeCm;
                const wCm = bookSz?.width  || 20.0;
                const hCm = bookSz?.height || 20.0;
                const uid  = window.app?.state?.user?.uid || 'test';

                // Generate client-side cover PDF (designed cover)
                let testCoverPdfUrl = null;
                try {
                    if (window.pdfCanvasExport?.generateCoverPDF) {
                        const coverBlob = await window.pdfCanvasExport.generateCoverPDF(
                            window.app?.state?.cover, window.app?.state?.assets
                        );
                        if (coverBlob) {
                            testCoverPdfUrl = await this.uploadPdfToStorage(coverBlob, uid, () => {}, 'cover');
                            console.log('[TestFlow] Cover PDF uploaded:', testCoverPdfUrl);
                        }
                    }
                } catch (covErr) {
                    console.warn('[TestFlow] Cover PDF generation skipped:', covErr);
                }

                const bookData = {
                    title: window.app?.state?.cover?.title || "Test Photo Book",
                    pages: window.app?.state?.pages,
                    cover: window.app?.state?.cover,
                    bookpodPrint: {
                        printcolor: "color",
                        sheettype: paper,
                        laminationtype: "none",
                        finishtype: "soft",
                        width: wCm,
                        height: hCm,
                        readingdirection: window.app?.state?.language === 'en' ? 'left' : 'right',
                        bleed: true
                    },
                    coverPdfUrl: testCoverPdfUrl
                };

                const orderDraft = {
                    quantity: 1,
                    totalprice: 0,
                    invoiceUrl: pdfUrl,
                    shippingDetails: {
                        name,
                        phoneNumber: phone,
                        city,
                        street,
                        house: "",
                        shippingMethod: 2,
                        reference_num1: 'TEST_' + Date.now()
                    }
                };

                try {
                    const testFn = firebase.functions().httpsCallable('testDirectPrint');
                    const result = await testFn({ bookData, pdfDownloadUrl: pdfUrl, orderDraft });

                    statusDiv.style.display = 'block';
                    statusDiv.style.background = 'rgba(39, 174, 96, 0.15)';
                    statusDiv.style.border = '1px solid #27ae60';
                    statusDiv.style.color = '#27ae60';
                    statusDiv.innerHTML = `
                        <i class="fa-solid fa-check-circle"></i> הועבר לדפוס בהצלחה!<br>
                        <small style="color: #94a3b8; font-size: 0.8rem;">Book ID: ${result.data?.bookpodBook?.book?.bookid || 'N/A'}</small>
                    `;
                    sendBtn.innerHTML = '<i class="fa-solid fa-check"></i> נשלח!';
                    console.log('[testDirectPrint] Result:', result.data);
                } catch (err) {
                    console.error('[testDirectPrint] Error:', err);
                    statusDiv.style.display = 'block';
                    statusDiv.style.background = 'rgba(231, 76, 60, 0.15)';
                    statusDiv.style.border = '1px solid #e74c3c';
                    statusDiv.style.color = '#e74c3c';
                    statusDiv.innerHTML = `<i class="fa-solid fa-circle-exclamation"></i> שגיאה: ${err.message}`;
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i class="fa-solid fa-flask"></i> נסה שוב';
                }
            });

        } catch (err) {
            console.error('[TestFlow] Error:', err);
            alert('שגיאה בהעלאת PDF: ' + err.message);
            document.body.removeChild(overlay);
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
