const {google} = require("googleapis");
const admin = require("firebase-admin");
const functions = require("firebase-functions");
const {FieldValue} = require("firebase-admin/firestore");

// OAuth2 Configuration
// These should be set in Firebase Functions config or environment variables
/**
 * Get OAuth configuration from environment/runtime config.
 * Prefers process.env (secrets / emulator env) and falls back to
 * firebase-functions runtime config (functions.config()).
 *
 * @return {{clientId: (string|undefined), clientSecret: (string|undefined), redirectUri: string}}
 */
function getOauthConfig() {
  // Prefer process.env (works with secrets and emulator env files)
  const envClientId = process.env.GOOGLE_CLIENT_ID;
  const envClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const envRedirectUri = process.env.OAUTH_REDIRECT_URI;

  // Cloud Functions runtime config (often injected as JSON string env var)
  // Works for both deployed Functions and the emulator when .runtimeconfig.json exists.
  const runtimeCfg = (() => {
    try {
      const raw = process.env.CLOUD_RUNTIME_CONFIG;
      if (!raw) return {};
      const parsed = JSON.parse(raw);
      return parsed || {};
    } catch (e) {
      return {};
    }
  })();

  // Fallback to Firebase runtime config (older but still common)
  const cfg = (() => {
    try {
      return functions.config?.() || {};
    } catch (e) {
      return {};
    }
  })();

  const clientId = envClientId ||
    runtimeCfg.google?.client_id ||
    runtimeCfg.google?.clientId ||
    cfg.google?.client_id ||
    cfg.google?.clientId;
  const clientSecret = envClientSecret ||
    runtimeCfg.google?.client_secret ||
    runtimeCfg.google?.clientSecret ||
    cfg.google?.client_secret ||
    cfg.google?.clientSecret;
  // Fix for local emulator testing
  // Check multiple environment variables that might indicate emulator usage
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true" ||
    process.env.FUNCTIONS_EMULATOR === true ||
    !!process.env.FIREBASE_EMULATOR_HUB;

  console.log(`[DEBUG_AUTH] isEmulator detection: ${isEmulator}. ` +
    `Env Keys: ${Object.keys(process.env).filter((k) => k.includes("EMULATOR")).join(", ")}`);

  // Use localhost:5001 to match typical browser context
  const defaultRedirect = isEmulator ?
    "http://localhost:5001/shoso-photobook/us-central1/oauthCallback" :
    "https://shoso-photobook.web.app/oauth/callback";

  if (isEmulator) {
    console.log("Running in emulator mode, using local redirect URI:", defaultRedirect);
  }

  const redirectUri = envRedirectUri ||
    runtimeCfg.google?.redirect_uri ||
    runtimeCfg.google?.redirectUri ||
    cfg.google?.redirect_uri ||
    cfg.google?.redirectUri ||
    defaultRedirect;

  return {clientId, clientSecret, redirectUri};
}

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
  const {clientId, clientSecret, redirectUri} = getOauthConfig();
  if (!clientId || !clientSecret) {
    console.error("Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET env vars");
    return null;
  }
  const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
  );

  if (userId) {
    // Try to load existing tokens from Firestore
    const db = admin.firestore();
    const tokenDoc = await db.collection("oauth_tokens").doc(userId).get();

    if (tokenDoc.exists) {
      const tokens = tokenDoc.data();
      console.log(`[DEBUG_AUTH] Token found for userId: ${userId}`);
      oauth2Client.setCredentials(tokens);

      // Check if token needs refresh
      if (tokens.expiry_date && tokens.expiry_date < Date.now()) {
        console.log(`[DEBUG_AUTH] Token for userId: ${userId} is expired, attempting refresh.`);
        try {
          const {credentials} = await oauth2Client.refreshAccessToken();
          await db.collection("oauth_tokens").doc(userId).set(credentials, {merge: true});
          oauth2Client.setCredentials(credentials);
          console.log(`[DEBUG_AUTH] Token for userId: ${userId} refreshed successfully.`);
        } catch (error) {
          console.error("Error refreshing token:", error);
          // Token refresh failed, user needs to re-authorize
          return null;
        }
      } else {
        console.log(`[DEBUG_AUTH] Token for userId: ${userId} is still valid.`);
      }
    } else {
      console.log(`[DEBUG_AUTH] No token found for userId: ${userId}`);
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
  const {clientId, clientSecret, redirectUri} = getOauthConfig();
  if (!clientId || !clientSecret) {
    return {
      status: "CONFIG_ERROR",
      error: "Missing GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET in Functions runtime",
    };
  }
  const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri,
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
  console.log("[DEBUG_AUTH] handleCallback INVOKED. Query:", JSON.stringify(query));
  const {code, state} = query;

  if (!code) {
    console.log("[DEBUG_AUTH] No authorization code received.");
    return {
      success: false,
      message: "No authorization code received",
    };
  }

  const userId = state; // User ID passed in state

  if (!userId) {
    console.log("[DEBUG_AUTH] No user ID in state.");
    return {
      success: false,
      message: "No user ID in state",
    };
  }
  console.log(`[DEBUG_AUTH] Processing callback for userId: ${userId}`);

  try {
    const {clientId, clientSecret, redirectUri} = getOauthConfig();
    if (!clientId || !clientSecret) {
      console.error("[DEBUG_AUTH] Server OAuth config missing.");
      return {
        success: false,
        message: "Server OAuth config missing (GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET).",
      };
    }
    const oauth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri,
    );

    const {tokens} = await oauth2Client.getToken(code);
    console.log(`[DEBUG_AUTH] Received tokens for userId: ${userId}`);

    // Store tokens in Firestore
    const db = admin.firestore();
    await db.collection("oauth_tokens").doc(userId).set({
      ...tokens, // Spread the tokens object
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`[DEBUG_AUTH] Tokens saved for userId: ${userId}`);

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
