# Editor Page Redesign - Implementation Plan

## Overview
This document outlines the complete implementation plan for modernizing the editor page while maintaining all existing functionality. The template gallery will remain unchanged.

---

## Design System Updates

### Color Palette (Editor Only)
```css
/* Add to :root or editor-specific section */
--editor-bg: #f8fafc;
--editor-surface: #ffffff;
--editor-primary: #6366f1;
--editor-primary-dark: #4f46e5;
--editor-text-main: #0f172a;
--editor-text-light: #475569;
--editor-border: #e2e8f0;
--editor-shadow-sm: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
--editor-shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
--editor-shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
--editor-radius-sm: 8px;
--editor-radius-md: 12px;
--editor-radius-lg: 16px;
```

### Typography (Editor Only)
- **UI Font**: Inter (already loaded, use for all editor UI)
- **Book Content Font**: Keep Playfair Display for book titles/content
- **Font Sizes**: 
  - Headings: 18px (header), 16px (section titles)
  - Body: 14px
  - Small: 12px, 13px

---

## Component-by-Component Implementation

### 1. Header (`.header`)

**Current Issues:**
- Vintage styling
- Inconsistent spacing

**Changes Needed:**
```css
.header {
  background: white;
  border-bottom: 1px solid var(--editor-border);
  padding: 0 32px;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: var(--editor-shadow-sm);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header h1 {
  font-size: 18px;
  font-weight: 700;
  font-family: 'Inter', sans-serif;
  color: var(--editor-text-main);
}

.btn-icon {
  background: none;
  border: none;
  color: var(--editor-text-light);
  font-size: 14px;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: var(--editor-radius-sm);
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--editor-bg);
  color: var(--editor-text-main);
}

.template-badge {
  display: inline-flex;
  align-items: center;
  padding: 4px 12px;
  background: linear-gradient(135deg, var(--editor-primary) 0%, #818cf8 100%);
  color: white;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 600;
  margin-left: 12px;
}
```

**HTML Changes:**
- No changes needed, just CSS updates

---

### 2. Sidebar (`.sidebar`)

**Current Issues:**
- Vintage background colors
- Tab styling needs modernization

**Changes Needed:**
```css
.sidebar {
  width: 320px;
  background: white;
  border-right: 1px solid var(--editor-border);
  display: flex;
  flex-direction: row;
}

.sidebar-tabs {
  width: 120px;
  padding: 16px 8px;
  border-right: 1px solid var(--editor-border);
  display: flex;
  flex-direction: column;
  gap: 4px;
  background: white;
}

.tab {
  padding: 12px 16px;
  background: transparent;
  border: none;
  border-radius: var(--editor-radius-sm);
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: var(--editor-text-light);
  text-align: left;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}

.tab:hover {
  background: var(--editor-bg);
  color: var(--editor-text-main);
}

.tab.active {
  background: var(--editor-primary);
  color: white;
}

.tab-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: white;
}
```

**HTML Changes:**
- No changes needed

---

### 3. Photos Tab (`.tab-content#picker-tab`)

**Changes Needed:**
```css
#picker-tab {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
}

#picker-tab p {
  color: var(--editor-text-light);
  font-size: 14px;
  margin-bottom: 16px;
}

#pickerBtn {
  width: 100%;
  padding: 12px 24px;
}
```

**HTML Changes:**
- No changes needed

---

### 4. Selected Tab (`.tab-content#selected-tab`)

**Changes Needed:**
```css
.selected-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.zoom-control {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: var(--editor-bg);
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  flex: 1;
  min-width: 200px;
}

.zoom-control input[type="range"] {
  flex: 1;
  height: 4px;
  background: var(--editor-border);
  border-radius: 2px;
}

.zoom-label {
  font-size: 12px;
  color: var(--editor-text-light);
  min-width: 45px;
  text-align: right;
  font-weight: 600;
}

.selected-photos-list {
  display: flex;
  gap: 8px;
  padding: 12px;
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-md);
  background: var(--editor-bg);
  min-height: 80px;
  flex-wrap: wrap;
  align-items: center;
}

.design-inspiration-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--editor-border);
}

.design-inspiration-section h3 {
  font-size: 14px;
  font-weight: 600;
  color: var(--editor-primary);
  margin-bottom: 8px;
  font-family: 'Inter', sans-serif;
}

.design-inspiration-section input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  font-size: 14px;
  margin-bottom: 8px;
}
```

