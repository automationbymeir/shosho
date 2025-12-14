const PDFDocument = require("pdfkit");
const path = require("path");
const {google} = require("googleapis");
const fetch = require("node-fetch");
const auth = require("./auth");

/**
 * ============================================
 * HELPER FUNCTIONS
 * ============================================
 */

/**
 * Get page size configuration
 * @param {string} format - Page format identifier
 * @return {Object} Width and height in points
 */
function getPageSize(format) {
  const sizes = {
    "square-8x8": {width: 576, height: 576},
    "square-10x10": {width: 720, height: 720},
    "square-12x12": {width: 864, height: 864},
    "landscape-11x8.5": {width: 792, height: 612},
    "landscape-13x10": {width: 936, height: 720},
    "portrait-8.5x11": {width: 612, height: 792},
    "portrait-10x13": {width: 720, height: 936},
  };
  return sizes[format] || sizes["square-8x8"];
}

// (hexToRgb removed — we now pass hex directly to PDFKit)

// ============================================
// TEXT / FONTS (Hebrew support)
// ============================================

const HEBREW_FONT_REGULAR = "Alef";
const HEBREW_FONT_BOLD = "Alef-Bold";
const HEBREW_FONT_REGULAR_PATH = path.join(__dirname, "..", "assets", "fonts", "Alef-Regular.ttf");
const HEBREW_FONT_BOLD_PATH = path.join(__dirname, "..", "assets", "fonts", "Alef-Bold.ttf");

/**
 * Register fonts used by the PDF generator.
 * @param {PDFDocument} doc - PDF document
 */
function registerPdfFonts(doc) {
  try {
    doc.registerFont(HEBREW_FONT_REGULAR, HEBREW_FONT_REGULAR_PATH);
    doc.registerFont(HEBREW_FONT_BOLD, HEBREW_FONT_BOLD_PATH);
  } catch (e) {
    // If font files are missing for any reason, fall back to built-in fonts.
    console.warn("Hebrew fonts not available, falling back to built-in fonts:", e?.message || e);
  }
}

/**
 * Detect Hebrew characters.
 * @param {string} text
 * @return {boolean}
 */
function containsHebrew(text) {
  if (!text || typeof text !== "string") return false;
  return /[\u0590-\u05FF]/.test(text);
}

/**
 * Reverse text for basic RTL rendering in PDFKit (which is LTR-only).
 * Uses grapheme segmentation when available.
 * @param {string} text
 * @return {string}
 */
function rtlize(text) {
  if (!text || typeof text !== "string") return text;
  let parts;
  try {
    if (typeof Intl !== "undefined" && Intl.Segmenter) {
      const seg = new Intl.Segmenter("he", {granularity: "grapheme"});
      parts = Array.from(seg.segment(text), (s) => s.segment);
    } else {
      parts = Array.from(text);
    }
  } catch (e) {
    parts = Array.from(text);
  }
  // RLM + reversed graphemes
  return "\u200F" + parts.reverse().join("");
}

/**
 * Pick font + transform text for PDF.
 * @param {string} text
 * @param {{latinFont: string, hebrewFont: string}} fonts
 * @return {{text: string, font: string, isHebrew: boolean}}
 */
function preparePdfText(text, fonts) {
  const isHeb = containsHebrew(text);
  if (!isHeb) return {text, font: fonts.latinFont, isHebrew: false};
  return {text: rtlize(text), font: fonts.hebrewFont, isHebrew: true};
}

/**
 * Get active template/theme data from page or book
 * @param {Object} page - Page data (optional)
 * @param {Object} bookData - Book data
 * @return {Object} Active template/theme data
 */
function getActiveDesignData(page, bookData) {
  // Priority 1: Page-level templateData
  if (page && page.templateData && typeof page.templateData === "object") {
    console.log("getActiveDesignData: Using page.templateData");
    return {
      source: "page.templateData",
      data: page.templateData,
      page: page, // Passing page for context
    };
  }

  // Priority 2: Book-level templateData
  if (bookData.templateData && typeof bookData.templateData === "object") {
    console.log("getActiveDesignData: Using bookData.templateData");
    return {
      source: "bookData.templateData",
      data: bookData.templateData,
      page: page, // Passing page for context (if available)
    };
  }

  // Priority 3: Page-level themeData (legacy)
  if (page && page.themeData && typeof page.themeData === "object") {
    return {
      source: "page.themeData",
      data: page.themeData,
      page: page,
    };
  }

  // Priority 4: Book-level themeData (legacy)
  if (bookData.themeData && typeof bookData.themeData === "object") {
    console.log("getActiveDesignData: Using bookData.themeData");
    return {
      source: "bookData.themeData",
      data: bookData.themeData,
      page: page,
    };
  }

  console.log("getActiveDesignData: No design data found");

  return {
    source: "none",
    data: null,
    page: page,
  };
}

/**
 * Get background color with proper fallback chain
 * @param {Object} page - Page data (optional)
 * @param {Object} designData - Active design data
 * @param {Object} bookData - Book data
 * @return {string} Hex color
 */
function getBackgroundColor(page, designData, bookData) {
  // Priority 1: Page-specific backgroundColor
  if (page && page.backgroundColor) {
    console.log(`getBackgroundColor: Using page.backgroundColor (${page.backgroundColor})`);
    return page.backgroundColor;
  }

  // Priority 2: Design data colors
  if (designData && designData.data) {
    const colors = designData.data.colors;
    if (colors) {
      if (colors.pageBackground) return colors.pageBackground;
      if (colors.bg) return colors.bg;
    }
  }

  // Priority 3: Cover-specific (for cover page)
  if (bookData.coverBackground) {
    console.log(`getBackgroundColor: Using bookData.coverBackground (${bookData.coverBackground})`);
    return bookData.coverBackground;
  }

  console.log("getBackgroundColor: Using default (#ffffff)");

  // Default
  return "#ffffff";
}

