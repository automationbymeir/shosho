# Puppeteer Browser Automation Test Suite

This guide explains how to use Puppeteer MCP to run automated browser tests for the Photo Book Creator app.

## 🎯 What This Tests

- ✅ Page load and initialization
- ✅ UI element visibility
- ✅ Photo selection flow
- ✅ Book generation process
- ✅ PDF export functionality
- ✅ Project save/load
- ✅ Design editor functionality
- ✅ Theme switching

## 🚀 Running Tests via MCP

### Method 1: Using Cursor AI Assistant

Simply ask the AI assistant:

```
"Use Puppeteer MCP to navigate to http://localhost:5000 and test the photo book generation flow"
```

Or more specifically:

```
"Use Puppeteer MCP to:
1. Navigate to http://localhost:5000
2. Take a screenshot of the main page
3. Click the 'Generate Book' button
4. Wait for the result modal
5. Take a screenshot of the result"
```

### Method 2: Direct Puppeteer Commands

You can ask for specific Puppeteer operations:

```
"Use Puppeteer to:
- Navigate to the app
- Fill in the book title field with 'Test Book'
- Select a page format
- Click generate button
- Capture screenshots at each step"
```

## 📋 Test Scenarios

### Scenario 1: Full Book Generation Flow

**Steps:**
1. Navigate to app URL
2. Wait for page load
3. Fill book title: "Automated Test Book"
4. Select page format: "8x8 Square"
5. Click "Generate Book" button
6. Wait for progress modal
7. Wait for completion (check for result modal)
8. Verify presentation link exists
9. Take screenshot of result modal

**MCP Command:**
```
"Use Puppeteer MCP to test the complete book generation flow on http://localhost:5000"
```

### Scenario 2: PDF Export Verification

**Steps:**
1. Ensure a book is already generated (or generate one)
2. Click "Export as PDF" button
3. Wait for PDF export to complete
4. Verify download link appears
5. Check that PDF URL is valid
6. Take screenshot of PDF result

**MCP Command:**
```
"Use Puppeteer to test PDF export functionality after generating a book"
```

### Scenario 3: UI Element Testing

**Steps:**
1. Navigate to app
2. Verify all main UI elements exist:
   - Header with title
   - Sidebar with tabs
   - Editor area
   - Settings panel
3. Take screenshot
4. Test tab switching
5. Verify each tab content loads

**MCP Command:**
```
"Use Puppeteer to verify all UI elements are visible and functional"
```

### Scenario 4: Theme Switching

**Steps:**
1. Navigate to app
2. Click "Themes" tab
3. Click each theme (Classic, Botanical, Modern)
4. Take screenshot after each theme switch
5. Verify CSS variables update

**MCP Command:**
```
"Use Puppeteer to test theme switching and capture screenshots of each theme"
```

### Scenario 5: Design Editor

**Steps:**
1. Navigate to app
2. Add a photo to a page (or use existing)
3. Click edit button on a photo
4. Verify design editor opens
5. Test brush tool
6. Apply a filter
7. Save edited photo
8. Take screenshots at each step

**MCP Command:**
```
"Use Puppeteer to test the design editor functionality"
```

## 📸 Screenshot Testing

### Taking Screenshots at Key Points

Ask the AI:

```
"Use Puppeteer to:
1. Navigate to http://localhost:5000
2. Take a screenshot named '01-initial-load.png'
3. Click the Themes tab
4. Take a screenshot named '02-themes-tab.png'
5. Click the Classic theme
6. Take a screenshot named '03-classic-theme.png'
7. Click the Botanical theme
8. Take a screenshot named '04-botanical-theme.png'
9. Click the Modern theme
10. Take a screenshot named '05-modern-theme.png'"
```

Screenshots will be saved automatically by Puppeteer MCP.

## 🔍 Verification Tests

### Check for Errors

```
"Use Puppeteer to:
1. Navigate to the app
2. Check browser console for errors
3. Check network requests for failures
4. Report any issues found"
```

### Performance Testing

```
"Use Puppeteer to:
1. Navigate to the app
2. Measure page load time
3. Measure time to generate a book
4. Report performance metrics"
```

## 🛠️ Local Development Testing

### Start the App First

```bash
# Terminal 1: Start Firebase emulators
npm run serve

# The app will be available at http://localhost:5000
```

### Then Run Tests via MCP

In Cursor, ask:

```
"Use Puppeteer MCP to test the app running on http://localhost:5000"
```

## 📊 Test Results

Test results will be displayed in the Cursor chat, including:
- ✅ Passed tests
- ❌ Failed tests
- 📸 Screenshots captured
- ⏱️ Performance metrics

## 🎨 Visual Regression Testing

### Compare Screenshots

```
"Use Puppeteer to:
1. Take a screenshot of the main page
2. Save it as 'baseline-main-page.png'
3. Make changes to the app
4. Take another screenshot
5. Compare the two screenshots"
```

## 🔄 Continuous Testing

You can set up automated testing by asking:

```
"Use Puppeteer to create a test script that:
1. Runs every time I deploy
2. Tests all major features
3. Captures screenshots
4. Reports any failures"
```

## 📝 Example Test Commands

### Quick Smoke Test
```
"Use Puppeteer to do a quick smoke test: navigate to localhost:5000, verify page loads, take screenshot"
```

### Full Feature Test
```
"Use Puppeteer to test all features: page load, UI elements, theme switching, and book generation"
```

### Error Detection
```
"Use Puppeteer to navigate to the app and check for JavaScript errors in the console"
```

## 🐛 Debugging Failed Tests

If a test fails, ask:

```
"Use Puppeteer to:
1. Navigate to the app
2. Take a screenshot
3. Check console logs
4. Check network requests
5. Report what went wrong"
```

## 📚 Additional Resources

- [Puppeteer Documentation](https://pptr.dev/)
- [MCP Puppeteer Server](https://github.com/modelcontextprotocol/servers/tree/main/src/puppeteer)
- Test file: `tests/browser-automation.js`

---

**Note**: Make sure your app is running (`npm run serve`) before running tests via Puppeteer MCP.

