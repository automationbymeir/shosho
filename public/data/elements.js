window.ELEMENTS_LIBRARY = [];

const svgBase = (content, viewBox = "0 0 100 100") => 'data:image/svg+xml;utf8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}">${content}</svg>`);

let globalId = 1;
function pushEl(cat, tags, title, svgContent) {
    window.ELEMENTS_LIBRARY.push({
        id: `el_${cat}_${globalId++}`,
        category: cat,
        tags: tags,
        title: title,
        type: 'element',
        url: svgBase(svgContent)
    });
}

// ==========================================
// 1. חוף וקיץ (Beach) - 10 Elements
// ==========================================
const beachTags = ['beach', 'summer', 'sea', 'ocean', 'sun', 'חוף', 'ים', 'קיץ', 'אוקיינוס', 'שמש'];
const sunColors = ['#FFD700', '#FFC107', '#FFEB3B', '#FBC02D', '#FFA000'];
const waveColors = ['#0288D1', '#039BE5', '#00BCD4', '#4DD0E1', '#00ACC1'];

sunColors.forEach((color, i) => {
    const rays = i % 2 === 0 ? 8 : 12;
    let paths = `<circle cx="50" cy="50" r="22" fill="${color}"/>`;
    for (let r = 0; r < rays; r++) {
        const rot = (360 / rays) * r;
        paths += `<line x1="50" y1="10" x2="50" y2="20" stroke="${color}" stroke-width="5" stroke-linecap="round" transform="rotate(${rot} 50 50)"/>`;
    }
    pushEl('beach', beachTags, `שמש קיצית ${i + 1}`, paths);
});
waveColors.forEach((color, i) => {
    pushEl('beach', beachTags, `גלי ים ${i + 1}`,
        `<path d="M0 60 Q 25 ${30 - i * 2}, 50 60 T 100 60 L 100 100 L 0 100 Z" fill="${color}" opacity="0.8"/>
         <path d="M0 70 Q 25 ${50 - i * 2}, 50 70 T 100 70 L 100 100 L 0 100 Z" fill="${color}" opacity="0.5"/>`
    );
});


// ==========================================
// 2. חתונה ואהבה (Wedding) - 10 Elements
// ==========================================
const weddingTags = ['wedding', 'love', 'romanace', 'heart', 'couple', 'חתונה', 'אהבה', 'זוגיות', 'לב', 'טבעות'];
const heartColors = ['#FF4081', '#E91E63', '#F44336', '#FF8A80', '#FF1744', '#FFB6C1', '#D81B60', '#AD1457', '#F48FB1', '#C2185B'];

heartColors.forEach((color, i) => {
    pushEl('wedding', weddingTags, `לב אהבה ${i + 1}`,
        `<path d="M50 85 Q 20 55, 20 35 A 16 16 0 0 1 50 35 A 16 16 0 0 1 80 35 Q 80 55, 50 85" fill="${color}"/>
         ${i % 2 === 0 ? `<path d="M50 85 Q 20 55, 20 35 A 16 16 0 0 1 50 35 A 16 16 0 0 1 80 35 Q 80 55, 50 85" fill="none" stroke="#fff" stroke-width="3" opacity="0.5"/>` : ''}
        `
    );
});


// ==========================================
// 3. בייבי (Baby) - 10 Elements
// ==========================================
const babyTags = ['baby', 'cute', 'kids', 'star', 'cloud', 'תינוק', 'בייבי', 'ילדים', 'חמוד', 'כוכב', 'ענן'];
const starColors = ['#FFD700', '#FFC107', '#FFF59D', '#FFE082', '#FFB300'];
const pastelColors = ['#E0F7FA', '#F3E5F5', '#FFF9C4', '#FFEBEE', '#E8F5E9'];

starColors.forEach((color, i) => {
    pushEl('baby', babyTags, `כוכב חמוד ${i + 1}`,
        `<path d="M50 15 l 9 27 h 28 l -23 16 l 9 27 l -23 -16 l -23 16 l 9 -27 l -23 -16 h 28 z" fill="${color}"/>`
    );
});
pastelColors.forEach((color, i) => {
    pushEl('baby', babyTags, `ענן כותנה ${i + 1}`,
        `<path d="M30 65 A 20 20 0 0 1 50 35 A 24 24 0 0 1 80 55 A 15 15 0 0 1 80 85 L 30 85 A 15 15 0 0 1 30 65 Z" fill="${color}" stroke="#ddd" stroke-width="1.5"/>`
    );
});


// ==========================================
// 4. טיול (Travel) - 10 Elements
// ==========================================
const travelTags = ['travel', 'vacation', 'trip', 'pin', 'map', 'טיול', 'חופשה', 'יעד', 'מפה', 'מיקום', 'דרכון'];
const pinColors = ['#F44336', '#E53935', '#D32F2F', '#C62828', '#FF5252', '#FF1744', '#D50000', '#FF8A80', '#E91E63', '#C2185B'];