**HTML Changes:**
- No changes needed

---

### 5. Design Tab (`.tab-content#design-tab`)

**Changes Needed:**
```css
.design-editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.design-toolbar h3 {
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 8px;
  font-family: 'Inter', sans-serif;
}

.design-toolbar p {
  font-size: 13px;
  color: var(--editor-text-light);
  margin-bottom: 24px;
}

.tool-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--editor-border);
}

.tool-section:last-child {
  border-bottom: none;
}

.tool-section h4 {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--editor-text-light);
  margin-bottom: 12px;
  font-family: 'Inter', sans-serif;
}

.tool-controls {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.tool-btn {
  padding: 10px;
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}

.tool-btn:hover {
  background: var(--editor-bg);
  border-color: var(--editor-primary);
}

.actions-group-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.actions-group-container .btn {
  flex: 1;
  min-width: 100px;
}

.actions-group-container .btn-primary {
  width: 100%;
  margin-top: 8px;
}
```

**HTML Changes:**
- No changes needed

---

### 6. Editor Main Area (`.editor`)

**Changes Needed:**
```css
.editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--editor-bg);
  overflow-y: auto;
}
```

**HTML Changes:**
- No changes needed

---

### 7. Settings Panel (`.settings-panel`)

**Note:** This is hidden by default (`.album-config-toolbar { display: none !important; }`)

**Changes Needed:**
```css
.settings-panel {
  background: white;
  border-bottom: 1px solid var(--editor-border);
  padding: 16px 32px;
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.setting-group {
  display: flex;
  align-items: center;
  gap: 12px;
}

.setting-group label {
  font-size: 12px;
  font-weight: 600;
  color: var(--editor-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  font-family: 'Inter', sans-serif;
}

.setting-group input,
.setting-group select {
  padding: 8px 12px;
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
}
```

**HTML Changes:**
- No changes needed

---

### 8. Editor Tabs (`.editor-tabs`)

**Changes Needed:**
```css
.editor-tabs {
  display: flex;
  justify-content: center;
  gap: 8px;
  padding: 16px;
  background: white;
  border-bottom: 1px solid var(--editor-border);
}

.editor-tab {
  padding: 10px 20px;
  border: none;
  background: transparent;
  border-radius: 9999px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 600;
  color: var(--editor-text-light);
  transition: all 0.2s;
  font-family: 'Inter', sans-serif;
}

.editor-tab:hover {
  background: var(--editor-bg);
}

.editor-tab.active {
  background: var(--editor-primary);
  color: white;
}
```

**HTML Changes:**
- No changes needed

---

### 9. Cover Editor (`.editor-content#cover-editor`)

**Changes Needed:**
```css
#cover-editor {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.cover-settings {
  display: flex;
  gap: 48px;
  max-width: 1400px;
  width: 100%;
  align-items: flex-start;
}

.cover-preview {
  width: 600px;
  height: 800px;
  background: white;
  border-radius: var(--editor-radius-lg);
  box-shadow: var(--editor-shadow-lg);
  padding: 48px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid var(--editor-border);
}

.cover-photo-placeholder {
  width: 100%;
  height: 60%;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  border-radius: var(--editor-radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--editor-text-light);
  cursor: pointer;
  border: 2px dashed var(--editor-border);
  transition: all 0.2s;
}

.cover-photo-placeholder:hover {
  border-color: var(--editor-primary);
  background: linear-gradient(135deg, #e8e8e8 0%, #d8d8d8 100%);
}

.cover-controls {
  width: 400px;
  background: white;
  border-radius: var(--editor-radius-lg);
  padding: 24px;
  box-shadow: var(--editor-shadow-md);
  border: 1px solid var(--editor-border);
}

.cover-controls h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--editor-border);
  font-family: 'Inter', sans-serif;
}
```

**HTML Changes:**
- No changes needed

---

### 10. Pages Editor (`.editor-content#pages-editor`)

