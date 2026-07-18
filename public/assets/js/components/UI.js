// public/assets/js/components/UI.js
import { FormBuilder } from './FormBuilder.js?v=6';

export class VaultUI {
    static renderProjectList(app) {
        const view = document.getElementById('mainDashboardView');
        if (!view) return;

        const projects = app.state.projects;

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
                            <button class="btn btn-outline-primary" onclick="VaultEngine.openProjectModal()">Buat Workspace Pertama</button>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
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
                    <button class="btn rounded-circle shadow-sm d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; background-color: transparent; border: 1px solid var(--border-color); color: var(--text-muted); transition: all 0.2s;" onclick="app.renderChangePinModal(false)" title="Ubah PIN Master">
                        <i class="bi bi-gear-fill"></i>
                    </button>
                    <button class="btn rounded-circle shadow-sm d-flex justify-content-center align-items-center" style="width: 40px; height: 40px; transition: all 0.2s; ${app.state.groupByType ? `background-color: ${project.color}; color: white; border: none;` : `background-color: transparent; border: 1px solid var(--border-color); color: var(--text-muted);`}" onclick="VaultEngine.toggleGroupBy()" title="Toggle Group by Type">
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
                    html = `<div class="row g-3"><div class="col-12 text-center p-5 text-muted border border-dashed border-secondary rounded bg-dark-edge">Belum ada item keamanan yang tersimpan di proyek ini.</div></div>`;
                } else {
                    const sortedItems = [...items].sort((a, b) => a.type.localeCompare(b.type));
                    
                    if (app.state.groupByType) {
                        const grouped = {};
                        sortedItems.forEach(item => {
                            if (!grouped[item.type]) grouped[item.type] = [];
                            grouped[item.type].push(item);
                        });
                        
                        Object.keys(grouped).forEach(type => {
                            const typeSchema = app.state.itemTypes[type] || { label: type, icon: 'bi-box', color: '#a1a1aa' };
                            html += `<h6 class="w-100 mt-4 mb-2 text-uppercase fw-semibold" style="color: var(--text-muted); font-size: 0.75rem; letter-spacing: 0.5px;">${typeSchema.label}</h6>`;
                            html += `<div class="row g-3 mb-3">`;
                            html += grouped[type].map(item => renderCard(item)).join('');
                            html += `</div>`;
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
            document.getElementById('itemModalLabel').innerText = `Edit ${cfg.label}`;
            document.getElementById('itemFormTitle').value = typeOrItem.title;
            app.renderDynamicFormFields(itemType, typeOrItem.fields, true);
        } else {
            deleteBtn.classList.add('d-none');
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
        
        if (isEdit && app.state.activeProject) {
            document.querySelector('#projectModal .modal-title').innerText = "Edit Workspace";
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