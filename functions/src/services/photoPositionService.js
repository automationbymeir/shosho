const { analyzePhoto } = require('./visionService');

// Importance weights
const IMPORTANCE_WEIGHTS = {
    face: 10,
    person: 7,
    pet: 6,
    vehicle: 3,
    food: 4,
    landmark: 5,
    default: 2
};

/**
 * Generate importance map from Vision API results
 */
function generateImportanceMap(analysis, imageWidth, imageHeight) {
    const gridWidth = Math.ceil(imageWidth / 10);
    const gridHeight = Math.ceil(imageHeight / 10);
    const map = Array(gridHeight).fill(0).map(() => Array(gridWidth).fill(0));

    // Add face importance
    analysis.faces.forEach(face => {
        const vertices = face.boundingPoly.vertices;
        const weight = IMPORTANCE_WEIGHTS.face;
        const confidence = face.detectionConfidence || 0.5;
        const emotionBoost = calculateEmotionBoost(face);

        addBoundingBoxToMap(
            map, vertices, weight * confidence * emotionBoost,
            imageWidth, imageHeight, gridWidth, gridHeight
        );
    });

    // Add object importance
    analysis.objects.forEach(obj => {
        const vertices = obj.boundingPoly.normalizedVertices;
        const weight = getObjectWeight(obj.name);
        const confidence = obj.score || 0.5;

        addNormalizedBoundingBoxToMap(
            map, vertices, weight * confidence, gridWidth, gridHeight
        );
    });

    return map;
}

function calculateEmotionBoost(face) {
    let boost = 1.0;
    if (face.joyLikelihood === 'VERY_LIKELY') boost *= 1.3;
    else if (face.joyLikelihood === 'LIKELY') boost *= 1.15;
    if (face.joyLikelihood === 'VERY_UNLIKELY') boost *= 0.9;
    return boost;
}

function getObjectWeight(objectName) {
    const name = objectName.toLowerCase();
    if (name.includes('person')) return IMPORTANCE_WEIGHTS.person;
    if (name.includes('dog') || name.includes('cat')) return IMPORTANCE_WEIGHTS.pet;
    if (name.includes('car') || name.includes('vehicle')) return IMPORTANCE_WEIGHTS.vehicle;
    if (name.includes('food')) return IMPORTANCE_WEIGHTS.food;
    return IMPORTANCE_WEIGHTS.default;
}

function addBoundingBoxToMap(map, vertices, weight, imgW, imgH, gridW, gridH) {
    const minX = Math.min(...vertices.map(v => v.x || 0));
    const maxX = Math.max(...vertices.map(v => v.x || 0));
    const minY = Math.min(...vertices.map(v => v.y || 0));
    const maxY = Math.max(...vertices.map(v => v.y || 0));

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

function addNormalizedBoundingBoxToMap(map, vertices, weight, gridW, gridH) {
    const minX = Math.min(...vertices.map(v => v.x || 0));
    const maxX = Math.max(...vertices.map(v => v.x || 0));
    const minY = Math.min(...vertices.map(v => v.y || 0));
    const maxY = Math.max(...vertices.map(v => v.y || 0));

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
 * Calculate optimal crop position
 */
function calculateOptimalCrop(photo, layoutBox, importanceMap) {
    const photoAspect = photo.width / photo.height;
    const boxAspect = layoutBox.width / layoutBox.height;

    let cropWidth, cropHeight;

    if (photoAspect > boxAspect) {
        cropHeight = photo.height;
        cropWidth = Math.round(cropHeight * boxAspect);
    } else {
        cropWidth = photo.width;
        cropHeight = Math.round(cropWidth / boxAspect);
    }

    let bestScore = -1;
    let bestPosition = { x: 0, y: 0 };

    const gridWidth = importanceMap[0].length;
    const gridHeight = importanceMap.length;
    const stepSize = Math.max(1, Math.floor(Math.min(gridWidth, gridHeight) / 20));

    // Create a sliding window search
    // Using a simplified step approach for performance

    // Calculate scan ranges in PIXELS first, then map to GRID
    // Actually, we scan in PIXELS on the photo, but evaluate score on the GRID
    // Optimization: Scan in grid units? No, let's scan in pixels but with large steps

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
                photo.width, photo.height, gridWidth, gridHeight
            );

            if (score > bestScore) {
                bestScore = score;
                bestPosition = { x, y };
            }
        }
    }

    return {
        x: bestPosition.x,
        y: bestPosition.y,
        width: cropWidth,
        height: cropHeight,
        score: bestScore
    };
}

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

    // Center bias logic
    // Calculate the center of the IMPORTANT regions within this crop vs the center of the crop
    // Simple heuristic: Boost score if crop is centered on image (photography rule of thirds often contradicts this, but for auto-crop, center is safe)
    // Actually, we want to center the OBJECTS. The importance map already weights objects.
    // So we just sum the importance.
    // But purely equal scores? Prefer photo center.

    const cropCenterX = x + width / 2;
    const cropCenterY = y + height / 2;
    const imgCenterX = imgW / 2;
    const imgCenterY = imgH / 2;

    const distFromCenter = Math.sqrt(
        Math.pow(cropCenterX - imgCenterX, 2) +
        Math.pow(cropCenterY - imgCenterY, 2)
    );

    const maxPossibleDist = Math.sqrt(Math.pow(imgW, 2) + Math.pow(imgH, 2)) / 2;

    // Small penalty for being away from center, to break ties
    const centeringBonus = 1 - (distFromCenter / maxPossibleDist) * 0.2;

    return cellCount > 0 ? (totalScore) * centeringBonus : 0;
}

/**
 * Main function: Analyze and position photo
 */
async function analyzeAndPosition(photoUrl, photoMetadata, layoutBox) {
    try {
        const analysis = await analyzePhoto(photoUrl);

        const importanceMap = generateImportanceMap(
            analysis,
            photoMetadata.width,
            photoMetadata.height
        );

        const optimalCrop = calculateOptimalCrop(
            photoMetadata,
            layoutBox,
            importanceMap
        );

        return {
            crop: optimalCrop,
            analysis: {
                faceCount: analysis.faces.length,
                objectCount: analysis.objects.length,
                primaryObjects: analysis.objects.slice(0, 3).map(o => o.name),
                hasPeople: analysis.faces.length > 0
            }
        };
    } catch (error) {
        console.error('Position calculation error:', error);
        return {
            crop: centerCrop(photoMetadata, layoutBox),
            analysis: null,
            error: error.message,
            fallback: true
        };
    }
}

function centerCrop(photo, layoutBox) {
    const photoAspect = photo.width / photo.height;
    const boxAspect = layoutBox.width / layoutBox.height;

    let cropWidth, cropHeight;

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
        score: 0
    };
}

module.exports = {
    analyzeAndPosition,
    generateImportanceMap,
    calculateOptimalCrop
};
