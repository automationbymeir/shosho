/**
 * ============================================
 * PRINT-READY PDF GENERATOR
 * For professional photo book printing
 * ============================================
 *
 * Key Features:
 * - 300 DPI minimum for photos
 * - Binding-aware margins (extra space on spine side)
 * - Individual pages (not spreads) for printers
 * - Resolution warnings for low-quality photos
 * - Hebrew text support (RTL)
 */

/* eslint-disable require-jsdoc, valid-jsdoc, max-len, brace-style */

const PDFDocument = require("pdfkit");
const path = require("path");
const fetch = require("node-fetch");
const admin = require("firebase-admin");
const crypto = require("crypto");
const {google} = require("googleapis");
const auth = require("./auth");

// ============================================
// PRINT CONSTANTS
// ============================================

const PRINT_DPI = 300;
const POINTS_PER_INCH = 72;
const BLEED_INCHES = 0.125; // Standard 1/8" bleed
const BLEED_POINTS = BLEED_INCHES * POINTS_PER_INCH; // 9 points

// Binding margin - extra space on spine side
const BINDING_MARGIN_INCHES = 0.25; // 1/4" extra
const BINDING_MARGIN_POINTS = BINDING_MARGIN_INCHES * POINTS_PER_INCH; // 18 points

// Resolution thresholds
const MIN_DPI_WARNING = 200; // Warn below this
const MIN_DPI_REJECT = 150; // Strong warning below this

// ============================================
// PAGE SIZE CONFIGURATIONS
// ============================================

function safeFilename(name) {
  const raw = String(name || "My Photo Book.pdf");
  // Avoid path separators and odd characters in the filename.
  return raw
      .replace(/[\\/]/g, "-")
      .replace(/[^\w\s.\-()]/g, "_")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 180);
}

async function uploadPdfToStorage(userId, filename, pdfBuffer) {
  const bucket = admin.storage().bucket();
  const bucketName = bucket.name;
  const token = crypto.randomUUID();
  const safeName = safeFilename(filename);

  const filePath = `pdf/${userId}/${Date.now()}_${safeName}`;
  const file = bucket.file(filePath);

  await file.save(pdfBuffer, {
    resumable: false,
    metadata: {
      contentType: "application/pdf",
      contentDisposition: `inline; filename="${safeName}"`,
      cacheControl: "private, max-age=0, no-transform",
      metadata: {
        firebaseStorageDownloadTokens: token,
      },
    },
  });

  const encodedPath = encodeURIComponent(filePath);
  const base = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedPath}?alt=media&token=${token}`;

  // Provide both an inline (view) link and an attachment (download) link.
  const pdfUrl = `${base}&response-content-disposition=${encodeURIComponent(`inline; filename="${safeName}"`)}`;
  const pdfDownloadUrl = `${base}&response-content-disposition=${encodeURIComponent(`attachment; filename="${safeName}"`)}`;

  return {
    pdfId: filePath,
    pdfUrl,
    pdfDownloadUrl,
    storagePath: filePath,
    bucket: bucketName,
  };
}

async function uploadPdfToDrive(userId, filename, pdfBuffer) {
  const oauth2Client = await auth.getOAuth2Client(userId);
  if (!oauth2Client) throw new Error("User not authorized");

  const drive = google.drive({version: "v3", auth: oauth2Client});

  const fileMetadata = {
    name: safeFilename(filename || "Photo Book.pdf"),
    mimeType: "application/pdf",
  };

  const media = {
    mimeType: "application/pdf",
    body: require("stream").Readable.from(pdfBuffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media,
    fields: "id",
  });

  // Make it publicly accessible so BookPod can fetch it.
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {role: "reader", type: "anyone"},
  });

  const fileId = file.data.id;
  return {
    pdfId: fileId,
    pdfUrl: `https://drive.google.com/file/d/${fileId}/view`,
    pdfDownloadUrl: `https://drive.google.com/uc?export=download&id=${fileId}`,
    storagePath: null,
    bucket: null,
  };
}

/**
 * Generate a simple A4 cover PDF for BookPod.
 * BookPod is strict about cover PDF processing; A4 has proven to be accepted.
 *
 * @param {string} userId
 * @param {Object} bookData
 * @return {Promise<Object>} {pdfUrl, pdfDownloadUrl, pdfId, ...}
 */
async function generateBookpodCoverPdf(userId, bookData) {
  // Support both "classic" and Memory Director shapes.
  const title = String(
      bookData?.title ||
    bookData?.story?.title ||
    bookData?.coverTitle ||
    "My Photo Book",
  );
  const subtitle = String(
      bookData?.coverSubtitle ||
    bookData?.story?.chapters?.[0]?.subtitle ||
    "",
  );
  const bgColor = String(
      bookData?.coverBackground ||
    bookData?.settings?.coverBackground ||
    "#ffffff",
  );
  const textColor = String(
      bookData?.coverTextColor ||
    bookData?.settings?.coverTextColor ||
    "#111111",
  );

  const doc = new PDFDocument({
    size: "A4",
    margin: 0,
    autoFirstPage: true,
    compress: true,
    info: {
      Title: `${title} - Cover`,
      Author: "Shoso Photo Book Creator",
      Creator: "Shoso",
    },
  });

  // Best-effort fonts (no-op if helper isn't defined yet in file scope)
  try {
    if (typeof registerPdfFonts === "function") registerPdfFonts(doc);
  } catch (e) {
    // ignore
  }

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const w = doc.page.width;
  const h = doc.page.height;

  // Background
  doc.rect(0, 0, w, h).fillColor(bgColor).fill();

  // Title
  doc.fillColor(textColor);
  doc.font("Helvetica-Bold");
  doc.fontSize(32);
  doc.text(title, 48, h * 0.55, {width: w - 96, align: "center"});

  if (subtitle && subtitle.trim()) {
    doc.font("Helvetica");
    doc.fontSize(14);
    doc.fillColor(textColor);
    doc.text(subtitle, 60, h * 0.55 + 52, {width: w - 120, align: "center"});
  }

  const pdfBuffer = await new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });

  const fileName = `${title} - BookPod Cover.pdf`;
  try {
    return await uploadPdfToStorage(userId, fileName, pdfBuffer);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.toLowerCase().includes("bucket") && msg.toLowerCase().includes("does not exist")) {
      console.warn("Storage bucket missing; falling back to Google Drive upload (cover)");
      return await uploadPdfToDrive(userId, fileName, pdfBuffer);
    }
    throw e;
  }
}

