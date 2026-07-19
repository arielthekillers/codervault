// public/assets/js/components/UI.js
import { FormBuilder } from './FormBuilder.js?v=6';

function escapeHtml(unsafe) {
    if (typeof unsafe !== 'string') return unsafe;
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

export class VaultUI {
    static renderProjectList(app) {
        const view = document.getElementById('mainDashboardView');
        if (!view) return;

        const projects = app.state.projects;

        const aggregates = app.state.aggregates || { reminders: [], bookmarks: [] };
        
        const now = new Date();
        now.setHours(0,0,0,0);
        const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
        
        let activeReminders = aggregates.reminders.filter(r => {
            const dateStr = r.item.fields.tanggal;
            if (!dateStr) return false;
            const itemDate = new Date(dateStr);
            itemDate.setHours(0,0,0,0);
            const diff = itemDate.getTime() - now.getTime();
            return diff >= -sevenDaysMs && diff <= sevenDaysMs;
        });
        
        activeReminders.sort((a, b) => new Date(a.item.fields.tanggal).getTime() - new Date(b.item.fields.tanggal).getTime());
        
        let remindersHtml = '';
        if (activeReminders.length > 0) {
            remindersHtml = `
            <div class="mt-5 pt-3">
                <h2 class="h6 fw-bold text-uppercase mb-3 d-flex align-items-center" style="color: var(--accent-warning); letter-spacing: 1px;"><i class="bi bi-bell-fill me-2"></i> Reminders Penting</h2>
                <div class="d-flex flex-column rounded overflow-hidden" style="border: 1px solid var(--border-color); background-color: var(--bg-card);">
                    ${activeReminders.map((r, index) => {
                        const itemDate = new Date(r.item.fields.tanggal);
                        itemDate.setHours(0,0,0,0);
                        const diffDays = Math.round((itemDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        let statusText = diffDays === 0 ? 'Hari ini' : (diffDays < 0 ? `Terlewat ${Math.abs(diffDays)} hari` : `${diffDays} hari lagi`);
                        let badgeClass = diffDays === 0 ? 'bg-warning text-dark' : (diffDays < 0 ? 'bg-danger text-white' : 'bg-info text-dark');
                        let formattedDate = r.item.fields.tanggal;
                        try {
                            const d = new Date(r.item.fields.tanggal);
                            if (!isNaN(d.getTime())) formattedDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                        } catch(e) {}
                        
                        return `
                        <div class="d-flex align-items-center py-3 px-4 cursor-pointer hover-bg-light ${index !== activeReminders.length - 1 ? 'border-bottom' : ''}" onclick="VaultEngine.switchProject('${r.project_id}')" style="border-bottom-color: var(--border-color) !important; transition: background-color 0.2s;">
                            <i class="bi bi-circle-fill me-3" style="color: ${r.project_color || 'var(--accent)'}; font-size: 0.6rem;"></i>
                            <div style="width: 130px;" class="text-muted small fw-medium">
                                ${formattedDate}
                            </div>
                            <div class="flex-grow-1 fw-semibold text-truncate" style="color: var(--text-primary); font-size: 0.95rem;">
                                ${escapeHtml(r.item.fields.label || r.item.title || '(Tanpa Label)')}
                                <span class="text-muted fw-normal ms-2 small opacity-75 d-none d-sm-inline-block">— <i class="bi bi-folder me-1" style="font-size:0.75rem;"></i>${escapeHtml(r.project_name)}</span>
                            </div>
                            <div class="ms-3 text-end" style="min-width: 90px;">
                                <span class="badge ${badgeClass}" style="font-size: 0.7rem; font-weight: 500; letter-spacing: 0.5px;">${statusText}</span>
                            </div>
                        </div>`
                    }).join('')}
                </div>
            </div>`;
        }

        view.innerHTML = `

            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 class="h4 mb-1 fw-semibold" style="color: var(--text-primary)">Workspace</h2>
                    <p class="text-muted small mb-0">Kelola dan akses ruang kerja Anda.</p>
                </div>
                <div>
                    <button class="btn btn-primary rounded-circle shadow-sm d-flex justify-content-center align-items-center" style="width: 44px; height: 44px;" onclick="VaultEngine.openProjectModal()" title="Workspace Baru">
                        <i class="bi bi-plus-lg fs-5"></i>
                    </button>
                </div>
            </div>

            <div class="row g-4">
                ${projects.map(p => {
                    const tagsHtml = p.tags ? p.tags.split(',').filter(t => t.trim() !== '').map(t => `<span class="badge rounded-pill border text-secondary px-2 py-1 me-1 mt-2" style="font-size: 0.65rem; font-weight: 500; border-color: var(--border-color); background-color: transparent;">${t.trim()}</span>`).join('') : '';
                    return `
                    <div class="col-md-6 col-lg-4 col-xl-3">
                        <div class="vault-card p-3 d-flex flex-column h-100 cursor-pointer project-card-hover" onclick="VaultEngine.switchProject('${p.id}')">
                            <div class="d-flex align-items-center mb-2">
                                <div class="rounded p-2 me-2 d-flex align-items-center justify-content-center" style="background-color: ${p.color}20; width: 36px; height: 36px;">
                                    <i class="bi ${p.icon || 'bi-folder'} fs-5" style="color: ${p.color || '#3b82f6'}"></i>
                                </div>
                                <h3 class="fs-6 mb-0 text-truncate fw-semibold" style="color: var(--text-primary); font-size: 0.95rem !important;">${p.name}</h3>
                            </div>
                            <div class="text-muted flex-grow-1" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; font-size: 0.8rem;">
                                ${p.description || 'Tidak ada deskripsi workspace.'}
                            </div>
                            ${tagsHtml ? `<div>${tagsHtml}</div>` : ''}
                        </div>
                    </div>
                `}).join('')}
                ${projects.length === 0 ? `
                    <div class="col-12 text-center py-5">
                        <div class="p-5 border border-dashed border-secondary rounded-4 bg-dark-edge mx-auto" style="max-width: 500px;">
                            <i class="bi bi-folder-x text-muted display-4 mb-3 d-block"></i>
                            <h5 style="color: var(--text-primary)">Belum Ada Workspace</h5>
                            <p class="text-muted small mb-4">Mulai dengan membuat ruang kerja baru untuk menyimpan kredensial Anda dengan aman.</p>
                            <div class="d-flex justify-content-center gap-2">
                                <button class="btn btn-outline-primary" onclick="VaultEngine.openProjectModal()">Buat Workspace Pertama</button>
                                <button class="btn btn-outline-info" onclick="bootstrap.Modal.getOrCreateInstance(document.getElementById('importShareModal')).show()">Import Data</button>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
            
            ${remindersHtml}
        `;
    }

    static renderGlobalBookmarks(app) {
        const menu = document.getElementById('globalBookmarkMenu');
        if (!menu) return;
        
        const aggregates = app.state.aggregates || { bookmarks: [] };
        if (aggregates.bookmarks.length === 0) {
            menu.innerHTML = '<li><span class="dropdown-item-text text-muted small">Tidak ada bookmark aktif.</span></li>';
            return;
        }
        
        const grouped = {};
        aggregates.bookmarks.forEach(b => {
            if (!grouped[b.project_id]) {
                grouped[b.project_id] = { name: b.project_name, color: b.project_color, links: [] };
            }
            let url = b.item.fields.url || b.item.fields.endpoint || '#';
            if (url !== '#' && !url.startsWith('http')) url = 'https://' + url;
            
            let label = b.item.fields.label || b.item.title || 'Link';
            grouped[b.project_id].links.push({ url, label });
        });
        
        let html = '';
        Object.keys(grouped).forEach(projectId => {
            const group = grouped[projectId];
            html += `<li class="dropdown-submenu" onmouseenter="this.querySelector('.submenu-ul').classList.add('show')" onmouseleave="this.querySelector('.submenu-ul').classList.remove('show')">`;
            html += `<a class="dropdown-item d-flex justify-content-between align-items-center fw-medium" href="#" onclick="event.preventDefault(); event.stopPropagation(); this.nextElementSibling.classList.toggle('show');">`;
            html += `<span>${escapeHtml(group.name)}</span><i class="bi bi-chevron-left ms-4 text-muted" style="font-size: 0.75rem;"></i></a>`;
            html += `<ul class="dropdown-menu shadow-lg submenu-ul" style="position: absolute !important; top: 0 !important; right: 100% !important; left: auto !important; margin-top: -1px !important; z-index: 9999 !important;">`;
            
            group.links.forEach(link => {
                html += `<li><a class="dropdown-item py-2 small" href="${escapeHtml(link.url)}" target="_blank"><i class="bi bi-link-45deg me-2 text-muted fs-6"></i>${escapeHtml(link.label)}</a></li>`;
            });
            
            html += `</ul></li>`;
        });
        
        menu.innerHTML = html;
    }

    static renderDashboard(app) {
        const view = document.getElementById('mainDashboardView');
        if (!view || !app.state.activeProject) {
            view.innerHTML = `<div class="text-center p-5 text-muted">Inisialisasi atau pilih proyek.</div>`;
            return;
        }

        const project = app.state.activeProject;
        const items = app.state.items;

        view.innerHTML = `
            <div class="mb-4 d-flex align-items-center text-muted small">
                <button class="btn btn-link text-decoration-none text-muted p-0 me-2 d-flex align-items-center hover-primary" onclick="VaultEngine.closeProject()">
                    <i class="bi bi-arrow-left me-1"></i> Workspace
                </button>
                <span class="mx-2 text-secondary">/</span>
                <span class="text-primary text-truncate">${project.name}</span>
            </div>

            <div class="d-flex justify-content-between align-items-center mb-4">
                <div class="d-flex align-items-center">
                    <div class="rounded p-2 me-3 d-flex align-items-center justify-content-center" style="background-color: ${project.color}15; width: 48px; height: 48px;">
                        <i class="bi ${project.icon || 'bi-folder'} fs-3" style="color: ${project.color || '#3b82f6'}"></i>
                    </div>
                    <div>
                        <h2 class="h5 mb-1 fw-bold d-flex align-items-center" style="color: var(--text-primary)">
                            ${project.name}
                            <button class="btn btn-link text-muted p-0 ms-2 hover-primary" style="transition: all 0.2s ease;" onclick="VaultEngine.openProjectModal(true)" title="Edit Workspace">
                                <i class="bi bi-pencil fs-6"></i>
                            </button>
                        </h2>
                        <p class="text-muted small mb-0" style="font-size: 0.8rem;">${project.description || 'Tidak ada deskripsi yang tersedia untuk workspace ini.'}</p>
                    </div>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <button class="btn rounded-circle shadow-sm d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; background-color: transparent; border: 1px solid var(--border-color); color: var(--text-muted); transition: all 0.2s;" onclick="VaultEngine.exportShare(null)" title="Bagikan / Ekspor Workspace ini">
                        <i class="bi bi-share-fill"></i>
                    </button>
                    <button class="btn rounded-circle shadow-sm d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; transition: all 0.2s; ${app.state.layoutMode === 'compact' ? `background-color: ${project.color}; color: white; border: none;` : `background-color: transparent; border: 1px solid var(--border-color); color: var(--text-muted);`}" onclick="VaultEngine.toggleLayoutMode()" title="Toggle Compact List Layout">
                        <i class="bi bi-list-task"></i>
                    </button>
                    <button class="btn rounded-circle shadow-sm d-flex justify-content-center align-items-center ${app.state.layoutMode === 'compact' ? 'd-none' : ''}" style="width: 40px; height: 40px; transition: all 0.2s; ${app.state.groupByType ? `background-color: ${project.color}; color: white; border: none;` : `background-color: transparent; border: 1px solid var(--border-color); color: var(--text-muted);`}" onclick="VaultEngine.toggleGroupBy()" title="Toggle Group by Type">
                        <i class="bi ${app.state.groupByType ? 'bi-grid-fill' : 'bi-grid'}"></i>
                    </button>
                    <button class="btn rounded-circle shadow-sm d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; background-color: ${project.color}; border: none; color: white; transition: all 0.2s;" onclick="VaultEngine.openTypeSelectionModal()" title="Tambah Item">
                        <i class="bi bi-plus-lg"></i>
                    </button>
                </div>
            </div>

            ${(() => {
                const renderCard = (item) => {
                    const typeSchema = app.state.itemTypes[item.type] || {};
                    const itemTagsHtml = item.tags ? item.tags.split(',').filter(t => t.trim() !== '').map(t => `<span class="badge rounded-pill border text-secondary px-2 py-1" style="font-size: 0.65rem; font-weight: 500; border-color: var(--border-color); background-color: transparent;">${t.trim()}</span>`).join('') : '';

                    return `
                        <div class="col-md-4 col-lg-3">
                            <div class="vault-card p-3 d-flex align-items-center h-100 cursor-pointer item-card-hover" onclick="VaultEngine.inspectItem('${item.id}')">
                                <div class="rounded p-2 me-3 flex-shrink-0 d-flex align-items-center justify-content-center" style="background-color: ${typeSchema.color || '#a1a1aa'}20; width: 42px; height: 42px;">
                                    <i class="bi ${typeSchema.icon || 'bi-box'} fs-5" style="color: ${typeSchema.color || '#a1a1aa'}"></i>
                                </div>
                                <div class="d-flex flex-column text-start overflow-hidden" style="min-width: 0;">
                                    <h3 class="mb-1 text-truncate fw-semibold" style="color: var(--text-primary); font-size: 0.95rem;">${item.title}</h3>
                                    <div class="d-flex flex-wrap gap-1">
                                        <span class="badge rounded-pill border px-2 py-1" style="font-size: 0.65rem; font-weight: 500; border-color: ${typeSchema.color || '#a1a1aa'}; color: ${typeSchema.color || '#a1a1aa'}; background-color: ${typeSchema.color || '#a1a1aa'}10;">${typeSchema.label || item.type}</span>
                                        ${itemTagsHtml}
                                    </div>
                                </div>
                            </div>
                        </div>
                    `;
                };

                let html = '';
                if (items.length === 0) {
                    html = `
                    <div class="col-12 text-center py-5">
                        <div class="p-5 border border-dashed border-secondary rounded-4 bg-dark-edge mx-auto" style="max-width: 500px;">
                            <i class="bi bi-box-seam text-muted display-4 mb-3 d-block"></i>
                            <h5 style="color: var(--text-primary)">Workspace Kosong</h5>
                            <p class="text-muted small mb-4">Belum ada item yang tersimpan di workspace ini. Mulai tambahkan kredensial, catatan, atau file penting Anda dengan aman.</p>
                            <div class="d-flex justify-content-center gap-2">
                                <button class="btn btn-outline-primary" onclick="VaultEngine.openTypeSelectionModal()">Tambah Item Pertama</button>
                                <button class="btn btn-outline-info" onclick="bootstrap.Modal.getOrCreateInstance(document.getElementById('importShareModal')).show()">Import Data</button>
                            </div>
                        </div>
                    </div>`;
                } else {
                    const renderTableRow = (item) => {
                        
                        let colsHtml = '';
                        if (item.fields) {
                            const makeCopyable = (val, isLink = false, isPassword = false) => {
                                if (!val) return '<span class="text-muted small">-</span>';
                                const displayVal = isLink 
                                    ? `<a href="${val.startsWith('http') ? val : 'https://'+val}" target="_blank" onclick="event.stopPropagation()" onmousedown="event.stopPropagation()" class="text-primary text-truncate d-inline-block" style="max-width: 250px; text-decoration: none;">${val}</a>` 
                                    : (isPassword ? `<span class="text-secondary d-inline-block" style="max-width: 150px; font-family: monospace; letter-spacing: 2px;">••••••••</span>` 
                                                  : `<span class="text-secondary text-truncate d-inline-block" style="max-width: 250px;">${val}</span>`);
                                return `
                                    <div class="d-flex align-items-center gap-1" onclick="event.stopPropagation()">
                                        ${displayVal}
                                        <button class="btn btn-sm btn-link text-muted p-0 ms-1 hover-primary" onclick="navigator.clipboard.writeText('${val.replace(/'/g, "\\'")}'); this.innerHTML='<i class=\\'bi bi-check-lg text-success\\'></i>'; setTimeout(() => this.innerHTML='<i class=\\'bi bi-clipboard\\'></i>', 1500); event.stopPropagation();" title="Copy">
                                            <i class="bi bi-clipboard"></i>
                                        </button>
                                    </div>
                                `;
                            };

                            if (item.type === 'account' || item.type === 'database' || item.type === 'ssh') {
                                const target = item.type === 'account' ? item.fields.url : item.fields.host;
                                const targetHtml = target ? makeCopyable(target, item.type === 'account') : '<span class="text-muted small">-</span>';
                                const userHtml = item.fields.username ? makeCopyable(item.fields.username) : '<span class="text-muted small">-</span>';
                                const passHtml = item.fields.password ? makeCopyable(item.fields.password, false, true) : '<span class="text-muted small">-</span>';
                                colsHtml = `
                                    <td class="py-2" style="font-size: 0.85rem;">${targetHtml}</td>
                                    <td class="py-2" style="font-size: 0.85rem;">${userHtml}</td>
                                    <td class="py-2" style="font-size: 0.85rem;">${passHtml}</td>
                                `;
                            } else if (item.type === 'api') {
                                const targetHtml = item.fields.endpoint ? makeCopyable(item.fields.endpoint, true) : '<span class="text-muted small">-</span>';
                                colsHtml = `<td class="py-2" style="font-size: 0.85rem;">${targetHtml}</td>`;
                            } else if (item.type === 'note') {
                                const targetHtml = item.fields.content ? `<span class="small text-secondary text-truncate d-inline-block" style="max-width: 500px;">${item.fields.content}</span>` : '<span class="text-muted small">-</span>';
                                colsHtml = `<td class="py-2" style="font-size: 0.85rem;">${targetHtml}</td>`;
                            } else if (item.type === 'reminder') {
                                let formattedDate = item.fields.tanggal || '-';
                                try {
                                    if (item.fields.tanggal) {
                                        const d = new Date(item.fields.tanggal);
                                        if (!isNaN(d.getTime())) formattedDate = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
                                    }
                                } catch(e) {}
                                colsHtml = `<td class="py-2" style="font-size: 0.85rem;"><span class="text-secondary fw-medium"><i class="bi bi-calendar-event me-2"></i>${formattedDate}</span></td>`;
                            } else {
                                const keys = Object.keys(item.fields);
                                let targetHtml = '<span class="text-muted small">-</span>';
                                if (keys.length > 0 && typeof item.fields[keys[0]] === 'string') {
                                    targetHtml = makeCopyable(item.fields[keys[0]]);
                                }
                                colsHtml = `<td class="py-2" style="font-size: 0.85rem;">${targetHtml}</td>`;
                            }
                        }

                        return `
                            <tr class="cursor-pointer" onclick="VaultEngine.inspectItem('${item.id}')" style="transition: background-color 0.2s;">
                                <td class="py-2">
                                    <span class="text-truncate d-block" style="color: var(--text-primary); font-size: 0.85rem; max-width: 250px;">${item.title}</span>
                                </td>
                                ${colsHtml}
                            </tr>
                        `;
                    };

                    const renderTableContainer = (rowsHtml, type) => {
                        let colsHeader = '';
                        if (type === 'account') {
                            colsHeader = `
                                <th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">URL</th>
                                <th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Username</th>
                                <th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Password</th>
                            `;
                        } else if (type === 'database' || type === 'ssh') {
                            colsHeader = `
                                <th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Host</th>
                                <th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Username</th>
                                <th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Password</th>
                            `;
                        } else if (type === 'api') {
                            colsHeader = `<th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Endpoint URL</th>`;
                        } else if (type === 'note') {
                            colsHeader = `<th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Content</th>`;
                        } else {
                            colsHeader = `<th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Detail</th>`;
                        }

                        return `
                        <div class="table-responsive mb-4">
                            <table class="table table-hover table-sm align-middle mb-0" style="color: var(--text-primary); --bs-table-bg: transparent; --bs-table-border-color: rgba(128, 128, 128, 0.05); background: transparent;">
                                <thead style="background-color: rgba(128, 128, 128, 0.05);">
                                    <tr>
                                        <th class="border-bottom-0 py-2" style="color: var(--text-muted); font-weight: normal; font-size: 0.85rem;">Item</th>
                                        ${colsHeader}
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                        `;
                    };

                    const sortedItems = [...items].sort((a, b) => a.type.localeCompare(b.type));
                    
                    const shouldGroup = app.state.groupByType || app.state.layoutMode === 'compact';
                    if (shouldGroup) {
                        const grouped = {};
                        sortedItems.forEach(item => {
                            if (!grouped[item.type]) grouped[item.type] = [];
                            grouped[item.type].push(item);
                        });
                        
                        Object.keys(grouped).forEach(type => {
                            const typeSchema = app.state.itemTypes[type] || { label: type, icon: 'bi-box', color: '#a1a1aa' };
                            html += `<h6 class="w-100 mt-4 mb-2 text-uppercase fw-semibold" style="color: ${typeSchema.color || 'var(--text-muted)'}; font-size: 0.75rem; letter-spacing: 0.5px;">${typeSchema.label}</h6>`;
                            if (app.state.layoutMode === 'compact') {
                                html += renderTableContainer(grouped[type].map(item => renderTableRow(item)).join(''), type);
                            } else {
                                html += `<div class="row g-3 mb-3">`;
                                html += grouped[type].map(item => renderCard(item)).join('');
                                html += `</div>`;
                            }
                        });
                    } else {
                        html = `<div class="row g-3">`;
                        html += sortedItems.map(item => renderCard(item)).join('');
                        html += `</div>`;
                    }
                }
                return html;
            })()}
        `;
    }

    static openTypeSelectionModal(app) {
        const container = document.getElementById('itemTypeSelectionContainer');
        container.innerHTML = `
            <div class="list-group list-group-flush border-0">
                ${Object.entries(app.state.itemTypes).map(([key, cfg]) => `
                    <button class="list-group-item list-group-item-action d-flex align-items-center py-3 px-3 border-0 bg-transparent item-card-hover cursor-pointer rounded mb-1" 
                            onclick="VaultEngine.openItemModal('${key}')">
                        <div class="rounded-circle p-2 me-3 d-flex align-items-center justify-content-center shadow-sm" style="background-color: ${cfg.color}15; width: 42px; height: 42px;">
                            <i class="bi ${cfg.icon} fs-5" style="color: ${cfg.color}"></i>
                        </div>
                        <span style="color: var(--text-primary); font-weight: 500; font-size: 0.95rem;">${cfg.label}</span>
                    </button>
                `).join('')}
            </div>
        `;
        const bModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('itemTypeSelectionModal'));
        bModal.show();
    }

    static openItemModal(app, typeOrItem = null) {
        const typeModalEl = document.getElementById('itemTypeSelectionModal');
        const bTypeModal = bootstrap.Modal.getInstance(typeModalEl);
        if (bTypeModal) bTypeModal.hide();

        const modalEl = document.getElementById('itemEngineModal');
        const form = document.getElementById('itemEngineForm');
        form.querySelectorAll('input:not([type="hidden"]), textarea').forEach(el => el.value = '');
        document.getElementById('itemFormProject').value = app.state.activeProject.id;
        
        let isEdit = typeOrItem && typeof typeOrItem === 'object';
        let itemType = isEdit ? typeOrItem.type : typeOrItem;
        
        document.getElementById('itemFormId').value = isEdit ? typeOrItem.id : '';
        document.getElementById('itemTypeSelector').value = itemType;

        const cfg = app.state.itemTypes[itemType] || { label: 'Tipe Tidak Dikenal', icon: 'bi-question-circle', color: '#6c757d', fields: [] };
        
        const modalDialog = modalEl.querySelector('.modal-dialog');
        if (itemType === 'note' || itemType === 'list') {
            modalDialog.classList.add('modal-xl');
            modalDialog.classList.remove('modal-md', 'modal-lg');
            modalDialog.style.maxWidth = '1100px';
        } else {
            modalDialog.classList.add('modal-md');
            modalDialog.classList.remove('modal-lg', 'modal-xl');
            modalDialog.style.maxWidth = '';
        }

        const deleteBtn = document.getElementById('itemFormDeleteBtn');
        const autoSaveIndicator = document.getElementById('autoSaveIndicator');
        if (autoSaveIndicator) autoSaveIndicator.style.opacity = '0';

        if (isEdit) {
            deleteBtn.classList.remove('d-none');
            const shareBtn = document.getElementById('itemFormShareBtn');
            if (shareBtn) shareBtn.classList.remove('d-none');
            document.getElementById('itemModalLabel').innerText = `Edit ${cfg.label}`;
            document.getElementById('itemFormTitle').value = typeOrItem.title;
            app.renderDynamicFormFields(itemType, typeOrItem.fields, true);
        } else {
            deleteBtn.classList.add('d-none');
            const shareBtn = document.getElementById('itemFormShareBtn');
            if (shareBtn) shareBtn.classList.add('d-none');
            document.getElementById('itemModalLabel').innerText = `Tambah ${cfg.label}`;
            app.renderDynamicFormFields(itemType, {}, false);
        }

        const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bModal.show();
        
        setTimeout(() => {
            document.getElementById('itemFormTitle').focus();
        }, 300);
    }

    static openProjectModal(app, isEdit = false) {
        const modalEl = document.getElementById('projectModal');
        const form = document.getElementById('projectCreateForm');
        
        const deleteBtn = document.getElementById('projectFormDeleteBtn');
        if (deleteBtn) {
            deleteBtn.disabled = false;
            deleteBtn.innerHTML = '<i class="bi bi-trash"></i> Remove';
        }
        
        if (isEdit && app.state.activeProject) {
            document.querySelector('#projectModal .modal-title').innerText = "Edit Workspace";
            if (deleteBtn) deleteBtn.classList.remove('d-none');
            const project = app.state.activeProject;
            document.getElementById('projectFormId').value = project.id;
            document.getElementById('projectFormName').value = project.name;
            document.getElementById('projectFormDesc').value = project.description || '';
            document.getElementById('projectFormTags').value = project.tags || '';
            document.getElementById('projectFormColor').value = project.color || '#3b82f6';
            document.getElementById('projectFormIcon').value = project.icon || 'bi-folder';
            
            const colorSwatches = document.querySelectorAll('#colorPalette .color-swatch');
            colorSwatches.forEach(s => {
                s.classList.remove('border-white');
                s.classList.add('border-transparent');
                if (s.getAttribute('data-color') === (project.color || '#3b82f6')) {
                    s.classList.remove('border-transparent');
                    s.classList.add('border-white');
                }
            });
        } else {
            document.querySelector('#projectModal .modal-title').innerText = "Buat Workspace Baru";
            if (deleteBtn) deleteBtn.classList.add('d-none');
            form.reset();
            document.getElementById('projectFormId').value = '';
            
            const colorSwatches = document.querySelectorAll('#colorPalette .color-swatch');
            colorSwatches.forEach(s => {
                s.classList.remove('border-white');
                s.classList.add('border-transparent');
            });
            if (colorSwatches.length > 0) {
                colorSwatches[0].classList.remove('border-transparent');
                colorSwatches[0].classList.add('border-white');
                document.getElementById('projectFormColor').value = colorSwatches[0].getAttribute('data-color');
            }
        }
        
        const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
        bModal.show();
    }
}