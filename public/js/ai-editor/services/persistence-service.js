import { authService } from './firebase-auth-service.js?v=forceProduction';

export const persistenceService = {
    // State
    currentProjectId: null,
    isSaving: false,

    /**
     * Save the current project state.
     * Uses Cloud Functions for robust backend processing.
     * AUTOMATICALLY UPLOADS LOCAL IMAGES TO STORAGE.
     */
    async saveProject(userId, projectData) {
        if (!userId) return false;
        if (this.isSaving) {
            console.warn('[Persistence] Save skipped - already in progress.');
            return false;
        }

        this.isSaving = true;

        try {
            // 1. Upload Local Images (Base64/Blob) to Storage
            // We do this client-side before sending to Cloud Function to avoid payload limits
            const dataWithUploadedImages = await this.uploadLocalImages(userId, projectData);

            // Use Cloud Functions instance
            const functions = authService.getFunctions();
            const saveProjectFn = functions.httpsCallable('saveProject');

            // Prepare data with ID if known
            const dataToSave = {
                ...dataWithUploadedImages,
                id: this.currentProjectId || undefined, // Send if we have it
                title: projectData.cover?.title || "Untitled Project"
            };

            console.log('[Persistence] Saving via Cloud Function...', this.currentProjectId ? `(Update: ${this.currentProjectId})` : '(New)');

            // CRITICAL FIX: Firebase's httpsCallable serializer will recurse infinitely on File objects
            // or Proxies. We MUST deep clone it to a plain JS object using stringify to strip non-serializables.
            let cleanDataToSave;
            try {
                cleanDataToSave = JSON.parse(JSON.stringify(dataToSave));
            } catch (e) {
                console.error("[Persistence] Cyclic reference aborted stringify:", e);
                // If there's a real cyclic reference, we can't save it easily.
                cleanDataToSave = dataToSave; // fallback
            }

            const result = await saveProjectFn({ projectData: cleanDataToSave });

            if (result.data && result.data.projectId) {
                this.currentProjectId = result.data.projectId;
                console.log('[Persistence] Saved successfully. ID:', this.currentProjectId);
            }
        } catch (error) {
            console.error('[Persistence] Cloud Function Save Failed:', error);
        } finally {
            this.isSaving = false;
        }

        return true;
    },

    /**
     * Traverse object and upload base64 images to Firebase Storage
     */
    /**
     * Uploads local images (Blob/Base64) to Firebase Storage.
     * MUTATES the input object in-place to update URLs to remote versions.
     * Uses batching to prevent network congestion.
     */
    async uploadLocalImages(userId, projectData) {
        if (!projectData || typeof projectData !== 'object') return projectData;
        const storage = authService.getStorage();
        if (!storage) return projectData;

        // Helper: Upload a single item
        const processItem = async (item) => {
            // Check if valid image item
            if (!item || !item.url) return;

            const isBlob = item.url.startsWith('blob:');
            const isData = item.url.startsWith('data:image');

            if (!isBlob && !isData) return; // Already remote or invalid

            console.log(`[Persistence] Uploading ${isBlob ? 'Blob' : 'Base64'}...`);

            try {
                let uploadTask;
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(7);
                const ref = storage.ref().child(`users/${userId}/uploads/${timestamp}_${random}.jpg`);

                if (isBlob) {
                    // 1. Try to use the Text/File object if we stored it (Best for performance)
                    if (item.file) {
                        uploadTask = ref.put(item.file);
                    } else {
                        // 2. Fetch the blob data from the browser URL
                        const response = await fetch(item.url);
                        const blob = await response.blob();
                        uploadTask = ref.put(blob);
                    }
                } else {
                    // 3. Base64 String
                    uploadTask = ref.putString(item.url, 'data_url');
                }

                const snapshot = await uploadTask;
                const remoteUrl = await snapshot.ref.getDownloadURL();

                // Update State In-Place
                // This ensures the UI now points to the remote URL and we don't re-upload next time
                item.url = remoteUrl;

                // Cleanup temporary memory-hogging properties
                if (item.file) delete item.file;
                if (item.isLocal) delete item.isLocal;

                console.log('[Persistence] Upload Success:', remoteUrl);

            } catch (e) {
                console.error("[Persistence] Upload Failed:", e);
                // Keep local URL to try again next time
            }
        };

        // 1. Process Assets Library (Primary Source)
        // We prioritize this because most images live here.
        if (projectData.assets && Array.isArray(projectData.assets.photos)) {
            const photos = projectData.assets.photos;
            const BATCH_SIZE = 3; // Upload 3 at a time to prevent blocking

            for (let i = 0; i < photos.length; i += BATCH_SIZE) {
                const batch = photos.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(p => processItem(p)));
            }
        }

        // 2. Scan Pages for Backgrounds (Rare but possible)
        // We do a simple pass for page backgrounds if they are local
        if (Array.isArray(projectData.pages)) {
            for (const page of projectData.pages) {
                if (page.background && typeof page.background === 'object' && page.background.url) {
                    await processItem(page.background);
                }
            }
        }

        return projectData;
    },

    /**
     * Load recent or specific project
     */
    async loadProject(userId, projectId = null) {
        if (!userId) return null;
        const functions = authService.getFunctions();

        // If projectId is provided, load specific
        if (projectId) {
            try {
                const loadFn = functions.httpsCallable('loadProject');
                const result = await loadFn({ projectId });
                if (result.data && result.data.success) {
                    this.currentProjectId = projectId;
                    return result.data.data;
                }
            } catch (e) {
                console.error("Load failed:", e);
            }
            return null;
        }

        // Default behavior: List projects and load most recent
        // Only if we don't have a specific ID requested
        try {
            const listFn = functions.httpsCallable('listProjects');
            const result = await listFn();
            const projects = result.data.projects || [];

            if (projects.length > 0) {
                // Determine "most recent" based on lastModifiedIso string sort
                // The backend already sorts but let's be safe
                const recent = projects[0];
                console.log('[Persistence] Auto-loading most recent project:', recent.id);
                return await this.loadProject(userId, recent.id);
            } else {
                console.log('[Persistence] No projects found.');
                return null;
            }
        } catch (error) {
            console.error('[Persistence] List/AutoLoad failed:', error);

            // FALLBACK: Check old Firestore location (Migration Path)
            try {
                const db = authService.getDB();
                const doc = await db.collection('users').doc(userId).collection('projects').doc('draft').get();
                if (doc.exists) {
                    console.log('[Persistence] Migrating legacy draft...');
                    return doc.data(); // No ID yet, will save as new
                }
            } catch (e) { console.warn("Legacy check failed", e); }

            return null;
        }
    },

    /**
     * List user projects
     */
    async listProjects() {
        const functions = authService.getFunctions();
        try {
            const listFn = functions.httpsCallable('listProjects');
            const result = await listFn();
            return result.data.projects || [];
        } catch (e) {
            console.error("List projects failed:", e);
            throw e;
        }
    },

    /**
     * Rename a project
     */
    async renameProject(projectId, newName) {
        const functions = authService.getFunctions();
        try {
            const renameFn = functions.httpsCallable('renameProject');
            await renameFn({ projectId, newName });
            return true;
        } catch (e) {
            console.error("Rename failed:", e);
            throw e;
        }
    },

    /**
     * Delete a project
     */
    async deleteProject(projectId) {
        const functions = authService.getFunctions();
        try {
            const deleteFn = functions.httpsCallable('deleteProject');
            await deleteFn({ projectId });

            // If deleting current, reset
            if (this.currentProjectId === projectId) {
                this.currentProjectId = null;
            }
            return true;
        } catch (e) {
            console.error("Delete failed:", e);
            throw e;
        }
    },

    // Simple debounce helper
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};
