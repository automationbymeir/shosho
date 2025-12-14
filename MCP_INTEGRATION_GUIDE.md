# MCP Integration Guide for Photo Book Creator

This guide explains how to integrate Model Context Protocol (MCP) servers into your Photo Book Creator application to add powerful new features.

## 📋 Table of Contents

1. [What is MCP?](#what-is-mcp)
2. [Configured MCP Servers](#configured-mcp-servers)
3. [Integration Examples](#integration-examples)
4. [Feature Enhancements](#feature-enhancements)
5. [Setup Instructions](#setup-instructions)

## What is MCP?

Model Context Protocol (MCP) is a standardized protocol that allows AI assistants to securely access external tools, data sources, and services. In your Photo Book Creator app, MCP servers can:

- Access file systems for project templates
- Query databases for analytics
- Search the web for design inspiration
- Automate browser testing
- Integrate with GitHub for version control

## Configured MCP Servers

Your MCP configuration is located at `~/.cursor/mcp.json`. The following servers are configured:

### 1. **Filesystem MCP** ✅ Ready to Use
- **Purpose**: File operations within your project directory
- **Use Cases**:
  - Save/load project templates
  - Export configurations
  - Manage local assets
  - Backup/restore projects

### 2. **Brave Search MCP** ⚠️ Requires API Key
- **Purpose**: Web search capabilities
- **Use Cases**:
  - Find design inspiration
  - Research photo book trends
  - Look up color schemes
  - Find font recommendations
- **Setup**: Get API key from [Brave Search API](https://brave.com/search/api/)

### 3. **Puppeteer MCP** ✅ Ready to Use
- **Purpose**: Browser automation and testing
- **Use Cases**:
  - Automated testing of photo book generation
  - Screenshot generation for previews
  - PDF export testing
  - UI testing

### 4. **GitHub MCP** ⚠️ Requires Token
- **Purpose**: GitHub integration
- **Use Cases**:
  - Version control for projects
  - Backup to GitHub
  - Issue tracking
  - Release management
- **Setup**: Create a GitHub Personal Access Token with appropriate permissions

### 5. **PostgreSQL MCP** ⚠️ Optional
- **Purpose**: Database operations
- **Use Cases**:
  - Analytics on user projects
  - Advanced querying
  - Reporting
- **Setup**: Only needed if you want to use PostgreSQL instead of Firestore

### 6. **SQLite MCP** ✅ Ready to Use
- **Purpose**: Local database operations
- **Use Cases**:
  - Local project cache
  - Offline project storage
  - Analytics
  - User preferences

## Integration Examples

### Example 1: Auto-Generate Captions Using AI

You can use MCP to enhance your app with AI-generated captions:

```javascript
// In your app.js, add a new function
async function generateCaptionWithMCP(photoUrl) {
  // This would use an AI MCP server to analyze the photo
  // and generate contextual captions
  // Example: "A beautiful sunset over the mountains"
}
```

**Integration Point**: Add this to your photo selection flow in `app.js` around line 200-300 where photos are selected.

### Example 2: Save Project Templates to Filesystem

Use the Filesystem MCP to save project templates:

```javascript
// Enhanced save function using MCP
async function saveProjectTemplate(projectData) {
  // Use Filesystem MCP to save templates
  // This allows users to share templates
  const templatePath = `/templates/${projectData.title}-${Date.now()}.json`;
  // MCP would handle the file write
}
```

**Integration Point**: Enhance the `saveProject()` function in `app.js` (around line 1400).

### Example 3: Search for Design Inspiration

Use Brave Search MCP to find design ideas:

```javascript
async function searchDesignInspiration(theme) {
  // Use Brave Search MCP to find design ideas
  // Example: "photo book layout ideas botanical theme"
  // Returns relevant articles, images, and resources
}
```

**Integration Point**: Add to the Themes tab in `index.html` (around line 78-94).

### Example 4: Browser Testing with Puppeteer

Automate testing of your photo book generation:

```javascript
// Use Puppeteer MCP to test book generation
async function testBookGeneration(bookData) {
  // Automatically generate a book and verify it works
  // Take screenshots of each page
  // Verify all photos loaded correctly
}
```

**Integration Point**: Create a new testing utility file or add to your deployment pipeline.

## Feature Enhancements

### 1. **Smart Photo Organization**
- **MCP Server**: AI/LLM MCP (if available)
- **Feature**: Automatically organize photos by date, location, or content
- **Implementation**: Analyze photo metadata and suggest groupings

### 2. **Auto-Caption Generation**
- **MCP Server**: AI/LLM MCP
- **Feature**: Generate contextual captions for photos
- **Implementation**: Use image analysis to create meaningful captions

### 3. **Design Template Library**
- **MCP Server**: Filesystem MCP
- **Feature**: Save and share design templates
- **Implementation**: Store templates in a templates directory, allow import/export

### 4. **Analytics Dashboard**
- **MCP Server**: SQLite MCP
- **Feature**: Track user engagement, popular layouts, theme preferences
- **Implementation**: Store analytics in local SQLite database

### 5. **Web Search Integration**
- **MCP Server**: Brave Search MCP
- **Feature**: Search for design inspiration, color palettes, fonts
- **Implementation**: Add search bar in design tab

### 6. **Automated Testing**
- **MCP Server**: Puppeteer MCP
- **Feature**: Automated end-to-end testing
- **Implementation**: Test book generation, PDF export, UI interactions

## Setup Instructions

### Step 1: Verify MCP Configuration

Your MCP configuration is already set up at `~/.cursor/mcp.json`. To verify:

```bash
cat ~/.cursor/mcp.json
```

### Step 2: Restart Cursor

After configuring MCP servers, restart Cursor IDE to load the new configuration.

### Step 3: Optional API Keys

For servers that require API keys:

#### Brave Search API Key
1. Visit [Brave Search API](https://brave.com/search/api/)
2. Sign up and get your API key
3. Update `~/.cursor/mcp.json`:
   ```json
   "brave-search": {
     "env": {
       "BRAVE_API_KEY": "your-api-key-here"
     }
   }
   ```

#### GitHub Personal Access Token
1. Go to GitHub Settings → Developer settings → Personal access tokens
2. Create a token with `repo` scope
3. Update `~/.cursor/mcp.json`:
   ```json
   "github": {
     "env": {
       "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
     }
   }
   ```

### Step 4: Test MCP Integration

In Cursor, you can now ask the AI assistant to:
- "Use the filesystem MCP to list files in the project"
- "Search for photo book design ideas using Brave Search"
- "Create a test script using Puppeteer to test the app"

### Step 5: Create SQLite Database (Optional)

If you want to use SQLite for local storage:

```bash
mkdir -p /Users/meir.horwitz/Documents/Shoso/data
# The database will be created automatically when first used
```

## Code Integration Points

Here are specific locations in your codebase where MCP features can be integrated:

### 1. Photo Selection (`public/js/app.js`)
- **Line ~200-300**: Add AI-powered photo organization
- **Line ~400-500**: Add auto-caption generation

### 2. Project Management (`public/js/app.js`)
- **Line ~1400**: Enhance `saveProject()` with template export
- **Line ~1450**: Enhance `loadProject()` with template import

### 3. Design Editor (`public/js/design-editor.js`)
- **Line ~100-200**: Add design inspiration search
- **Line ~300-400**: Add AI-powered design suggestions

### 4. Backend Functions (`functions/src/`)
- **`slides.js`**: Add analytics tracking
- **`projects.js`**: Add template management
- **`photos.js`**: Add photo analysis features

## Example: Adding Auto-Caption Feature

Here's a complete example of how to add an auto-caption feature using MCP:

```javascript
// In app.js, add this function
async function generateAutoCaption(photo) {
  try {
    // This would use an AI MCP server
    // For now, we'll use a placeholder
    const response = await fetch('/api/generate-caption', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ photoUrl: photo.baseUrl })
    });
    
    const data = await response.json();
    return data.caption || 'Beautiful moment';
  } catch (error) {
    console.error('Failed to generate caption:', error);
    return null;
  }
}

// Add button to photo selection UI
function addAutoCaptionButton(photoElement, photo) {
  const btn = document.createElement('button');
  btn.textContent = '✨ Auto-Caption';
  btn.onclick = async () => {
    const caption = await generateAutoCaption(photo);
    if (caption) {
      // Update the photo's caption
      updatePhotoCaption(photo.id, caption);
    }
  };
  photoElement.appendChild(btn);
}
```

## Troubleshooting

### MCP Servers Not Loading
- **Solution**: Restart Cursor IDE
- **Check**: Verify `~/.cursor/mcp.json` syntax is valid JSON

### API Key Errors
- **Solution**: Ensure API keys are correctly set in the `env` section
- **Check**: Verify keys are valid and have proper permissions

### Permission Errors (Filesystem)
- **Solution**: Ensure the path in filesystem MCP config is correct
- **Check**: Verify you have read/write permissions to the directory

## Next Steps

1. **Start with Filesystem MCP**: Test basic file operations
2. **Add SQLite for Analytics**: Track user behavior
3. **Integrate Brave Search**: Add design inspiration feature
4. **Set up Puppeteer**: Create automated tests
5. **Explore AI MCPs**: Add smart features like auto-captions

## Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [MCP Servers Repository](https://github.com/modelcontextprotocol/servers)
- [Cursor MCP Guide](https://docs.cursor.com/mcp)

---

**Note**: Some MCP servers require additional setup (API keys, tokens, etc.). Start with the ready-to-use servers (Filesystem, SQLite, Puppeteer) and add others as needed.

