import { store } from '../core/state.js';
import { persistenceService } from '../services/persistence-service.js';

export class ProjectManager {
    constructor(appInstance) {
        this.app = appInstance;
        this.modal = document.getElementById('projects-modal');
        this.btnOpen = document.getElementById('btn-my-projects'); // May not exist (removed from toolbar)
        this.btnManualSave = document.getElementById('btn-manual-save');
        this.listContainer = document.getElementById('projects-list-container');

        this.bindEvents();
    }

    bindEvents() {
        if (this.btnOpen) {
            this.btnOpen.addEventListener('click', () => this.openModal());
        }

        if (this.btnManualSave) {
            this.btnManualSave.addEventListener('click', async () => {
                await this.performManualSave();
            });
        }
    }

    async openModal() {
        this.modal.style.display = 'flex';
        await this.renderList();
    }

    async renderList() {
        this.listContainer.innerHTML = '<div style="text-align: center; color: #64748b; padding: 20px;"><i class="fa-solid fa-spinner fa-spin"></i> Loading...</div>';

        try {
            const projects = await persistenceService.listProjects();

            if (!projects || projects.length === 0) {
                this.listContainer.innerHTML = `
                    <div style="text-align: center; color: #64748b; padding: 40px 20px; background: rgba(255,255,255,0.02); border-radius: 8px;">
                        <i class="fa-solid fa-folder-open" style="font-size: 2rem; margin-bottom: 10px; opacity: 0.5;"></i>
                        <div>אין פרויקטים שמורים.</div>
                    </div>
                `;
                return;
            }

            this.listContainer.innerHTML = '';

            projects.forEach(project => {
                const isActive = persistenceService.currentProjectId === project.id;
                const d = new Date(project.lastModified);
                const title = project.title || 'Untitled Project';

                const el = document.createElement('div');
                el.style.cssText = `
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    background: ${isActive ? 'rgba(5b, 130, 246, 0.1)' : 'rgba(255,255,255,0.05)'};
                    border: 1px solid ${isActive ? '#3b82f6' : 'transparent'};
                    padding: 15px;
                    border-radius: 8px;
                    transition: background 0.2s;
                `;

                // Content left side
                const infoDiv = document.createElement('div');
                infoDiv.style.flex = "1";
                infoDiv.innerHTML = `
                    <div style="font-weight: 500; font-size: 1.1rem; color: #f8fafc; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                        ${title}
                        ${isActive ? '<span style="font-size: 0.7rem; background: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px;">פעיל כעת</span>' : ''}
                    </div>
                    <div style="font-size: 0.85rem; color: #94a3b8; display: flex; gap: 15px;">
                        <span><i class="fa-regular fa-clock"></i> ${d.toLocaleDateString('he-IL')} ${d.toLocaleTimeString('he-IL')}</span>
                        <span><i class="fa-solid fa-database"></i> ${project.source === 'local' ? 'מקומי' : 'ענן'}</span>
                    </div>
                `;

                // Actions right side
                const actionsDiv = document.createElement('div');
                actionsDiv.style.display = "flex";
                actionsDiv.style.gap = "8px";

                if (!isActive) {
                    const btnLoad = document.createElement('button');
                    btnLoad.className = 'btn-primary';
                    btnLoad.innerHTML = '<i class="fa-solid fa-folder-open"></i> טען';
                    btnLoad.style.background = '#3b82f6';
                    btnLoad.style.borderColor = '#3b82f6';
                    btnLoad.style.padding = '8px 12px';
                    btnLoad.onclick = () => this.loadProject(project.id);
                    actionsDiv.appendChild(btnLoad);
                }

                // Delete Button
                const btnDelete = document.createElement('button');
                btnDelete.innerHTML = '<i class="fa-solid fa-trash"></i>';
                btnDelete.style.cssText = `
                    background: transparent;
                    color: #ef4444;
                    border: 1px solid rgba(239, 68, 68, 0.3);
                    border-radius: 6px;
                    padding: 8px 12px;
                    cursor: pointer;
                    transition: all 0.2s;
                `;
                btnDelete.onmouseover = () => btnDelete.style.background = 'rgba(239, 68, 68, 0.1)';
                btnDelete.onmouseout = () => btnDelete.style.background = 'transparent';
                btnDelete.onclick = () => this.deleteProject(project.id);

                actionsDiv.appendChild(btnDelete);

                el.appendChild(infoDiv);
                el.appendChild(actionsDiv);

                this.listContainer.appendChild(el);
            });

        } catch (e) {
            console.error("Failed to list projects", e);
            this.listContainer.innerHTML = '<div style="color: #ef4444; padding: 20px;">שגיאה בטעינת פרויקטים. נסה שוב מאוחר יותר.</div>';
        }
    }

