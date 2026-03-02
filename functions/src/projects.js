const admin = require("firebase-admin");
const crypto = require("crypto");

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
        backgroundImageUrl: value.backgroundImageUrl || null,
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

    // Set up default collaborative structure
    const projectDoc = {
      id: projectId,
      name: projectName,
      data: cleanedData,
      userId: userId, // primary owner
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
      members: [userId],
      roles: {[userId]: "owner"},
      shareSettings: {
        isPublic: false,
        publicRole: "viewer",
        allowEditorsToShare: false,
        shareToken: null,
      },
    };

    // Check existing document to preserve roles and authorize edit
    const existingDoc = await db.collection("projects").doc(projectId).get();
    if (existingDoc.exists) {
      const existingData = existingDoc.data();
      const role = existingData.roles?.[userId];
      const isPublic = existingData.shareSettings?.isPublic;
      const publicRole = existingData.shareSettings?.publicRole;

      const isOwner = existingData.userId === userId;
      const isEditor = role === "owner" || role === "editor" || (isPublic && publicRole === "editor");

      if (!isOwner && !isEditor) {
        throw new Error("Unauthorized to save this project");
      }

      projectDoc.createdAt = existingData.createdAt || projectDoc.createdAt;
      projectDoc.userId = existingData.userId || projectDoc.userId; // maintain original owner
      projectDoc.members = existingData.members || [existingData.userId];
      projectDoc.roles = existingData.roles || {[existingData.userId]: "owner"};
      projectDoc.shareSettings = existingData.shareSettings || projectDoc.shareSettings;

      // Ensure the saving user is in the members list if they edited via a public link (and keep their role as editor)
      if (!isOwner && !projectDoc.members.includes(userId)) {
        projectDoc.members.push(userId);
        if (!projectDoc.roles[userId]) {
          projectDoc.roles[userId] = "editor";
        }
      }
    }

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

    // Verify ownership and robust member checking
    const role = project.roles?.[userId];
    const isPublic = project.shareSettings?.isPublic;
    const isOwner = project.userId === userId;

    if (!isOwner && !role && !isPublic) {
      return {
        success: false,
        error: "Unauthorized access to project",
      };
    }

    const effectiveRole = isOwner ? "owner" : (role || (isPublic ? project.shareSettings.publicRole : "viewer"));

    // Add user as a viewer to members if they accessed via public link
    if (!isOwner && !role && isPublic && !project.members?.includes(userId)) {
      await db.collection("projects").doc(projectId).update({
        members: admin.firestore.FieldValue.arrayUnion(userId),
        [`roles.${userId}`]: effectiveRole,
      });
      // In-memory update
      if (!project.members) project.members = [];
      project.members.push(userId);
      if (!project.roles) project.roles = {};
      project.roles[userId] = effectiveRole;
    }

    return {
      success: true,
      data: project.data,
      metadata: {
        role: effectiveRole,
        shareSettings: (isOwner || (effectiveRole === "editor" &&
          project.shareSettings?.allowEditorsToShare)) ? project.shareSettings : null,
        owner: project.userId,
      },
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

    // We do two queries because some legacy projects might not have the 'members' array
    const ownerSnapshot = await db.collection("projects").where("userId", "==", userId).get();
    const memberSnapshot = await db.collection("projects").where("members", "array-contains", userId).get();

    const projectsMap = new Map();

    const processDoc = (doc) => {
      const data = doc.data();
      projectsMap.set(data.id, {
        id: data.id,
        name: data.name,
        lastModified: data.lastModified ? data.lastModified.toDate() : new Date(),
        lastModifiedIso: data.lastModified?.toDate().toISOString() || new Date().toISOString(),
        role: data.userId === userId ? "owner" : (data.roles?.[userId] || "editor"),
      });
    };

    ownerSnapshot.forEach(processDoc);
    memberSnapshot.forEach(processDoc);

    const projects = Array.from(projectsMap.values());

    // Sort in memory (newest first)
    projects.sort((a, b) => b.lastModified - a.lastModified);

    // Clean up format for return
    const formattedProjects = projects.map((p) => ({
      id: p.id,
      name: p.name,
      lastModified: p.lastModifiedIso,
      role: p.role,
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
  if (project.userId !== userId && project.roles?.[userId] !== "owner") {
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

/**
 * Rename a project
 * @param {string} userId - Firebase user ID
 * @param {string} projectId - Project ID to rename
 * @param {string} newName - New name for the project
 * @return {Promise<Object>} Result
 */
async function renameProject(userId, projectId, newName) {
  const db = admin.firestore();

  const projectDoc = await db.collection("projects").doc(projectId).get();

  if (!projectDoc.exists) {
    return {
      success: false,
      error: "Project not found",
    };
  }

  const project = projectDoc.data();

  // Verify ownership/editor role
  const isOwner = project.userId === userId;
  const isEditor = project.roles?.[userId] === "owner" || project.roles?.[userId] === "editor";
  if (!isOwner && !isEditor) {
    return {
      success: false,
      error: "Unauthorized access to project. Note: you need edit access to rename.",
    };
  }

  await db.collection("projects").doc(projectId).update({
    "name": newName,
    "data.id": projectId,
    "data.title": newName,
    "data.cover.title": newName,
    "lastModified": admin.firestore.FieldValue.serverTimestamp(),
  });

  return {
    success: true,
  };
}

/**
 * Update project share settings
 * @param {string} userId - Caller ID
 * @param {string} projectId - Project ID
 * @param {Object} settings - Share settings
 */
async function updateShareSettings(userId, projectId, settings) {
  try {
    const db = admin.firestore();
    const projectDoc = await db.collection("projects").doc(projectId).get();

    if (!projectDoc.exists) throw new Error("Project not found");

    const project = projectDoc.data();
    const isOwner = project.userId === userId || project.roles?.[userId] === "owner";
    const isEditor = project.roles?.[userId] === "editor";

    if (!isOwner && !(isEditor && project.shareSettings?.allowEditorsToShare)) {
      throw new Error("Unauthorized to change share settings");
    }

    const currentShareToken = project.shareSettings?.shareToken || crypto.randomUUID();

    const newShareSettings = {
      isPublic: Boolean(settings.isPublic),
      publicRole: settings.publicRole === "editor" ? "editor" : "viewer",
      allowEditorsToShare: Boolean(settings.allowEditorsToShare),
      shareToken: currentShareToken,
    };

    await db.collection("projects").doc(projectId).update({
      shareSettings: newShareSettings,
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {success: true, shareSettings: newShareSettings, members: project.roles || {}};
  } catch (error) {
    console.error("Error updating share settings:", error);
    return {success: false, error: error.message};
  }
}

/**
 * Join a project via share token
 * @param {string} userId - User ID to add
 * @param {string} projectId - Project ID
 * @param {string} shareToken - Security token
 */
async function joinProject(userId, projectId, shareToken) {
  try {
    const db = admin.firestore();
    const projectRef = db.collection("projects").doc(projectId);
    const projectDoc = await projectRef.get();

    if (!projectDoc.exists) throw new Error("Project not found");

    const project = projectDoc.data();

    // Validate token if project has one
    if (project.shareSettings?.shareToken && project.shareSettings.shareToken !== shareToken) {
      throw new Error("Invalid share token");
    }

    if (!project.shareSettings?.isPublic) {
      throw new Error("This project is not public");
    }

    const role = project.shareSettings.publicRole || "viewer";

    // Add user
    await projectRef.update({
      members: admin.firestore.FieldValue.arrayUnion(userId),
      [`roles.${userId}`]: role,
      lastModified: admin.firestore.FieldValue.serverTimestamp(),
    });

    return {success: true, role};
  } catch (error) {
    console.error("Error joining project:", error);
    return {success: false, error: error.message};
  }
}

module.exports = {
  saveProject,
  loadProject,
  listProjects,
  deleteProject,
  renameProject,
  updateShareSettings,
  joinProject,
};
