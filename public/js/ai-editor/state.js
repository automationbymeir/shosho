/**
 * State Management for Shoso AI Editor
 * Uses a lightweight Proxy-based system for reactivity.
 */

class EditorStore {
    constructor() {
        this.listeners = new Set();

        const initialState = {
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

        this.history = [];
        this.historyIndex = -1;
        this.maxHistory = 50;

        this.state = new Proxy(initialState, {
            set: (target, property, value) => {
                target[property] = value;
                this.notify(property, value);
                return true;
            }
        });
    }

    // History Management
    pushState(actionName = 'Unknown Action') {
        // Remove any future history if we're in the middle of the stack
        if (this.historyIndex < this.history.length - 1) {
            this.history = this.history.slice(0, this.historyIndex + 1);
        }

        // Create a deep snapshot of the current state components that need history
        const snapshot = JSON.parse(JSON.stringify({
            pages: this.state.pages,
            cover: this.state.cover,
            assets: this.state.assets, // Optional: might be too heavy? Let's keep it for now as assets like photos are critical.
            theme: this.state.theme
        }));

        this.history.push({
            name: actionName,
            timestamp: Date.now(),
            snapshot: snapshot
        });

        // Limit history size
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        } else {
            this.historyIndex++;
        }

        console.log(`[Store] Pushed state: ${actionName}. History size: ${this.history.length}`);
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
        // We do this individually to trigger notifications appropriately if needed, 
        // though our simple proxy might just need singular updates.
        // Direct assignment triggers the Proxy trap.
        if (s.pages) this.state.pages = JSON.parse(JSON.stringify(s.pages));
        if (s.cover) this.state.cover = JSON.parse(JSON.stringify(s.cover));
        if (s.assets) this.state.assets = JSON.parse(JSON.stringify(s.assets));
        if (s.theme) this.state.theme = s.theme;

        // Force a global refresh notification to ensure all UI components update
        this.notify('history_restore', null);
    }

    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    notify(property, value) {
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