pinColors.forEach((color, i) => {
    pushEl('travel', travelTags, `נקודת ציון ${i + 1}`,
        `<path d="M50 10 C 30 10, 20 30, 20 45 C 20 65, 50 90, 50 90 C 50 90, 80 65, 80 45 C 80 30, 70 10, 50 10 Z" fill="${color}"/>
         <circle cx="50" cy="40" r="14" fill="#FFFFFF"/>
         ${i % 2 === 0 ? `<circle cx="50" cy="40" r="6" fill="${color}"/>` : ''}`
    );
});


// ==========================================
// 5. יומולדת ומסיבה (Birthday & Party) - 10 Elements
// ==========================================
const partyTags = ['party', 'birthday', 'celebration', 'balloon', 'crown', 'יומולדת', 'מסיבה', 'בלון', 'חגיגה', 'כתר'];
const crownColors = ['#FFD700', '#FFC107', '#FFB300', '#FFA000', '#F57C00'];
const balloonColors = ['#F44336', '#2196F3', '#4CAF50', '#9C27B0', '#00BCD4'];

crownColors.forEach((color, i) => {
    pushEl('birthday', partyTags, `כתר חגיגי ${i + 1}`,
        `<path d="M10 80 L 20 30 L 40 50 L 50 20 L 60 50 L 80 30 L 90 80 Z" fill="${color}"/>
         <rect x="15" y="85" width="70" height="5" fill="#333" opacity="0.3"/>
         <circle cx="20" cy="25" r="4" fill="#fff" opacity="0.8"/>
         <circle cx="50" cy="15" r="4" fill="#fff" opacity="0.8"/>
         <circle cx="80" cy="25" r="4" fill="#fff" opacity="0.8"/>`
    );
});
balloonColors.forEach((color, i) => {
    pushEl('birthday', partyTags, `בלון פורח ${i + 1}`,
        `<path d="M50 80 Q 50 95, 40 100" fill="none" stroke="#666" stroke-width="2"/>
         <ellipse cx="50" cy="40" rx="30" ry="40" fill="${color}"/>
         <polygon points="50,80 45,86 55,86" fill="${color}"/>
         <path d="M35 25 A 15 15 0 0 1 45 15" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity="0.4"/>`
    );
});


// ==========================================
// 6. טבע ופרחים (Nature & Flowers) - 10 Elements
// ==========================================
const natureTags = ['nature', 'flower', 'leaf', 'spring', 'green', 'טבע', 'פרח', 'אביב', 'עלה', 'ירוק', 'פארק'];
const flowerColors = ['#9C27B0', '#673AB7', '#E91E63', '#FF5722', '#F44336'];
const leafColors = ['#4CAF50', '#8BC34A', '#CDDC39', '#009688', '#388E3C'];

flowerColors.forEach((color, i) => {
    pushEl('nature', natureTags, `פרח קטן ${i + 1}`,
        `<circle cx="50" cy="25" r="18" fill="${color}"/>
         <circle cx="75" cy="50" r="18" fill="${color}"/>
         <circle cx="50" cy="75" r="18" fill="${color}"/>
         <circle cx="25" cy="50" r="18" fill="${color}"/>
         <circle cx="50" cy="50" r="14" fill="#FFC107"/>`
    );
});
leafColors.forEach((color, i) => {
    pushEl('nature', natureTags, `עלה ירוק ${i + 1}`,
        `<path d="M50 90 C 20 90, 10 50, 50 10 C 90 50, 80 90, 50 90 Z" fill="${color}"/>
         <path d="M50 15 Q 50 50, 50 90" fill="none" stroke="#fff" stroke-width="3" opacity="0.5"/>
         ${i % 2 === 0 ? `<path d="M50 50 L 35 40" fill="none" stroke="#fff" stroke-width="2" opacity="0.5"/><path d="M50 65 L 65 55" fill="none" stroke="#fff" stroke-width="2" opacity="0.5"/>` : ''}`
    );
});


// ==========================================
// 7. אוכל ומתוקים (Food) - 10 Elements
// ==========================================
const foodTags = ['food', 'sweet', 'icecream', 'cake', 'אוכל', 'מתוק', 'גלידה', 'עוגה', 'קינוח'];
const iceCreamColors = ['#F8BBD0', '#D1C4E9', '#B2DFDB', '#FFE082', '#FFCCBC'];
const coneColors = ['#FFCA28', '#FFB300', '#FFA000', '#FF8F00', '#F57C00'];

