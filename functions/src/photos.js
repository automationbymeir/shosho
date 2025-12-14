const fetch = require("node-fetch");
const auth = require("./auth");

/**
 * Create a Google Photos Picker session
 * @param {string} userId - Firebase user ID
 * @return {Promise<Object>} Session information
 */
async function createPickerSession(userId) {
  console.log("=== createPickerSession START ===");

  try {
    const oauth2Client = await auth.getOAuth2Client(userId);

    if (!oauth2Client) {
      console.log("No OAuth access, returning auth URL");
      return auth.getAuthorizationUrl(userId);
    }

    const accessToken = oauth2Client.credentials.access_token;
    console.log("Have access token, length:", accessToken ? accessToken.length : 0);

    const response = await fetch("https://photospicker.googleapis.com/v1/sessions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({}),
    });

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
      const url = baseUrl + "=w200-h200";

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

module.exports = {
  createPickerSession,
  checkPickerSession,
  fetchThumbnailBatch,
};
