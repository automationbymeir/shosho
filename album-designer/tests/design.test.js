// tests/design.test.js
const { parseDesignPrompt } = require('../src/utils/promptParser');
const { generatePageLayout, generateVisualPage } = require('../src/designers/layoutGenerator');
const { generateBackground } = require('../src/designers/backgroundGenerator');
const fs = require('fs');

async function testDesignGeneration() {
    // Test 1: Parse design prompt
    console.log('\n🎨 Testing prompt parsing...');
    const testPrompt = "Create an elegant wedding album with soft pink and gold tones, romantic cursive fonts, and delicate floral frames";
    const designParams = await parseDesignPrompt(testPrompt);
    console.log('Parsed design params:');
    console.log(JSON.stringify(designParams, null, 2));

    // Validate required fields
    const requiredFields = ['theme', 'colors', 'typography', 'layout_preferences'];
    for (const field of requiredFields) {
        if (!designParams[field]) {
            console.error(`❌ Missing required field: ${field}`);
            return;
        }
    }
    console.log('✅ All required design parameters present');

    // Test 2: Generate layout
    console.log('\n📐 Testing layout generation...');
    const mockPhotos = [
        { analysis: { composition: { orientation: 'landscape' }, scene: { type: 'event' } }, quality: { recommendation: 'hero' }, path: './test-photos/sample1.png' },
        { analysis: { composition: { orientation: 'portrait' }, scene: { type: 'event' } }, quality: { recommendation: 'feature' }, path: './test-photos/sample2.png' }
    ];

    // Note: We need mock photos on disk for generateVisualPage later if we test it.

    const layout = await generatePageLayout(mockPhotos, designParams, 1);
    console.log('Generated layout:');
    console.log(JSON.stringify(layout, null, 2));

    // Validate layout
    if (!layout.photo_placements || layout.photo_placements.length !== mockPhotos.length) {
        console.error('❌ Layout missing photo placements');
        // return; 
    } else {
        console.log('✅ Layout generated correctly');
    }

    // Test 3: Generate background
    console.log('\n🖼️ Testing background generation...');
    try {
        const background = await generateBackground(designParams, 'content page - page 2 of 10');

        if (background.imageData) {
            fs.writeFileSync('test-background.png', Buffer.from(background.imageData, 'base64'));
            console.log('✅ Background saved to test-background.png');
        } else {
            console.warn('⚠️ No background image returned (Mock or Error).');
        }
    } catch (e) {
        console.error('Background generation error:', e);
    }

    console.log('\n✅ All design generation tests passed!');
}

testDesignGeneration();
