const {google} = require("googleapis");
const admin = require("firebase-admin");

// OAuth2 Configuration
// These should be set in Firebase Functions config or environment variables
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const REDIRECT_URI = process.env.OAUTH_REDIRECT_URI || "https://shoso-photobook.web.app/oauth/callback";

const SCOPES = [
  "https://www.googleapis.com/auth/photospicker.mediaitems.readonly",
  "https://www.googleapis.com/auth/presentations",
  "https://www.googleapis.com/auth/drive",
];

/**
 * Get OAuth2 client for a user
 * @param {string} userId - Firebase user ID
 * @return {Promise<OAuth2Client>} Configured OAuth2 client
 */
async function getOAuth2Client(userId) {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars");
    return null;
  }
  const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
  );

  if (userId) {
    // Try to load existing tokens from Firestore
    const db = admin.firestore();
    const tokenDoc = await db.collection("oauth_tokens").doc(userId).get();

    if (tokenDoc.exists) {
      const tokens = tokenDoc.data();
      oauth2Client.setCredentials(tokens);

      // Check if token needs refresh
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        try {
          const {credentials} = await oauth2Client.refreshAccessToken();
          await db.collection("oauth_tokens").doc(userId).set(credentials, {merge: true});
          oauth2Client.setCredentials(credentials);
        } catch (error) {
          console.error("Error refreshing token:", error);
          // Token refresh failed, user needs to re-authorize
          return null;
        }
      }
    } else {
      return null; // No tokens stored
    }
  }

  return oauth2Client;
}

/**
 * Generate authorization URL
 * @param {string} userId - Firebase user ID
 * @return {Promise<Object>} Authorization URL and state
 */
async function getAuthorizationUrl(userId) {
  const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI,
  );

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: SCOPES,
    prompt: "consent",
    state: userId, // Pass user ID in state for callback
  });

  return {
    authUrl,
    status: "AUTH_REQUIRED",
  };
}

/**
 * Handle OAuth callback
 * @param {Object} query - Query parameters from callback
 * @return {Promise<Object>} Result of callback handling
 */
async function handleCallback(query) {
  const {code, state} = query;

  if (!code) {
    return {
      success: false,
      message: "No authorization code received",
    };
  }

  const userId = state; // User ID passed in state

  if (!userId) {
    return {
      success: false,
      message: "No user ID in state",
    };
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
        CLIENT_ID,
        CLIENT_SECRET,
        REDIRECT_URI,
    );

    const {tokens} = await oauth2Client.getToken(code);

    // Store tokens in Firestore
    const db = admin.firestore();
    await db.collection("oauth_tokens").doc(userId).set(tokens);

    return {
      success: true,
      message: "Authorization successful! You can close this window.",
    };
  } catch (error) {
    console.error("Error handling OAuth callback:", error);
    return {
      success: false,
      message: `Error: ${error.message}`,
    };
  }
}

/**
 * Check if user has valid OAuth tokens
 * @param {string} userId - Firebase user ID
 * @return {Promise<boolean>} True if user has valid tokens
 */
async function hasValidTokens(userId) {
  const oauth2Client = await getOAuth2Client(userId);
  return oauth2Client !== null;
}

module.exports = {
  getOAuth2Client,
  getAuthorizationUrl,
  handleCallback,
  hasValidTokens,
};
