// Firebase Configuration
const firebaseConfig = {
  // Replace with your Firebase project's web app config
  apiKey: "REPLACE_WITH_YOUR_FIREBASE_API_KEY",
  authDomain: "shoso-photobook.firebaseapp.com",
  projectId: "shoso-photobook",
  storageBucket: "shoso-photobook.firebasestorage.app",
  messagingSenderId: "982613325804",
  appId: "1:982613325804:web:d778a62a1fc8107045f2c9",
  measurementId: "G-6B8BJBPY2V"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize Analytics (optional)
if (typeof firebase.analytics === 'function') {
  firebase.analytics();
}

// Export for use in other modules
window.firebaseApp = firebase;
