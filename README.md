# 📖 Photo Book Creator

Create beautiful photo books from your Google Photos library using Google Slides. This Firebase-based web application allows you to select photos, arrange them in various layouts, and generate professional-looking presentations that can be exported as PDFs.

## ✨ Features

- **Google Photos Integration**: Securely browse and select photos from your Google Photos library
- **Multiple Layouts**: Choose from 8 different page layouts including single, grid, and collage styles
- **Auto-Arrange**: Automatically distribute photos across pages with smart layout selection
- **Customizable Covers**: Design custom front and back covers with photos, titles, and colors
- **Page Customization**: Adjust backgrounds, captions, and photo borders for each page
- **Export Options**: Generate Google Slides presentations and export as PDF
- **Project Management**: Save and load your photo book projects

## 🚀 Getting Started

### Prerequisites

- Node.js 18 or higher
- Firebase CLI (`npm install -g firebase-tools`)
- Google Cloud Project with Firebase enabled
- OAuth 2.0 credentials for Google Photos, Slides, and Drive APIs

### Installation

1. **Clone or navigate to the project directory**:
   ```bash
   cd /Users/meir.horwitz/Documents/Shoso
   ```

2. **Install dependencies**:
   ```bash
   npm install
   cd functions
   npm install
   cd ..
   ```

