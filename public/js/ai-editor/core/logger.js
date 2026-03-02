/**
 * Production-safe logger
 * In production (hostname contains 'web.app' or 'firebaseapp.com'), 
 * all debug/log/warn calls are NO-OPS.
 * Only console.error always passes through.
 */
const IS_DEV = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
        window.location.hostname === '127.0.0.1' ||
        window.location.search.includes('debug=true'));

// NO-OP function — costs ~0.001ms vs ~0.5-2ms for actual console.log
const noop = () => { };

export const logger = {
    log: IS_DEV ? console.log.bind(console) : noop,
    warn: IS_DEV ? console.warn.bind(console) : noop,
    debug: IS_DEV ? console.debug.bind(console) : noop,
    error: console.error.bind(console), // Always show errors
    info: IS_DEV ? console.info.bind(console) : noop,
};

// Also override window.console for third-party code
if (!IS_DEV) {
    const origError = console.error.bind(console);
    // Keep console.error, silence everything else
    window.__originalConsole = { ...console };
    console.log = noop;
    console.warn = noop;
    console.debug = noop;
    console.info = noop;
    console.error = origError;
}
