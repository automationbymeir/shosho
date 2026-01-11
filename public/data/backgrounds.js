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
window.IMAGE_FRAMES = [
    {
        id: 'imgframe-classic-gold',
        name: 'Classic Gold',
        nameHe: 'זהב קלאסי',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
        color: '#D4AF37',
        shapes: ['rect', 'rounded', 'oval', 'circle'],
        svgGen: (w, h, color, shape) => {
            const strokeOuter = 18;
            const strokeInner = 7;
            const pad = 70;
            const rx = shape === 'circle' ? 500 : (shape === 'oval' ? 320 : (shape === 'rounded' ? 120 : 8));
            const ry = shape === 'circle' ? 500 : (shape === 'oval' ? 220 : rx);
            if (shape === 'circle' || shape === 'oval') {
                return `
                  <ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad}" ry="${(h / 2) - pad}" fill="none" stroke="${color}" stroke-width="${strokeOuter}"/>
                  <ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad - 30}" ry="${(h / 2) - pad - 30}" fill="none" stroke="${color}" stroke-width="${strokeInner}"/>
                `;
            }
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="${strokeOuter}"/>
              <rect x="${pad + 30}" y="${pad + 30}" width="${w - (pad + 30) * 2}" height="${h - (pad + 30) * 2}" rx="${Math.max(8, rx - 30)}" ry="${Math.max(8, ry - 30)}" fill="none" stroke="${color}" stroke-width="${strokeInner}"/>
            `;
        },
    },
    {
        id: 'imgframe-stitched',
        name: 'Stitched Linen',
        nameHe: 'תפרים עדינים',
        category: 'Vintage',
        categoryHe: 'וינטג׳',
        color: '#475569',
        shapes: ['rect', 'rounded', 'oval'],
        svgGen: (w, h, color, shape) => {
            const pad = 85;
            const rx = shape === 'oval' ? 320 : (shape === 'rounded' ? 140 : 10);
            const ry = shape === 'oval' ? 220 : rx;
            if (shape === 'oval') {
                return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad}" ry="${(h / 2) - pad}" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="6 18" stroke-linecap="round"/>`;
            }
            return `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="10" stroke-dasharray="6 18" stroke-linecap="round"/>`;
        },
    },
    {
        id: 'imgframe-polaroid',
        name: 'Polaroid',
        nameHe: 'פולארויד',
        category: 'Fun',
        categoryHe: 'כיפי',
        color: '#ffffff',
        shapes: ['rect', 'rounded'],
        svgGen: (w, h, color, shape) => {
            const pad = 80;
            const rx = shape === 'rounded' ? 24 : 8;
            const innerPad = 34;
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${rx}" fill="none" stroke="#ffffff" stroke-width="36"/>
              <rect x="${pad + innerPad}" y="${pad + innerPad}" width="${w - (pad + innerPad) * 2}" height="${h - (pad + innerPad) * 2 - 120}" rx="${Math.max(8, rx - 10)}" ry="${Math.max(8, rx - 10)}" fill="none" stroke="#e5e7eb" stroke-width="6"/>
            `;
        },
    },
    {
        id: 'imgframe-artdeco',
        name: 'Art Deco Steps',
        nameHe: 'ארט דקו',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
        color: '#c0c0c0',
        shapes: ['rect', 'rounded'],
        svgGen: (w, h, color, shape) => {
            const pad = 70;
            const rx = shape === 'rounded' ? 60 : 8;
            const step = 18;
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${rx}" fill="none" stroke="${color}" stroke-width="10"/>
              <path d="M${pad + step} ${pad} H${w - pad - step} M${pad} ${pad + step} V${h - pad - step} M${w - pad} ${pad + step} V${h - pad - step} M${pad + step} ${h - pad} H${w - pad - step}" stroke="${color}" stroke-width="6" opacity="0.9"/>
              <path d="M${pad + step * 2} ${pad + step * 2} H${w - pad - step * 2} V${h - pad - step * 2} H${pad + step * 2} Z" fill="none" stroke="${color}" stroke-width="4" opacity="0.65"/>
            `;
        },
    },
    {
        id: 'imgframe-botanical-corners',
        name: 'Botanical Corners',
        nameHe: 'פינות בוטניות',
        category: 'Nature',
        categoryHe: 'טבע',
        color: '#2C5F2D',
        shapes: ['rect', 'rounded'],
        svgGen: (w, h, color, shape) => {
            const pad = 80;
            const rx = shape === 'rounded' ? 80 : 8;
            const sw = 8;
            const leaf = (x, y, flipX, flipY) => `
              <g transform="translate(${x} ${y}) scale(${flipX} ${flipY})">
                <path d="M0 60 C20 10 70 10 90 60 C70 110 20 110 0 60Z" fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" opacity="0.9"/>
                <path d="M12 60 Q45 40 78 60 Q45 80 12 60Z" fill="none" stroke="${color}" stroke-width="${sw / 2}" opacity="0.55"/>
              </g>`;
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${rx}" fill="none" stroke="${color}" stroke-width="6" opacity="0.55"/>
              ${leaf(pad - 20, pad - 20, 1, 1)}
              ${leaf(w - pad + 20, pad - 20, -1, 1)}
              ${leaf(pad - 20, h - pad + 20, 1, -1)}
              ${leaf(w - pad + 20, h - pad + 20, -1, -1)}
            `;
        },
    },
    {
        id: 'imgframe-beaded',
        name: 'Beaded Pearl',
        nameHe: 'חרוזים',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
        color: '#94a3b8',
        shapes: ['rect', 'rounded', 'oval', 'circle'],
        svgGen: (w, h, color, shape) => {
            const pad = 90;
            const dots = 44;
            const r = 6;
            const rect = (rx, ry) => `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="4" opacity="0.4"/>`;
            const beadDots = () => {
                const pts = [];
                for (let i = 0; i < dots; i++) {
                    const t = i / dots;
                    const xTop = pad + t * (w - pad * 2);
                    const xBot = xTop;
                    const yLeft = pad + t * (h - pad * 2);
                    const yRight = yLeft;
                    pts.push(`<circle cx="${xTop}" cy="${pad}" r="${r}" fill="${color}" opacity="0.75"/>`);
                    pts.push(`<circle cx="${xBot}" cy="${h - pad}" r="${r}" fill="${color}" opacity="0.75"/>`);
                    pts.push(`<circle cx="${pad}" cy="${yLeft}" r="${r}" fill="${color}" opacity="0.75"/>`);
                    pts.push(`<circle cx="${w - pad}" cy="${yRight}" r="${r}" fill="${color}" opacity="0.75"/>`);
                }
                return pts.join('');
            };
            if (shape === 'circle' || shape === 'oval') {
                return `
                  <ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad}" ry="${(h / 2) - pad}" fill="none" stroke="${color}" stroke-width="4" opacity="0.4"/>
                  ${beadDots()}
                `;
            }
            const rx = shape === 'rounded' ? 140 : 12;
            const ry = rx;
            return `${rect(rx, ry)}${beadDots()}`;
        },
    },
    {
        id: 'imgframe-ink-double',
        name: 'Double Ink',
        nameHe: 'דיו כפול',
        category: 'Vintage',
        categoryHe: 'וינטג׳',
        color: '#111827',
        shapes: ['rect', 'rounded'],
        svgGen: (w, h, color, shape) => {
            const pad = 80;
            const rx = shape === 'rounded' ? 90 : 8;
            const gap = 26;
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${rx}" fill="none" stroke="${color}" stroke-width="10" opacity="0.9"/>
              <rect x="${pad + gap}" y="${pad + gap}" width="${w - (pad + gap) * 2}" height="${h - (pad + gap) * 2}" rx="${Math.max(8, rx - gap)}" ry="${Math.max(8, rx - gap)}" fill="none" stroke="${color}" stroke-width="3" opacity="0.6"/>
            `;
        },
    },
    {
        id: 'imgframe-scallop',
        name: 'Scalloped Edge',
        nameHe: 'שוליים מסולסלים',
        category: 'Decorative',
        categoryHe: 'דקורטיבי',
        color: '#0f766e',
        shapes: ['rect', 'rounded', 'oval'],
        svgGen: (w, h, color, shape) => {
            const pad = 88;
            const scallops = 16;
            const amp = 20;
            if (shape === 'oval') {
                return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad}" ry="${(h / 2) - pad}" fill="none" stroke="${color}" stroke-width="12" stroke-dasharray="2 18" stroke-linecap="round" opacity="0.9"/>`;
            }
            const rx = shape === 'rounded' ? 140 : 12;
            const path = [];
            const x0 = pad, y0 = pad, x1 = w - pad, y1 = h - pad;
            // Top wave
            path.push(`M ${x0} ${y0}`);
            for (let i = 0; i < scallops; i++) {
                const t = (i + 0.5) / scallops;
                const x = x0 + t * (x1 - x0);
                path.push(`Q ${x} ${y0 - amp} ${x0 + (i + 1) / scallops * (x1 - x0)} ${y0}`);
            }
            // Right wave
            path.push(`L ${x1} ${y0}`);
            for (let i = 0; i < scallops; i++) {
                const t = (i + 0.5) / scallops;
                const y = y0 + t * (y1 - y0);
                path.push(`Q ${x1 + amp} ${y} ${x1} ${y0 + (i + 1) / scallops * (y1 - y0)}`);
            }
            // Bottom wave
            path.push(`L ${x1} ${y1}`);
            for (let i = 0; i < scallops; i++) {
                const t = (i + 0.5) / scallops;
                const x = x1 - t * (x1 - x0);
                path.push(`Q ${x} ${y1 + amp} ${x1 - (i + 1) / scallops * (x1 - x0)} ${y1}`);
            }
            // Left wave
            path.push(`L ${x0} ${y1}`);
            for (let i = 0; i < scallops; i++) {
                const t = (i + 0.5) / scallops;
                const y = y1 - t * (y1 - y0);
                path.push(`Q ${x0 - amp} ${y} ${x0} ${y1 - (i + 1) / scallops * (y1 - y0)}`);
            }
            path.push('Z');
            return `
              <path d="${path.join(' ')}" fill="none" stroke="${color}" stroke-width="10" opacity="0.9"/>
              <rect x="${pad + 26}" y="${pad + 26}" width="${w - (pad + 26) * 2}" height="${h - (pad + 26) * 2}" rx="${Math.max(10, rx - 20)}" ry="${Math.max(10, rx - 20)}" fill="none" stroke="${color}" stroke-width="3" opacity="0.35"/>
            `;
        },
    },
    {
        id: 'imgframe-neon',
        name: 'Neon Glow',
        nameHe: 'ניאון זוהר',
        category: 'Modern',
        categoryHe: 'מודרני',
        color: '#06b6d4',
        shapes: ['rect', 'rounded', 'oval', 'circle'],
        svgGen: (w, h, color, shape) => {
            const pad = 90;
            const rx = shape === 'circle' ? 500 : (shape === 'oval' ? 320 : (shape === 'rounded' ? 140 : 10));
            const ry = shape === 'circle' ? 500 : (shape === 'oval' ? 220 : rx);
            const glow = `
              <filter id="glow">
                <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>`;
            if (shape === 'circle' || shape === 'oval') {
                return `
                  <defs>${glow}</defs>
                  <ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad}" ry="${(h / 2) - pad}" fill="none" stroke="${color}" stroke-width="10" filter="url(#glow)" opacity="0.9"/>
                  <ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad - 22}" ry="${(h / 2) - pad - 22}" fill="none" stroke="#a5f3fc" stroke-width="3" opacity="0.8"/>
                `;
            }
            return `
              <defs>${glow}</defs>
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="10" filter="url(#glow)" opacity="0.9"/>
              <rect x="${pad + 22}" y="${pad + 22}" width="${w - (pad + 22) * 2}" height="${h - (pad + 22) * 2}" rx="${Math.max(10, rx - 22)}" ry="${Math.max(10, ry - 22)}" fill="none" stroke="#a5f3fc" stroke-width="3" opacity="0.8"/>
            `;
        },
    },
    {
        id: 'imgframe-washi',
        name: 'Washi Tape Corners',
        nameHe: 'וואשי בפינות',
        category: 'Fun',
        categoryHe: 'כיפי',
        color: '#f59e0b',
        shapes: ['rect', 'rounded'],
        svgGen: (w, h, color) => {
            const pad = 85;
            const tW = 160, tH = 60;
            const rect = (x, y, rot) => `<g transform="translate(${x} ${y}) rotate(${rot})"><rect x="-${tW / 2}" y="-${tH / 2}" width="${tW}" height="${tH}" rx="10" fill="${color}" opacity="0.25"/><rect x="-${tW / 2}" y="-${tH / 2}" width="${tW}" height="${tH}" rx="10" fill="none" stroke="${color}" stroke-width="6" opacity="0.45"/></g>`;
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" fill="none" stroke="${color}" stroke-width="6" opacity="0.35"/>
              ${rect(pad + 60, pad + 60, -12)}
              ${rect(w - pad - 60, pad + 60, 12)}
              ${rect(pad + 60, h - pad - 60, 12)}
              ${rect(w - pad - 60, h - pad - 60, -12)}
            `;
        },
    },
    {
        id: 'imgframe-oval-laurel',
        name: 'Laurel Wreath',
        nameHe: 'זר דפנה',
        category: 'Nature',
        categoryHe: 'טבע',
        color: '#16a34a',
        shapes: ['oval', 'circle'],
        svgGen: (w, h, color, shape) => {
            const pad = 105;
            const rx = (w / 2) - pad;
            const ry = (h / 2) - pad;
            // Simple leaf motif around ellipse
            const leaves = [];
            const count = 18;
            for (let i = 0; i < count; i++) {
                const a = (Math.PI * 2 * i) / count;
                const x = (w / 2) + rx * Math.cos(a);
                const y = (h / 2) + ry * Math.sin(a);
                const rot = (a * 180 / Math.PI) + 90;
                leaves.push(`<g transform="translate(${x} ${y}) rotate(${rot})"><path d="M0 0 C10 -18 26 -18 36 0 C26 18 10 18 0 0Z" fill="none" stroke="${color}" stroke-width="6" opacity="0.55"/></g>`);
            }
            return `
              <ellipse cx="${w / 2}" cy="${h / 2}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="10" opacity="0.35"/>
              ${leaves.join('')}
            `;
        },
    },
    {
        id: 'imgframe-minimal-hairline',
        name: 'Minimal Hairline',
        nameHe: 'קו דק מינימלי',
        category: 'Minimal',
        categoryHe: 'מינימלי',
        color: '#0f172a',
        shapes: ['rect', 'rounded', 'oval', 'circle'],
        svgGen: (w, h, color, shape) => {
            const pad = 85;
            if (shape === 'circle' || shape === 'oval') {
                return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad}" ry="${(h / 2) - pad}" fill="none" stroke="${color}" stroke-width="4" opacity="0.65"/>`;
            }
            const rx = shape === 'rounded' ? 120 : 10;
            return `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${rx}" fill="none" stroke="${color}" stroke-width="4" opacity="0.65"/>`;
        },
    },
    {
        id: 'imgframe-dots-gold',
        name: 'Golden Dots',
        nameHe: 'נקודות זהב',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
        color: '#BF953F',
        shapes: ['rect', 'rounded', 'oval', 'circle'],
        svgGen: (w, h, color, shape) => {
            const pad = 92;
            const n = 28;
            const r = 7;
            const dots = [];
            for (let i = 0; i < n; i++) {
                const t = i / (n - 1);
                dots.push(`<circle cx="${pad + t * (w - pad * 2)}" cy="${pad}" r="${r}" fill="${color}" opacity="0.85"/>`);
                dots.push(`<circle cx="${pad + t * (w - pad * 2)}" cy="${h - pad}" r="${r}" fill="${color}" opacity="0.85"/>`);
                dots.push(`<circle cx="${pad}" cy="${pad + t * (h - pad * 2)}" r="${r}" fill="${color}" opacity="0.85"/>`);
                dots.push(`<circle cx="${w - pad}" cy="${pad + t * (h - pad * 2)}" r="${r}" fill="${color}" opacity="0.85"/>`);
            }
            if (shape === 'circle' || shape === 'oval') {
                return `<ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad}" ry="${(h / 2) - pad}" fill="none" stroke="${color}" stroke-width="3" opacity="0.25"/>${dots.join('')}`;
            }
            const rx = shape === 'rounded' ? 140 : 12;
            return `<rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${rx}" fill="none" stroke="${color}" stroke-width="3" opacity="0.25"/>${dots.join('')}`;
        },
    },
    {
        id: 'imgframe-filmstrip',
        name: 'Filmstrip',
        nameHe: 'פילם',
        category: 'Cinematic',
        categoryHe: 'קולנועי',
        color: '#111827',
        shapes: ['rect', 'rounded'],
        svgGen: (w, h, color, shape) => {
            const pad = 80;
            const rx = shape === 'rounded' ? 60 : 8;
            const holes = [];
            const holeCount = 12;
            for (let i = 0; i < holeCount; i++) {
                const t = (i + 0.5) / holeCount;
                const y = pad + t * (h - pad * 2);
                holes.push(`<rect x="${pad - 35}" y="${y - 14}" width="22" height="28" rx="4" fill="${color}" opacity="0.55"/>`);
                holes.push(`<rect x="${w - pad + 13}" y="${y - 14}" width="22" height="28" rx="4" fill="${color}" opacity="0.55"/>`);
            }
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${rx}" fill="none" stroke="${color}" stroke-width="10" opacity="0.85"/>
              ${holes.join('')}
            `;
        },
    },
    {
        id: 'imgframe-watercolor',
        name: 'Watercolor Wash',
        nameHe: 'אקוורל',
        category: 'Art',
        categoryHe: 'אומנות',
        color: '#60a5fa',
        shapes: ['rect', 'rounded', 'oval'],
        svgGen: (w, h, color, shape) => {
            const pad = 90;
            const rx = shape === 'rounded' ? 140 : 14;
            const ry = shape === 'oval' ? 220 : rx;
            if (shape === 'oval') {
                return `
                  <ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad}" ry="${(h / 2) - pad}" fill="none" stroke="${color}" stroke-width="26" opacity="0.20"/>
                  <ellipse cx="${w / 2}" cy="${h / 2}" rx="${(w / 2) - pad - 10}" ry="${(h / 2) - pad - 10}" fill="none" stroke="${color}" stroke-width="8" opacity="0.45"/>
                `;
            }
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${ry}" fill="none" stroke="${color}" stroke-width="26" opacity="0.20"/>
              <rect x="${pad + 10}" y="${pad + 10}" width="${w - (pad + 10) * 2}" height="${h - (pad + 10) * 2}" rx="${Math.max(10, rx - 10)}" ry="${Math.max(10, ry - 10)}" fill="none" stroke="${color}" stroke-width="8" opacity="0.45"/>
            `;
        },
    },
    {
        id: 'imgframe-geo-lines',
        name: 'Geometric Lines',
        nameHe: 'קווים גאומטריים',
        category: 'Graphic',
        categoryHe: 'גרפי',
        color: '#0f766e',
        shapes: ['rect', 'rounded'],
        svgGen: (w, h, color, shape) => {
            const pad = 82;
            const rx = shape === 'rounded' ? 120 : 10;
            return `
              <rect x="${pad}" y="${pad}" width="${w - pad * 2}" height="${h - pad * 2}" rx="${rx}" ry="${rx}" fill="none" stroke="${color}" stroke-width="8" opacity="0.65"/>
              <path d="M${pad} ${pad + 160} L${pad + 160} ${pad} M${w - pad} ${pad + 160} L${w - pad - 160} ${pad} M${pad} ${h - pad - 160} L${pad + 160} ${h - pad} M${w - pad} ${h - pad - 160} L${w - pad - 160} ${h - pad}" stroke="${color}" stroke-width="6" opacity="0.55"/>
            `;
        },
    },
];

// Export for app use
if (typeof window !== 'undefined') {
    window.BACKGROUND_TEXTURES = BACKGROUND_TEXTURES;
    window.PAGE_FRAMES = PAGE_FRAMES;
    window.IMAGE_FRAMES = IMAGE_FRAMES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BACKGROUND_TEXTURES, PAGE_FRAMES, IMAGE_FRAMES };
}