iceCreamColors.forEach((color, i) => {
    pushEl('food', foodTags, `גלידה ${i + 1}`,
        `<polygon points="50,90 30,50 70,50" fill="${coneColors[i]}"/>
         <circle cx="50" cy="40" r="22" fill="${color}"/>
         <circle cx="35" cy="50" r="8" fill="${color}"/>
         <circle cx="65" cy="50" r="8" fill="${color}"/>
         ${i % 2 === 0 ? `<circle cx="45" cy="30" r="3" fill="#fff" opacity="0.8"/>` : ''}`
    );
});
iceCreamColors.forEach((color, i) => {
    pushEl('food', foodTags, `קאפקייק ${i + 1}`,
        `<polygon points="35,85 65,85 70,55 30,55" fill="${coneColors[4 - i]}"/>
         <path d="M25 55 Q 50 20, 75 55 Z" fill="${color}"/>
         <circle cx="50" cy="20" r="8" fill="#F44336"/>`
    );
});


// ==========================================
// 8. חיות (Animals) - 10 Elements
// ==========================================
const animalTags = ['animal', 'pet', 'dog', 'cat', 'wild', 'חיה', 'כלב', 'חתול', 'טבע', 'חיות מחמד'];
const animalColors = ['#795548', '#8D6E63', '#BCAAA4', '#5D4037', '#A1887F', '#FFA726', '#FF9800', '#424242', '#757575', '#BDBDBD'];

animalColors.forEach((color, i) => {
    pushEl('animals', animalTags, `כפות חיה ${i + 1}`,
        `<path d="M40 50 Q 30 70, 35 85 Q 40 95, 45 85 Q 50 70, 40 50" fill="${color}"/>
         <path d="M60 50 Q 70 70, 65 85 Q 60 95, 55 85 Q 50 70, 60 50" fill="${color}"/>
         <circle cx="30" cy="40" r="6" fill="${color}"/>
         <circle cx="42" cy="32" r="7" fill="${color}"/>
         <circle cx="58" cy="32" r="7" fill="${color}"/>
         <circle cx="70" cy="40" r="6" fill="${color}"/>`
    );
});


// ==========================================
// 9. מוזיקה (Music) - 10 Elements
// ==========================================
const musicTags = ['music', 'song', 'party', 'note', 'מוזיקה', 'שיר', 'מסיבה', 'צליל', 'תו'];
const noteColors = ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#03A9F4', '#00BCD4', '#009688', '#4CAF50', '#8BC34A'];

noteColors.forEach((color, i) => {
    pushEl('music', musicTags, `תו מוזיקלי ${i + 1}`,
        `<circle cx="30" cy="75" r="12" fill="${color}"/>
         <circle cx="70" cy="65" r="12" fill="${color}"/>
         <rect x="37" y="25" width="5" height="50" fill="${color}"/>
         <rect x="77" y="15" width="5" height="50" fill="${color}"/>
         <polygon points="37,25 82,15 82,25 37,35" fill="${color}"/>`
    );
});


// ==========================================
// 10. מסגרות וצורות (Frames & Shapes) - 10 Elements
// ==========================================
const shapesTags = ['shape', 'frame', 'geometry', 'design', 'צורה', 'מסגרת', 'עיצוב', 'רקע', 'קישוט'];
const shapeColors = ['#F44336', '#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3', '#00BCD4', '#009688', '#4CAF50', '#FF9800'];

shapeColors.forEach((color, i) => {
    pushEl('shapes', shapesTags, `מסגרת / צורה ${i + 1}`,
        `<rect x="15" y="15" width="70" height="70" fill="none" stroke="${color}" stroke-width="${4 + (i % 3) * 2}" rx="${(i * 5)}" stroke-dasharray="${i % 2 === 0 ? 'none' : '10,5'}"/>`
    );
});


// ==========================================
// 11. דגלי מדינות (Country Flags) - 40+ Flags
// ==========================================
// Helper for flag SVGs (3:2 aspect ratio)
function pushFlag(countryCode, nameEn, nameHe, svgContent) {
    const tags = ['flag', 'flags', 'country', 'דגל', 'דגלים', 'מדינה', nameEn.toLowerCase(), nameHe];
    window.ELEMENTS_LIBRARY.push({
        id: `el_flags_${countryCode}`,
        category: 'flags',
        tags: tags,
        title: `🏳️ ${nameHe} (${nameEn})`,
        type: 'element',
        countryCode: countryCode,
        countryNameEn: nameEn,
        countryNameHe: nameHe,
        url: svgBase(svgContent, '0 0 150 100')
    });
}

// Helper: 5-pointed star polygon points string
function starPts(cx, cy, R) {
    const r = R * 0.38;
    const pts = [];
    for (let i = 0; i < 10; i++) {
        const a = (i * 36 - 90) * Math.PI / 180;
        const rad = i % 2 === 0 ? R : r;
        pts.push(`${(cx + rad * Math.cos(a)).toFixed(1)},${(cy + rad * Math.sin(a)).toFixed(1)}`);
    }
    return pts.join(' ');
}

