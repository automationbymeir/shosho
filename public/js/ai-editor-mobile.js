/**
 * AI Editor Mobile - Touch & UI Handler
 * Provides mobile-specific functionality for the Shoso AI Editor
 */

(function () {
    'use strict';

    // ============================================
    // MOBILE DETECTION & INITIALIZATION
    // ============================================
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || (window.innerWidth < 768);

    const isTablet = /iPad/i.test(navigator.userAgent)
        || (window.innerWidth >= 768 && window.innerWidth <= 1024);

    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

    // State
    const state = {
        leftPanelExpanded: false,
        rightPanelOpen: false,
        currentTab: 'photos',
        touchStartY: 0,
        touchStartX: 0,
        isDragging: false
    };

    // ============================================
    // DOM READY INITIALIZATION
    // ============================================
    document.addEventListener('DOMContentLoaded', () => {
        if (!isMobile && !isTablet) return; // Only run on mobile/tablet

        console.log('[Mobile] Initializing mobile experience...');

        initMobileLayout();
        initBottomSheet();
        initRightPanel();
        initTouchGestures();
        initMobileFABs();
        initViewportFixes();

        console.log('[Mobile] Mobile experience initialized');
    });

    // ============================================
    // MOBILE LAYOUT INITIALIZATION
    // ============================================
    function initMobileLayout() {
        // Add mobile class to body
        document.body.classList.add('mobile-view');
        if (isTablet) document.body.classList.add('tablet-view');

        // Create backdrop overlay for panels
        const backdrop = document.createElement('div');
        backdrop.className = 'mobile-backdrop';
        backdrop.id = 'mobile-backdrop';
        backdrop.addEventListener('click', closePanels);
        document.body.appendChild(backdrop);

        // Timeline stays visible on mobile (fixed at bottom)

        // Wire up hamburger menu button
        const btnMobileMenu = document.getElementById('btn-mobile-menu');
        if (btnMobileMenu) {
            btnMobileMenu.addEventListener('click', () => {
                toggleLeftPanel();
            });
        }

        // Adjust viewport meta tag for proper mobile handling
        const viewport = document.querySelector('meta[name="viewport"]');
        if (viewport) {
            viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
        }
    }

    // ============================================
    // BOTTOM SHEET (LEFT SIDEBAR)
    // ============================================
    function initBottomSheet() {
        const sidebar = document.getElementById('sidebar-left');
        if (!sidebar || !isMobile) return;

        // Handle drag handle tap to expand/collapse
        sidebar.addEventListener('click', (e) => {
            // Ignore clicks on nav items to prevent immediate collapse after expanding
            if (e.target.closest('.nav-item')) return;

            // Only toggle if clicking the drag handle (top area)
            const rect = sidebar.getBoundingClientRect();
            if (e.clientY < rect.top + 30) {
                toggleLeftPanel();
            }
        });

        // Touch gestures for bottom sheet
        let startY = 0;
        let startHeight = 0;

        sidebar.addEventListener('touchstart', (e) => {
            startY = e.touches[0].clientY;
            startHeight = sidebar.offsetHeight;
            state.isDragging = true;
        }, { passive: true });

        sidebar.addEventListener('touchmove', (e) => {
            if (!state.isDragging) return;

            const currentY = e.touches[0].clientY;
            const diff = startY - currentY;

            // Calculate new height
            let newHeight = startHeight + diff;
            const maxHeight = window.innerHeight * 0.7;
            const minHeight = 80;

            newHeight = Math.max(minHeight, Math.min(maxHeight, newHeight));

            sidebar.style.height = `${newHeight}px`;
            sidebar.style.transition = 'none';
        }, { passive: true });

        sidebar.addEventListener('touchend', () => {
            state.isDragging = false;
            sidebar.style.transition = '';

            const height = sidebar.offsetHeight;
            const threshold = window.innerHeight * 0.3;

            if (height > threshold) {
                expandLeftPanel();
            } else {
                collapseLeftPanel();
            }
        });

        // Tab switching
        const navItems = sidebar.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                switchTab(tab);
                expandLeftPanel(); // Auto-expand when switching tabs
            });
        });
    }

    function toggleLeftPanel() {
        state.leftPanelExpanded ? collapseLeftPanel() : expandLeftPanel();
    }

    function expandLeftPanel() {
        const sidebar = document.getElementById('sidebar-left');
        if (!sidebar) return;

        sidebar.classList.add('expanded');
        sidebar.classList.remove('hidden');
        sidebar.style.height = '';
        state.leftPanelExpanded = true;

        showBackdrop();
    }

    function collapseLeftPanel() {
        const sidebar = document.getElementById('sidebar-left');
        if (!sidebar) return;

        sidebar.classList.remove('expanded');
        sidebar.classList.add('hidden');
        sidebar.style.height = '';
        state.leftPanelExpanded = false;

        hideBackdrop();
    }

    function switchTab(tabName) {
        state.currentTab = tabName;

        // Update nav items
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === tabName);
        });

        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            const isActive = pane.id === `tab-${tabName}`;
            pane.classList.toggle('active', isActive);
            pane.style.display = isActive ? 'flex' : 'none';
        });
    }

    // ============================================
    // RIGHT PANEL (PROPERTIES)
    // ============================================
    function initRightPanel() {
        const panel = document.getElementById('sidebar-right');
        if (!panel || !isMobile) return;

        // Close on pseudo-element click (the × character)
        panel.addEventListener('click', (e) => {
            const rect = panel.getBoundingClientRect();
            if (e.clientX > rect.right - 60 && e.clientY < rect.top + 60) {
                closeRightPanel();
            }
        });

        // Swipe right to close
        let startX = 0;
        panel.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
        }, { passive: true });

        panel.addEventListener('touchend', (e) => {
            const endX = e.changedTouches[0].clientX;
            if (endX - startX > 100) { // Swipe right
                closeRightPanel();
            }
        });
    }

    function openRightPanel() {
        const panel = document.getElementById('sidebar-right');
        if (!panel) return;

        panel.classList.add('open');
        state.rightPanelOpen = true;
        showBackdrop();
    }

    function closeRightPanel() {
        const panel = document.getElementById('sidebar-right');
        if (!panel) return;

        panel.classList.remove('open');
        state.rightPanelOpen = false;
        hideBackdrop();
    }

    // ============================================
    // FLOATING ACTION BUTTONS
    // ============================================
    function initMobileFABs() {
        if (!isMobile) return;

        // Magic Create FAB
        const magicFab = document.createElement('button');
        magicFab.className = 'mobile-fab mobile-fab-magic';
        magicFab.innerHTML = '<i class="fa-solid fa-wand-magic-sparkles"></i>';
        magicFab.title = 'Magic Create';
        magicFab.addEventListener('click', () => {
            // Trigger Magic Create modal
            const magicBtn = document.getElementById('btn-magic-create');
            if (magicBtn) magicBtn.click();
        });
        document.body.appendChild(magicFab);

        // Properties FAB
        const propsFab = document.createElement('button');
        propsFab.className = 'mobile-fab mobile-fab-properties';
        propsFab.innerHTML = '<i class="fa-solid fa-sliders"></i>';
        propsFab.title = 'Properties';
        propsFab.addEventListener('click', openRightPanel);
        document.body.appendChild(propsFab);
    }

    // ============================================
    // TOUCH GESTURES
    // ============================================
    function initTouchGestures() {
        if (!isTouchDevice) return;

        const viewport = document.getElementById('canvas-viewport');
        if (!viewport) return;

        // Pinch-to-zoom for canvas
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
                const scale = currentDistance / initialDistance;

                const canvas = document.getElementById('canvas-container');
                if (canvas) {
                    currentScale = Math.max(0.5, Math.min(3, currentScale * scale));
                    canvas.style.transform = `scale(${currentScale})`;
                }
                initialDistance = currentDistance;
            }
        }, { passive: true });

        // Double-tap to reset zoom
        let lastTap = 0;
        viewport.addEventListener('touchend', (e) => {
            const now = Date.now();
            if (now - lastTap < 300 && e.touches.length === 0) {
                const canvas = document.getElementById('canvas-container');
                if (canvas) {
                    currentScale = 1;
                    canvas.style.transform = 'scale(1)';
                }
            }
            lastTap = now;
        });
    }

    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // ============================================
    // VIEWPORT FIXES
    // ============================================
    function initViewportFixes() {
        // Fix for iOS address bar hiding/showing
        function setViewportHeight() {
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
        }

        setViewportHeight();
        window.addEventListener('resize', setViewportHeight);
        window.addEventListener('orientationchange', () => {
            setTimeout(setViewportHeight, 100);
        });

        // Prevent double-tap zoom
        document.addEventListener('dblclick', (e) => {
            if (isMobile) e.preventDefault();
        });

        // Prevent pull-to-refresh on Chrome Android
        document.body.style.overscrollBehavior = 'none';
    }

    // ============================================
    // BACKDROP UTILITIES
    // ============================================
    function showBackdrop() {
        const backdrop = document.getElementById('mobile-backdrop');
        if (backdrop) backdrop.classList.add('visible');
    }

    function hideBackdrop() {
        if (!state.leftPanelExpanded && !state.rightPanelOpen) {
            const backdrop = document.getElementById('mobile-backdrop');
            if (backdrop) backdrop.classList.remove('visible');
        }
    }

    function closePanels() {
        collapseLeftPanel();
        closeRightPanel();
    }

    // ============================================
    // PUBLIC API
    // ============================================
    window.MobileEditor = {
        isMobile,
        isTablet,
        isTouchDevice,
        expandLeftPanel,
        collapseLeftPanel,
        toggleLeftPanel,
        openRightPanel,
        closeRightPanel,
        switchTab
    };

})();
