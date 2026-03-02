/**
 * Google Photos Service (Backend Sessions Version)
 * Replaces legacy google.picker with Backend Sessions API.
 */
import { authService } from './firebase-auth-service.js';

class GooglePhotosService {
    constructor() {
        this.pollingInterval = null;
    }

    /**
     * Open the Google Photos Picker via Backend Session
     */
    /**
     * Open the Google Photos Picker via Backend Session
     */
    async openPicker() {
        // Find but do NOT show loader yet
        const loader = document.getElementById('google-photos-loader');
        const progressFill = document.querySelector('#google-photos-loader .loader-progress-fill');

        return new Promise(async (resolve, reject) => {
            try {
                const user = authService.getCurrentUser();
                if (!user) {
                    if (loader) loader.classList.remove('active');
                    return reject('User not logged in');
                }

                if (progressFill) progressFill.style.width = '20%';

                // 1. Get Functions Instance
                const functions = authService.getFunctions();

                // 2. Call createPickerSession
                const createSession = functions.httpsCallable('createPickerSession');
                let result = await createSession({});

                if (progressFill) progressFill.style.width = '30%';

                // Handle Auth Requirement (Server-Side OAuth)
                if (result.data.status === 'AUTH_REQUIRED' && result.data.authUrl) {
                    console.log('Server-side Google Auth required. Opening popup...');
                    // Hide loader temporarily for popup? Or keep logic simple.
                    // Popup is separate window.

                    let activeAuthPopup = null;
                    await new Promise((resolveAuth, rejectAuth) => {
                        const width = 600;
                        const height = 700;
                        const left = (window.screen.width - width) / 2;
                        const top = (window.screen.height - height) / 2;

                        const authPopup = window.open(
                            result.data.authUrl,
                            'Google Photos Auth',
                            `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
                        );

                        if (!authPopup || authPopup.closed || typeof authPopup.closed == 'undefined') {
                            console.warn("Popup might be blocked.");
                            alert("Please allow popups for this site.");
                            return rejectAuth(new Error('Popup blocked.'));
                        }

                        activeAuthPopup = authPopup;

                        // METHOD 1: Listen for direct postMessage (Optimization)
                        const messageHandler = (event) => {
                            if (event.data && event.data.type === 'GOOGLE_PHOTOS_AUTH_SUCCESS') {
                                cleanup();
                                if (event.data.success) {
                                    console.log("[GooglePhotos] Auth success signal via postMessage");
                                    resolveAuth();
                                } else {
                                    authPopup.close();
                                    rejectAuth(new Error('Auth failed: ' + event.data.result?.message));
                                }
                            }
                        };
                        window.addEventListener('message', messageHandler);

                        // METHOD 2: Listen for Firestore Token Update (Robust Fallback)
                        const db = authService.getDB();
                        let unsubscribe = null;

                        if (user) {
                            unsubscribe = db.collection('oauth_tokens').doc(user.uid)
                                .onSnapshot((doc) => {
                                    if (doc.exists) {
                                        cleanup();
                                        resolveAuth();
                                    }
                                }, (err) => {
                                    console.warn("[GooglePhotos] Firestore listener error:", err);
                                });
                        }

                        function cleanup() {
                            window.removeEventListener('message', messageHandler);
                            if (unsubscribe) unsubscribe();
                            if (authTimer) clearInterval(authTimer);
                        }

                        const authTimer = setInterval(() => {
                            if (authPopup.closed) {
                                setTimeout(() => {
                                    cleanup();
                                    resolveAuth(); // Optimistic retry
                                }, 1000);
                            }
                        }, 1000);
                    });

                    // Retry creation after auth
                    if (progressFill) progressFill.style.width = '40%';
                    for (let retryCount = 0; retryCount < 5; retryCount++) {
                        if (retryCount > 0) await new Promise(r => setTimeout(r, 1000));
                        result = await createSession({});
                        if (result.data.status === 'SUCCESS') break;
                        if (result.data.status !== 'AUTH_REQUIRED') break;
                    }
                }

                const { pickerUri, sessionId } = result.data;

                if (!pickerUri || !sessionId) {
                    if (loader) loader.classList.remove('active');
                    if (result.data.status === 'PHOTOS_NOT_ACTIVE') {
                        throw new Error(result.data.message || 'Google Photos account not active.');
                    }
                    return resolve([]); // Cancelled
                }

                // 3. Open Popup (or Reuse existing Auth Popup to bypass blockers!)
                if (progressFill) progressFill.style.width = '50%';

                const width = 800;
                const height = 650;
                const left = (window.screen.width - width) / 2;
                const top = (window.screen.height - height) / 2;

                let popup = null;
                // If we have an existing open auth popup, reuse it to avoid popup blockers wiping out the user gesture
                if (result.data.status === 'AUTH_REQUIRED' || document.activeElement) {
                    // Try to reuse or open cleanly
                }

                if (typeof activeAuthPopup !== 'undefined' && activeAuthPopup && !activeAuthPopup.closed) {
                    popup = activeAuthPopup;
                    popup.location.href = pickerUri;
                } else {
                    popup = window.open(
                        pickerUri,
                        'Google Photos Picker',
                        `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes,status=yes`
                    );
                }

                if (!popup) {
                    if (loader) loader.classList.remove('active');
                    return reject('Popup blocked. Please allow popups for this site.');
                }

                // 4. Poll for Completion
                const checkSession = functions.httpsCallable('checkPickerSession');
                const startTime = Date.now();
                let ignorePopupState = false;

                this.pollingInterval = setInterval(async () => {
                    const elapsed = Date.now() - startTime;

                    if (popup.closed && !ignorePopupState) {
                        if (elapsed < 3000) {
                            ignorePopupState = true;
                        } else {
                            clearInterval(this.pollingInterval);
                            // Cleanup logic...
                            let foundComplete = false;
                            // Check loop... see original for full
                            try {
                                const finalCheck = await checkSession({ sessionId });
                                if (finalCheck?.data?.complete) {
                                    await processAndResolve(finalCheck.data);
                                    foundComplete = true;
                                }
                            } catch (e) { }

                            if (!foundComplete) {
                                if (loader) loader.classList.remove('active');
                                resolve([]);
                            }
                            return;
                        }
                    }

                    // Timeout
                    if (Date.now() - startTime > 120000) {
                        clearInterval(this.pollingInterval);
                        if (!popup.closed) popup.close();
                        if (loader) loader.classList.remove('active');
                        reject(new Error('Picker timed out'));
                        return;
                    }

                    try {
                        const checkResult = await checkSession({ sessionId });
                        const sessionData = checkResult.data;

                        if (sessionData.complete) {
                            clearInterval(this.pollingInterval);
                            if (!popup.closed) popup.close();
                            if (progressFill) progressFill.style.width = '70%';
                            await processAndResolve(sessionData);
                        } else if (sessionData.error) {
                            clearInterval(this.pollingInterval);
                            if (!popup.closed) popup.close();
                            if (loader) loader.classList.remove('active');
                            reject(new Error(sessionData.error));
                        }
                    } catch (e) {
                        // ignore
                    }
                }, 2000);

                const processAndResolve = async (sessionData) => {
                    let photos = (sessionData.photos || []).map(p => {
                        // Ensure baseUrl is clean
                        const baseUrl = p.baseUrl;

                        // Use =d parameter to get original full resolution image
                        // This preserves the original quality without any downscaling
                        let highResUrl = baseUrl;

                        // Strip any existing sizing parameters and add =d for original resolution
                        if (baseUrl.includes('=w') || baseUrl.includes('=h') || baseUrl.includes('=s')) {
                            // Remove existing sizing parameters
                            highResUrl = baseUrl.split('=')[0] + '=d';
                        } else {
                            // Add =d parameter for original resolution
                            highResUrl = baseUrl + '=d';
                        }

                        return {
                            id: p.id,
                            url: highResUrl, // Original Full Resolution
                            thumbnailUrl: null,
                            rawBaseUrl: p.baseUrl,
                            name: p.filename || 'Google Photo',
                            source: 'google-photos',
                            ratio: 1.0
                        };
                    });

                    // Fetch Thumbnails (Legacy/Layout) AND Pre-validate High Res?
                    // For speed, just fetch thumbnails for sidebar.
                    // The main app will handle HighRes errors on demand via the new RenderEngine proxy.

                    if (photos.length > 0) {
                        // Only show the big loader now that we actually have photos to process
                        if (loader) loader.classList.add('active');
                        if (progressFill) progressFill.style.width = '40%';

                        try {
                            const fetchThumbnails = functions.httpsCallable('fetchThumbnailBatch');
                            // Use rawBaseUrl
                            const baseUrls = photos.map(p => p.rawBaseUrl);
                            const BATCH_SIZE = 10;
                            const thumbMap = {};

                            for (let i = 0; i < baseUrls.length; i += BATCH_SIZE) {
                                const chunk = baseUrls.slice(i, i + BATCH_SIZE);
                                // Validating:
                                if (progressFill) {
                                    const p = 80 + (i / baseUrls.length) * 20;
                                    progressFill.style.width = `${p}%`;
                                }
                                try {
                                    const thumbResult = await fetchThumbnails({ baseUrls: chunk });
                                    if (thumbResult.data && thumbResult.data.thumbnails) {
                                        thumbResult.data.thumbnails.forEach(t => {
                                            if (t.thumbnailUrl) thumbMap[t.baseUrl] = t.thumbnailUrl;
                                        });
                                    }
                                } catch (chunkErr) { console.error(chunkErr); }
                            }

                            photos = photos.map(p => ({
                                ...p,
                                // Use valid thumb or placeholder
                                thumbnailUrl: thumbMap[p.rawBaseUrl] || 'data:image/svg+xml;base64,...(error)'
                            }));
                        } catch (err) {
                            console.error(err);
                        }
                    }

                    if (progressFill) progressFill.style.width = '100%';
                    setTimeout(() => {
                        if (loader) loader.classList.remove('active');
                    }, 500);

                    console.log("Resolving with photos:", photos);
                    resolve(photos);
                };

            } catch (e) {
                if (loader) loader.classList.remove('active');
                console.error("Picker Session Error:", e);
                reject(e);
            }
        });
    }

    /**
     * Fetch high res image via backend proxy
     * Uses Cloud Function to fetch as Data URI, bypassing CORS/403.
     */
    async fetchHighResImage(url) {
        try {
            const functions = authService.getFunctions();
            const fetchHighRes = functions.httpsCallable('fetchHighResImage');
            const result = await fetchHighRes({ url: url });
            if (result.data && result.data.success && result.data.dataUri) {
                return result.data.dataUri;
            }
            throw new Error(result.data.error || 'Failed to fetch');
        } catch (e) {
            console.error("Proxy Fetch Error:", e);
            throw e;
        }
    }

    /**
     * Refresh a batch of media item URLs
     * @param {string} userId
     * @param {Array<string>} mediaItemIds
     */
    async refreshMediaItemUrls(userId, mediaItemIds) {
        try {
            const functions = authService.getFunctions();
            const refreshUrls = functions.httpsCallable('refreshMediaItemUrls');

            // Chunking if necessary (API limit usually 50?)
            // For now send all
            const result = await refreshUrls({ mediaItemIds: mediaItemIds });

            if (result.data && result.data.results) {
                const map = {};
                result.data.results.forEach(item => {
                    if (item.mediaItem) {
                        map[item.mediaItem.id] = item.mediaItem.baseUrl;
                    }
                });
                return { success: true, urls: map };
            }
            return { success: false };

        } catch (e) {
            console.error("Refresh URLs Failed:", e);
            throw e;
        }
    }

    // Connect is no longer needed client-side as backend handles tokens,
    // but app.js might call it. We'll stub it to satisfy interface.
    async connect() {
        return Promise.resolve(true);
    }
}

export const googlePhotosService = new GooglePhotosService();
