/**
 * Text Alignment Tests
 * Tests text positioning, alignment, spacing, and overflow handling
 */

const alignmentRunner = new TestRunner();

alignmentRunner.describe('Text Alignment', () => {

    // ============ HORIZONTAL ALIGNMENT TESTS ============

    alignmentRunner.it('should calculate left-aligned text position', () => {
        const calculatePosition = (text, container, alignment) => {
            const mockTextWidth = text.length * 10; // Simplified: 10px per char

            switch (alignment) {
                case 'left':
                    return container.x + container.padding;
                case 'center':
                    return container.x + (container.width - mockTextWidth) / 2;
                case 'right':
                    return container.x + container.width - mockTextWidth - container.padding;
                default:
                    return container.x;
            }
        };

        const container = { x: 100, width: 500, padding: 20 };
        const text = 'Hello World'; // 11 chars * 10px = 110px

        const leftPos = calculatePosition(text, container, 'left');
        assert.equal(leftPos, 120, 'Left aligned should start at x + padding');
    });

    alignmentRunner.it('should calculate center-aligned text position', () => {
        const calculateCenterX = (textWidth, containerWidth, containerX) => {
            return containerX + (containerWidth - textWidth) / 2;
        };

        const textWidth = 200;
        const container = { x: 100, width: 600 };

        const centerX = calculateCenterX(textWidth, container.width, container.x);
        assert.equal(centerX, 300, 'Text should be centered at x=300');
    });

    alignmentRunner.it('should calculate right-aligned text position', () => {
        const calculateRightX = (textWidth, containerWidth, containerX, padding = 0) => {
            return containerX + containerWidth - textWidth - padding;
        };

        const textWidth = 150;
        const container = { x: 50, width: 500 };

        const rightX = calculateRightX(textWidth, container.width, container.x, 10);
        assert.equal(rightX, 390, 'Right aligned text should end at container edge - padding');
    });

    // ============ VERTICAL ALIGNMENT TESTS ============

    alignmentRunner.it('should calculate top-aligned text position', () => {
        const calculateTopY = (containerY, padding, fontSize) => {
            return containerY + padding + fontSize; // Baseline adjustment
        };

        const container = { y: 100, padding: 20 };
        const fontSize = 24;

        const topY = calculateTopY(container.y, container.padding, fontSize);
        assert.equal(topY, 144, 'Top aligned text Y position');
    });

    alignmentRunner.it('should calculate middle-aligned text position', () => {
        const calculateMiddleY = (containerY, containerHeight, fontSize) => {
            return containerY + (containerHeight / 2) + (fontSize / 3); // Approximate baseline
        };

        const container = { y: 100, height: 200 };
        const fontSize = 24;

        const middleY = calculateMiddleY(container.y, container.height, fontSize);
        assert.equal(middleY, 208, 'Middle aligned text Y position');
    });

    alignmentRunner.it('should calculate bottom-aligned text position', () => {
        const calculateBottomY = (containerY, containerHeight, padding) => {
            return containerY + containerHeight - padding;
        };

        const container = { y: 100, height: 200, padding: 20 };

        const bottomY = calculateBottomY(container.y, container.height, container.padding);
        assert.equal(bottomY, 280, 'Bottom aligned text Y position');
    });

    // ============ TEXT BOX ALIGNMENT TESTS ============

    alignmentRunner.it('should align text box within slot', () => {
        const alignTextBox = (textBox, slot, hAlign, vAlign) => {
            let x, y;

            // Horizontal
            switch (hAlign) {
                case 'left':
                    x = slot.x + slot.padding;
                    break;
                case 'center':
                    x = slot.x + (slot.width - textBox.width) / 2;
                    break;
                case 'right':
                    x = slot.x + slot.width - textBox.width - slot.padding;
                    break;
            }

            // Vertical
            switch (vAlign) {
                case 'top':
                    y = slot.y + slot.padding;
                    break;
                case 'middle':
                    y = slot.y + (slot.height - textBox.height) / 2;
                    break;
                case 'bottom':
                    y = slot.y + slot.height - textBox.height - slot.padding;
                    break;
            }

            return { x, y };
        };

        const textBox = { width: 200, height: 50 };
        const slot = { x: 100, y: 100, width: 600, height: 400, padding: 20 };

        // Test center-middle
        const centerMiddle = alignTextBox(textBox, slot, 'center', 'middle');
        assert.equal(centerMiddle.x, 300, 'Center X');
        assert.equal(centerMiddle.y, 275, 'Middle Y');

        // Test right-bottom
        const rightBottom = alignTextBox(textBox, slot, 'right', 'bottom');
        assert.equal(rightBottom.x, 480, 'Right X');
        assert.equal(rightBottom.y, 430, 'Bottom Y');
    });

    // ============ MULTI-LINE TEXT TESTS ============

    alignmentRunner.it('should calculate line height spacing', () => {
        const calculateLinePositions = (text, fontSize, lineHeight, startY) => {
            const lines = text.split('\n');
            const actualLineHeight = fontSize * lineHeight;

            return lines.map((line, index) => ({
                text: line,
                y: startY + (index * actualLineHeight)
            }));
        };

        const text = 'Line 1\nLine 2\nLine 3';
        const fontSize = 24;
        const lineHeight = 1.5;
        const startY = 100;

        const positions = calculateLinePositions(text, fontSize, lineHeight, startY);

        assert.arrayLength(positions, 3, 'Should have 3 lines');
        assert.equal(positions[0].y, 100, 'First line at startY');
        assert.equal(positions[1].y, 136, 'Second line at startY + lineHeight');
        assert.equal(positions[2].y, 172, 'Third line at startY + 2*lineHeight');
    });

    alignmentRunner.it('should center multi-line text block', () => {
        const centerTextBlock = (lines, containerWidth, measureText) => {
            return lines.map(line => {
                const textWidth = measureText(line);
                return {
                    text: line,
                    x: (containerWidth - textWidth) / 2
                };
            });
        };

        const mockMeasureText = (text) => text.length * 12;
        const lines = ['Short', 'Much Longer Line', 'Medium Line'];
        const containerWidth = 600;

        const centered = centerTextBlock(lines, containerWidth, mockMeasureText);

        // Each line should have different X based on its width
        assert.true(centered[0].x > centered[1].x, 'Shorter line more offset than longer');
        assert.true(centered[2].x > centered[1].x, 'Medium line between');
    });

    alignmentRunner.it('should handle text overflow with ellipsis', () => {
        const truncateWithEllipsis = (text, maxWidth, measureText) => {
            const ellipsis = '...';

            if (measureText(text) <= maxWidth) {
                return text;
            }

            let truncated = text;
            while (measureText(truncated + ellipsis) > maxWidth && truncated.length > 0) {
                truncated = truncated.slice(0, -1);
            }

            return truncated + ellipsis;
        };

        const mockMeasureText = (text) => text.length * 10;
        const longText = 'This is a very long text that should be truncated';
        const maxWidth = 200;

        const truncated = truncateWithEllipsis(longText, maxWidth, mockMeasureText);

        assert.true(truncated.endsWith('...'), 'Should end with ellipsis');
        assert.true(mockMeasureText(truncated) <= maxWidth, 'Should fit within maxWidth');
    });

    // ============ TEXT ELEMENT POSITIONING TESTS ============

    alignmentRunner.it('should position title text element correctly', () => {
        const positionTitle = (config, pageWidth, pageHeight) => {
            const defaults = {
                fontSize: 48,
                fontFamily: 'Arial',
                color: '#000000',
                alignment: 'center',
                marginTop: 50
            };

            const settings = { ...defaults, ...config };

            return {
                x: settings.alignment === 'center' ? pageWidth / 2 :
                    settings.alignment === 'right' ? pageWidth - 50 : 50,
                y: settings.marginTop + settings.fontSize,
                textAlign: settings.alignment,
                fontSize: settings.fontSize,
                fontFamily: settings.fontFamily,
                color: settings.color
            };
        };

        const pageWidth = 800;
        const pageHeight = 600;

        const centered = positionTitle({}, pageWidth, pageHeight);
        assert.equal(centered.x, 400, 'Centered title at page center');
        assert.equal(centered.textAlign, 'center', 'Should have center alignment');

        const leftAligned = positionTitle({ alignment: 'left' }, pageWidth, pageHeight);
        assert.equal(leftAligned.x, 50, 'Left title at margin');
    });

    alignmentRunner.it('should position caption text element correctly', () => {
        const positionCaption = (photoSlot, config) => {
            const defaults = {
                fontSize: 14,
                position: 'below', // 'below', 'above', 'overlay-bottom'
                alignment: 'center',
                padding: 10
            };

            const settings = { ...defaults, ...config };

            let x, y;

            switch (settings.position) {
                case 'below':
                    y = photoSlot.y + photoSlot.height + settings.padding;
                    break;
                case 'above':
                    y = photoSlot.y - settings.padding - settings.fontSize;
                    break;
                case 'overlay-bottom':
                    y = photoSlot.y + photoSlot.height - settings.padding - settings.fontSize;
                    break;
            }

            switch (settings.alignment) {
                case 'left':
                    x = photoSlot.x;
                    break;
                case 'center':
                    x = photoSlot.x + photoSlot.width / 2;
                    break;
                case 'right':
                    x = photoSlot.x + photoSlot.width;
                    break;
            }

            return { x, y, textAlign: settings.alignment };
        };

        const photoSlot = { x: 100, y: 100, width: 400, height: 300 };

        const belowCenter = positionCaption(photoSlot, { position: 'below', alignment: 'center' });
        assert.equal(belowCenter.y, 410, 'Caption below photo');
        assert.equal(belowCenter.x, 300, 'Caption centered with photo');

        const overlayLeft = positionCaption(photoSlot, { position: 'overlay-bottom', alignment: 'left' });
        // y = photoSlot.y + photoSlot.height - padding - fontSize = 100 + 300 - 10 - 14 = 376
        assert.equal(overlayLeft.y, 376, 'Overlay at bottom of photo');
        assert.equal(overlayLeft.x, 100, 'Overlay left aligned');
    });

    // ============ TEXT BOUNDS TESTS ============

    alignmentRunner.it('should calculate text bounding box', () => {
        const calculateTextBounds = (text, x, y, fontSize, alignment, measureText) => {
            const width = measureText(text);
            const height = fontSize * 1.2; // Line height

            let left;
            switch (alignment) {
                case 'left':
                    left = x;
                    break;
                case 'center':
                    left = x - width / 2;
                    break;
                case 'right':
                    left = x - width;
                    break;
            }

            return {
                left,
                top: y - fontSize,
                right: left + width,
                bottom: y + (height - fontSize),
                width,
                height
            };
        };

        const mockMeasureText = (text) => text.length * 12;

        const bounds = calculateTextBounds('Hello', 200, 100, 24, 'center', mockMeasureText);

        assert.equal(bounds.width, 60, 'Width based on text length');
        assert.equal(bounds.left, 170, 'Left offset for center alignment');
        assert.equal(bounds.right, 230, 'Right = left + width');
    });

    alignmentRunner.it('should detect text overlap with photos', () => {
        const detectOverlap = (textBounds, photoSlots) => {
            const overlaps = [];

            for (const slot of photoSlots) {
                const slotBounds = {
                    left: slot.x,
                    top: slot.y,
                    right: slot.x + slot.width,
                    bottom: slot.y + slot.height
                };

                const hasOverlap = !(
                    textBounds.right < slotBounds.left ||
                    textBounds.left > slotBounds.right ||
                    textBounds.bottom < slotBounds.top ||
                    textBounds.top > slotBounds.bottom
                );

                if (hasOverlap) {
                    overlaps.push(slot.id);
                }
            }

            return overlaps;
        };

        const textBounds = { left: 150, top: 80, right: 250, bottom: 110 };
        const photoSlots = [
            { id: 'photo1', x: 100, y: 100, width: 200, height: 150 }, // Overlaps
            { id: 'photo2', x: 400, y: 100, width: 200, height: 150 }  // No overlap
        ];

        const overlaps = detectOverlap(textBounds, photoSlots);

        assert.arrayLength(overlaps, 1, 'Should detect 1 overlap');
        assert.contains(overlaps, 'photo1', 'Should overlap with photo1');
    });

    // ============ RTL TEXT TESTS ============

    alignmentRunner.it('should handle RTL text alignment', () => {
        const alignRTLText = (text, containerWidth, alignment, padding = 0) => {
            // For RTL, 'left' visually becomes right and vice versa
            const isRTL = /[\u0590-\u05FF\u0600-\u06FF]/.test(text);

            if (!isRTL) {
                return {
                    x: alignment === 'left' ? padding :
                        alignment === 'right' ? containerWidth - padding :
                            containerWidth / 2,
                    direction: 'ltr'
                };
            }

            // RTL: swap left/right
            return {
                x: alignment === 'left' ? containerWidth - padding :
                    alignment === 'right' ? padding :
                        containerWidth / 2,
                direction: 'rtl'
            };
        };

        const hebrewText = 'שלום עולם';
        const englishText = 'Hello World';
        const containerWidth = 800;

        const hebrewLeft = alignRTLText(hebrewText, containerWidth, 'left', 20);
        assert.equal(hebrewLeft.x, 780, 'Hebrew "left" should be visually right');
        assert.equal(hebrewLeft.direction, 'rtl', 'Should be RTL');

        const englishLeft = alignRTLText(englishText, containerWidth, 'left', 20);
        assert.equal(englishLeft.x, 20, 'English left should stay left');
        assert.equal(englishLeft.direction, 'ltr', 'Should be LTR');
    });

    // ============ TEXT STYLE CONSISTENCY TESTS ============

    alignmentRunner.it('should apply consistent text styles across pages', () => {
        const textStyles = {
            title: { fontSize: 48, fontWeight: 'bold', color: '#333333' },
            subtitle: { fontSize: 24, fontWeight: 'normal', color: '#666666' },
            caption: { fontSize: 14, fontWeight: 'normal', color: '#888888' },
            date: { fontSize: 12, fontWeight: 'normal', color: '#999999' }
        };

        const applyStyle = (text, styleName) => {
            const style = textStyles[styleName];
            if (!style) {
                throw new Error(`Unknown style: ${styleName}`);
            }
            return { text, ...style };
        };

        const title = applyStyle('My Album', 'title');
        assert.equal(title.fontSize, 48, 'Title should have correct size');
        assert.equal(title.fontWeight, 'bold', 'Title should be bold');

        const caption = applyStyle('Summer 2024', 'caption');
        assert.equal(caption.fontSize, 14, 'Caption should have correct size');
    });

    alignmentRunner.it('should validate text does not exceed container', () => {
        const validateTextFit = (text, container, fontSize, measureText) => {
            const textWidth = measureText(text);
            const textHeight = fontSize * 1.2;

            const horizontalPadding = container.padding * 2;
            const verticalPadding = container.padding * 2;

            return {
                fitsHorizontally: textWidth <= container.width - horizontalPadding,
                fitsVertically: textHeight <= container.height - verticalPadding,
                overflow: {
                    horizontal: Math.max(0, textWidth - (container.width - horizontalPadding)),
                    vertical: Math.max(0, textHeight - (container.height - verticalPadding))
                }
            };
        };

        const mockMeasureText = (text) => text.length * 12;

        const shortText = 'Short';
        const longText = 'This is a very long text that probably will not fit in the container';
        const container = { width: 200, height: 50, padding: 10 };
        const fontSize = 24;

        const shortResult = validateTextFit(shortText, container, fontSize, mockMeasureText);
        assert.true(shortResult.fitsHorizontally, 'Short text should fit');

        const longResult = validateTextFit(longText, container, fontSize, mockMeasureText);
        assert.false(longResult.fitsHorizontally, 'Long text should not fit');
        assert.true(longResult.overflow.horizontal > 0, 'Should have horizontal overflow');
    });

});

// Run the tests
alignmentRunner.run();