/**
 * Get text color with proper fallback chain
 * @param {Object} page - Page data (optional)
 * @param {Object} designData - Active design data
 * @return {string} Hex color
 */
function getTextColor(page, designData) {
  // Priority 1: Page themeColors
  if (page && page.themeColors && page.themeColors.textColor) {
    return page.themeColors.textColor;
  }
  if (page && page.themeColors && page.themeColors.text) {
    return page.themeColors.text;
  }

  // Priority 2: Design data colors
  if (designData && designData.data) {
    const colors = designData.data.colors;
    if (colors) {
      if (colors.textColor) return colors.textColor;
      if (colors.text) return colors.text;
      if (colors.primary) return colors.primary;
    }
  }

  return "#333333";
}

/**
 * Get decorations array from design data
 * @param {Object} designData - Active design data
 * @return {Array} Decorations array
 */
function getDecorations(designData) {
  if (!designData || !designData.data) {
    return [];
  }

  const decorations = designData.data.decorations;

  // Handle new template structure: decorations.elements
  if (decorations && decorations.elements && Array.isArray(decorations.elements)) {
    return decorations.elements;
  }

  // Handle legacy structure: decorations as array
  if (Array.isArray(decorations)) {
    return decorations;
  }

  // Handle page-level themeDecorations (legacy)
  return [];
}

/**
 * ============================================
 * IMAGE HANDLING
 * ============================================
 */

/**
 * Fetch image as buffer from Google Photos or data URL
 * Priority: editedImageData > editedData > thumbnailUrl > Google Photos (=d)
 * But: never return a raster that would require upscaling for the target print size.
 * @param {Object} photo - Photo object
 * @param {string} accessToken - OAuth access token
 * @param {Object=} requirements - Minimum pixel dimensions to avoid upscaling
 * @param {number=} requirements.minWidthPx - Minimum width in pixels
 * @param {number=} requirements.minHeightPx - Minimum height in pixels
 * @return {Promise<Buffer|null>} Image buffer or null
 */
async function fetchImageAsBuffer(photo, accessToken, requirements = {}) {
  const minWidthPx = Math.max(0, Math.floor(requirements.minWidthPx || 0));
  const minHeightPx = Math.max(0, Math.floor(requirements.minHeightPx || 0));

  const meetsMinPixels = (buffer, label) => {
    try {
      if (!minWidthPx && !minHeightPx) return true;
      const sizeOf = require("image-size").default || require("image-size");
      const dim = sizeOf(buffer);
      const ok = (minWidthPx ? dim.width >= minWidthPx : true) &&
        (minHeightPx ? dim.height >= minHeightPx : true);
      if (!ok) {
        console.log(
            `⚠ ${label} too small: ${dim.width}x${dim.height}px (need >= ${minWidthPx}x${minHeightPx})`,
        );
      }
      return ok;
    } catch (e) {
      // If we can't measure, don't block.
      return true;
    }
  };

  // Priority 1: Edited image data (from design editor)
  if (photo.editedImageData && photo.editedImageData.startsWith("data:")) {
    const base64Data = photo.editedImageData.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    console.log(`✓ Using editedImageData: ${buffer.length} bytes`);
    if (meetsMinPixels(buffer, "editedImageData")) return buffer;
    console.log("↪ Falling back to original image to avoid resolution loss.");
  }

  // Priority 2: Other edited data
  if (photo.editedData && photo.editedData.startsWith("data:")) {
    const base64Data = photo.editedData.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    console.log(`✓ Using editedData: ${buffer.length} bytes`);
    if (meetsMinPixels(buffer, "editedData")) return buffer;
    console.log("↪ Falling back to original image to avoid resolution loss.");
  }

  // Priority 3: Thumbnail data URL (fallback only)
  if (photo.thumbnailUrl && photo.thumbnailUrl.startsWith("data:")) {
    const base64Data = photo.thumbnailUrl.split(",")[1];
    const buffer = Buffer.from(base64Data, "base64");
    console.log(`⚠ Using thumbnailUrl (low res): ${buffer.length} bytes`);
    if (meetsMinPixels(buffer, "thumbnailUrl")) return buffer;
    console.log("↪ Falling back to original image to avoid resolution loss.");
  }

  // Priority 4: Fetch from Google Photos at MAXIMUM resolution
  const baseUrl = photo.baseUrl || photo.fullUrl;
  if (!baseUrl) {
    console.log("✗ No URL available for photo");
    return null;
  }

  const stripParams = (u) => (u.includes("=") ? u.split("=")[0] : u);
  const base = stripParams(baseUrl);

  // If a minimum is required, request at least that size (capped) to avoid upscaling.
  const targetPx = Math.max(minWidthPx, minHeightPx, 0);
  const cappedTargetPx = Math.min(Math.max(targetPx, 0), 8192);

  const urlD = base + "=d";
  const urlSized = cappedTargetPx > 0 ? (base + `=w${cappedTargetPx}-h${cappedTargetPx}`) : null;

  try {
    // Try original (=d) first
    const response = await fetch(urlD, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (response.ok) {
      const buffer = await response.buffer();
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`✓ Fetched original from Google Photos: ${buffer.length} bytes (${sizeMB} MB)`);
      if (meetsMinPixels(buffer, "googlePhotos(=d)")) return buffer;
      if (!urlSized) return buffer;
      console.log("⚠ Original fetched but below minimum; retrying sized fetch...");
    } else {
      if (!urlSized) {
        console.log(`✗ =d failed (${response.status}) and no sized request needed`);
        return null;
      }
      console.log(`⚠ =d failed (${response.status}), trying sized fetch...`);
    }

    // Sized fetch (requested minimum, capped)
    const sizedResponse = await fetch(urlSized, {
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });
    if (sizedResponse.ok) {
      const buffer = await sizedResponse.buffer();
      const sizeMB = (buffer.length / 1024 / 1024).toFixed(2);
      console.log(`✓ Fetched sized image: ${buffer.length} bytes (${sizeMB} MB)`);
      return buffer;
    }

    console.log(`✗ Sized fetch failed: ${sizedResponse.status}`);
    return null;
  } catch (error) {
    console.log(`✗ Error fetching image: ${error.message}`);
    return null;
  }
}