3. **Configure OAuth Credentials**:
   
   a. Go to [Google Cloud Console](https://console.cloud.google.com/)
   
   b. Select your project `shoso-photobook`
   
   c. Navigate to **APIs & Services > Credentials**
   
   d. Create OAuth 2.0 Client ID (Web application type)
   
   e. Add authorized redirect URIs:
      - `https://shoso-photobook.web.app/oauth/callback`
      - `http://localhost:5000/oauth/callback` (for local testing)
   
   f. Copy the Client ID and Client Secret
   
   g. Update `functions/src/auth.js` with your credentials or set environment variables:
      ```bash
      firebase functions:config:set google.client_id="YOUR_CLIENT_ID"
      firebase functions:config:set google.client_secret="YOUR_CLIENT_SECRET"
      ```

4. **Enable Required APIs**:
   
   In Google Cloud Console, enable these APIs:
   - Google Photos Library API
   - Google Slides API
   - Google Drive API
   - Identity Toolkit API (for Firebase Auth)

5. **Set up Firestore**:
   
   a. Go to Firebase Console > Firestore Database
   
   b. Create database in production mode
   
   c. Add security rules:
   ```javascript
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /oauth_tokens/{userId} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
       match /projects/{projectId} {
         allow read, write: if request.auth != null && 
           resource.data.userId == request.auth.uid;
       }
     }
   }
   ```

### Local Development

1. **Start Firebase Emulators**:
   ```bash
   npm run serve
   ```

2. **Access the application**:
   - Open http://localhost:5000 in your browser
   - Functions will run on http://localhost:5001

### Deployment

1. **Deploy to Firebase**:
   ```bash
   npm run deploy
   ```

2. **Or deploy individually**:
   ```bash
   npm run deploy:hosting  # Deploy frontend only
   npm run deploy:functions  # Deploy Cloud Functions only
   ```

3. **Access your live app**:
   - https://shoso-photobook.web.app

## 📖 Usage Guide

### Creating a Photo Book

1. **Select Photos**:
   - Click "Open Google Photos Picker"
   - Authorize the application (first time only)
   - Select photos from your Google Photos library
   - Click "Done" in the picker window

2. **Design Your Cover**:
   - Switch to the "Cover" tab
   - Click the placeholder to add a cover photo
   - Customize title, subtitle, colors, and fonts
   - Adjust background and border settings

3. **Arrange Pages**:
   - Click "Auto-Arrange" to automatically create pages
   - Or manually add pages and select photos for each slot
   - Choose different layouts for each page
   - Customize backgrounds, captions, and borders

4. **Customize Back Cover**:
   - Switch to "Back Cover" tab
   - Add custom text and choose background color

5. **Generate Book**:
   - Click "Generate" to create your Google Slides presentation
   - Wait for processing (may take a few minutes for large books)
   - View the presentation or export as PDF

### Saving Projects

- Click "Save" to save your current project
- Enter a project name
- Projects are stored in Firestore and linked to your account

### Loading Projects

- Click "Load" to view saved projects
- Select a project to restore all settings and photos

## 🏗️ Architecture

### Frontend (`public/`)
- **index.html**: Main application structure
- **css/styles.css**: Complete styling with responsive design
- **js/firebase-config.js**: Firebase initialization
- **js/app.js**: Application logic and UI interactions

### Backend (`functions/`)
- **index.js**: Cloud Functions entry point
- **src/auth.js**: OAuth 2.0 authentication and token management
- **src/photos.js**: Google Photos API integration
- **src/slides.js**: Google Slides API integration
- **src/projects.js**: Project save/load functionality

### Data Storage
- **Firestore Collections**:
  - `oauth_tokens`: User OAuth tokens (encrypted)
  - `projects`: Saved photo book projects

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the functions directory:

```env
GOOGLE_CLIENT_ID=REPLACE_WITH_YOUR_CLIENT_ID
GOOGLE_CLIENT_SECRET=REPLACE_WITH_YOUR_CLIENT_SECRET
OAUTH_REDIRECT_URI=https://shoso-photobook.web.app/oauth/callback
```

### Firebase Configuration

The Firebase configuration is in `public/js/firebase-config.js`:

```javascript
const firebaseConfig = {
  apiKey: "REPLACE_WITH_YOUR_FIREBASE_API_KEY",
  authDomain: "shoso-photobook.firebaseapp.com",
  projectId: "shoso-photobook",
  storageBucket: "shoso-photobook.firebasestorage.app",
  messagingSenderId: "982613325804",
  appId: "1:982613325804:web:d778a62a1fc8107045f2c9",
  measurementId: "G-6B8BJBPY2V"
};
```

## 🐛 Troubleshooting

### OAuth Issues

**Problem**: "Authorization Required" message appears
- **Solution**: Click the authorization link and grant permissions. Make sure redirect URIs are correctly configured in Google Cloud Console.

**Problem**: "Failed to create session" error
- **Solution**: Verify that Google Photos Library API is enabled in your Google Cloud project.

### Photo Loading Issues

**Problem**: Thumbnails not loading
- **Solution**: Check that OAuth tokens are valid. Try re-authorizing the application.

**Problem**: "CORS error" when fetching photos
- **Solution**: This is handled server-side. Ensure Cloud Functions are deployed and working.

### Presentation Generation Issues

**Problem**: "Timeout" error when generating book
- **Solution**: Large photo books may take time. The function timeout is set to 540 seconds (9 minutes). Consider reducing the number of photos or pages.

**Problem**: Photos not appearing in slides
- **Solution**: Ensure photos are being fetched correctly. Check Cloud Functions logs: `npm run logs`

## 📊 API Quotas

Be aware of Google API quotas:
- **Google Photos API**: 10,000 requests per day
- **Google Slides API**: 300 requests per minute
- **Google Drive API**: 1,000 requests per 100 seconds

For production use, consider requesting quota increases.

## 🔒 Security

- OAuth tokens are stored securely in Firestore with user-level access control
- All API calls are authenticated using Firebase Authentication
- Firestore security rules prevent unauthorized access to user data
- Temporary Drive files are created with public read access but are not indexed

## 📝 License

This project is for personal use. Ensure compliance with Google's Terms of Service when using their APIs.

## 🤝 Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Cloud Functions logs: `npm run logs`
3. Check Firebase Console for errors

## 🎨 Customization

### Adding New Layouts

Edit `public/js/app.js` and `functions/src/slides.js` to add new layout configurations in the `LAYOUTS` object and `getLayoutPositions` function.

### Changing Styles

Modify `public/css/styles.css` to customize colors, fonts, and UI elements.

### Extending Functionality

Add new Cloud Functions in `functions/src/` and register them in `functions/index.js`.

---

**Built with Firebase, Google Photos API, and Google Slides API**
