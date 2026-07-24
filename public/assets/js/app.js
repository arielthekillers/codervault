// public/assets/js/app.js
import { FormBuilder } from './components/FormBuilder.js?v=6';
import { VaultUI } from './components/UI.js?v=8';
import { SearchIndex } from './components/SearchIndex.js?v=10';

class ProjectVaultApp {
    constructor() {
        this.state = {
            activeProject: null,
            projects: [],
            items: [],
            layoutMode: 'modern',
            groupByType: false
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

    async toggleGlobalTheme() {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.documentElement.setAttribute('data-bs-theme', newTheme);
        
        const btnIcon = document.querySelector('#themeToggleBtn i');
        if (btnIcon) {
            btnIcon.className = newTheme === 'light' ? 'bi bi-sun' : 'bi bi-moon-stars';
        }
        
        // Update settings modal radio if it's open
        const radio = document.querySelector(`input[name="themeRadios"][value="${newTheme}"]`);
        if (radio) radio.checked = true;
        
        await this.makeRequest('api.php?action=update_config', {
            method: 'POST',
            body: { theme: newTheme }
        });
        
        this.showToast('Tema diperbarui', 'success');
    }

    initEventListeners() {
        // Universal Shortcut Binding Matrix: Shift + F
        window.addEventListener('keydown', (e) => {
            if (e.shiftKey && e.key.toLowerCase() === 'f' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.toggleGlobalSearch();
            }
            
            if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
                this.toggleGlobalSearch();
            }
        });

        // Block Firefox Quick Find which is triggered on keypress
        window.addEventListener('keypress', (e) => {
            if (e.key === '/' && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
                e.preventDefault();
            }
        });

        // QR Code Paste Handler
        document.body.addEventListener('paste', (e) => {
            const items = (e.clipboardData || e.originalEvent.clipboardData).items;
            let foundImage = false;
            for (let index in items) {
                const item = items[index];
                if (item.kind === 'file' && item.type.startsWith('image/')) {
                    foundImage = true;
                    const blob = item.getAsFile();
                    const reader = new FileReader();
                    reader.onload = (event) => {
                        const img = new Image();
                        img.onload = () => {
                            const canvas = document.createElement('canvas');
                            canvas.width = img.width;
                            canvas.height = img.height;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, img.width, img.height);
                            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                            if (window.jsQR) {
                                const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                                    inversionAttempts: "dontInvert",
                                });
                                if (code && code.data) {
                                    try {
                                        if (code.data.startsWith('otpauth-migration://offline')) {
                                            bootstrap.Modal.getInstance(document.getElementById('itemEngineModal'))?.hide();
                                            this.handleGoogleAuthMigration(code.data);
                                            return;
                                        }

                                        const itemTypeSelector = document.getElementById('itemTypeSelector');
                                        if (itemTypeSelector && itemTypeSelector.value === 'totp') {
                                            const urlObj = new URL(code.data);
                                            const secret = urlObj.searchParams.get('secret');
                                            
                                            if (secret) {
                                                const secretInput = document.querySelector('input[data-field="secret"]');
                                                if (secretInput) {
                                                    secretInput.value = secret;
                                                    
                                                    let label = decodeURIComponent(urlObj.pathname.replace(new RegExp('^/+'), ''));
                                                    const issuer = urlObj.searchParams.get('issuer');
                                                    
                                                    if (label) {
                                                        label = label.replace(':', ': ');
                                                    } else if (issuer) {
                                                        label = issuer;
                                                    }
                                                    
                                                    let finalLabel = label || '2FA Account';
                                                    const titleInput = document.getElementById('itemFormTitle');
                                                    if (titleInput && (!titleInput.value || titleInput.value === '')) {
                                                        titleInput.value = finalLabel;
                                                    } else if (titleInput && titleInput.value) {
                                                        finalLabel = titleInput.value;
                                                    }

                                                    let isOverwriting = false;
                                                    if (this.state && this.state.items) {
                                                        const existing = this.state.items.find(i => i.type === 'totp' && i.title === finalLabel);
                                                        if (existing) {
                                                            const idInput = document.getElementById('itemFormId');
                                                            if (idInput) {
                                                                idInput.value = existing.id;
                                                                isOverwriting = true;
                                                            }
                                                        }
                                                    }

                                                    if (isOverwriting) {
                                                        this.showToast(`Kode QR terbaca. Data 2FA "${finalLabel}" akan ditimpa!`, "info");
                                                    } else {
                                                        this.showToast("QR Code berhasil terbaca! Secret Key dan Label telah diisi otomatis.", "success");
                                                    }
                                                } else {
                                                    this.showToast("Gagal menemukan kolom Secret Key pada form.", "warning");
                                                }
                                            } else {
                                                this.showToast("QR Code terbaca, tetapi tidak memiliki parameter Secret Key TOTP.", "warning");
                                            }
                                        }
                                    } catch(err) {
                                        this.showToast("Bukan format QR Code 2FA (otpauth) yang valid.", "warning");
                                    }
                                    } else {
                                        this.showToast("Tidak ada QR Code yang terdeteksi pada gambar tersebut.", "warning");
                                    }
                                }
                            };
                            img.src = event.target.result;
                        };
                        reader.readAsDataURL(blob);
                        break;
                    }
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

        // Search Keyboard Navigation Hook
        document.body.addEventListener('keydown', (e) => {
            if (e.target && e.target.id === 'globalSearchInput') {
                const results = document.querySelectorAll('.search-result-item');
                if (results.length === 0) return;

                let currentIndex = -1;
                results.forEach((el, idx) => {
                    if (el.classList.contains('active-search-item')) {
                        currentIndex = idx;
                    }
                });

                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (currentIndex < results.length - 1) {
                        if (currentIndex >= 0) results[currentIndex].classList.remove('active-search-item', 'bg-secondary', 'bg-opacity-25');
                        currentIndex++;
                        results[currentIndex].classList.add('active-search-item', 'bg-secondary', 'bg-opacity-25');
                        results[currentIndex].scrollIntoView({ block: 'nearest' });
                    }
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (currentIndex > 0) {
                        results[currentIndex].classList.remove('active-search-item', 'bg-secondary', 'bg-opacity-25');
                        currentIndex--;
                        results[currentIndex].classList.add('active-search-item', 'bg-secondary', 'bg-opacity-25');
                        results[currentIndex].scrollIntoView({ block: 'nearest' });
                    }
                } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (currentIndex === -1) currentIndex = 0;
                    if (results[currentIndex]) {
                        results[currentIndex].click();
                    }
                }
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
        
        // Settings Event Listeners
        const settingsTimeoutSelect = document.getElementById('settingsTimeoutSelect');
        if (settingsTimeoutSelect) {
            settingsTimeoutSelect.addEventListener('change', async (e) => {
                const newTimeout = parseInt(e.target.value);
                this.state.idleTimeout = newTimeout;
                await this.makeRequest('api.php?action=update_config', {
                    method: 'POST',
                    body: { idle_timeout: newTimeout }
                });
                VaultUI.showToast('Durasi Kunci Otomatis berhasil diperbarui.', 'success');
            });
        }

        const themeRadios = document.querySelectorAll('input[name="themeRadios"]');
        if (themeRadios) {
            themeRadios.forEach(radio => {
                radio.addEventListener('change', async (e) => {
                    const newTheme = e.target.value;
                    document.documentElement.setAttribute('data-bs-theme', newTheme);
                    
                    const btnIcon = document.querySelector('#themeToggleBtn i');
                    if (btnIcon) {
                        btnIcon.className = newTheme === 'light' ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
                    }
                    
                    await this.makeRequest('api.php?action=update_config', {
                        method: 'POST',
                        body: { theme: newTheme }
                    });
                });
            });
        }

        const changePinForm = document.getElementById('changePinForm');
        if (changePinForm) {
            changePinForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const oldPin = document.getElementById('oldPinInput').value;
                const newPin = document.getElementById('newPinInput').value;
                const confirmPin = document.getElementById('confirmNewPinInput').value;
                
                if (newPin !== confirmPin) {
                    VaultUI.showToast('PIN baru dan konfirmasi tidak cocok.', 'danger');
                    return;
                }
                
                const btn = document.getElementById('changePinBtn');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menyimpan...';
                
                const res = await this.makeRequest('api.php?action=change_pin', {
                    method: 'POST',
                    body: { old_pin: oldPin, new_pin: newPin }
                });
                
                if (res && res.success) {
                    VaultUI.showToast('PIN Master berhasil diubah!', 'success');
                    changePinForm.reset();
                }
                
                btn.disabled = false;
                btn.innerHTML = 'Ubah PIN Sekarang';
            });
        }
        
        const regenerateSharingCodeBtn = document.getElementById('regenerateSharingCodeBtn');
        if (regenerateSharingCodeBtn) {
            regenerateSharingCodeBtn.addEventListener('click', async () => {
                regenerateSharingCodeBtn.disabled = true;
                regenerateSharingCodeBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
                const res = await this.makeRequest('api.php?action=generate_sharing_code');
                if (res && res.success) {
                    document.getElementById('settingsSharingCodeDisplay').textContent = res.sharing_code;
                    this.showToast('Sharing Code berhasil diperbarui.', 'success');
                }
                regenerateSharingCodeBtn.disabled = false;
                regenerateSharingCodeBtn.innerHTML = '<i class="bi bi-arrow-repeat"></i> Regenerate';
            });
        }

        const copySharingCodeBtn = document.getElementById('copySharingCodeBtn');
        if (copySharingCodeBtn) {
            copySharingCodeBtn.addEventListener('click', () => {
                const code = document.getElementById('settingsSharingCodeDisplay').textContent.trim();
                if (code && code !== '------') {
                    navigator.clipboard.writeText(code);
                    copySharingCodeBtn.innerHTML = '<i class="bi bi-check-lg text-success"></i>';
                    setTimeout(() => copySharingCodeBtn.innerHTML = '<i class="bi bi-clipboard"></i>', 2000);
                }
            });
        }
        
        const restoreBackupForm = document.getElementById('restoreBackupForm');
        if (restoreBackupForm) {
            restoreBackupForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const fileInput = document.getElementById('backupZipInput');
                if (!fileInput.files.length) return;

                this.confirmAction(
                    'Restore Sistem?',
                    'PERINGATAN KERAS! Anda yakin ingin menghapus semua data saat ini dan menggantinya dengan backup ini?',
                    'Restore Sekarang',
                    async () => {
                        const btn = document.getElementById('restoreBackupBtn');
                        btn.disabled = true;
                        btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Mereset...';

                        const formData = new FormData();
                        formData.append('backup_zip', fileInput.files[0]);

                        try {
                            const response = await fetch('api.php?action=restore_backup', {
                                method: 'POST',
                                body: formData
                            });
                            const res = await response.json();
                            
                            if (res.success) {
                                this.showToast('Sistem berhasil di-restore! Memuat ulang...', 'success');
                                setTimeout(() => window.location.reload(), 1500);
                            } else {
                                this.showToast(res.message || 'Gagal restore backup.', 'danger');
                            }
                        } catch (err) {
                            this.showToast('Terjadi kesalahan jaringan.', 'danger');
                        }

                        btn.disabled = false;
                        btn.innerHTML = 'Restore Sekarang';
                    }
                );
            });

        }
        
        const importShareForm = document.getElementById('importShareForm');
        const importShareModalEl = document.getElementById('importShareModal');
        
        if (importShareModalEl) {
            importShareModalEl.addEventListener('shown.bs.modal', () => {
                document.getElementById('importSharingCode').focus();
            });
            importShareModalEl.addEventListener('hidden.bs.modal', () => {
                if (importShareForm) importShareForm.reset();
            });
        }

        if (importShareForm) {
            importShareForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const codeInput = document.getElementById('importSharingCode').value;
                const fileInput = document.getElementById('importShareFile');
                if (!fileInput.files.length) return;

                const btn = document.getElementById('importShareBtn');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Mengimpor...';

                const formData = new FormData();
                formData.append('sharing_code', codeInput);
                formData.append('share_file', fileInput.files[0]);
                if (this.state.activeProject) {
                    formData.append('project_id', this.state.activeProject.id);
                }

                try {
                    const response = await fetch('api.php?action=import_share', {
                        method: 'POST',
                        body: formData
                    });
                    const res = await response.json();
                    
                    if (res.success) {
                        this.showToast(res.message, 'success');
                        bootstrap.Modal.getInstance(document.getElementById('importShareModal'))?.hide();
                        importShareForm.reset();
                        if (this.state.activeProject) {
                            this.switchProject(this.state.activeProject.id);
                        } else {
                            this.fetchProjects(); // Reload data
                        }
                    } else {
                        this.showToast(res.message || 'Gagal mengimpor data.', 'danger');
                    }
                } catch (err) {
                    this.showToast('Terjadi kesalahan jaringan.', 'danger');
                }

                btn.disabled = false;
                btn.innerHTML = 'Import Sekarang';
            });
        }
        
        this.setupAutoSave();
        this.setupInactivityLock();
        this.setupTOTPUpdater();
    }

    setupTOTPUpdater() {
        setInterval(() => {
            if (!this.isUnlocked || !window.OTPAuth) return;
            const totpContainers = document.querySelectorAll('.totp-container');
            if (totpContainers.length === 0) return;
            
            const epoch = Math.floor(Date.now() / 1000);
            const period = 30;
            const remaining = period - (epoch % period);
            const progressPercent = (remaining / period) * 100;
            
            totpContainers.forEach(container => {
                const secret = container.getAttribute('data-secret');
                if (!secret) return;
                
                try {
                    const totp = new window.OTPAuth.TOTP({
                        algorithm: 'SHA1',
                        digits: 6,
                        period: 30,
                        secret: window.OTPAuth.Secret.fromBase32(secret)
                    });
                    
                    const code = totp.generate();
                    const codeEl = container.querySelector('.totp-code');
                    const progressEl = container.querySelector('.totp-progress');
                    
                    if (codeEl) {
                        codeEl.innerText = `${code.slice(0,3)} ${code.slice(3)}`;
                    }
                    
                    const ringEl = container.querySelector('.totp-ring');
                    if (ringEl) {
                        const dashoffset = 62.8 - ((remaining / period) * 62.8);
                        ringEl.style.strokeDashoffset = dashoffset;
                        
                        if (remaining <= 5) {
                            ringEl.classList.remove('text-info', 'text-warning');
                            ringEl.classList.add('text-danger');
                        } else if (remaining <= 10) {
                            ringEl.classList.remove('text-info', 'text-danger');
                            ringEl.classList.add('text-warning');
                        } else {
                            ringEl.classList.remove('text-warning', 'text-danger');
                            ringEl.classList.add('text-info');
                        }
                    }
                } catch(e) {
                    // Ignore errors silently
                }
            });
        }, 1000);
    }

    setupInactivityLock() {
        let inactivityTimer;

        const resetTimer = () => {
            clearTimeout(inactivityTimer);
            if (this.isUnlocked && !this.state.mustChangePin) {
                // Read from state, default to 10s if not loaded yet
                const lockTime = (this.state.idleTimeout || 10) * 1000;
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

        // Heartbeat to keep backend session aligned with frontend activity
        // This prevents the backend's strict idle timeout from triggering prematurely 
        // while the user is actively typing or navigating via keyboard (which resets frontend timer but doesn't make API calls).
        setInterval(() => {
            if (this.isUnlocked && !this.state.mustChangePin) {
                // Send a silent ping to bump LAST_ACTIVITY on the server
                fetch('api.php?action=check_status').catch(() => null);
            }
        }, 4000); // Ping every 4 seconds (must be less than the 10s timeout)

        // Start timer initially
        resetTimer();
    }

    async checkAuthStatus() {
        const data = await this.makeRequest('api.php?action=check_status');
        if (!data) return;
        
        if (data.idle_timeout) {
            this.state.idleTimeout = data.idle_timeout;
        }
        
        if (data.layout_mode) {
            this.state.layoutMode = data.layout_mode;
        }

        if (data.locked) {
            this.renderLockScreen(data.setup_required);
        } else {
            this.loadWorkspace();
        }
    }

    async logout() {
        // Synchronously force-hide all modals and clean up backdrops to prevent focus traps
        document.querySelectorAll('.modal').forEach(m => {
            try {
                const inst = bootstrap.Modal.getInstance(m);
                if (inst) inst.dispose();
            } catch (e) {}
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
                if (res.idle_timeout) {
                    this.state.idleTimeout = res.idle_timeout;
                }
                
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

    async fetchProjects() {
        const res = await this.makeRequest('api.php?action=get_projects');
        const aggRes = await this.makeRequest('api.php?action=get_dashboard_aggregates');
        
        if (res && res.success) {
            this.state.projects = res.projects;
            if (aggRes && aggRes.success) {
                this.state.aggregates = { reminders: aggRes.reminders, bookmarks: aggRes.bookmarks };
                VaultUI.renderGlobalBookmarks(this);
            }
            if (!this.state.activeProject) {
                VaultUI.renderProjectList(this);
            }
        }
    }

    async loadWorkspace() {
        this.isUnlocked = true;
        // Hydrate Dynamic Configuration Type Schemas
        this.state.itemTypes = await fetch('config/item-types.json?v=' + Date.now()).then(r => r.json());

        const res = await this.makeRequest('api.php?action=get_projects');
        const aggRes = await this.makeRequest('api.php?action=get_dashboard_aggregates');
        
        if (res && res.success) {
            this.state.projects = res.projects;
            if (aggRes && aggRes.success) {
                this.state.aggregates = { reminders: aggRes.reminders, bookmarks: aggRes.bookmarks };
            }

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
                                <div class="dropdown">
                                    <button class="btn btn-sm rounded-circle shadow-sm d-flex justify-content-center align-items-center vault-icon-btn" style="width: 36px; height: 36px; background-color: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); transition: border-color 0.15s ease;" data-bs-toggle="dropdown" aria-expanded="false" title="Bookmarks">
                                        <i class="bi bi-bookmark-star"></i>
                                    </button>
                                    <ul class="dropdown-menu dropdown-menu-end shadow-lg" style="background-color: var(--bg-card); border: 1px solid var(--border-color);" id="globalBookmarkMenu">
                                        <li><span class="dropdown-item-text text-muted small">Loading bookmarks...</span></li>
                                    </ul>
                                </div>
                                <button class="btn btn-sm rounded-circle shadow-sm d-flex justify-content-center align-items-center vault-icon-btn" style="width: 36px; height: 36px; background-color: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); transition: border-color 0.15s ease;" onclick="bootstrap.Modal.getOrCreateInstance(document.getElementById('importShareModal')).show()" title="Import Data (.cvshare)">
                                    <i class="bi bi-box-arrow-in-down"></i>
                                </button>
                                <button class="btn btn-sm rounded-circle shadow-sm d-flex justify-content-center align-items-center vault-icon-btn" style="width: 36px; height: 36px; background-color: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); transition: border-color 0.15s ease;" onclick="VaultEngine.openSettings()" title="Pengaturan Sistem">
                                    <i class="bi bi-gear"></i>
                                </button>
                                <button class="btn btn-sm rounded-circle shadow-sm d-flex justify-content-center align-items-center vault-icon-btn" style="width: 36px; height: 36px; background-color: var(--bg-card); border: 1px solid var(--border-color); color: var(--text-primary); transition: border-color 0.15s ease;" onclick="VaultEngine.toggleGlobalSearch()" title="Cari / Eksekusi (Shift+F)">
                                    <i class="bi bi-magic"></i>
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

            VaultUI.renderGlobalBookmarks(this);

            document.getElementById('logoutBtn')?.addEventListener('click', () => this.logout());
            
            const themeBtn = document.getElementById('themeToggleBtn');
            const themeIcon = themeBtn.querySelector('i');
            
            // Sync initial theme icon
            if (document.documentElement.getAttribute('data-bs-theme') === 'light') {
                themeIcon.classList.replace('bi-moon-stars', 'bi-sun');
            }

            themeBtn?.addEventListener('click', () => {
                VaultEngine.toggleGlobalTheme();
            });

            this.state.activeProject = null;
            VaultUI.renderProjectList(this);
            VaultUI.renderGlobalBookmarks(this);
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

    toggleLayoutMode() {
        this.state.layoutMode = this.state.layoutMode === 'modern' ? 'compact' : 'modern';
        this.makeRequest('api.php?action=update_config', { method: 'POST', body: { layout_mode: this.state.layoutMode } });
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

    async openSettings() {
        const res = await this.makeRequest('api.php?action=get_config');
        if (res && res.success && res.config) {
            this.state.idleTimeout = res.config.idle_timeout;
            document.getElementById('settingsTimeoutSelect').value = res.config.idle_timeout;
            
            const theme = res.config.theme || 'dark';
            if (theme === 'light') {
                document.getElementById('themeRadioLight').checked = true;
            } else {
                document.getElementById('themeRadioDark').checked = true;
            }
            
            const shareRes = await this.makeRequest('api.php?action=get_sharing_code');
            if (shareRes && shareRes.success && shareRes.sharing_code) {
                document.getElementById('settingsSharingCodeDisplay').textContent = shareRes.sharing_code;
            } else {
                document.getElementById('settingsSharingCodeDisplay').textContent = '------';
            }
            
            bootstrap.Modal.getOrCreateInstance(document.getElementById('settingsModal')).show();
        }
    }

    downloadBackup() {
        window.location.href = 'api.php?action=download_backup';
    }

    async deleteItem() {
        const itemId = document.getElementById('itemFormId').value;
        if (!itemId) return;
        
        this.confirmAction(
            'Hapus Item?',
            'Item yang dihapus tidak dapat dikembalikan lagi. Yakin ingin melanjutkan?',
            'Hapus',
            () => this.confirmDeleteItem()
        );
    }

    async exportShare(itemId = null) {
        if (!this.state.activeProject) return;
        const projectId = this.state.activeProject.id;
        
        const res = await this.makeRequest('api.php?action=export_share', {
            method: 'POST',
            body: { project_id: projectId, item_id: itemId }
        });
        
        if (res && res.success) {
            // Initiate download
            const blob = new Blob([res.payload], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = (itemId ? itemId : projectId) + '.cvshare';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            this.showToast('Data berhasil diekspor dengan aman!', 'success');
        } else {
            this.showToast(res ? res.message : 'Gagal mengekspor data.', 'danger');
            if (res && res.message && res.message.includes('Sharing Code')) {
                this.openSettings();
            }
        }
    }

    async deleteProject() {
        if (!this.state.activeProject) return;
        const projectId = this.state.activeProject.id;
          this.confirmAction(
            'Hapus Workspace?',
            `Apakah Anda yakin ingin menghapus Workspace "${this.state.activeProject.name}" secara permanen beserta semua item di dalamnya?`,
            'Hapus Permanen',
            async () => {
                const btn = document.getElementById('projectFormDeleteBtn');
                btn.disabled = true;
                btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Menghapus...';

                const res = await this.makeRequest('api.php?action=delete_project', {
                    method: 'POST',
                    body: { project_id: this.state.activeProject.id }
                });

                if (res && res.success) {
                    this.showToast('Workspace berhasil dihapus!', 'success');
                    bootstrap.Modal.getInstance(document.getElementById('projectModal'))?.hide();
                    bootstrap.Modal.getInstance(document.getElementById('genericConfirmModal'))?.hide();
                    this.closeProject();
                    this.fetchProjects(); // Refresh the list
                } else {
                    this.showToast(res ? res.message : 'Gagal menghapus Workspace.', 'danger');
                    if (btn) {
                        btn.disabled = false;
                        btn.innerHTML = '<i class="bi bi-trash"></i> Remove';
                    }
                }
            }
        );       }

    confirmAction(title, desc, confirmBtnText, callback) {
        document.getElementById('genericConfirmTitle').innerText = title;
        document.getElementById('genericConfirmDesc').innerText = desc;
        
        const actionBtn = document.getElementById('genericConfirmActionBtn');
        actionBtn.innerText = confirmBtnText;
        
        // Remove existing listeners by cloning
        const newActionBtn = actionBtn.cloneNode(true);
        actionBtn.parentNode.replaceChild(newActionBtn, actionBtn);
        
        newActionBtn.addEventListener('click', () => {
            callback();
        });
        
        bootstrap.Modal.getOrCreateInstance(document.getElementById('genericConfirmModal')).show();
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
            bootstrap.Modal.getInstance(document.getElementById('genericConfirmModal'))?.hide();
            bootstrap.Modal.getInstance(document.getElementById('itemEngineModal'))?.hide();
            await this.fetchProjects();
            VaultUI.renderDashboard(this);
        } else {
            alert('Gagal menghapus item: ' + (res.message || 'Kesalahan tidak diketahui.'));
        }
    }

    async moveItem(itemId, oldProjectId, newProjectId) {
        if (!itemId || !oldProjectId || !newProjectId || oldProjectId === newProjectId) return;
        
        const res = await this.makeRequest('api.php?action=move_item', {
            method: 'POST',
            body: { item_id: itemId, old_project_id: oldProjectId, new_project_id: newProjectId }
        });

        if (res && res.success) {
            this.showToast('Item berhasil dipindahkan!', 'success');
            // Refresh projects and active project
            await this.fetchProjects();
            if (this.state.activeProject && this.state.activeProject.id === oldProjectId) {
                await this.switchProject(oldProjectId);
            }
        } else {
            this.showToast('Gagal memindahkan item: ' + (res?.message || ''), 'danger');
        }
    }

    async handleItemSubmit(isAutoSave = false) {
        if (this.isSavingItem) return;
        this.isSavingItem = true;

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
                if (input.type === 'checkbox') {
                    itemPayload.fields[fieldName] = input.checked;
                } else {
                    itemPayload.fields[fieldName] = input.value;
                }
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
                    this.showToast('Item berhasil disimpan!', 'success');
                    this.fetchProjects(); // Background update aggregates and projects
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
        } finally {
            this.isSavingItem = false;
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
            this.showToast('Workspace berhasil disimpan!', 'success');
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

    handleGoogleAuthMigration(uri) {
        try {
            const url = new URL(uri);
            const dataParam = url.searchParams.get('data');
            if (!dataParam) throw new Error("Parameter data tidak ditemukan");
            
            // Base64 decode
            const base64Str = dataParam.replace(/-/g, '+').replace(/_/g, '/');
            const rawStr = atob(base64Str);
            const buffer = new Uint8Array(rawStr.length);
            for (let i = 0; i < rawStr.length; i++) buffer[i] = rawStr.charCodeAt(i);

            const decodeVarint = (buf, offset) => {
                let result = 0;
                let shift = 0;
                while (true) {
                    if (offset >= buf.length) break;
                    let b = buf[offset++];
                    result |= (b & 0x7f) << shift;
                    if (!(b & 0x80)) return { value: result, offset: offset };
                    shift += 7;
                }
                return { value: result, offset: offset };
            };

            const encodeBase32 = (bytes) => {
                const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
                let bits = 0, value = 0, output = "";
                for (let i = 0; i < bytes.length; i++) {
                    value = (value << 8) | bytes[i];
                    bits += 8;
                    while (bits >= 5) {
                        output += alphabet[(value >>> (bits - 5)) & 31];
                        bits -= 5;
                    }
                }
                if (bits > 0) output += alphabet[(value << (5 - bits)) & 31];
                return output;
            };

            const accounts = [];
            let offset = 0;
            
            while (offset < buffer.length) {
                const { value: tagAndType, offset: off1 } = decodeVarint(buffer, offset);
                offset = off1;
                const tag = tagAndType >> 3;
                const type = tagAndType & 7;

                if (tag === 1 && type === 2) {
                    const { value: length, offset: off2 } = decodeVarint(buffer, offset);
                    offset = off2;
                    const end = offset + length;
                    
                    let secretBytes = [];
                    let name = "", issuer = "";
                    
                    while (offset < end) {
                        const { value: inTagType, offset: inOff1 } = decodeVarint(buffer, offset);
                        offset = inOff1;
                        const inTag = inTagType >> 3;
                        const inType = inTagType & 7;
                        
                        if (inType === 2) {
                            const { value: inLen, offset: inOff2 } = decodeVarint(buffer, offset);
                            offset = inOff2;
                            const slice = buffer.slice(offset, offset + inLen);
                            
                            if (inTag === 1) secretBytes = Array.from(slice);
                            if (inTag === 2) name = new TextDecoder().decode(slice);
                            if (inTag === 3) issuer = new TextDecoder().decode(slice);
                            offset += inLen;
                        } else if (inType === 0) {
                            offset = decodeVarint(buffer, offset).offset;
                        } else {
                            break; // Failsafe
                        }
                    }
                    
                    if (secretBytes.length > 0) {
                        let finalLabel = name;
                        if (issuer && !name.includes(issuer)) finalLabel = `${issuer}: ${name}`;
                        if (finalLabel.includes('Google:')) finalLabel = finalLabel.replace('Google:', 'Google: ');
                        accounts.push({ label: finalLabel, secret: encodeBase32(secretBytes) });
                    }
                } else {
                    if (type === 0) offset = decodeVarint(buffer, offset).offset;
                    else if (type === 2) {
                        const { value: len, offset: off2 } = decodeVarint(buffer, offset);
                        offset = off2 + len;
                    } else if (type === 1) offset += 8;
                    else if (type === 5) offset += 4;
                    else break; // Unknown wire type, exit to prevent infinite loop
                }
            }

            if (accounts.length === 0) {
                this.showToast("Tidak ada akun yang bisa diekstrak dari QR tersebut.", "warning");
                return;
            }

            VaultUI.showGoogleAuthImportModal(this, accounts);

        } catch (err) {
            console.error(err);
            this.showToast("Gagal membongkar QR Code Google Authenticator.", "danger");
        }
    }

    async checkSystemUpdate() {
        this.showToast('Memeriksa pembaruan...', 'info');
        const res = await this.makeRequest('api.php?action=check_update');
        if (res && res.success) {
            if (res.update_available) {
                // Tampilkan modal pembaruan
                let modalEl = document.getElementById('updateSystemModal');
                if (!modalEl) {
                    const html = `
                    <div class="modal fade" id="updateSystemModal" tabindex="-1">
                        <div class="modal-dialog modal-dialog-centered">
                            <div class="modal-content border-0 shadow-lg" style="background-color: var(--bg-card);">
                                <div class="modal-header border-bottom border-secondary">
                                    <h5 class="modal-title text-primary"><i class="bi bi-cloud-arrow-down me-2"></i>Pembaruan Tersedia</h5>
                                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal"></button>
                                </div>
                                <div class="modal-body text-center py-4">
                                    <div id="updateStatusText" class="mb-4" style="color: var(--text-primary);">
                                        <p class="mb-1">${res.message}</p>
                                        <small class="text-muted">Metode instalasi: ${res.is_git ? 'Git' : 'ZIP'}</small>
                                    </div>
                                    <button type="button" id="executeUpdateBtn" class="btn btn-primary px-4 py-2" onclick="VaultEngine.executeSystemUpdate('${res.latest_sha || ''}')">
                                        <i class="bi bi-download me-2"></i>Download & Pasang Otomatis
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>`;
                    document.body.insertAdjacentHTML('beforeend', html);
                    modalEl = document.getElementById('updateSystemModal');
                } else {
                    document.getElementById('updateStatusText').innerHTML = `
                        <p class="mb-1">${res.message}</p>
                        <small class="text-muted">Metode instalasi: ${res.is_git ? 'Git' : 'ZIP'}</small>
                    `;
                    document.getElementById('executeUpdateBtn').setAttribute('onclick', `VaultEngine.executeSystemUpdate('${res.latest_sha || ''}')`);
                }
                const bModal = bootstrap.Modal.getOrCreateInstance(modalEl);
                bModal.show();
            } else {
                this.showToast(res.message, 'success');
            }
        }
    }

    async executeSystemUpdate(latestSha = '') {
        const btn = document.getElementById('executeUpdateBtn');
        if (btn) {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>Memasang...';
        }
        const res = await this.makeRequest('api.php?action=do_update', {
            method: 'POST',
            body: { latest_sha: latestSha }
        });
        
        if (res && res.success) {
            this.showToast(res.message + ' Memuat ulang aplikasi...', 'success');
            setTimeout(() => {
                window.location.reload(true);
            }, 1500);
        } else {
            this.showToast(res?.message || 'Gagal memperbarui aplikasi.', 'danger');
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="bi bi-download me-2"></i>Download & Pasang Otomatis';
            }
        }
    }

    showToast(message, variant = "info") {
        let container = document.getElementById('vaultToastContainer');
        if (!container) {
            container = document.createElement('div');
            container.id = 'vaultToastContainer';
            container.className = 'toast-container position-fixed bottom-0 end-0 p-4';
            container.style.zIndex = '1070';
            document.body.appendChild(container);
        }

        const iconMap = {
            'success': 'bi-check-circle-fill text-success',
            'danger': 'bi-x-octagon-fill text-danger',
            'warning': 'bi-exclamation-triangle-fill text-warning',
            'info': 'bi-info-circle-fill text-info'
        };

        const toastEl = document.createElement('div');
        // Custom styling for premium feel
        toastEl.className = `toast align-items-center border-0 shadow-lg mb-3`;
        toastEl.style.backgroundColor = 'var(--bg-card)';
        toastEl.style.borderLeft = `4px solid var(--bs-${variant})`;
        toastEl.style.borderRadius = '0.5rem';
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        
        toastEl.innerHTML = `
            <div class="d-flex p-1">
                <div class="toast-body d-flex align-items-center fw-medium flex-grow-1" style="color: var(--text-primary); font-size: 0.95rem;">
                    <i class="bi ${iconMap[variant] || iconMap.info} fs-5 me-3"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close shadow-none me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;

        container.appendChild(toastEl);
        const bsToast = new bootstrap.Toast(toastEl, { delay: 3500 });
        bsToast.show();

        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
}

// Bind engine core instantiation to document lifecycle loops
document.addEventListener('DOMContentLoaded', () => {
    window.VaultEngine = new ProjectVaultApp();
});
