/**
 * State Management for Shoso AI Editor
 * Uses a lightweight Proxy-based system for reactivity.
 */

class EditorStore {
    constructor() {
        this.listeners = new Set();
        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        this._isBatchUpdating = false;

        const initialState = this.getInitialState();
        // Expose internal target for direct writes (bypasses Proxy)
        this._target = initialState;

        this.state = new Proxy(initialState, {
            get: (target, property) => {
                // PERFORMANCE: Removed auto-heal checks from getter.
                // These were running on EVERY property access (thousands per frame).
                // Auto-heal is now in notify() which runs far less often.
                return target[property];
            },
            set: (target, property, value) => {
                target[property] = value;
                if (!this._isBatchUpdating) {
                    this.notify(property, value);
                }
                return true;
            }
        });
    }

    getInitialState() {
        return {
            activePageId: null,
            pages: [],         // Array of Page objects
            assets: {
                photos: [],
                designs: [], // text textures etc
                backgrounds: [], // Initialize empty array
                frames: [], // Initialize empty array
                textStyles: []
            },
            selection: null,   // Currently selected element ID
            theme: 'classic',   // Global theme ID
            cover: {
                layout: 'standard', // standard, full-bleed, photo-bottom
                title: 'My Photo Book',
                subtitle: '2025',
                spineText: 'My Photo Book',
                frontPhotoId: null,
                backPhotoId: null,
                theme: 'classic', // Can be different from book? Let's assume sync for now but allow override
                textColor: '#000000'
            },
            viewMode: 'pages' // 'pages' | 'cover'
        };
    }

    reset() {
        const freshState = this.getInitialState();
        // Reset properties one by one to trigger Proxy traps if needed, 
        // OR just overwrite the keys of current state object if it is the target.
        // Since we wrapped 'initialState' object in Proxy, we can mutate it.

        Object.keys(this.state).forEach(key => {
            // Check if key exists in freshState (to avoid keeping stale keys)
            // But we also need to clear keys that are NOT in freshState if any were added.
            // Simplified: Copy fresh keys over.
            if (key !== 'user') { // Preserve user session if it's in state (it is stored in app.js usually but sometimes synced)
                // Actually app.js:72 says store.state.user = user. We should KEEP user.
                delete this.state[key];
            }
        });

        this._isBatchUpdating = true;
        Object.assign(this.state, freshState);
        this._isBatchUpdating = false;

        // Clear History
        this.history = [];
        this.historyIndex = -1;

        console.log('[Store] State reset to initial.');
        this.notify('reset', null);
    }