/**
 * Convert PDF points to pixels at target DPI.
 * @param {number} points
 * @param {number} dpi
 * @return {number}
 */
function pointsToPixels(points, dpi) {
  return Math.ceil((points / 72) * dpi);
}

/**
 * Calculate image dimensions that fit within bounds while preserving aspect ratio
 * @param {number} imageWidth - Original image width
 * @param {number} imageHeight - Original image height
 * @param {number} maxWidth - Maximum allowed width
 * @param {number} maxHeight - Maximum allowed height
 * @return {Object} Final width and height
 */
function calculateFitDimensions(imageWidth, imageHeight, maxWidth, maxHeight) {
  const imageAspectRatio = imageWidth / imageHeight;
  const containerAspectRatio = maxWidth / maxHeight;

  let finalWidth;
  let finalHeight;

  if (imageAspectRatio > containerAspectRatio) {
    finalWidth = maxWidth;
    finalHeight = maxWidth / imageAspectRatio;
  } else {
    finalHeight = maxHeight;
    finalWidth = maxHeight * imageAspectRatio;
  }

  return {
    width: Math.max(1, finalWidth),
    height: Math.max(1, finalHeight),
  };
}

/**
 * ============================================
 * LAYOUT POSITIONS
 * ============================================
 */

/**
 * Get layout positions for photos on a page
 * Uses template layout settings if available
 * @param {string} layout - Layout type
 * @param {Object} pageSize - Page dimensions
 * @param {Object} designData - Active design data (optional)
 * @return {Array} Array of position objects
 */
function getLayoutPositions(layout, pageSize, designData) {
  // Get margin and spacing from template with proper defaults
  let margin = 60;
  let gap = 20;

  if (designData && designData.data && designData.data.layout) {
    margin = designData.data.layout.pageMargin || margin;
    gap = designData.data.layout.photoSpacing || gap;
  }

  console.log(`Layout positions: margin=${margin}, gap=${gap} (from ${designData ? "template" : "defaults"})`);

  const w = pageSize.width;
  const h = pageSize.height;
  const contentW = w - (margin * 2);
  const contentH = h - (margin * 2);

  const layouts = {
    "single": [
      {x: margin, y: margin, width: contentW, height: contentH},
    ],
    "two-horizontal": [
      {x: margin, y: margin, width: (contentW - gap) / 2, height: contentH},
      {
        x: margin + (contentW - gap) / 2 + gap,
        y: margin,
        width: (contentW - gap) / 2,
        height: contentH,
      },
    ],
    "two-vertical": [
      {x: margin, y: margin, width: contentW, height: (contentH - gap) / 2},
      {
        x: margin,
        y: margin + (contentH - gap) / 2 + gap,
        width: contentW,
        height: (contentH - gap) / 2,
      },
    ],
    "three-left": [
      {x: margin, y: margin, width: (contentW - gap) * 0.6, height: contentH},
      {
        x: margin + (contentW - gap) * 0.6 + gap,
        y: margin,
        width: (contentW - gap) * 0.4,
        height: (contentH - gap) / 2,
      },
      {
        x: margin + (contentW - gap) * 0.6 + gap,
        y: margin + (contentH - gap) / 2 + gap,
        width: (contentW - gap) * 0.4,
        height: (contentH - gap) / 2,
      },
    ],
    "three-right": [
      {x: margin, y: margin, width: (contentW - gap) * 0.4, height: (contentH - gap) / 2},
      {
        x: margin,
        y: margin + (contentH - gap) / 2 + gap,
        width: (contentW - gap) * 0.4,
        height: (contentH - gap) / 2,
      },
      {
        x: margin + (contentW - gap) * 0.4 + gap,
        y: margin,
        width: (contentW - gap) * 0.6,
        height: contentH,
      },
    ],
    "four-grid": [
      {x: margin, y: margin, width: (contentW - gap) / 2, height: (contentH - gap) / 2},
      {
        x: margin + (contentW - gap) / 2 + gap,
        y: margin,
        width: (contentW - gap) / 2,
        height: (contentH - gap) / 2,
      },
      {
        x: margin,
        y: margin + (contentH - gap) / 2 + gap,
        width: (contentW - gap) / 2,
        height: (contentH - gap) / 2,
      },
      {
        x: margin + (contentW - gap) / 2 + gap,
        y: margin + (contentH - gap) / 2 + gap,
        width: (contentW - gap) / 2,
        height: (contentH - gap) / 2,
      },
    ],
    "collage-5": [
      {x: margin, y: margin, width: (contentW - gap) * 0.6, height: (contentH - gap) * 0.6},
      {
        x: margin + (contentW - gap) * 0.6 + gap,
        y: margin,
        width: (contentW - gap) * 0.4,
        height: (contentH - gap) * 0.6,
      },
      {
        x: margin,
        y: margin + (contentH - gap) * 0.6 + gap,
        width: (contentW - gap) / 3,
        height: (contentH - gap) * 0.4,
      },
      {
        x: margin + (contentW - gap) / 3 + gap,
        y: margin + (contentH - gap) * 0.6 + gap,
        width: (contentW - gap) / 3,
        height: (contentH - gap) * 0.4,
      },
      {
        x: margin + ((contentW - gap) / 3 + gap) * 2,
        y: margin + (contentH - gap) * 0.6 + gap,
        width: (contentW - gap) / 3,
        height: (contentH - gap) * 0.4,
      },
    ],
    "collage-6": [
      {x: margin, y: margin, width: (contentW - gap) / 3, height: (contentH - gap) / 2},
      {
        x: margin + (contentW - gap) / 3 + gap,
        y: margin,
        width: (contentW - gap) / 3,
        height: (contentH - gap) / 2,
      },
      {
        x: margin + ((contentW - gap) / 3 + gap) * 2,
        y: margin,
        width: (contentW - gap) / 3,
        height: (contentH - gap) / 2,
      },
      {
        x: margin,
        y: margin + (contentH - gap) / 2 + gap,
        width: (contentW - gap) / 3,
        height: (contentH - gap) / 2,
      },
      {
        x: margin + (contentW - gap) / 3 + gap,
        y: margin + (contentH - gap) / 2 + gap,
        width: (contentW - gap) / 3,
        height: (contentH - gap) / 2,
      },
      {
        x: margin + ((contentW - gap) / 3 + gap) * 2,
        y: margin + (contentH - gap) / 2 + gap,
        width: (contentW - gap) / 3,
        height: (contentH - gap) / 2,
      },
    ],
  };

  return layouts[layout] || layouts["single"];
}

