
import { LayoutEngine } from './layout-engine.js';

const engine = new LayoutEngine();

function assert(condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
}

console.log('--- Testing LayoutEngine ---');

// Test 1: Single Landscape
const photos1 = [{ id: 'p1', ratio: 1.5 }];
const layout1 = engine.generateLayout(photos1);
assert(layout1.name === '1-landscape', 'Single landscape selection');
assert(layout1.slots.length === 1, 'Single slot generated');

// Test 2: Single Portrait
const photos2 = [{ id: 'p2', ratio: 0.6 }];
const layout2 = engine.generateLayout(photos2);
assert(layout2.name === '1-portrait', 'Single portrait selection');

// Test 3: Two Landscapes (Should stack)
const photos3 = [{ id: 'p1', ratio: 1.5 }, { id: 'p2', ratio: 1.5 }];
const layout3 = engine.generateLayout(photos3);
assert(layout3.name === '2-landscape-stack', '2 Landscape stack selection');
assert(layout3.slots.length === 2, '2 slots generated');

// Test 4: Mixed 3 Photos (Portrait first -> Hero Left)
const photos4 = [{ id: 'p1', ratio: 0.6 }, { id: 'p2', ratio: 1.5 }, { id: 'p3', ratio: 1.5 }];
const layout4 = engine.generateLayout(photos4);
assert(layout4.name === '3-hero-left', '3 Photos Hero Left selection');
assert(layout4.slots.length === 3, '3 slots generated');

// Test 5: Dynamic Fallback (5 photos)
const photos5 = Array(5).fill({ id: 'p', ratio: 1 });
const layout5 = engine.generateLayout(photos5);
assert(layout5.name === 'dynamic-5', 'Dynamic grid for 5 items');
assert(layout5.slots.length === 5, '5 slots generated');

console.log('--- All Tests Passed ---');