/**
 * Get page size with print specifications
 * All dimensions in points (72 points = 1 inch)
 */
function getPageSizeForPrint(format, includeBleed = false) {
  const sizes = {
    "square-8x8": {
      width: 8 * POINTS_PER_INCH,
      height: 8 * POINTS_PER_INCH,
      printWidth: 8,
      printHeight: 8,
    },
    "square-10x10": {
      width: 10 * POINTS_PER_INCH,
      height: 10 * POINTS_PER_INCH,
      printWidth: 10,
      printHeight: 10,
    },
    "square-12x12": {
      width: 12 * POINTS_PER_INCH,
      height: 12 * POINTS_PER_INCH,
      printWidth: 12,
      printHeight: 12,
    },
    "landscape-11x8.5": {
      width: 11 * POINTS_PER_INCH,
      height: 8.5 * POINTS_PER_INCH,
      printWidth: 11,
      printHeight: 8.5,
    },
    "landscape-13x10": {
      width: 13 * POINTS_PER_INCH,
      height: 10 * POINTS_PER_INCH,
      printWidth: 13,
      printHeight: 10,
    },
    "portrait-8.5x11": {
      width: 8.5 * POINTS_PER_INCH,
      height: 11 * POINTS_PER_INCH,
      printWidth: 8.5,
      printHeight: 11,
    },
    "portrait-10x13": {
      width: 10 * POINTS_PER_INCH,
      height: 13 * POINTS_PER_INCH,
      printWidth: 10,
      printHeight: 13,
    },
  };

  const baseSize = sizes[format] || sizes["square-10x10"];

  if (includeBleed) {
    return {
      ...baseSize,
      width: baseSize.width + BLEED_POINTS * 2,
      height: baseSize.height + BLEED_POINTS * 2,
      bleed: BLEED_POINTS,
      trimWidth: baseSize.width,
      trimHeight: baseSize.height,
    };
  }

  return {
    ...baseSize,
    bleed: 0,
    trimWidth: baseSize.width,
    trimHeight: baseSize.height,
  };
}

/**
 * Calculate required pixels for print quality
 */
function getRequiredPixels(printWidthInches, printHeightInches, dpi = PRINT_DPI) {
  return {
    width: Math.ceil(printWidthInches * dpi),
    height: Math.ceil(printHeightInches * dpi),
  };
}

/**
 * Calculate effective DPI of an image at print size
 */
function calculateEffectiveDPI(imagePixelWidth, imagePixelHeight, printWidthInches, printHeightInches) {
  const dpiWidth = imagePixelWidth / printWidthInches;
  const dpiHeight = imagePixelHeight / printHeightInches;
  return Math.min(dpiWidth, dpiHeight);
}

// ============================================
// MARGIN CALCULATIONS
// ============================================

/**
 * Get margins for a specific page considering binding
 */
function getPageMargins(pageNumber, totalPages, pageSize, isRightPage = null) {
  const baseMargin = 0.5 * POINTS_PER_INCH; // 36 points = 0.5"

  // Determine page side (Page 1 is right, Page 2 is left, etc.)
  if (isRightPage === null) {
    isRightPage = pageNumber % 2 === 1;
  }

  // Binding margin goes on spine side
  const innerMargin = baseMargin + BINDING_MARGIN_POINTS;
  const outerMargin = baseMargin;

  return {
    top: baseMargin,
    bottom: baseMargin + 20, // Extra space for page numbers
    left: isRightPage ? innerMargin : outerMargin,
    right: isRightPage ? outerMargin : innerMargin,
    spine: innerMargin,
    outer: outerMargin,
  };
}

/**
 * Get content area (page minus margins)
 */
function getContentArea(pageSize, margins) {
  return {
    x: margins.left,
    y: margins.top,
    width: pageSize.width - margins.left - margins.right,
    height: pageSize.height - margins.top - margins.bottom,
  };
}

// ============================================
// IMAGE FETCHING (HIGH RESOLUTION)
// ============================================

/**
 * Calculate optimal fetch size for print
 */
function calculateFetchSize(slotDimensions, dpi = PRINT_DPI) {
  const slotWidthInches = slotDimensions.width / POINTS_PER_INCH;
  const slotHeightInches = slotDimensions.height / POINTS_PER_INCH;

  const requiredWidth = Math.ceil(slotWidthInches * dpi);
  const requiredHeight = Math.ceil(slotHeightInches * dpi);

  // Add 10% buffer
  const fetchWidth = Math.ceil(requiredWidth * 1.1);
  const fetchHeight = Math.ceil(requiredHeight * 1.1);

  // Cap at Google Photos limit
  const maxSize = 8192;

  return {
    width: Math.min(fetchWidth, maxSize),
    height: Math.min(fetchHeight, maxSize),
    requiredWidth,
    requiredHeight,
  };
}

/**
 * Fetch image at optimal resolution for printing
 * Priority: editedImageData > original (=d) > high-res fetch > thumbnail (warn)
 */
