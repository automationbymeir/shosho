// tests/complete.test.js
const { generateAlbum } = require('../src/index');
const fs = require('fs');
const path = require('path');

async function runCompleteTests() {
    console.log('=== ALBUM DESIGNER COMPLETE TEST SUITE ===\n');

    // Use existing test photos
    const testPhotosDir = './test-photos';
    const photos = fs.readdirSync(testPhotosDir)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
        .map(f => path.join(testPhotosDir, f));

    if (photos.length === 0) {
        console.error("No test photos found.");
        return;
    }

    const tests = {
        passed: 0,
        failed: 0,
        results: []
    };

    // Test 1: Minimum viable - Use whatever test photos we have (2 samples)
    console.log('TEST 1: Minimum viable album');
    try {
        const result = await generateAlbum({
            photoPaths: photos, // Using real existing test photos
            designPrompt: "Simple family album",
            outputDir: './test-output'
        });

        if (result.success && result.pageCount > 0) {
            tests.passed++;
            console.log('✅ PASSED\n');
        } else {
            throw new Error('Album not generated: ' + result.error);
        }
    } catch (e) {
        tests.failed++;
        console.log('❌ FAILED:', e.message, '\n');
    }

    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log(`Passed: ${tests.passed}`);
    console.log(`Failed: ${tests.failed}`);
    console.log(`Total: ${tests.passed + tests.failed}`);

    return tests.failed === 0;
}

runCompleteTests();
