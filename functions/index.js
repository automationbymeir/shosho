const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Import modules
let auth; let photos; let slides; let projects; let designInspiration;
try {
  auth = require("./src/auth");
  photos = require("./src/photos");
  slides = require("./src/slides");
  projects = require("./src/projects");
  designInspiration = require("./src/design-inspiration");
} catch (e) {
  console.error("FATAL ERROR LOADING MODULES:", e);
}

// ============================================
// OAUTH & AUTHENTICATION
// ============================================

exports.getAuthUrl = onCall(async (request) => {
  return auth.getAuthorizationUrl(request.auth?.uid);
});

exports.oauthCallback = onRequest({cors: true}, async (req, res) => {
  try {
    const result = await auth.handleCallback(req.query);
    res.send(`
  < html >
  <body>
    <h2>Authorization ${result.success ? "Successful" : "Failed"}</h2>
    <p>${result.message}</p>
    <p>You can close this window now.</p>
    <script>window.close();</script>
  </body>
      </html >
  `);
  } catch (error) {
    res.status(500).send(`Error: ${error.message} `);
  }
});

// ============================================
// GOOGLE PHOTOS PICKER
// ============================================

exports.createPickerSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  return photos.createPickerSession(request.auth.uid);
});

exports.checkPickerSession = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {sessionId} = request.data;
  if (!sessionId) {
    throw new HttpsError("invalid-argument", "sessionId is required");
  }

  return photos.checkPickerSession(request.auth.uid, sessionId);
});

exports.fetchThumbnailBatch = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {baseUrls} = request.data;
  if (!baseUrls || !Array.isArray(baseUrls)) {
    throw new HttpsError("invalid-argument", "baseUrls array is required");
  }

  return photos.fetchThumbnailBatch(request.auth.uid, baseUrls);
});

// ============================================
// GOOGLE SLIDES PRESENTATION
// ============================================

exports.createPhotoBook = onRequest({
  timeoutSeconds: 540,
  memory: "1GiB",
  cors: true,
}, async (req, res) => {
  try {
    // Manual authentication check
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      res.status(401).json({error: "Unauthorized - No token provided"});
      return;
    }

    const idToken = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await admin.auth().verifyIdToken(idToken);
    } catch (error) {
      console.error("Token verification failed:", error);
      res.status(401).json({error: "Unauthorized - Invalid token"});
      return;
    }

    const {bookData} = req.body;
    if (!bookData) {
      res.status(400).json({error: "bookData is required"});
      return;
    }

    const result = await slides.createPhotoBook(decodedToken.uid, bookData);
    res.json(result);
  } catch (error) {
    console.error("createPhotoBook error:", error);
    res.status(500).json({error: error.message || "Internal server error"});
  }
});

exports.exportAsPdf = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {presentationId} = request.data;
  if (!presentationId) {
    throw new HttpsError("invalid-argument", "presentationId is required");
  }

  return slides.exportAsPdf(request.auth.uid, presentationId);
});

// ============================================
// PROJECT MANAGEMENT
// ============================================

exports.saveProject = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {projectData} = request.data;
    if (!projectData) {
      throw new HttpsError("invalid-argument", "projectData is required");
    }

    return await projects.saveProject(request.auth.uid, projectData);
  } catch (error) {
    console.error("saveProject error:", error);
    // If it's already an HttpsError, re-throw it
    if (error instanceof HttpsError) {
      throw error;
    }
    // Otherwise, wrap it in an internal error with the message
    throw new HttpsError("internal", error.message || "Failed to save project");
  }
});

exports.loadProject = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {projectId} = request.data;
    if (!projectId) {
      throw new HttpsError("invalid-argument", "projectId is required");
    }

    const result = await projects.loadProject(request.auth.uid, projectId);
    return result;
  } catch (error) {
    console.error("loadProject error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", error.message || "Failed to load project");
  }
});

exports.listProjects = onCall(async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const result = await projects.listProjects(request.auth.uid);
    return result;
  } catch (error) {
    console.error("listProjects error:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    return {
      success: false,
      error: error.message || "Failed to list projects",
      projects: [],
    };
  }
});

exports.deleteProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId} = request.data;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  return projects.deleteProject(request.auth.uid, projectId);
});

// ============================================
// DESIGN INSPIRATION
// ============================================

exports.searchDesignInspiration = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {query, count} = request.data;
  if (!query || typeof query !== "string") {
    throw new HttpsError("invalid-argument", "query is required and must be a string");
  }

  try {
    const results = await designInspiration.searchDesignInspiration(query, count || 10);
    const palettes = designInspiration.extractColorPalettes(results.results);

    return {
      success: true,
      results: results.results,
      palettes: palettes,
      total: results.total,
    };
  } catch (error) {
    console.error("searchDesignInspiration error:", error);
    throw new HttpsError("internal", error.message || "Failed to search design inspiration");
  }
});
