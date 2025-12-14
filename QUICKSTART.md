# Quick Start Guide

Your OAuth credentials have been configured! Here's what to do next:

## ✅ Completed
- OAuth Client ID and Secret configured in `functions/src/auth.js`
- Firebase configuration set up

## 📋 Next Steps

### 1. Install Functions Dependencies

```bash
cd /Users/meir.horwitz/Documents/Shoso/functions
npm install
cd ..
```

### 2. Set Up Firestore Database

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project **shoso-photobook**
3. Click **Firestore Database** → **Create database**
4. Choose **Production mode**
5. Select your preferred location
6. Click **Enable**
7. Go to **Rules** tab and paste:

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
      allow create: if request.auth != null;
    }
  }
}
```

8. Click **Publish**

### 3. Enable Firebase Authentication

1. In Firebase Console, click **Authentication**
2. Click **Get started**
3. Enable **Anonymous** sign-in method (or your preferred method)

### 4. Verify APIs are Enabled

Go to [Google Cloud Console](https://console.cloud.google.com/) and verify these APIs are enabled:
- ✅ Google Photos Library API
- ✅ Google Slides API
- ✅ Google Drive API
- ✅ Identity Toolkit API

### 5. Test Locally

```bash
# Start Firebase emulators
npm run serve
```

Then open: http://localhost:5000

### 6. Deploy to Production

```bash
# Deploy everything
npm run deploy

# Or deploy separately:
npm run deploy:hosting   # Frontend only
npm run deploy:functions # Backend only
```

Your app will be live at: https://shoso-photobook.web.app

## 🧪 Testing the App

1. Click **"Open Google Photos Picker"**
2. You'll be redirected to Google OAuth consent screen
3. Sign in and grant permissions
4. Select photos from your Google Photos library
5. Click **"Done"** in the picker
6. Photos will load in the app
7. Click **"Auto-Arrange"** to create pages
8. Customize cover, pages, and back cover
9. Click **"Generate"** to create your photo book!

## 🐛 Troubleshooting

**"Redirect URI mismatch":**
- Make sure you added both redirect URIs in Google Cloud Console:
  - `https://shoso-photobook.web.app/oauth/callback`
  - `http://localhost:5000/oauth/callback`

**"API not enabled":**
- Go to Google Cloud Console → APIs & Services → Library
- Search for and enable the required API

**Functions not working:**
- Check logs: `npm run logs`
- Make sure you ran `cd functions && npm install`

## 📚 Documentation

- Full README: [README.md](file:///Users/meir.horwitz/Documents/Shoso/README.md)
- Implementation details: See walkthrough artifact

---

**Your OAuth Credentials:**
- Client ID: `REPLACE_WITH_YOUR_CLIENT_ID`
- Client Secret: `REPLACE_WITH_YOUR_CLIENT_SECRET`
- Redirect URI: `https://shoso-photobook.web.app/oauth/callback`

🎉 You're all set! Follow the steps above to get your photo book creator running.