/**
 * ============================================
 * DECORATIONS
 * ============================================
 */

/**
 * Draw decorations on a page
 * Supports varying shapes for known emojis to avoid PDF font issues
 * @param {PDFDocument} doc - PDF document
 * @param {Object} pageSize - Page dimensions
 * @param {Object} designData - Active design data
 */
/**
 * Draw sophisticated theme background
 * @param {PDFDocument} doc - PDF document
 * @param {Object} pageSize - Page dimensions
 * @param {Object} designData - Active design data
 * @param {Object} bookData - Book data (for cover/back overrides)
 * @param {string} type - Page type (cover, content, back)
 */
function drawThemeBackground(doc, pageSize, designData, bookData, type = "content") {
  const w = pageSize.width;
  const h = pageSize.height;

  // IMPORTANT:
  // PDFKit fill opacity can "stick" and affect later drawing (including images).
  // Always isolate background drawing in a saved graphics state.
  doc.save();

  // 1. Base Background Color
  let bgColor = "#ffffff";
  if (type === "cover" && bookData.coverBackground) {
    bgColor = bookData.coverBackground;
    console.log(`drawThemeBackground: Using cover background: ${bgColor}`);
  } else if (type === "back" && bookData.backCover?.backgroundColor) {
    bgColor = bookData.backCover.backgroundColor;
    console.log(`drawThemeBackground: Using back cover background: ${bgColor}`);
  } else {
    // Priority 1: Page-specific backgroundColor (user-selected color)
    if (designData.page && designData.page.backgroundColor) {
      bgColor = designData.page.backgroundColor;
      console.log(`drawThemeBackground: Using page.backgroundColor: ${bgColor}`);
    } else if (designData.data && designData.data.colors) {
      // Priority 2: Template/theme colors
      bgColor = designData.data.colors.pageBackground ||
        designData.data.colors.bg ||
        "#ffffff";
      if (!designData.data.colors.pageBackground && designData.data.colors.background) {
        bgColor = designData.data.colors.background;
      }
      console.log(`drawThemeBackground: Using template/theme background: ${bgColor}`);
    } else {
      bgColor = "#ffffff";
      console.log(`drawThemeBackground: Using default background: ${bgColor}`);
    }
  }

  // Fill base color
  doc.rect(0, 0, w, h)
      .fillColor(bgColor)
      .fill();

  // 2. Texture / Pattern Overlay (Papier Aesthetic)
  // Subtle grain or paper texture effect
  doc.save();
  // We can simulate texture with very light noise or pattern if needed,
  // but for now let's focus on the theme-specific vector backgrounds.

  // 3. Theme Specific Backgrounds
  // "Modern" - often has geometric split backgrounds
  // "Botanical" - organic curves
  // "Classic" - borders

  const themeName = (designData.data && designData.data.id) || "custom";
  const colors = (designData.data && designData.data.colors) || {};

  const accentHex = colors.accentColor || colors.accent || colors.primary || "#97BC62";
  const secondaryHex = colors.secondary || colors.borderColor || colors.textColor || "#777777";

  if (themeName.includes("modern") || themeName.includes("geometric")) {
    // Geometric flair
    doc.save();
    doc.moveTo(0, h)
        .lineTo(w, h * 0.7)
        .lineTo(w, h)
        .fillColor(accentHex, 0.1)
        .fill();
    doc.restore();

    doc.save();
    doc.moveTo(0, 0)
        .lineTo(w * 0.3, 0)
        .lineTo(0, h * 0.2)
        .fillColor(secondaryHex, 0.05)
        .fill();
    doc.restore();
  } else if (themeName.includes("botanical") || themeName.includes("nature")) {
    // Organic bottom curve
    doc.save();
    doc.path(`M 0 ${h} L 0 ${h - 100} Q ${w / 4} ${h - 150} ${w / 2} ${h - 100} T ${w} ${h - 80} L ${w} ${h} Z`)
        .fillColor(accentHex, 0.08)
        .fill();
    doc.restore();
  }

  doc.restore(); // restore initial background save()
}