    // History Management
    pushState(actionName = 'Unknown Action') {
        // PERFORMANCE: Debounce rapid pushState calls for the same action
        // (e.g., dragging creates dozens of pushState('Move Element') calls)
        const now = Date.now();
        if (this._lastPushAction === actionName && now - (this._lastPushTime || 0) < 300) {
            // Coalesce rapid same-action pushes — skip the clone
            return;
        }
        this._lastPushAction = actionName;
        this._lastPushTime = now;

        // Remove any future history if we're in the middle of the stack
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        let snapshot;
        try {
            // PERFORMANCE: Use structuredClone (fastest) with JSON fallback
            const cloneObject = (obj) => {
                try { return structuredClone(obj); } catch (e) { }
                return JSON.parse(JSON.stringify(obj));
            };

            snapshot = {
                pages: cloneObject(this.state.pages || []),
                cover: cloneObject(this.state.cover || {}),
                theme: this.state.theme
            };

            // Strip large base64 data URLs from history
            if (snapshot.pages) {
                for (const page of snapshot.pages) {
                    if (page.photos && Array.isArray(page.photos)) {
                        for (const photo of page.photos) {
                            if (photo && photo.url && photo.url.startsWith('data:')) {
                                photo.url = photo.url.substring(0, 100) + '...[base64]';
                            }
                        }
                    }
                }
            }
        } catch (e) {
            return; // Exit gracefully
        }

        this.history.push({
            name: actionName,
            timestamp: now,
            snapshot: snapshot
        });

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }
    }

    undo() {
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.restoreState(this.history[this.historyIndex]);
            console.log(`[Store] Undid to state index ${this.historyIndex}`);
        } else {
            console.warn('[Store] Nothing to undo');
        }
    }

    redo() {
        if (this.historyIndex < this.history.length - 1) {
            this.historyIndex++;
            this.restoreState(this.history[this.historyIndex]);
            console.log(`[Store] Redid to state index ${this.historyIndex}`);
        } else {
            console.warn('[Store] Nothing to redo');
        }
    }

    restoreState(historyItem) {
        if (!historyItem || !historyItem.snapshot) return;

        const s = historyItem.snapshot;

        // Restore components
        this._isBatchUpdating = true;

        const cloneObject = (obj) => {
            if (typeof structuredClone === 'function') {
                try { return structuredClone(obj); } catch (e) { }
            }
            return JSON.parse(JSON.stringify(obj));
        };

        if (s.pages) {
            this.state.pages = cloneObject(s.pages);
            // Ensure the active page wasn't deleted in this historical state
            if (!this.state.pages.find(p => p.id === this.state.activePageId) && this.state.pages.length > 0) {
                this.state.activePageId = this.state.pages[0].id;
            }
        }
        if (s.cover) this.state.cover = cloneObject(s.cover);
        if (s.assets) this.state.assets = cloneObject(s.assets);
        if (s.theme) this.state.theme = s.theme;
        this._isBatchUpdating = false;

        // Force a global refresh notification to ensure all UI components update
        this.notify('history_restore', null);
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(property, value) {
        // AUTO-HEAL: Check on notify (infrequent) instead of every getter access
        if (property === 'pages' && window._magicPages && window._magicPages.length > 1) {
            const pages = this._target.pages;
            if (!pages || pages.length <= 1) {
                this._target.pages = window._magicPages;
            } else if (pages.length === 1 && pages[0]?.id && !pages[0].id.startsWith('page_')) {
                this._target.pages = window._magicPages;
            }
        }
        if (property === 'cover' && window._magicCover && window._magicCover.background) {
            const cover = this._target.cover;
            if (cover && cover.theme === 'classic' && cover.background === undefined && window._magicCover.theme !== 'classic') {
                this._target.cover = { ...window._magicCover };
            }
        }
        this.listeners.forEach(listener => listener(this.state, property, value));
    }

    // Actions
    addPage() {
        const newPage = {
            id: crypto.randomUUID(),
            layout: 'single', // Default layout
            elements: [],     // Photos, Text, etc.
            background: this.state.theme
        };
        this.state.pages = [...this.state.pages, newPage];
        this.state.activePageId = newPage.id;
    }

    setTheme(themeId) {
        this.state.theme = themeId;
        // Propagate to all pages? Or just future ones? Design choice: ALL.
        this.state.pages = this.state.pages.map(p => ({ ...p, background: themeId }));
        // Also update cover
        if (this.state.cover) {
            this.state.cover.theme = themeId;
            // Maybe set background color if theme provides it? 
            // RenderEngine checks theme for cover background effectively if we pass it properly.
            // renderCover currently uses cover.color.
            // Let's map theme to cover color/texture if possible?
            // For now, let's assume the renderEngine or sidebar handles theme->prop mapping?
            // The sidebar `store.setTheme(bg.id)` passes the ID.
            // renderCover checks `cover.color`.
            // Let's rely on RenderEngine to look up theme if we add `cover.backgroundId`?
            // RenderEngine.renderCover doesn't use backgroundId. It uses color.
            // We should ideally update `cover.color` or `cover.background` here too if we want immediate effect.
        }
        this.notify('theme', themeId);
        this.notify('pages', this.state.pages); // Force rerender
        this.notify('cover', this.state.cover);
    }
}

export const store = new EditorStore();
window.store = store;
