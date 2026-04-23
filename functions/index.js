const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Firebase Admin
// FORCE Firestore Emulator Port to 8085 (matching firebase.json)
// The default is often 8080, which causes a split-brain where Functions write to 8080
// but Frontend (and firebase.json) expects 8085.
if (process.env.FUNCTIONS_EMULATOR === "true" || process.env.FUNCTIONS_EMULATOR === true) {
  console.log("[System] Forcing FIRESTORE_EMULATOR_HOST to localhost:8085");
  process.env.FIRESTORE_EMULATOR_HOST = "localhost:8085";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
}

admin.initializeApp({
  projectId: "shoso-photobook",
  storageBucket: "shoso-photobook.firebasestorage.app",
});

// Import modules lazily to bypass 10-second Firebase deploy timeout
const lazyRequire = (modulePath) => new Proxy({}, {
  get: (target, prop) => require(modulePath)[prop],
});

const auth = lazyRequire("./src/auth");
const photos = lazyRequire("./src/photos");
const slides = lazyRequire("./src/slides");
const projects = lazyRequire("./src/projects");
const designInspiration = lazyRequire("./src/design-inspiration");
const aiStory = lazyRequire("./src/ai-story");
const aiAutoDesign = lazyRequire("./src/ai-autodesign");
const printPdf = lazyRequire("./src/print-ready-pdf-generator");
const payments = lazyRequire("./src/payments");
const paypal = lazyRequire("./src/paypal");
const bookpod = lazyRequire("./src/bookpod");
const supportBot = lazyRequire("./src/support-bot");
const notifications = require("./src/notifications.js");

// ============================================
// OAUTH & AUTHENTICATION
// ============================================

exports.getAuthUrl = onCall(async (request) => {
  return auth.getAuthorizationUrl(request.auth?.uid);
});