/**
 * Draw decorations on a page with advanced vector graphics
 * @param {PDFDocument} doc - PDF document
 * @param {Object} pageSize - Page dimensions
 * @param {Object} designData - Active design data
 */
function drawDecorations(doc, pageSize, designData) {
  if (!designData || !designData.data) {
    return;
  }

  const decorations = getDecorations(designData);
  // Default to something if array is empty but we have a theme
  const themeDecorations = decorations.length > 0 ? decorations : [];

  const colors = designData.data.colors || {};
  const decorationColor = colors.accentColor || colors.secondary || colors.primary || "#97BC62";
  const decoOpacity = 0.15;

  console.log(`Drawing decorations with color ${decorationColor}`);

  // Draw Corner Elements (Classic / Elegant)
  // If we have specific emoji/text decorations, we use them as vector approximations
  // If not, we might draw generalized theme elements

  const margin = 40;
  const size = 40;
  const w = pageSize.width;
  const h = pageSize.height;

  themeDecorations.slice(0, 4).forEach((decoration, index) => {
    doc.save();
    doc.fillColor(decorationColor, decoOpacity);

    // Position logic
    let x; let y; let rotation;
    if (index === 0) {
      x = margin; y = margin; rotation = 0;
    } else if (index === 1) {
      x = w - margin; y = margin; rotation = 90;
    } else if (index === 2) {
      x = margin; y = h - margin; rotation = -90;
    } else {
      x = w - margin; y = h - margin; rotation = 180;
    }

    doc.translate(x, y);
    doc.rotate(rotation);

    if (decoration === "◆" || decoration.includes("diamond")) {
      // Art Deco Diamond path
      doc.path(`M 0 ${-size} L ${size * 0.6} 0 L 0 ${size} L ${-size * 0.6} 0 Z`).fill();
    } else if (decoration === "🌿" || decoration.includes("leaf")) {
      // Elegant Leaf
      doc.path(`M 0 ${size} C ${size} ${size} ${size} ${-size / 2} 0 ${-size} ` +
        `C ${-size} ${-size / 2} ${-size} ${size} 0 ${size} Z`).fill();
      // vein
      doc.moveTo(0, size).lineTo(0, -size).strokeColor(decorationColor, decoOpacity).lineWidth(1).stroke();
    } else if (decoration === "●" || decoration.includes("circle")) {
      // Minimalist Dot
      doc.circle(0, 0, size / 2).fill();
    } else if (decoration === "◼" || decoration.includes("square")) {
      // Bauhaus Square
      doc.rect(-size / 2, -size / 2, size, size).fill();
    } else if (decoration.length > 2) {
      // Assume it might be a text-based decoration we can't render well as vector,
      // fallback to simple geometric shape to avoid font issues
      doc.circle(0, 0, size / 3).fill();
    }

    doc.restore();
  });

  // 4. Elegant Frame (if specific themes)
  if (designData.data.id === "classic" || designData.data.id === "vintage") {
    doc.save();
    doc.rect(20, 20, w - 40, h - 40)
        .lineWidth(1)
        .strokeColor(decorationColor, decoOpacity)
        .stroke();
    doc.rect(25, 25, w - 50, h - 50)
        .lineWidth(0.5)
        .strokeColor(decorationColor, decoOpacity)
        .stroke();
    doc.restore();
  }
}

/**
 * ============================================
 * PAGE CREATION
 * ============================================
 */

/**
 * Create cover page
 * @param {PDFDocument} doc - PDF document
 * @param {Object} bookData - Book data
 * @param {Object} pageSize - Page dimensions
 * @param {string} accessToken - OAuth access token
 */
