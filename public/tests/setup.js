/**
 * Test Setup - Utilities, Mocks, and Helpers
 */

// ============ TEST FRAMEWORK ============
class TestRunner {
    constructor() {
        this.tests = [];
        this.results = { passed: 0, failed: 0, skipped: 0 };
        this.currentSuite = null;
    }

    describe(name, fn) {
        this.currentSuite = name;
        console.log(`\n📦 ${name}`);
        fn();
        this.currentSuite = null;
    }

    it(name, fn) {
        this.tests.push({
            suite: this.currentSuite,
            name,
            fn
        });
    }

    async run() {
        console.log('🧪 Running tests...\n');
        const startTime = Date.now();

        for (const test of this.tests) {
            try {
                await test.fn();
                this.results.passed++;
                console.log(`  ✅ ${test.name}`);
            } catch (error) {
                this.results.failed++;
                console.log(`  ❌ ${test.name}`);
                console.log(`     Error: ${error.message}`);
            }
        }

        const duration = Date.now() - startTime;
        this.printSummary(duration);
        return this.results;
    }

    printSummary(duration) {
        console.log('\n' + '='.repeat(50));
        console.log('📊 TEST RESULTS');
        console.log('='.repeat(50));
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏱️ Duration: ${duration}ms`);
        if (this.results.passed + this.results.failed > 0) {
            console.log(`📈 Pass Rate: ${((this.results.passed / (this.results.passed + this.results.failed)) * 100).toFixed(1)}%`);
        } else {
            console.log(`📈 Pass Rate: N/A`);
        }
    }
}

// ============ ASSERTIONS ============
const assert = {
    equal(actual, expected, message = '') {
        if (actual !== expected) {
            throw new Error(`${message} Expected ${expected}, got ${actual}`);
        }
    },

    deepEqual(actual, expected, message = '') {
        if (JSON.stringify(actual) !== JSON.stringify(expected)) {
            throw new Error(`${message} Objects not equal. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
        }
    },

    true(value, message = '') {
        if (value !== true) {
            throw new Error(`${message} Expected true, got ${value}`);
        }
    },

    false(value, message = '') {
        if (value !== false) {
            throw new Error(`${message} Expected false, got ${value}`);
        }
    },

    exists(value, message = '') {
        if (value === null || value === undefined) {
            throw new Error(`${message} Value is null or undefined`);
        }
    },

    throws(fn, expectedError = null, message = '') {
        let threw = false;
        let error = null;
        try {
            fn();
        } catch (e) {
            threw = true;
            error = e;
        }
        if (!threw) {
            throw new Error(`${message} Expected function to throw`);
        }
        if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`${message} Expected error "${expectedError}", got "${error.message}"`);
        }
    },

    async asyncThrows(fn, expectedError = null, message = '') {
        let threw = false;
        let error = null;
        try {
            await fn();
        } catch (e) {
            threw = true;
            error = e;
        }
        if (!threw) {
            throw new Error(`${message} Expected function to throw`);
        }
        if (expectedError && !error.message.includes(expectedError)) {
            throw new Error(`${message} Expected error "${expectedError}", got "${error.message}"`);
        }
    },

    arrayLength(arr, length, message = '') {
        if (arr.length !== length) {
            throw new Error(`${message} Expected array length ${length}, got ${arr.length}`);
        }
    },

    contains(arr, item, message = '') {
        if (!arr.includes(item)) {
            throw new Error(`${message} Array does not contain ${item}`);
        }
    },

    typeOf(value, type, message = '') {
        if (typeof value !== type) {
            throw new Error(`${message} Expected type ${type}, got ${typeof value}`);
        }
    },

    instanceOf(value, constructor, message = '') {
        if (!(value instanceof constructor)) {
            throw new Error(`${message} Not instance of ${constructor.name}`);
        }
    }
};

// ============ MOCKS ============

// Mock Google Photos Service
class MockGooglePhotosService {
    constructor() {
        this.mockPhotos = [];
        this.isAuthenticated = false;
    }

    async authenticate() {
        this.isAuthenticated = true;
        return { success: true, user: { name: 'Test User' } };
    }

    async getPhotos(albumId = null) {
        if (!this.isAuthenticated) throw new Error('Not authenticated');
        return this.mockPhotos;
    }

    async getAlbums() {
        if (!this.isAuthenticated) throw new Error('Not authenticated');
        return [
            { id: 'album1', title: 'Test Album 1', photoCount: 10 },
            { id: 'album2', title: 'Test Album 2', photoCount: 5 }
        ];
    }

