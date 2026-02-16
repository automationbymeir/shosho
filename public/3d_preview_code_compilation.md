# 3D Book Preview Code Compilation

This document aggregates all the code responsible for the 3D Book Preview functionality in the Shoso AI Editor.

---

## 1. HTML Reference & Button
**File:** `/Users/meir.horwitz/Documents/Projects/Shoso/Shoso/public/ai-editor.html`

### CSS Link (Head)
```html
<!-- Enhanced 3D Book Styles -->
<link rel="stylesheet" href="css/book-3d-enhanced.css">
```

### Preview Button (Toolbar)
```html
<button class="btn-secondary" id="btn-preview">Preview</button>
```

---

## 2. Activation Logic
**File:** `/Users/meir.horwitz/Documents/Projects/Shoso/Shoso/public/js/ai-editor/core/app.js`

This snippet attaches the event listener to the Preview button, imports the component dynamically, and initializes it.

```javascript
document.getElementById('btn-preview').addEventListener('click', () => {
    // Open preview mode with page flipping and 3D view
    // PDF is generated only when clicking "Generate PDF" button in preview
    console.log("[App] Opening Album Preview...");

    const hasTemplateConfig = this.templateSidebar && this.templateSidebar.manager && this.templateSidebar.manager.config;
    const templateConfig = hasTemplateConfig ? this.templateSidebar.manager.config : null;

    // Import and open the album preview
    import('../ui-components/album-preview.js').then(({ albumPreview }) => {
        albumPreview.open(
            store.state.pages,
            store.state.cover,
            store.state.assets,
            templateConfig
        );
    }).catch(err => {
        console.error('[App] Failed to load album preview:', err);
        alert('Failed to open preview. Please try again.');
    });
});
```

---

## 3. 3D Styles (CSS)
**File:** `/Users/meir.horwitz/Documents/Projects/Shoso/Shoso/public/css/book-3d-enhanced.css`

These styles define the 3D transforms, shadows, and textures for the book model.

```css
/* =========================================
   2. THE ENHANCED 3D CSS
   (Strictly matched to user request)
   ========================================= */

.book3d-cover-root {
  position: relative;
  transform-style: preserve-3d;
  perspective: 2500px;
  margin: auto;
  cursor: grab;
}

.book3d-cover-root:active {
  cursor: grabbing;
}

.book3d-cover-stage {
  width: 100%;
  height: 100%;
  position: absolute;
  transform-style: preserve-3d;
  transition: transform 0.1s linear;
}

/* Faces */
.book3d-cover-face,
.book3d-cover-spine,
.book3d-cover-foreedge,
.book3d-cover-bottom,
.book3d-cover-back {
  position: absolute;
  backface-visibility: hidden;
  box-sizing: border-box;
}

/* FRONT */
.book3d-cover-face {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  z-index: 2;
  transform: translateZ(calc(var(--book-thickness) / 2));
  background: white;
  border-radius: 2px 4px 4px 2px;
  box-shadow: inset 4px 0 10px rgba(0, 0, 0, 0.1), 0 10px 30px rgba(0, 0, 0, 0.3);
  overflow: hidden;
}

/* Gloss Sheen */
.book3d-cover-face::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.2) 0%, transparent 50%, rgba(0, 0, 0, 0.1) 100%);
  pointer-events: none;
  z-index: 10;
}

/* SPINE */
.book3d-cover-spine {
  width: var(--book-thickness);
  height: 100%;
  top: 0;
  left: 0;
  transform: rotateY(-90deg) translateZ(calc(var(--book-thickness) / 2));
  background: linear-gradient(90deg,
      rgba(255, 255, 255, 0.2) 0%, rgba(255, 255, 255, 0) 20%, rgba(0, 0, 0, 0.1) 50%, rgba(255, 255, 255, 0) 80%, rgba(255, 255, 255, 0.2) 100%), var(--cover-color);
  box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* FORE-EDGE (Pages Right) */
.book3d-cover-foreedge {
  width: calc(var(--book-thickness) - 4px);
  height: calc(100% - 6px);
  top: 3px;
  right: 0;
  transform: rotateY(90deg) translateZ(calc(var(--book-thickness) / 2));
  background: #fdfbf7;
  background-image: repeating-linear-gradient(to right, #fdfbf7 0px, #fdfbf7 2px, #e2e8f0 3px);
  box-shadow: inset 2px 0 5px rgba(0, 0, 0, 0.05);
}

/* BOTTOM EDGE (Pages Bottom) */
.book3d-cover-bottom {
  width: calc(100% - 6px);
  height: calc(var(--book-thickness) - 4px);
  bottom: 3px;
  left: 3px;
  transform: rotateX(-90deg) translateZ(calc(var(--book-thickness) / 2));
  background: #fdfbf7;
  background-image: repeating-linear-gradient(to bottom, #fdfbf7 0px, #fdfbf7 2px, #e2e8f0 3px);
}

/* BACK */
.book3d-cover-back {
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  transform: rotateY(180deg) translateZ(calc(var(--book-thickness) / 2));
  background: var(--cover-color);
  border-radius: 4px 2px 2px 4px;
  box-shadow: inset -4px 0 10px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}
```

