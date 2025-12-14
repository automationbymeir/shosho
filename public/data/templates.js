/**
 * Photo Book Templates - Archival Vintage Designs
 * Each template defines exact styling for generated books
 * Visual Identity: "Archival Vintage" - Old library, letterpress, textured paper
 */

const PHOTO_BOOK_TEMPLATES = {
  'classic': {
    id: 'classic',
    name: 'Classic Minimal',
    description: 'Timeless elegance with ample whitespace',
    category: 'Minimalist',
    preview: {
      coverColor: '#FFFFFF',
      accentColor: '#1E3932',
      pattern: 'minimal'
    },
    colors: {
      pageBackground: '#FFFFFF',
      textColor: '#1A1A1A',
      accentColor: '#2C3E50',
      borderColor: '#000000'
    },
    fonts: {
      title: 'Playfair Display',
      body: 'Lato'
    },
    typography: {
      headingFont: "'Playfair Display', serif",
      bodyFont: "'Lato', sans-serif",
      headingSize: 32,
      bodySize: 14,
      captionSize: 12
    },
    layout: {
      pageMargin: 60,
      photoSpacing: 20,
      borderStyle: 'minimal',
      showPageNumbers: true,
      pageNumberStyle: 'elegant',
      layout: 'classic-grid'
    },
    decorations: {
      enabled: false,
      style: null,
      elements: []
    },
    cover: {
      backgroundColor: '#FFFFFF',
      titleColor: '#1A1A1A',
      titleFont: "'Playfair Display', serif",
      titleSize: 48,
      subtitleColor: '#666666',
      borderStyle: 'thin',
      borderColor: '#000000'
    }
  },
  'botanical': {
    id: 'botanical',
    name: 'Vintage Botanical',
    description: 'Inspired by 19th-century flora illustrations',
    category: 'Nature',
    preview: {
      coverColor: '#F3F4F0',
      accentColor: '#2C5F2D',
      pattern: 'botanical'
    },
    colors: {
      pageBackground: '#F3F4F0',
      textColor: '#2C5F2D',
      accentColor: '#97BC62',
      borderColor: '#2C5F2D'
    },
    fonts: {
      title: 'Cinzel',
      body: 'Montserrat'
    },
    typography: {
      headingFont: "'Cinzel', serif",
      bodyFont: "'Montserrat', sans-serif",
      headingSize: 34,
      bodySize: 15,
      captionSize: 13
    },
    layout: {
      pageMargin: 50,
      photoSpacing: 25,
      borderStyle: 'organic',
      showPageNumbers: true,
      pageNumberStyle: 'natural'
    },
    decorations: {
      enabled: true,
      style: 'botanical',
      elements: ['🌿', '🍃']
    },
    cover: {
      backgroundColor: '#F3F4F0',
      titleColor: '#2C5F2D',
      titleFont: "'Cinzel', serif",
      titleSize: 44,
      subtitleColor: '#1A2F1C',
      borderStyle: 'organic',
      borderColor: '#97BC62'
    }
  },
  'archive': {
    id: 'archive',
    name: 'The Archive',
    description: 'Sepia tones and typewriter aesthetics',
    category: 'Vintage',
    preview: {
      coverColor: '#F0E6D2',
      accentColor: '#8B4513',
      pattern: 'archive'
    },
    colors: {
      pageBackground: '#F0E6D2',
      textColor: '#4A3B32',
      accentColor: '#8B4513',
      borderColor: '#4A3B32'
    },
    fonts: {
      title: 'Courier Prime',
      body: 'Courier Prime'
    },
    typography: {
      headingFont: "'Courier Prime', monospace",
      bodyFont: "'Courier Prime', monospace",
      headingSize: 38,
      bodySize: 15,
      captionSize: 13
    },
    layout: {
      pageMargin: 45,
      photoSpacing: 20,
      borderStyle: 'typewriter',
      showPageNumbers: true,
      pageNumberStyle: 'archive'
    },
    decorations: {
      enabled: false,
      style: null,
      elements: []
    },
    cover: {
      backgroundColor: '#F0E6D2',
      titleColor: '#4A3B32',
      titleFont: "'Courier Prime', monospace",
      titleSize: 42,
      subtitleColor: '#8B4513',
      borderStyle: 'typewriter',
      borderColor: '#4A3B32'
    }
  }
};

// Export for use in app
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PHOTO_BOOK_TEMPLATES;
}

// Make available globally for browser
if (typeof window !== 'undefined') {
  window.PHOTO_BOOK_TEMPLATES = PHOTO_BOOK_TEMPLATES;
}
