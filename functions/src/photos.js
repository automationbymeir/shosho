const fetch = require("node-fetch");
const auth = require("./auth");

/**
 * Normalize Google Photos baseUrl by removing only the trailing resize suffix.
 * Example: https://.../abc=w800-h800 -> https://.../abc
 *
 * Some URLs can contain '=' for other reasons (query params), so avoid splitting
 * on the first '='. We strip only if the trailing segment looks like a resize
 * directive (w/h/s + digits).
 *
 * @param {string} u
 * @return {string}
 */
function normalizeGooglePhotoBaseUrl(u) {
  if (!u || typeof u !== "string") return u;
  const idx = u.lastIndexOf("=");
  if (idx < 0) return u;
  const suffix = u.slice(idx + 1);
  if (/^(w|h|s)\d/i.test(suffix)) return u.slice(0, idx);
  return u;
}

/**
 * Create a Google Photos Picker session
 * @param {string} userId - Firebase user ID
 * @return {Promise<Object>} Session information
 */
async function createPickerSession(userId) {
  console.log(`[DEBUG_AUTH] createPickerSession called for userId: ${userId}`);
  console.log("=== createPickerSession START ===");

  try {
    const oauth2Client = await auth.getOAuth2Client(userId);

    if (!oauth2Client) {
      console.log(`[DEBUG_AUTH] No OAuth access for userId: ${userId}, returning auth URL`);
      console.log("No OAuth access, returning auth URL");
      return auth.getAuthorizationUrl(userId);
    }

    console.log(`[DEBUG_AUTH] OAuth client retrieved for userId: ${userId}, creating session...`);

    const accessToken = oauth2Client.credentials.access_token;
    console.log("Have access token, length:", accessToken ? accessToken.length : 0);

    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
    }, 15000); // 15s timeout

    let response;
    try {
      console.log("Calling Google Picker API...");
      response = await fetch("https://photospicker.googleapis.com/v1/sessions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    const code = response.status;
    const content = await response.text();
    console.log("Response code:", code);
    console.log("Response content:", content.substring(0, 500));


    if (code !== 200) {
      console.log("createPickerSession error:", content);

      // Check for specific error conditions that might indicate no Google Photos account
      // 403: Forbidden (might be enabled but not set up)
      // 404: Not Found (could be no photos library)
      // "Photos API has not been used" or similar messages
      if (code === 403 || code === 404 || content.includes("global scope") || content.includes("enable the API")) {
        return {
          status: "PHOTOS_NOT_ACTIVE",
          message: "It looks like your Google Photos account is not active or empty. " +
            "Please log in to Google Photos first.",
          details: content,
        };
      }

      return {
        status: "ERROR",
        message: `Failed to create session. Code: ${code}. ${content.substring(0, 200)}`,
      };
    }

    const session = JSON.parse(content);
    console.log("Session created:", session.id);
    console.log("Picker URI:", session.pickerUri);

    return {
      status: "SUCCESS",
      sessionId: session.id,
      pickerUri: session.pickerUri,
    };
  } catch (e) {
    console.log("Exception in createPickerSession:", e.toString());
    console.error(e);
    return {
      status: "ERROR",
      message: `Exception: ${e.toString()}`,
    };
  }
}

/**
 * Check the status of a picker session
 * @param {string} userId - Firebase user ID
 * @param {string} sessionId - Picker session ID
 * @return {Promise<Object>} Session status and photos if complete
 */
