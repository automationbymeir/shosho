/**
 * Background Texture Gallery
 * Curated high-quality generated assets for page backgrounds.
 */

const BACKGROUND_TEXTURES = [
    {
        id: 'vintage-paper',
        name: 'Vintage Paper',
        category: 'Texture',
        thumbnail: 'assets/backgrounds/vintage_paper_texture_1767369189703.png',
        url: 'assets/backgrounds/vintage_paper_texture_1767369189703.png',
        textColor: '#1a1a1a'
    },
    {
        id: 'botanical-pattern',
        name: 'Botanical',
        category: 'Pattern',
        thumbnail: 'assets/backgrounds/botanical_pattern_1767369204912.png',
        url: 'assets/backgrounds/botanical_pattern_1767369204912.png',
        textColor: '#1a2f1c'
    },
    {
        id: 'geometric-minimal',
        name: 'Geometric Limit',
        category: 'Modern',
        thumbnail: 'assets/backgrounds/geometric_minimal_1767369254374.png',
        url: 'assets/backgrounds/geometric_minimal_1767369254374.png',
        textColor: '#111'
    },
    {
        id: 'watercolor-mesh',
        name: 'Watercolor',
        category: 'Artistic',
        thumbnail: 'assets/backgrounds/watercolor_mesh_1767369224250.png',
        url: 'assets/backgrounds/watercolor_mesh_1767369224250.png',
        textColor: '#1e293b'
    }
];

// Export for app use
if (typeof window !== 'undefined') {
    window.BACKGROUND_TEXTURES = BACKGROUND_TEXTURES;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = BACKGROUND_TEXTURES;
}