---

## 4. Main Component Logic
**File:** `/Users/meir.horwitz/Documents/Projects/Shoso/Shoso/public/js/ai-editor/ui-components/album-preview.js`

This component handles the modal creation, view switching (Flipbook vs 3D), and 3D rendering interactions.

### Key Methods:
- `open()`: Initializes the preview.
- `render3DBook()`: Builds the 3D DOM structure.
- `update3DPageFlips()`: Handles page turning logic in 3D.
- `initBookInteraction()`: Handles drag-to-rotate events.
- `injectStyles()`: Injects component-specific CSS (modal layout).

```javascript
/* ==========================================================================
   ALBUM PREVIEW COMPONENT
   ========================================================================== */

/**
 * Album Preview Component
 * Provides a full-screen preview with:
 * - 3D book visualization
 * - Page flipping navigation
 * - PDF generation button
 */

import { store } from '../core/state.js';
import { pdfExport } from '../engines/pdf-export.js';
import { pdfCanvasExport } from '../engines/pdf-canvas-export.js';
import { RenderEngine } from '../engines/render-engine.js';
import { PhotographyPortfolioRenderer } from '../templates/photography-portfolio-renderer.js';
import { RomanticJourneyRenderer } from '../templates/romantic-journey-renderer.js';
import { TravelJourneyRenderer } from '../templates/travel-journey-renderer.js';
import { FamilyRootsRenderer } from '../templates/family-roots-renderer.js';
import { BarMitzvahRenderer } from '../templates/bar-mitzvah-renderer.js';
import { UnifiedCoverRenderer } from '../engines/unified-cover-renderer.js';
import { WeddingPrestigeRenderer } from '../templates/wedding-prestige-renderer.js';

export class AlbumPreview {
    constructor() {
        this.currentPageIndex = 0;
        this.pages = [];
        this.cover = null;
        this.assets = null;
        this.templateConfig = null;
        this.isOpen = false;
        this.renderedPages = []; 
        this.fallbackRenderer = new RenderEngine(null); 
    }

    /* ... [Methods omitted for brevity, see original file] ... */
    
    /**
     * Renders the high-fidelity 3D book box (Strict Match to Instruction).
     */
    render3DBook() {
        const container = document.getElementById('book-3d');
        if (!container) return;
        container.innerHTML = '';

        // --- CONFIG ---
        const config = {
            width: 300,
            height: 400,
            thickness: 40,
            color: this.cover?.color || '#2c3e50',
            textColor: this.cover?.textColor || '#e2e8f0',
            title: this.cover?.title || 'My Photo Book'
        };

        const root = document.createElement('div');
        root.className = 'book3d-cover-root';
        root.style.width = `${config.width}px`;
        root.style.height = `${config.height}px`;
        root.style.setProperty('--book-thickness', `${config.thickness}px`);
        root.style.setProperty('--cover-color', config.color);
        root.style.setProperty('--text-color', config.textColor);

        const stage = document.createElement('div');
        stage.className = 'book3d-cover-stage';
        stage.style.transform = 'rotateX(10deg) rotateY(-25deg)';

        // IMPORTANT: Append to DOM early so renderers can measure dimensions
        root.appendChild(stage);
        container.appendChild(root);

        // --- PREPARE COVER CONTENT (Split Strategy) ---
        // Render the full cover off-screen using the Unified Engine
        const fullCoverWrapper = UnifiedCoverRenderer.render({
            cover: this.cover,
            assets: this.assets,
            templateConfig: this.templateConfig,
            container: null,
            interactive: false
        });

        // Extract Parts
        const frontContent = fullCoverWrapper.querySelector('.front-cover');
        const backContent = fullCoverWrapper.querySelector('.back-cover');
        const spineContent = fullCoverWrapper.querySelector('.spine');

        // Styles Cleanup for 3D Context
        if (frontContent) {
            frontContent.style.boxShadow = 'none';
            frontContent.style.borderRadius = '0';
            frontContent.style.width = '100%';
            frontContent.style.height = '100%';
        }
        if (backContent) {
            backContent.style.boxShadow = 'none';
            backContent.style.borderRadius = '0';
            backContent.style.width = '100%';
            backContent.style.height = '100%';
        }

        // --- CREATE FACES ---

        // 1. SPINE
        const spine = document.createElement('div');
        spine.className = 'book3d-cover-spine';
        
        // Try to get text from spineContent or fallback
        const spineTextContent = spineContent ? spineContent.textContent : config.title;
        const spineText = document.createElement('div');
        spineText.textContent = spineTextContent;
        spineText.style.cssText = `
            position: absolute; top: 50%; left: 50%;
            transform: translate(-50%, -50%) rotate(-90deg);
            color: ${config.textColor}; font-size: 14px; white-space: nowrap;
            font-weight: bold; letter-spacing: 1px;
            pointer-events: none;
        `;
        spine.appendChild(spineText);
        stage.appendChild(spine);

        // 2. FRONT COVER (Interactive)
        const front = document.createElement('div');
        front.className = 'book3d-cover-face';

        // Front Outer Face (The actual cover image)
        const frontWrapper = document.createElement('div');
        frontWrapper.className = 'face-outer';
        frontWrapper.style.cssText = 'width: 100%; height: 100%; position: absolute; backface-visibility: hidden; background: var(--cover-color);';
        if (frontContent) frontWrapper.appendChild(frontContent);

        // Front Inner Face (Inside of cover - Visible when flipped open)
        const frontInner = document.createElement('div');
        frontInner.className = 'face-inner';
        frontInner.style.cssText = `
            width: 100%; height: 100%; position: absolute; 
            transform: rotateY(180deg); 
            backface-visibility: hidden; 
            background: #fdfbf7; /* Paper color */
            display: flex; align-items: center; justify-content: center;
        `;
        // Optional: Add a subtle paper texture or logo to inside cover
        frontInner.innerHTML = '<div style="opacity:0.6; font-style:italic; color:#aaa;">Shoso Album</div>';

        front.appendChild(frontWrapper);
        front.appendChild(frontInner);

        // Interaction
        front.style.cursor = 'pointer';
        front.onclick = (e) => {
            e.stopPropagation();
            this.nextPage(); // Clicking cover opens book (Go to Page 1)
        };
        stage.appendChild(front);

        // 3. BACK COVER (Exterior)
        const back = document.createElement('div');
        back.className = 'book3d-cover-back';
        const backWrapper = document.createElement('div');
        backWrapper.style.cssText = 'width: 100%; height: 100%; position: relative; overflow: hidden;';
        if (backContent) backWrapper.appendChild(backContent);
        back.appendChild(backWrapper);
        stage.appendChild(back);

        // 4. Edges
        const foreEdge = document.createElement('div');
        foreEdge.className = 'book3d-cover-foreedge';
        stage.appendChild(foreEdge);

        const bottomEdge = document.createElement('div');
        bottomEdge.className = 'book3d-cover-bottom';
        stage.appendChild(bottomEdge);

        // --- INSIDE BACK COVER (The "Floor" when pages are flipped) ---
        const insideBack = document.createElement('div');
        insideBack.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%; /* Matches cover size roughly */
            transform: translateZ(calc(var(--book-thickness) / -2)); /* Sit at bottom */
            background: #fdfbf7;
            z-index: 0;
            box-shadow: inset 0 0 20px rgba(0,0,0,0.1);
        `;
        stage.appendChild(insideBack);


        // --- PAGES (Interior for Flipping) ---
        const pagesContainer = document.createElement('div');
        pagesContainer.className = 'book3d-pages-container';
        pagesContainer.style.cssText = `
            position: absolute;
            top: 0; left: 0;
            width: 100%; height: 100%;
            transform-style: preserve-3d;
            z-index: 1; /* Inside */
        `;
        stage.appendChild(pagesContainer);

        if (this.contentPages && this.contentPages.length > 0) {
            const sheetCount = Math.ceil(this.contentPages.length / 2);
            // Start stacking from strictly just below the cover surface.
            // Cover surface is at +thickness/2.
            // We start 1px recessed to prevent z-fighting but touching.
            const halfThick = config.thickness / 2;

            for (let i = 0; i < sheetCount; i++) {
                // ... (Create Sheet) ...
                const sheet = document.createElement('div');
                sheet.className = 'book3d-page-sheet';

                const zPos = halfThick - 1 - (i * 0.5); // Stack downwards

                sheet.style.cssText = `
                    position: absolute;
                    top: 2%; height: 96%;
                    left: 2%; width: 96%;
                    transform-origin: left center;
                    transform-style: preserve-3d;
                    transition: transform 0.6s cubic-bezier(0.4, 0, 0.2, 1);
                    transform: translateZ(${zPos}px) rotateY(0deg); 
                 `;

                // Meta
                sheet.dataset.sheetIndex = i;
                sheet.dataset.frontPageIndex = i * 2;
                sheet.dataset.backPageIndex = (i * 2) + 1;

                // Front Page Face
                const frontPageIdx = i * 2;
                const pageFront = document.createElement('div');
                pageFront.className = 'book3d-page-face front';
                pageFront.style.cssText = `
                    position: absolute; width:100%; height:100%; 
                    backface-visibility: hidden; 
                    background: white; 
                    overflow: hidden;
                    box-shadow: inset 2px 0 5px rgba(0,0,0,0.05);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                 `;
                pageFront.onclick = (e) => { e.stopPropagation(); this.nextPage(); };

                // Render Actual Content using Layout Engine
                this.renderPageToContainer(this.contentPages[frontPageIdx], pageFront);

                // Disable interactions on 3D pages
                const renderedFront = pageFront.firstElementChild;
                if (renderedFront) {
                    renderedFront.style.pointerEvents = 'none';
                }

                sheet.appendChild(pageFront);

                // Back Page Face
                const backPageIdx = (i * 2) + 1;
                const pageBack = document.createElement('div');
                pageBack.className = 'book3d-page-face back';
                pageBack.style.cssText = `
                    position: absolute; width:100%; height:100%; 
                    backface-visibility: hidden; 
                    background: white; 
                    transform: rotateY(180deg); 
                    overflow: hidden;
                    box-shadow: inset -2px 0 5px rgba(0,0,0,0.05);
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer;
                 `;
                pageBack.onclick = (e) => { e.stopPropagation(); this.prevPage(); };

                if (backPageIdx < this.contentPages.length) {
                    this.renderPageToContainer(this.contentPages[backPageIdx], pageBack);

                    const renderedBack = pageBack.firstElementChild;
                    if (renderedBack) renderedBack.style.pointerEvents = 'none';
                } else {
                    // Blank page for odd count
                    pageBack.innerHTML = `<div style="width:100%;height:100%;background:#fdfbf7;"></div>`;
                }

                sheet.appendChild(pageBack);
                pagesContainer.appendChild(sheet);
            }
        }

        // Interaction
        this.initBookInteraction(root, stage);

        // Sync State
        if (this.update3DPageFlips) {
            this.update3DPageFlips(this.currentPageIndex);
        }
    }
}
```
