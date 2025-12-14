const {google} = require("googleapis");
const fetch = require("node-fetch");
const auth = require("./auth");
const pdfGenerator = require("./pdf-generator");


/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color code
 * @return {Object} RGB values (0-1 range)
 */
function hexToRgb(hex) {
  hex = hex.replace("#", "");
  return {
    red: (parseInt(hex.substring(0, 2), 16) || 0) / 255,
    green: (parseInt(hex.substring(2, 4), 16) || 0) / 255,
    blue: (parseInt(hex.substring(4, 6), 16) || 0) / 255,
  };
}

/**
 * Fetch image as buffer from Google Photos
 * @param {string} photo - Photo object with baseUrl
 * @param {string} accessToken - OAuth access token
 * @return {Promise<Buffer|null>} Image buffer or null
 */
async function fetchImageAsBuffer(photo, accessToken) {
  console.log("fetchImageAsBuffer called");

  const url = photo.baseUrl ? photo.baseUrl + "=w2048-h2048" : photo.fullUrl;

  if (!url) {
    console.log("No URL available");
    return null;
  }

  try {
    console.log("Fetching full-res image with OAuth...");
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200) {
      const buffer = await response.buffer();
      if (buffer.length > 0) {
        console.log("Full-res fetch SUCCESS, size:", buffer.length, "bytes");
        return buffer;
      }
    }
    console.log("Full-res fetch failed, code:", response.status);
  } catch (e) {
    console.log("Full-res fetch error:", e.toString());
  }

  // Fallback to base64 data if available
  if (photo.imageData) {
    try {
      console.log("Using imageData as fallback");
      return Buffer.from(photo.imageData, "base64");
    } catch (e) {
      console.log("Error decoding base64:", e.toString());
    }
  }

  return null;
}

/**
 * Upload image to Google Drive temporarily
 * @param {Buffer} imageBuffer - Image data
 * @param {Object} drive - Google Drive API client
 * @param {string} filename - Filename for the image
 * @return {Promise<string>} Public URL of uploaded image
 */
async function uploadImageToDrive(imageBuffer, drive, filename = "photo.jpg") {
  const fileMetadata = {
    name: filename,
    mimeType: "image/jpeg",
  };

  const media = {
    mimeType: "image/jpeg",
    body: require("stream").Readable.from(imageBuffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id",
  });

  // Make file publicly accessible
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return `https://drive.google.com/uc?id=${file.data.id}`;
}

/**
 * Get layout positions for a given layout type
 * @param {string} layout - Layout type
 * @param {Object} pageSize - Page dimensions
 * @return {Array} Array of position objects
 */
