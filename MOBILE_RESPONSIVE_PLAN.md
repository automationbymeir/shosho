# Mobile Omni-Channel Responsiveness Plan

## Goal
The goal is to provide a truly responsive mobile and tablet photo book editor that does not sacrifice any web app features. Previous attempts either built a simplistic stacking website block, or aggressively hid tools (`display: none`) like Undo/Redo, Remix, Magic Create, and the Timeline. The new UX ensures 100% feature parity with the desktop in a native-app-like mobile layout.

## 1. Top Toolbar (Ribbon)
- **Problem**: Desktop has many top toolbar buttons. Mobile ran out of space and hid them.
- **Solution**: The `.toolbar-top` will be heavily customized for mobile. It will become a horizontally scrollable ribbon (`overflow-x: auto; white-space: nowrap`), allowing the user to swipe left/right to access ALL tools: Undo, Redo, New Project, Remix Layout, Magic Create, Preview, and Review.

## 2. Main Workspace (Canvas)
- **Problem**: Native mobile touch events conflict with the Drag & Drop HTML5 API, rendering dragging photos to slots impossible on iOS/Android without polyfills.
- **Solution**: Re-introduce `mobile-drag-drop` polyfill in the `<head>`.
- **Solution**: Ensure the `js/ai-editor-mobile.js` pinch-to-zoom logic is robust, so users can scale the book in & out on small screens while the property panels sit atop it.

## 3. Timeline
- **Problem**: The mobile stylesheet hid the timeline (`#timeline-bar { display: none; }`) completely.
- **Solution**: The timeline will float right above the collapsed bottom panel. It will feature horizontal snapping so users can swipe between pages of their book natively, retaining complete pagination controls over the book structure.

## 4. Floating Tools (Bottom Sheet & Property Panel)
- **Problem**: The left-sidebar (assets) and right-sidebar (properties) were competing for space. 
- **Solution**:
    - The left-sidebar correctly operates as a draggable bottom-sheet for picking templates and dragging photos.
    - The right-sidebar (properties) will be a slide-over panel that is easily accessible. We will maintain the floating action button (FAB) for quick-access properties, making sure no editing logic is lost.

## Timeline of Implementation
1. Revert to original app-like foundation (Completed).
2. Patch `ai-editor-mobile.css` to enable all hidden tools and properly position the timeline.
3. Add `mobile-drag-drop` polyfill into `ai-editor.html`.
4. Build the project and test the responsive views via `npm run build`.
5. Run the browser sub-agent specifically looking verifying the presence of all UI elements (Magic Create, Remix Layout, Undo, Properties).