exports.oauthCallback = onRequest({cors: true}, async (req, res) => {
  try {
    // Relaxation of COOP to allow window.opener access if possible
    // Note: 'unsafe-none' is the default but explicit setting helps in some emulator contexts.
    res.set("Cross-Origin-Opener-Policy", "unsafe-none");
    res.set("Cross-Origin-Embedder-Policy", "unsafe-none");

    const result = await auth.handleCallback(req.query);
    res.send(`
  <html>
  <head>
    <style>
      body {
        margin: 0; padding: 0; display: flex; align-items: center; justify-content: center;
        height: 100vh; background-color: #f8f9fa;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        flex-direction: column; color: #333;
      }
      .loader {
        border: 4px solid #e0e0e0; border-top: 4px solid #4285F4; border-radius: 50%;
        width: 40px; height: 40px; animation: spin 1s linear infinite; margin-bottom: 20px;
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      h2 { margin: 0 0 10px 0; font-size: 22px; font-weight: 500; }
      p { margin: 0; color: #666; font-size: 15px; }
    </style>
  </head>
  <body>
    <div class="loader"></div>
    <h2>Connecting to Shoso...</h2>
    <p>Please wait while we load your photos.</p>
    <script>
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'GOOGLE_PHOTOS_AUTH_SUCCESS', 
          success: ${result.success},
          result: ${JSON.stringify(result)} 
        }, '*');
      }
    </script>
  </body>
  </html>
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

exports.fetchHighResImage = onCall({timeoutSeconds: 300, memory: "1GiB"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {url} = request.data;
  if (!url) throw new HttpsError("invalid-argument", "url required");
  return photos.fetchHighResImage(request.auth.uid, url);
});

exports.refreshMediaItemUrls = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {mediaItemIds} = request.data;
  if (!mediaItemIds || !Array.isArray(mediaItemIds)) {
    throw new HttpsError("invalid-argument", "mediaItemIds array required");
  }
  return photos.refreshMediaItemUrls(request.auth.uid, mediaItemIds);
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
    // Ensure CORS headers are present even when upstream rejects the request.
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

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

exports.renameProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId, newName} = request.data;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }
  if (!newName) {
    throw new HttpsError("invalid-argument", "newName is required");
  }

  return projects.renameProject(request.auth.uid, projectId, newName);
});

exports.updateShareSettings = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId, settings} = request.data;
  if (!projectId || !settings) {
    throw new HttpsError("invalid-argument", "projectId and settings are required");
  }

  return projects.updateShareSettings(request.auth.uid, projectId, settings);
});

exports.joinProject = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {projectId, shareToken} = request.data;
  if (!projectId) {
    throw new HttpsError("invalid-argument", "projectId is required");
  }

  return projects.joinProject(request.auth.uid, projectId, shareToken);
});

// ============================================
// PROFILE + PAYMENTS (PREP)
// ============================================

exports.getPersonalDetails = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  return payments.getPersonalDetails(request.auth.uid);
});

exports.updatePersonalDetails = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {personalDetails} = request.data || {};
  return payments.updatePersonalDetails(request.auth.uid, personalDetails);
});

exports.listPurchases = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {limit} = request.data || {};
  return payments.listPurchases(request.auth.uid, limit || 20);
});

exports.createPurchaseDraft = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {draft} = request.data || {};
  return payments.createPurchaseDraft(request.auth.uid, draft || {});
});

// ============================================
// BOOKPOD (PRINTING API) - PREP INFRASTRUCTURE
// ============================================

exports.bookpodGenerateUploadUrls = onCall({secrets: ["BOOKPOD_USER_ID", "BOOKPOD_CUSTOM_TOKEN"]}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {contentFileName, coverFileName, title, versionMajor, versionMinor} =
    request.data || {};

  const names = (contentFileName && coverFileName) ? {contentFileName, coverFileName} :
    bookpod.buildDefaultFilenames({title, versionMajor, versionMinor});

  return await bookpod.generateUploadUrls(names);
});

exports.bookpodUploadPdfFromUrl = onCall({secrets: ["BOOKPOD_USER_ID", "BOOKPOD_CUSTOM_TOKEN"]}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {uploadUrl, sourceUrl} = request.data || {};
  return await bookpod.uploadPdfFromUrl({uploadUrl, sourceUrl});
});

exports.bookpodCreateBook = onCall({secrets: ["BOOKPOD_USER_ID", "BOOKPOD_CUSTOM_TOKEN"]}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {book} = request.data || {};
  return await bookpod.createBook(book || {});
});

exports.bookpodCreateBookFromPdfUrls = onCall(
    {secrets: ["BOOKPOD_USER_ID", "BOOKPOD_CUSTOM_TOKEN"]},
    async (request) => {
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "User must be authenticated");
      }
      return await bookpod.createBookFromPdfUrls(request.data || {});
    },
);

exports.bookpodCreateOrder = onCall({secrets: ["BOOKPOD_USER_ID", "BOOKPOD_CUSTOM_TOKEN"]}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {order} = request.data || {};
  return await bookpod.createOrder(order || {});
});

exports.bookpodGetShippingOptions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  return bookpod.getShippingOptions();
});

exports.bookpodSearchPickupPoints = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  return await bookpod.searchPickupPoints(request.data || {});
});

exports.bookpodSubmitPrintJob = onCall({
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: ["BOOKPOD_USER_ID", "BOOKPOD_CUSTOM_TOKEN"],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {bookData, pdfDownloadUrl, orderDraft} = request.data || {};
  if (!bookData || typeof bookData !== "object") {
    throw new HttpsError("invalid-argument", "bookData is required");
  }
  if (!pdfDownloadUrl || typeof pdfDownloadUrl !== "string") {
    throw new HttpsError("invalid-argument", "pdfDownloadUrl is required");
  }

  // 1) Resolve cover PDF — prefer client-generated designed cover if provided,
  //    otherwise fall back to server-side generic cover generation.
  let submitCoverUrl;
  if (bookData.coverPdfUrl && typeof bookData.coverPdfUrl === "string") {
    console.log("[bookpodSubmitPrintJob] Using client-generated cover PDF:", bookData.coverPdfUrl.substring(0, 80));
    submitCoverUrl = bookData.coverPdfUrl;
  } else {
    console.log("[bookpodSubmitPrintJob] Generating server-side cover PDF...");
    const cover = await printPdf.generateBookpodCoverPdf(request.auth.uid, bookData);
    submitCoverUrl = cover.pdfDownloadUrl || cover.pdfUrl;
  }

  // 2) Create BookPod book (upload PDFs to BookPod + create book record)
  const print = (bookData.bookpodPrint && typeof bookData.bookpodPrint === "object") ? bookData.bookpodPrint : {};
  const title = bookData.title || bookData?.story?.title || "My Photo Book";
  const author = request.auth.token?.name || "Shoso";

  // Give BookPod's storage a moment to settle after PDF uploads
  await new Promise((r) => setTimeout(r, 6000));

  const created = await bookpod.createBookFromPdfUrls({
    title,
    author,
    // BookPod print options (best-effort)
    printcolor: print.printcolor || "color",
    sheettype: print.sheettype || "white80",
    laminationtype: print.laminationtype || "none",
    finishtype: "soft",
    readingdirection: print.readingdirection || "right",
    width: print.width,
    height: print.height,
    bleed: Boolean(print.bleed),
    status: true,
    // PDF sources
    contentSourceUrl: pdfDownloadUrl,
    coverSourceUrl: submitCoverUrl,
  }, {attempts: 8, baseDelayMs: 5000});

  const bookid =
    created?.book?.bookid ||
    created?.book?.bookId ||
    created?.book?.id ||
    created?.bookid ||
    null;

  // 3) Optionally create a BookPod order if delivery details were provided
  let order = null;
  if (orderDraft && typeof orderDraft === "object" && bookid) {
    const qty = Math.max(1, Number(orderDraft.quantity || 1));
    const totalprice =
      (typeof orderDraft.totalprice === "number" && Number.isFinite(orderDraft.totalprice)) ?
        orderDraft.totalprice :
        (99 * qty);
    const invoice = (typeof orderDraft.invoiceUrl === "string" && orderDraft.invoiceUrl.trim()) ?
      orderDraft.invoiceUrl.trim() :
      pdfDownloadUrl;

    const shippingDetails = (orderDraft.shippingDetails && typeof orderDraft.shippingDetails === "object") ?
      {...orderDraft.shippingDetails} :
      {};
    shippingDetails.shippingCompanyId = 7;
    shippingDetails.shippingMethod = Number(orderDraft.shippingMethod || shippingDetails.shippingMethod || 2);
    const pickupPointVal = orderDraft.pickupPoint || shippingDetails.pickupPoint;
    if (pickupPointVal) {
      shippingDetails.deliveryPointCode = typeof pickupPointVal === "object" ? pickupPointVal.id : pickupPointVal;
    }

    order = await bookpod.createOrder({
      shippingDetails,
      items: [{bookid, quantity: qty}],
      totalprice,
      invoice,
    });
  }

  return {
    success: true,
    coverPdfUrl: submitCoverUrl,
    bookpodBook: created,
    bookpodOrder: order,
  };
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

exports.generatePhotoDesign = onCall({
  timeoutSeconds: 60,
  memory: "1GiB",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }
  const {imageUrl, prompt} = request.data;
  if (!imageUrl) {
    throw new HttpsError("invalid-argument", "imageUrl is required");
  }

  try {
    return await designInspiration.generatePhotoDesign(request.auth.uid, imageUrl, prompt);
  } catch (error) {
    console.error("generatePhotoDesign error:", error);
    throw new HttpsError("internal", error.message || "Failed to generate design");
  }
});

// ============================================
// MEMORY DIRECTOR (AI STORY + PRINT-READY PDF)
// ============================================

/**
 * Detect story structure from photos using AI
 */
exports.detectStory = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const {photos} = request.data || {};
  if (!photos || !Array.isArray(photos)) {
    throw new HttpsError("invalid-argument", "Photos array required");
  }

  try {
    return await aiStory.detectStoryWithAI(photos);
  } catch (error) {
    console.error("detectStory error:", error);
    throw new HttpsError("internal", error.message || "Story detection failed");
  }
});

/**
 * Generate captions for photos using AI
 */
exports.generateCaptions = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const {photos} = request.data || {};
  if (!photos || !Array.isArray(photos)) {
    throw new HttpsError("invalid-argument", "Photos array required");
  }

  try {
    return await aiStory.generateCaptionsWithAI(photos);
  } catch (error) {
    console.error("generateCaptions error:", error);
    throw new HttpsError("internal", error.message || "Caption generation failed");
  }
});

// ============================================
// AI AUTO DESIGN (full album generation)
// ============================================
exports.generateAutoDesign = onCall({
  timeoutSeconds: 120,
  memory: "1GiB",
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Must be logged in");
  }

  const {photos, lang, seed} = request.data || {};
  if (!photos || !Array.isArray(photos)) {
    throw new HttpsError("invalid-argument", "Photos array required");
  }

  try {
    if (!aiAutoDesign || typeof aiAutoDesign.generateAutoDesignPlan !== "function") {
      throw new Error("aiAutoDesign module not available");
    }
    return await aiAutoDesign.generateAutoDesignPlan(photos, {lang, seed});
  } catch (error) {
    console.error("generateAutoDesign error:", error);
    throw new HttpsError("internal", error.message || "Auto design failed");
  }
});

/**
 * Generate PDF from Memory Director data (spread-based, print-ready)
 */
exports.generateMemoryDirectorPdf = onCall({
  timeoutSeconds: 540,
  memory: "2GiB",
  cors: true,
}, async (request) => {
  try {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "User must be authenticated");
    }

    const {bookData} = request.data || {};
    if (!bookData) {
      throw new HttpsError("invalid-argument", "Missing bookData");
    }

    console.log(`Generating PDF for user ${request.auth.uid}`);

    // Map frontend 'state' structure to backend 'printData' structure
    // The Generator expects flat properties for cover, but frontend has valid 'pages' array.
    const printData = {
      ...bookData,
      title: bookData.cover?.title || bookData.title || "My Photo Book",
      coverTitle: bookData.cover?.title || "My Photo Book",
      coverSubtitle: bookData.cover?.subtitle || "",
      coverBackground: bookData.cover?.backgroundColor || "#1a1a2e",
      coverTextColor: bookData.cover?.textColor || bookData.cover?.titleColor || "#ffffff",
      coverTitleFont: bookData.cover?.titleFont || "Times-Bold",
      coverSubtitleFont: bookData.cover?.subtitleFont || bookData.cover?.titleFont || "Times-Bold",
      coverTextStyle: bookData.coverTextStyle || bookData.cover?.textStyleId || "default",
      coverTitleSize: bookData.cover?.titleSize || 36,
      coverPhoto: bookData.cover?.photo || null,
      coverPhotoShape: bookData.coverPhotoShape || bookData.cover?.photoShape || null,
      coverPhotoFrameId: bookData.coverPhotoFrameId || bookData.cover?.photoFrameId || null,
      coverBackgroundImageData: bookData.cover?.backgroundImageData || null,
      coverBackgroundImageUrl: bookData.cover?.backgroundImageUrl || null,
      // Template information (critical for decorations and design)
      template: bookData.selectedTemplate?.id || bookData.template || null,
      borderStyle: bookData.selectedTemplate?.borderStyle || bookData.borderStyle || null,
      borderColor: bookData.selectedTemplate?.colors?.primary || bookData.borderColor || null,
      decorations: bookData.selectedTemplate?.decorations || bookData.decorations || null,
      // Back cover mapping
      backCover: {
        text: bookData.backCover?.text || "Created with Shoso",
        subtitle: bookData.backCover?.subtitle || "",
        backgroundColor: bookData.backCover?.backgroundColor || bookData.cover?.backgroundColor || "#1a1a2e",
        // Background image (either URL or data URL)
        backgroundImageUrl: bookData.backCover?.backgroundImageUrl || null,
        backgroundImageData: bookData.backCover?.backgroundImageData || null,
        backgroundImageName: bookData.backCover?.backgroundImageName || null,

        textColor: bookData.backCover?.textColor || bookData.cover?.textColor || "#ffffff",
        textFont: bookData.backCover?.textFont || "Helvetica",
        textSize: bookData.backCover?.textSize || 18,
        subtitleSize: bookData.backCover?.subtitleSize || 12,
        textAlign: bookData.backCover?.textAlign || "center",
        showBorder: bookData.backCover?.showBorder !== false,
        showLogo: !!bookData.backCover?.showLogo,
        textStyleId: bookData.backCover?.textStyleId || "default",
      },
      // Ensure pages are passed through
      pages: bookData.pages || [],
      pageFormat: bookData.pageFormat || "square-10x10",
    };

    console.log(`PDF Data: ${printData.pages.length} pages, Title: ${printData.title}`);

    // Use the comprehensive generator which handles the 'pages' array directly
    const result = await printPdf.generatePrintReadyPdf(request.auth.uid, printData);

    return {
      success: true,
      pdfUrl: result.pdfUrl,
      pdfDownloadUrl: result.pdfDownloadUrl,
      pdfId: result.pdfId,
      pageCount: result.pageCount,
      fileSizeMB: result.fileSizeMB,
      resolutionWarnings: result.resolutionWarnings,
    };
  } catch (error) {
    console.error("generateMemoryDirectorPdf error:", error);
    // Wrap errors to be returned to client
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Internal server error");
  }
});

// ============================================
// PHOTO ANALYSIS & POSITIONING
// ============================================

const photoPositionService = require("./src/services/photoPositionService");

exports.analyzePhotoPosition = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {photoUrl, width, height, layoutBox} = request.data;

  if (!photoUrl) {
    throw new HttpsError("invalid-argument", "photoUrl is required");
  }

  // Ensure metadata exists, even if width/height are missing
  const photoMetadata = {
    url: photoUrl,
    width: width || 1000, // Fallback if not provided
    height: height || 1000,
  };

  // Default layout box if not provided (e.g. standard square)
  const targetBox = layoutBox || {width: 800, height: 800};

  try {
    return await photoPositionService.analyzeAndPosition(photoUrl, photoMetadata, targetBox);
  } catch (error) {
    console.error("analyzePhotoPosition error:", error);
    throw new HttpsError("internal", error.message || "Analysis failed");
  }
});

exports.analyzeBatchPhotoPositions = onCall(async (request) => {
  // Allow unauthenticated users for local usage

  const {photos} = request.data;

  if (!photos || !Array.isArray(photos)) {
    throw new HttpsError("invalid-argument", "photos array is required");
  }

  // To avoid timeouts and memory blowups, cap at 50 photos per batch.
  if (photos.length > 50) {
    throw new HttpsError("invalid-argument", "Max batch size is 50 photos.");
  }

  try {
    return await photoPositionService.analyzeBatchFocalPoints(photos);
  } catch (error) {
    console.error("analyzeBatchPhotoPositions error:", error);
    throw new HttpsError("internal", error.message || "Batch analysis failed");
  }
});

// ============================================
// SUPPORT BOT (AI + HUMAN ESCALATION)
// ============================================

/**
 * Add permissive CORS headers for support endpoints.
 * @param {*} res Express response
 */
function setCors(res) {
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Support-Webhook-Token");
}

exports.supportChat = onRequest({cors: true}, async (req, res) => {
  try {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    const {sessionId, message, pageUrl} = req.body || {};
    if (!supportBot) {
      console.warn("supportBot module not loaded");
      res.status(503).json({error: "Support service unavailable"});
      return;
    }
    const result = await supportBot.chat({sessionId, message, pageUrl});
    if (!result?.success) {
      res.status(400).json({error: result?.error || "Failed"});
      return;
    }
    res.json(result);
  } catch (error) {
    console.error("supportChat error:", error);
    res.status(500).json({error: error.message || "Internal server error"});
  }
});

exports.supportRequestAgent = onRequest({cors: true}, async (req, res) => {
  try {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    const {sessionId, userEmail, summary} = req.body || {};
    if (!supportBot) {
      console.warn("supportBot module not loaded");
      res.status(503).json({error: "Support service unavailable"});
      return;
    }
    const result = await supportBot.requestAgent({sessionId, userEmail, summary});
    if (!result?.success) {
      res.status(400).json({error: result?.error || "Failed"});
      return;
    }
    res.json(result);
  } catch (error) {
    console.error("supportRequestAgent error:", error);
    res.status(500).json({error: error.message || "Internal server error"});
  }
});

// ============================================
// PAYPAL & FULFILLMENT
// ============================================

exports.createPayPalOrder = onCall({
  secrets: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET"],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {amount, currency} = request.data || {};
  if (!amount) {
    throw new HttpsError("invalid-argument", "Amount is required");
  }

  try {
    return await paypal.createOrder(amount, currency || "ILS");
  } catch (error) {
    console.error("createPayPalOrder error:", error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", error.message || "Failed to create PayPal order");
  }
});

exports.capturePayPalOrder = onCall({
  timeoutSeconds: 540,
  memory: "1GiB",
  secrets: ["PAYPAL_CLIENT_ID", "PAYPAL_CLIENT_SECRET", "BOOKPOD_USER_ID", "BOOKPOD_CUSTOM_TOKEN"],
}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "User must be authenticated");
  }

  const {orderId, bookData, pdfDownloadUrl, orderDraft} = request.data || {};
  if (!orderId) {
    throw new HttpsError("invalid-argument", "orderId is required");
  }

  // 1. Capture PayPal Payment
  let capture;
  try {
    capture = await paypal.captureOrder(orderId);
  } catch (error) {
    console.error("capturePayPalOrder error:", error);
    throw new HttpsError("internal", "Payment capture failed: " + error.message);
  }

  if (capture.status !== "COMPLETED") {
    throw new HttpsError("failed-precondition", "Payment not completed. Status: " + capture.status);
  }

  // 2. Fulfill Order via BookPod (if book data provided)
  let fulfillment = null;
  let bookidStr = null;
  let trackingUrl = null;
  if (bookData && pdfDownloadUrl) {
    try {
      fulfillment = await processBookPodOrder(
          request.auth.uid,
          request.auth.token?.name || "Shoso User",
          {bookData, pdfDownloadUrl, orderDraft},
      );
      bookidStr = fulfillment.bookpodBook?.book?.bookid || null;
      if (fulfillment.bookpodOrder && typeof fulfillment.bookpodOrder.id !== "undefined") {
        // K.Express / HFD tracking or bookpod tracking depending on what bookpod returns
        trackingUrl = `https://bookpod.co.il/track/${fulfillment.bookpodOrder.id}`;
      }
    } catch (error) {
      console.error("Fulfillment failed after payment:", error);
      fulfillment = {success: false, error: error.message};
    }
  }

  // 3. Save purchase to Firestore
  const db = admin.firestore();
  const purchaseDocRef = db.collection("users").doc(request.auth.uid).collection("purchases").doc(orderId);
  const amountStr = capture.purchase_units?.[0]?.amount?.value || "0.00";
  const currencyCode = capture.purchase_units?.[0]?.amount?.currency_code || "ILS";

  const purchaseData = {
    status: "COMPLETED",
    provider: "paypal",
    currency: currencyCode,
    amount: parseFloat(amountStr),
    description: "Shoso Photo Book",
    projectId: orderDraft?.projectId || null,
    projectTitle: orderDraft?.projectTitle || null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    trackingUrl: trackingUrl || null,
    bookpodOrder: fulfillment?.bookpodOrder || null,
    bookpodBookId: bookidStr,
  };
  await purchaseDocRef.set(purchaseData, {merge: true});

  // 4. Send Confirmation Email
  const userEmail = request.auth.token?.email || orderDraft?.shippingDetails?.email;
  if (userEmail) {
    let addressDetails = "None";
    if (orderDraft?.shippingDetails) {
      const {city, street, house} = orderDraft.shippingDetails;
      const methodStr = orderDraft.shippingMethod === 1 ? "איסוף מנקודה" : "עד הבית";
      addressDetails = `${city}, ${street} ${house}\nשיטת משלוח: ${methodStr}`;
    }
    await notifications.sendOrderConfirmation(userEmail, {
      orderId,
      amount: amountStr,
      name: request.auth.token?.name || orderDraft?.shippingDetails?.name,
      address: addressDetails,
      bookid: bookidStr,
      trackingUrl,
    });
  }

  return {
    success: true,
    payment: capture,
    fulfillment,
  };
});


