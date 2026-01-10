const admin = require("firebase-admin");

/**
 * Clean data for Firestore - aggressively remove large data
 * @param {Object} obj - Object to clean
 * @param {number} maxDepth - Maximum depth to traverse
 * @return {Object} Cleaned object
 */
function cleanDataForFirestore(obj, maxDepth = 10) {
  if (maxDepth <= 0) {
    return null;
  }

  if (obj === null || obj === undefined) {
    return null;
  }

  if (typeof obj !== "object") {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => cleanDataForFirestore(item, maxDepth - 1))
        .filter((item) => item !== null && item !== undefined);
  }

  const cleaned = {};
  for (const [key, value] of Object.entries(obj)) {
    // Skip undefined values
    if (value === undefined) {
      continue;
    }

    // Skip functions
    if (typeof value === "function") {
      continue;
    }

    // Never store inline background image data URLs in Firestore (too large).
    // We store persisted Storage URLs instead (backgroundImageUrl).
    if (key === "backgroundImageData") {
      continue;
    }

    // For photos, keep ONLY essential identifiers - NO base64 data at all
    if (key === "photos" && Array.isArray(value)) {
      cleaned[key] = value.map((photo) => {
        if (!photo) return null;
        // Only save minimal identifiers - photos will be reloaded from Google Photos
        const cleanedPhoto = {
          id: photo.id || null,
          // Be tolerant of historical field names (some older clients used fullUrl/url).
          baseUrl: photo.baseUrl || photo.fullUrl || photo.url || null,
          // Remove fullUrl, thumbnailUrl, editedData, editedImageData - too large
          // These will be regenerated when loading
        };
        // Remove null values
        Object.keys(cleanedPhoto).forEach((k) => {
          if (cleanedPhoto[k] === null || cleanedPhoto[k] === undefined) {
            delete cleanedPhoto[k];
          }
        });
        return Object.keys(cleanedPhoto).length > 0 ? cleanedPhoto : null;
      }).filter((p) => p !== null && p !== undefined);
    } else if (key === "selectedPhotos" && Array.isArray(value)) {
      // Same aggressive cleaning for selectedPhotos
      cleaned[key] = value.map((photo) => {
        if (!photo) return null;
        const cleanedPhoto = {
          id: photo.id || null,
          baseUrl: photo.baseUrl || photo.fullUrl || photo.url || null,
        };
        Object.keys(cleanedPhoto).forEach((k) => {
          if (cleanedPhoto[k] === null || cleanedPhoto[k] === undefined) {
            delete cleanedPhoto[k];
          }
        });
        return Object.keys(cleanedPhoto).length > 0 ? cleanedPhoto : null;
      }).filter((p) => p !== null && p !== undefined);
    } else if (key === "cover" && value && typeof value === "object") {
      // Clean cover - remove heavy photo data, keep identifiers (id/baseUrl)
      const cleanedCover = {
        title: value.title || null,
        titleSize: value.titleSize || null,
        titleColor: value.titleColor || null,
        titleFont: value.titleFont || null,
        subtitle: value.subtitle || null,
        backgroundColor: value.backgroundColor || null,
        photoBorder: value.photoBorder || null,
        // Keep either id and/or baseUrl. (Older projects sometimes had baseUrl but no id.)
        photo: value.photo && typeof value.photo === "object" ? {
          id: value.photo.id || null,
          baseUrl: value.photo.baseUrl || value.photo.fullUrl || value.photo.url || null,
        } : null,
      };
      // Remove photo if it contains no identifiers
      if (cleanedCover.photo && !cleanedCover.photo.id && !cleanedCover.photo.baseUrl) cleanedCover.photo = null;
      // Remove undefined/null values
      Object.keys(cleanedCover).forEach((k) => {
        if (cleanedCover[k] === undefined || cleanedCover[k] === null) {
          delete cleanedCover[k];
        }
      });
      cleaned[key] = cleanedCover;
    } else if (typeof value === "string" && value.length > 100000) {
      // Skip very large strings (likely base64 images)
      console.log(`Skipping large string field: ${key} (${value.length} bytes)`);
      continue;
    } else {
      const cleanedValue = cleanDataForFirestore(value, maxDepth - 1);
      if (cleanedValue !== undefined && cleanedValue !== null) {
        cleaned[key] = cleanedValue;
      }
    }
  }

  return cleaned;
}

/**
 * Save a project to Firestore
 * @param {string} userId - Firebase user ID
 * @param {Object} projectData - Project data to save
 * @return {Promise<Object>} Result with project ID
 */