async function checkPickerSession(userId, sessionId) {
  console.log("checkPickerSession called for:", sessionId);

  const oauth2Client = await auth.getOAuth2Client(userId);

  if (!oauth2Client) {
    return {error: "Not authorized"};
  }

  const accessToken = oauth2Client.credentials.access_token;

  try {
    const response = await fetch(`https://photospicker.googleapis.com/v1/sessions/${sessionId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const code = response.status;
    if (code !== 200) {
      console.log("Poll failed:", code);
      return {error: `Failed to poll session: ${code}`};
    }

    const session = await response.json();

    if (session.mediaItemsSet) {
      // User has finished selecting - get the photos
      console.log("User finished selecting, fetching photos...");
      const photos = await getPickerResults(sessionId, accessToken);
      console.log("Got", photos.length, "photos");

      return {
        complete: true,
        count: photos.length,
        photos: photos,
        needsThumbnails: true,
      };
    }

    // Still waiting for user
    return {complete: false};
  } catch (e) {
    console.log("checkPickerSession error:", e.toString());
    return {error: e.toString()};
  }
}

/**
 * Get photos from a picker session
 * @param {string} sessionId - Picker session ID
 * @param {string} accessToken - OAuth access token
 * @return {Promise<Array>} Array of photo objects
 */
async function getPickerResults(sessionId, accessToken) {
  const allPhotos = [];
  let pageToken = null;

  do {
    let url = `https://photospicker.googleapis.com/v1/mediaItems?sessionId=${sessionId}&pageSize=100`;
    if (pageToken) {
      url += `&pageToken=${pageToken}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (response.status !== 200) {
      console.log("getPickerResults error:", await response.text());
      break;
    }

    const data = await response.json();

    if (data.mediaItems) {
      data.mediaItems.forEach((item) => {
        allPhotos.push({
          id: item.id,
          baseUrl: item.mediaFile.baseUrl,
          mimeType: item.mediaFile.mimeType,
          width: item.mediaFile.mediaFileMetadata?.width,
          height: item.mediaFile.mediaFileMetadata?.height,
          filename: item.mediaFile.filename || "photo.jpg",
        });
      });
    }

    pageToken = data.nextPageToken;
  } while (pageToken);

  return allPhotos;
}

/**
 * Fetch thumbnails for a batch of photos
 * @param {string} userId - Firebase user ID
 * @param {Array<string>} baseUrls - Array of photo base URLs
 * @return {Promise<Object>} Batch of thumbnails as data URIs
 */
async function fetchThumbnailBatch(userId, baseUrls) {
  const oauth2Client = await auth.getOAuth2Client(userId);

  if (!oauth2Client) {
    console.log("fetchThumbnailBatch: No OAuth access");
    return {success: false, error: "No auth", thumbnails: []};
  }

  const accessToken = oauth2Client.credentials.access_token;
  const thumbnails = [];

  for (let i = 0; i < baseUrls.length; i++) {
    const baseUrl = baseUrls[i];
    try {
      // Add size parameter for thumbnail
      // Use larger thumbnails so the app UI looks sharp (album grid + MD spreads).
      // Some saved projects may already have size parameters appended (e.g. "=w1200-h1200").
      // Normalize before appending our preferred thumb size.
      const normalizedBaseUrl = normalizeGooglePhotoBaseUrl(baseUrl);
      const url = `${normalizedBaseUrl}=w800-h800`;

      // Fetch with OAuth token
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
        },
      });

      if (response.status === 200) {
        const buffer = await response.buffer();
        const b64 = buffer.toString("base64");
        const mimeType = response.headers.get("content-type") || "image/jpeg";

        // Return as data URI so browser can display without auth
        thumbnails.push({
          // Keep the caller's original baseUrl as the key so the client can map correctly
          // even if it stored a URL with size params.
          baseUrl: baseUrl,
          thumbnailUrl: `data:${mimeType};base64,${b64}`,
          success: true,
        });
        console.log("Thumbnail fetched successfully for index", i);
      } else {
        console.log("Thumbnail fetch failed:", response.status);
        thumbnails.push({baseUrl: baseUrl, thumbnailUrl: null, success: false});
      }
    } catch (e) {
      console.log("Error fetching thumbnail:", e.toString());
      thumbnails.push({baseUrl: baseUrl, thumbnailUrl: null, success: false});
    }
  }

  return {
    success: true,
    thumbnails: thumbnails,
  };
}

/**
 * Fetch a single high-res image as a data URI to bypass CORS
 * @param {string} userId
 * @param {string} url
 * @return {Promise<Object>}
 */
async function fetchHighResImage(userId, url) {
  const oauth2Client = await auth.getOAuth2Client(userId);

  if (!oauth2Client) {
    return {success: false, error: "No auth"};
  }

  const accessToken = oauth2Client.credentials.access_token;

  try {
    // Normalize and add 'd' (download/original) or large dimensions
    // =d typically downloads original. =w2048-h2048 is safe high res.
    const normalized = normalizeGooglePhotoBaseUrl(url);
    const fetchUrl = `${normalized}=w2048-h2048`;

    const response = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    if (response.status === 200) {
      const buffer = await response.buffer();
      const b64 = buffer.toString("base64");
      const mimeType = response.headers.get("content-type") || "image/jpeg";
      return {
        success: true,
        dataUri: `data:${mimeType};base64,${b64}`,
      };
    } else {
      return {success: false, error: `Upstream ${response.status}`};
    }
  } catch (e) {
    return {success: false, error: e.toString()};
  }
}

module.exports = {
  createPickerSession,
  checkPickerSession,
  fetchThumbnailBatch,
  fetchHighResImage,
};