// Helper for BookPod submission (shared logic)
/**
 * Process a BookPod order by generating PDF, creating book, and submitting order.
 * @param {string} uid - The user ID.
 * @param {string} authName - The user's name.
 * @param {Object} params - Order parameters.
 * @param {Object} params.bookData - The book data object.
 * @param {string} params.pdfDownloadUrl - The URL of the PDF to print.
 * @param {Object} [params.orderDraft] - Optional order draft details.
 * @return {Promise<Object>} The result of the processing.
 */
async function processBookPodOrder(uid, authName, {bookData, pdfDownloadUrl, orderDraft}) {
  if (!bookData || typeof bookData !== "object") {
    throw new Error("bookData is required");
  }
  if (!pdfDownloadUrl || typeof pdfDownloadUrl !== "string") {
    throw new Error("pdfDownloadUrl is required");
  }

  // 1) Resolve cover PDF — prefer client-generated designed cover if provided,
  //    otherwise fall back to server-side generic cover generation.
  let coverPdfDownloadUrl;
  if (bookData.coverPdfUrl && typeof bookData.coverPdfUrl === "string") {
    console.log("[processBookPodOrder] Using client-generated cover PDF:", bookData.coverPdfUrl.substring(0, 80));
    coverPdfDownloadUrl = bookData.coverPdfUrl;
  } else {
    console.log("[processBookPodOrder] Generating server-side cover PDF...");
    const cover = await printPdf.generateBookpodCoverPdf(uid, bookData);
    coverPdfDownloadUrl = cover.pdfDownloadUrl || cover.pdfUrl;
  }

  // 2) Create BookPod book (upload PDFs to BookPod + create book record)
  const print = (bookData.bookpodPrint && typeof bookData.bookpodPrint === "object") ? bookData.bookpodPrint : {};
  const title = bookData.title || bookData?.story?.title || "My Photo Book";
  const author = authName || "Shoso";

  // Give BookPod's storage a moment to settle after PDF uploads
  await new Promise((r) => setTimeout(r, 6000));

  const created = await bookpod.createBookFromPdfUrls({
    title,
    author,
    // BookPod print options (best-effort)
    printcolor: print.printcolor || "color",
    sheettype: print.sheettype || "white80",
    laminationtype: print.laminationtype || "none",
    finishtype: "soft",
    readingdirection: print.readingdirection || "right",
    width: print.width,
    height: print.height,
    bleed: Boolean(print.bleed),
    status: true,
    // PDF sources
    contentSourceUrl: pdfDownloadUrl,
    coverSourceUrl: coverPdfDownloadUrl,
  }, {attempts: 8, baseDelayMs: 5000});

  const bookid =
    created?.book?.bookid ||
    created?.book?.bookId ||
    created?.book?.id ||
    created?.bookid ||
    null;

  // 3) Optionally create a BookPod order if delivery details were provided
  let order = null;
  if (orderDraft && typeof orderDraft === "object" && bookid) {
    const qty = Math.max(1, Number(orderDraft.quantity || 1));
    const totalprice =
      (typeof orderDraft.totalprice === "number" && Number.isFinite(orderDraft.totalprice)) ?
        orderDraft.totalprice :
        (99 * qty);
    const invoice = (typeof orderDraft.invoiceUrl === "string" && orderDraft.invoiceUrl.trim()) ?
      orderDraft.invoiceUrl.trim() :
      pdfDownloadUrl;

    const shippingDetails = (orderDraft.shippingDetails && typeof orderDraft.shippingDetails === "object") ?
      {...orderDraft.shippingDetails} :
      {};
    shippingDetails.shippingCompanyId = 7;
    shippingDetails.shippingMethod = Number(orderDraft.shippingMethod || shippingDetails.shippingMethod || 2);
    const pickupPointVal = orderDraft.pickupPoint || shippingDetails.pickupPoint;
    if (pickupPointVal) {
      shippingDetails.deliveryPointCode = typeof pickupPointVal === "object" ? pickupPointVal.id : pickupPointVal;
    }

    order = await bookpod.createOrder({
      shippingDetails,
      items: [{bookid, quantity: qty}],
      totalprice,
      invoice,
    });
  }

  return {
    success: true,
    coverPdfUrl: coverPdfDownloadUrl,
    bookpodBook: created,
    bookpodOrder: order,
  };
}