function getLayoutPositions(layout, pageSize) {
  const w = pageSize.width;
  const h = pageSize.height;
  const margin = 80; // Must match minX/minY in createContentSlide (consistent margin)
  const gap = 10;

  const contentW = w - (margin * 2);
  const contentH = h - (margin * 2);

  const layouts = {
    "single": [
      {x: margin, y: margin, width: contentW, height: contentH},
    ],
    "two-horizontal": [
      {x: margin, y: margin, width: (contentW - gap) / 2, height: contentH},
      {x: margin + (contentW - gap) / 2 + gap, y: margin, width: (contentW - gap) / 2, height: contentH},
    ],
    "two-vertical": [
      {x: margin, y: margin, width: contentW, height: (contentH - gap) / 2},
      {x: margin, y: margin + (contentH - gap) / 2 + gap, width: contentW, height: (contentH - gap) / 2},
    ],
    "three-left": [
      {
        x: margin,
        y: margin,
        width: (contentW - gap) * 0.6,
        height: contentH,
      },
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
      {x: margin, y: margin + (contentH - gap) / 2 + gap, width: (contentW - gap) * 0.4, height: (contentH - gap) / 2},
      {x: margin + (contentW - gap) * 0.4 + gap, y: margin, width: (contentW - gap) * 0.6, height: contentH},
    ],
    "four-grid": [
      {
        x: margin,
        y: margin,
        width: (contentW - gap) / 2,
        height: (contentH - gap) / 2,
      },
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
      {
        x: margin,
        y: margin,
        width: (contentW - gap) * 0.6,
        height: (contentH - gap) * 0.6,
      },
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
      {
        x: margin,
        y: margin,
        width: (contentW - gap) / 3,
        height: (contentH - gap) / 2,
      },
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
 * Create photo book presentation
 * @param {string} userId - Firebase user ID
 * @param {Object} bookData - Book configuration and content
 * @return {Promise<Object>} Presentation ID and URLs
 */
async function createPhotoBook(userId, bookData) {
  console.log("=== createPhotoBook START (Direct PDF Generation) ===");
  console.log("Book title:", bookData.title);
  console.log("Page format:", bookData.pageFormat);
  console.log("Pages count:", bookData.pages ? bookData.pages.length : 0);

  // Use direct PDF generation instead of Google Slides
  const result = await pdfGenerator.generatePdfDirectly(userId, bookData);

  console.log("=== createPhotoBook END ===");

  return {
    presentationId: result.pdfId, // Keep for backward compatibility
    pdfId: result.pdfId,
    pdfUrl: result.pdfUrl,
    pdfDownloadUrl: result.pdfDownloadUrl,
  };
}

/**
 * Create cover slide (DEPRECATED - now using direct PDF generation)
 * @param {Object} slides - Google Slides API client
 * @param {Object} drive - Google Drive API client
 * @param {string} presentationId - Presentation ID
 * @param {Object} bookData - Book data object
 * @param {Object} pageSize - Page size dimensions
 * @param {string} accessToken - OAuth access token
 * @ignore
 */
// eslint-disable-next-line no-unused-vars, require-jsdoc
async function createCoverSlide(slides, drive, presentationId, bookData, pageSize, accessToken) {
  // Create blank slide
  const slideResponse = await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{createSlide: {slideLayoutReference: {predefinedLayout: "BLANK"}}}],
    },
  });

  const slideId = slideResponse.data.replies[0].createSlide.objectId;

  // Step 1: Set background color
  const bgColor = bookData.coverBackground || "#1a1a2e";
  const rgb = hexToRgb(bgColor);
  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{
        updatePageProperties: {
          objectId: slideId,
          pageProperties: {
            pageBackgroundFill: {
              solidFill: {
                color: {rgbColor: {red: rgb.red, green: rgb.green, blue: rgb.blue}},
              },
            },
          },
          fields: "pageBackgroundFill",
        },
      }],
    },
  });

  // Step 2: Add cover photo (if exists)
  if (bookData.coverPhoto) {
    const buffer = await fetchImageAsBuffer(bookData.coverPhoto, accessToken);
    if (buffer) {
      try {
        // Get image dimensions to calculate aspect ratio
        const sizeOf = require("image-size").default || require("image-size");
        const dimensions = sizeOf(buffer);
        const imageAspectRatio = dimensions.width / dimensions.height;

        const imageUrl = await uploadImageToDrive(buffer, drive, "cover.jpg");
        const imageId = "cover_image_" + Date.now();

        // Use single consistent margin for all calculations
        const margin = 80; // Combined margin + safety buffer (matches layout positions)
        const minX = margin;
        const minY = margin;
        const maxX = pageSize.width - margin;
        const maxY = pageSize.height - margin;

        const maxAvailableWidth = maxX - minX;
        const maxAvailableHeight = maxY - minY;

        // Calculate dimensions that fit within available space while preserving aspect ratio
        let imageWidth;
        let imageHeight;

        const widthFitHeight = maxAvailableWidth / imageAspectRatio;
        const heightFitWidth = maxAvailableHeight * imageAspectRatio;

        if (widthFitHeight <= maxAvailableHeight) {
          // Image fits when constrained by width
          imageWidth = maxAvailableWidth;
          imageHeight = widthFitHeight;
        } else {
          // Image fits when constrained by height
          imageWidth = heightFitWidth;
          imageHeight = maxAvailableHeight;
        }

        // Ensure dimensions don't exceed bounds
        imageWidth = Math.min(imageWidth, maxAvailableWidth);
        imageHeight = Math.min(imageHeight, maxAvailableHeight);

        // Center the image within safe bounds
        let offsetX = minX + (maxAvailableWidth - imageWidth) / 2;
        let offsetY = minY + (maxAvailableHeight - imageHeight) / 2;

        // Final bounds verification - ensure image fits
        if (offsetX + imageWidth > maxX || offsetY + imageHeight > maxY) {
          console.error("Cover image would exceed page bounds, adjusting");
          // Scale down if needed
          const scaleX = (maxX - offsetX) / imageWidth;
          const scaleY = (maxY - offsetY) / imageHeight;
          const scale = Math.min(scaleX, scaleY, 1.0);
          imageWidth *= scale;
          imageHeight *= scale;
          offsetX = Math.max(minX, Math.min(offsetX, maxX - imageWidth));
          offsetY = Math.max(minY, Math.min(offsetY, maxY - imageHeight));
        }

        // Final verification
        if (offsetX + imageWidth > maxX || offsetY + imageHeight > maxY) {
          console.error("Cover image still exceeds bounds after adjustment, skipping");
          return; // Skip cover image if it can't fit
        }

        // Create image
        await slides.presentations.batchUpdate({
          presentationId,
          requestBody: {
            requests: [{
              createImage: {
                objectId: imageId,
                url: imageUrl,
                elementProperties: {
                  pageObjectId: slideId,
                  size: {
                    width: {magnitude: imageWidth, unit: "PT"},
                    height: {magnitude: imageHeight, unit: "PT"},
                  },
                  transform: {
                    scaleX: 1,
                    scaleY: 1,
                    translateX: offsetX,
                    translateY: offsetY,
                    unit: "PT",
                  },
                },
              },
            }],
          },
        });
      } catch (e) {
        console.log("Error placing cover photo:", e.toString());
      }
    }
  }

  // Step 3: Add title text (on top of everything)
  const titleId = "cover_title_" + Date.now();
  const textColor = bookData.coverTextColor || "#ffffff";
  const titleRgb = hexToRgb(textColor);

  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [
        {
          createShape: {
            objectId: titleId,
            shapeType: "TEXT_BOX",
            elementProperties: {
              pageObjectId: slideId,
              size: {
                width: {magnitude: pageSize.width - 80, unit: "PT"},
                height: {magnitude: 100, unit: "PT"},
              },
              transform: {
                scaleX: 1,
                scaleY: 1,
                translateX: 40,
                translateY: pageSize.height * 0.7,
                unit: "PT",
              },
            },
          },
        },
        {
          insertText: {
            objectId: titleId,
            text: bookData.title || "My Photo Book",
          },
        },
        {
          updateTextStyle: {
            objectId: titleId,
            style: {
              fontFamily: "Playfair Display",
              fontSize: {magnitude: 36, unit: "PT"},
              foregroundColor: {
                opaqueColor: {rgbColor: {red: titleRgb.red, green: titleRgb.green, blue: titleRgb.blue}},
              },
            },
            fields: "fontFamily,fontSize,foregroundColor",
            textRange: {type: "ALL"},
          },
        },
        {
          updateParagraphStyle: {
            objectId: titleId,
            style: {alignment: "CENTER"},
            fields: "alignment",
            textRange: {type: "ALL"},
          },
        },
      ],
    },
  });
}