// Israel — Star of David = two overlapping equilateral triangles
pushFlag('IL', 'Israel', 'ישראל',
    `<rect width="150" height="100" fill="#fff"/>
     <rect y="8" width="150" height="15" fill="#0038b8"/>
     <rect y="77" width="150" height="15" fill="#0038b8"/>
     <polygon points="75,28 56,61 94,61" fill="none" stroke="#0038b8" stroke-width="2.5"/>
     <polygon points="75,72 56,39 94,39" fill="none" stroke="#0038b8" stroke-width="2.5"/>`);

// USA — 13 stripes + blue canton with 50 star polygons
(function () {
    let s = `<rect width="150" height="100" fill="#B22234"/>`;
    for (let i = 0; i < 6; i++) s += `<rect y="${(7.69 + i * 15.38).toFixed(1)}" width="150" height="7.69" fill="#fff"/>`;
    s += `<rect width="60" height="53.85" fill="#3C3B6E"/>`;
    for (let row = 0; row < 9; row++) {
        const cols = row % 2 === 0 ? 6 : 5;
        const sx = row % 2 === 0 ? 5 : 10;
        for (let c = 0; c < cols; c++) {
            s += `<polygon points="${starPts(sx + c * 10, 3 + row * 6, 2.3)}" fill="#fff"/>`;
        }
    }
    pushFlag('US', 'United States', 'ארצות הברית', s);
})();

// UK — Union Jack
pushFlag('GB', 'United Kingdom', 'בריטניה',
    `<rect width="150" height="100" fill="#012169"/>
     <path d="M0,0 L150,100 M150,0 L0,100" stroke="#fff" stroke-width="15"/>
     <path d="M0,0 L150,100 M150,0 L0,100" stroke="#C8102E" stroke-width="8"/>
     <path d="M75,0 V100 M0,50 H150" stroke="#fff" stroke-width="25"/>
     <path d="M75,0 V100 M0,50 H150" stroke="#C8102E" stroke-width="15"/>`);

// France
pushFlag('FR', 'France', 'צרפת',
    `<rect width="50" height="100" fill="#002395"/><rect x="50" width="50" height="100" fill="#fff"/><rect x="100" width="50" height="100" fill="#ED2939"/>`);

// Germany
pushFlag('DE', 'Germany', 'גרמניה',
    `<rect width="150" height="33" fill="#000"/><rect y="33" width="150" height="34" fill="#DD0000"/><rect y="67" width="150" height="33" fill="#FFCC00"/>`);

// Italy
pushFlag('IT', 'Italy', 'איטליה',
    `<rect width="50" height="100" fill="#009246"/><rect x="50" width="50" height="100" fill="#fff"/><rect x="100" width="50" height="100" fill="#CE2B37"/>`);

// Spain
pushFlag('ES', 'Spain', 'ספרד',
    `<rect width="150" height="25" fill="#AA151B"/><rect y="25" width="150" height="50" fill="#F1BF00"/><rect y="75" width="150" height="25" fill="#AA151B"/>`);

// Japan
pushFlag('JP', 'Japan', 'יפן',
    `<rect width="150" height="100" fill="#fff"/><circle cx="75" cy="50" r="25" fill="#BC002D"/>`);

// Thailand
pushFlag('TH', 'Thailand', 'תאילנד',
    `<rect width="150" height="100" fill="#A51931"/><rect y="17" width="150" height="66" fill="#F4F5F8"/><rect y="33" width="150" height="34" fill="#2D2A4A"/>`);

// Greece
pushFlag('GR', 'Greece', 'יוון',
    `<rect width="150" height="100" fill="#0D5EAF"/>
     <rect y="11" width="150" height="11" fill="#fff"/><rect y="33" width="150" height="11" fill="#fff"/>
     <rect y="55" width="150" height="11" fill="#fff"/><rect y="77" width="150" height="11" fill="#fff"/>
     <rect width="56" height="55" fill="#0D5EAF"/><path d="M0,27.5 H56 M28,0 V55" stroke="#fff" stroke-width="11"/>`);

// Turkey — red with white crescent and star
pushFlag('TR', 'Turkey', 'טורקיה',
    `<rect width="150" height="100" fill="#E30A17"/>
     <circle cx="55" cy="50" r="22" fill="#fff"/>
     <circle cx="62" cy="50" r="18" fill="#E30A17"/>
     <polygon points="${starPts(83, 50, 9)}" fill="#fff"/>`);

// Brazil
pushFlag('BR', 'Brazil', 'ברזיל',
    `<rect width="150" height="100" fill="#009C3B"/><polygon points="75,10 140,50 75,90 10,50" fill="#FFDF00"/>
     <circle cx="75" cy="50" r="22" fill="#002776"/><path d="M53,50 Q75,38 97,50" stroke="#fff" stroke-width="3" fill="none"/>`);

