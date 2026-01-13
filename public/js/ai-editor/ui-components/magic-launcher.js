/**
 * Magic Create v2 Launcher UI
 * Handles the user interface for start the AI album generation.
 */

import { store } from '../state.js';

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
        <div id="${this.modalId}" class="md-modal-overlay" style="z-index: 10001; display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0, 0, 0, 0.5); align-items: center; justify-content: center;">
            <div class="md-modal-card" style="background: #1e1e2f; padding: 25px; border-radius: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); width: 100%; max-width: 500px; color: white; position: relative;">
                <!-- Launcher State -->
                <div id="magic-launcher-start">
                    <div class="md-modal-icon" style="background: linear-gradient(135deg, #6366f1, #a855f7);">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:32px;height:32px;color:white">
                            <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                        </svg>
                    </div>
                    <h2>Magic Create v2</h2>
                    <p class="md-modal-subtitle">Fully AI-Generated Album Design</p>
                    
                    <div style="margin: 20px 0; text-align: left;">
                        <label style="display:block; font-size: 14px; font-weight: 500; margin-bottom: 8px;">What vibe are you looking for?</label>
                        <textarea id="magic-prompt-input" class="edo-textarea" 
                            placeholder="e.g. A romantic beach vacation with warm sunset colors..." 
                            style="width: 100%; min-height: 80px;"></textarea>
                    </div>

                    <div style="background: rgba(99, 102, 241, 0.1); padding: 12px; border-radius: 8px; font-size: 13px; color: #6366f1; margin-bottom: 20px;">
                        <strong>Nano Banana AI</strong> will analyze your photos, plan the story, design every page, and paint custom backgrounds.
                    </div>

                    <div class="md-modal-actions">
                        <button class="btn btn-secondary" onclick="magicLauncher.close()">Cancel</button>
                        <button class="btn btn-primary" onclick="magicLauncher.start()" style="background: linear-gradient(135deg, #6366f1, #a855f7); border: none;">
                            ✨ Magic Create
                        </button>
                    </div>
                </div>

                <!-- Progress State -->
                <div id="magic-launcher-progress" style="display: none;">
                    <div class="md-modal-icon" style="background: #e0e7ff; color: #6366f1;">
                        <div class="spinner" style="width: 24px; height: 24px; border: 3px solid #6366f1; border-top-color: transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
                    </div>
                    <h2 id="magic-progress-title">Analyzing Photos...</h2>
                    
                    <div class="progress-container" style="margin: 30px 0;">
                        <div style="background: #f3f4f6; height: 8px; border-radius: 4px; overflow: hidden;">
                            <div id="magic-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #6366f1, #a855f7); transition: width 0.3s ease;"></div>
                        </div>
                        <div id="magic-progress-text" style="margin-top: 8px; font-size: 13px; color: #6b7280;">Initializing...</div>
                    </div>

                    <div id="magic-log" style="height: 100px; overflow-y: auto; background: #f9fafb; border: 1px solid #e5e7eb; padding: 10px; font-family: monospace; font-size: 11px; text-align: left; border-radius: 4px; color: #4b5563;">
                    </div>
                </div>
            </div>
            
            <style>
            @keyframes spin { to { transform: rotate(360deg); } }
            </style>
        </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);
    }

    open(photos) {
        if (!this.initialized) this.init();
        if (!photos || photos.length === 0) {
            alert('Please select some photos first!');
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

            const album = await window.magicCreateV2.run(
                this.selectedPhotos,
                prompt,
                (stage, percent) => {
                    document.getElementById('magic-progress-title').textContent = stage;
                    document.getElementById('magic-progress-bar').style.width = percent + '%';
                    document.getElementById('magic-progress-text').textContent = `${percent}% Complete`;
                    updateLog(stage);
                }
            );

            updateLog("Album generation complete!");

            // Wait a moment then close and load
            setTimeout(() => {
                this.close();
                this.loadAlbumIntoEditor(album);
            }, 1000);

        } catch (e) {
            console.error(e);
            alert("Magic Create Failed: " + e.message);
            this.close();
        }
    }

    loadAlbumIntoEditor(album) {
        console.log("Loading Album:", album);

        // 1. Reset Pages for new book
        store.state.pages = [];
        store.state.activePageId = null;

        // 2. Load Cover Info
        if (album.story) {
            store.state.cover.title = album.story.title || "My Photo Book";
            store.state.cover.subtitle = album.story.subtitle || "Magic Created";
        }

        // 3. Process Pages
        const newPages = [];

        album.pages.forEach(p => {
            // Register Background Asset if new
            let bgId = null;
            if (p.background && p.background.imageUrl) {
                // Check if valid URL or base64
                // Create asset
                const assetId = `bg_${crypto.randomUUID()}`;
                bgId = assetId;

                store.state.assets.backgrounds.push({
                    id: assetId,
                    url: p.background.imageUrl,
                    type: 'background',
                    name: 'AI Background',
                    source: 'magic-create'
                });
            } else if (p.background && p.background.color) {
                // Determine logic for solid colors? 
                // For now, render engine might support direct color if we set it on page
            }

            // Create Page Object
            const pageId = p.pageId || crypto.randomUUID();
            const elements = (p.textElements || []).map(t => ({
                id: t.id || `txt_${crypto.randomUUID()}`,
                type: 'text',
                content: t.content,
                x: t.position?.x || 50,
                y: t.position?.y || 50,
                fontSize: t.style?.fontSize ? parseInt(t.style.fontSize) : 24,
                fontFamily: t.style?.fontFamily || 'Inter',
                color: t.style?.color || '#000000',
                align: t.style?.textAlign || 'center',
                width: 30
            }));

            newPages.push({
                id: pageId,
                backgroundId: bgId,
                backgroundColor: p.background?.color || '#ffffff',
                layout: p.layout,
                photos: [], // We need to re-map photos from layout slots?
                // The album.pages[i].layout should have slots with photoIds
                // We need to ensure the photos referenced are in store.state.assets.photos
                elements: elements
            });

            // Hack: Populate 'photos' array for the page based on layout slots
            // The renderer needs page.photos to know what's on the page for some logic, 
            // though standard layout engine usually derives layout FROM photos.
            // Here we have specific layout.
            // 4. Map Layout Slots (Flatten Schema)
            if (p.layout && p.layout.photoSlots) {
                const pagePhotos = [];
                // Transform V2 Schema (position/size objects) to V1 Flat Schema (x,y,w,h)
                p.layout.slots = p.layout.photoSlots.map(slot => {
                    const flatSlot = {
                        ...slot,
                        x: slot.x || (slot.position ? slot.position.x : 0),
                        y: slot.y || (slot.position ? slot.position.y : 0),
                        width: slot.width || (slot.size ? slot.size.width : 0),
                        height: slot.height || (slot.size ? slot.size.height : 0)
                    };

                    // Match Photo Assets for this page
                    if (slot.originalPhotoId) {
                        const photoAsset = store.state.assets.photos.find(ph => ph.id === slot.originalPhotoId);
                        if (photoAsset) pagePhotos.push(photoAsset);
                    } else if (slot.photoId) {
                        const photoAsset = store.state.assets.photos.find(ph => ph.id === slot.photoId);
                        if (photoAsset) pagePhotos.push(photoAsset);
                    }

                    return flatSlot;
                });

                newPages[newPages.length - 1].photos = pagePhotos;
            }
        });

        // 4. Update Store
        store.state.pages = newPages;
        if (newPages.length > 0) {
            store.state.activePageId = newPages[0].id;
        }

        // 5. Notify
        store.notify('pages', store.state.pages);
        store.notify('cover', store.state.cover);
        store.notify('assets', store.state.assets);

        alert("✨ Magic Aibum Created! Enjoy.");
    }
}

export const magicLauncher = new MagicLauncher();
window.magicLauncher = magicLauncher;