/**
 * Create content slide (DEPRECATED - now using direct PDF generation)
 * @param {Object} slides - Google Slides API client
 * @param {Object} drive - Google Drive API client
 * @param {string} presentationId - Presentation ID
 * @param {Object} page - Page data object
 * @param {number} pageNum - Page number
 * @param {Object} pageSize - Page size dimensions
 * @param {string} accessToken - OAuth access token
 * @ignore
 */
// eslint-disable-next-line no-unused-vars, require-jsdoc
async function createContentSlide(slides, drive, presentationId, page, pageNum, pageSize, accessToken) {
  const photos = (page.photos || []).filter((p) => p && (p.baseUrl || p.imageData));
  console.log(`Page ${pageNum}: ${photos.length} valid photos`);

  if (photos.length === 0) {
    console.log(`No valid photos for page ${pageNum}`);
    return;
  }

  // Create slide
  const slideResponse = await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{createSlide: {slideLayoutReference: {predefinedLayout: "BLANK"}}}],
    },
  });

  const slideId = slideResponse.data.replies[0].createSlide.objectId;

  // Background
  const bgColor = page.backgroundColor || "#ffffff";
  const rgb = hexToRgb(bgColor);
  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{
        updatePageProperties: {
          objectId: slideId,
          pageProperties: {
            pageBackgroundFill: {
              solidFill: {
                color: {rgbColor: {red: rgb.red, green: rgb.green, blue: rgb.blue}},
              },
            },
          },
          fields: "pageBackgroundFill",
        },
      }],
    },
  });

  // Get layout
  const layout = page.layout || "single";
  console.log("Using layout:", layout);

  const positions = getLayoutPositions(layout, pageSize);
  console.log("Position count:", positions.length);

  // Place photos
  for (let i = 0; i < Math.min(photos.length, positions.length); i++) {
    const photo = photos[i];
    const pos = positions[i];

    console.log(`Processing photo ${i}`);

    const buffer = await fetchImageAsBuffer(photo, accessToken);
    if (!buffer) {
      console.log(`Failed to get buffer for photo ${i}`);
      continue;
    }

    try {
      // Get image dimensions to calculate aspect ratio
      const sizeOf = require("image-size").default || require("image-size");
      const dimensions = sizeOf(buffer);
      console.log(`Photo ${i} dimensions:`, dimensions.width, "x", dimensions.height);

      const imageAspectRatio = dimensions.width / dimensions.height;
      const slotAspectRatio = pos.width / pos.height;
      console.log(
          `Photo ${i} aspect ratios - image: ${imageAspectRatio.toFixed(2)},` +
        ` slot: ${slotAspectRatio.toFixed(2)}`,
      );

      // Use single consistent margin matching layout positions
      const margin = 80; // Must match getLayoutPositions margin
      const minX = margin;
      const minY = margin;
      const maxX = pageSize.width - margin;
      const maxY = pageSize.height - margin;

      // Verify bounds are valid
      if (maxX <= minX || maxY <= minY) {
        console.log(`Photo ${i}: Invalid page bounds, skipping`);
        continue;
      }

      // Get custom alignment and position from page data if available
      const photoData = page.photos[i];
      const alignment = photoData?.alignment || "center";
      const customX = photoData?.customX;
      const customY = photoData?.customY;
      const customWidth = photoData?.customWidth;
      const customHeight = photoData?.customHeight;

      // Calculate slot bounds (already within page margins since layout uses same margin)
      const slotMinX = Math.max(pos.x, minX);
      const slotMinY = Math.max(pos.y, minY);
      const slotMaxX = Math.min(pos.x + pos.width, maxX);
      const slotMaxY = Math.min(pos.y + pos.height, maxY);

      // Available space within slot (guaranteed within page bounds)
      const slotWidth = Math.max(0, slotMaxX - slotMinX);
      const slotHeight = Math.max(0, slotMaxY - slotMinY);

      if (slotWidth <= 0 || slotHeight <= 0) {
        console.log(`Photo ${i}: No available space in slot, skipping`);
        continue;
      }

      // Calculate final dimensions - fit to slot while preserving aspect ratio
      let finalWidth;
      let finalHeight;

      if (customWidth !== undefined && customHeight !== undefined) {
        // Use custom size but ensure it fits
        finalWidth = Math.min(customWidth, slotWidth);
        finalHeight = Math.min(customHeight, slotHeight);

        // Maintain aspect ratio if custom size doesn't match image aspect ratio
        const customAspectRatio = customWidth / customHeight;
        if (Math.abs(customAspectRatio - imageAspectRatio) > 0.01) {
          // Recalculate to maintain image aspect ratio
          const widthScale = finalWidth / imageAspectRatio;
          const heightScale = finalHeight;

          if (widthScale <= heightScale) {
            finalHeight = finalWidth / imageAspectRatio;
          } else {
            finalWidth = finalHeight * imageAspectRatio;
          }
        }
      } else {
        // Determine constraining dimension
        const widthScale = slotWidth / imageAspectRatio;
        const heightScale = slotHeight;

        if (widthScale <= heightScale) {
          finalWidth = slotWidth;
          finalHeight = slotWidth / imageAspectRatio;
        } else {
          finalHeight = slotHeight;
          finalWidth = slotHeight * imageAspectRatio;
        }
      }

      // Position within slot bounds (clamped to page bounds)
      const slotX = Math.max(pos.x, minX);
      const slotY = Math.max(pos.y, minY);

      let offsetX;
      let offsetY;

      if (customX !== undefined && customY !== undefined) {
        // Custom positions - clamp to safe bounds
        offsetX = Math.max(minX, Math.min(customX, maxX - finalWidth));
        offsetY = Math.max(minY, Math.min(customY, maxY - finalHeight));
      } else {
        // Use alignment within slot
        switch (alignment) {
          case "left":
            offsetX = slotX;
            break;
          case "right":
            offsetX = slotX + slotWidth - finalWidth;
            break;
          case "center":
          default:
            offsetX = slotX + (slotWidth - finalWidth) / 2;
            break;
        }
        // Center vertically within slot
        offsetY = slotY + (slotHeight - finalHeight) / 2;
      }

      // Final bounds verification - abort if invalid
      if (offsetX < minX || offsetY < minY || offsetX + finalWidth > maxX ||
          offsetY + finalHeight > maxY) {
        console.error(`Photo ${i}: Would exceed page bounds, skipping`);
        console.error(
            `  Calculated: (${offsetX.toFixed(2)}, ${offsetY.toFixed(2)}) ` +
            `size ${finalWidth.toFixed(2)}x${finalHeight.toFixed(2)}`,
        );
        console.error(`  Bounds: X[${minX}, ${maxX}], Y[${minY}, ${maxY}]`);
        continue;
      }

      console.log(
          `Photo ${i} final dimensions: ${finalWidth.toFixed(1)} x ` +
        `${finalHeight.toFixed(1)} at (${offsetX.toFixed(1)}, ` +
        `${offsetY.toFixed(1)}) - VERIFIED WITHIN BOUNDS`,
      );

      const imageUrl = await uploadImageToDrive(buffer, drive, `page${pageNum}_photo${i}.jpg`);
      const imageId = `photo_${pageNum}_${i}_${Date.now()}`;

      await slides.presentations.batchUpdate({
        presentationId,
        requestBody: {
          requests: [{
            createImage: {
              objectId: imageId,
              url: imageUrl,
              elementProperties: {
                pageObjectId: slideId,
                size: {
                  width: {magnitude: finalWidth, unit: "PT"},
                  height: {magnitude: finalHeight, unit: "PT"},
                },
                transform: {
                  scaleX: 1,
                  scaleY: 1,
                  translateX: offsetX,
                  translateY: offsetY,
                  unit: "PT",
                },
              },
            },
          }],
        },
      });

      console.log(`Image placed successfully: ${imageId}`);
    } catch (e) {
      console.log(`Error placing photo ${i}:`, e.toString());
    }
  }
}