// ============================================
// TEST / DEBUG: Direct print without payment
// ============================================

exports.testDirectPrint = onRequest({
  cors: true,
  timeoutSeconds: 300,
  memory: "256MiB",
  secrets: ["BOOKPOD_USER_ID", "BOOKPOD_CUSTOM_TOKEN"],
}, async (req, res) => {
  setCors(res);
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }
  if (req.method !== "POST") {
    res.status(405).json({error: "Method not allowed"});
    return;
  }

  // Verify Firebase auth token
  const authHeader = req.headers.authorization || "";
  if (!authHeader.startsWith("Bearer ")) {
    res.status(401).json({error: "Unauthorized"});
    return;
  }

  let uid; let authName;
  try {
    const decoded = await admin.auth().verifyIdToken(authHeader.slice(7));
    uid = decoded.uid;
    authName = decoded.name || "Test User";
  } catch (e) {
    res.status(401).json({error: "Invalid token"});
    return;
  }

  const {bookData, pdfDownloadUrl, orderDraft} = req.body || {};
  if (!pdfDownloadUrl) {
    res.status(400).json({error: "pdfDownloadUrl is required"});
    return;
  }

  try {
    const result = await processBookPodOrder(uid, authName, {bookData, pdfDownloadUrl, orderDraft});
    res.json(result);
  } catch (error) {
    console.error("[testDirectPrint] Error:", error);
    res.status(500).json({error: error.message || "Failed to submit to print API"});
  }
});

