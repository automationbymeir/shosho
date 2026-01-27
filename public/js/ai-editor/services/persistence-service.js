import { authService } from './firebase-auth-service.js';

export const persistenceService = {
    async saveProject(userId, projectData) {
        if (!userId) return;
        const db = authService.getDB();

        // Helper to find and remove undefined values (deep scan)
        const removeUndefined = (obj) => {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }
            if (Array.isArray(obj)) {
                return obj.map(v => removeUndefined(v));
            }
            const newObj = {};
            Object.keys(obj).forEach(key => {
                const val = obj[key];
                if (val !== undefined) {
                    newObj[key] = removeUndefined(val);
                }
            });
            return newObj;
        };

        // Helper to recursively strip heavy data (base64 images)
        const sanitizeForFirestore = (obj) => {
            if (obj === null || typeof obj !== 'object') {
                return obj;
            }

            if (Array.isArray(obj)) {
                return obj.map(v => sanitizeForFirestore(v));
            }

            const newObj = {};
            Object.keys(obj).forEach(key => {
                const val = obj[key];

                // Specific Logic: Strip base64 images to prevent 413 Errors
                if (typeof val === 'string' && val.startsWith('data:image/') && val.length > 1000) {
                    // We strip it. In a real app, you'd upload to Storage and save URL.
                    // For now, we save a marker so we know it was stripped.
                    newObj[key] = null; // or "STRIPPED_BASE64"
                }
                // Specific Logic: Legacy stripping of thumbnailUrl
                else if (key === 'thumbnailUrl') {
                    // Skip
                }
                else {
                    newObj[key] = sanitizeForFirestore(val);
                }
            });
            return newObj;
        };

        // Sanitize: Remove user object and selection, and strip heavy data
        const { user, selection, ...cleanData } = projectData;

        // 1. Strip Heavy Data (Base64 imagery)
        const lightweightData = sanitizeForFirestore(cleanData);

        // 2. Remove Undefined (Essential for Firestore compliance)
        const safeData = removeUndefined(lightweightData);

        try {
            // Using a single 'draft' project for now per user
            await db.collection('users').doc(userId).collection('projects').doc('draft').set({
                ...safeData,
                updatedAt: new Date().toISOString()
            });
            console.log('[Persistence] Project saved to Firestore');
            return true;
        } catch (error) {
            console.error('[Persistence] Save failed:', error);
            return false;
        }
    },

    async loadProject(userId) {
        if (!userId) return null;
        const db = authService.getDB();
        try {
            const doc = await db.collection('users').doc(userId).collection('projects').doc('draft').get();
            if (doc.exists) {
                console.log('[Persistence] Project loaded');
                return doc.data();
            }
            return null;
        } catch (error) {
            console.error('[Persistence] Load failed:', error);
            return null;
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