    setMockPhotos(photos) {
        this.mockPhotos = photos;
    }

    reset() {
        this.mockPhotos = [];
        this.isAuthenticated = false;
    }
}

// Mock AI Service
class MockAIService {
    constructor() {
        this.responses = {};
        this.calls = [];
    }

    setResponse(method, response) {
        this.responses[method] = response;
    }

    async analyzePhoto(imageBase64) {
        this.calls.push({ method: 'analyzePhoto', args: [imageBase64] });
        return this.responses.analyzePhoto || {
            faces: { count: 1, descriptions: ['Person smiling'] },
            scene: { type: 'outdoor', description: 'Beach scene' },
            colors: { dominant: ['#87CEEB', '#F5DEB3'], mood: 'warm' },
            quality: { score: 85, issues: [] },
            tags: ['beach', 'vacation', 'sunny']
        };
    }

    async generateAlbumPage(photos, designPrompt) {
        this.calls.push({ method: 'generateAlbumPage', args: [photos, designPrompt] });
        return this.responses.generateAlbumPage || {
            base64: createMockImageBase64(),
            mimeType: 'image/png'
        };
    }

    async generateBackground(style, colors, mood) {
        this.calls.push({ method: 'generateBackground', args: [style, colors, mood] });
        return this.responses.generateBackground || {
            base64: createMockImageBase64(),
            mimeType: 'image/png'
        };
    }

    async applyFrame(photoBase64, frameStyle, colors) {
        this.calls.push({ method: 'applyFrame', args: [photoBase64, frameStyle, colors] });
        return this.responses.applyFrame || {
            base64: createMockImageBase64(),
            mimeType: 'image/png'
        };
    }

    getCalls(method = null) {
        if (method) return this.calls.filter(c => c.method === method);
        return this.calls;
    }

    reset() {
        this.responses = {};
        this.calls = [];
    }
}

// Mock Firebase Auth
class MockFirebaseAuth {
    constructor() {
        this.currentUser = null;
    }

    async signIn(email, password) {
        this.currentUser = { uid: 'test-uid', email };
        return this.currentUser;
    }

    async signOut() {
        this.currentUser = null;
    }

    onAuthStateChanged(callback) {
        callback(this.currentUser);
        return () => { }; // Unsubscribe function
    }

    reset() {
        this.currentUser = null;
    }
}

// Mock Persistence Service
class MockPersistenceService {
    constructor() {
        this.storage = {};
    }

    async save(key, data) {
        this.storage[key] = JSON.parse(JSON.stringify(data));
        return { success: true };
    }

    async load(key) {
        return this.storage[key] || null;
    }

    async delete(key) {
        delete this.storage[key];
        return { success: true };
    }

    async list() {
        return Object.keys(this.storage);
    }

    reset() {
        this.storage = {};
    }
}

// ============ TEST HELPERS ============

// Create mock image base64 (1x1 pixel PNG)
function createMockImageBase64() {
    return 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
}

// Create mock photo object
function createMockPhoto(overrides = {}) {
    return {
        id: `photo_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        base64: createMockImageBase64(),
        mimeType: 'image/jpeg',
        width: 1920,
        height: 1080,
        filename: 'test-photo.jpg',
        ...overrides
    };
}

// Create mock album state
function createMockAlbumState(overrides = {}) {
    return {
        id: `album_${Date.now()}`,
        title: 'Test Album',
        theme: 'wedding',
        colors: { primary: '#F5E6E0', secondary: '#D4AF37' },
        pages: [],
        photos: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
        ...overrides
    };
}

// Wait helper
function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// DOM helper - create test container
function createTestContainer() {
    const container = document.createElement('div');
    container.id = 'test-container';
    container.style.cssText = 'position:absolute;left:-9999px;';
    document.body.appendChild(container);
    return container;
}

// DOM helper - cleanup
function cleanupTestContainer() {
    const container = document.getElementById('test-container');
    if (container) container.remove();
}

// Export everything
window.TestRunner = TestRunner;
window.assert = assert;
window.MockGooglePhotosService = MockGooglePhotosService;
window.MockAIService = MockAIService;
window.MockFirebaseAuth = MockFirebaseAuth;
window.MockPersistenceService = MockPersistenceService;
window.createMockImageBase64 = createMockImageBase64;
window.createMockPhoto = createMockPhoto;
window.createMockAlbumState = createMockAlbumState;
window.wait = wait;
window.createTestContainer = createTestContainer;
window.cleanupTestContainer = cleanupTestContainer;
