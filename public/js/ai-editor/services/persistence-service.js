import { authService } from './firebase-auth-service.js?v=forceProduction';

// Simple IndexedDB Wrapper
const dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open('ShosoProjectsDB', 1);
    request.onerror = event => reject("IndexedDB error: " + event.target.errorCode);
    request.onsuccess = event => resolve(event.target.result);
    request.onupgradeneeded = event => {
        const db = event.target.result;
        // Create projects store if it doesn't exist
        if (!db.objectStoreNames.contains('projects')) {
            db.createObjectStore('projects', { keyPath: 'id' });
        }
    };
});

async function localSave(project) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        const request = store.put(project);
        request.onsuccess = () => resolve(project.id);
        request.onerror = () => reject(request.error);
    });
}

async function localGet(id) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.get(id);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function localGetAll() {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['projects'], 'readonly');
        const store = transaction.objectStore('projects');
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function localDelete(id) {
    const db = await dbPromise;
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(['projects'], 'readwrite');
        const store = transaction.objectStore('projects');
        const request = store.delete(id);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
    });
}

export const persistenceService = {
    // State
    currentProjectId: null,
    isSaving: false,

    /**
     * Save the current project state.
     * Starts with LOCAL IndexedDB save (instant), then optionally syncs to cloud if logged in.
     */
    async saveProject(userId, projectData, forceCloudSync = false) {
        if (this.isSaving) {
            console.warn('[Persistence] Save skipped - already in progress.');
            return false;
        }

        this.isSaving = true;

        try {
            // 1. Assign local ID if none exists
            if (!this.currentProjectId) {
                this.currentProjectId = crypto.randomUUID();
            }

            // 2. Prepare Data for Local Storage
            // IndexedDB can handle Blobs directly, which is great for performance
            const localDataToSave = {
                id: this.currentProjectId,
                title: projectData.cover?.title || "Untitled Album",
                lastModified: Date.now(),
                state: JSON.parse(JSON.stringify(projectData)) // Deep clone to avoid proxy issues, blobs are strings here typically, but structured clone is better if real Blobs
            };

            // Convert live active session Blob URLs to Base64 *before* saving locally 
            // because blob:// URLs die when the browser closes.
            if (localDataToSave.state.assets && localDataToSave.state.assets.photos) {
                for (let photo of localDataToSave.state.assets.photos) {
                    if (photo.url && photo.url.startsWith('blob:')) {
                        try {
                            const res = await fetch(photo.url);
                            const blob = await res.blob();
                            photo.url = await new Promise((resolve, _) => {
                                const reader = new FileReader();
                                reader.onloadend = () => resolve(reader.result);
                                reader.readAsDataURL(blob);
                            });
                        } catch (e) {
                            console.warn("Failed to convert blob to base64 for local save", e);
                        }
                    }
                }
            }

            console.log(`[Persistence] Saving to Local IndexedDB (ID: ${this.currentProjectId})...`);
            await localSave(localDataToSave);

            // Trigger UI update
            this.updateSaveUI("Saved Locally");

            // 3. Cloud Sync Background (Only if User is logged in and not explicitly blocked)
            if (userId && forceCloudSync) { // Changed to require explicit flag or smart logic later, auto-syncing every 3s is heavy if slow connection
                // For now let's just upload if we have a user
                this.updateSaveUI("Syncing to Cloud...");

                const dataWithUploadedImages = await this.uploadLocalImages(userId, localDataToSave.state);
                const functions = authService.getFunctions();
                const saveProjectFn = functions.httpsCallable('saveProject');

                await saveProjectFn({ projectData: { ...dataWithUploadedImages, id: this.currentProjectId } });
                this.updateSaveUI("All Changes Saved");
            } else {
                setTimeout(() => this.updateSaveUI(""), 2000); // clear
            }

        } catch (error) {
            console.error('[Persistence] Save Failed:', error);
            this.updateSaveUI("Save Failed!");
        } finally {
            this.isSaving = false;
        }

        return true;
    },

    updateSaveUI(msg) {
        // Dispatch event or update DOM directly if available
        const btn = document.getElementById('btn-new-project');
        // Let's create a dedicated save status indicator if it doesnt exist
        let statusEl = document.getElementById('save-status-indicator');
        if (!statusEl && document.querySelector('.toolbar-group.center')) {
            statusEl = document.createElement('span');
            statusEl.id = 'save-status-indicator';
            statusEl.style.cssText = 'font-size: 0.8rem; color: #a1a1aa; margin-left: 15px; transition: opacity 0.3s;';
            document.querySelector('.toolbar-group.center').appendChild(statusEl);
        }
        if (statusEl) {
            statusEl.textContent = msg;
            statusEl.style.opacity = msg ? '1' : '0';
        }
    },

    /**
     * Uploads local images (Blob/Base64) to Firebase Storage.
     * MUTATES the input object in-place to update URLs to remote versions.
     */
    async uploadLocalImages(userId, projectData) {
        if (!projectData || typeof projectData !== 'object') return projectData;
        const storage = authService.getStorage();
        if (!storage) return projectData;

        // Helper: Upload a single item
        const processItem = async (item) => {
            if (!item || !item.url) return;
            const isData = item.url.startsWith('data:image');

            if (!isData) return; // Remote already

            console.log(`[Persistence] Uploading Base64 image to Cloud Storage...`);

            try {
                const timestamp = Date.now();
                const random = Math.random().toString(36).substring(7);
                const ref = storage.ref().child(`users/${userId}/uploads/${timestamp}_${random}.jpg`);

                const uploadTask = ref.putString(item.url, 'data_url');
                const snapshot = await uploadTask;
                const remoteUrl = await snapshot.ref.getDownloadURL();

                item.url = remoteUrl;
                console.log('[Persistence] Cloud Upload Success:', remoteUrl);
            } catch (e) {
                console.error("[Persistence] Cloud Upload Failed:", e);
            }
        };

        if (projectData.assets && Array.isArray(projectData.assets.photos)) {
            const photos = projectData.assets.photos;
            const BATCH_SIZE = 3;
            for (let i = 0; i < photos.length; i += BATCH_SIZE) {
                const batch = photos.slice(i, i + BATCH_SIZE);
                await Promise.all(batch.map(p => processItem(p)));
            }
        }

        return projectData;
    },

    /**
     * Load recent or specific project (Local Preferred, fallback to Cloud)
     */
    async loadProject(userId, projectId = null) {
        // 1. If explicit ID requested, try local first
        if (projectId) {
            const localProj = await localGet(projectId);
            if (localProj && localProj.state) {
                this.currentProjectId = projectId;
                return localProj.state;
            }
            // If explicit ID not found locally, try cloud (needs userId)
            if (userId) {
                try {
                    const functions = authService.getFunctions();
                    const loadFn = functions.httpsCallable('loadProject');
                    const result = await loadFn({ projectId });
                    if (result.data && result.data.success) {
                        this.currentProjectId = projectId;
                        // Save local mirror
                        await localSave({ id: projectId, title: result.data.data.cover?.title, lastModified: Date.now(), state: result.data.data });
                        return result.data.data;
                    }
                } catch (e) { console.error("Cloud load failed", e); }
            }
            return null;
        }

        // 2. Default Behavior: Find Most Recent Local Project
        const allLocal = await localGetAll();
        if (allLocal && allLocal.length > 0) {
            allLocal.sort((a, b) => b.lastModified - a.lastModified);
            const recent = allLocal[0];
            console.log('[Persistence] Auto-loading most recent LOCAL project:', recent.id);
            this.currentProjectId = recent.id;
            return recent.state;
        }

        // 3. If no local projects, check cloud for recovery
        if (userId) {
            try {
                const functions = authService.getFunctions();
                const listFn = functions.httpsCallable('listProjects');
                const result = await listFn();
                const projects = result.data.projects || [];

                if (projects.length > 0) {
                    const recentId = projects[0].id; // Backend sorts
                    console.log('[Persistence] Auto-loading most recent CLOUD project:', recentId);
                    return await this.loadProject(userId, recentId);
                }
            } catch (e) { console.warn("Cloud list fallback failed", e); }
        }

        return null;
    },

    /**
     * List user projects (Merge Local + Cloud conceptually, mostly local for UI)
     */
    async listProjects() {
        const local = await localGetAll();
        return local.map(p => ({
            id: p.id,
            title: p.title,
            lastModified: p.lastModified,
            source: 'local'
        })).sort((a, b) => b.lastModified - a.lastModified);
    },

    /**
     * Delete a project
     */
    async deleteProject(projectId) {
        await localDelete(projectId);

        if (authService.auth.currentUser) {
            try {
                const functions = authService.getFunctions();
                const deleteFn = functions.httpsCallable('deleteProject');
                await deleteFn({ projectId });
            } catch (e) {
                console.warn("Cloud delete failed (may not exist remotedly):", e);
            }
        }

        if (this.currentProjectId === projectId) {
            this.currentProjectId = null;
        }
        return true;
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
