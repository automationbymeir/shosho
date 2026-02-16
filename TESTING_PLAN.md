# Shoso AI Editor Testing Plan

## Objective
Verify and fix resolution issues and "preview pdf" issues in the Shoso AI Editor.
Ensure all flows (Edit -> Preview -> Export) function correctly with high-quality assets.

## Scope
- **App URL**: `http://localhost:8000/ai-editor.html`
- **Key Features**: Photo Adding (Google/Local), Template Selection, Page Navigation, Editing (Move/Resize), Preview Mode, PDF Export.

## Test Cases

### 1. Initialization & Assets
- [ ] Load the editor.
- [ ] Verify Sidebar tabs (Photos, Templates, Designs, etc.) are active.
- [ ] **Action**: Click "Add Photos" -> "Computer" (simulated upload) or check if Google Photos flow initiates.
- [ ] **Resolution Check**: Inspect the `<img>` tags of loaded photos in the sidebar and on canvas. Are they fuzzy?
    - *Expected*: Thumbnails in sidebar, High-res (or decent preview) on canvas.

### 2. Template Selection
- [ ] Navigate to "Templates" tab.
- [ ] Select a template (e.g., "Romantic Journey").
- [ ] Verify template is applied to pages.
- [ ] Check if "Photos" fly into slots (Magic Create logic).

### 3. Editor Flows
- [ ] **Page Navigation**: Click Next/Prev page.
- [ ] **Drag & Drop**: Drag a photo from sidebar to a slot. Verify it snaps.
- [ ] **Text Editing**: Click text, verify Properties panel updates.
- [ ] **Decorations**: Verify decorations render.

### 4. Preview Mode (Crucial)
- [ ] **Action**: Click "Preview" button (Top Toolbar).
- [ ] **Verification**:
    - App should switch to a "Read Only" or "Book View" mode.
    - Check for **Resolution**: Do images look sharp?
    - Check for **Rendering**: Are frames/decorations visible?
    - Check for **Errors**: Look at console logs.
- [ ] **Action**: Click "Edit" to return.

### 5. PDF Export / "Preview PDF"
- [ ] **Action**: Trigger PDF Export.
    - *Note*: Identify the trigger in `app.js`. Is it "Review & Order" or a debug button?
- [ ] **Verification**:
    - Watch for "Generating PDF" logs/loader.
    - Verify PDF is downloaded (or blob created).
    - **Content Check**: Open generated PDF (if possible to verify size/content via logs).
    - **Resolution Check**: Ensure images in PDF are using the High-Res path (check console logs for `[PDF] High Res Proxy SUCCESS` or text about `w2048`).

## Fix Strategy
1.  **Resolution**: ensuring `google-photos-service.js` correctly appends `=w2048-h2048` and `pdf-export.js` uses it.
2.  **Preview Mode**: Fix `render-engine.js` if it's failing to render in preview mode.
3.  **PDF**: Fix `pdf-export.js` if it's generating empty/low-res pages.

