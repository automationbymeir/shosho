/**
 * Text Styles / WordArt Gallery
 * Predefined text styles for cover and page text.
 */

const TEXT_STYLES = [
    {
        id: 'style-retro-pop',
        name: 'Retro Pop',
        nameHe: 'רטרו פופ',
        category: 'Fun',
        categoryHe: 'כיפי',
        cssClass: 'text-style-retro-pop', // We will inject CSS or inline styles dynamically
        previewText: 'Retro',
        previewTextHe: 'רטרו',
        style: {
            fontFamily: 'Montserrat',
            fontWeight: '900',
            color: '#FF0055',
            textShadow: '3px 3px 0px #00FFFF',
            letterSpacing: '2px',
            textTransform: 'uppercase'
        },
        pdfStyle: {
            font: 'Helvetica-Bold', // Approximate for PDF
            color: '#FF0055',
            shadow: { color: '#00FFFF', offset: [3, 3], blur: 0 }
        }
    },
    {
        id: 'style-neon-glow',
        name: 'Neon Global',
        nameHe: 'ניאון',
        category: 'Modern',
        categoryHe: 'מודרני',
        cssClass: 'text-style-neon',
        previewText: 'Neon',
        previewTextHe: 'ניאון',
        style: {
            fontFamily: 'Courier New',
            fontWeight: 'bold',
            color: '#fff',
            textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 20px #ff00de, 0 0 30px #ff00de, 0 0 40px #ff00de',
            letterSpacing: '1px'
        },
        pdfStyle: {
            font: 'Courier-Bold',
            color: '#FFFFFF',
            // PDFKit doesn't support multiple shadows easily, we'll approximate with a glow
            shadow: { color: '#FF00DE', offset: [0, 0], blur: 10 }
        }
    },
    {
        id: 'style-elegant-gold',
        name: 'Elegant Gold',
        nameHe: 'זהב אלגנטי',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
        previewText: 'Luxe',
        previewTextHe: 'יוקרה',
        style: {
            fontFamily: 'Playfair Display',
            fontWeight: '700',
            background: 'linear-gradient(to right, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C)',
            webkitBackgroundClip: 'text',
            webkitTextFillColor: 'transparent',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)',
            filter: 'drop-shadow(0 2px 0px rgba(0,0,0,0.2))' // Standard shadow to back it up
        },
        // Fallback for non-webkit browsers or simpler implementation
        fallbackStyle: {
            color: '#D4AF37',
            textShadow: '1px 1px 2px rgba(0,0,0,0.3)'
        },
        pdfStyle: {
            font: 'Times-Bold',
            color: '#D4AF37', // Solid gold
            shadow: { color: 'black', offset: [1, 1], blur: 2, opacity: 0.3 }
        }
    },
    {
        id: 'style-vintage-type',
        name: 'Vintage Type',
        nameHe: 'כתב וינטג׳',
        category: 'Vintage',
        categoryHe: 'וינטג׳',
        previewText: 'Type',
        previewTextHe: 'כתב',
        style: {
            fontFamily: 'Special Elite', // Need to ensure font is loaded or fallback
            fontWeight: 'normal',
            color: '#4e342e',
            letterSpacing: '1px',
            textShadow: '1px 1px 0px rgba(255,255,255,0.5)'
        },
        pdfStyle: {
            font: 'Courier',
            color: '#4E342E',
            shadow: { color: 'white', offset: [1, 1], blur: 0, opacity: 0.5 }
        }
    },
    {
        id: 'style-comic-fun',
        name: 'Comic Book',
        nameHe: 'קומיקס',
        category: 'Fun',
        categoryHe: 'כיפי',
        previewText: 'BAM!',
        previewTextHe: 'בום!',
        style: {
            fontFamily: 'Bangers, Impact, sans-serif',
            color: '#FFD700',
            webkitTextStroke: '2px black',
            textShadow: '4px 4px 0px black',
            transform: 'rotate(-2deg)',
            display: 'inline-block'
        },
        pdfStyle: {
            font: 'Helvetica-Bold',
            color: '#FFD700',
            stroke: { color: 'black', width: 2 },
            shadow: { color: 'black', offset: [4, 4], blur: 0 }
        }
    },
    {
        id: 'style-minimal-shadow',
        name: 'Soft Shadow',
        nameHe: 'צל רך',
        category: 'Minimal',
        categoryHe: 'מינימלי',
        previewText: 'Soft',
        previewTextHe: 'רך',
        style: {
            fontFamily: 'Inter',
            fontWeight: '600',
            color: '#333',
            textShadow: '2px 2px 10px rgba(0,0,0,0.2)'
        },
        pdfStyle: {
            font: 'Helvetica-Bold',
            color: '#333333',
            shadow: { color: 'black', offset: [2, 2], blur: 5, opacity: 0.2 }
        }
    }
    ,
    // --- Added set (6 more) ---
    {
        id: 'style-bold-serif',
        name: 'Bold Serif',
        nameHe: 'סריף מודגש',
        category: 'Elegant',
        categoryHe: 'אלגנטי',
        previewText: 'Serif',
        previewTextHe: 'סריף',
        style: {
            fontFamily: 'DM Serif Display',
            fontWeight: '700',
            color: '#0f172a',
            letterSpacing: '1px'
        },
        pdfStyle: { font: 'Times-Bold', color: '#0F172A' }
    },
    {
        id: 'style-stamp',
        name: 'Rubber Stamp',
        nameHe: 'חותמת גומי',
        category: 'Vintage',
        categoryHe: 'וינטג׳',
        previewText: 'STAMP',
        previewTextHe: 'חותמת',
        style: {
            fontFamily: 'Inter',
            fontWeight: '800',
            color: '#7f1d1d',
            textTransform: 'uppercase',
            letterSpacing: '3px',
            border: '2px solid rgba(127,29,29,0.6)',
            padding: '6px 10px',
            display: 'inline-block',
            transform: 'rotate(-2deg)'
        },
        fallbackStyle: {
            fontFamily: 'Inter',
            fontWeight: '800',
            color: '#7f1d1d'
        },
        pdfStyle: { font: 'Helvetica-Bold', color: '#7F1D1D' }
    },
    {
        id: 'style-outline',
        name: 'Outline',
        nameHe: 'קו מתאר',
        category: 'Modern',
        categoryHe: 'מודרני',
        previewText: 'Outline',
        previewTextHe: 'מתאר',
        style: {
            fontFamily: 'Inter',
            fontWeight: '900',
            color: 'transparent',
            webkitTextStroke: '2px #111827',
            letterSpacing: '1px',
            textTransform: 'uppercase'
        },
        fallbackStyle: {
            color: '#111827'
        },
        pdfStyle: { font: 'Helvetica-Bold', color: '#111827' }
    },
    {
        id: 'style-gradient-blue',
        name: 'Ocean Gradient',
        nameHe: 'גרדיאנט אוקיינוס',
        category: 'Modern',
        categoryHe: 'מודרני',
        previewText: 'Ocean',
        previewTextHe: 'אוקיינוס',
        style: {
            fontFamily: 'DM Sans',
            fontWeight: '800',
            background: 'linear-gradient(90deg, #1d4ed8, #06b6d4)',
            webkitBackgroundClip: 'text',
            webkitTextFillColor: 'transparent',
            letterSpacing: '1px'
        },
        fallbackStyle: {
            color: '#1d4ed8'
        },
        pdfStyle: { font: 'Helvetica-Bold', color: '#1D4ED8' }
    },
    {
        id: 'style-handwritten',
        name: 'Handwritten Note',
        nameHe: 'פתק בכתב יד',
        category: 'Fun',
        categoryHe: 'כיפי',
        previewText: 'Note',
        previewTextHe: 'פתק',
        style: {
            fontFamily: 'DM Sans',
            fontWeight: '600',
            color: '#334155',
            fontStyle: 'italic',
            textShadow: '0 1px 0 rgba(0,0,0,0.12)'
        },
        pdfStyle: { font: 'Helvetica-Oblique', color: '#334155' }
    },
    {
        id: 'style-minimal-caps',
        name: 'Minimal Caps',
        nameHe: 'אותיות גדולות מינימליות',
        category: 'Minimal',
        categoryHe: 'מינימלי',
        previewText: 'CAPS',
        previewTextHe: 'גדולות',
        style: {
            fontFamily: 'Inter',
            fontWeight: '700',
            color: '#111827',
            letterSpacing: '6px',
            textTransform: 'uppercase'
        },
        pdfStyle: { font: 'Helvetica-Bold', color: '#111827' }
    }
];

if (typeof window !== 'undefined') {
    window.TEXT_STYLES = TEXT_STYLES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TEXT_STYLES };
}
