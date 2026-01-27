/**
 * Centralized Error Handler
 */
class ErrorHandler {
    constructor(eventBus) {
        this.eventBus = eventBus;
        this.errors = [];
        this.maxErrors = 50;
    }

    handle(error, context = {}) {
        const errorEntry = {
            message: error.message || String(error),
            stack: error.stack,
            context,
            timestamp: Date.now(),
            id: this.generateId()
        };

        this.errors.push(errorEntry);
        if (this.errors.length > this.maxErrors) {
            this.errors = this.errors.slice(-this.maxErrors);
        }

        // Emit event for UI to display
        this.eventBus.emit('error:global', errorEntry);

        // Log for debugging
        console.error(`[${context.component || 'Unknown'}] ${errorEntry.message}`, error);

        return errorEntry;
    }

    getErrors() {
        return [...this.errors];
    }

    clearErrors() {
        this.errors = [];
    }

    generateId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}

export { ErrorHandler };
