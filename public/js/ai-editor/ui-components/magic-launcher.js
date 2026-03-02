/**
 * Magic Create v2 Launcher UI
 * Handles the user interface for start the AI album generation.
 */

import { store } from '../core/state.js';

class MagicLauncher {
    constructor() {
        this.modalId = 'magic-create-v2-modal';
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        this.injectModal();
        this.initialized = true;
    }

    injectModal() {
        if (document.getElementById(this.modalId)) return;

        const modalHtml = `
        <div id="${this.modalId}" class="md-modal-overlay">
            <div class="ml-card">
                <!-- Decorations -->
                <div class="ml-orb ml-orb-1"></div>
                <div class="ml-orb ml-orb-2"></div>
                
                <div id="magic-launcher-start">
                    <div class="ml-header">
                        <div class="ml-icon-wrapper">
                            <i class="fa-solid fa-wand-magic-sparkles"></i>
                        </div>
                        <h2>יצירת קסם</h2>
                        <p>תן ל-AI לטוות את התמונות שלך לסיפור.</p>
                    </div>

                    <div class="ml-input-group">
                        <label>מה האווירה של האלבום הזה?</label>
                        <div class="ml-textarea-wrapper">
                            <textarea id="magic-prompt-input" 
                                placeholder="לדוגמה חתונת יער קסומה עם גוונים ירוקים רכים..." style="text-align: right;" dir="rtl"></textarea>
                            <i class="fa-solid fa-pen-fancy ml-input-icon"></i>
                        </div>
                        <div class="ml-hints">
                            <span>דוגמאות:</span>
                            <button onclick="document.getElementById('magic-prompt-input').value='שקיעה רומנטית בחוף'">חוף ים</button>
                            <button onclick="document.getElementById('magic-prompt-input').value='אדריכלות מודרנית ומינימליסטית'">מודרני</button>
                            <button onclick="document.getElementById('magic-prompt-input').value='היסטוריה משפחתית בסגנון וינטג'">וינטג'</button>
                        </div>
                    </div>

                    <div class="ml-footer" style="flex-direction: row-reverse;">
                        <button class="ml-btn ml-btn-primary" onclick="magicLauncher.start()">
                            <span class="ml-btn-content">
                                <i class="fa-solid fa-stars"></i> צור אלבום
                            </span>
                            <div class="ml-btn-glow"></div>
                        </button>
                        <button class="ml-btn ml-btn-cancel" onclick="magicLauncher.close()">
                            ביטול
                        </button>
                    </div>
                </div>

                <!-- Progress State (Legacy - kept for fallback but usually hidden) -->
                <div id="magic-launcher-progress" style="display: none; text-align: center; color: white;">
                    <div class="spinner"></div>
                    <p>מאתחל...</p>
                    <div id="magic-log" style="display:none"></div>
                </div>
            </div>
            
            <style>
                @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600&family=Playfair+Display:ital,wght@0,600;1,600&display=swap');

                .md-modal-overlay {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background-color: rgba(5, 5, 10, 0.85);
                    backdrop-filter: blur(12px);
                    display: none; align-items: center; justify-content: center;
                    z-index: 10001;
                    opacity: 0; transition: opacity 0.3s ease;
                }
                .md-modal-overlay.active { opacity: 1; }

                .ml-card {
                    position: relative;
                    width: 90%; max-width: 550px;
                    background: rgba(20, 20, 30, 0.6);
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    border-radius: 24px;
                    padding: 40px;
                    overflow: hidden;
                    box-shadow: 0 40px 100px rgba(0,0,0,0.6);
                    color: white;
                    font-family: 'Outfit', sans-serif;
                    transform: translateY(20px); transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                }
                .md-modal-overlay.active .ml-card { transform: translateY(0); }

                /* Orbs */
                .ml-orb {
                    position: absolute; border-radius: 50%; filter: blur(60px); opacity: 0.4; z-index: -1;
                }
                .ml-orb-1 { width: 300px; height: 300px; background: #6366f1; top: -100px; left: -100px; animation: floatOrb 10s infinite ease-in-out; }
                .ml-orb-2 { width: 250px; height: 250px; background: #a855f7; bottom: -50px; right: -50px; animation: floatOrb 12s infinite ease-in-out reverse; }
                @keyframes floatOrb { 0% { transform: translate(0,0); } 50% { transform: translate(20px, 30px); } 100% { transform: translate(0,0); } }

                .ml-header { text-align: center; margin-bottom: 30px; }
                .ml-icon-wrapper {
                    width: 60px; height: 60px; margin: 0 auto 16px;
                    background: linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2));
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 50%; display: flex; align-items: center; justify-content: center;
                    font-size: 24px; color: #a855f7;
                    box-shadow: 0 0 30px rgba(168, 85, 247, 0.3);
                }
                .ml-header h2 { font-family: 'Playfair Display', serif; font-size: 32px; font-weight: 600; margin: 0 0 8px; letter-spacing: -0.5px; }
                .ml-header p { color: #9ca3af; font-size: 16px; margin: 0; font-weight: 300; }

                .ml-input-group label { display: block; font-size: 14px; font-weight: 600; color: #e5e7eb; margin-bottom: 12px; letter-spacing: 0.5px; text-transform: uppercase; }
                
                .ml-textarea-wrapper { position: relative; }
                .ml-textarea-wrapper textarea {
                    width: 100%; min-height: 100px;
                    background: rgba(0,0,0,0.3);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 16px;
                    padding: 16px 16px 16px 44px;
                    color: white; font-family: 'Outfit', sans-serif; font-size: 16px;
                    resize: none; outline: none; transition: all 0.3s;
                }
                .ml-textarea-wrapper textarea:focus {
                    background: rgba(0,0,0,0.5); border-color: #8b5cf6;
                    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.15);
                }
                .ml-input-icon {
                    position: absolute; top: 20px; left: 16px; color: #6b7280; pointer-events: none;
                }
                .ml-textarea-wrapper textarea:focus + .ml-input-icon { color: #8b5cf6; }

                .ml-hints { display: flex; gap: 8px; margin-top: 12px; align-items: center; }
                .ml-hints span { font-size: 12px; color: #6b7280; }
                .ml-hints button {
                    background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.05);
                    border-radius: 20px; padding: 4px 12px; color: #9ca3af; font-size: 12px; cursor: pointer; transition: all 0.2s;
                }
                .ml-hints button:hover { background: rgba(255,255,255,0.1); color: white; border-color: rgba(255,255,255,0.2); }

                .ml-footer { display: flex; gap: 16px; margin-top: 40px; }
                .ml-btn { flex: 1; padding: 14px; border-radius: 14px; border: none; font-size: 16px; font-weight: 600; cursor: pointer; transition: all 0.3s; position: relative; overflow: hidden; }
                .ml-btn-cancel { background: transparent; color: #9ca3af; border: 1px solid rgba(255,255,255,0.1); }
                .ml-btn-cancel:hover { background: rgba(255,255,255,0.05); color: white; }
                
                .ml-btn-primary {
                    background: linear-gradient(135deg, #6366f1, #a855f7); color: white;
                    box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
                }
                .ml-btn-primary:hover {
                    transform: translateY(-2px); box-shadow: 0 15px 30px -5px rgba(99, 102, 241, 0.5);
                }
                .ml-btn-glow {
                    position: absolute; top: -50%; left: -50%; width: 200%; height: 200%;
                    background: radial-gradient(circle, rgba(255,255,255,0.3) 0%, transparent 60%);
                    opacity: 0; transform: scale(0.5); transition: opacity 0.5s, transform 0.5s;
                }
                .ml-btn-primary:hover .ml-btn-glow { opacity: 1; transform: scale(1); transition: 0s; }

            </style>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    open(photos) {
        if (!this.initialized) this.init();
        if (!photos || photos.length === 0) {
            alert('אנא בחר מספר תמונות קודם!');
            return;
        }
        this.selectedPhotos = photos;

        // Reset UI
        document.getElementById('magic-launcher-start').style.display = 'block';
        document.getElementById('magic-launcher-progress').style.display = 'none';
        document.getElementById('magic-prompt-input').value = '';

        document.getElementById(this.modalId).style.display = 'flex';
        document.getElementById(this.modalId).classList.add('active'); // For CSS transitions if any
    }

    close() {
        document.getElementById(this.modalId).style.display = 'none';
        document.getElementById(this.modalId).classList.remove('active');
    }

    async start() {
        const prompt = document.getElementById('magic-prompt-input').value;

        // Switch to progress view
        document.getElementById('magic-launcher-start').style.display = 'none';
        document.getElementById('magic-launcher-progress').style.display = 'block';

        const logEl = document.getElementById('magic-log');
        const updateLog = (msg) => {
            const div = document.createElement('div');
            div.textContent = `> ${msg}`;
            logEl.appendChild(div);
            logEl.scrollTop = logEl.scrollHeight;
        };

        try {
            updateLog("Starting engine...");

            const magicCreate = new window.MagicCreateV4();

            // SECURITY: Use internal store assets if available to ensure ID consistency
            const photosToUse = store?.state?.assets?.photos?.length > 0
                ? store.state.assets.photos
                : this.selectedPhotos;

            // Close launcher immediately so V4 UI can take over and NOT be obscured by z-index
            this.close();

            const album = await magicCreate.run(
                prompt,
                photosToUse,
                {
                    maxPages: 50,
                    photosPerPage: 3,
                    includeAiBackgrounds: true,
                    includeDecorativeText: true
                }
            );

            updateLog("Album generation complete!");


        } catch (e) {
            console.error(e);
            alert("יצירת קסם נכשלה: " + e.message);
            this.close();
        }
    }


}

export const magicLauncher = new MagicLauncher();
window.magicLauncher = magicLauncher;
