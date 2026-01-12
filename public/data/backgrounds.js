/**
 * Background Texture Gallery
 * Curated high-quality generated assets for page backgrounds.
 */

const BACKGROUND_TEXTURES = [
    {
        id: 'classic',
        name: 'Classic Minimal',
        nameHe: 'קלאסי מינימלי',
        category: 'Minimalist',
        categoryHe: 'מינימליסטי',
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
        nameHe: 'בוטניקה וינטג׳',
        category: 'Nature',
        categoryHe: 'טבע',
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
        nameHe: 'סרט נואר',
        category: 'Cinematic',
        categoryHe: 'קולנועי',
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
        nameHe: 'באוהאוס פופ',
        category: 'Graphic',
        categoryHe: 'גרפי',
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
        nameHe: 'הארכיון',
        category: 'Vintage',
        categoryHe: 'וינטג׳',
        thumbnail: 'assets/backgrounds/vintage_paper_texture_1767369189703.png',
        url: 'assets/backgrounds/vintage_paper_texture_1767369189703.png',
        textColor: '#5c4033',
        theme: {
            colors: { primary: '#78350f', secondary: '#92400e', bg: '#fef3c7' },
            fonts: { serif: 'Courier Prime', sans: 'Courier New' }
        }
    },
    // --- Added set (6 more) ---
    {
        id: 'linen-sage',
        name: 'Light Paper Fibers',
        nameHe: 'סיבי נייר בהירים',
        category: 'Paper',
        categoryHe: 'נייר',
        thumbnail: 'https://www.transparenttextures.com/patterns/light-paper-fibers.png',
        url: 'https://www.transparenttextures.com/patterns/light-paper-fibers.png',
        textColor: '#111827',
        theme: {
            colors: { primary: '#111827', secondary: '#6b7280', bg: '#f9fafb' },
            fonts: { serif: 'Playfair Display', sans: 'Inter' }
        }
    },
    {
        id: 'paper-cream',
        name: 'Rice Paper',
        nameHe: 'נייר אורז',
        category: 'Paper',
        categoryHe: 'נייר',
        thumbnail: 'https://www.transparenttextures.com/patterns/rice-paper-2.png',
        url: 'https://www.transparenttextures.com/patterns/rice-paper-2.png',
        textColor: '#1f2937',
        theme: {
            colors: { primary: '#1f2937', secondary: '#6b7280', bg: '#fffaf2' },
            fonts: { serif: 'Merriweather', sans: 'Inter' }
        }
    },
    {
        id: 'grainy-noir',
        name: 'Subtle Grunge',
        nameHe: 'גרנג׳ עדין',
        category: 'Texture',
        categoryHe: 'טקסטורה',
        thumbnail: 'https://www.transparenttextures.com/patterns/subtle-grunge.png',
        url: 'https://www.transparenttextures.com/patterns/subtle-grunge.png',
        textColor: '#f8fafc',
        theme: {
            colors: { primary: '#f8fafc', secondary: '#94a3b8', bg: '#0b0f14' },
            fonts: { serif: 'DM Serif Display', sans: 'Inter' }
        }
    },
    {
        id: 'sky-mist',
        name: 'Cream Pixels',
        nameHe: 'פיקסלים שמנת',
        category: 'Minimalist',
        categoryHe: 'מינימליסטי',
        thumbnail: 'https://www.transparenttextures.com/patterns/cream-pixels.png',
        url: 'https://www.transparenttextures.com/patterns/cream-pixels.png',
        textColor: '#0f172a',
        theme: {
            colors: { primary: '#0f172a', secondary: '#3b82f6', bg: '#f1f7ff' },
            fonts: { serif: 'Playfair Display', sans: 'DM Sans' }
        }
    },
    {
        id: 'terracotta-wash',
        name: 'Concrete Wall',
        nameHe: 'קיר בטון',
        category: 'Texture',
        categoryHe: 'טקסטורה',
        thumbnail: 'https://www.transparenttextures.com/patterns/concrete-wall.png',
        url: 'https://www.transparenttextures.com/patterns/concrete-wall.png',
        textColor: '#111827',
        theme: {
            colors: { primary: '#111827', secondary: '#6b7280', bg: '#f3f4f6' },
            fonts: { serif: 'Merriweather', sans: 'Inter' }
        }
    },
    {
        id: 'gallery-neutral',
        name: 'Diagonal Striped Brick',
        nameHe: 'לבנים בפסים אלכסוניים',
        category: 'Pattern',
        categoryHe: 'דוגמה',
        thumbnail: 'https://www.transparenttextures.com/patterns/diagonal-striped-brick.png',
        url: 'https://www.transparenttextures.com/patterns/diagonal-striped-brick.png',
        textColor: '#111827',
        theme: {
            colors: { primary: '#111827', secondary: '#6b7280', bg: '#f9fafb' },
            fonts: { serif: 'Playfair Display', sans: 'Inter' }
        }
    },
];