async function createCoverPage(doc, bookData, pageSize, accessToken) {
  console.log("\n=== CREATING COVER PAGE ===");

  const designData = getActiveDesignData(null, bookData);

  // Add page
  doc.addPage({size: [pageSize.width, pageSize.height], margin: 0});

  // Draw sophisticated background
  drawThemeBackground(doc, pageSize, designData, bookData, "cover");

  // Draw decorations
  drawDecorations(doc, pageSize, designData);

  // Get layout settings from template with proper defaults
  let margin = 60;
  if (designData.data && designData.data.layout) {
    margin = designData.data.layout.pageMargin || margin;
  }

  const maxWidth = pageSize.width - (margin * 2);
  const maxHeight = pageSize.height - (margin * 2);

  // Add cover photo if available
  const coverPhoto = bookData.coverPhoto || bookData.cover?.photo;
  let photoBottom = 0;

  if (coverPhoto) {
    console.log("Loading cover photo...");
    // Resolution guard: request enough pixels for print-quality (300 DPI) to avoid upscaling.
    const dpi = 300;
    const neededW = pointsToPixels(maxWidth, dpi);
    const neededH = pointsToPixels(maxHeight * 0.55, dpi);
    const imageBuffer = await fetchImageAsBuffer(coverPhoto, accessToken, {
      minWidthPx: Math.ceil(neededW * 1.1),
      minHeightPx: Math.ceil(neededH * 1.1),
    });
    if (imageBuffer) {
      try {
        const sizeOf = require("image-size").default || require("image-size");
        const dimensions = sizeOf(imageBuffer);

        // Use 55% of page height to leave room for title
        const photoHeight = maxHeight * 0.55;
        const photoWidth = maxWidth;

        // Resolution validation: cover image must not be upscaled in the PDF.
        // Our cover photo target area is `photoWidth x photoHeight`.
        const requiredW = pointsToPixels(photoWidth, dpi);
        const requiredH = pointsToPixels(photoHeight, dpi);
        const upscaleX = requiredW / dimensions.width;
        const upscaleY = requiredH / dimensions.height;
        const upscale = Math.max(upscaleX, upscaleY);
        if (upscale > 1.01) {
          throw new Error(
              `Cover photo resolution too low: need ~${requiredW}x${requiredH}px but got ` +
              `${dimensions.width}x${dimensions.height}px (upscale x${upscale.toFixed(2)}).`,
          );
        }

        const fit = calculateFitDimensions(dimensions.width, dimensions.height, photoWidth, photoHeight);
        const x = margin + (maxWidth - fit.width) / 2;
        const y = margin + 20; // Slight top padding

        // Shadow (draw separately to avoid leaking opacity into the image)
        doc.save();
        doc.fillColor("black", 0.2);
        doc.rect(x + 4, y + 4, fit.width, fit.height).fill();
        doc.restore();

        // Image (must be fully opaque)
        doc.image(imageBuffer, x, y, {
          width: fit.width,
          height: fit.height,
        });

        // Frame
        doc.save();
        doc.rect(x, y, fit.width, fit.height)
            .lineWidth(1)
            .strokeColor("#333333", 0.1)
            .stroke();
        doc.restore();

        photoBottom = y + fit.height;
      } catch (error) {
        console.log(`Error placing cover photo: ${error.message}`);
      }
    }
  }

  // Add title
  const titleText = bookData.title || bookData.cover?.title || "My Photo Book";
  if (titleText) {
    const titleColor = bookData.coverTextColor || "#333333";
    const titleSize = bookData.coverTitleSize || 36;
    const preparedTitle = preparePdfText(titleText, {
      latinFont: "Times-Bold",
      hebrewFont: HEBREW_FONT_BOLD,
    });

    // Calculate title position - below photo
    let titleY = photoBottom > 0 ? photoBottom + 40 : (pageSize.height - titleSize) / 2;

    // Ensure title fits
    if (titleY > pageSize.height - margin - 100) {
      titleY = pageSize.height - margin - 100;
    }

    // Add Elegant Title
    doc.save();
    doc.fontSize(titleSize)
        .font(preparedTitle.font)
        .fillColor(titleColor)
        .text(preparedTitle.text, margin, titleY, {
          width: maxWidth,
          align: "center",
          lineBreak: true,
          ellipsis: true,
          height: titleSize * 2, // Limit height to prevent page break
        });
    doc.restore();

    // Add subtitle
    if (bookData.coverSubtitle || bookData.cover?.subtitle) {
      const subtitle = bookData.coverSubtitle || bookData.cover?.subtitle;
      const subtitleY = titleY + titleSize + 15;
      const preparedSubtitle = preparePdfText(subtitle, {
        latinFont: "Helvetica",
        hebrewFont: HEBREW_FONT_REGULAR,
      });

      doc.fontSize(14)
          .font(preparedSubtitle.font)
          .fillColor("#666666")
          .text(preparedSubtitle.text, margin, subtitleY, {
            width: maxWidth,
            align: "center",
            characterSpacing: 2,
            height: 20,
          });
    }
  }

  console.log("✓ Cover page completed");
}

/**
 * Create content page
 * @param {PDFDocument} doc - PDF document
 * @param {Object} page - Page data
 * @param {Object} pageSize - Page dimensions
 * @param {string} accessToken - OAuth access token
 * @param {number} pageNumber - Page number
 * @param {Object} bookData - Book data
 */