async function fetchImageForPrint(photo, accessToken, targetSlot) {
  const result = {
    buffer: null,
    width: 0,
    height: 0,
    effectiveDPI: 0,
    warning: null,
    source: null,
  };

  // Priority 1: User's edited image (already processed)
  if (photo?.editedImageData && String(photo.editedImageData).startsWith("data:")) {
    const base64Data = String(photo.editedImageData).split(",")[1];
    result.buffer = Buffer.from(base64Data, "base64");
    result.source = "editedImageData";
    console.log(`  ✓ Using edited image: ${(result.buffer.length / 1024 / 1024).toFixed(2)} MB`);
  }
  // Priority 2: Alternative edited data field
  else if (photo?.editedData && String(photo.editedData).startsWith("data:")) {
    const base64Data = String(photo.editedData).split(",")[1];
    result.buffer = Buffer.from(base64Data, "base64");
    result.source = "editedData";
    console.log(`  ✓ Using edited data: ${(result.buffer.length / 1024 / 1024).toFixed(2)} MB`);
  }
  // Priority 3: Fetch from Google Photos OR standard URL
  else if (photo?.baseUrl || photo?.url || photo?.fullUrl) {
    const fetchSize = calculateFetchSize(targetSlot);
    const sourceUrl = photo.baseUrl || photo.url || photo.fullUrl;

    // Try original first, then sized
    const urls = [];

    // Google Photos logic
    if (sourceUrl.includes("googleusercontent.com")) {
      urls.push(`${String(sourceUrl).split("=")[0]}=d`); // Original
      urls.push(`${String(sourceUrl).split("=")[0]}=w${fetchSize.width}-h${fetchSize.height}`);
      urls.push(`${String(sourceUrl).split("=")[0]}=w4096-h4096`);
    } else {
      // Standard URL (Storage/External)
      urls.push(sourceUrl);
    }

    for (const url of urls) {
      try {
        console.log(`  Fetching: ${url.substring(0, 60)}...`);
        const response = await fetch(url, {
          headers: {Authorization: `Bearer ${accessToken}`},
          timeout: 30000,
        });

        if (response.ok) {
          result.buffer = await response.buffer();
          result.source = url.includes("=d") ? "original" : "sized";
          console.log(`  ✓ Fetched: ${(result.buffer.length / 1024 / 1024).toFixed(2)} MB`);
          break;
        }
      } catch (error) {
        console.log(`  ✗ Fetch error: ${error.message}`);
      }
    }
  }
  // Priority 4: Thumbnail fallback (LOW QUALITY!)
  else if (photo?.thumbnailUrl && String(photo.thumbnailUrl).startsWith("data:")) {
    const base64Data = String(photo.thumbnailUrl).split(",")[1];
    result.buffer = Buffer.from(base64Data, "base64");
    result.source = "thumbnail";
    result.warning = "LOW_RESOLUTION_THUMBNAIL";
    console.log("  ⚠ WARNING: Using thumbnail (low resolution)");
  }

  if (!result.buffer) {
    console.log("  ✗ No image data available");
    return result;
  }

  // Get actual dimensions
  try {
    const sizeOf = require("image-size").default || require("image-size");
    const dimensions = sizeOf(result.buffer);
    result.width = dimensions.width;
    result.height = dimensions.height;

    // Calculate effective DPI
    const slotWidthInches = targetSlot.width / POINTS_PER_INCH;
    const slotHeightInches = targetSlot.height / POINTS_PER_INCH;
    result.effectiveDPI = calculateEffectiveDPI(
        dimensions.width,
        dimensions.height,
        slotWidthInches,
        slotHeightInches,
    );

    console.log(`  Dimensions: ${dimensions.width}×${dimensions.height}px, DPI: ${Math.round(result.effectiveDPI)}`);

    // Add resolution warnings
    if (result.effectiveDPI < MIN_DPI_REJECT) {
      result.warning = "VERY_LOW_RESOLUTION";
      console.log(`  ⚠ VERY LOW: ${Math.round(result.effectiveDPI)} DPI - will look pixelated`);
    } else if (result.effectiveDPI < MIN_DPI_WARNING) {
      result.warning = "LOW_RESOLUTION";
      console.log(`  ⚠ LOW: ${Math.round(result.effectiveDPI)} DPI - may look soft`);
    }
  } catch (error) {
    console.log(`  Could not determine dimensions: ${error.message}`);
  }

  return result;
}

// ============================================
// LAYOUT HELPERS
// ============================================

/**
 * Calculate image fit (contain mode - no cropping)
 */
function calculateFitDimensions(imageWidth, imageHeight, slotWidth, slotHeight) {
  const imageRatio = imageWidth / imageHeight;
  const slotRatio = slotWidth / slotHeight;

  let finalWidth;
  let finalHeight;

  if (imageRatio > slotRatio) {
    finalWidth = slotWidth;
    finalHeight = slotWidth / imageRatio;
  } else {
    finalHeight = slotHeight;
    finalWidth = slotHeight * imageRatio;
  }

  return {
    width: Math.max(1, finalWidth),
    height: Math.max(1, finalHeight),
  };
}

/**
 * Get layout positions for multiple photos
 */
function getLayoutPositionsForPrint(layout, pageSize, margins, designData) {
  const content = getContentArea(pageSize, margins);
  const gap = designData?.data?.layout?.photoSpacing || 15;

  const layouts = {
    "single": [{x: content.x, y: content.y, width: content.width, height: content.height}],
    "two-horizontal": [
      {x: content.x, y: content.y, width: (content.width - gap) / 2, height: content.height},
      {
        x: content.x + (content.width + gap) / 2,
        y: content.y,
        width: (content.width - gap) / 2,
        height: content.height,
      },
    ],
    "two-vertical": [
      {x: content.x, y: content.y, width: content.width, height: (content.height - gap) / 2},
      {
        x: content.x,
        y: content.y + (content.height + gap) / 2,
        width: content.width,
        height: (content.height - gap) / 2,
      },
    ],
    "four-grid": [
      {x: content.x, y: content.y, width: (content.width - gap) / 2, height: (content.height - gap) / 2},
      {
        x: content.x + (content.width + gap) / 2,
        y: content.y,
        width: (content.width - gap) / 2,
        height: (content.height - gap) / 2,
      },
      {
        x: content.x,
        y: content.y + (content.height + gap) / 2,
        width: (content.width - gap) / 2,
        height: (content.height - gap) / 2,
      },
      {
        x: content.x + (content.width + gap) / 2,
        y: content.y + (content.height + gap) / 2,
        width: (content.width - gap) / 2,
        height: (content.height - gap) / 2,
      },
    ],
  };

  return layouts[layout] || layouts.single;
}

