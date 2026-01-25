const { ai, MODELS } = require('../config/gemini');
// const { generateVisualPage } = require('../designers/layoutGenerator'); // This was in the plan, but I need to ensure it's exported
const LayoutGenerator = require('../designers/layoutGenerator'); // Should export generatePageLayout, generateVisualPage
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');

/**
 * Main album assembly orchestrator
 */
class AlbumAssembler {
    constructor(designParams, photoGroups, outputDir) {
        this.designParams = designParams;
        this.photoGroups = photoGroups;
        this.outputDir = outputDir;
        this.albumId = uuidv4();
        this.pages = [];
    }

    /**
     * Generate complete album
     */
    async assemble(onProgress) {
        // Create output directory
        const albumDir = path.join(this.outputDir, `album_${this.albumId}`);
        fs.mkdirSync(albumDir, { recursive: true });
        fs.mkdirSync(path.join(albumDir, 'pages'), { recursive: true });
        fs.mkdirSync(path.join(albumDir, 'thumbnails'), { recursive: true });

        let pageIndex = 0;
        const totalPages = this.calculateTotalPages();

        // Generate cover page
        if (onProgress) onProgress('Generating cover...', 0, totalPages);
        try {
            const coverPage = await this.generateCoverPage();
            this.pages.push(coverPage);
            await this.savePage(coverPage, albumDir, pageIndex++);
        } catch (e) {
            console.error("Cover generation skipped:", e);
        }

        // Generate content pages for each group
        for (const group of this.photoGroups.groups) {
            if (onProgress) onProgress(`Generating ${group.name}...`, pageIndex, totalPages);

            try {
                const groupPages = await this.generateGroupPages(group);
                for (const page of groupPages) {
                    this.pages.push(page);
                    await this.savePage(page, albumDir, pageIndex++);
                }
            } catch (e) {
                console.error(`Group ${group.name} generation skipped:`, e);
            }
        }

        // Generate closing page
        if (onProgress) onProgress('Generating closing...', pageIndex, totalPages);
        try {
            const closingPage = await this.generateClosingPage();
            this.pages.push(closingPage);
            await this.savePage(closingPage, albumDir, pageIndex);
        } catch (e) {
            console.error("Closing page generation skipped:", e);
        }

        // Generate album manifest
        const manifest = this.generateManifest(albumDir);
        fs.writeFileSync(
            path.join(albumDir, 'album.json'),
            JSON.stringify(manifest, null, 2)
        );

        return {
            albumId: this.albumId,
            albumDir,
            pageCount: this.pages.length,
            manifest
        };
    }

