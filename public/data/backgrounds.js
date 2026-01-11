/**
 * Background Texture Gallery
 * Curated high-quality generated assets for page backgrounds.
 */

const BACKGROUND_TEXTURES = [
    {
        id: 'classic',
        name: 'Classic Minimal',
        category: 'Minimalist',
        thumbnail: 'assets/backgrounds/geometric_minimal_1767369254374.png', // Reuse existing or placeholder
        url: 'assets/backgrounds/geometric_minimal_1767369254374.png',
        textColor: '#1a1a1a',
        theme: {
            colors: { primary: '#1a1a1a', secondary: '#4a4a4a', bg: '#f5f5f5' },
            fonts: { serif: 'Playfair Display', sans: 'Lato' }
        }
    },
    {
        id: 'botanical',
        name: 'Vintage Botanical',
        category: 'Nature',
        thumbnail: 'assets/backgrounds/botanical_pattern_1767369204912.png',
        url: 'assets/backgrounds/botanical_pattern_1767369204912.png',
        textColor: '#d4e6d7',
        theme: {
            colors: { primary: '#d4e6d7', secondary: '#8ba690', bg: '#2d3d30' },
            fonts: { serif: 'Merriweather', sans: 'Montserrat' }
        }
    },
    {
        id: 'noir-film',
        name: 'Noir Filmstrip',
        category: 'Cinematic',
        thumbnail: 'assets/backgrounds/vintage_paper_texture_1767369189703.png', // Fallback or specific asset
        url: 'assets/backgrounds/vintage_paper_texture_1767369189703.png',
        textColor: '#e0e0e0',
        theme: {
            colors: { primary: '#e63946', secondary: '#1d3557', bg: '#111111' },
            fonts: { serif: 'DM Serif Display', sans: 'Inter' }
        }
    },
    {
        id: 'bauhaus-pop',
        name: 'Bauhaus Pop',
        category: 'Graphic',
        thumbnail: 'assets/backgrounds/watercolor_mesh_1767369224250.png',
        url: 'assets/backgrounds/watercolor_mesh_1767369224250.png',
        textColor: '#ffffff',
        theme: {
            colors: { primary: '#005f73', secondary: '#ee9b00', bg: '#0a9396' },
            fonts: { serif: 'Montserrat', sans: 'Roboto' }
        }
    },
    {
        id: 'archive',
        name: 'The Archive',
        category: 'Vintage',
        thumbnail: 'assets/backgrounds/vintage_paper_texture_1767369189703.png',
        url: 'assets/backgrounds/vintage_paper_texture_1767369189703.png',
        textColor: '#5c4033',
        theme: {
            colors: { primary: '#78350f', secondary: '#92400e', bg: '#fef3c7' },
            fonts: { serif: 'Courier Prime', sans: 'Courier New' }
        }
    },
];

// Frame Definitions for Design Gallery
const PAGE_FRAMES = [
    {
        id: 'frame-classic-gold',
        name: 'Classic Gold',
        category: 'Elegant',
        color: '#D4AF37',
        previewBorder: '4px double #D4AF37', // CSS for gallery preview
        svgGen: (w, h, color) => {
            // Double Line Border
            const inset = 20;
            const gap = 6;
            return `
               <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${color}" stroke-width="2"/>
               <rect x="${inset + gap}" y="${inset + gap}" width="${w - (inset + gap) * 2}" height="${h - (inset + gap) * 2}" fill="none" stroke="${color}" stroke-width="1"/>
             `;
        },
        pdfStyle: 'double',
        width: 1
    },
    {
        id: 'frame-modern-bold',
        name: 'Modern Bold',
        category: 'Modern',
        color: '#1a1a1a',
        previewBorder: '8px solid #1a1a1a',
        svgGen: (w, h, color) => {
            // Thick single border inset
            const inset = 24;
            return `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${color}" stroke-width="4"/>`;
        },
        pdfStyle: 'solid-thick',
        width: 4
    },
    {
        id: 'frame-elegant-serif',
        name: 'Elegant Serif',
        category: 'Elegant',
        color: '#555555',
        previewBorder: '1px solid #555555',
        svgGen: (w, h, color) => {
            // Thin inner, Thick outer
            const inset = 16;
            const gap = 4;
            return `
               <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${color}" stroke-width="3"/>
               <rect x="${inset + gap + 3}" y="${inset + gap + 3}" width="${w - (inset + gap + 3) * 2}" height="${h - (inset + gap + 3) * 2}" fill="none" stroke="${color}" stroke-width="0.5"/>
             `;
        },
        pdfStyle: 'thick-thin',
        width: 3
    },
    {
        id: 'frame-art-deco',
        name: 'Art Deco',
        category: 'Vintage',
        color: '#C0C0C0', // Silver
        previewBorder: '2px solid #C0C0C0',
        svgGen: (w, h, color) => {
            const m = 20;
            const s = 15; // corner Step size
            // Geometric corners
            const path = `
               M ${m + s},${m} L ${w - m - s},${m} L ${w - m},${m + s} L ${w - m},${h - m - s} L ${w - m - s},${h - m} L ${m + s},${h - m} L ${m},${h - m - s} L ${m},${m + s} Z
               M ${m + s + 5},${m + 5} L ${w - m - s - 5},${m + 5} L ${w - m - 5},${m + s + 5} L ${w - m - 5},${h - m - s - 5} L ${w - m - s - 5},${h - m - 5} L ${m + s + 5},${h - m - 5} L ${m + 5},${h - m - s - 5} L ${m + 5},${m + s + 5} Z
             `;
            return `<path d="${path}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
        },
        pdfStyle: 'art-deco',
        width: 1.5
    },
    {
        id: 'frame-corner-flourish',
        name: 'Corner Flourish',
        category: 'Decorative',
        color: '#8b4513',
        previewBorder: '1px dashed #8b4513',
        svgGen: (w, h, color) => {
            const m = 30; // margin
            const len = 40; // arm length
            // Just corners
            const tl = `M ${m},${m + len} L ${m},${m} L ${m + len},${m}`;
            const tr = `M ${w - m - len},${m} L ${w - m},${m} L ${w - m},${m + len}`;
            const bl = `M ${m},${h - m - len} L ${m},${h - m} L ${m + len},${h - m}`;
            const br = `M ${w - m - len},${h - m} L ${w - m},${h - m} L ${w - m},${h - m - len}`;
            return `
               <path d="${tl} ${tr} ${bl} ${br}" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round"/>
               <circle cx="${m}" cy="${m}" r="3" fill="${color}"/>
               <circle cx="${w - m}" cy="${m}" r="3" fill="${color}"/>
               <circle cx="${m}" cy="${h - m}" r="3" fill="${color}"/>
               <circle cx="${w - m}" cy="${h - m}" r="3" fill="${color}"/>
             `;
        },
        pdfStyle: 'corner-flourish',
        width: 2
    },
    {
        id: 'frame-minimal-floating',
        name: 'Minimal Floating',
        category: 'Minimal',
        color: '#999999',
        previewBorder: '1px solid #999999',
        svgGen: (w, h, color) => {
            // Floating box
            const inset = 40;
            return `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${color}" stroke-width="0.5" stroke-dasharray="4 4"/>`;
        },
        pdfStyle: 'floating-dashed',
        width: 0.5
    },
];

// Export for app use
if (typeof window !== 'undefined') {
    window.BACKGROUND_TEXTURES = BACKGROUND_TEXTURES;
    window.PAGE_FRAMES = PAGE_FRAMES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BACKGROUND_TEXTURES, PAGE_FRAMES };
}
