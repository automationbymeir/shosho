const { analyzePhotoBatch } = require('./analyzers/photoAnalyzer');
const { scorePhotoQuality } = require('./analyzers/qualityScorer');
const { groupPhotosByRelevance } = require('./analyzers/grouper');
const { parseDesignPrompt } = require('./utils/promptParser');
const { processPhotosBatch } = require('./processors/photoProcessor');
const { AlbumAssembler } = require('./processors/albumAssembler');
const fs = require('fs');
const path = require('path');

/**
 * Main album generation function
 */
async function generateAlbum(options) {
    const {
        photoPaths,
        designPrompt,
        outputDir,
        onProgress,
        processingOptions = {}
    } = options;

    const progress = (stage, message, current, total) => {
        if (onProgress) onProgress({ stage, message, current, total });
        console.log(`[${stage}] ${message} (${current}/${total})`);
    };

    try {
        // Phase 1: Parse design prompt
        progress('design', 'Parsing design requirements...', 1, 6);
        const designParams = await parseDesignPrompt(designPrompt);
        console.log('Design theme:', designParams.theme.name);

        // Phase 2: Analyze photos
        progress('analysis', 'Analyzing photos...', 2, 6);
        const analyzedPhotos = await analyzePhotoBatch(photoPaths, (done, total) => {
            progress('analysis', `Analyzing photo ${done}/${total}`, done, total);
        });

        // Phase 3: Score quality
        progress('scoring', 'Scoring photo quality...', 3, 6);
        for (let i = 0; i < analyzedPhotos.length; i++) {
            // Only valid paths
            if (analyzedPhotos[i].path && fs.existsSync(analyzedPhotos[i].path)) {
                analyzedPhotos[i].quality = await scorePhotoQuality(analyzedPhotos[i].path);
            } else {
                analyzedPhotos[i].quality = { recommendation: 'supporting' };
            }
            progress('scoring', `Scored ${i + 1}/${analyzedPhotos.length}`, i + 1, analyzedPhotos.length);
        }

        // Phase 4: Group photos
        progress('grouping', 'Organizing photos...', 4, 6);
        const photoGroups = await groupPhotosByRelevance(analyzedPhotos);
        console.log(`Created ${photoGroups.groups.length} groups`);

        // Phase 5: Process photos (optional treatments)
        if (processingOptions.applyTreatment) {
            progress('processing', 'Applying photo treatments...', 5, 6);
            try {
                await processPhotosBatch(analyzedPhotos, designParams, processingOptions);
            } catch (e) {
                console.error("Photo processing warning:", e);
            }
        }

        // Phase 6: Assemble album
        progress('assembly', 'Generating album pages...', 6, 6);
        const assembler = new AlbumAssembler(designParams, photoGroups, outputDir);
        assembler.allPhotos = analyzedPhotos; // Attach analyzed photos to assembler

        const result = await assembler.assemble((message, current, total) => {
            progress('assembly', message, current, total);
        });

        return {
            success: true,
            ...result,
            designParams,
            photoGroups
        };

    } catch (error) {
        console.error('Album generation failed:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Export album to different formats
 */
async function exportAlbum(albumDir, format) {
    const manifestPath = path.join(albumDir, 'album.json');
    if (!fs.existsSync(manifestPath)) throw new Error("Manifest not found");

    const manifest = JSON.parse(
        fs.readFileSync(manifestPath, 'utf8')
    );

    switch (format) {
        case 'pdf':
            // return await exportToPDF(albumDir, manifest); // PDF export requires library specific logic implementation
            // Placeholder
            return { path: path.join(albumDir, 'album.pdf'), skipped: true };
        case 'images':
            return { pages: manifest.pages.map(p => p.pagePath) };
        case 'json':
            return manifest;
        default:
            throw new Error(`Unsupported format: ${format}`);
    }
}

// Export main functions
module.exports = { generateAlbum, exportAlbum };
