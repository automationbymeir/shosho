const {analyzePhoto} = require("./visionService");

// Importance weights
const IMPORTANCE_WEIGHTS = {
  face: 10,
  person: 7,
  pet: 6,
  vehicle: 3,
  food: 4,
  landmark: 5,
  default: 2,
};

/**
 * Generate importance map from Vision API results.
 * @param {Object} analysis - The results from the Vision API analysis.
 * @param {number} imageWidth - The width of the image.
 * @param {number} imageHeight - The height of the image.
 * @return {Array<Array<number>>} The generated importance map.
 */
function generateImportanceMap(analysis, imageWidth, imageHeight) {
  const gridWidth = Math.ceil(imageWidth / 10);
  const gridHeight = Math.ceil(imageHeight / 10);
  const map = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(0));

  // Add face importance
  analysis.faces.forEach((face) => {
    const vertices = face.boundingPoly.vertices;
    const weight = IMPORTANCE_WEIGHTS.face;
    const confidence = face.detectionConfidence || 0.5;
    const emotionBoost = calculateEmotionBoost(face);

    addBoundingBoxToMap(
        map, vertices, weight * confidence * emotionBoost,
        imageWidth, imageHeight, gridWidth, gridHeight,
    );
  });

  // Add object importance
  analysis.objects.forEach((obj) => {
    const vertices = obj.boundingPoly.normalizedVertices;
    const weight = getObjectWeight(obj.name);
    const confidence = obj.score || 0.5;

    addNormalizedBoundingBoxToMap(
        map, vertices, weight * confidence, gridWidth, gridHeight,
    );
  });

  return map;
}

/**
 * Calculate boost factor based on face emotion.
 * @param {Object} face - The face annotation object.
 * @return {number} The calculated boost factor.
 */
function calculateEmotionBoost(face) {
  let boost = 1.0;
  if (face.joyLikelihood === "VERY_LIKELY") boost *= 1.3;
  else if (face.joyLikelihood === "LIKELY") boost *= 1.15;
  if (face.joyLikelihood === "VERY_UNLIKELY") boost *= 0.9;
  return boost;
}

/**
 * Get weight for an object based on its name.
 * @param {string} objectName - The name of the detected object.
 * @return {number} The importance weight.
 */
function getObjectWeight(objectName) {
  const name = objectName.toLowerCase();
  if (name.includes("person")) return IMPORTANCE_WEIGHTS.person;
  if (name.includes("dog") || name.includes("cat")) return IMPORTANCE_WEIGHTS.pet;
  if (name.includes("car") || name.includes("vehicle")) return IMPORTANCE_WEIGHTS.vehicle;
  if (name.includes("food")) return IMPORTANCE_WEIGHTS.food;
  return IMPORTANCE_WEIGHTS.default;
}

/**
 * Add a bounding box to the importance map.
 * @param {Array<Array<number>>} map - The importance map to update.
 * @param {Object[]} vertices - The vertices of the bounding box.
 * @param {number} weight - The weight to add.
 * @param {number} imgW - Image width.
 * @param {number} imgH - Image height.
 * @param {number} gridW - Grid width.
 * @param {number} gridH - Grid height.
 */
function addBoundingBoxToMap(map, vertices, weight, imgW, imgH, gridW, gridH) {
  const minX = Math.min(...vertices.map((v) => v.x || 0));
  const maxX = Math.max(...vertices.map((v) => v.x || 0));
  const minY = Math.min(...vertices.map((v) => v.y || 0));
  const maxY = Math.max(...vertices.map((v) => v.y || 0));

  const startX = Math.floor((minX / imgW) * gridW);
  const endX = Math.ceil((maxX / imgW) * gridW);
  const startY = Math.floor((minY / imgH) * gridH);
  const endY = Math.ceil((maxY / imgH) * gridH);

  for (let y = startY; y < endY && y < gridH; y++) {
    for (let x = startX; x < endX && x < gridW; x++) {
      if (y >= 0 && x >= 0) map[y][x] += weight;
    }
  }
}

/**
 * Add a normalized bounding box to the importance map.
 * @param {Array<Array<number>>} map - The importance map to update.
 * @param {Object[]} vertices - The normalized vertices of the bounding box.
 * @param {number} weight - The weight to add.
 * @param {number} gridW - Grid width.
 * @param {number} gridH - Grid height.
 */
