# Test Suite for Photo Book Creator

This directory contains automated testing utilities for the Photo Book Creator app.

## 📁 Files

- `browser-automation.js` - Main test suite structure (to be run via Puppeteer MCP)
- `puppeteer-test-suite.md` - Guide for using Puppeteer MCP for testing
- `screenshots/` - Directory for test screenshots (created automatically)

## 🚀 Quick Start

### Using MCP Puppeteer

1. **Start your app:**
   ```bash
   npm run serve
   ```

2. **In Cursor, ask the AI:**
   ```
   "Use Puppeteer MCP to test the photo book app at http://localhost:5000"
   ```

3. **Or run specific tests:**
   ```
   "Use Puppeteer to navigate to localhost:5000, take a screenshot, and test the generate book button"
   ```

## 🧪 Test Coverage

- ✅ Page load and initialization
- ✅ UI element visibility
- ✅ Photo selection flow
- ✅ Book generation
- ✅ PDF export
- ✅ Project management
- ✅ Design editor
- ✅ Theme switching

## 📸 Screenshots

Screenshots are automatically captured during tests and saved to `tests/screenshots/`.

## 🔧 Configuration

Test configuration is in `browser-automation.js`:

```javascript
const TEST_CONFIG = {
  baseUrl: 'http://localhost:5000',
  timeout: 60000,
  screenshotDir: './tests/screenshots',
  headless: true
};
```

## 📚 Documentation

See `puppeteer-test-suite.md` for detailed testing scenarios and examples.