// ============================================
// TEXT HANDLING (Hebrew Support)
// ============================================

const HEBREW_FONT_REGULAR = "Alef";
const HEBREW_FONT_BOLD = "Alef-Bold";
const HEBREW_FONT_REGULAR_PATH = path.join(__dirname, "..", "assets", "fonts", "Alef-Regular.ttf");
const HEBREW_FONT_BOLD_PATH = path.join(__dirname, "..", "assets", "fonts", "Alef-Bold.ttf");

function registerPdfFonts(doc) {
  try {
    doc.registerFont(HEBREW_FONT_REGULAR, HEBREW_FONT_REGULAR_PATH);
    doc.registerFont(HEBREW_FONT_BOLD, HEBREW_FONT_BOLD_PATH);
  } catch (e) {
    console.warn("Hebrew fonts not available:", e?.message);
  }
}

function containsHebrew(text) {
  if (!text || typeof text !== "string") return false;
  return /[\u0590-\u05FF]/.test(text);
}

function rtlize(text) {
  if (!text || typeof text !== "string") return text;
  return "\u200F" + Array.from(text).reverse().join("");
}

/**
 * Map web fonts to standard PDF fonts
 */
function getSafeFont(fontName) {
  const webToPdfMap = {
    "Playfair Display": "Times-Bold",
    "Merriweather": "Times-Roman",
    "Roboto": "Helvetica",
    "Open Sans": "Helvetica",
    "Lato": "Helvetica",
    "Montserrat": "Helvetica",
    "Inter": "Helvetica",
    "Times New Roman": "Times-Roman",
    "Arial": "Helvetica",
  };

  // Return mapped font, or original if it's likely standard (Times/Helvetica/Courier), or default to Helvetica
  return webToPdfMap[fontName] || (["Times-Bold", "Times-Roman", "Helvetica", "Helvetica-Bold", "Courier"].includes(fontName) ? fontName : "Helvetica");
}

function preparePdfText(text, fonts) {
  const isHeb = containsHebrew(text);
  if (!isHeb) return {text, font: getSafeFont(fonts.latinFont), isHebrew: false};
  return {text: rtlize(text), font: fonts.hebrewFont, isHebrew: true};
}

/**
 * Draw page background (color or image)
 */
async function drawPageBackground(doc, page, pageSize, accessToken) {
  // 1. Solid Color
  const bgColor = page.backgroundColor || "#ffffff";
  doc.rect(0, 0, pageSize.width, pageSize.height).fillColor(bgColor).fill();

  // 2. Background Image
  if (page.backgroundImageData || page.backgroundImageUrl) {
    try {
      let bgBuffer = null;

      // Prefer base64 data from client
      if (page.backgroundImageData && String(page.backgroundImageData).startsWith("data:")) {
        const base64Data = String(page.backgroundImageData).split(",")[1];
        bgBuffer = Buffer.from(base64Data, "base64");
      }
      // Fallback to fetching URL
      else if (page.backgroundImageUrl) {
        // If it's a proxy url, might need special handling, but try fetching
        // Note: If using Google Photos proxy, might need auth headers.
        // Assuming public templates for now or local proxy.
        // If it's a Google Photo background, fetchImageForPrint logic applies,
        // but that's complex to reuse here without a slot.
        // Simple fetch:
        try {
          const res = await fetch(page.backgroundImageUrl);
          if (res.ok) bgBuffer = await res.buffer();
        } catch (err) {
          console.warn("Failed to fetch page background URL:", err.message);
        }
      }

      if (bgBuffer) {
        doc.image(bgBuffer, 0, 0, {
          width: pageSize.width,
          height: pageSize.height,
          allowDisable: true,
        }); // Stretch to fit page
      }
    } catch (e) {
      console.warn("Failed to draw page background image:", e.message);
    }
  }
}

/**
 * Draw page decorations (borders, ornaments)
 */
function drawPageBorders(doc, page, pageSize, isRightPage) {
  if (!page.template && !page.borderStyle) return;

  const style = page.borderStyle || (page.templateData?.layout?.borderStyle) || "none";
  const color = page.borderColor || (page.templateData?.colors?.borderColor) || "#000000";
  const margin = 20;

  if (style === "minimal") {
    doc.rect(margin, margin, pageSize.width - margin * 2, pageSize.height - margin * 2)
        .lineWidth(0.5)
        .stroke(color);
  }
  else if (style === "organic" || style === "botanical") {
    // Double border
    doc.rect(margin, margin, pageSize.width - margin * 2, pageSize.height - margin * 2)
        .lineWidth(1)
        .stroke(color);
    doc.rect(margin + 5, margin + 5, pageSize.width - (margin + 5) * 2, pageSize.height - (margin + 5) * 2)
        .lineWidth(0.5)
        .stroke(color);
  }
  else if (style === "geometric") {
    // Thick bold border
    doc.rect(margin, margin, pageSize.width - margin * 2, pageSize.height - margin * 2)
        .lineWidth(4)
        .stroke(color);
  }
  else if (style === "filmstrip") {
    // Top and bottom bars
    doc.rect(0, 0, pageSize.width, 40).fill(color);
    doc.rect(0, pageSize.height - 40, pageSize.width, 40).fill(color);
  }
  else if (style === "typewriter" || style === "archive") {
    // Dashed border
    doc.rect(margin, margin, pageSize.width - margin * 2, pageSize.height - margin * 2)
        .lineWidth(1)
        .dash(5, {space: 5})
        .stroke(color)
        .undash();
  }
}