async function saveProject(userId, projectData) {
  try {
    const db = admin.firestore();

    // Clean the data before saving (remove large base64 strings, circular refs)
    const cleanedData = cleanDataForFirestore(projectData);

    const projectId = cleanedData.id || `project_${Date.now()}`;
    const projectName = cleanedData.title || "Untitled Project";

    const projectDoc = {
      id: projectId,
      name: projectName,
      data: cleanedData,
      userId: userId,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
    };

    // Check approximate size (Firestore limit is 1MB)
    const sizeEstimate = JSON.stringify(projectDoc).length;
    console.log(`Project data size: ${sizeEstimate} bytes`);
    if (sizeEstimate > 900000) { // Leave some margin
      console.warn(`Project data size is large: ${sizeEstimate} bytes`);
      // If still too large, remove even more data
      if (sizeEstimate > 1000000) {
        // Remove selectedPhotos entirely - they can be regenerated
        if (cleanedData.selectedPhotos) {
          console.log("Removing selectedPhotos to reduce size");
          delete cleanedData.selectedPhotos;
        }
        // Recalculate size
        const newSize = JSON.stringify({
          ...projectDoc,
          data: cleanedData,
        }).length;
        console.log(`After cleanup: ${newSize} bytes`);
        if (newSize > 1000000) {
          throw new Error(
              `Project data is too large (${newSize} bytes). ` +
            "Please reduce the number of photos or pages.",
          );
        }
      }
    }

    await db.collection("projects").doc(projectId).set(projectDoc);

    return {
      success: true,
      projectId: projectId,
    };
  } catch (error) {
    console.error("Error saving project:", error);
    // Return more detailed error information
    throw new Error(`Failed to save project: ${error.message || "Unknown error"}`);
  }
}

/**
 * Load a project from Firestore
 * @param {string} userId - Firebase user ID
 * @param {string} projectId - Project ID to load
 * @return {Promise<Object>} Project data
 */
async function loadProject(userId, projectId) {
  try {
    const db = admin.firestore();

    const projectDoc = await db.collection("projects").doc(projectId).get();

    if (!projectDoc.exists) {
      return {
        success: false,
        error: "Project not found",
      };
    }

    const project = projectDoc.data();

    // Verify ownership
    if (project.userId !== userId) {
      return {
        success: false,
        error: "Unauthorized access to project",
      };
    }

    return {
      success: true,
      data: project.data,
    };
  } catch (error) {
    console.error("Error loading project:", error);
    return {
      success: false,
      error: error.message || "Failed to load project",
    };
  }
}

/**
 * List all projects for a user
 * @param {string} userId - Firebase user ID
 * @return {Promise<Object>} List of projects
 */
async function listProjects(userId) {
  try {
    const db = admin.firestore();

    const snapshot = await db.collection("projects")
        .where("userId", "==", userId)
    // .orderBy("lastModified", "desc") // Removed to avoid composite index requirement
        .get();

    const projects = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      projects.push({
        id: data.id,
        name: data.name,
        lastModified: data.lastModified ? data.lastModified.toDate() : new Date(),
        lastModifiedIso: data.lastModified?.toDate().toISOString() || new Date().toISOString(),
      });
    });

    // Sort in memory (newest first)
    projects.sort((a, b) => b.lastModified - a.lastModified);

    // Clean up format for return
    const formattedProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      lastModified: p.lastModifiedIso,
    }));

    return {
      success: true,
      projects: formattedProjects,
    };
  } catch (error) {
    console.error("Error listing projects:", error);
    return {
      success: false,
      error: error.message || "Failed to list projects",
      projects: [],
    };
  }
}

/**
 * Delete a project
 * @param {string} userId - Firebase user ID
 * @param {string} projectId - Project ID to delete
 * @return {Promise<Object>} Result
 */
async function deleteProject(userId, projectId) {
  const db = admin.firestore();

  const projectDoc = await db.collection("projects").doc(projectId).get();

  if (!projectDoc.exists) {
    return {
      success: false,
      error: "Project not found",
    };
  }

  const project = projectDoc.data();

  // Verify ownership
  if (project.userId !== userId) {
    return {
      success: false,
      error: "Unauthorized access to project",
    };
  }

  await db.collection("projects").doc(projectId).delete();

  return {
    success: true,
  };
}

module.exports = {
  saveProject,
  loadProject,
  listProjects,
  deleteProject,
};
