import { authService } from './firebase-auth.js';

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

        // Sanitize: Remove user object and selection
        const { user, selection, ...cleanData } = projectData;
        const safeData = removeUndefined(cleanData);

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