// India — with 24-spoke Ashoka Chakra
(function () {
    let s = `<rect width="150" height="33" fill="#FF9933"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#138808"/>`;
    s += `<circle cx="75" cy="50" r="11" fill="none" stroke="#000080" stroke-width="1.5"/>`;
    s += `<circle cx="75" cy="50" r="1.5" fill="#000080"/>`;
    for (let i = 0; i < 24; i++) {
        const a = i * 15 * Math.PI / 180;
        s += `<line x1="75" y1="50" x2="${(75 + 10.5 * Math.cos(a)).toFixed(1)}" y2="${(50 + 10.5 * Math.sin(a)).toFixed(1)}" stroke="#000080" stroke-width="0.5"/>`;
    }
    pushFlag('IN', 'India', 'הודו', s);
})();


// Australia — Union Jack canton + Commonwealth Star + Southern Cross
pushFlag('AU', 'Australia', 'אוסטרליה',
    `<rect width="150" height="100" fill="#00008B"/>
     <rect width="60" height="50" fill="#00008B"/>
     <path d="M0,0 L60,50 M60,0 L0,50" stroke="#fff" stroke-width="7"/>
     <path d="M30,0 V50 M0,25 H60" stroke="#fff" stroke-width="12"/>
     <path d="M30,0 V50 M0,25 H60" stroke="#CF142B" stroke-width="6"/>
     <polygon points="${starPts(30, 72, 9)}" fill="#fff"/>
     <polygon points="${starPts(110, 25, 5)}" fill="#fff"/>
     <polygon points="${starPts(130, 42, 5)}" fill="#fff"/>
     <polygon points="${starPts(120, 65, 5)}" fill="#fff"/>
     <polygon points="${starPts(100, 58, 5)}" fill="#fff"/>
     <polygon points="${starPts(115, 48, 3)}" fill="#fff"/>`);

// Canada — red maple leaf
pushFlag('CA', 'Canada', 'קנדה',
    `<rect width="37" height="100" fill="#FF0000"/><rect x="37" width="76" height="100" fill="#fff"/><rect x="113" width="37" height="100" fill="#FF0000"/>
     <path d="M75,18 L77,30 L84,26 L80,34 L90,36 L82,42 L86,44 L75,52 L64,44 L68,42 L60,36 L70,34 L66,26 L73,30 Z" fill="#FF0000"/>
     <rect x="73" y="52" width="4" height="14" fill="#FF0000"/>`);

// Mexico
pushFlag('MX', 'Mexico', 'מקסיקו',
    `<rect width="50" height="100" fill="#006341"/><rect x="50" width="50" height="100" fill="#fff"/><rect x="100" width="50" height="100" fill="#CE1126"/>
     <circle cx="75" cy="50" r="12" fill="#006341" opacity="0.3"/>`);

// South Korea — Taeguk + trigrams
pushFlag('KR', 'South Korea', 'דרום קוריאה',
    `<rect width="150" height="100" fill="#fff"/>
     <circle cx="75" cy="50" r="22" fill="#C60C30"/>
     <path d="M75,28 A11,11 0 0,1 75,50 A11,11 0 0,0 75,72 A22,22 0 0,1 75,28" fill="#003478"/>
     <g transform="rotate(33, 75, 50)"><rect x="102" y="41" width="24" height="3" fill="#000"/><rect x="102" y="47" width="24" height="3" fill="#000"/><rect x="102" y="53" width="24" height="3" fill="#000"/></g>
     <g transform="rotate(33, 75, 50)"><rect x="24" y="41" width="24" height="3" fill="#000"/><rect x="24" y="47" width="10" height="3" fill="#000"/><rect x="38" y="47" width="10" height="3" fill="#000"/><rect x="24" y="53" width="24" height="3" fill="#000"/></g>
     <g transform="rotate(-33, 75, 50)"><rect x="102" y="41" width="10" height="3" fill="#000"/><rect x="116" y="41" width="10" height="3" fill="#000"/><rect x="102" y="47" width="24" height="3" fill="#000"/><rect x="102" y="53" width="10" height="3" fill="#000"/><rect x="116" y="53" width="10" height="3" fill="#000"/></g>
     <g transform="rotate(-33, 75, 50)"><rect x="24" y="41" width="10" height="3" fill="#000"/><rect x="38" y="41" width="10" height="3" fill="#000"/><rect x="24" y="47" width="10" height="3" fill="#000"/><rect x="38" y="47" width="10" height="3" fill="#000"/><rect x="24" y="53" width="10" height="3" fill="#000"/><rect x="38" y="53" width="10" height="3" fill="#000"/></g>`);

// Netherlands
pushFlag('NL', 'Netherlands', 'הולנד',
    `<rect width="150" height="33" fill="#AE1C28"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#21468B"/>`);