    async performManualSave() {
        const originalText = this.btnManualSave.innerHTML;
        this.btnManualSave.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> שומר...';
        this.btnManualSave.disabled = true;

        try {
            await persistenceService.saveProject(store.state.user?.uid || null, store.state);
            this.btnManualSave.innerHTML = '<i class="fa-solid fa-check"></i> נשמר!';
            this.btnManualSave.style.background = '#10b981';

            // Refresh list to show exact timestamp
            await this.renderList();
        } catch (e) {
            this.btnManualSave.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> שגיאה';
            this.btnManualSave.style.background = '#ef4444';
        }

        setTimeout(() => {
            if (this.btnManualSave) {
                this.btnManualSave.innerHTML = originalText;
                this.btnManualSave.disabled = false;
                this.btnManualSave.style.background = '#27ae60';
            }
        }, 2500);
    }

    async loadProject(id) {
        if (!confirm("טעינת פרויקט זה תחליף את העבודה הנוכחית שלך. האם להמשיך?")) return;

        this.modal.style.display = 'none';

        // Indicate loading on the main UI
        const btnProj = document.getElementById('btn-my-projects') || document.getElementById('btn-new-project');
        const oldProjText = btnProj ? btnProj.innerHTML : '';
        if (btnProj) btnProj.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

        try {
            const loadedData = await persistenceService.loadProject(store.state.user?.uid || null, id);

            if (loadedData) {
                // Ensure active page is valid
                if (loadedData.pages && loadedData.pages.length > 0) {
                    if (!loadedData.pages.find(p => p.id === loadedData.activePageId)) {
                        loadedData.activePageId = loadedData.pages[0].id;
                    }
                }

                // Batch assign state
                store._isBatchUpdating = true;
                Object.assign(store.state, {
                    ...loadedData,
                    user: store.state.user, // Keep current user
                    assets: loadedData.assets || { photos: [] }
                });
                store._isBatchUpdating = false;

                // Notify UI components
                store.notify('pages', store.state.pages);
                store.notify('cover', store.state.cover);
                store.notify('assets', store.state.assets);

                // Refresh main app elements
                if (this.app.renderAssetSidebar) this.app.renderAssetSidebar();

                // Re-hydrate PDF engine if needed
                const activeTemplateId = (store.state.pages && store.state.pages[0] ? store.state.pages[0].templateId : null) ||
                    (store.state.cover ? store.state.cover.templateId : null);
                if (activeTemplateId && this.app.templateSidebar && this.app.templateSidebar.manager) {
                    this.app.templateSidebar.manager.loadTemplate(activeTemplateId).then(() => {
                        if (window.pdfExport) window.pdfExport.setTemplateConfig(this.app.templateSidebar.manager.config);
                    }).catch(e => console.error("Template load err", e));
                }

                if (store.state.viewMode === 'cover') {
                    this.app.renderCoverWithTemplate();
                } else {
                    this.app.renderActivePage();
                }

                console.log(`[ProjectManager] Successfully loaded project ${id}`);
                persistenceService.updateSaveUI("נטען בהצלחה");
            } else {
                alert("שגיאה! הנתונים לא נמצאו או פגומים.");
            }
        } catch (e) {
            console.error("Failed to load project from UI", e);
            alert("שגיאה בטעינת הפרויקט.");
        } finally {
            if (btnProj) btnProj.innerHTML = oldProjText;
        }
    }

    async deleteProject(id) {
        if (!confirm("האם אתה בטוח שברצונך למחוק פרויקט זה לצמיתות? פעולה זו אינה ניתנת לביטול.")) return;

        try {
            await persistenceService.deleteProject(id);
            // Refresh the view
            await this.renderList();
        } catch (e) {
            console.error("Failed to delete project", e);
            alert("שגיאה במחיקת הפרויקט.");
        }
    }
}
