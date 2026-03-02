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