**Changes Needed:**
```css
#pages-editor {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.pages-toolbar {
  background: white;
  border-radius: var(--editor-radius-md);
  padding: 16px 24px;
  box-shadow: var(--editor-shadow-sm);
  border: 1px solid var(--editor-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  max-width: 1400px;
  width: 100%;
}

.pages-toolbar-left {
  display: flex;
  gap: 8px;
}

.pages-toolbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.page-indicator {
  font-size: 14px;
  font-weight: 600;
  color: var(--editor-text-light);
  font-family: 'Inter', sans-serif;
}

.auto-arrange-cta {
  background: white;
  border-radius: var(--editor-radius-md);
  padding: 16px 24px;
  box-shadow: var(--editor-shadow-sm);
  border: 1px solid var(--editor-border);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  max-width: 1400px;
  width: 100%;
}

.auto-arrange-sub {
  font-size: 13px;
  color: var(--editor-text-light);
  font-family: 'Inter', sans-serif;
}

.page-navigator {
  background: white;
  border-radius: var(--editor-radius-md);
  padding: 12px 16px;
  box-shadow: var(--editor-shadow-sm);
  border: 1px solid var(--editor-border);
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
  max-width: 1400px;
  width: 100%;
}

.nav-btn {
  background: var(--editor-bg);
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  padding: 8px 12px;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
}

.nav-btn:hover {
  background: var(--editor-primary);
  color: white;
  border-color: var(--editor-primary);
}

.page-thumbnails {
  display: flex;
  gap: 8px;
  flex: 1;
  overflow-x: auto;
}

.page-thumbnail {
  width: 40px;
  height: 40px;
  background: var(--editor-bg);
  border: 2px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}

.page-thumbnail:hover {
  border-color: var(--editor-primary);
  transform: scale(1.1);
}

.page-thumbnail.active {
  border-color: var(--editor-primary);
  background: var(--editor-primary);
  color: white;
}

.page-editor-area {
  display: flex;
  gap: 32px;
  max-width: 1400px;
  width: 100%;
  align-items: flex-start;
}

.page-preview {
  width: 800px;
  height: 600px;
  background: white;
  border-radius: var(--editor-radius-lg);
  box-shadow: var(--editor-shadow-lg);
  border: 1px solid var(--editor-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.page-controls {
  width: 340px;
  background: white;
  border-radius: var(--editor-radius-lg);
  padding: 24px;
  box-shadow: var(--editor-shadow-md);
  border: 1px solid var(--editor-border);
  position: sticky;
  top: 24px;
}
```

**HTML Changes:**
- No changes needed

---

### 11. Back Cover Editor (`.editor-content#backcover-editor`)

**Changes Needed:**
```css
#backcover-editor {
  padding: 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.back-cover-controls {
  width: 400px;
  background: white;
  border-radius: var(--editor-radius-lg);
  padding: 24px;
  box-shadow: var(--editor-shadow-md);
  border: 1px solid var(--editor-border);
}

.back-cover-controls h3 {
  font-size: 18px;
  font-weight: 700;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--editor-border);
  font-family: 'Inter', sans-serif;
}

.alignment-controls {
  display: flex;
  gap: 8px;
}

.btn-alignment {
  flex: 1;
  padding: 12px;
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  background: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-alignment:hover {
  border-color: var(--editor-primary);
  background: var(--editor-bg);
}

.btn-alignment.active {
  background: var(--editor-primary);
  border-color: var(--editor-primary);
  color: white;
}
```

**HTML Changes:**
- No changes needed

---

### 12. Control Groups (`.control-group`)

**Changes Needed:**
```css
.control-group {
  margin-bottom: 20px;
}

.control-group label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--editor-text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 8px;
  font-family: 'Inter', sans-serif;
}

.control-group input[type="text"],
.control-group input[type="number"],
.control-group select,
.control-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  transition: all 0.2s;
}

.control-group input:focus,
.control-group select:focus,
.control-group textarea:focus {
  outline: none;
  border-color: var(--editor-primary);
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.range-control {
  display: flex;
  align-items: center;
  gap: 12px;
}

.range-control input[type="range"] {
  flex: 1;
  height: 6px;
  background: var(--editor-border);
  border-radius: 3px;
  appearance: none;
}

.range-control input[type="range"]::-webkit-slider-thumb {
  appearance: none;
  width: 18px;
  height: 18px;
  background: var(--editor-primary);
  border-radius: 50%;
  cursor: pointer;
}

.range-value {
  min-width: 50px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--editor-text-light);
}

.inline-controls {
  display: flex;
  gap: 8px;
  align-items: center;
}

.inline-controls input[type="color"] {
  width: 50px;
  height: 42px;
  border: 1px solid var(--editor-border);
  border-radius: var(--editor-radius-sm);
  cursor: pointer;
  padding: 2px;
}

.checkbox-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.checkbox-control input[type="checkbox"] {
  width: 20px;
  height: 20px;
  cursor: pointer;
  accent-color: var(--editor-primary);
}

.checkbox-control label {
  font-size: 14px;
  font-weight: 500;
  color: var(--editor-text-main);
  text-transform: none;
  letter-spacing: normal;
  cursor: pointer;
}
```