// Portugal
pushFlag('PT', 'Portugal', 'פורטוגל',
    `<rect width="60" height="100" fill="#006600"/><rect x="60" width="90" height="100" fill="#FF0000"/>
     <circle cx="60" cy="50" r="15" fill="#FFCC00"/><circle cx="60" cy="50" r="11" fill="#fff"/>
     <path d="M52,44 L60,56 L68,44" fill="none" stroke="#FF0000" stroke-width="2.5"/>`);

// Switzerland — centered white cross
pushFlag('CH', 'Switzerland', 'שוויץ',
    `<rect width="150" height="100" fill="#D52B1E"/>
     <rect x="65" y="20" width="20" height="60" fill="#fff"/>
     <rect x="45" y="40" width="60" height="20" fill="#fff"/>`);

// Russia
pushFlag('RU', 'Russia', 'רוסיה',
    `<rect width="150" height="33" fill="#fff"/><rect y="33" width="150" height="34" fill="#0039A6"/><rect y="67" width="150" height="33" fill="#D52B1E"/>`);

// China — 1 large + 4 small stars
pushFlag('CN', 'China', 'סין',
    `<rect width="150" height="100" fill="#DE2910"/>
     <polygon points="${starPts(25, 20, 10)}" fill="#FFDE00"/>
     <polygon points="${starPts(45, 10, 4)}" fill="#FFDE00"/>
     <polygon points="${starPts(52, 18, 4)}" fill="#FFDE00"/>
     <polygon points="${starPts(52, 30, 4)}" fill="#FFDE00"/>
     <polygon points="${starPts(45, 38, 4)}" fill="#FFDE00"/>`);

// Argentina
pushFlag('AR', 'Argentina', 'ארגנטינה',
    `<rect width="150" height="33" fill="#74ACDF"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#74ACDF"/>
     <circle cx="75" cy="50" r="12" fill="#F6B40E"/>`);

// Morocco
pushFlag('MA', 'Morocco', 'מרוקו',
    `<rect width="150" height="100" fill="#C1272D"/>
     <polygon points="${starPts(75, 50, 18)}" fill="none" stroke="#006233" stroke-width="4"/>`);

// Egypt — red-white-black with golden Eagle of Saladin
pushFlag('EG', 'Egypt', 'מצרים',
    `<rect width="150" height="33" fill="#CE1126"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#000"/>
     <path d="M62,40 L75,38 L88,40 L86,52 L83,56 L80,54 L78,56 L75,55 L72,56 L70,54 L67,56 L64,52 Z" fill="#C09300"/>
     <rect x="70" y="56" width="10" height="3" fill="#C09300"/>`);

// UAE
pushFlag('AE', 'UAE', 'איחוד האמירויות',
    `<rect width="150" height="33" fill="#00732F"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#000"/>
     <rect width="35" height="100" fill="#FF0000"/>`);

// Jordan
pushFlag('JO', 'Jordan', 'ירדן',
    `<rect width="150" height="33" fill="#000"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#007A3D"/>
     <polygon points="0,0 60,50 0,100" fill="#CE1126"/>
     <polygon points="${starPts(20, 50, 6)}" fill="#fff"/>`);

// Colombia
pushFlag('CO', 'Colombia', 'קולומביה',
    `<rect width="150" height="50" fill="#FCD116"/><rect y="50" width="150" height="25" fill="#003893"/><rect y="75" width="150" height="25" fill="#CE1126"/>`);

// Poland
pushFlag('PL', 'Poland', 'פולין',
    `<rect width="150" height="50" fill="#fff"/><rect y="50" width="150" height="50" fill="#DC143C"/>`);

// Czech Republic
pushFlag('CZ', 'Czech Republic', 'צ׳כיה',
    `<rect width="150" height="50" fill="#fff"/><rect y="50" width="150" height="50" fill="#D7141A"/>
     <polygon points="0,0 70,50 0,100" fill="#11457E"/>`);

// Hungary
pushFlag('HU', 'Hungary', 'הונגריה',
    `<rect width="150" height="33" fill="#CE2939"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#477050"/>`);

// Austria
pushFlag('AT', 'Austria', 'אוסטריה',
    `<rect width="150" height="33" fill="#ED2939"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#ED2939"/>`);

// Belgium
pushFlag('BE', 'Belgium', 'בלגיה',
    `<rect width="50" height="100" fill="#000"/><rect x="50" width="50" height="100" fill="#FAE042"/><rect x="100" width="50" height="100" fill="#ED2939"/>`);

// Romania
pushFlag('RO', 'Romania', 'רומניה',
    `<rect width="50" height="100" fill="#002B7F"/><rect x="50" width="50" height="100" fill="#FCD116"/><rect x="100" width="50" height="100" fill="#CE1126"/>`);

// Norway
pushFlag('NO', 'Norway', 'נורווגיה',
    `<rect width="150" height="100" fill="#EF2B2D"/>
     <rect x="40" width="20" height="100" fill="#fff"/><rect y="35" width="150" height="30" fill="#fff"/>
     <rect x="45" width="10" height="100" fill="#002868"/><rect y="40" width="150" height="20" fill="#002868"/>`);