// ============================================
// PAGE CREATION FUNCTIONS
// ============================================

/**
 * Draw a vector leaf (fallback for emoji)
 */
function drawLeaf(doc, x, y, scale, angle, color) {
  doc.save();
  doc.translate(x, y);
  doc.rotate(angle);
  doc.scale(scale);

  // Simple leaf path
  doc.path("M0,0 C10,-10 25,-10 40,0 C25,10 10,10 0,0")
      .fillColor(color)
      .fill();

  // Vein
  doc.path("M0,0 Q20,0 38,0")
      .lineWidth(0.5)
      .strokeColor("white") // Light vein
      .stroke();

  doc.restore();
}

/**
 * Draw page decorations (corners, icons)
 */
function drawPageDecorations(doc, page, pageSize) {
  if (!page.template || !page.templateData?.decorations?.enabled) return;

  const elements = page.templateData.decorations.elements || [];
  const color = page.templateData.colors?.accentColor || "#2C5F2D";

  if (elements.length === 0) return;

  // Vintage Botanical Leaf Logic
  if (page.templateData.id === "botanical" || elements.includes("🌿")) {
    const size = 0.5; // Scale
    const margin = 20;

    // Top Left
    drawLeaf(doc, margin + 10, margin + 10, size, -45, color);
    // Top Right
    drawLeaf(doc, pageSize.width - margin - 10, margin + 10, size, 225, color); // Flip
    // Bottom Left
    drawLeaf(doc, margin + 10, pageSize.height - margin - 10, size, 45, color);
    // Bottom Right
    drawLeaf(doc, pageSize.width - margin - 10, pageSize.height - margin - 10, size, 135, color);
  }
  // Other templates (simple shapes)
  else if (elements.includes("◼") || elements.includes("◆")) {
    const margin = 20;
    const size = 5;
    doc.fillColor(color);
    // Corners
    doc.rect(margin, margin, size, size).fill();
    doc.rect(pageSize.width - margin - size, margin, size, size).fill();
    doc.rect(margin, pageSize.height - margin - size, size, size).fill();
    doc.rect(pageSize.width - margin - size, pageSize.height - margin - size, size, size).fill();
  }
}

/**
 * Create cover page
 */
async function createCoverPage(doc, bookData, pageSize, accessToken) {
  console.log("\n=== COVER PAGE ===");
  console.log("Cover Data:", {
    title: bookData.title,
    subtitle: bookData.coverSubtitle || bookData.cover?.subtitle,
    hasPhoto: !!(bookData.coverPhoto || bookData.cover?.photo),
  });

  const margins = getPageMargins(1, 0, pageSize, true);

  doc.addPage({size: [pageSize.width, pageSize.height], margin: 0});

  // 1. Background (Color/Image)
  const coverPageMock = {
    backgroundColor: bookData.coverBackground || bookData.cover?.backgroundColor || "#1a1a2e",
    backgroundImageData: bookData.coverBackgroundImageData || bookData.cover?.backgroundImageData || null,
    backgroundImageUrl: bookData.coverBackgroundImageUrl || bookData.cover?.backgroundImageUrl || null,
  };
  await drawPageBackground(doc, coverPageMock, pageSize, accessToken);

  // 2. Borders & Decorations
  // Construct a mock page object with template data to reuse drawing functions
  // We assume properties are top-level or in 'cover'
  const templateMock = {
    template: bookData.template || "custom",
    borderStyle: bookData.cover?.borderStyle || bookData.borderStyle,
    borderColor: bookData.cover?.borderColor || bookData.borderColor,
    templateData: {
      id: bookData.template,
      colors: {accentColor: bookData.cover?.borderColor || "#000000"},
      decorations: bookData.decorations || {enabled: false},
    },
  };

  // FORCE Botanical decorations if template ID matches (case-insensitive)
  if (String(bookData.template).toLowerCase().includes("botanical")) {
    console.log("  🌿 Enforcing Botanical Decorations");
    templateMock.templateData.decorations = {enabled: true, elements: ["🌿"]};
    templateMock.borderStyle = "organic";
  }

  drawPageBorders(doc, templateMock, pageSize, true);
  drawPageDecorations(doc, templateMock, pageSize);

  const content = getContentArea(pageSize, margins);

  // 3. Cover Photo
  // Robustly find the cover photo object
  let coverPhoto = bookData.coverPhoto || bookData.cover?.photo || null;

  // If explicitly passed as 'null' string or similar garbage
  if (coverPhoto === "null" || coverPhoto === "undefined") coverPhoto = null;

  let photoBottom = content.y;

  if (coverPhoto) {
    try {
      const maxHeight = content.height * 0.55; // 55% height max
      const imageData = await fetchImageForPrint(coverPhoto, accessToken, {
        x: content.x,
        y: content.y,
        width: content.width,
        height: maxHeight,
      });

      if (imageData.buffer) {
        const fit = calculateFitDimensions(imageData.width, imageData.height, content.width, maxHeight);
        // Center Horizontally
        const x = content.x + (content.width - fit.width) / 2;
        // Position at top of content area (or slightly down)
        const y = content.y + 20;

        // Draw border around photo if needed
        if (templateMock.borderStyle === "organic") {
          doc.rect(x - 3, y - 3, fit.width + 6, fit.height + 6).lineWidth(0.5).stroke(templateMock.borderColor || "#2C5F2D");
        }

        doc.image(imageData.buffer, x, y, {width: fit.width, height: fit.height});
        photoBottom = y + fit.height + 30; // Gap after photo
        console.log(`✓ Cover photo drawn: ${Math.round(imageData.effectiveDPI)} DPI`);
      }
    } catch (e) {
      console.warn("Could not load cover photo:", e.message);
    }
  } else {
    // If no photo, center text vertically more
    photoBottom = pageSize.height / 2 - 60;
  }

  // 4. Title
  const title = bookData.coverTitle || bookData.title || "My Photo Book";
  const titleColor = bookData.coverTextColor || "#ffffff";
  const titleSize = parseInt(bookData.coverTitleSize) || 36;
  const titleFont = bookData.coverTitleFont || "Times-Bold";

  const preparedTitle = preparePdfText(title, {latinFont: titleFont, hebrewFont: HEBREW_FONT_BOLD});

  doc
      .fontSize(titleSize)
      .font(preparedTitle.font)
      .fillColor(titleColor)
      .text(preparedTitle.text, content.x, photoBottom, {
        width: content.width,
        align: "center",
      });

  // 5. Subtitle
  const subtitle = bookData.coverSubtitle || bookData.cover?.subtitle || "";
  if (subtitle) {
    const subtitleSize = Math.max(12, titleSize * 0.5);
    const preparedSubtitle = preparePdfText(subtitle, {latinFont: titleFont, hebrewFont: HEBREW_FONT_REGULAR});

    doc
        .fontSize(subtitleSize)
        .font(preparedSubtitle.font)
        .fillColor(titleColor)
        .text(preparedSubtitle.text, content.x, doc.y + 15, {
          width: content.width,
          align: "center",
        });
  }
}

