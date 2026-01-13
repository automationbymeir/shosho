/**
 * Magic Create v2
 * Fully AI-Generated Album Designer Orchestrator
 */

import { geminiService } from './gemini-banana-service.js';
import { validatePhotoAnalysis } from './schemas/photo-analysis-schema.js';
import { validateAlbum } from './schemas/album-schema.js';
import { validatePage } from './schemas/page-schema.js';

class MagicCreateV2 {
    constructor() {
        this.isProcessing = false;
        this.progressCallback = null;
    }

    /**
     * Main entry point to run the full Magic Create pipeline
     * @param {Array} photos - Array of photo objects
     * @param {string} userPrompt - Optional user style prompt
     * @param {Function} onProgress - Callback for progress updates (stage, percent)
     */
    async run(photos, userPrompt = "", onProgress = () => { }) {
        if (this.isProcessing) {
            console.warn('[MagicCreateV2] Already processing');
            return;
        }

        this.isProcessing = true;
        this.progressCallback = onProgress;

        console.log('[MagicCreateV2] Starting pipeline with', photos.length, 'photos');

        try {
            // --- Phase 1: Photo Analysis ---
            this._updateProgress('Analyzing photos...', 10);
            const analyses = await this.analyzePhotosDeep(photos);

            // --- Phase 2: Album Structure Planning ---
            this._updateProgress('Planning album structure...', 30);
            const albumPlan = await this.planAlbum(analyses, userPrompt, photos.length);

            // --- Phase 3: Page Design ---
            this._updateProgress('Designing pages...', 50);
            const pageDesigns = await this.generatePageDesigns(albumPlan, analyses);

            // --- Phase 4: Asset Generation & Compilation ---
            this._updateProgress('Creating artwork...', 75);
            const compiledAlbum = await this.compileAlbum(albumPlan, pageDesigns);

            this._updateProgress('Complete!', 100);
            return compiledAlbum;

        } catch (error) {
            console.error('[MagicCreateV2] Pipeline failed:', error);
            throw error;
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Phase 1: Enhanced Photo Analysis
     */
    async analyzePhotosDeep(photos) {
        console.log('[MagicCreateV2] Phase 1: Analyzing', photos.length, 'photos');

        // 1. Fetch images as Base64 (using helper akin to ai-director)
        // We'll need a helper method for fetching, borrowing from ai-director logic
        const imageBase64s = await this.fetchImagesAsBase64(photos);

        // 2. Analyze each photo
        const analyses = [];

        // TODO: Parallelize this respecting rate limits?
        // simple sequential for now to avoid hitting limits immediately or parallel blocks of 3
        for (let i = 0; i < photos.length; i++) {
            const b64 = imageBase64s[i];
            if (!b64) continue;

            this._updateProgress(`Analyzing photo ${i + 1}/${photos.length}...`, 10 + (Math.round((i / photos.length) * 20)));

            try {
                const analysis = await geminiService.analyzePhotoDeep(b64);
                analyses.push({
                    originalPhoto: photos[i],
                    imageBase64: b64, // Keep for generation context if needed? Or drop to save memory?
                    analysis: analysis
                });
            } catch (e) {
                console.error(`Failed to analyze photo ${i}:`, e);
                // Fallback? or Skip?
            }
        }

        return analyses;
    }

    /**
     * Phase 2: Album Planning
     */
    async planAlbum(analyses, userPrompt, totalPhotos) {
        console.log('[MagicCreateV2] Phase 2: Planning album');

        // Create concise summaries for the planner
        const photoSummaries = analyses.map((a, index) => ({
            index: index,
            desc: a.analysis.description,
            mood: a.analysis.mood,
            subjects: a.analysis.subjects,
            importance: a.analysis.importance
        }));

        const albumPlan = await geminiService.planAlbumStructure(photoSummaries, userPrompt, totalPhotos);
        return albumPlan;
    }

    // Helper from ai-director
    async fetchImagesAsBase64(photos) {
        const promises = photos.map(async (p) => {
            try {
                const url = p.thumbnailUrl || p.url;
                const response = await fetch(url);
                const blob = await response.blob();
                return new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            } catch (e) {
                console.warn(`Failed to fetch image ${p.id}`, e);
                return null;
            }
        });

        const results = await Promise.all(promises);
        return results; // Note: nulls filtered in analysis loop
    }

    /**
     * Phase 3: Page Design Generation
     */
    async generatePageDesigns(albumPlan, analyses) {
        console.log('[MagicCreateV2] Phase 3: Designing pages');
        const pages = [];
        const totalPages = albumPlan.meta.totalPages;
        let previousPageSummary = null;

        // Use planned assignments if available, otherwise generate sequential stubs
        const assignments = albumPlan.pageAssignments || [];

        for (let i = 0; i < totalPages; i++) {
            this._updateProgress(`Designing page ${i + 1}/${totalPages}...`, 50 + (Math.round((i / totalPages) * 25)));

            // 1. Determine Context
            const assignment = assignments.find(a => a.pageIndex === i);
            const chapter = albumPlan.chapters.find(ch => i >= ch.pageRange[0] && i <= ch.pageRange[1]);
            const chapterTitle = chapter ? chapter.title : "General";
            const chapterId = chapter ? chapter.id : "ch-1";
            const pageType = assignment ? assignment.pageType : (i === 0 ? 'cover' : 'standard');

            // 2. Resolve Photos for this page
            let pagePhotos = [];
            if (assignment && assignment.assignedPhotoIndices) {
                // Map indices from plan back to analysis objects
                pagePhotos = assignment.assignedPhotoIndices.map(idx => analyses[idx]).filter(Boolean);
            } else {
                // Fallback: Slice if no explicit plan (legacy safety)
                const photosPerPage = Math.ceil(analyses.length / totalPages);
                const startIdx = i * photosPerPage;
                pagePhotos = analyses.slice(startIdx, startIdx + photosPerPage);
            }

            const photoDescriptions = pagePhotos.map(p => p.analysis.description);

            const pageContext = {
                pageId: `page-${i}`,
                pageIndex: i,
                totalPages: totalPages,
                pageType: pageType,
                chapterId: chapterId,
                chapterTitle: chapterTitle,
                photoDescriptions: photoDescriptions,
                designSystem: albumPlan.designSystem,
                mood: albumPlan.designSystem.mood,
                previousPageSummary: previousPageSummary
            };

            // 3. Generate Design
            const pageDesign = await geminiService.designPage(pageContext);

            // 4. Enrich & Map Photos back to Slots
            if (pageDesign.layout && pageDesign.layout.photoSlots) {
                pageDesign.layout.photoSlots.forEach(slot => {
                    // slot.photoIndex refers to the index in *this page's* photo list
                    const localIndex = slot.photoIndex;
                    if (pagePhotos[localIndex]) {
                        slot.originalPhotoId = pagePhotos[localIndex].originalPhoto.id;
                        // Find global index for reference
                        slot.globalIndex = analyses.indexOf(pagePhotos[localIndex]);
                    }
                });
            }

            // 5. Update Previous Page Summary for next iteration context
            previousPageSummary = {
                layoutType: pageDesign.layout.gridType,
                backgroundType: pageDesign.background.type,
                photoCount: pagePhotos.length
            };

            pages.push(pageDesign);
        }

        return pages;
    }

    /**
     * Phase 4: Compilation and Asset Generation
     */
    async compileAlbum(albumPlan, pageDesigns) {
        console.log('[MagicCreateV2] Phase 4: Compiling album');

        // Batch generate backgrounds
        const bgPromises = pageDesigns.map(async (page, index) => {
            if (page.background.type === 'generated') {
                this._updateProgress(`Painting background ${index + 1}/${pageDesigns.length}...`, 75 + (Math.round((index / pageDesigns.length) * 20)));
                const bgUrl = await geminiService.generateBackgroundSafe(page.background.imagePrompt, page.background.fallbackColor);
                // If generated, set it. If null (failed), strictly fallback to solid/color is handled by type change or renderer.
                if (bgUrl) {
                    page.background.imageUrl = bgUrl;
                    page.background.type = 'image'; // Switch to image type for renderer
                } else {
                    page.background.type = 'solid'; // Fallback
                    page.background.color = page.background.fallbackColor || '#ffffff';
                }
            }
            return page;
        });

        await Promise.all(bgPromises);

        return {
            albumId: albumPlan.albumId || crypto.randomUUID(),
            meta: albumPlan.meta,
            designSystem: albumPlan.designSystem,
            chapters: albumPlan.chapters,
            pages: pageDesigns,
            createdAt: new Date().toISOString()
        };
    }

    _updateProgress(stage, percent) {
        if (this.progressCallback) {
            this.progressCallback(stage, percent);
        }
    }
}

export const magicCreateV2 = new MagicCreateV2();
window.magicCreateV2 = magicCreateV2;
