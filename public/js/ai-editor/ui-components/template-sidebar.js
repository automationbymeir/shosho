/**
 * TemplateSidebar
 * Manages the Designs tab sidebar to show available templates
 */
import { TemplateManager } from '../templates/template-manager.js';

export class TemplateSidebar {
    constructor(containerId, appInstance) {
        this.container = document.getElementById(containerId);
        this.app = appInstance; // Reference to main app to trigger album creation
        this.manager = new TemplateManager();
    }

    init() {
        if (!this.container) return;
        this.render();
    }

    render() {
        this.container.innerHTML = '';
        const templates = window.ALBUM_TEMPLATES || {};

        if (Object.keys(templates).length === 0) {
            this.container.innerHTML = '<div style="padding:20px; color:#ccc;">No templates found</div>';
            return;
        }

        Object.values(templates).forEach(template => {
            const card = this.createTemplateCard(template);
            this.container.appendChild(card);
        });
    }

    createTemplateCard(template) {
        const card = document.createElement('div');
        card.className = 'template-card';
        card.style.cursor = 'pointer';
        card.onclick = () => this.handleTemplateSelect(template.id);

        card.innerHTML = `
            <div class="template-preview" style="background-color: #f0f0f0; height: 120px; display: flex; align-items: center; justify-content: center; overflow: hidden;">
                ${template.thumbnail ? `<img src="${template.thumbnail}" style="width:100%; height:100%; object-fit:cover;">` : '<span style="font-size: 2rem;">✨</span>'}
            </div>
            <div class="template-info" style="padding: 10px;">
                <h4 style="margin: 0 0 5px 0;">${template.name}</h4>
                <p style="margin: 0; font-size: 0.8rem; color: #666;">${template.description}</p>
                <div style="margin-top: 5px; font-size: 0.75rem; color: #888;">${template.minPhotos}+ photos</div>
            </div>
        `;

        return card;
    }

    async handleTemplateSelect(templateId) {
        console.log(`Selected template: ${templateId}`);

        // 1. Get Photos from App State
        // Access via the app instance passed in constructor
        const photos = this.app.state?.assets?.photos || [];

        if (photos.length === 0) {
            alert("Please add photos to the 'Photos' tab first!");
            return;
        }

        // 2. Load & Generate
        try {
            // Show loading indicator?
            await this.manager.loadTemplate(templateId);

            // 3. Generate Content and Cover
            const pages = this.manager.generateAlbum(photos);

            // For cover, we need to decide which photos to us.
            // Simple logic: Use first photo for front, second for back? 
            // Or let user drag? For now, pick random or first available.
            const coverPhotos = {
                front: photos[0],
                back: photos[1] || photos[0]
            };
            const cover = this.manager.generateCover(coverPhotos);

            // 4. Render to Canvas
            // Pass as object to new signature
            this.app.renderAlbumPages({ pages, cover });

            console.log(`[TemplateSidebar] Applied template ${templateId}`);
        } catch (e) {
            console.error("Failed to apply template", e);
            alert("Error loading template: " + e.message);
        }
    }
}