// Sweden
pushFlag('SE', 'Sweden', 'שוודיה',
    `<rect width="150" height="100" fill="#006AA7"/>
     <rect x="40" width="20" height="100" fill="#FECC00"/><rect y="35" width="150" height="30" fill="#FECC00"/>`);

// Denmark
pushFlag('DK', 'Denmark', 'דנמרק',
    `<rect width="150" height="100" fill="#C8102E"/>
     <rect x="40" width="15" height="100" fill="#fff"/><rect y="38" width="150" height="24" fill="#fff"/>`);

// Finland
pushFlag('FI', 'Finland', 'פינלנד',
    `<rect width="150" height="100" fill="#fff"/>
     <rect x="40" width="20" height="100" fill="#003580"/><rect y="35" width="150" height="30" fill="#003580"/>`);

// Iceland
pushFlag('IS', 'Iceland', 'איסלנד',
    `<rect width="150" height="100" fill="#003897"/>
     <rect x="35" width="25" height="100" fill="#fff"/><rect y="32.5" width="150" height="35" fill="#fff"/>
     <rect x="40" width="15" height="100" fill="#D72828"/><rect y="37.5" width="150" height="25" fill="#D72828"/>`);

// Croatia
pushFlag('HR', 'Croatia', 'קרואטיה',
    `<rect width="150" height="33" fill="#FF0000"/><rect y="33" width="150" height="34" fill="#fff"/><rect y="67" width="150" height="33" fill="#171796"/>
     <rect x="60" y="18" width="30" height="30" fill="#FF0000" stroke="#fff" stroke-width="1"/>
     <line x1="70" y1="18" x2="70" y2="48" stroke="#fff" stroke-width="1"/><line x1="80" y1="18" x2="80" y2="48" stroke="#fff" stroke-width="1"/>
     <line x1="60" y1="28" x2="90" y2="28" stroke="#fff" stroke-width="1"/><line x1="60" y1="38" x2="90" y2="38" stroke="#fff" stroke-width="1"/>`);

// Serbia
pushFlag('RS', 'Serbia', 'סרביה',
    `<rect width="150" height="33" fill="#C6363C"/><rect y="33" width="150" height="34" fill="#0C4076"/><rect y="67" width="150" height="33" fill="#fff"/>`);

// Bulgaria
pushFlag('BG', 'Bulgaria', 'בולגריה',
    `<rect width="150" height="33" fill="#fff"/><rect y="33" width="150" height="34" fill="#00966E"/><rect y="67" width="150" height="33" fill="#D62612"/>`);

// Lithuania
pushFlag('LT', 'Lithuania', 'ליטא',
    `<rect width="150" height="33" fill="#FDB913"/><rect y="33" width="150" height="34" fill="#006A44"/><rect y="67" width="150" height="33" fill="#C1272D"/>`);

// Latvia
pushFlag('LV', 'Latvia', 'לטביה',
    `<rect width="150" height="100" fill="#9E3039"/><rect y="40" width="150" height="20" fill="#fff"/>`);

// Estonia
pushFlag('EE', 'Estonia', 'אסטוניה',
    `<rect width="150" height="33" fill="#0072CE"/><rect y="33" width="150" height="34" fill="#000"/><rect y="67" width="150" height="33" fill="#fff"/>`);

// Singapore
pushFlag('SG', 'Singapore', 'סינגפור',
    `<rect width="150" height="50" fill="#ED2939"/><rect y="50" width="150" height="50" fill="#fff"/>
     <circle cx="28" cy="25" r="12" fill="#fff"/><circle cx="32" cy="25" r="10" fill="#ED2939"/>
     <polygon points="${starPts(48, 16, 3)}" fill="#fff"/><polygon points="${starPts(55, 22, 3)}" fill="#fff"/>
     <polygon points="${starPts(55, 32, 3)}" fill="#fff"/><polygon points="${starPts(48, 38, 3)}" fill="#fff"/>
     <polygon points="${starPts(42, 28, 3)}" fill="#fff"/>`);

// Vietnam
pushFlag('VN', 'Vietnam', 'וייטנאם',
    `<rect width="150" height="100" fill="#DA251D"/>
     <polygon points="${starPts(75, 50, 18)}" fill="#FFFF00"/>`);

// Indonesia
pushFlag('ID', 'Indonesia', 'אינדונזיה',
    `<rect width="150" height="50" fill="#FF0000"/><rect y="50" width="150" height="50" fill="#fff"/>`);

// Pakistan
pushFlag('PK', 'Pakistan', 'פקיסטן',
    `<rect width="150" height="100" fill="#01411C"/><rect width="37" height="100" fill="#fff"/>
     <circle cx="90" cy="50" r="22" fill="#fff"/><circle cx="95" cy="50" r="18" fill="#01411C"/>
     <polygon points="${starPts(110, 38, 7)}" fill="#fff"/>`);

