// tests/analysis.test.js
const { analyzePhotoBatch } = require('../src/analyzers/photoAnalyzer');
const { scorePhotoQuality } = require('../src/analyzers/qualityScorer');
const { groupPhotosByRelevance } = require('../src/analyzers/grouper');
const fs = require('fs');
const path = require('path');

async function testAnalysisPipeline() {
    const testPhotosDir = './test-photos';
    const photos = fs.readdirSync(testPhotosDir)
        .filter(f => /\.(jpg|jpeg|png)$/i.test(f))
        .map(f => path.join(testPhotosDir, f));

    if (photos.length === 0) {
        console.error("No test photos found! Please check test-photos directory.");
        return;
    }

    console.log(`Testing with ${photos.length} photos...`);

    // Test 1: Analyze photos
    console.log('\n📸 Phase 1: Analyzing photos...');
    const analyzed = await analyzePhotoBatch(photos, (done, total) => {
        console.log(`  Progress: ${done}/${total}`);
    });

    if (!analyzed || analyzed.length === 0) {
        console.error("Analysis returned empty results.");
        return;
    }

    console.log('✅ Analysis complete. Sample result:');
    console.log(JSON.stringify(analyzed[0].analysis, null, 2));

    // Test 2: Score quality
    console.log('\n⭐ Phase 2: Scoring quality...');
    const qualityScore = await scorePhotoQuality(photos[0]);
    console.log('Quality score:', qualityScore);

    // Test 3: Group photos
    console.log('\n📁 Phase 3: Grouping photos...');
    const groups = await groupPhotosByRelevance(analyzed);

    if (!groups || !groups.groups) {
        console.error("Grouping returned invalid result.");
        return;
    }

    console.log('Groups created:', groups.groups.length);
    groups.groups.forEach(g => {
        console.log(`  - ${g.name}: ${g.photo_ids.length} photos`);
    });

    // Validation
    const allGroupedIds = groups.groups.flatMap(g => g.photo_ids);
    const allPhotoIds = analyzed.map((_, i) => i);
    // Simple check
    const ungrouped = allPhotoIds.filter(id => !allGroupedIds.includes(id));

    if (ungrouped.length > 0) {
        console.warn('⚠️ Warning: Some photos not grouped:', ungrouped);
    } else {
        console.log('✅ All photos successfully grouped');
    }
}

testAnalysisPipeline();
