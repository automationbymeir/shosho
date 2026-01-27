/**
 * Event Bus - Decouples components for better testability
 * Components emit events instead of directly calling each other
 */
class EventBus {
    constructor() {
        this.events = {};
        this.history = []; // For debugging/testing
    }

    on(event, callback, context = null) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push({ callback, context });
        return () => this.off(event, callback); // Return unsubscribe function
    }

    off(event, callback) {
        if (!this.events[event]) return;
        this.events[event] = this.events[event].filter(e => e.callback !== callback);
    }

    emit(event, data = null) {
        const timestamp = Date.now();
        this.history.push({ event, data, timestamp });

        // Keep history manageable
        if (this.history.length > 100) {
            this.history = this.history.slice(-50);
        }

        if (!this.events[event]) return;
        this.events[event].forEach(({ callback, context }) => {
            try {
                callback.call(context, data);
            } catch (error) {
                console.error(`Event handler error for ${event}:`, error);
            }
        });
    }

    // For testing - get event history
    getHistory(eventName = null) {
        if (eventName) {
            return this.history.filter(h => h.event === eventName);
        }
        return this.history;
    }

    // For testing - clear all
    reset() {
        this.events = {};
        this.history = [];
    }
}

// Singleton instance
const eventBus = new EventBus();

// Event constants - prevents typos
const EVENTS = {
    // State events
    STATE_CHANGED: 'state:changed',
    STATE_RESET: 'state:reset',

    // Photo events
    PHOTOS_LOADED: 'photos:loaded',
    PHOTOS_SELECTED: 'photos:selected',
    PHOTO_EDITED: 'photo:edited',

    // Layout events
    LAYOUT_GENERATED: 'layout:generated',
    LAYOUT_UPDATED: 'layout:updated',
    PAGE_ADDED: 'page:added',
    PAGE_REMOVED: 'page:removed',

    // Render events
    RENDER_STARTED: 'render:started',
    RENDER_COMPLETE: 'render:complete',
    RENDER_ERROR: 'render:error',

    // AI/Magic Create events
    AI_PROCESSING: 'ai:processing',
    AI_COMPLETE: 'ai:complete',
    AI_ERROR: 'ai:error',

    // Export events
    EXPORT_STARTED: 'export:started',
    EXPORT_PROGRESS: 'export:progress',
    EXPORT_COMPLETE: 'export:complete',
    EXPORT_ERROR: 'export:error',

    // Auth events
    AUTH_SIGNED_IN: 'auth:signedIn',
    AUTH_SIGNED_OUT: 'auth:signedOut',
    AUTH_ERROR: 'auth:error',

    // Error events
    ERROR: 'error:global'
};

export { eventBus, EVENTS };
