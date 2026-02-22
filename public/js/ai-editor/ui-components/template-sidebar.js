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

        const photos = this.app.state?.assets?.photos || [];

        if (photos.length === 0) {
            alert("אנא הוסף קודם תמונות ללשונית ה'תמונות'!");
            return;
        }

        // Show generic progress overlay
        let progress = document.querySelector('.mc4-progress');
        if (!progress) {
            progress = document.createElement('div');
            progress.className = 'mc4-progress';
            document.body.appendChild(progress);
        }

        progress.innerHTML = `
            <div class="mc4-magic-scene">
                <div class="mc4-book">
                    <div class="mc4-page mc4-page-1"></div><div class="mc4-page mc4-page-2"></div><div class="mc4-page mc4-page-3"></div>
                </div>
                <div class="mc4-wand"><i class="fa-solid fa-wand-magic-sparkles"></i></div>
                <div class="mc4-sparkles"><span>✨</span><span>✨</span><span>✨</span></div>
            </div>
            <div class="mc4-status">
                <h3>Applying Template</h3>
                <p id="mc4-dynamic-msg">🔍 Scanning with Google Vision API...</p>
            </div>
        `;
        progress.style.display = 'flex';

        try {
            await this.manager.loadTemplate(templateId);

            const coverPhotos = {
                front: photos[0],
                back: photos[1] || photos[0]
            };
            const cover = this.manager.generateCover(coverPhotos);

            const contentPhotos = photos.slice(1);
            const pages = this.manager.generateAlbum(contentPhotos);

            // Execute rendering
            this.app.renderAlbumPages({ pages, cover });
            console.log(`[TemplateSidebar] Applied template ${templateId}`);

            // Fake processing time to cover async Vision API crop rendering
            setTimeout(() => {
                const el = document.getElementById('mc4-dynamic-msg');
                if (el) el.innerText = '⚖️ Optimizing crops & focal points...';
            }, 1000);

            setTimeout(() => {
                const el = document.getElementById('mc4-dynamic-msg');
                if (el) el.innerText = '📚 Assembling book...';
            }, 2000);

            setTimeout(() => {
                if (progress) {
                    progress.classList.add('mc4-fade-out');
                    setTimeout(() => progress.remove(), 500);
                }
            }, 3000);

        } catch (e) {
            console.error("Failed to apply template", e);
            if (progress) progress.remove();
            alert("שגיאה בטעינת התבנית: " + e.message);
        }
    }
}
