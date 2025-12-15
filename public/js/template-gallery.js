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

    // Add Memory Director card first
    try {
        const mdCard = createMemoryDirectorCard();
        if (mdCard) galleryGrid.appendChild(mdCard);
    } catch (e) {
        console.warn('Failed to render Memory Director card:', e);
    }

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

function createMemoryDirectorCard() {
    const card = document.createElement('div');
    card.className = 'template-card memory-director-card';
    card.style.position = 'relative';

    card.onclick = () => {
        if (typeof initMemoryDirector !== 'undefined') {
            initMemoryDirector();
        } else {
            alert('Memory Director is not available (initMemoryDirector missing).');
        }
    };

    const preview = document.createElement('div');
    preview.className = 'template-preview md-preview';
    preview.innerHTML = `
        <div class="md-preview-icon">${typeof getIcon !== 'undefined' ? getIcon('film', 48) : ''}</div>
        <div class="md-preview-sparkle">${typeof getIcon !== 'undefined' ? getIcon('sparkles', 20) : ''}</div>
    `;

    const info = document.createElement('div');
    info.className = 'template-info';
    info.innerHTML = `
        <h3 class="template-name">Memory Director</h3>
        <span class="template-category">AI Story</span>
        <p class="template-description">AI-powered story detection</p>
        <span class="template-badge new">New</span>
    `;

    card.appendChild(preview);
    card.appendChild(info);
    return card;
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

    // Create preview container
    const preview = document.createElement('div');
    preview.className = 'template-preview';
    const coverColor = template.preview?.coverColor || template.colors?.pageBackground || '#FFFFFF';
    const accentColor = template.preview?.accentColor || template.colors?.accentColor || '#2C3E50';
    preview.style.background = `linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)`;

    // NEW: Enhanced 3D book structure
    const bookDemo = document.createElement('div');
    bookDemo.className = 'template-book-demo';
    bookDemo.style.setProperty('--cover-color', accentColor);

    const bookStage = document.createElement('div');
    bookStage.className = 'template-stage';

    // Spine
    const spine = document.createElement('div');
    spine.className = 'template-spine';

    // Main cover face
    const cover = document.createElement('div');
    cover.className = 'template-cover';

    // Decoration (emoji/icon)
    if (template.decorations?.enabled && template.decorations?.elements?.length > 0) {
        const decoration = document.createElement('span');
        decoration.className = 'template-decoration';
        decoration.textContent = template.decorations.elements[0] || '';
        cover.appendChild(decoration);
    }

    // Page edges
    const pages = document.createElement('div');
    pages.className = 'template-pages';

    // Assemble
    bookStage.appendChild(spine);
    bookStage.appendChild(cover);
    bookStage.appendChild(pages);
    bookDemo.appendChild(bookStage);
    preview.appendChild(bookDemo);

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

    // Show animated popup for Google Photos selection
    showPhotoSelectionPopup();
}

function showTemplateGallery() {
    const galleryView = document.getElementById('templateGalleryView');
    const editorView = document.getElementById('editorView');
    const mdView = document.getElementById('memoryDirectorView');

    if (galleryView) galleryView.style.display = 'block';
    if (editorView) editorView.style.display = 'none';
    if (mdView) mdView.style.display = 'none';
    
    // Re-initialize gallery to show current selection
    if (typeof initTemplateGallery !== 'undefined') {
        initTemplateGallery();
    }
}

function showEditorView() {
    const galleryView = document.getElementById('templateGalleryView');
    const editorView = document.getElementById('editorView');
    const mdView = document.getElementById('memoryDirectorView');

    if (galleryView) galleryView.style.display = 'none';
    if (editorView) editorView.style.display = 'block';
    if (mdView) mdView.style.display = 'none';

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

function showPhotoSelectionPopup() {
    // Create animated popup modal
    const popup = document.createElement('div');
    popup.id = 'photoSelectionPopup';
    popup.className = 'photo-selection-popup';
    popup.innerHTML = `
        <div class="photo-selection-popup-content">
            <div class="photo-selection-popup-icon">📸</div>
            <h2>Select Photos from Google Photos</h2>
            <p>Choose photos from your Google Photos library to create your photo book</p>
            <div class="photo-selection-popup-actions">
                <button class="btn btn-primary" onclick="openPhotoSelectionAndEditor()">Open Google Photos</button>
                <button class="btn btn-secondary" onclick="skipPhotoSelection()">Skip for Now</button>
            </div>
        </div>
    `;
    document.body.appendChild(popup);
    
    // Animate in
    requestAnimationFrame(() => {
        popup.classList.add('active');
    });
}

function openPhotoSelectionAndEditor() {
    const popup = document.getElementById('photoSelectionPopup');
    if (popup) {
        popup.classList.remove('active');
        setTimeout(() => popup.remove(), 300);
    }
    
    // Show editor view
    showEditorView();
    
    // Apply template after a brief delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof applyTemplate !== 'undefined' && typeof state !== 'undefined' && state.selectedTemplate) {
            applyTemplate(state.selectedTemplate);
        }
        
        // Open photo picker
        if (typeof loadPicker !== 'undefined') {
            loadPicker();
        }
    }, 100);
}

function skipPhotoSelection() {
    const popup = document.getElementById('photoSelectionPopup');
    if (popup) {
        popup.classList.remove('active');
        setTimeout(() => popup.remove(), 300);
    }
    
    // Show editor view
    showEditorView();
    
    // Apply template after a brief delay to ensure DOM is ready
    setTimeout(() => {
        if (typeof applyTemplate !== 'undefined' && typeof state !== 'undefined' && state.selectedTemplate) {
            applyTemplate(state.selectedTemplate);
        }
    }, 100);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeGalleryWhenReady);
} else {
    initializeGalleryWhenReady();
}