async function createContentPage(doc, page, pageSize, accessToken, pageNumber, bookData) {
  console.log(`\n=== CREATING CONTENT PAGE ${pageNumber} ===`);
  console.log(`Page backgroundColor: ${page.backgroundColor || "none"}`);

  const designData = getActiveDesignData(page, bookData);
  console.log(`Design data source: ${designData.source}`);
  if (designData.page) {
    console.log(`Design data page backgroundColor: ${designData.page.backgroundColor || "none"}`);
  }

  // Add page
  doc.addPage({size: [pageSize.width, pageSize.height], margin: 0});

  // Draw sophisticated background
  drawThemeBackground(doc, pageSize, designData, bookData, "content");

  // Draw decorations
  drawDecorations(doc, pageSize, designData);

  // Get layout
  const layout = page.layout || "single";
  const positions = getLayoutPositions(layout, pageSize, designData);
  const photos = (page.photos || []).filter((p) => {
    if (!p) return false;
    return !!(p.baseUrl || p.imageData || p.editedData ||
      p.editedImageData || (p.thumbnailUrl && p.thumbnailUrl.startsWith("data:")));
  });

  console.log(`Layout: ${layout}, Photos: ${photos.length}, Positions: ${positions.length}`);

  // Place photos
  for (let i = 0; i < Math.min(photos.length, positions.length); i++) {
    const photo = photos[i];
    const slot = positions[i];

    // Explicitly clamp slot
    if (slot.x < 0) slot.x = 20;
    if (slot.y < 0) slot.y = 20;

    console.log(`Loading photo ${i + 1}/${photos.length}...`);
    // Resolution guard: make sure we never upscale in the PDF.
    const dpi = 300;
    const minW = pointsToPixels(slot.width, dpi);
    const minH = pointsToPixels(slot.height, dpi);
    const imageBuffer = await fetchImageAsBuffer(photo, accessToken, {
      minWidthPx: Math.ceil(minW * 1.1),
      minHeightPx: Math.ceil(minH * 1.1),
    });
    if (!imageBuffer) {
      console.log(`✗ Photo ${i + 1}: Failed to load`);
      continue;
    }

    try {
      const sizeOf = require("image-size").default || require("image-size");
      const dimensions = sizeOf(imageBuffer);
      console.log(`Photo ${i + 1} dimensions: ${dimensions.width}x${dimensions.height}`);

      // Calculate fit within slot - maintain aspect ratio
      const fit = calculateFitDimensions(
          dimensions.width,
          dimensions.height,
          slot.width,
          slot.height,
      );

      // Resolution validation (hard guard): never upscale in final PDF.
      // 300 DPI target.
      const dpi = 300;
      const requiredW = pointsToPixels(fit.width, dpi);
      const requiredH = pointsToPixels(fit.height, dpi);
      const upscaleX = requiredW / dimensions.width;
      const upscaleY = requiredH / dimensions.height;
      const upscale = Math.max(upscaleX, upscaleY);
      if (upscale > 1.01) {
        throw new Error(
            `Photo resolution too low for print: need ~${requiredW}x${requiredH}px but got ` +
            `${dimensions.width}x${dimensions.height}px (upscale x${upscale.toFixed(2)}). ` +
            `Choose a higher-res photo or reduce its size/layout.`,
        );
      }

      // Center in slot based on alignment setting
      const alignment = photo.alignment || "center";
      let x;
      const y = slot.y + (slot.height - fit.height) / 2;

      // Horizontal alignment
      if (alignment === "left") {
        x = slot.x;
      } else if (alignment === "right") {
        x = slot.x + slot.width - fit.width;
      } else {
        x = slot.x + (slot.width - fit.width) / 2;
      }

      // Shadow (separate from image so opacity doesn't affect the image)
      doc.save();
      doc.fillColor("black", 0.15);
      doc.rect(x + 3, y + 3, fit.width, fit.height).fill();
      doc.restore();

      // Image
      doc.image(imageBuffer, x, y, {
        width: fit.width,
        height: fit.height,
        align: alignment,
        valign: "center",
      });

      const placedMsg = `✓ Photo ${i + 1} placed at (${x.toFixed(0)}, ${y.toFixed(0)}) ` +
        `size ${fit.width.toFixed(0)}x${fit.height.toFixed(0)} [${alignment}]`;
      console.log(placedMsg);
    } catch (error) {
      console.log(`✗ Error placing photo ${i + 1}: ${error.message}`);
    }
  }

  // Get margin for text with proper defaults
  let margin = 60;
  if (designData.data && designData.data.layout) {
    margin = designData.data.layout.pageMargin || margin;
  }

  // Add caption if present
  if (page.caption) {
    const maxWidth = pageSize.width - (margin * 2);
    const captionColor = getTextColor(page, designData);

    // Get caption size from template
    let captionSize = 12;
    if (designData.data && designData.data.typography) {
      captionSize = designData.data.typography.captionSize || captionSize;
    }

    const captionY = pageSize.height - 50; // Constrained to bottom

    console.log(`Adding caption: "${page.caption}" - Color: ${captionColor} - Size: ${captionSize}`);
    const preparedCaption = preparePdfText(page.caption, {
      latinFont: "Times-Italic",
      hebrewFont: HEBREW_FONT_REGULAR,
    });
    doc.fontSize(captionSize)
        .font(preparedCaption.font)
        .fillColor(captionColor)
        .text(preparedCaption.text, margin, captionY, {
          width: maxWidth,
          align: "center",
          lineBreak: true,
          ellipsis: true,
          height: 30, // Strict height limit
        });
  }

  // Add page number (small, discrete)
  if (page.showPageNumber !== false) {
    doc.fontSize(9)
        .font("Helvetica")
        .fillColor("#999999")
        .text(pageNumber.toString(), 20, pageSize.height - 30, {
          width: pageSize.width - 40,
          align: "right",
          height: 20,
        });
  }

  console.log(`✓ Content page ${pageNumber} completed`);
}

/**
 * Create back cover page
 * @param {PDFDocument} doc - PDF document
 * @param {Object} bookData - Book data
 * @param {Object} pageSize - Page dimensions
 */
function createBackCoverPage(doc, bookData, pageSize) {
  console.log("\n=== CREATING BACK COVER ===");

  const designData = getActiveDesignData(null, bookData);
  console.log(`Design data source: ${designData.source}`);

  const bgColor = bookData.backCover?.backgroundColor ||
    getBackgroundColor(null, designData, bookData);
  console.log(`Background: ${bgColor}`);

  // Add page
  doc.addPage({size: [pageSize.width, pageSize.height], margin: 0});

  drawThemeBackground(doc, pageSize, designData, bookData, "back");
  drawDecorations(doc, pageSize, designData);

  // Add text if available
  const backCoverText = bookData.backCover?.text || "Made with Shoso";
  if (backCoverText) {
    const textColor = getTextColor(null, designData);

    console.log(`Adding back cover text: "${backCoverText}" - Color: ${textColor}`);
    const preparedBackText = preparePdfText(backCoverText, {
      latinFont: "Helvetica",
      hebrewFont: HEBREW_FONT_REGULAR,
    });
    doc.fontSize(12)
        .font(preparedBackText.font)
        .fillColor(textColor)
        .text(preparedBackText.text, 60, pageSize.height - 100, {
          width: pageSize.width - 120,
          align: "center",
          height: 50,
        });
  }

  console.log("✓ Back cover completed");
}

