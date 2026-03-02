// template-registry.js

const ALBUM_TEMPLATES = {
    'romantic-journey-v1': {
        id: 'romantic-journey-v1',
        name: 'Romantic Journey',
        description: 'Elegant couple & wedding album',
        thumbnail: '/assets/templates/romantic-journey-3d.png',
        category: 'wedding',
        minPhotos: 20,
        configPath: '/templates/romantic-journey-template.json'
    },
    'photography-portfolio-v1': {
        id: 'photography-portfolio-v1',
        name: 'Photography Portfolio',
        description: 'Professional studio & portfolio showcase',
        thumbnail: '/assets/templates/photography-portfolio-3d.png',
        category: 'portfolio',
        minPhotos: 15,
        configPath: '/templates/photography-portfolio-template.json'
    },
    'travel-journey-v1': {
        id: 'travel-journey-v1',
        name: 'Travel Journey',
        description: 'Clean, elegant travel photo album',
        thumbnail: '/assets/templates/travel-journey-3d.png',
        category: 'travel',
        minPhotos: 15,
        configPath: '/templates/travel-journey-template.json'
    },
    'family-roots-v1': {
        id: 'family-roots-v1',
        name: 'Family Roots',
        description: 'A timeless album for family memories',
        thumbnail: '/assets/templates/family-roots-3d.png',
        category: 'family',
        minPhotos: 10,
        configPath: '/templates/family-roots-template.json'
    },
    'bar-mitzvah-v1': {
        id: 'bar-mitzvah-v1',
        name: 'Bar Mitzvah (בר מצווה)',
        description: 'Elegant Hebrew design with RTL support',
        thumbnail: 'assets/templates/bar-mitzvah-3d.png',
        category: 'celebration',
        minPhotos: 20,
        configPath: '/templates/bar-mitzvah-template.json'
    },
    'wedding-prestige-hebrew-v1': {
        id: 'wedding-prestige-hebrew-v1',
        name: 'Nitzach - Eternity (Wedding)',
        description: 'Prestige editorial wedding album in Hebrew',
        thumbnail: 'assets/templates/wedding-prestige-3d.png',
        category: 'wedding',
        minPhotos: 50,
        configPath: '/templates/wedding-prestige-template.json'
    },
    'baby-first-year-hebrew-v1': {
        id: 'baby-first-year-hebrew-v1',
        name: "השנה הראשונה - Baby's First Year",
        description: 'Sweet and emotional template for baby\'s first year in Hebrew',
        thumbnail: 'assets/templates/baby-first-year-3d.png',
        category: 'baby',
        minPhotos: 30,
        configPath: '/templates/baby-first-year-template.json'
    },
    'adventure-journal-v1': {
        id: 'adventure-journal-v1',
        name: 'יומן הרפתקאות - Adventure Journal',
        description: 'תבנית נועזת וצבעונית לטיולים ומסעות.',
        thumbnail: 'assets/templates/adventure-journal-3d.png',
        category: 'travel',
        minPhotos: 30,
        configPath: '/templates/adventure-journal-template.json'
    }
};

window.ALBUM_TEMPLATES = ALBUM_TEMPLATES;