**HTML Changes:**
- No changes needed

---

### 13. Buttons (`.btn`)

**Changes Needed:**
```css
.btn {
  padding: 10px 16px;
  border-radius: var(--editor-radius-sm);
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid var(--editor-border);
  background: white;
  color: var(--editor-text-main);
  font-family: 'Inter', sans-serif;
  text-transform: none;
  letter-spacing: normal;
}

.btn:hover {
  background: var(--editor-bg);
  box-shadow: var(--editor-shadow-md);
  transform: translateY(-1px);
}

.btn-primary {
  background: var(--editor-primary);
  color: white;
  border-color: var(--editor-primary);
}

.btn-primary:hover {
  background: var(--editor-primary-dark);
  box-shadow: var(--editor-shadow-md);
}

.btn-secondary {
  background: white;
  color: var(--editor-text-main);
  border-color: var(--editor-border);
}

.btn-secondary:hover {
  background: var(--editor-bg);
}

.btn-small {
  padding: 8px 12px;
  font-size: 13px;
}
```

**HTML Changes:**
- No changes needed

---

## Implementation Steps

### Step 1: Add Editor-Specific CSS Variables
Add the editor color system to the top of `styles.css` (after existing :root variables)

### Step 2: Update Header Styles
Replace `.header` styles with modern version

### Step 3: Update Sidebar Styles
Replace `.sidebar`, `.sidebar-tabs`, `.tab` styles

### Step 4: Update Tab Content Styles
Update all `.tab-content` styles for Photos, Selected, and Design tabs

### Step 5: Update Editor Main Area
Update `.editor`, `.editor-tabs`, `.editor-tab` styles

### Step 6: Update Cover Editor
Update `.cover-settings`, `.cover-preview`, `.cover-controls` styles

### Step 7: Update Pages Editor
Update `.pages-toolbar`, `.auto-arrange-cta`, `.page-navigator`, `.page-editor-area` styles

### Step 8: Update Back Cover Editor
Update `.back-cover-controls` and alignment controls

### Step 9: Update Control Groups
Update `.control-group`, `.range-control`, `.inline-controls`, `.checkbox-control` styles

### Step 10: Update Buttons
Update `.btn` styles to modern version

### Step 11: Test All Functionality
- Test all buttons and interactions
- Test tab switching
- Test all form controls
- Test responsive behavior
- Test 3D book previews still work

---

## Important Notes

1. **Template Gallery Unchanged**: Do NOT modify any styles related to `.template-gallery-view`, `.template-card`, etc.

2. **3D Book Previews**: Ensure all 3D book preview styles (`.book3d-*`, `.is-book-spread`, `.is-cover-3d`) remain functional

3. **Existing Functionality**: All JavaScript functions and event handlers remain unchanged

4. **Responsive Design**: Maintain responsive breakpoints for mobile/tablet

5. **Accessibility**: Ensure all interactive elements remain keyboard accessible

---

## Testing Checklist

- [ ] Header displays correctly with all buttons
- [ ] Sidebar tabs switch correctly
- [ ] Photos tab loads Google Photos picker
- [ ] Selected tab shows photos and zoom control works
- [ ] Design tab shows design editor
- [ ] Cover editor preview and controls work
- [ ] Pages editor toolbar, navigator, and controls work
- [ ] Back cover editor preview and controls work
- [ ] All form inputs (text, range, color, select, checkbox) work
- [ ] All buttons trigger correct actions
- [ ] 3D book previews render correctly
- [ ] Responsive layout works on different screen sizes
- [ ] No JavaScript errors in console

---

## Files to Modify

1. `/public/css/styles.css` - Add editor-specific styles (keep template gallery styles unchanged)

---

## Estimated Time

- CSS Updates: 3-4 hours
- Testing: 1-2 hours
- **Total: 4-6 hours**


