const {onCall, onRequest, HttpsError} = require("firebase-functions/v2/https");
const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp();

// Import modules
let auth;
let photos;
let slides;
let projects;
let designInspiration;
let aiStory;
let printPdf;
let payments;
let bookpod;
let supportBot;
try {
  auth = require("./src/auth");
  photos = require("./src/photos");
  slides = require("./src/slides");
  projects = require("./src/projects");
  designInspiration = require("./src/design-inspiration");
  aiStory = require("./src/ai-story");
  printPdf = require("./src/print-ready-pdf-generator");
  payments = require("./src/payments");
  bookpod = require("./src/bookpod");
  supportBot = require("./src/support-bot");
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
    // Relaxation of COOP to allow window.opener access if possible
    res.set("Cross-Origin-Opener-Policy", "unsafe-none");

    const result = await auth.handleCallback(req.query);
    res.send(`
  <html>
  <body>
    <h2>Authorization ${result.success ? "Successful" : "Failed"}</h2>
    <p>${result.message}</p>
    <p>This window should close automatically.</p>
    <script>
      // Notify the main window
      if (window.opener) {
        window.opener.postMessage({ 
          type: 'GOOGLE_PHOTOS_AUTH_SUCCESS', 
          success: ${result.success},
          result: ${JSON.stringify(result)} 
        }, '*');
      }
      
      // Attempt to close
      setTimeout(() => {
        window.close();
      }, 1500);
    </script>
    <button onclick="window.close()" style="padding:10px 20px; font-size:16px; margin-top:20px;">Close Window</button>
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

exports.fetchHighResImage = onCall(async (request) => {
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

  // 1) Generate an A4 cover PDF for BookPod and upload it to Storage
  const cover = await printPdf.generateBookpodCoverPdf(request.auth.uid, bookData);

  // 2) Create BookPod book (upload PDFs to BookPod + create book record)
  const print = (bookData.bookpodPrint && typeof bookData.bookpodPrint === "object") ? bookData.bookpodPrint : {};
  const title = bookData.title || bookData?.story?.title || "My Photo Book";
  const author = request.auth.token?.name || "Shoso";

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
    coverSourceUrl: cover.pdfDownloadUrl || cover.pdfUrl,
  });

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
    shippingDetails.shippingCompanyId = 6;
    shippingDetails.shippingMethod = Number(orderDraft.shippingMethod || shippingDetails.shippingMethod || 2);
    if (orderDraft.pickupPoint) {
      shippingDetails.pickupPoint = orderDraft.pickupPoint;
      if (!shippingDetails.pickupPointId && orderDraft.pickupPoint.id) {
        shippingDetails.pickupPointId = orderDraft.pickupPoint.id;
      }
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
    coverPdf: cover,
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
      coverTitleSize: bookData.cover?.titleSize || 36,
      coverPhoto: bookData.cover?.photo || null,
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
        backgroundColor: bookData.backCover?.backgroundColor || bookData.cover?.backgroundColor || "#1a1a2e",
        textColor: bookData.backCover?.textColor || bookData.cover?.textColor || "#ffffff",
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
