/**
 * Photo Resolution Tests
 * Tests photo quality, dimensions, scaling, and print-readiness
 */

// Test Runner Setup
const resolutionRunner = new TestRunner();

resolutionRunner.describe('Photo Resolution', () => {

    // ============ DIMENSION TESTS ============

    resolutionRunner.it('should detect photo dimensions correctly', () => {
        const photo = {
            width: 1920,
            height: 1080,
            naturalWidth: 1920,
            naturalHeight: 1080
        };

        const aspectRatio = photo.width / photo.height;
        assert.equal(aspectRatio.toFixed(2), '1.78', 'Should calculate 16:9 aspect ratio');
    });

    resolutionRunner.it('should identify portrait vs landscape orientation', () => {
        const portrait = { width: 1080, height: 1920 };
        const landscape = { width: 1920, height: 1080 };
        const square = { width: 1000, height: 1000 };

        const getOrientation = (photo) => {
            if (photo.width > photo.height) return 'landscape';
            if (photo.height > photo.width) return 'portrait';
            return 'square';
        };

        assert.equal(getOrientation(portrait), 'portrait', 'Should detect portrait');
        assert.equal(getOrientation(landscape), 'landscape', 'Should detect landscape');
        assert.equal(getOrientation(square), 'square', 'Should detect square');
    });

    resolutionRunner.it('should calculate DPI for print size', () => {
        const photo = { width: 3000, height: 2000 };
        const printWidth = 10; // inches
        const printHeight = 6; // inches (adjusted for clean math: 2000/6 = 333 DPI)

        const dpiWidth = photo.width / printWidth;
        const dpiHeight = photo.height / printHeight;

        assert.true(dpiWidth >= 300, 'Width DPI should be >= 300 for print');
        assert.true(dpiHeight >= 300, 'Height DPI should be >= 300 for print');
    });

    // ============ QUALITY THRESHOLD TESTS ============

    resolutionRunner.it('should flag low resolution photos', () => {
        const minPrintDPI = 300;
        const targetPrintSize = { width: 8, height: 6 }; // inches

        const minPixels = {
            width: targetPrintSize.width * minPrintDPI,  // 2400
            height: targetPrintSize.height * minPrintDPI  // 1800
        };

        const lowResPhoto = { width: 800, height: 600 };
        const highResPhoto = { width: 3000, height: 2400 };

        const isLowRes = (photo) => {
            return photo.width < minPixels.width || photo.height < minPixels.height;
        };

        assert.true(isLowRes(lowResPhoto), 'Should flag 800x600 as low res');
        assert.false(isLowRes(highResPhoto), 'Should not flag 3000x2400 as low res');
    });

    resolutionRunner.it('should calculate quality score based on resolution', () => {
        const calculateQualityScore = (photo, targetDPI = 300, targetSize = { w: 8, h: 6 }) => {
            const targetPixels = targetSize.w * targetDPI * targetSize.h * targetDPI;
            const photoPixels = photo.width * photo.height;
            const ratio = photoPixels / targetPixels;

            if (ratio >= 1) return 100;
            if (ratio >= 0.75) return 85;
            if (ratio >= 0.5) return 70;
            if (ratio >= 0.25) return 50;
            return 30;
        };

        // Target pixels = 8*300 * 6*300 = 2400 * 1800 = 4,320,000
        assert.equal(calculateQualityScore({ width: 4000, height: 3000 }), 100, 'High res = 100'); // 12M > 4.32M
        assert.equal(calculateQualityScore({ width: 2400, height: 1800 }), 100, 'Exact target = 100'); // 4.32M = 4.32M
        assert.equal(calculateQualityScore({ width: 1800, height: 1350 }), 70, 'Medium = 70'); // 2.43M / 4.32M = 0.56
        assert.equal(calculateQualityScore({ width: 1200, height: 900 }), 50, 'Low = 50'); // 1.08M / 4.32M = 0.25
        assert.equal(calculateQualityScore({ width: 400, height: 300 }), 30, 'Very low = 30'); // 0.12M / 4.32M = 0.028
    });

    resolutionRunner.it('should recommend maximum print size for photo', () => {
        const getMaxPrintSize = (photo, minDPI = 300) => {
            return {
                width: (photo.width / minDPI).toFixed(1),
                height: (photo.height / minDPI).toFixed(1),
                unit: 'inches'
            };
        };

        const photo = { width: 3000, height: 2000 };
        const maxSize = getMaxPrintSize(photo);

        assert.equal(maxSize.width, '10.0', 'Max width should be 10 inches');
        assert.equal(maxSize.height, '6.7', 'Max height should be 6.7 inches');
    });

    // ============ SCALING TESTS ============

    resolutionRunner.it('should scale photo to fit container maintaining aspect ratio', () => {
        const scaleToFit = (photo, container) => {
            const photoRatio = photo.width / photo.height;
            const containerRatio = container.width / container.height;

            let scaledWidth, scaledHeight;

            if (photoRatio > containerRatio) {
                // Photo is wider - fit to container width
                scaledWidth = container.width;
                scaledHeight = container.width / photoRatio;
            } else {
                // Photo is taller - fit to container height
                scaledHeight = container.height;
                scaledWidth = container.height * photoRatio;
            }

            return {
                width: Math.round(scaledWidth),
                height: Math.round(scaledHeight),
                scale: scaledWidth / photo.width
            };
        };

        const photo = { width: 1920, height: 1080 }; // 16:9
        const container = { width: 800, height: 600 }; // 4:3

        const scaled = scaleToFit(photo, container);

        assert.equal(scaled.width, 800, 'Width should fit container');
        assert.true(scaled.height <= 600, 'Height should not exceed container');

        // Verify aspect ratio maintained
        const originalRatio = (photo.width / photo.height).toFixed(2);
        const scaledRatio = (scaled.width / scaled.height).toFixed(2);
        assert.equal(scaledRatio, originalRatio, 'Aspect ratio should be maintained');
    });

    resolutionRunner.it('should scale photo to fill container (crop mode)', () => {
        const scaleToFill = (photo, container) => {
            const photoRatio = photo.width / photo.height;
            const containerRatio = container.width / container.height;

            let scaledWidth, scaledHeight;

            if (photoRatio > containerRatio) {
                // Photo is wider - fit to container height, crop width
                scaledHeight = container.height;
                scaledWidth = container.height * photoRatio;
            } else {
                // Photo is taller - fit to container width, crop height
                scaledWidth = container.width;
                scaledHeight = container.width / photoRatio;
            }

            // Center crop offset
            const cropX = (scaledWidth - container.width) / 2;
            const cropY = (scaledHeight - container.height) / 2;

            return {
                width: Math.round(scaledWidth),
                height: Math.round(scaledHeight),
                cropX: Math.round(cropX),
                cropY: Math.round(cropY)
            };
        };

        const photo = { width: 1920, height: 1080 };
        const container = { width: 600, height: 600 }; // Square

        const filled = scaleToFill(photo, container);

        assert.true(filled.width >= 600, 'Width should fill container');
        assert.true(filled.height >= 600, 'Height should fill container');
        assert.true(filled.cropX >= 0, 'Should have horizontal crop offset');
    });

    resolutionRunner.it('should warn when upscaling beyond threshold', () => {
        const checkUpscaleWarning = (photo, targetSize, maxUpscale = 1.5) => {
            const scaleX = targetSize.width / photo.width;
            const scaleY = targetSize.height / photo.height;
            const scale = Math.max(scaleX, scaleY);

            return {
                needsUpscale: scale > 1,
                scale: scale,
                warning: scale > maxUpscale ? 'severe' : scale > 1 ? 'mild' : 'none'
            };
        };

        const smallPhoto = { width: 400, height: 300 };
        const targetSize = { width: 800, height: 600 };

        const result = checkUpscaleWarning(smallPhoto, targetSize);

        assert.true(result.needsUpscale, 'Should detect upscaling needed');
        assert.equal(result.scale, 2, 'Scale should be 2x');
        assert.equal(result.warning, 'severe', 'Should warn severely for 2x upscale');
    });

    // ============ BATCH RESOLUTION TESTS ============

    resolutionRunner.it('should analyze resolution for batch of photos', () => {
        const analyzeBatch = (photos, minDPI = 300, targetSize = { w: 8, h: 6 }) => {
            const minPixels = targetSize.w * minDPI;

            return photos.map(photo => ({
                id: photo.id,
                width: photo.width,
                height: photo.height,
                megapixels: ((photo.width * photo.height) / 1000000).toFixed(1),
                printReady: photo.width >= minPixels,
                maxPrintWidth: (photo.width / minDPI).toFixed(1)
            }));
        };

        const photos = [
            { id: '1', width: 4000, height: 3000 },
            { id: '2', width: 1920, height: 1080 },
            { id: '3', width: 800, height: 600 }
        ];

        const analysis = analyzeBatch(photos);

        assert.arrayLength(analysis, 3, 'Should analyze all photos');
        assert.true(analysis[0].printReady, 'High res should be print ready');
        assert.false(analysis[2].printReady, 'Low res should not be print ready');
    });

    resolutionRunner.it('should sort photos by resolution quality', () => {
        const sortByQuality = (photos) => {
            return [...photos].sort((a, b) => {
                const pixelsA = a.width * a.height;
                const pixelsB = b.width * b.height;
                return pixelsB - pixelsA; // Descending
            });
        };

        const photos = [
            { id: '1', width: 800, height: 600 },
            { id: '2', width: 4000, height: 3000 },
            { id: '3', width: 1920, height: 1080 }
        ];

        const sorted = sortByQuality(photos);

        assert.equal(sorted[0].id, '2', 'Highest res should be first');
        assert.equal(sorted[2].id, '1', 'Lowest res should be last');
    });

    // ============ SLOT SIZE MATCHING TESTS ============

    resolutionRunner.it('should match photo to best slot based on resolution', () => {
        const matchPhotoToSlot = (photo, slots) => {
            const photoRatio = photo.width / photo.height;

            // Score each slot based on aspect ratio match and size match
            const scored = slots.map(slot => {
                const slotRatio = slot.width / slot.height;
                const ratioScore = 1 - Math.abs(photoRatio - slotRatio) / Math.max(photoRatio, slotRatio);

                // Prefer slots that don't require upscaling
                const scaleNeeded = Math.max(slot.width / photo.width, slot.height / photo.height);
                const scaleScore = scaleNeeded <= 1 ? 1 : 1 / scaleNeeded;

                return {
                    slot,
                    score: (ratioScore * 0.6) + (scaleScore * 0.4)
                };
            });

            scored.sort((a, b) => b.score - a.score);
            return scored[0].slot;
        };

        const photo = { width: 1920, height: 1080 }; // 16:9 landscape
        const slots = [
            { id: 'a', width: 800, height: 800 },  // Square
            { id: 'b', width: 1000, height: 562 }, // 16:9 landscape
            { id: 'c', width: 400, height: 600 }   // Portrait
        ];

        const bestSlot = matchPhotoToSlot(photo, slots);
        assert.equal(bestSlot.id, 'b', 'Should match to similar aspect ratio slot');
    });

    resolutionRunner.it('should validate photo meets slot minimum resolution', () => {
        const validateResolution = (photo, slot, minDPI = 150) => {
            // Slot dimensions in pixels (assuming 96 DPI screen)
            // For print, calculate what DPI the photo would have at this slot size
            const effectiveDPI = {
                x: photo.width / (slot.width / 96) * 96,
                y: photo.height / (slot.height / 96) * 96
            };

            const photoFitsSlot = photo.width >= slot.width && photo.height >= slot.height;

            return {
                fits: photoFitsSlot,
                effectiveDPI: Math.min(effectiveDPI.x, effectiveDPI.y),
                meetsMinDPI: Math.min(effectiveDPI.x, effectiveDPI.y) >= minDPI,
                recommendation: photoFitsSlot ? 'good' : 'consider smaller slot'
            };
        };

        const photo = { width: 1920, height: 1080 };
        const smallSlot = { width: 800, height: 450 };
        const largeSlot = { width: 2400, height: 1350 };

        const smallResult = validateResolution(photo, smallSlot);
        const largeResult = validateResolution(photo, largeSlot);

        assert.true(smallResult.fits, 'Photo should fit small slot');
        assert.false(largeResult.fits, 'Photo should not fit large slot without upscale');
    });

});

// Run the tests
resolutionRunner.run();
