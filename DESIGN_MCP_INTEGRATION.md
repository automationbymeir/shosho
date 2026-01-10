# Design MCP Integration Guide

This guide shows how to use design-focused MCP servers to enhance your Photo Book Creator app with advanced design features.

## 🎨 Available Design MCP Servers

### 1. **Coolors MCP** ✅ Configured
- **Purpose**: Advanced color operations and palette generation
- **Features**:
  - Material Design 3 color support
  - CSS theme matching
  - Image color extraction (extract colors from photos!)
  - Accessibility compliance checking
  - HCT color space for perceptually accurate operations
  - Generate harmonious color palettes

### 2. **Brave Search MCP** ✅ Configured
- **Purpose**: Find design inspiration
- **Features**:
  - Search for color palettes
  - Find font recommendations
  - Discover layout ideas
  - Research design trends

## 🚀 Design Features You Can Add

### 1. **Auto-Generate Color Palettes from Photos**

Extract colors from user's photos to create matching themes:

```javascript
// Example: Extract colors from a photo
async function extractColorsFromPhoto(photoUrl) {
  // Use Coolors MCP to extract dominant colors
  // Returns: { primary, secondary, accent, background }
}
```

**Integration Point**: When a user selects photos, automatically suggest color palettes.

### 2. **Smart Theme Generation**

Generate custom themes based on photo content:

```javascript
// Example: Generate theme from photo colors
async function generateThemeFromPhoto(photo) {
  // 1. Extract colors using Coolors MCP
  // 2. Generate complementary colors
  // 3. Check accessibility
  // 4. Return complete theme object
}
```

### 3. **Accessibility-Compliant Color Suggestions**

Ensure text is readable on backgrounds:

```javascript
// Example: Check if text color is readable
async function checkColorAccessibility(textColor, backgroundColor) {
  // Use Coolors MCP to check WCAG compliance
  // Returns: { passed, contrastRatio, suggestions }
}
```

### 4. **Design Inspiration Search**

Find design ideas based on user's theme:

```javascript
// Example: Search for design inspiration
async function searchDesignInspiration(themeName) {
  // Use Brave Search MCP
  // Search: "photo book design [themeName] color palette"
  // Returns: Articles, images, color schemes
}
```

## 💡 Implementation Examples

### Example 1: Auto-Theme from Photo

**Ask the AI:**
```
"Use Coolors MCP to extract colors from this photo URL and generate a Material Design 3 theme"
```

**Code Integration:**
```javascript
// In app.js, add to photo selection handler
async function onPhotoSelected(photo) {
  // Extract colors from photo
  const colors = await extractColorsFromPhoto(photo.baseUrl);
  
  // Generate theme
  const theme = {
    primary: colors.primary,
    secondary: colors.secondary,
    background: colors.background,
    text: colors.text
  };
  
  // Apply theme to current book
  applyTheme(theme);
}
```

### Example 2: Color Palette Generator

**Ask the AI:**
```
"Use Coolors MCP to generate a harmonious color palette for a botanical photo book theme"
```

**Code Integration:**
```javascript
// Add to themes tab
async function generateCustomPalette(baseColor) {
  // Use Coolors MCP to generate palette
  // Options: monochrome, analogic, complement, triad, quad
  const palette = await generateColorPalette(baseColor, 'analogic');
  
  // Create new theme
  const newTheme = {
    name: 'Custom Generated',
    colors: palette
  };
  
  // Add to themes list
  addTheme(newTheme);
}
```

### Example 3: Design Inspiration Search

**Ask the AI:**
```
"Use Brave Search to find photo book design inspiration for a modern minimalist theme"
```

**Code Integration:**
```javascript
// Add inspiration button to themes tab
async function searchDesignInspiration(themeName) {
  const results = await searchWeb(
    `photo book design ${themeName} color palette layout ideas`
  );
  
  // Display results in a modal
  showInspirationModal(results);
}
```

### Example 4: Accessibility Checker

**Ask the AI:**
```
"Use Coolors MCP to check if white text on #1a1a2e background meets WCAG AA standards"
```

**Code Integration:**
```javascript
// Add to cover editor
async function checkCoverAccessibility() {
  const textColor = state.cover.titleColor;
  const bgColor = state.cover.backgroundColor;
  
  const result = await checkColorContrast(textColor, bgColor);
  
  if (!result.passed) {
    // Suggest better colors
    showAccessibilityWarning(result.suggestions);
  }
}
```

## 🎯 Specific Use Cases for Your App

### 1. **Smart Theme Suggestions**

When user selects photos, automatically suggest themes:

```javascript
// In app.js, after photos are selected
async function suggestThemesFromPhotos() {
  // Extract dominant colors from selected photos
  const photoColors = await extractColorsFromPhotos(state.selectedPhotos);
  
  // Generate 3 theme suggestions
  const suggestions = await generateThemeSuggestions(photoColors);
  
  // Show in UI
  displayThemeSuggestions(suggestions);
}
```

### Example AI Command:
```
"Use Coolors MCP to extract colors from the user's selected photos and suggest 3 matching themes"
```

### 2. **Dynamic Color Palette for Each Page**

Generate color palettes that match each page's photos:

```javascript
// When arranging photos on a page
async function generatePageColors(pagePhotos) {
  // Extract colors from photos on this page
  const colors = await extractColorsFromPhotos(pagePhotos);
  
  // Generate background color suggestion
  const bgColor = await generateComplementaryColor(colors.dominant);
  
  // Update page background
  updatePageBackground(state.currentPageIndex, bgColor);
}
```

