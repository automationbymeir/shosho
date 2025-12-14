# MCP Quick Reference for Photo Book Creator

## 🚀 Quick Start

1. **MCP is already configured** at `~/.cursor/mcp.json`
2. **Restart Cursor** to load MCP servers
3. **Start using MCP** by asking the AI assistant to use MCP features

## 📦 Available MCP Servers

| Server | Status | Purpose | Setup Required |
|--------|--------|---------|----------------|
| **Filesystem** | ✅ Ready | File operations | None |
| **SQLite** | ✅ Ready | Local database | None |
| **Puppeteer** | ✅ Ready | Browser automation | None |
| **Brave Search** | ✅ Configured | Web search | API key set |
| **Coolors** | ✅ Configured | Color operations & palettes | None |
| **GitHub** | ⚠️ Needs Token | Version control | Get PAT |
| **PostgreSQL** | ⚠️ Optional | Database | Connection string |

## 💡 Quick Use Examples

### Ask the AI Assistant:

```
"Use filesystem MCP to list all JavaScript files in the project"
"Search for photo book design trends using Brave Search"
"Use Coolors MCP to extract colors from a photo and generate a palette"
"Create a SQLite table to track user analytics"
"Use Puppeteer to test the photo book generation flow"
```

## 🔧 Configuration Location

- **Main Config**: `~/.cursor/mcp.json`
- **Project Guide**: `MCP_INTEGRATION_GUIDE.md`

## 🎯 Recommended First Steps

1. ✅ **Test Filesystem MCP**: "List files in the public directory"
2. ✅ **Test SQLite MCP**: "Create a table for user preferences"
3. ⚠️ **Setup Brave Search** (optional): Get API key for design inspiration
4. ⚠️ **Setup GitHub** (optional): Get token for version control

## 📝 Common Tasks

### File Operations
- List project files
- Read/write configuration files
- Manage templates
- Export/import projects

### Database Operations
- Track user analytics
- Store preferences
- Cache photo metadata
- Log generation history

### Web Search
- Find design inspiration
- Research color palettes
- Look up font recommendations
- Find layout ideas

### Design Features (Coolors MCP) ✅ NEW
- Extract colors from photos
- Generate color palettes
- Check accessibility (WCAG)
- Material Design 3 colors
- CSS theme matching
- **See**: `DESIGN_MCP_INTEGRATION.md` for full guide

### Browser Automation ✅ Implemented
- Test book generation
- Verify PDF export
- Screenshot pages
- UI testing
- **See**: `tests/puppeteer-test-suite.md` for full guide

## 🔑 API Keys Setup

### Brave Search API Key ✅ Already Configured
- API key has been set in `~/.cursor/mcp.json`
- Ready to use for design inspiration searches

### GitHub Personal Access Token
1. GitHub → Settings → Developer settings → Tokens
2. Create token with `repo` scope
3. Add to `~/.cursor/mcp.json`:
   ```json
   "GITHUB_PERSONAL_ACCESS_TOKEN": "your-token-here"
   ```

## 🐛 Troubleshooting

**MCP not working?**
- Restart Cursor IDE
- Check JSON syntax: `python3 -m json.tool ~/.cursor/mcp.json`
- Verify paths are correct

**API errors?**
- Check API keys are valid
- Verify permissions
- Check rate limits

## 📚 Full Documentation

See `MCP_INTEGRATION_GUIDE.md` for complete integration examples and code snippets.

