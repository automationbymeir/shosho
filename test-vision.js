const vision = require('@google-cloud/vision');

// No keyFilename needed!
const client = new vision.ImageAnnotatorClient();

async function testVision() {
    try {
        console.log('Testing Vision API...');
        const [result] = await client.faceDetection(
            'https://cloud.google.com/vision/docs/images/face_detection.jpg'
        );

        console.log('✅ Works!', result.faceAnnotations.length, 'faces found');
    } catch (error) {
        console.error('Error:', error.message);
    }
}

testVision();