/**
 * ============================================
 * MAIN PDF GENERATION
 * ============================================
 */

/**
 * Generate PDF directly using PDFKit
 * @param {string} userId - Firebase user ID
 * @param {Object} bookData - Book configuration and content
 * @return {Promise<Object>} PDF file ID and URL
 */
async function generatePdfDirectly(userId, bookData) {
  console.log("\n" + "=".repeat(60));
  console.log("PDF GENERATION START");
  console.log("=".repeat(60));
  console.log(`Title: ${bookData.title}`);
  console.log(`Format: ${bookData.pageFormat}`);
  console.log(`Pages: ${(bookData.pages || []).length}`);
  console.log(`Template: ${bookData.template || "none"}`);
  console.log(`Theme: ${bookData.theme || "none"}`);
  console.log(`TemplateData: ${!!bookData.templateData}`);
  console.log(`ThemeData: ${!!bookData.themeData}`);

  if (bookData.templateData) {
    const templateColors = bookData.templateData.colors ?
      Object.keys(bookData.templateData.colors) : "none";
    console.log(`TemplateData colors:`, templateColors);
    const decorCount = getDecorations({data: bookData.templateData}).length;
    console.log(`TemplateData decorations:`, decorCount);
  }

  if (bookData.pages && bookData.pages.length > 0) {
    const firstPage = bookData.pages[0];
    console.log("\nFirst page structure:");
    console.log(`  - backgroundColor: ${firstPage.backgroundColor || "none"}`);
    console.log(`  - layout: ${firstPage.layout || "none"}`);
    console.log(`  - photos: ${(firstPage.photos || []).length}`);
    console.log(`  - templateData: ${!!firstPage.templateData}`);
    console.log(`  - themeColors: ${firstPage.themeColors ? Object.keys(firstPage.themeColors).join(", ") : "none"}`);
    console.log(`  - themeDecorations: ${(firstPage.themeDecorations || []).length}`);
  }

  const oauth2Client = await auth.getOAuth2Client(userId);
  if (!oauth2Client) {
    throw new Error("User not authorized");
  }

  const drive = google.drive({version: "v3", auth: oauth2Client});
  const accessToken = oauth2Client.credentials.access_token;

  // Get page dimensions
  const pageSize = getPageSize(bookData.pageFormat);
  console.log(`\nPage size: ${pageSize.width}x${pageSize.height} points`);

  // Create PDF document
  const doc = new PDFDocument({
    size: [pageSize.width, pageSize.height],
    margin: 0,
    autoFirstPage: false,
  });
  registerPdfFonts(doc);

  // Collect PDF data
  const chunks = [];
  doc.on("data", (chunk) => chunks.push(chunk));

  // Create pages in order: Cover -> Content -> Back Cover
  await createCoverPage(doc, bookData, pageSize, accessToken);

  // Filter out empty pages (pages with no photos and no text)
  const validPages = (bookData.pages || []).filter((page) => {
    const hasPhotos = page.photos && page.photos.some((p) => p && (p.baseUrl || p.imageData || p.editedData));
    const hasText = !!page.caption;
    return hasPhotos || hasText;
  });

  console.log(`\nFiltered pages: ${validPages.length} (from original ${(bookData.pages || []).length})`);

  for (let i = 0; i < validPages.length; i++) {
    const pageNumber = i + 2; // Page 1 is cover, so content starts at 2
    await createContentPage(doc, validPages[i], pageSize, accessToken, pageNumber, bookData);
  }

  createBackCoverPage(doc, bookData, pageSize);

  // Finalize PDF
  const pdfBuffer = await new Promise((resolve, reject) => {
    doc.on("end", () => {
      const buffer = Buffer.concat(chunks);
      resolve(buffer);
    });
    doc.on("error", reject);
    doc.end();
  });

  const pdfSizeMB = (pdfBuffer.length / 1024 / 1024).toFixed(2);
  console.log(`\n✓ PDF generated: ${pdfBuffer.length} bytes (${pdfSizeMB} MB)`);

  // Upload to Google Drive
  const fileName = `${bookData.title || "Photo Book"}.pdf`;
  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType: "application/pdf",
    },
    media: {
      mimeType: "application/pdf",
      body: require("stream").Readable.from(pdfBuffer),
    },
    fields: "id, webViewLink, webContentLink",
  });

  const fileId = file.data.id;

  // Make file publicly accessible
  await drive.permissions.create({
    fileId: fileId,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  const pdfUrl = `https://drive.google.com/file/d/${fileId}/view`;
  const pdfDownloadUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;

  console.log("=".repeat(60));
  console.log("PDF GENERATION COMPLETE");
  console.log("=".repeat(60));
  console.log(`PDF URL: ${pdfUrl}`);

  return {
    pdfId: fileId,
    pdfUrl: pdfUrl,
    pdfDownloadUrl: pdfDownloadUrl,
  };
}

module.exports = {
  generatePdfDirectly,
  getPageSize,
};
