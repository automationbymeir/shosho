// Firebase Configuration & Auth Service
// Retrieved from: https://shoso-photobook.web.app/__/firebase/init.js

const firebaseConfig = {
    apiKey: "AIzaSyCnrmoGSaebSk03F6dzAUOj5-3okolxwb0",
    authDomain: "shoso-photobook.firebaseapp.com",
    projectId: "shoso-photobook",
    storageBucket: "shoso-photobook.firebasestorage.app",
    messagingSenderId: "982613325804",
    appId: "1:982613325804:web:d778a62a1fc8107045f2c9",
    measurementId: "G-6B8BJBPY2V"
};

// Initialize Firebase if not already initialized
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("Firebase Initialized in AI Editor");
}

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

export const authService = {
    // Sign in with Google
    async signInWithGoogle() {
        const provider = new firebase.auth.GoogleAuthProvider();
        try {
            const result = await auth.signInWithPopup(provider);
            return result.user;
        } catch (error) {
            console.error("Login Failed:", error);
            throw error;
        }
    },

    // Sign Out
    async signOut() {
        try {
            await auth.signOut();
        } catch (error) {
            console.error("Logout Failed:", error);
        }
    },

    // Monitor Auth State
    onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(callback);
    },

    // Get Current User
    getCurrentUser() {
        return auth.currentUser;
    },

    // Get DB Instance
    getDB() {
        return db;
    },

    // Get Storage Instance
    getStorage() {
        return storage;
    }
};
