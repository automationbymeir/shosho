/**
 * Google Photos Service
 * Handles authentication and interaction with the Google Photos Picker API.
 */

class GooglePhotosService {
    constructor() {
        this.tokenClient = null;
        this.accessToken = null;
        this.pickerApiLoaded = false;

        // CONFIGURATION
        const config = window.SHOSO_CONFIG?.GOOGLE_PHOTOS || {};
        this.CLIENT_ID = config.CLIENT_ID;
        this.API_KEY = config.API_KEY;
        this.PROJECT_ID = config.PROJECT_ID;
        this.SCOPES = config.SCOPES;
    }

    /**
     * Initialize the Google Identity Services client and Picker API
     */
    async init() {
        return new Promise((resolve, reject) => {
            // Wait for gapi to be loaded (poll)
            if (!window.gapi) {
                let attempts = 0;
                const interval = setInterval(() => {
                    attempts++;
                    if (window.gapi) {
                        clearInterval(interval);
                        this._loadPickerApi(resolve, reject);
                    } else if (attempts > 20) {
                        clearInterval(interval);
                        reject('Timeout waiting for Google API (gapi) script to load.');
                    }
                }, 100);
            } else {
                this._loadPickerApi(resolve, reject);
            }
        });
    }

    _loadPickerApi(resolve, reject) {
        if (this.pickerApiLoaded && window.google && window.google.picker) {
            return resolve();
        }
        window.gapi.load('picker', {
            callback: () => {
                // Double check it's actually there
                if (window.google && window.google.picker) {
                    this.pickerApiLoaded = true;
                    console.log('[GooglePhotos] Picker API loaded');
                    resolve();
                } else {
                    // Sometimes there's a slight delay or issue?
                    console.warn('Picker loaded but google.picker not found immediately. Retrying check...');
                    setTimeout(() => {
                        if (window.google && window.google.picker) {
                            this.pickerApiLoaded = true;
                            resolve();
                        } else {
                            reject('Google Picker Loaded but namespace google.picker missing');
                        }
                    }, 500);
                }
            },
            onerror: () => reject('Failed to load Google Picker API')
        });
    }

    /**
     * Authenticate and Request Access Token
     */
    connect() {
        return new Promise((resolve, reject) => {
            if (!window.google || !window.google.accounts) {
                // Retry/Wait logic could go here too, but usually this is fast if script loaded
                return reject('Google Identity Services script not loaded');
            }

            // Initialize token client if not already done
            if (!this.tokenClient) {
                this.tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: this.CLIENT_ID,
                    scope: this.SCOPES,
                    callback: (tokenResponse) => {
                        if (tokenResponse && tokenResponse.access_token) {
                            this.accessToken = tokenResponse.access_token;
                            console.log('[GooglePhotos] Authenticated successfully');
                            resolve(this.accessToken); // Resolves the explicit request
                        } else {
                            console.error("Token Error:", tokenResponse);
                            reject(tokenResponse);
                        }
                    },
                });
            }

            // Overriding callback to capture the promise resolution for valid flow
            this.tokenClient.callback = (tokenResponse) => {
                if (tokenResponse && tokenResponse.access_token) {
                    this.accessToken = tokenResponse.access_token;
                    resolve(this.accessToken);
                } else {
                    reject('Failed to obtain token');
                }
            }

            if (window.gapi && window.gapi.client) {
                // Sometimes helps to ensure client is set?
            }

            // Trigger the pop-up
            this.tokenClient.requestAccessToken();
        });
    }

    /**
     * Open the Google Photos Picker
     */
    async openPicker() {
        // Ensure API is loaded
        if (!this.pickerApiLoaded || !window.google || !window.google.picker) {
            console.log('[GooglePhotos] API not fully ready, initializing...');
            await this.init();
        }

        return new Promise((resolve, reject) => {
            if (!this.accessToken) {
                return reject('Not authenticated. Please Connect first.');
            }

            const pickerCallback = (data) => {
                if (data.action === google.picker.Action.PICKED) {
                    const photos = data.docs.map(doc => {
                        // Normalize Google Picker response
                        // doc.url is usually the permalink. 
                        const thumbUrl = doc.thumbnails && doc.thumbnails.length > 0 ? doc.thumbnails[doc.thumbnails.length - 1].url : doc.url;
                        const highResUrl = thumbUrl.split('=')[0] + '=w2048-h2048';

                        return {
                            id: doc.id,
                            url: highResUrl,
                            thumbnailUrl: thumbUrl,
                            name: doc.name || 'Google Photo',
                            source: 'google-photos',
                            ratio: 1.0 // unknown until loaded, default square
                        };
                    });
                    resolve(photos);
                } else if (data.action === google.picker.Action.CANCEL) {
                    // Don't reject, just resolve empty or ignore? 
                    // Rejecting causes alert error. Let's resolve empty.
                    console.log('Picker canceled');
                    resolve([]);
                }
            };

            const view = new google.picker.PhotosView();
            // Show only photos
            view.setMimeTypes('image/png,image/jpeg,image/jpg');

            const pickerBuilder = new google.picker.PickerBuilder()
                .addView(view)
                .setOAuthToken(this.accessToken)
                .setDeveloperKey(this.API_KEY)
                .setCallback(pickerCallback);

            // Fix: Title bar sometimes glitches in dark mode, but functionality is key.
            pickerBuilder.setTitle('Select Photos for Shoso');

            const picker = pickerBuilder.build();
            picker.setVisible(true);
        });
    }
}

export const googlePhotosService = new GooglePhotosService();