/**
 * Create back cover slide (DEPRECATED - now using direct PDF generation)
 * @param {Object} slides - Google Slides API client
 * @param {string} presentationId - Presentation ID
 * @param {Object} bookData - Book data object
 * @param {Object} pageSize - Page size dimensions
 * @ignore
 */
// eslint-disable-next-line no-unused-vars, require-jsdoc
async function createBackCoverSlide(slides, presentationId, bookData, pageSize) {
  const slideResponse = await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{createSlide: {slideLayoutReference: {predefinedLayout: "BLANK"}}}],
    },
  });

  const slideId = slideResponse.data.replies[0].createSlide.objectId;

  const bgColor = bookData.backCover?.backgroundColor || bookData.coverBackground || "#1a1a2e";
  const rgb = hexToRgb(bgColor);

  await slides.presentations.batchUpdate({
    presentationId,
    requestBody: {
      requests: [{
        updatePageProperties: {
          objectId: slideId,
          pageProperties: {
            pageBackgroundFill: {
              solidFill: {
                color: {rgbColor: {red: rgb.red, green: rgb.green, blue: rgb.blue}},
              },
            },
          },
          fields: "pageBackgroundFill",
        },
      }],
    },
  });
}

/**
 * Export presentation as PDF
 * @param {Object} drive - Google Drive API client
 * @param {string} presentationId - Presentation ID
 * @param {string} title - Presentation title
 */
