/**
 * Template Gallery - Papier-Style Template Selection
 */

// Initialize template gallery
function initTemplateGallery() {
    const galleryGrid = document.getElementById('templateGalleryGrid');
    if (!galleryGrid) {
        console.log('Template gallery grid not found');
        return;
    }

    galleryGrid.innerHTML = '';

    // Get all templates - check both window and global scope
    const templatesObj = window.PHOTO_BOOK_TEMPLATES || PHOTO_BOOK_TEMPLATES || {};
    const templates = Object.values(templatesObj);
    
    console.log(`Found ${templates.length} templates to render`);
    
    if (templates.length === 0) {
        console.error('No templates found! Check if templates.js is loaded.');
        galleryGrid.innerHTML = '<p style="text-align: center; color: var(--color-text-light); padding: 2rem;">No templates available. Please refresh the page.</p>';
        return;
    }

    templates.forEach(template => {
        const templateCard = createTemplateCard(template);
        galleryGrid.appendChild(templateCard);
    });
}

function createTemplateCard(template) {
    const card = document.createElement('div');
    card.className = 'template-card';
    card.style.position = 'relative';
    
    // Highlight if this is the selected template
    if (typeof state !== 'undefined' && state.selectedTemplate && 
        state.selectedTemplate.id === template.id) {
        card.classList.add('template-selected');
    }
    
    card.onclick = () => selectTemplate(template.id);

    // Create preview
    const preview = document.createElement('div');
    preview.className = 'template-preview';
    const coverColor = template.preview?.coverColor || template.colors?.pageBackground || '#FFFFFF';
    const accentColor = template.preview?.accentColor || template.colors?.accentColor || '#2C3E50';
    preview.style.background = coverColor;
    preview.style.borderColor = accentColor;

    // Create 3D book effect
    const bookCover = document.createElement('div');
    bookCover.className = 'template-book-cover';
    bookCover.style.background = coverColor;
    bookCover.style.borderColor = accentColor;

    const bookSpine = document.createElement('div');
    bookSpine.className = 'template-book-spine';
    bookSpine.style.background = accentColor;

    const bookPages = document.createElement('div');
    bookPages.className = 'template-book-pages';
    bookPages.style.background = coverColor;

    // Add pattern/decorations
    if (template.decorations && template.decorations.enabled && template.decorations.elements && template.decorations.elements.length > 0) {
        const decoration = document.createElement('div');
        decoration.className = 'template-decoration';
        decoration.textContent = template.decorations.elements[0] || '';
        const accentColor = template.colors?.accentColor || accentColor;
        decoration.style.color = accentColor;
        bookCover.appendChild(decoration);
    }

    bookCover.appendChild(bookSpine);
    bookCover.appendChild(bookPages);
    preview.appendChild(bookCover);

    // Create info section
    const info = document.createElement('div');
    info.className = 'template-info';

    const name = document.createElement('h3');
    name.className = 'template-name';
    name.textContent = template.name;

    const category = document.createElement('span');
    category.className = 'template-category';
    category.textContent = template.category;

    const description = document.createElement('p');
    description.className = 'template-description';
    description.textContent = template.description;

    info.appendChild(name);
    info.appendChild(category);
    info.appendChild(description);

    card.appendChild(preview);
    card.appendChild(info);

    return card;
}

function selectTemplate(templateId) {
    const templatesObj = window.PHOTO_BOOK_TEMPLATES || PHOTO_BOOK_TEMPLATES || {};
    const template = templatesObj[templateId];
    if (!template) {
        console.error(`Template ${templateId} not found`);
        return;
    }

    // Store selected template
    if (typeof state !== 'undefined') {
        state.selectedTemplate = template;
        state.currentTheme = templateId;
    } else {
        window.selectedTemplate = template;
    }

    // Show editor view first
    showEditorView();
    
    // Apply template to app after a brief delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof applyTemplate !== 'undefined') {
            applyTemplate(template);
        }
    }, 100);
}

function showTemplateGallery() {
    const galleryView = document.getElementById('templateGalleryView');
    const editorView = document.getElementById('editorView');

    if (galleryView) galleryView.style.display = 'block';
    if (editorView) editorView.style.display = 'none';
    
    // Re-initialize gallery to show current selection
    if (typeof initTemplateGallery !== 'undefined') {
        initTemplateGallery();
    }
}

function showEditorView() {
    const galleryView = document.getElementById('templateGalleryView');
    const editorView = document.getElementById('editorView');

    if (galleryView) galleryView.style.display = 'none';
    if (editorView) editorView.style.display = 'block';

    // Initialize editor if needed
    if (typeof initializeEditor !== 'undefined') {
        initializeEditor();
    }
}

// Initialize on load - wait for templates to be available
function initializeGalleryWhenReady() {
    // Check if templates are loaded
    if (typeof window.PHOTO_BOOK_TEMPLATES !== 'undefined' || typeof PHOTO_BOOK_TEMPLATES !== 'undefined') {
        initTemplateGallery();
    } else {
        // Wait a bit and try again
        setTimeout(initializeGalleryWhenReady, 100);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGalleryWhenReady);
} else {
    initializeGalleryWhenReady();
}