exports.supportGetMessages = onRequest({cors: true}, async (req, res) => {
  // [DEBUG] Stub implementation to stop crashes and spam
  res.json({success: true, messages: []});
});

exports.supportInboundEmail = onRequest({cors: true}, async (req, res) => {
  try {
    setCors(res);
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({error: "Method not allowed"});
      return;
    }

    const expected = process.env.SUPPORT_WEBHOOK_TOKEN;
    const provided = req.get("X-Support-Webhook-Token");
    if (expected && (!provided || provided !== expected)) {
      res.status(401).json({error: "Unauthorized"});
      return;
    }

    const {ticketId, from, text} = req.body || {};
    if (!supportBot) {
      console.warn("supportBot module not loaded");
      res.status(503).json({error: "Support service unavailable"});
      return;
    }
    const result = await supportBot.inboundEmail({ticketId, from, text});
    if (!result?.success) {
      res.status(400).json({error: result?.error || "Failed"});
      return;
    }
    res.json(result);
  } catch (error) {
    console.error("supportInboundEmail error:", error);
    res.status(500).json({error: error.message || "Internal server error"});
  }
});

// ============================================
// MAGIC CREATE V4 (AI Design Backend)
// ============================================
const magicApp = require("./src/magic");
exports.magic = onRequest({
  timeoutSeconds: 300,
  memory: "1GiB",
  cors: true,
}, magicApp);

// ============================================
// WHATSAPP BOT (Webhook)
// ============================================
const whatsappWebhook = require("./src/whatsapp/webhook");
exports.whatsapp = onRequest({
  timeoutSeconds: 300,
  memory: "1GiB",
  secrets: ["WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID"],
}, whatsappWebhook);
