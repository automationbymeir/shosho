import { persistenceService } from '../services/persistence-service.js';
import { authService } from '../services/firebase-auth-service.js';

export class ProfileModal {
    constructor(app) {
        this.app = app;
        this.isOpen = false;
        this.init();
    }

    init() {
        this.createModal();
        this.bindEvents();
    }

    createModal() {
        if (document.getElementById('profile-modal')) return;

        const modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'profile-modal';
        modal.style.display = 'none';

        modal.innerHTML = `
            <div class="profile-content">
                <button class="profile-close-btn">&times;</button>
                <div class="profile-header">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <h2 style="margin:0;">הפרופיל שלי</h2>
                        <button id="btn-modal-logout" class="btn-sm btn-danger">התנתק</button>
                    </div>
                    <div class="profile-tabs">
                        <button class="tab-btn active" data-tab="projects">הפרויקטים שלי</button>
                        <button class="tab-btn" data-tab="billing">חיובים וחשבוניות</button>
                    </div>
                </div>
                
                <div class="tab-content active" id="tab-projects" dir="rtl">
                    <div class="projects-list-container">
                        <div class="loading-spinner">טוען פרויקטים...</div>
                        <ul class="projects-list"></ul>
                    </div>
                </div>

                <div class="tab-content" id="tab-billing" dir="rtl">
                   <div class="billing-list-container">
                        <div class="loading-spinner">טוען רכישות...</div>
                        <ul class="billing-list"></ul>
                    </div>
                </div>
            </div>
            <style>
                .profile-modal {
                    position: fixed; top: 0; left: 0; width: 100%; height: 100%;
                    background: rgba(0,0,0,0.8); z-index: 10000;
                    display: flex; align-items: center; justify-content: center;
                    backdrop-filter: blur(5px); font-family: 'Rubik', sans-serif;
                }
                .profile-content {
                    background: #1e1e2e; color: #fff; width: 800px; height: 600px;
                    border-radius: 12px; display: flex; flex-direction: column;
                    box-shadow: 0 10px 40px rgba(0,0,0,0.5); position: relative;
                }
                .profile-close-btn {
                    position: absolute; top: 15px; right: 20px; font-size: 24px;
                    background: none; border: none; color: #aaa; cursor: pointer;
                }
                .profile-header {
                    padding: 20px 30px; border-bottom: 1px solid #333;
                }
                .profile-tabs { display: flex; gap: 20px; margin-top: 20px; }
                .tab-btn {
                    background: none; border: none; color: #aaa; font-size: 16px; 
                    padding-bottom: 8px; cursor: pointer; border-bottom: 2px solid transparent;
                }
                .tab-btn.active { color: #fff; border-color: #a855f7; }
                .tab-content { padding: 30px; flex: 1; overflow-y: auto; display: none; }
                .tab-content.active { display: block; }
                
                .projects-list, .billing-list { list-style: none; padding: 0; margin: 0; }
                .project-item, .billing-item {
                    display: flex; justify-content: space-between; align-items: center;
                    padding: 15px; border-bottom: 1px solid #333; transition: background 0.2s;
                }
                .project-item:hover { background: rgba(255,255,255,0.05); }
                .project-info h4 { margin: 0 0 5px 0; color: #fff; }
                .project-info p { margin: 0; font-size: 12px; color: #888; }
                .project-actions { display: flex; gap: 10px; }
                .btn-sm {
                    padding: 6px 12px; border-radius: 4px; border: 1px solid #444;
                    background: #333; color: #fff; cursor: pointer; font-size: 12px;
                }
                .btn-sm:hover { background: #444; }
                .btn-primary { background: #a855f7; border-color: #a855f7; }
                .btn-primary:hover { background: #9333ea; }
                .btn-danger { color: #ff6b6b; border-color: #552222; background: #2a1111; }
                .btn-danger:hover { background: #401111; }

                .project-current-badge {
                    background: #22c55e; color: #000; padding: 2px 6px; 
                    border-radius: 4px; font-size: 10px; font-weight: bold; margin-left: 8px;
                }
                .billing-status {
                     padding: 4px 8px; border-radius: 4px; font-size: 11px; text-transform: uppercase;
                }
                .status-COMPLETED { background: rgba(34, 197, 94, 0.2); color: #4ade80; }
                .status-PENDING { background: rgba(234, 179, 8, 0.2); color: #facc15; }
            </style>
        `;
        document.body.appendChild(modal);

        // Bind Closer
        modal.querySelector('.profile-close-btn').addEventListener('click', () => this.close());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) this.close();
        });

        // Bind Logout
        const logoutBtn = modal.querySelector('#btn-modal-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                if (confirm("להתנתק?")) {
                    await authService.signOut();
                    this.close();
                }
            });
        }

        // Tabs
        const tabs = modal.querySelectorAll('.tab-btn');
        tabs.forEach(btn => {
            btn.addEventListener('click', () => {
                tabs.forEach(t => t.classList.remove('active'));
                modal.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

                btn.classList.add('active');
                modal.getElementById(`tab-${btn.dataset.tab}`).classList.add('active');

                if (btn.dataset.tab === 'projects') this.loadProjects();
                if (btn.dataset.tab === 'billing') this.loadBilling();
            });
        });
    }

    bindEvents() {
        // App-level trigger
        window.addEventListener('open-profile', () => this.open());
    }

    open() {
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.loadProjects(); // Default tab
        }
    }

    close() {
        const modal = document.getElementById('profile-modal');
        if (modal) modal.style.display = 'none';
    }

    async loadProjects() {
        const listEl = document.querySelector('.projects-list');
        const spinner = document.querySelector('#tab-projects .loading-spinner');
        if (!listEl) return;

        listEl.innerHTML = '';
        spinner.style.display = 'block';

        try {
            const projects = await persistenceService.listProjects();
            spinner.style.display = 'none';

            if (projects.length === 0) {
                listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#666">אין פרויקטים שמורים עדיין.</div>';
                return;
            }

            const currentId = persistenceService.currentProjectId;

            projects.forEach(p => {
                const li = document.createElement('li');
                li.className = 'project-item';

                const isCurrent = currentId === p.id;
                const badge = isCurrent ? '<span class="project-current-badge">פעיל</span>' : '';
                const date = new Date(p.lastModified).toLocaleDateString() + ' ' + new Date(p.lastModified).toLocaleTimeString();

                li.innerHTML = `
                    <div class="project-info">
                        <h4>${p.name || 'פרויקט ללא שם'} ${badge}</h4>
                        <p>שונה לאחרונה: ${date}</p>
                    </div>
                    <div class="project-actions">
                        <button class="btn-sm btn-rename" data-id="${p.id}" data-name="${p.name}">שינוי שם</button>
                        ${!isCurrent ? `<button class="btn-sm btn-primary btn-load" data-id="${p.id}">טען</button>` : ''}
                        <button class="btn-sm btn-danger btn-delete" data-id="${p.id}">מחק</button>
                    </div>
                `;

                // Bind Actions
                li.querySelector('.btn-rename').addEventListener('click', () => this.handleRename(p));
                if (!isCurrent) {
                    li.querySelector('.btn-load').addEventListener('click', () => this.handleLoad(p.id));
                }
                li.querySelector('.btn-delete').addEventListener('click', () => this.handleDelete(p.id));

                listEl.appendChild(li);
            });

        } catch (e) {
            console.error(e);
            spinner.style.display = 'none';
            listEl.innerHTML = '<div class="error">Failed to load projects.</div>';
        }
    }

    async handleRename(project) {
        const newName = prompt("הזן שם חדש:", project.name);
        if (newName && newName.trim() !== "" && newName !== project.name) {
            try {
                await persistenceService.renameProject(project.id, newName);
                this.loadProjects(); // Refresh list
                // If current, update window title?
            } catch (e) {
                alert("שינוי שם נכשל: " + e.message);
            }
        }
    }

    async handleLoad(id) {
        if (confirm("לטעון את הפרויקט הזה? כל שינוי שלא נשמר יאבד.")) {
            try {
                const data = await persistenceService.loadProject(authService.getCurrentUser().uid, id);
                if (data) {
                    this.app.renderAlbumPages(data); // Assuming app has this method
                    this.close();
                }
            } catch (e) {
                alert("טעינה נכשלה: " + e.message);
            }
        }
    }

    async handleDelete(id) {
        if (confirm("האם אתה בטוח שברצונך למחוק פרויקט זה? לא ניתן לבטל פעולה זו.")) {
            try {
                await persistenceService.deleteProject(id);
                this.loadProjects();
            } catch (e) {
                alert("מחיקה נכשלה: " + e.message);
            }
        }
    }

    async loadBilling() {
        const listEl = document.querySelector('.billing-list');
        const spinner = document.querySelector('#tab-billing .loading-spinner');
        if (!listEl) return;

        listEl.innerHTML = '';
        spinner.style.display = 'block';

        const functions = authService.getFunctions();
        const listPurchasesFn = functions.httpsCallable('listPurchases');

        try {
            const result = await listPurchasesFn();
            const purchases = result.data.purchases || [];
            spinner.style.display = 'none';

            if (purchases.length === 0) {
                listEl.innerHTML = '<div style="padding:20px; text-align:center; color:#666">אין רכישות עדיין.</div>';
                return;
            }

            purchases.forEach(p => {
                const li = document.createElement('li');
                li.className = 'billing-item';

                const date = new Date(p.createdAt._seconds * 1000).toLocaleDateString();
                const amount = p.currency + ' ' + p.amount;
                const status = p.status || 'PENDING';

                li.innerHTML = `
                    <div class="project-info">
                        <h4>הזמנה #${p.id.substring(0, 8)}...</h4>
                        <p>${date} • ${amount}</p>
                    </div>
                    <div class="project-actions">
                        <span class="billing-status status-${status}">${status}</span>
                        ${p.invoiceUrl ? `<a href="${p.invoiceUrl}" target="_blank" class="btn-sm">חשבונית</a>` : ''}
                    </div>
                `;
                listEl.appendChild(li);
            });

        } catch (e) {
            console.error(e);
            spinner.style.display = 'none';
            listEl.innerHTML = '<div class="error">טעינת היסטוריית חיובים נכשלה.</div>';
        }
    }
}