// Frame Definitions for Design Gallery
window.PAGE_FRAMES = [
    {
        id: 'frame-classic-gold',
        name: 'Classic Gold',
        nameHe: 'זהב קלאסי',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
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
        nameHe: 'מודרני מודגש',
        category: 'Modern',
        categoryHe: 'מודרני',
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
        nameHe: 'סריף אלגנטי',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
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
        nameHe: 'ארט דקו',
        category: 'Vintage',
        categoryHe: 'וינטג׳',
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
        nameHe: 'עיטור פינות',
        category: 'Decorative',
        categoryHe: 'דקורטיבי',
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
        nameHe: 'מסגרת מרחפת',
        category: 'Minimal',
        categoryHe: 'מינימלי',
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
    // --- Added set (6 more) ---
    {
        id: 'frame-double-ink',
        name: 'Double Ink',
        nameHe: 'דיו כפול',
        category: 'Vintage',
        categoryHe: 'וינטג׳',
        color: '#2f2f2f',
        previewBorder: '3px double #2f2f2f',
        svgGen: (w, h, color) => {
            const inset = 18;
            const gap = 10;
            return `
              <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${color}" stroke-width="2"/>
              <rect x="${inset + gap}" y="${inset + gap}" width="${w - (inset + gap) * 2}" height="${h - (inset + gap) * 2}" fill="none" stroke="${color}" stroke-width="0.8"/>
            `;
        },
        pdfStyle: 'double-ink',
        width: 2
    },
    {
        id: 'frame-corners-soft',
        name: 'Soft Corners',
        nameHe: 'פינות רכות',
        category: 'Minimal',
        categoryHe: 'מינימלי',
        color: '#6b7280',
        previewBorder: '1px solid #6b7280',
        svgGen: (w, h, color) => {
            const inset = 26;
            const len = 50;
            const sw = 2;
            return `
              <path d="M${inset} ${inset + len} V${inset} H${inset + len}" fill="none" stroke="${color}" stroke-width="${sw}"/>
              <path d="M${w - inset - len} ${inset} H${w - inset} V${inset + len}" fill="none" stroke="${color}" stroke-width="${sw}"/>
              <path d="M${inset} ${h - inset - len} V${h - inset} H${inset + len}" fill="none" stroke="${color}" stroke-width="${sw}"/>
              <path d="M${w - inset - len} ${h - inset} H${w - inset} V${h - inset - len}" fill="none" stroke="${color}" stroke-width="${sw}"/>
            `;
        },
        pdfStyle: 'corners',
        width: 2
    },
    {
        id: 'frame-dots-fine',
        name: 'Fine Dots',
        nameHe: 'נקודות עדינות',
        category: 'Modern',
        categoryHe: 'מודרני',
        color: '#94a3b8',
        previewBorder: '1px dotted #94a3b8',
        svgGen: (w, h, color) => {
            const inset = 22;
            return `<rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${color}" stroke-width="1" stroke-dasharray="1 6" stroke-linecap="round"/>`;
        },
        pdfStyle: 'dots',
        width: 1
    },
    {
        id: 'frame-vignette-oval',
        name: 'Oval Vignette',
        nameHe: 'וינייטה אובלית',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
        color: '#64748b',
        previewBorder: '1px solid #64748b',
        svgGen: (w, h, color) => {
            const inset = 34;
            return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w - inset * 2) / 2}" ry="${(h - inset * 2) / 2}" fill="none" stroke="${color}" stroke-width="1.5"/>`;
        },
        pdfStyle: 'oval',
        width: 1.5
    },
    {
        id: 'frame-polaroid',
        name: 'Polaroid',
        nameHe: 'פולארויד',
        category: 'Fun',
        categoryHe: 'כיפי',
        color: '#ffffff',
        previewBorder: '12px solid #ffffff',
        svgGen: (w, h, color) => {
            const inset = 18;
            const bottomExtra = 60;
            return `
              <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="#ffffff" stroke-width="14"/>
              <rect x="${inset + 14}" y="${inset + 14}" width="${w - (inset + 14) * 2}" height="${h - (inset + 14) * 2 - bottomExtra}" fill="none" stroke="#e5e7eb" stroke-width="1"/>
            `;
        },
        pdfStyle: 'polaroid',
        width: 14
    },
    {
        id: 'frame-diagonal',
        name: 'Diagonal Corners',
        nameHe: 'פינות אלכסוניות',
        category: 'Graphic',
        categoryHe: 'גרפי',
        color: '#111827',
        previewBorder: '1px solid #111827',
        svgGen: (w, h, color) => {
            const inset = 24;
            const d = 40;
            return `
              <path d="M${inset} ${inset + d} L${inset + d} ${inset}" fill="none" stroke="${color}" stroke-width="2"/>
              <path d="M${w - inset - d} ${inset} L${w - inset} ${inset + d}" fill="none" stroke="${color}" stroke-width="2"/>
              <path d="M${inset} ${h - inset - d} L${inset + d} ${h - inset}" fill="none" stroke="${color}" stroke-width="2"/>
              <path d="M${w - inset - d} ${h - inset} L${w - inset} ${h - inset - d}" fill="none" stroke="${color}" stroke-width="2"/>
              <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${color}" stroke-width="0.6" opacity="0.5"/>
            `;
        },
        pdfStyle: 'diagonal',
        width: 2
    },
];

// Image Frame Definitions (for masking + per-image frame overlays)
// Shapes: rect | rounded | circle | oval
// Image Frame Definitions (Mapped from PAGE_FRAMES as requested)
window.IMAGE_FRAMES = window.PAGE_FRAMES.map(pf => ({
    id: 'img-' + pf.id,
    name: pf.name,
    nameHe: pf.nameHe,
    category: pf.category,
    categoryHe: pf.categoryHe,
    color: pf.color,
    // Adapt svgGen to accept shape arg but ignore it, or just use original
    svgGen: (w, h, color, shape) => pf.svgGen(w, h, color),
    shapes: ['rect'] // Legacy frames are mostly rects
}));

// Export for app use
if (typeof window !== 'undefined') {
    window.BACKGROUND_TEXTURES = BACKGROUND_TEXTURES;
    window.PAGE_FRAMES = PAGE_FRAMES;
    window.IMAGE_FRAMES = IMAGE_FRAMES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BACKGROUND_TEXTURES, PAGE_FRAMES, IMAGE_FRAMES };
}