### Example AI Command:
```
"Use Coolors MCP to generate a complementary background color for a page with these photo colors"
```

### 3. **Accessibility Warnings**

Check all text/background combinations:

```javascript
// Before generating book
async function validateAccessibility() {
  const issues = [];
  
  // Check cover
  const coverCheck = await checkColorContrast(
    state.cover.titleColor,
    state.cover.backgroundColor
  );
  if (!coverCheck.passed) issues.push('Cover text may not be readable');
  
  // Check all pages
  for (const page of state.pages) {
    if (page.caption) {
      const pageCheck = await checkColorContrast(
        page.captionColor || '#000',
        page.backgroundColor || '#fff'
      );
      if (!pageCheck.passed) {
        issues.push(`Page ${page.index + 1} caption may not be readable`);
      }
    }
  }
  
  if (issues.length > 0) {
    showAccessibilityWarnings(issues);
  }
}
```

### Example AI Command:
```
"Use Coolors MCP to check all text/background color combinations in the book for WCAG AA compliance"
```

### 4. **Design Trend Research**

Find current design trends:

```javascript
// In themes tab
async function loadDesignTrends() {
  const trends = await searchWeb(
    'photo book design trends 2024 color palettes'
  );
  
  // Parse and display trends
  displayDesignTrends(trends);
}
```

### Example AI Command:
```
"Use Brave Search to find current photo book design trends and color palette recommendations"
```

## 🔧 Integration Points in Your Code

### 1. **Photo Selection** (`app.js` ~line 200-300)
```javascript
// After photos are selected
async function onPhotosSelected(photos) {
  // Extract colors and suggest themes
  const colorPalette = await extractColorsFromPhotos(photos);
  suggestThemes(colorPalette);
}
```

### 2. **Theme Tab** (`index.html` line 78-94)
```javascript
// Add "Generate from Photos" button
async function generateThemeFromPhotos() {
  const palette = await extractColorsFromPhotos(state.selectedPhotos);
  const theme = await generateTheme(palette);
  applyTheme(theme);
}
```

### 3. **Cover Editor** (`app.js` ~line 186-238)
```javascript
// Add accessibility check
async function updateCoverPreview() {
  // ... existing code ...
  
  // Check accessibility
  const accessible = await checkColorAccessibility(
    state.cover.titleColor,
    state.cover.backgroundColor
  );
  
  if (!accessible) {
    showAccessibilityWarning();
  }
}
```

### 4. **Page Editor** (`app.js` ~line 240-307)
```javascript
// Auto-suggest background colors
async function updatePageBackground() {
  const page = state.pages[state.currentPageIndex];
  if (page.photos && page.photos.length > 0) {
    const suggestedColor = await suggestBackgroundColor(page.photos);
    // Show suggestion to user
  }
}
```

## 📋 Quick Reference Commands

### Color Operations
```
"Use Coolors MCP to extract dominant colors from [photo URL]"
"Use Coolors MCP to generate a complementary color palette for #2C5F2D"
"Use Coolors MCP to check if #ffffff on #1a1a2e meets WCAG AA standards"
"Use Coolors MCP to convert #FF3366 to Material Design 3 color"
```

### Design Inspiration
```
"Use Brave Search to find photo book design inspiration for botanical themes"
"Use Brave Search to find color palette ideas for modern photo books"
"Use Brave Search to research typography trends for photo books"
```

## 🎨 Example: Complete Theme Generation Flow

Here's how you could implement a complete auto-theme feature:

```javascript
// Complete example: Auto-generate theme from photos
async function autoGenerateTheme() {
  showProgress('Analyzing photos and generating theme...');
  
  try {
    // 1. Extract colors from all selected photos
    const photoColors = await extractColorsFromPhotos(state.selectedPhotos);
    
    // 2. Generate harmonious palette
    const palette = await generateColorPalette(
      photoColors.dominant,
      'analogic' // or 'complement', 'triad', etc.
    );
    
    // 3. Check accessibility
    const accessiblePalette = await ensureAccessibility(palette);
    
    // 4. Create theme object
    const newTheme = {
      name: 'Auto-Generated',
      colors: {
        primary: accessiblePalette.primary,
        secondary: accessiblePalette.secondary,
        background: accessiblePalette.background,
        surface: accessiblePalette.surface,
        text: accessiblePalette.text
      },
      fonts: {
        serif: "'Playfair Display', serif",
        sans: "'Montserrat', sans-serif"
      }
    };
    
    // 5. Apply theme
    applyTheme(newTheme);
    
    // 6. Show success
    showSuccess('Theme generated successfully!');
    
  } catch (error) {
    showError('Failed to generate theme: ' + error.message);
  }
}
```

## 🚀 Getting Started

1. **Coolors MCP is already configured** in `~/.cursor/mcp.json`
2. **Restart Cursor** to load the new MCP server
3. **Test it**: Ask the AI to extract colors from a photo
4. **Integrate**: Add the code examples above to your app

## 📚 Resources

- **Coolors MCP**: [Documentation](https://chat.mcp.so/server/coolors-mcp/coolors-mcp)
- **Material Design 3**: [Color System](https://m3.material.io/styles/color/the-color-system/overview)
- **WCAG Guidelines**: [Color Contrast](https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html)

---

**Ready to enhance your app with AI-powered design features!** 🎨