function addNormalizedBoundingBoxToMap(map, vertices, weight, gridW, gridH) {
  const minX = Math.min(...vertices.map((v) => v.x || 0));
  const maxX = Math.max(...vertices.map((v) => v.x || 0));
  const minY = Math.min(...vertices.map((v) => v.y || 0));
  const maxY = Math.max(...vertices.map((v) => v.y || 0));

  const startX = Math.floor(minX * gridW);
  const endX = Math.ceil(maxX * gridW);
  const startY = Math.floor(minY * gridH);
  const endY = Math.ceil(maxY * gridH);

  for (let y = startY; y < endY && y < gridH; y++) {
    for (let x = startX; x < endX && x < gridW; x++) {
      if (y >= 0 && x >= 0) map[y][x] += weight;
    }
  }
}

/**
 * Calculate optimal crop position.
 * @param {Object} photo - Photo metadata including dimensions.
 * @param {Object} layoutBox - The target layout box dimensions.
 * @param {Array<Array<number>>} importanceMap - The importance map of the photo.
 * @return {Object} The optimal crop parameters {x, y, width, height, score}.
 */
function calculateOptimalCrop(photo, layoutBox, importanceMap) {
  const photoAspect = photo.width / photo.height;
  const boxAspect = layoutBox.width / layoutBox.height;

  let cropWidth; let cropHeight;

  if (photoAspect > boxAspect) {
    cropHeight = photo.height;
    cropWidth = Math.round(cropHeight * boxAspect);
  } else {
    cropWidth = photo.width;
    cropHeight = Math.round(cropWidth / boxAspect);
  }

  let bestScore = -1;
  let bestPosition = {x: 0, y: 0};

  // Removed unused grid dimension variables and stepSize calculations
  const gridWidth = importanceMap[0].length;
  const gridHeight = importanceMap.length;

  const scanStepX = Math.max(10, Math.floor((photo.width - cropWidth) / 20));
  const scanStepY = Math.max(10, Math.floor((photo.height - cropHeight) / 20));

  // Ensure we check at least the center
  const possibleXs = [];
  for (let x = 0; x <= photo.width - cropWidth; x += scanStepX) possibleXs.push(x);
  // Always include perfect center option
  possibleXs.push(Math.floor((photo.width - cropWidth) / 2));

  const possibleYs = [];
  for (let y = 0; y <= photo.height - cropHeight; y += scanStepY) possibleYs.push(y);
  // Always include perfect center option
  possibleYs.push(Math.floor((photo.height - cropHeight) / 2));


  for (const y of possibleYs) {
    for (const x of possibleXs) {
      // Validate boundaries just in case
      if (x > photo.width - cropWidth || y > photo.height - cropHeight) continue;

      const score = scoreCropRegion(
          importanceMap, x, y, cropWidth, cropHeight,
          photo.width, photo.height, gridWidth, gridHeight,
      );

      if (score > bestScore) {
        bestScore = score;
        bestPosition = {x, y};
      }
    }
  }

  return {
    x: bestPosition.x,
    y: bestPosition.y,
    width: cropWidth,
    height: cropHeight,
    score: bestScore,
  };
}

/**
 * Score a specific crop region based on the importance map.
 * @param {Array<Array<number>>} map - The importance map.
 * @param {number} x - Crop start X coordinate.
 * @param {number} y - Crop start Y coordinate.
 * @param {number} width - Crop width.
 * @param {number} height - Crop height.
 * @param {number} imgW - Image full width.
 * @param {number} imgH - Image full height.
 * @param {number} gridW - Grid width.
 * @param {number} gridH - Grid height.
 * @return {number} The calculated score for the region.
 */
function scoreCropRegion(map, x, y, width, height, imgW, imgH, gridW, gridH) {
  let totalScore = 0;
  let cellCount = 0;

  const startX = Math.floor((x / imgW) * gridW);
  const endX = Math.ceil(((x + width) / imgW) * gridW);
  const startY = Math.floor((y / imgH) * gridH);
  const endY = Math.ceil(((y + height) / imgH) * gridH);

  for (let gy = startY; gy < endY && gy < gridH; gy++) {
    for (let gx = startX; gx < endX && gx < gridW; gx++) {
      if (gy >= 0 && gx >= 0 && gy < gridH && gx < gridW) {
        totalScore += map[gy][gx];
        cellCount++;
      }
    }
  }

  const cropCenterX = x + width / 2;
  const cropCenterY = y + height / 2;
  const imgCenterX = imgW / 2;
  const imgCenterY = imgH / 2;

  const distFromCenter = Math.sqrt(
      Math.pow(cropCenterX - imgCenterX, 2) +
    Math.pow(cropCenterY - imgCenterY, 2),
  );

  const maxPossibleDist = Math.sqrt(Math.pow(imgW, 2) + Math.pow(imgH, 2)) / 2;

  const centeringBonus = 1 - (distFromCenter / maxPossibleDist) * 0.2;

  return cellCount > 0 ? (totalScore) * centeringBonus : 0;
}