async function exportPresentationAsPdf(drive, presentationId, title) {
  const response = await drive.files.export({
    fileId: presentationId,
    mimeType: "application/pdf",
  }, {responseType: "arraybuffer"});

  const pdfBuffer = Buffer.from(response.data);

  const fileMetadata = {
    name: `${title || "Photo Book"}.pdf`,
    mimeType: "application/pdf",
  };

  const media = {
    mimeType: "application/pdf",
    body: require("stream").Readable.from(pdfBuffer),
  };

  const file = await drive.files.create({
    requestBody: fileMetadata,
    media: media,
    fields: "id,webViewLink,webContentLink",
  });

  // Make PDF publicly accessible
  await drive.permissions.create({
    fileId: file.data.id,
    requestBody: {
      role: "reader",
      type: "anyone",
    },
  });

  return file.data.webContentLink;
}

/**
 * Export existing presentation as PDF
 * @param {string} userId - Firebase user ID
 * @param {string} presentationId - Presentation ID
 */
async function exportAsPdf(userId, presentationId) {
  const oauth2Client = await auth.getOAuth2Client(userId);

  if (!oauth2Client) {
    throw new Error("User not authorized");
  }

  const drive = google.drive({version: "v3", auth: oauth2Client});

  const downloadUrl = await exportPresentationAsPdf(drive, presentationId, "Photo Book");

  return {
    success: true,
    downloadUrl: downloadUrl,
  };
}

module.exports = {
  createPhotoBook,
  exportAsPdf,
};
