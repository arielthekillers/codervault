// public/assets/js/app.js
import { FormBuilder } from './components/FormBuilder.js?v=6';
import { VaultUI } from './components/UI.js?v=7';
import { SearchIndex } from './components/SearchIndex.js?v=2';

class ProjectVaultApp {
    constructor() {
        this.state = {
            activeProject: null,
            projects: [],
            items: [],
        };
        this.searchMatches = [];
        this.isUnlocked = false;
        this.initEventListeners();
        this.checkAuthStatus();
    }

    /**
     * Standard centralized AJAX networking proxy wrapper
     */
    async makeRequest(url, options = {}) {
        try {
            const response = await fetch(url, {
                method: options.method || 'GET',
                headers: { 'Content-Type': 'application/json', ...options.headers },
                body: options.body ? JSON.stringify(options.body) : null
            });

            // Read the raw text response first
            const rawText = await response.text();

            // Attempt to parse it as JSON safely
            let data;
            try {
                data = JSON.parse(rawText);
            } catch (jsonError) {
                console.error("Server returned non-JSON payload:", rawText);
                this.showToast("Server mengembalikan payload konfigurasi tidak valid.", "danger");

                // Pop up the raw response in an alert box for easier debugging
                alert("Kesalahan Mesin Backend Ditemukan:\n\n" + rawText);
                return null;
            }

            if (data && data.error === 'LOCKED') {
                this.renderLockScreen();
                return null;
            }
            return data;
        } catch (err) {
            console.error("Vault Network Comm Failure:", err);
            this.showToast("Kegagalan Komunikasi Jaringan.", "danger");
            return null;
        }
    }

