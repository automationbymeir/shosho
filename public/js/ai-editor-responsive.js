/**
 * Responsive Logic & Polyfills for AI Editor
 */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize Mobile Drag and Drop Polyfill
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    if (isTouchDevice && typeof MobileDragDrop !== 'undefined') {
        MobileDragDrop.polyfill({
            dragImageTranslateOverride: MobileDragDrop.scrollBehaviourDragImageTranslateOverride,
            holdToDrag: 250 // slight delay allows vertical scrolling over elements
        });

        // Needed for iOS to stop body scroll during drag
        window.addEventListener('touchmove', function (e) { }, { passive: false });
        console.log('[Responsive] Mobile drag and drop polyfill enabled.');
    }

    // 2. Pinch-to-zoom for the Canvas Viewport
    if (isTouchDevice) {
        initPinchToZoom();
    }
});

function initPinchToZoom() {
    const viewport = document.getElementById('canvas-viewport');
    const container = document.getElementById('canvas-container');
    if (!viewport || !container) return;

    let initialDistance = 0;
    let currentScale = 1;

    viewport.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            initialDistance = getDistance(e.touches[0], e.touches[1]);
        }
    }, { passive: true });

    viewport.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const scaleFactor = currentDistance / initialDistance;

            // Limit zoom
            currentScale = Math.max(0.5, Math.min(3, currentScale * scaleFactor));

            container.style.transform = `scale(${currentScale})`;
            initialDistance = currentDistance;

            // Prevent default zooming
            e.preventDefault();
        }
    }, { passive: false });

    // Double tap to reset
    let lastTap = 0;
    viewport.addEventListener('touchend', (e) => {
        const now = Date.now();
        if (e.touches.length === 0 && now - lastTap < 300) {
            currentScale = 1;
            container.style.transform = 'scale(1)';
        }
        lastTap = now;
    });

    console.log('[Responsive] Pinch to zoom initialized.');
}

function getDistance(touch1, touch2) {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
}