/**
 * Main function: Analyze and position photo.
 * @param {string} photoUrl - The URL of the photo to analyze.
 * @param {Object} photoMetadata - Metadata about the photo (width, height, etc.).
 * @param {Object} layoutBox - The layout box dimensions.
 * @return {Promise<Object>} The positioning result including crop and analysis data.
 */
async function analyzeAndPosition(photoUrl, photoMetadata, layoutBox) {
  try {
    const analysis = await analyzePhoto(photoUrl);

    const importanceMap = generateImportanceMap(
        analysis,
        photoMetadata.width,
        photoMetadata.height,
    );

    const optimalCrop = calculateOptimalCrop(
        photoMetadata,
        layoutBox,
        importanceMap,
    );

    return {
      crop: optimalCrop,
      analysis: {
        faceCount: analysis.faces.length,
        objectCount: analysis.objects.length,
        primaryObjects: analysis.objects.slice(0, 3).map((o) => o.name),
        hasPeople: analysis.faces.length > 0,
      },
    };
  } catch (error) {
    console.error("Position calculation error:", error);
    return {
      crop: centerCrop(photoMetadata, layoutBox),
      analysis: null,
      error: error.message,
      fallback: true,
    };
  }
}

/**
 * Only center crop fallback.
 * @param {Object} photo - Photo metadata.
 * @param {Object} layoutBox - Layout box dimensions.
 * @return {Object} Crop parameters.
 */
function centerCrop(photo, layoutBox) {
  const photoAspect = photo.width / photo.height;
  const boxAspect = layoutBox.width / layoutBox.height;

  let cropWidth; let cropHeight;

  if (photoAspect > boxAspect) {
    cropHeight = photo.height;
    cropWidth = Math.round(cropHeight * boxAspect);
  } else {
    cropWidth = photo.width;
    cropHeight = Math.round(cropWidth / boxAspect);
  }

  return {
    x: Math.round((photo.width - cropWidth) / 2),
    y: Math.round((photo.height - cropHeight) / 2),
    width: cropWidth,
    height: cropHeight,
    score: 0,
  };
}

/**
 * Calculate the center of mass (Focal Point) from the importance map.
 * Returns x, y as percentages (0-100).
 * @param {Array<Array<number>>} importanceMap - The importance map grid.
 * @return {Object} An object containing focalX and focalY.
 */
function calculateFocalPoint(importanceMap) {
  let totalWeight = 0;
  let sumX = 0;
  let sumY = 0;

  const gridHeight = importanceMap.length;
  const gridWidth = importanceMap[0].length;

  for (let y = 0; y < gridHeight; y++) {
    for (let x = 0; x < gridWidth; x++) {
      const weight = importanceMap[y][x];
      if (weight > 0) {
        totalWeight += weight;
        sumX += x * weight;
        sumY += y * weight;
      }
    }
  }

  if (totalWeight === 0) {
    return {focalX: 50, focalY: 50}; // default center
  }

  // Calculate percentage of grid
  const centerX = (sumX / totalWeight) / gridWidth;
  const centerY = (sumY / totalWeight) / gridHeight;

  return {
    focalX: Math.max(0, Math.min(100, centerX * 100)),
    focalY: Math.max(0, Math.min(100, centerY * 100)),
  };
}

/**
 * Process a batch of photos and return their focal points
 * @param {Array<Object>} photos - [{ id, url, width, height }]
 */
async function analyzeBatchFocalPoints(photos) {
  const results = {};

  // We process in parallel using Promise.all
  // We cap concurrency to 10 in real-world scenarios, but here let's just do Promise.all
  const promises = photos.map(async (photo) => {
    try {
      if (!photo.url) {
        results[photo.id] = {focalX: 50, focalY: 50};
        return;
      }

      const analysis = await analyzePhoto(photo.url);
      const importanceMap = generateImportanceMap(
          analysis,
          photo.width || 1000,
          photo.height || 1000,
      );

      results[photo.id] = calculateFocalPoint(importanceMap);
    } catch (err) {
      console.warn(`[BatchVision] Failed for photo ${photo.id}:`, err);
      results[photo.id] = {focalX: 50, focalY: 50}; // Fallback
    }
  });

  await Promise.allSettled(promises);
  return results;
}

module.exports = {
  analyzeAndPosition,
  analyzeBatchFocalPoints,
  generateImportanceMap,
  calculateOptimalCrop,
};
