# Architecture Refactoring Plan

## Objective
Reorganize the `public/js/ai-editor` directory to match the "Improved Architecture" proposal. This aims to decouple core logic, engines, services, and UI components for better maintainability and scalability.

## Target Structure
```
public/
├── ai-editor.html (Updated imports)
├── js/ai-editor/
│   ├── core/
│   │   ├── app.js              # Main controller (Moved)
│   │   ├── state.js            # State management (Moved)
│   │   ├── event-bus.js        # [NEW] Decouple components
│   │   └── error-handler.js    # [NEW] Centralized errors
│   │
│   ├── engines/
│   │   ├── render-engine.js    # (Moved)
│   │   ├── layout-engine.js    # (Moved)
│   │   ├── magic-create-v2.js  # (Moved)
│   │   ├── pdf-export.js       # (Moved)
│   │   └── ai-director.js      # (Moved)
│   │
│   ├── services/
│   │   ├── google-photos-service.js   # (Moved)
│   │   ├── firebase-auth-service.js   # (Renamed from firebase-auth.js)
│   │   ├── persistence-service.js     # (Moved)
│   │   ├── ai-service.js              # (Renamed from gemini-banana-service.js)
│   │   └── order-flow.js              # (Moved)
│   │
│   ├── ui-components/
│   │   ├── magic-launcher.js          # (Existing)
│   │   └── template-sidebar.js        # (Existing)
│   │
│   ├── templates/                     # (Existing)
│   ├── schemas/                       # (Existing)
│   │
│   └── utils/
│       ├── validators.js       # [NEW]
│       ├── image-utils.js      # [NEW]
│       └── dom-utils.js        # [NEW]
```

## Migration Steps

### 1. Preparation
- [x] Create new module directories (`core`, `engines`, `services`, `utils`).
- [ ] Create placeholder files for new modules (`event-bus.js`, etc.).

### 2. File Moves
| Source | Destination |
|--------|-------------|
| `app.js` | `core/app.js` |
| `state.js` | `core/state.js` |
| `render-engine.js` | `engines/render-engine.js` |
| `layout-engine.js` | `engines/layout-engine.js` |
| `magic-create-v2.js` | `engines/magic-create-v2.js` |
| `pdf-export.js` | `engines/pdf-export.js` |
| `ai-director.js` | `engines/ai-director.js` |
| `google-photos-service.js` | `services/google-photos-service.js` |
| `firebase-auth.js` | `services/firebase-auth-service.js` |
| `persistence-service.js` | `services/persistence-service.js` |
| `gemini-banana-service.js` | `services/ai-service.js` |
| `order-flow.js` | `services/order-flow.js` |

### 3. Code Actions
- **Update Imports**: Update all `import` paths in the moved files to reflect their new relative positions.
    - *Example*: `import { store } from './state.js'` in `app.js` becomes `import { store } from './state.js'` (same dir) but in `render-engine.js` it becomes `import { store } from '../core/state.js'`.
- **Refactor `ai-editor.html`**: Update all `<script type="module" src="...">` tags to point to the new locations.

### 4. Verification
- Verify `app.js` initializes without console errors.
- Verify module loading in browser.
