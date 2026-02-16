const { analyzeAndPosition } = require('./services/photoPositionService');

async function testPositioning() {
    // Use a public Wikimedia Commons image (Human face & body) for testing
    // Source: https://commons.wikimedia.org/wiki/File:Portrait_of_a_young_man_in_a_park.jpg
    // Dimensions approx: 3000x4000
    const testPhoto = {
        url: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Portrait_of_a_young_man_in_a_park.jpg',
        width: 3456,
        height: 5184
    };

    // Test Case: Landscape crop on a Portrait photo (challenging!)
    const layoutBox = {
        width: 800,
        height: 600 // 4:3 Aspect Ratio
    };

    try {
        console.log(`Analyzing photo (${testPhoto.width}x${testPhoto.height}) for layout (${layoutBox.width}x${layoutBox.height})...`);
        const result = await analyzeAndPosition(testPhoto.url, testPhoto, layoutBox);

        console.log('\n✅ Results:');
        console.log('Faces found:', result.analysis.faceCount);
        console.log('Objects found:', result.analysis.primaryObjects);
        console.log('\nOptimal crop:');
        console.log('  Position (x,y):', `${result.crop.x}, ${result.crop.y}`);
        console.log('  Size (w,h):', `${result.crop.width}x${result.crop.height}`);
        console.log('  Aspect Match:', (result.crop.width / result.crop.height).toFixed(2), 'vs', (layoutBox.width / layoutBox.height).toFixed(2));

    } catch (error) {
        console.error('Error:', error);
    }
}

testPositioning();