// Bangladesh
pushFlag('BD', 'Bangladesh', 'בנגלדש',
    `<rect width="150" height="100" fill="#006A4E"/>
     <circle cx="67" cy="50" r="22" fill="#F42A41"/>`);

// Philippines
pushFlag('PH', 'Philippines', 'הפיליפינים',
    `<rect width="150" height="50" fill="#0038A8"/><rect y="50" width="150" height="50" fill="#CE1126"/>
     <polygon points="0,0 60,50 0,100" fill="#FCD116"/>
     <polygon points="${starPts(4, 15, 4)}" fill="#FCD116"/>
     <polygon points="${starPts(4, 85, 4)}" fill="#FCD116"/>
     <polygon points="${starPts(45, 50, 4)}" fill="#FCD116"/>`);

// Malaysia
pushFlag('MY', 'Malaysia', 'מלזיה',
    `<rect width="150" height="100" fill="#CC0001"/>
     <rect y="7.14" width="150" height="7.14" fill="#fff"/><rect y="21.4" width="150" height="7.14" fill="#fff"/>
     <rect y="35.7" width="150" height="7.14" fill="#fff"/><rect y="50" width="150" height="7.14" fill="#fff"/>
     <rect y="64.3" width="150" height="7.14" fill="#fff"/><rect y="78.6" width="150" height="7.14" fill="#fff"/>
     <rect width="75" height="57" fill="#010066"/>
     <circle cx="30" cy="28" r="14" fill="#FC0"/><circle cx="34" cy="28" r="12" fill="#010066"/>
     <polygon points="${starPts(50, 28, 8)}" fill="#FC0"/>`);

// Chile
pushFlag('CL', 'Chile', 'צ׳ילה',
    `<rect width="150" height="50" fill="#fff"/><rect y="50" width="150" height="50" fill="#D52B1E"/>
     <rect width="50" height="50" fill="#0039A6"/>
     <polygon points="${starPts(25, 25, 10)}" fill="#fff"/>`);

// New Zealand
pushFlag('NZ', 'New Zealand', 'ניו זילנד',
    `<rect width="150" height="100" fill="#00247D"/>
     <rect width="60" height="50" fill="#00247D"/>
     <path d="M0,0 L60,50 M60,0 L0,50" stroke="#fff" stroke-width="6"/>
     <path d="M30,0 V50 M0,25 H60" stroke="#fff" stroke-width="10"/>
     <path d="M30,0 V50 M0,25 H60" stroke="#CF142B" stroke-width="5"/>
     <polygon points="${starPts(115, 25, 4)}" fill="#CC142B"/>
     <polygon points="${starPts(130, 45, 4)}" fill="#CC142B"/>
     <polygon points="${starPts(120, 70, 4)}" fill="#CC142B"/>
     <polygon points="${starPts(105, 55, 3)}" fill="#CC142B"/>`);

// South Africa
pushFlag('ZA', 'South Africa', 'דרום אפריקה',
    `<rect width="150" height="33" fill="#DE3831"/><rect y="67" width="150" height="33" fill="#002395"/>
     <rect y="38" width="150" height="24" fill="#fff"/><rect y="41" width="150" height="18" fill="#007A4D"/>
     <polygon points="0,0 50,50 0,100" fill="#007A4D"/><polygon points="0,5 45,50 0,95" fill="#FFB612"/><polygon points="0,10 40,50 0,90" fill="#000"/>`);

// Peru
pushFlag('PE', 'Peru', 'פרו',
    `<rect width="50" height="100" fill="#D91023"/><rect x="50" width="50" height="100" fill="#fff"/><rect x="100" width="50" height="100" fill="#D91023"/>`);

// Cuba
pushFlag('CU', 'Cuba', 'קובה',
    `<rect width="150" height="20" fill="#002A8F"/><rect y="20" width="150" height="20" fill="#fff"/>
     <rect y="40" width="150" height="20" fill="#002A8F"/><rect y="60" width="150" height="20" fill="#fff"/>
     <rect y="80" width="150" height="20" fill="#002A8F"/>
     <polygon points="0,0 65,50 0,100" fill="#CB1515"/>
     <polygon points="${starPts(22, 50, 8)}" fill="#fff"/>`);

// Ireland
pushFlag('IE', 'Ireland', 'אירלנד',
    `<rect width="50" height="100" fill="#169B62"/><rect x="50" width="50" height="100" fill="#fff"/><rect x="100" width="50" height="100" fill="#FF883E"/>`);

// Ukraine
pushFlag('UA', 'Ukraine', 'אוקראינה',
    `<rect width="150" height="50" fill="#005BBB"/><rect y="50" width="150" height="50" fill="#FFD500"/>`);