    initEventListeners() {
        // Universal Shortcut Binding Matrix: Shift + F
        window.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key.toLowerCase() === 'f' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.toggleGlobalSearch();
            }
        });

        // Dynamic Field Injections Event delegation hook
        document.body.addEventListener('change', (e) => {
            if (e.target && e.target.id === 'itemTypeSelector') {
                this.renderDynamicFormFields(e.target.value);
            }
        });

        // Real-time Search Processing Hook
        document.body.addEventListener('input', (e) => {
            if (e.target && e.target.id === 'globalSearchInput') {
                this.executeSearch(e.target.value);
            }
        });

        // Search Click Execution Listener Matrix
        document.body.addEventListener('click', (e) => {
            const row = e.target.closest('.search-result-item');
            if (row) {
                const idx = parseInt(row.getAttribute('data-index'), 10);
                if (this.searchMatches[idx]) {
                    this.searchMatches[idx].action();
                }
            }
        });

        // Form Interceptions (Directly bound to prevent bubbling issues)
        const itemFormSubmitBtn = document.getElementById('itemFormSubmitBtn');
        if (itemFormSubmitBtn) {
            itemFormSubmitBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleItemSubmit();
            });
        }
        
        const itemEngineForm = document.getElementById('itemEngineForm');
        if (itemEngineForm) {
            itemEngineForm.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') {
                    if (e.target.id && e.target.id.startsWith('new_')) {
                        return; // Let the list item handler take care of it
                    }
                    e.preventDefault();
                    this.handleItemSubmit();
                }
            });
        }

        const projectForm = document.getElementById('projectCreateForm');
        if (projectForm) {
            projectForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleProjectSubmit();
            });
        }

        // Color Palette Selector Logic
        const colorSwatches = document.querySelectorAll('#colorPalette .color-swatch');
        if (colorSwatches) {
            colorSwatches.forEach(swatch => {
                swatch.addEventListener('click', (e) => {
                    colorSwatches.forEach(s => {
                        s.classList.remove('border-white');
                        s.classList.add('border-transparent');
                    });
                    e.target.classList.remove('border-transparent');
                    e.target.classList.add('border-white');
                    document.getElementById('projectFormColor').value = e.target.getAttribute('data-color');
                });
            });
        }
        
        this.setupAutoSave();
        this.setupInactivityLock();
    }

    setupInactivityLock() {
        let inactivityTimer;
        const lockTime = 10 * 1000; // 10 detik

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            if (this.isUnlocked && !this.state.mustChangePin) {
                inactivityTimer = setTimeout(() => {
                    console.log("Inactivity limit reached, locking vault...");
                    this.logout();
                }, lockTime);
            }
        };

        // Listen for user activity
        window.addEventListener('mousemove', resetTimer);
        window.addEventListener('keydown', resetTimer);
        window.addEventListener('click', resetTimer);
        window.addEventListener('scroll', resetTimer);

        // Start timer initially
        resetTimer();
    }

    async checkAuthStatus() {
        const data = await this.makeRequest('api.php?action=check_status');
        if (!data) return;

        if (data.locked) {
            this.renderLockScreen(data.setup_required);
        } else {
            this.loadWorkspace();
        }
    }

    async logout() {
        // Synchronously force-hide all modals and clean up backdrops to prevent focus traps
        document.querySelectorAll('.modal').forEach(m => {
            m.classList.remove('show');
            m.style.display = 'none';
            m.setAttribute('aria-hidden', 'true');
        });
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        
        this.isUnlocked = false;
        this.state.activeProject = null;
        this.state.projects = [];
        this.state.items = [];
        await this.makeRequest('api.php?action=logout');
        this.renderLockScreen(false);
    }

    renderLockScreen(isFirstLaunch = false) {
        const mainContainer = document.getElementById('appShell');
        
        // SECURITY ENHANCEMENT: Completely wipe the DOM so nothing can be read via Inspect Element
        mainContainer.innerHTML = '<div class="vh-100 bg-app"></div>';
        mainContainer.style.filter = '';
        mainContainer.style.pointerEvents = '';

        let lockOverlay = document.getElementById('lockOverlay');
        if (!lockOverlay) {
            lockOverlay = document.createElement('div');
            lockOverlay.id = 'lockOverlay';
            lockOverlay.style.position = 'fixed';
            lockOverlay.style.top = '0';
            lockOverlay.style.left = '0';
            lockOverlay.style.width = '100vw';
            lockOverlay.style.height = '100vh';
            lockOverlay.style.zIndex = '9999';
            lockOverlay.style.backgroundColor = 'rgba(15, 23, 42, 0.6)';
            lockOverlay.style.display = 'flex';
            lockOverlay.style.alignItems = 'center';
            lockOverlay.style.justifyContent = 'center';
            document.body.appendChild(lockOverlay);
        }

        lockOverlay.innerHTML = `
            <div class="vault-card p-4 text-center shadow-lg" style="width: 380px;">
                <i class="bi bi-shield-lock-fill text-primary display-4 mb-3 d-block"></i>
                <h4 class="mb-1">${isFirstLaunch ? 'Inisialisasi Vault' : 'Vault Terkunci'}</h4>
                <p class="text-muted small mb-4">${isFirstLaunch ? 'Gunakan PIN default (123456) untuk pertama kali.' : 'Masukkan 6 digit PIN.'}</p>
                <div id="lockForm">
                    <div class="d-flex justify-content-center gap-2 mb-4" id="pinContainer">
                        ${[1,2,3,4,5,6].map(i => `
                            <input type="text" inputmode="numeric" class="form-control form-control-vault text-center pin-digit" style="width: 45px; height: 50px; font-size: 1.5rem;" maxlength="1" autocomplete="off" data-index="${i}">
                        `).join('')}
                    </div>
                    <button type="button" id="unlockBtn" class="btn btn-primary w-100 py-3" style="font-size: 0.85rem; letter-spacing: 1px; font-weight: 600; text-transform: uppercase;">${isFirstLaunch ? 'Buat Kunci Mesin' : 'Buka Akses'}</button>
                </div>
            </div>
        `;

        const inputs = lockOverlay.querySelectorAll('.pin-digit');
        if (inputs.length > 0) {
            setTimeout(() => inputs[0].focus(), 150);
        }

        const submitPin = async () => {
            const pin = Array.from(inputs).map(i => i.dataset.val || '').join('');
            if (pin.length < 6) return;

            const res = await this.makeRequest('api.php?action=unlock', {
                method: 'POST',
                body: { pin }
            });
            
            if (res && res.success) {
                if (res.must_change_pin) {
                    this.state.mustChangePin = true;
                }

                lockOverlay.remove();
                mainContainer.style.filter = '';
                mainContainer.style.pointerEvents = '';
                
                if (this.state.mustChangePin) {
                    this.renderChangePinModal(true);
                    return;
                }

                if (mainContainer.innerHTML.includes('bg-app') && mainContainer.children.length === 1 && mainContainer.children[0].innerHTML === '') {
                    this.loadWorkspace();
                } else if (!mainContainer.querySelector('.mx-auto')) {
                    this.loadWorkspace();
                }
            } else {
                inputs.forEach(i => {
                    i.classList.add('border-danger', 'text-danger');
                    i.value = '';
                    i.dataset.val = '';
                });
                inputs[0].focus();
            }
        };

        document.getElementById('unlockBtn').addEventListener('click', submitPin);

        inputs.forEach((input, idx) => {
            input.addEventListener('input', (e) => {
                input.classList.remove('border-danger', 'text-danger');
                const val = e.target.value;
                if (val !== '' && val !== '•') {
                    // Store real value and mask it
                    input.dataset.val = val.slice(-1);
                    input.value = '•';
                    
                    if (idx < inputs.length - 1) {
                        inputs[idx + 1].focus();
                    } else {
                        submitPin();
                    }
                } else if (val === '') {
                    input.dataset.val = '';
                }
            });
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Backspace' && e.target.value === '' && idx > 0) {
                    inputs[idx - 1].focus();
                    inputs[idx - 1].value = '';
                    inputs[idx - 1].dataset.val = '';
                } else if (e.key === 'Enter') {
                    submitPin();
                }
            });
        });
    }

    renderChangePinModal(forced = false) {
        const modalHtml = `
        <div class="modal fade" id="changePinModal" data-bs-backdrop="${forced ? 'static' : 'true'}" data-bs-keyboard="${!forced}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content bg-card border-secondary shadow-lg" style="border-radius: 1rem; overflow: hidden;">
                    <div class="modal-header border-0 bg-dark-edge p-4">
                        <div class="d-flex align-items-center">
                            <div class="rounded-circle d-flex align-items-center justify-content-center me-3" style="width: 48px; height: 48px; background-color: rgba(59, 130, 246, 0.1);">
                                <i class="bi bi-shield-lock text-primary fs-4"></i>
                            </div>
                            <div>
                                <h5 class="modal-title text-white fw-bold mb-0">${forced ? 'Set PIN Master Baru' : 'Ubah PIN Master'}</h5>
                                <span class="text-muted small">Amankan ruang kerja Anda</span>
                            </div>
                        </div>
                        ${!forced ? '<button type="button" class="btn-close shadow-none btn-close-white" data-bs-dismiss="modal" aria-label="Tutup"></button>' : ''}
                    </div>
                    <div class="modal-body p-4 p-md-5 text-center">
                        ${forced ? '<div class="alert border border-warning bg-transparent text-warning mb-4 text-start"><i class="bi bi-exclamation-triangle-fill me-2"></i>Demi keamanan, Anda wajib mengubah PIN default sebelum dapat menggunakan Vault.</div>' : '<p class="text-muted mb-4 text-start small">Mengubah PIN akan mendekripsi dan mengenkripsi ulang seluruh data Anda dengan kunci baru.</p>'}
                        
                        <div class="mb-4" ${forced ? 'style="display:none;"' : ''}>
                            <label class="text-muted small mb-2 d-block text-center fw-semibold">PIN Lama</label>
                            <div class="d-flex justify-content-center gap-2" id="oldPinContainer">
                                ${[1,2,3,4,5,6].map(i => `<input type="text" inputmode="numeric" class="form-control form-control-vault text-center old-pin-digit" style="width: 50px; height: 55px; font-size: 1.5rem; border-radius: 0.5rem;" maxlength="1" autocomplete="off" data-index="${i}">`).join('')}
                            </div>
                        </div>

                        <div class="mb-4">
                            <label class="text-muted small mb-2 d-block text-center fw-semibold">${forced ? 'Buat 6-Digit PIN Baru' : 'PIN Baru'}</label>
                            <div class="d-flex justify-content-center gap-2" id="newPinContainer">
                                ${[1,2,3,4,5,6].map(i => `<input type="text" inputmode="numeric" class="form-control form-control-vault text-center new-pin-digit" style="width: 50px; height: 55px; font-size: 1.5rem; border-radius: 0.5rem;" maxlength="1" autocomplete="off" data-index="${i}">`).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-0 p-4 bg-dark-edge">
                        ${!forced ? '<button type="button" class="btn btn-outline-secondary px-4 rounded-pill" data-bs-dismiss="modal">Batal</button>' : ''}
                        <button type="button" class="btn btn-primary px-4 rounded-pill d-flex align-items-center" id="btnSubmitChangePin">
                            <i class="bi bi-shield-check me-2"></i> Simpan & Re-enkripsi
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        let modalEl = document.getElementById('changePinModal');
        if (modalEl) modalEl.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        modalEl = document.getElementById('changePinModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const setupInputMasking = (selector, containerId) => {
            const inputs = document.querySelectorAll(selector);
            inputs.forEach((input, idx) => {
                input.addEventListener('input', (e) => {
                    input.classList.remove('border-danger', 'text-danger');
                    const val = e.target.value;
                    if (val !== '' && val !== '•') {
                        input.dataset.val = val.slice(-1);
                        input.value = '•';
                        if (idx < inputs.length - 1) inputs[idx + 1].focus();
                    } else if (val === '') {
                        input.dataset.val = '';
                    }
                });
                input.addEventListener('keydown', (e) => {
                    if (e.key === 'Backspace' && e.target.value === '' && idx > 0) {
                        inputs[idx - 1].focus();
                        inputs[idx - 1].value = '';
                        inputs[idx - 1].dataset.val = '';
                    }
                });
            });
            return inputs;
        };

        const oldInputs = setupInputMasking('.old-pin-digit', 'oldPinContainer');
        const newInputs = setupInputMasking('.new-pin-digit', 'newPinContainer');
        
        // Auto-focus logic
        setTimeout(() => {
            if (forced) {
                if (newInputs.length > 0) newInputs[0].focus();
            } else {
                if (oldInputs.length > 0) oldInputs[0].focus();
            }
        }, 500);

        document.getElementById('btnSubmitChangePin').addEventListener('click', async () => {
            // If forced, old PIN is implicitly 123456
            const oldPin = forced ? '123456' : Array.from(oldInputs).map(i => i.dataset.val || '').join('');
            const newPin = Array.from(newInputs).map(i => i.dataset.val || '').join('');

            if (oldPin.length < 6 || newPin.length < 6) {
                alert("Mohon lengkapi seluruh 6 digit PIN.");
                return;
            }

            const btn = document.getElementById('btnSubmitChangePin');
            const originalBtnHtml = btn.innerHTML;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Memproses...';
            btn.disabled = true;

            const res = await this.makeRequest('api.php?action=change_pin', {
                method: 'POST',
                body: { old_pin: oldPin, new_pin: newPin }
            });

            if (res && res.success) {
                this.state.mustChangePin = false;
                modal.hide();
                // We use setTimeout to let the modal backdrop fade out completely before initializing dashboard
                setTimeout(() => {
                    if (forced) {
                        this.loadWorkspace();
                    }
                }, 300);
            } else {
                btn.innerHTML = originalBtnHtml;
                btn.disabled = false;
                alert(res?.message || "Gagal mengubah PIN.");
                if (!forced) {
                    oldInputs.forEach(i => { i.value = ''; i.dataset.val = ''; i.classList.add('border-danger', 'text-danger'); });
                    oldInputs[0].focus();
                } else {
                    newInputs.forEach(i => { i.value = ''; i.dataset.val = ''; i.classList.add('border-danger', 'text-danger'); });
                    newInputs[0].focus();
                }
            }
        });
    }

    async loadWorkspace() {
        this.isUnlocked = true;
        // Hydrate Dynamic Configuration Type Schemas
        this.state.itemTypes = await fetch('config/item-types.json').then(r => r.json());

        const res = await this.makeRequest('api.php?action=get_projects');
        if (res && res.success) {
            this.state.projects = res.projects;

            // Build the Shell Infrastructure Frame
            document.getElementById('appShell').innerHTML = `
                <div class="vh-100 bg-app overflow-auto">
                    <div class="mx-auto" style="max-width: 1200px; padding: 2rem;">
                        <header class="d-flex justify-content-between align-items-center mb-5">
                            <div class="d-flex align-items-center">
                                <i class="bi bi-shield-lock-fill text-primary fs-3 me-2"></i>
                                <span class="fw-bold tracking-tight fs-4" style="color: var(--text-primary)">CoderVault</span>
                            </div>
                            <div class="d-flex align-items-center gap-2">
                                <button class="btn btn-sm rounded-circle shadow-sm d-flex justify-content-center align-items-center vault-icon-btn" style="width: 36px; height: 36px; background-color: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); transition: border-color 0.15s ease;" onclick="VaultEngine.toggleGlobalSearch()" title="Cari (Shift+F)">
                                    <i class="bi bi-search"></i>
                                </button>
                                <button class="btn btn-sm rounded-circle shadow-sm d-flex justify-content-center align-items-center vault-icon-btn" style="width: 36px; height: 36px; background-color: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); transition: border-color 0.15s ease;" id="themeToggleBtn" title="Ganti Tema">
                                    <i class="bi bi-moon-stars"></i>
                                </button>
                                <button class="btn btn-sm rounded-circle shadow-sm d-flex justify-content-center align-items-center vault-icon-btn text-danger" style="width: 36px; height: 36px; background-color: var(--bg-card); border: 1px solid var(--border-color); transition: border-color 0.15s ease;" id="logoutBtn" title="Kunci Workspace">
                                    <i class="bi bi-box-arrow-left"></i>
                                </button>
                            </div>
                        </header>
                        <main id="mainDashboardView"></main>
                    </div>
                </div>
            `;

            document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
            
            const themeBtn = document.getElementById('themeToggleBtn');
            const themeIcon = themeBtn.querySelector('i');
            
            // Sync initial theme icon
            if (document.documentElement.getAttribute('data-bs-theme') === 'light') {
                themeIcon.classList.replace('bi-moon-stars', 'bi-sun');
            }

            themeBtn?.addEventListener('click', () => {
                const html = document.documentElement;
                const isDark = html.getAttribute('data-bs-theme') === 'dark';
                const newTheme = isDark ? 'light' : 'dark';
                html.setAttribute('data-bs-theme', newTheme);
                
                if (newTheme === 'light') {
                    themeIcon.classList.replace('bi-moon-stars', 'bi-sun');
                } else {
                    themeIcon.classList.replace('bi-sun', 'bi-moon-stars');
                }

                // Call backend to persist if supported, or just use localStorage (fallback to backend if possible)
                this.makeRequest('api.php?action=save_theme', { method: 'POST', body: { theme: newTheme } });
            });

            this.state.activeProject = null;
            VaultUI.renderProjectList(this);
        }
    }

    async switchProject(projectId) {
        const res = await this.makeRequest(`api.php?action=get_project_data&id=${projectId}`);
        if (res && res.success) {
            this.state.activeProject = res.project;
            this.state.items = res.items;
            VaultUI.renderDashboard(this);
        }
    }

    setupAutoSave() {
        let autoSaveTimeout;
        const form = document.getElementById('itemEngineForm');
        if (form) {
            form.addEventListener('input', (e) => {
                const selector = document.getElementById('itemTypeSelector');
                // Hanya aktifkan autosave untuk Note
                if (selector && selector.value === 'note') {
                    const indicator = document.getElementById('autoSaveIndicator');
                    if (indicator) {
                        indicator.innerText = 'Saving draft...';
                        indicator.style.opacity = '1';
                    }
                    
                    clearTimeout(autoSaveTimeout);
                    autoSaveTimeout = setTimeout(() => {
                        this.handleItemSubmit(true);
                    }, 1200); // Autosave setelah 1.2 detik berhenti mengetik
                }
            });
        }
    }

    toggleGroupBy() {
        this.state.groupByType = !this.state.groupByType;
        VaultUI.renderDashboard(this);
    }

    closeProject() {
        this.state.activeProject = null;
        this.state.items = [];
        VaultUI.renderProjectList(this);
    }

    renderDynamicFormFields(typeKey, existingValues = {}, isEdit = false) {
        const schema = this.state.itemTypes[typeKey] || { label: 'Tipe Tidak Dikenal', icon: 'bi-question-circle', color: '#6c757d', fields: [] };
        const container = document.getElementById('dynamicFieldsContainer');
        if (schema && container) {
            container.innerHTML = FormBuilder.renderFields(schema, existingValues, isEdit);
            
            if (typeKey === 'ssh' && existingValues.host && existingValues.username) {
                const host = existingValues.host;
                const user = existingValues.username;
                const port = existingValues.port ? existingValues.port : '22';
                const sshCmd = `ssh ${user}@${host} -p ${port}`;
                const batContent = `@echo off\ntitle CoderVault SSH: ${user}@${host}\necho Menghubungkan ke ${host}...\n${sshCmd}\npause`;
                
                container.insertAdjacentHTML('beforeend', `
                    <div class="mt-3 mb-2">
                        <label class="form-label small text-muted mb-1">Command</label>
                        <div class="input-group">
                            <input type="text" class="form-control form-control-vault" value="${sshCmd}" readonly style="background-color: var(--bg-dark-edge); color: var(--text-muted); font-family: 'JetBrains Mono', monospace; font-size: 0.85rem;">
                            <a href="data:application/bat;charset=utf-8,${encodeURIComponent(batContent)}" download="ssh_${host}.bat" class="btn btn-outline-secondary border-secondary d-flex align-items-center" title="Unduh script (.bat) untuk membuka CMD">
                                <i class="bi bi-terminal-fill"></i>
                            </a>
                            <button type="button" class="btn btn-outline-secondary border-secondary d-flex align-items-center" onclick="navigator.clipboard.writeText('${sshCmd}'); this.innerHTML='<i class=\\'bi bi-check-lg text-success\\'></i>'; setTimeout(() => this.innerHTML='<i class=\\'bi bi-clipboard\\'></i>', 2000);" title="Salin Perintah SSH">
                                <i class="bi bi-clipboard"></i>
                            </button>
                        </div>
                    </div>
                `);
            }
            
            // Sync Icon
            const iconEl = document.getElementById('modalItemIcon');
            if (iconEl) {
                iconEl.className = `bi ${schema.icon} text-primary`;
                iconEl.style.color = schema.color || '';
            }
        }
    }

    inspectItem(itemId) {
        const targetItem = this.state.items.find(i => i.id === itemId);
        if (targetItem) {
            VaultUI.openItemModal(this, targetItem);
        }
    }

    openTypeSelectionModal() {
        VaultUI.openTypeSelectionModal(this);
    }

    openItemModal(typeOrItem = null) {
        VaultUI.openItemModal(this, typeOrItem);
    }

    openProjectModal(isEdit = false) {
        VaultUI.openProjectModal(this, isEdit);
    }

    async deleteItem() {
        const itemId = document.getElementById('itemFormId').value;
        if (!itemId) return;
        
        const deleteModal = bootstrap.Modal.getOrCreateInstance(document.getElementById('deleteConfirmModal'));
        deleteModal.show();
    }

    async confirmDeleteItem() {
        const itemId = document.getElementById('itemFormId').value;
        const projectId = this.state.activeProject.id;
        
        if (!itemId) return;

        const res = await this.makeRequest('api.php?action=delete_item', {
            method: 'POST',
            body: { project_id: projectId, item_id: itemId }
        });

        if (res && res.success) {
            this.state.items = this.state.items.filter(i => i.id !== itemId);
            bootstrap.Modal.getInstance(document.getElementById('deleteConfirmModal'))?.hide();
            bootstrap.Modal.getInstance(document.getElementById('itemEngineModal'))?.hide();
            VaultUI.renderDashboard(this);
        } else {
            alert('Gagal menghapus item: ' + (res.message || 'Kesalahan tidak diketahui.'));
        }
    }

    async handleItemSubmit(isAutoSave = false) {
        try {
            const form = document.getElementById('itemEngineForm');
            
            // Force flush pending list items if user forgot to click add
            const pendingListInputs = form.querySelectorAll('input[id^="new_list_"]');
            pendingListInputs.forEach(input => {
                if (input.value.trim() !== '') {
                    const fieldId = input.id.replace('new_', '');
                    if (window.FormBuilder) {
                        window.FormBuilder.addListItem(fieldId);
                    }
                }
            });

            const selector = document.getElementById('itemTypeSelector');

        // Collate standard baseline variables alongside dynamic fields
        const itemPayload = {
            id: document.getElementById('itemFormId').value || null,
            type: selector.value,
            title: document.getElementById('itemFormTitle').value,
            description: "",
            tags: "",
            fields: {}
        };

        // Extract custom field configurations
        const customInputs = form.querySelectorAll('[data-field]');
        customInputs.forEach(input => {
            const fieldName = input.getAttribute('data-field');
            if (fieldName) {
                itemPayload.fields[fieldName] = input.value;
            }
        });

        const res = await this.makeRequest('api.php?action=save_item', {
            method: 'POST',
            body: {
                project_id: this.state.activeProject.id,
                item: itemPayload
            }
        });

            if (res && res.success) {
                // If it's a new item auto-saved, grab the generated ID so we don't create duplicates
                if (isAutoSave && res.item && res.item.id) {
                    document.getElementById('itemFormId').value = res.item.id;
                    // Reveal the delete button since the item now exists on the server
                    document.getElementById('itemFormDeleteBtn').classList.remove('d-none');
                }

                if (!isAutoSave) {
                    bootstrap.Modal.getOrCreateInstance(document.getElementById('itemEngineModal'))?.hide();
                    await this.switchProject(this.state.activeProject.id);
                } else {
                    // Update the active project list silently to include the draft without a full reload
                    this.switchProject(this.state.activeProject.id, true);
                    
                    // Show draft saved indicator on modal header
                    const indicator = document.getElementById('autoSaveIndicator');
                    if (indicator) {
                        indicator.innerHTML = '<i class="bi bi-check2-all"></i> Draft saved';
                        setTimeout(() => { indicator.style.opacity = '0'; }, 3000);
                    }
                }
            }
        } catch (err) {
            alert("JS Error in handleItemSubmit:\n" + err.message + "\n" + err.stack);
            console.error(err);
        }
    }

    async handleProjectSubmit() { console.log('handleProjectSubmit called');
        const name = document.getElementById('projectFormName').value;
        const desc = document.getElementById('projectFormDesc').value;
        const color = document.getElementById('projectFormColor').value;
        const icon = document.getElementById('projectFormIcon').value;
        const tags = document.getElementById('projectFormTags')?.value || '';

        let id = document.getElementById('projectFormId')?.value;
        if (!id) {
            id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
        }

        const payload = { id, name, description: desc, color, icon, tags };

        const res = await this.makeRequest('api.php?action=save_item', {
            method: 'POST',
            body: { project_id: id, is_project: true, item: payload }
        });

        if (res) {
            bootstrap.Modal.getOrCreateInstance(document.getElementById('projectModal'))?.hide();
            document.getElementById('projectCreateForm').reset();
            await this.loadWorkspace();
        }
    }

    toggleGlobalSearch() {
        const modalEl = document.getElementById('commandPaletteModal');
        if (modalEl) {
            const input = document.getElementById('globalSearchInput');
            if (input) input.value = '';
            document.getElementById('searchResultsContainer').innerHTML = `
                <div class="p-4 text-center text-muted small">Ketik untuk mulai mencari...</div>
            `;

            const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
            bModal.show();
            modalEl.addEventListener('shown.bs.modal', () => input?.focus(), { once: true });
        }
    }

    executeSearch(query) {
        const container = document.getElementById('searchResultsContainer');
        if (!container) return;

        this.searchMatches = SearchIndex.query(query, this.state);
        SearchIndex.renderResults(container, this.searchMatches);
    }



    showToast(message, variant = "info") {
        console.log(`[Vault Engine Log - ${variant.toUpperCase()}]: ${message}`);
    }
}

// Bind engine core instantiation to document lifecycle loops
document.addEventListener('DOMContentLoaded', () => {
    window.VaultEngine = new ProjectVaultApp();
});