/**
 * Create chapter title page
 */
async function createChapterTitlePage(doc, chapter, pageSize, pageNumber, bookData) {
  console.log(`\n=== CHAPTER: ${chapter.name} (Page ${pageNumber}) ===`);

  const margins = getPageMargins(pageNumber, 0, pageSize);

  doc.addPage({size: [pageSize.width, pageSize.height], margin: 0});

  // Subtle background
  const chapterColor = chapter.color || "#8b5cf6";
  doc.rect(0, 0, pageSize.width, pageSize.height).fillColor(chapterColor, 0.08).fill();

  // Chapter name
  const centerY = pageSize.height / 2 - 50;

  const preparedName = preparePdfText(chapter.name, {latinFont: "Times-Bold", hebrewFont: HEBREW_FONT_BOLD});
  doc
      .fontSize(42)
      .font(preparedName.font)
      .fillColor(chapterColor)
      .text(preparedName.text, margins.left, centerY, {
        width: pageSize.width - margins.left - margins.right,
        align: "center",
      });

  // Subtitle
  if (chapter.subtitle) {
    const preparedSub = preparePdfText(chapter.subtitle, {latinFont: "Helvetica", hebrewFont: HEBREW_FONT_REGULAR});
    doc
        .fontSize(16)
        .font(preparedSub.font)
        .fillColor("#666666")
        .text(preparedSub.text, margins.left, centerY + 55, {
          width: pageSize.width - margins.left - margins.right,
          align: "center",
        });
  }

  // Photo count
  const photoCount = chapter.photoCount || chapter.photos?.length || 0;
  doc
      .fontSize(12)
      .font("Helvetica")
      .fillColor("#999999")
      .text(`${photoCount} photos`, margins.left, centerY + 85, {
        width: pageSize.width - margins.left - margins.right,
        align: "center",
      });
}

/**
 * Create content page from a single photo (Memory Director spread → individual pages)
 */
async function createContentPageFromPhoto(doc, photo, pageSize, accessToken, pageNumber, bookData, isRightPage) {
  console.log(`\n=== PAGE ${pageNumber} (${isRightPage ? "Right" : "Left"}) ===`);

  if (!photo) {
    console.log("No photo for this page");
    return {created: false};
  }

  const margins = getPageMargins(pageNumber, 0, pageSize, isRightPage);
  const content = getContentArea(pageSize, margins);

  doc.addPage({size: [pageSize.width, pageSize.height], margin: 0});

  // Background
  const bgColor = bookData.pageBackground || "#ffffff";
  doc.rect(0, 0, pageSize.width, pageSize.height).fillColor(bgColor).fill();

  // Photo slot
  const photoSlot = {
    width: content.width,
    height: content.height - 30, // Room for caption
  };

  console.log(
      `Slot: ${Math.round(photoSlot.width)}×${Math.round(photoSlot.height)}pt (${(photoSlot.width / POINTS_PER_INCH).toFixed(1)}" × ${(photoSlot.height / POINTS_PER_INCH).toFixed(1)}")`,
  );

  const imageData = await fetchImageForPrint(photo, accessToken, photoSlot);

  const result = {
    created: true,
    warning: imageData.warning,
    effectiveDPI: imageData.effectiveDPI,
  };

  if (imageData.buffer) {
    const fit = calculateFitDimensions(imageData.width, imageData.height, photoSlot.width, photoSlot.height);

    const x = content.x + (photoSlot.width - fit.width) / 2;
    const y = content.y + (photoSlot.height - fit.height) / 2;

    // Shadow
    doc.save();
    doc.fillColor("black", 0.1);
    doc.rect(x + 3, y + 3, fit.width, fit.height).fill();
    doc.restore();

    // Image
    doc.image(imageData.buffer, x, y, {width: fit.width, height: fit.height});

    console.log(`✓ Photo: ${fit.width.toFixed(0)}×${fit.height.toFixed(0)}pt at ${Math.round(imageData.effectiveDPI)} DPI`);

    // Caption
    if (photo.caption) {
      const preparedCaption = preparePdfText(photo.caption, {latinFont: "Times-Italic", hebrewFont: HEBREW_FONT_REGULAR});
      doc
          .fontSize(10)
          .font(preparedCaption.font)
          .fillColor("#666666")
          .text(preparedCaption.text, content.x, content.y + content.height - 20, {
            width: content.width,
            align: "center",
          });
    }
  } else {
    result.created = false;
  }

  // Page number
  doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#aaaaaa")
      .text(
          pageNumber.toString(),
      isRightPage ? pageSize.width - margins.right - 30 : margins.left,
      pageSize.height - 25,
      {width: 30, align: isRightPage ? "right" : "left"},
      );

  return result;
}