    /**
     * Generate cover page
     */
    async generateCoverPage() {
        const coverPhoto = this.selectCoverPhoto();

        const prompt = `Create a stunning photo album cover page.

Theme: ${this.designParams.theme.name}
Mood: ${this.designParams.theme.mood}
Colors: Primary ${this.designParams.colors.primary}, Secondary ${this.designParams.colors.secondary}

Design requirements:
- Feature the main photo prominently
- Include space for album title
- Professional, print-ready quality
- ${this.designParams.layout_preferences.style} aesthetic

Create an eye-catching cover that sets the tone for the entire album.`;

        // Note: If coverPhoto is just metadata, we need to read it. 
        // Wait, coverPhoto from selectCoverPhoto is a photo object from allPhotos.
        // It has a .path property.

        if (!coverPhoto || !fs.existsSync(coverPhoto.path)) {
            throw new Error("Invalid cover photo path");
        }

        const imageData = fs.readFileSync(coverPhoto.path);

        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: imageData.toString('base64') } }
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: "3:2",
                    imageSize: "2K" // 4K for cover ideally, but let's stick to 2K for speed/stability
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return {
                    type: 'cover',
                    imageData: part.inlineData.data,
                    photos: [coverPhoto]
                };
            }
        }

        throw new Error('Cover generation failed');
    }

    /**
     * Generate pages for a photo group
     */
    async generateGroupPages(group) {
        const pages = [];
        const photosPerPage = this.calculatePhotosPerPage(group);

        // Group title page if multiple photos
        // For demo speed, skipping title page unless really needed
        /*
        if (group.photo_ids.length > 3) {
          const titlePage = await this.generateGroupTitlePage(group);
          pages.push(titlePage);
        }
        */

        // Content pages
        for (let i = 0; i < group.suggested_order.length; i += photosPerPage) {
            const pagePhotos = group.suggested_order.slice(i, i + photosPerPage);
            const photos = pagePhotos.map(id => this.getPhotoById(id));

            const page = await this.generateContentPage(photos, group, pages.length);
            pages.push(page);

            // Rate limiting
            await new Promise(r => setTimeout(r, 4000));
        }

        return pages;
    }

    /**
     * Generate a content page with multiple photos
     */
    async generateContentPage(photos, group, pageInGroup) {
        const photoContents = [];
        for (const photo of photos) {
            const imageData = fs.readFileSync(photo.path);
            photoContents.push({
                text: `Photo: ${photo.filename}`
            });
            photoContents.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: imageData.toString('base64')
                }
            });
        }

        const prompt = `Create a professional album page with ${photos.length} photo(s).

Section: ${group.name}
Theme: ${this.designParams.theme.name} - ${this.designParams.theme.mood}
Design style: ${group.design_hints.layout_style}
Color mood: ${group.design_hints.mood}

Layout requirements:
- Arrange ${photos.length} photos harmoniously
- Include subtle captions or dates if appropriate
- Frame style: ${this.designParams.decorative_elements.frames}
- Background should complement photos
- Professional quality suitable for printing

Create a beautiful, balanced page that tells part of the story.`;

        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: [
                { text: prompt },
                ...photoContents
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: "3:2",
                    imageSize: "2K"
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return {
                    type: 'content',
                    group: group.name,
                    imageData: part.inlineData.data,
                    photos: photos
                };
            }
        }

        throw new Error('Content page generation failed');
    }

    /**
     * Generate group title page
     */
    async generateGroupTitlePage(group) {
        const heroPhoto = this.getPhotoById(group.photo_ids[0]);
        const imageData = fs.readFileSync(heroPhoto.path);

        const prompt = `Create a section title page for "${group.name}".

Theme: ${this.designParams.theme.name}
Section mood: ${group.design_hints.mood}
Colors: ${group.design_hints.color_scheme.join(', ')}

Include:
- The title "${group.name}" prominently displayed
- The featured photo as a hero element
- Decorative elements matching the ${this.designParams.layout_preferences.style} style
- Professional typography using ${this.designParams.typography.title_style} for the title

Create an elegant section opener that introduces this part of the album.`;

        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: [
                { text: prompt },
                { inlineData: { mimeType: 'image/jpeg', data: imageData.toString('base64') } }
            ],
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: "3:2",
                    imageSize: "2K"
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return {
                    type: 'section-title',
                    group: group.name,
                    imageData: part.inlineData.data,
                    photos: [heroPhoto]
                };
            }
        }

        throw new Error('Title page generation failed');
    }

    /**
     * Generate closing page
     */
    async generateClosingPage() {
        const prompt = `Create an elegant closing page for a ${this.designParams.theme.name} photo album.

Theme: ${this.designParams.theme.mood}
Colors: Primary ${this.designParams.colors.primary}, Accent ${this.designParams.colors.accent}
Style: ${this.designParams.layout_preferences.style}

Include:
- A "Thank You" or closing message
- Decorative elements consistent with the album
- Date or year placeholder
- Clean, professional design

Create a memorable ending that completes the album beautifully.`;

        const response = await ai.models.generateContent({
            model: MODELS.PRO,
            contents: prompt,
            config: {
                responseModalities: ['TEXT', 'IMAGE'],
                imageConfig: {
                    aspectRatio: "3:2",
                    imageSize: "2K"
                }
            }
        });

        for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
                return {
                    type: 'closing',
                    imageData: part.inlineData.data,
                    photos: []
                };
            }
        }

        throw new Error('Closing page generation failed');
    }

    /**
     * Save page to disk
     */
    async savePage(page, albumDir, index) {
        const paddedIndex = String(index).padStart(3, '0');
        const pagePath = path.join(albumDir, 'pages', `page_${paddedIndex}.png`);
        const thumbPath = path.join(albumDir, 'thumbnails', `thumb_${paddedIndex}.png`);

        // Save full resolution
        fs.writeFileSync(pagePath, Buffer.from(page.imageData, 'base64'));

        // Generate and save thumbnail
        await sharp(Buffer.from(page.imageData, 'base64'))
            .resize(400, 267, { fit: 'cover' })
            .toFile(thumbPath);

        page.pagePath = pagePath;
        page.thumbPath = thumbPath;
        page.pageIndex = index;
    }

    /**
     * Generate album manifest
     */
    generateManifest(albumDir) {
        return {
            albumId: this.albumId,
            createdAt: new Date().toISOString(),
            theme: this.designParams.theme,
            colors: this.designParams.colors,
            pageCount: this.pages.length,
            pages: this.pages.map((p, i) => ({
                index: i,
                type: p.type,
                group: p.group || null,
                pagePath: p.pagePath,
                thumbPath: p.thumbPath,
                photoCount: p.photos ? p.photos.length : 0
            })),
            stats: {
                totalPhotos: this.getTotalPhotoCount(),
                groups: this.photoGroups.groups.length
            }
        };
    }

    // Helper methods
    selectCoverPhoto() {
        const coverCandidates = this.photoGroups.cover_candidates || [];
        if (coverCandidates.length > 0) {
            return this.getPhotoById(coverCandidates[0]);
        }
        return this.getPhotoById(0);
    }

    getPhotoById(id) {
        // This should reference your actual photo storage
        // allPhotos is attached to the instance in index.js usually
        // Or we store it in constructor. 
        // The plan attached it: `assembler.allPhotos = analyzedPhotos;`
        return this.allPhotos[id];
    }

    calculateTotalPages() {
        let count = 2; // cover + closing
        for (const group of this.photoGroups.groups) {
            // if (group.photo_ids.length > 3) count++; // title page (disabled for now)
            count += Math.ceil(group.photo_ids.length / this.calculatePhotosPerPage(group));
        }
        return count;
    }

    calculatePhotosPerPage(group) {
        switch (group.design_hints.layout_style) {
            case 'hero-focused': return 1;
            case 'timeline': return 2;
            case 'collage': return 4;
            case 'grid': return 6;
            default: return 3;
        }
    }

    getTotalPhotoCount() {
        return this.photoGroups.groups.reduce((sum, g) => sum + g.photo_ids.length, 0);
    }
}

module.exports = { AlbumAssembler };
