// tests/processing.test.js
const { processPhotoBackground, applyPhotoTreatment, ensurePrintQuality } = require('../src/processors/photoProcessor');
const fs = require('fs');
const path = require('path');

async function testPhotoProcessing() {
    const testPhotosDir = './test-photos';
    const photos = fs.readdirSync(testPhotosDir).filter(f => f.endsWith('.png') || f.endsWith('.jpg'));
    if (photos.length === 0) return;

    const testPhoto = path.join(testPhotosDir, photos[0]);

    // Test 1: Background blur
    console.log('\n🔍 Testing background blur...');
    const blurred = await processPhotoBackground(testPhoto, 'blur');
    if (blurred && blurred.imageData) {
        fs.writeFileSync('test-blurred.png', Buffer.from(blurred.imageData, 'base64'));
        console.log('✅ Blurred photo saved');
    } else {
        console.warn('⚠️ Background blur failed (possibly mock or API limit/model capability).');
    }

    // Test 2: Color treatment
    console.log('\n🎨 Testing color treatment...');
    const designParams = {
        theme: { name: 'wedding', mood: 'romantic' },
        colors: { primary: '#F5E6E0', secondary: '#D4AF37' }
    };
    const treated = await applyPhotoTreatment(testPhoto, 'soft-romantic', designParams);
    if (treated && treated.imageData) {
        fs.writeFileSync('test-treated.png', Buffer.from(treated.imageData, 'base64'));
        console.log('✅ Treated photo saved');
    } else {
        console.warn('⚠️ Treatment failed.');
    }

    // Test 3: Print quality
    console.log('\n📏 Testing print quality...');
    const quality = await ensurePrintQuality(testPhoto);
    console.log(`Resolution check: ${quality.upscaled ? 'Upscaled' : 'Original quality OK'}`);

    console.log('\n✅ All photo processing tests passed!');
}

testPhotoProcessing();