/**
 * Create back cover
 */
function createBackCoverPage(doc, bookData, pageSize, pageNumber) {
  console.log(`\n=== BACK COVER (Page ${pageNumber}) ===`);

  const margins = getPageMargins(pageNumber, pageNumber, pageSize, false);

  doc.addPage({size: [pageSize.width, pageSize.height], margin: 0});

  const bgColor = bookData.backCover?.backgroundColor || bookData.coverBackground || "#1a1a2e";
  doc.rect(0, 0, pageSize.width, pageSize.height).fillColor(bgColor).fill();

  const text = bookData.backCover?.text || "Made with love";
  const textColor = bookData.coverTextColor || "#ffffff";

  const preparedText = preparePdfText(text, {latinFont: "Helvetica", hebrewFont: HEBREW_FONT_REGULAR});
  doc
      .fontSize(12)
      .font(preparedText.font)
      .fillColor(textColor, 0.7)
      .text(preparedText.text, margins.left, pageSize.height - 80, {
        width: pageSize.width - margins.left - margins.right,
        align: "center",
      });
}

// ============================================
// MAIN PDF GENERATION
// ============================================

/**
 * Generate print-ready PDF from Memory Director data
 * Each spread becomes TWO separate pages
 */
async function generatePrintReadyPdfFromSpreads(userId, memoryDirectorData) {
  console.log("\n" + "=".repeat(70));
  console.log("PRINT-READY PDF GENERATION");
  console.log("=".repeat(70));

  const {story, spreads, settings} = memoryDirectorData;

  console.log(`Title: ${story?.title || "Untitled"}`);
  console.log(`Spreads: ${spreads?.length || 0}`);
  console.log(`Chapters: ${story?.chapters?.length || 0}`);
  console.log(`Format: ${settings?.pageFormat || "square-10x10"}`);

  // Get OAuth
  const oauth2Client = await auth.getOAuth2Client(userId);
  if (!oauth2Client) {
    throw new Error("User not authorized");
  }
  const accessToken = oauth2Client.credentials.access_token;

  // Page size
  const pageSize = getPageSizeForPrint(settings?.pageFormat || "square-10x10");
  console.log(`Page: ${pageSize.printWidth}" × ${pageSize.printHeight}"`);
  console.log(`Ideal photo: ${pageSize.printWidth * PRINT_DPI} × ${pageSize.printHeight * PRINT_DPI}px`);

  // Create PDF
  const doc = new PDFDocument({
    size: [pageSize.width, pageSize.height],
    margin: 0,
    autoFirstPage: false,
    compress: true,
    info: {
      Title: story?.title || "Photo Book",
      Author: "Shoso Photo Book Creator",
      Creator: "Memory Director",
    },
  });
  registerPdfFonts(doc);

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  // Book data
  const bookData = {
    title: story?.title || "My Photo Book",
    coverBackground: settings?.coverBackground || "#1a1a2e",
    coverTextColor: settings?.coverTextColor || "#ffffff",
    coverTitleSize: settings?.coverTitleSize || 36,
    coverTitleFont: settings?.coverTitleFont || "Times-Bold",
    coverSubtitle: story?.chapters?.[0]?.subtitle || "",
    coverPhoto: spreads?.[0]?.leftPhoto || null,
    pageBackground: settings?.pageBackground || "#ffffff",
    backCover: {
      text: settings?.backCoverText || "Created with Memory Director",
      backgroundColor: settings?.backCoverBackground || "#1a1a2e",
    },
  };

  const resolutionWarnings = [];
  let pageNumber = 1;

  // Cover
  await createCoverPage(doc, bookData, pageSize, accessToken);
  pageNumber++;

  // Chapters
  for (const chapter of story?.chapters || []) {
    // Chapter title
    await createChapterTitlePage(doc, chapter, pageSize, pageNumber, bookData);
    pageNumber++;

    // Spreads → Individual pages
    const chapterSpreads = (spreads || []).filter((s) => s.chapterId === chapter.id);

    for (const spread of chapterSpreads) {
      // Left page
      if (spread.leftPhoto) {
        const result = await createContentPageFromPhoto(
            doc,
            spread.leftPhoto,
            pageSize,
            accessToken,
            pageNumber,
            bookData,
            false,
        );
        if (result.warning) {
          resolutionWarnings.push({page: pageNumber, warning: result.warning, dpi: Math.round(result.effectiveDPI)});
        }
        pageNumber++;
      }

      // Right page
      if (spread.rightPhoto) {
        const result = await createContentPageFromPhoto(
            doc,
            spread.rightPhoto,
            pageSize,
            accessToken,
            pageNumber,
            bookData,
            true,
        );
        if (result.warning) {
          resolutionWarnings.push({page: pageNumber, warning: result.warning, dpi: Math.round(result.effectiveDPI)});
        }
        pageNumber++;
      }
    }
  }

  // Back cover
  createBackCoverPage(doc, bookData, pageSize, pageNumber);

  // Finalize
  const pdfBuffer = await new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });

  const pdfSizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(2);

  console.log("\n" + "=".repeat(70));
  console.log(`PDF COMPLETE: ${pdfSizeMB} MB, ${pageNumber} pages`);

  if (resolutionWarnings.length > 0) {
    console.log(`\nRESOLUTION WARNINGS (${resolutionWarnings.length}):`);
    resolutionWarnings.forEach((w) => console.log(`  Page ${w.page}: ${w.dpi} DPI`));
  }

  // Upload to Firebase Storage (avoids Google Drive virus-scan warning for large files)
  const fileName = `${bookData.title} - Print Ready.pdf`;
  let uploaded = null;
  try {
    uploaded = await uploadPdfToStorage(userId, fileName, pdfBuffer);
  } catch (e) {
    const msg = String(e?.message || e);
    // Some projects may not have Firebase Storage enabled (bucket missing).
    // Fall back to Drive upload (public link).
    if (msg.toLowerCase().includes("bucket") && msg.toLowerCase().includes("does not exist")) {
      console.warn("Storage bucket missing; falling back to Google Drive upload");
      uploaded = await uploadPdfToDrive(userId, fileName, pdfBuffer);
    } else {
      throw e;
    }
  }

  return {
    pdfId: uploaded.pdfId,
    pdfUrl: uploaded.pdfUrl,
    pdfDownloadUrl: uploaded.pdfDownloadUrl,
    storagePath: uploaded.storagePath,
    bucket: uploaded.bucket,
    pageCount: pageNumber,
    fileSizeMB: parseFloat(pdfSizeMB),
    resolutionWarnings: resolutionWarnings.length > 0 ? resolutionWarnings : null,
  };
}

