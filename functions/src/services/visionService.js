const vision = require("@google-cloud/vision");

// Client will use your Application Default Credentials automatically
const client = new vision.ImageAnnotatorClient();

/**
 * Analyze photo for important features
 * @param {string} imageUrl - URL or GCS path to image
 * @return {Object} Analysis results
 */
async function analyzePhoto(imageUrl) {
  try {
    let imageRequest;

    // Check if it's a data URL (base64)
    if (imageUrl && imageUrl.startsWith("data:image")) {
      // Extract base64 content
      const base64Content = imageUrl.split(",")[1];
      imageRequest = {content: base64Content};
    } else {
      // Assume remote URL or GCS path
      imageRequest = {source: {imageUri: imageUrl}};
    }

    const [result] = await client.annotateImage({
      image: imageRequest,
      features: [
        {type: "FACE_DETECTION", maxResults: 50},
        {type: "OBJECT_LOCALIZATION", maxResults: 20},
        {type: "LABEL_DETECTION", maxResults: 10},
        {type: "IMAGE_PROPERTIES"},
      ],
    });

    return {
      faces: result.faceAnnotations || [],
      objects: result.localizedObjectAnnotations || [],
      labels: result.labelAnnotations || [],
      colors: result.imagePropertiesAnnotation?.dominantColors?.colors || [],
      imageUrl: imageUrl,
      analyzedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Vision API Error:", error);
    throw new Error(`Failed to analyze image: ${error.message}`);
  }
}

/**
 * Batch analyze multiple photos (more efficient)
 * @param {string[]} imageUrls - List of image URLs
 * @return {Promise<Object[]>} - Array of analysis results
 */
async function batchAnalyzePhotos(imageUrls) {
  const requests = imageUrls.map((imageUrl) => ({
    image: {source: {imageUri: imageUrl}},
    features: [
      {type: "FACE_DETECTION", maxResults: 50},
      {type: "OBJECT_LOCALIZATION", maxResults: 20},
    ],
  }));

  try {
    const [batchResult] = await client.batchAnnotateImages({requests});

    return batchResult.responses.map((response, index) => ({
      faces: response.faceAnnotations || [],
      objects: response.localizedObjectAnnotations || [],
      imageUrl: imageUrls[index],
      analyzedAt: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("Batch Vision API Error:", error);
    throw new Error(`Failed to batch analyze: ${error.message}`);
  }
}

module.exports = {
  analyzePhoto,
  batchAnalyzePhotos,
};