/**
 * Generate print-ready PDF from traditional page data
 * (Backward compatible with existing generateBook flow)
 */
async function generatePrintReadyPdf(userId, bookData) {
  console.log("\n" + "=".repeat(70));
  console.log("PRINT-READY PDF (Traditional)");
  console.log("=".repeat(70));

  const oauth2Client = await auth.getOAuth2Client(userId);
  if (!oauth2Client) throw new Error("User not authorized");
  const accessToken = oauth2Client.credentials.access_token;

  const pageSize = getPageSizeForPrint(bookData.pageFormat || "square-10x10");

  const doc = new PDFDocument({
    size: [pageSize.width, pageSize.height],
    margin: 0,
    autoFirstPage: false,
    compress: true,
  });
  registerPdfFonts(doc);

  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  const resolutionWarnings = [];
  let pageNumber = 1;

  // Cover
  await createCoverPage(doc, bookData, pageSize, accessToken);
  pageNumber++;

  // Content pages
  const validPages = (bookData.pages || []).filter((page) => {
    // Keep pages that have content OR are part of the structure
    return true;
  });

  for (const page of validPages) {
    const isRightPage = pageNumber % 2 === 1;
    const margins = getPageMargins(pageNumber, 0, pageSize, isRightPage);

    doc.addPage({size: [pageSize.width, pageSize.height], margin: 0});

    // Background (Color or Image)
    await drawPageBackground(doc, page, pageSize, accessToken);

    // Decorations / Borders
    drawPageBorders(doc, page, pageSize, isRightPage);
    drawPageDecorations(doc, page, pageSize);

    const layout = page.layout || "single";
    const positions = getLayoutPositionsForPrint(layout, pageSize, margins, null);
    const photos = (page.photos || []).filter((p) => p && (p.baseUrl || p.editedImageData || p.thumbnailUrl));

    // Parallelize image fetching for this page
    const count = Math.min(photos.length, positions.length);
    const imagePromises = [];

    for (let i = 0; i < count; i++) {
      imagePromises.push(fetchImageForPrint(photos[i], accessToken, positions[i]).then((result) => ({
        result, index: i, position: positions[i],
      })));
    }

    // Wait for all images for this page
    const fetchedImages = await Promise.all(imagePromises);

    for (const item of fetchedImages) {
      const {result: imageData, index, position} = item;

      if (imageData.warning) {
        resolutionWarnings.push({
          page: pageNumber,
          photoIndex: index,
          warning: imageData.warning,
          dpi: Math.round(imageData.effectiveDPI),
        });
      }

      if (imageData.buffer) {
        const fit = calculateFitDimensions(imageData.width, imageData.height, position.width, position.height);
        const x = position.x + (position.width - fit.width) / 2;
        const y = position.y + (position.height - fit.height) / 2;

        try {
          doc.image(imageData.buffer, x, y, {width: fit.width, height: fit.height});
        } catch (err) {
          console.error(`Failed to draw photo on page ${pageNumber}:`, err);
        }
      }
    }

    // Page number
    doc
        .fontSize(9)
        .font("Helvetica")
        .fillColor("#aaa")
        .text(pageNumber.toString(), isRightPage ? pageSize.width - 50 : 20, pageSize.height - 25);

    pageNumber++;
  }

  // Back cover
  createBackCoverPage(doc, bookData, pageSize, pageNumber);

  const pdfBuffer = await new Promise((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.end();
  });

  // Upload to Firebase Storage
  const fileName = `${bookData.title || "Photo Book"}.pdf`;
  let uploaded = null;
  try {
    uploaded = await uploadPdfToStorage(userId, fileName, pdfBuffer);
  } catch (e) {
    const msg = String(e?.message || e);
    if (msg.toLowerCase().includes("bucket") && msg.toLowerCase().includes("does not exist")) {
      console.warn("Storage bucket missing; falling back to Google Drive upload");
      uploaded = await uploadPdfToDrive(userId, fileName, pdfBuffer);
    } else {
      throw e;
    }
  }

  return {
    pdfId: uploaded.pdfId,
    pdfUrl: uploaded.pdfUrl,
    pdfDownloadUrl: uploaded.pdfDownloadUrl,
    storagePath: uploaded.storagePath,
    bucket: uploaded.bucket,
    pageCount: pageNumber,
    fileSizeMB: parseFloat((pdfBuffer.length / 1024 / 1024).toFixed(2)),
    resolutionWarnings: resolutionWarnings.length > 0 ? resolutionWarnings : null,
  };
}

module.exports = {
  generatePrintReadyPdfFromSpreads,
  generatePrintReadyPdf,
  generateBookpodCoverPdf,
  getPageSizeForPrint,
  getPageMargins,
  calculateEffectiveDPI,
  PRINT_DPI,
  MIN_DPI_WARNING,
  MIN_DPI_REJECT,
  getRequiredPixels,
  BLEED_POINTS,
  BINDING_MARGIN_POINTS,
};


