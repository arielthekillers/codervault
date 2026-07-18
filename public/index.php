<?php
// public/index.php
require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();

session_start();

// Determine base theme profile before sending content to minimize UI flashes
$active_theme = $_SESSION['config']['theme'] ?? 'dark';
$configFile = __DIR__ . '/../config/config.json';
if (!isset($_SESSION['config']['theme']) && file_exists($configFile)) {
    $rawConfig = json_decode(file_get_contents($configFile), true);
    if (isset($rawConfig['theme'])) {
        $active_theme = $rawConfig['theme'];
    }
}
?>
<!DOCTYPE html>
<html lang="en" data-bs-theme="<?php echo htmlspecialchars($active_theme); ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CoderVault — Ruang Kerja</title>
    
    <!-- Design Dependencies: Bootstrap 5, Icons, and Inter Typography -->
    <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet">
    <link href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" rel="stylesheet">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <link href="assets/css/theme.css" rel="stylesheet">
</head>
<body>

    <!-- Target Mount for Core Application Controller Initialization State -->
    <div id="appShell">
        <div class="d-flex justify-content-center align-items-center vh-100 bg-app text-secondary">
            <div class="text-center">
                <div class="spinner-border spinner-border-sm text-primary mb-3" role="status"></div>
                <div class="small tracking-wider text-uppercase">Memulai Mesin Inti...</div>
            </div>
        </div>
    </div>

    <!-- ========================================================== -->
    <!-- MODAL ARCHITECTURES (REUSED INLINE VIA JS ENGINE)          -->
    <!-- ========================================================== -->

    <!-- 1. Global Command Palette Modal (Ctrl + K) -->
    <div class="modal fade" id="commandPaletteModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content bg-card shadow-lg overflow-hidden" style="border: 1px solid var(--border-color);">
                <div class="p-3 d-flex align-items-center">
                    <i class="bi bi-magic text-primary me-3 fs-4"></i>
                    <input type="text" id="globalSearchInput" class="form-control form-control-vault border-0 bg-transparent fs-5 p-0 shadow-none" style="color: var(--text-primary);" placeholder="Ketik perintah Magic Launcher, atau cari data..." autocomplete="off">
                    <span class="badge ms-2" style="background-color: var(--bg-dark-edge); color: var(--text-muted); border: 1px solid var(--border-color);">ESC</span>
                </div>
                <div class="modal-body p-0" id="searchResultsContainer" style="max-height: 450px;">
                    <div class="p-4 text-center text-muted small">
                        Ketik untuk mulai menggunakan Magic Launcher...
                    </div>
                </div>
                <div class="modal-footer p-2 bg-dark-edge border-0 d-flex justify-content-between text-muted small">
                    <div>
                        <span class="me-2"><kbd style="background-color: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border-color);">↑↓</kbd> Navigasi</span>
                        <span><kbd style="background-color: var(--bg-card); color: var(--text-muted); border: 1px solid var(--border-color);">↵</kbd> Pilih</span>
                    </div>
                    <div>Magic Launcher</div>
                </div>
            </div>
        </div>
    </div>

    <!-- 2. Type Selection Modal -->
    <div class="modal fade" id="itemTypeSelectionModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-card shadow-lg" style="border: 1px solid var(--border-color);">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fs-6 fw-semibold" style="color: var(--text-primary)">Pilih Tipe Item</h5>
                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Tutup"></button>
                </div>
                <div class="modal-body p-4" id="itemTypeSelectionContainer">
                    <!-- Populated dynamically via JS -->
                </div>
            </div>
        </div>
    </div>

    <!-- 3. Dynamic Generic Item Engine Modal (Create / Edit) -->
    <div class="modal fade" id="itemEngineModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered modal-lg">
            <div class="modal-content bg-card shadow-lg" style="border: 1px solid var(--border-color);">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fs-6 fw-semibold d-flex align-items-center gap-3" style="color: var(--text-primary)">
                        <span id="itemModalLabel">Konfigurasi Item Keamanan</span>
                        <span id="autoSaveIndicator" class="badge rounded-pill fw-normal" style="font-size: 0.7rem; background-color: var(--bg-dark-edge); color: var(--text-muted); opacity: 0; transition: opacity 0.3s ease;"><i class="bi bi-check2-all"></i> Draft saved</span>
                    </h5>
                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Tutup"></button>
                </div>
                <!-- Converted form to div to neuter browser autofill heuristics -->
                <div id="itemEngineForm">
                    <div class="modal-body p-4">
                        <input type="hidden" id="itemFormId">
                        <input type="hidden" id="itemFormProject">
                        <input type="hidden" id="itemTypeSelector">
                        
                        <!-- Base Structural Metadata Field Configuration -->
                        <div class="mb-3">
                            <label class="form-label small text-muted mb-1">Label</label>
                            <input type="text" id="itemFormTitle" class="form-control form-control-vault" required>
                        </div>

                        <!-- Dynamic Field Injections Container Block (Handled by FormBuilder.js) -->
                        <div id="dynamicFieldsContainer" class="mb-3"></div>
                    </div>
                    <div class="modal-footer border-0 pt-0 d-flex justify-content-between align-items-center">
                        <button type="button" class="btn btn-outline-danger d-none" id="itemFormDeleteBtn" onclick="VaultEngine.deleteItem()">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                        <button type="button" class="btn btn-outline-info d-none ms-2" id="itemFormShareBtn" onclick="VaultEngine.exportShare(document.getElementById('itemFormId').value)">
                            <i class="bi bi-share"></i> Share
                        </button>
                        <div class="ms-auto">
                            <button type="button" class="btn btn-primary px-4" id="itemFormSubmitBtn">Save</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- 3. New Project Context Modal -->
    <div class="modal fade" id="projectModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-card shadow-lg" style="border: 1px solid var(--border-color);">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fs-6 fw-semibold" style="color: var(--text-primary)">Buat Workspace Baru</h5>
                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Tutup"></button>
                </div>
                <form id="projectCreateForm">
                    <div class="modal-body p-4">
                        <input type="hidden" id="projectFormId">
                        <div class="mb-3">
                            <label class="form-label small text-muted mb-1">Nama Workspace</label>
                            <input type="text" id="projectFormName" class="form-control form-control-vault" required>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small text-muted mb-1">Deskripsi</label>
                            <textarea id="projectFormDesc" class="form-control form-control-vault" rows="2"></textarea>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small text-muted mb-1">Tags (Pisahkan dengan koma)</label>
                            <input type="text" id="projectFormTags" class="form-control form-control-vault">
                        </div>
                        <div class="row g-3">
                            <div class="col-md-6">
                                <label class="form-label small text-muted mb-2">Warna Aksen</label>
                                <input type="hidden" id="projectFormColor" value="#3b82f6">
                                <div class="d-flex flex-wrap gap-2" id="colorPalette">
                                    <div class="color-swatch rounded-circle cursor-pointer border border-2 border-white" style="width: 24px; height: 24px; background-color: #3b82f6;" data-color="#3b82f6"></div>
                                    <div class="color-swatch rounded-circle cursor-pointer border border-2 border-transparent" style="width: 24px; height: 24px; background-color: #10b981;" data-color="#10b981"></div>
                                    <div class="color-swatch rounded-circle cursor-pointer border border-2 border-transparent" style="width: 24px; height: 24px; background-color: #ef4444;" data-color="#ef4444"></div>
                                    <div class="color-swatch rounded-circle cursor-pointer border border-2 border-transparent" style="width: 24px; height: 24px; background-color: #f59e0b;" data-color="#f59e0b"></div>
                                    <div class="color-swatch rounded-circle cursor-pointer border border-2 border-transparent" style="width: 24px; height: 24px; background-color: #8b5cf6;" data-color="#8b5cf6"></div>
                                    <div class="color-swatch rounded-circle cursor-pointer border border-2 border-transparent" style="width: 24px; height: 24px; background-color: #ec4899;" data-color="#ec4899"></div>
                                    <div class="color-swatch rounded-circle cursor-pointer border border-2 border-transparent" style="width: 24px; height: 24px; background-color: #64748b;" data-color="#64748b"></div>
                                </div>
                            </div>
                            <div class="col-md-6">
                                <label class="form-label small text-muted mb-1">Ikon Workspace</label>
                                <select id="projectFormIcon" class="form-select form-control-vault">
                                    <option value="bi-folder">Folder</option>
                                    <option value="bi-terminal">Terminal</option>
                                    <option value="bi-cpu">CPU/Komputer</option>
                                    <option value="bi-globe">Website/Jaringan</option>
                                    <option value="bi-cloud">Cloud</option>
                                    <option value="bi-database">Database</option>
                                    <option value="bi-key">Kunci</option>
                                    <option value="bi-shield">Keamanan</option>
                                    <option value="bi-server">Server</option>
                                    <option value="bi-app-indicator">Aplikasi</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer border-0 pt-0 d-flex justify-content-between align-items-center">
                        <button type="button" class="btn btn-outline-danger d-none" id="projectFormDeleteBtn" onclick="VaultEngine.deleteProject()">
                            <i class="bi bi-trash"></i> Remove
                        </button>
                        <div class="ms-auto">
                            <button type="submit" class="btn btn-primary px-4">Save</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- 5. Settings Modal -->
    <div class="modal fade" id="settingsModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div class="modal-content bg-card shadow-lg" style="border: 1px solid var(--border-color); min-height: 500px;">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fs-5 fw-semibold" style="color: var(--text-primary)">
                        <i class="bi bi-gear-fill me-2 text-muted"></i>Pengaturan Sistem
                    </h5>
                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Tutup"></button>
                </div>
                <div class="modal-body p-0 mt-3 border-top d-flex flex-column" style="border-color: var(--border-color) !important;">
                    <div class="d-flex flex-grow-1 flex-column flex-md-row">
                        <!-- Sidebar / Tabs -->
                        <div class="p-3 border-end" style="width: 100%; max-width: 250px; background-color: var(--bg-dark-edge); border-color: var(--border-color) !important;">
                            <div class="nav flex-column nav-pills" id="settingsTabs" role="tablist" aria-orientation="vertical">
                                <button class="nav-link text-start active px-3 py-2 mb-1 w-100" id="settings-security-tab" data-bs-toggle="pill" data-bs-target="#settings-security" type="button" role="tab">
                                    <i class="bi bi-shield-lock me-2"></i>Keamanan
                                </button>
                                <button class="nav-link text-start px-3 py-2 mb-1 w-100" id="settings-appearance-tab" data-bs-toggle="pill" data-bs-target="#settings-appearance" type="button" role="tab">
                                    <i class="bi bi-palette me-2"></i>Personalisasi
                                </button>
                                <button class="nav-link text-start px-3 py-2 w-100" id="settings-data-tab" data-bs-toggle="pill" data-bs-target="#settings-data" type="button" role="tab">
                                    <i class="bi bi-database me-2"></i>Data & Backup
                                </button>
                            </div>
                        </div>
                        
                        <!-- Content Area -->
                        <div class="p-4 flex-grow-1 overflow-auto tab-content" id="settingsTabsContent">
                            <!-- Security Tab -->
                            <div class="tab-pane fade show active" id="settings-security" role="tabpanel">
                                <h6 class="fw-bold mb-4" style="color: var(--text-primary)">Pengaturan Keamanan</h6>
                                
                                <div class="mb-4">
                                    <label class="form-label small text-muted fw-semibold">Durasi Kunci Otomatis (Auto-Lock Timeout)</label>
                                    <select class="form-select form-control-vault mb-2" id="settingsTimeoutSelect">
                                        <option value="10">10 Detik</option>
                                        <option value="30">30 Detik</option>
                                        <option value="60">1 Menit</option>
                                        <option value="300">5 Menit</option>
                                    </select>
                                    <div class="form-text small text-muted">Berapa lama Vault akan terkunci secara otomatis jika Anda tidak aktif mengetik atau menggerakkan kursor.</div>
                                </div>
                                
                                <hr style="border-color: var(--border-color);">
                                
                                <div class="mb-4 mt-4">
                                    <label class="form-label small text-muted fw-semibold">Kode Berbagi (Sharing Code)</label>
                                    <div class="d-flex align-items-center gap-2 mb-2">
                                        <div class="form-control form-control-vault bg-dark text-center fw-bold fs-5 font-monospace text-primary w-50" id="settingsSharingCodeDisplay" style="letter-spacing: 2px;">
                                            ------
                                        </div>
                                        <button class="btn btn-outline-secondary" type="button" id="regenerateSharingCodeBtn" title="Buat Kode Baru">
                                            <i class="bi bi-arrow-repeat"></i> Regenerate
                                        </button>
                                        <button class="btn btn-outline-secondary" type="button" id="copySharingCodeBtn" title="Salin Kode">
                                            <i class="bi bi-clipboard"></i>
                                        </button>
                                    </div>
                                    <div class="form-text small text-muted">Berikan kode ini kepada teman Anda bersamaan dengan file <code class="text-primary">.cvshare</code> yang Anda ekspor. Klik <strong>Regenerate</strong> untuk menghanguskan kode lama.</div>
                                </div>

                                <hr style="border-color: var(--border-color);">
                                
                                <form id="changePinForm" class="mt-4">
                                    <label class="form-label small text-muted fw-semibold mb-3">Ganti PIN Master</label>
                                    <div class="mb-3">
                                        <input type="password" class="form-control form-control-vault" id="oldPinInput" placeholder="PIN Lama" required>
                                    </div>
                                    <div class="mb-3">
                                        <input type="password" class="form-control form-control-vault" id="newPinInput" placeholder="PIN Baru (Minimal 6 Digit)" minlength="6" required>
                                    </div>
                                    <div class="mb-3">
                                        <input type="password" class="form-control form-control-vault" id="confirmNewPinInput" placeholder="Konfirmasi PIN Baru" minlength="6" required>
                                    </div>
                                    <button type="submit" class="btn btn-primary w-100" id="changePinBtn">Ubah PIN Sekarang</button>
                                </form>
                            </div>
                            
                            <!-- Appearance Tab -->
                            <div class="tab-pane fade" id="settings-appearance" role="tabpanel">
                                <h6 class="fw-bold mb-4" style="color: var(--text-primary)">Tampilan Antarmuka</h6>
                                
                                <div class="mb-4">
                                    <label class="form-label small text-muted fw-semibold">Tema Sistem</label>
                                    <div class="d-flex gap-3 mt-2">
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="themeRadios" id="themeRadioDark" value="dark">
                                            <label class="form-check-label" for="themeRadioDark" style="color: var(--text-primary);">
                                                Dark Mode
                                            </label>
                                        </div>
                                        <div class="form-check">
                                            <input class="form-check-input" type="radio" name="themeRadios" id="themeRadioLight" value="light">
                                            <label class="form-check-label" for="themeRadioLight" style="color: var(--text-primary);">
                                                Light Mode
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- Data Tab -->
                            <div class="tab-pane fade" id="settings-data" role="tabpanel">
                                <h6 class="fw-bold mb-4" style="color: var(--text-primary)">Manajemen Data</h6>
                                
                                <div class="p-3 rounded mb-4" style="background-color: rgba(13, 110, 253, 0.05); border: 1px solid rgba(13, 110, 253, 0.2);">
                                    <div class="d-flex align-items-center mb-2">
                                        <i class="bi bi-cloud-download text-primary me-2 fs-5"></i>
                                        <strong style="color: var(--text-primary);">Unduh Backup Vault</strong>
                                    </div>
                                    <p class="small text-muted mb-3">Unduh seluruh direktori workspace dan struktur data Anda ke dalam satu file `.zip`. Data di dalam `.zip` ini masih terenkripsi aman secara native menggunakan PIN Anda.</p>
                                    <button class="btn btn-outline-primary btn-sm fw-semibold" onclick="VaultEngine.downloadBackup()">
                                        Download Backup (.zip)
                                    </button>
                                </div>
                                
                                <div class="p-3 rounded mb-4" style="background-color: rgba(220, 53, 69, 0.05); border: 1px solid rgba(220, 53, 69, 0.2);">
                                    <div class="d-flex align-items-center mb-2">
                                        <i class="bi bi-cloud-upload text-danger me-2 fs-5"></i>
                                        <strong style="color: var(--text-primary);">Restore Sistem (Wipe & Replace)</strong>
                                    </div>
                                    <p class="small text-muted mb-3">Unggah file <code class="text-danger">.zip</code> hasil backup Anda. <strong>PERINGATAN Keras:</strong> Seluruh data di brankas saat ini akan dihapus permanen dan ditimpa secara total dengan isi dari backup tersebut!</p>
                                    <form id="restoreBackupForm" class="d-flex align-items-center gap-2">
                                        <input type="file" class="form-control form-control-vault form-control-sm" id="backupZipInput" accept=".zip" required>
                                        <button type="submit" class="btn btn-outline-danger btn-sm fw-semibold text-nowrap" id="restoreBackupBtn">
                                            Restore Sekarang
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer border-top-0 d-flex justify-content-between align-items-center bg-card">
                    <span class="small text-muted"><i class="bi bi-info-circle me-1"></i>Tersimpan otomatis.</span>
                    <button type="button" class="btn btn-primary px-4" data-bs-dismiss="modal">Selesai</button>
                </div>
            </div>
        </div>
    </div>

    <!-- 6. Import Share Modal -->
    <div class="modal fade" id="importShareModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-card shadow-lg" style="border: 1px solid var(--border-color);">
                <div class="modal-header border-0 pb-0">
                    <h5 class="modal-title fs-6 fw-semibold" style="color: var(--text-primary)">
                        <i class="bi bi-box-arrow-in-down me-2 text-primary"></i>Import Data (.cvshare)
                    </h5>
                    <button type="button" class="btn-close shadow-none" data-bs-dismiss="modal" aria-label="Tutup"></button>
                </div>
                <form id="importShareForm">
                    <div class="modal-body p-4">
                        <div class="mb-3">
                            <label class="form-label small text-muted mb-1">Sharing Code</label>
                            <input type="text" id="importSharingCode" class="form-control form-control-vault text-center fs-5 fw-bold font-monospace" placeholder="A8X2F9" maxlength="6" required style="letter-spacing: 2px; text-transform: uppercase;">
                            <div class="form-text small text-muted text-center mt-2">Masukkan 6 digit Sharing Code dari teman Anda.</div>
                        </div>
                        <div class="mb-3">
                            <label class="form-label small text-muted mb-1">File Data</label>
                            <input type="file" id="importShareFile" class="form-control form-control-vault form-control-sm" accept=".cvshare" required>
                        </div>
                    </div>
                    <div class="modal-footer border-top-0 pt-0 d-flex justify-content-between align-items-center">
                        <span class="small text-muted"><i class="bi bi-shield-lock me-1"></i>Aman & Terenkripsi</span>
                        <button type="submit" class="btn btn-primary px-4" id="importShareBtn">Import Sekarang</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- Generic Confirmation Modal -->
    <div class="modal fade" id="genericConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content bg-card shadow-lg" style="border: 1px solid var(--border-color);">
                <div class="modal-body p-4 text-center">
                    <div class="mb-3 d-flex justify-content-center">
                        <div class="d-flex justify-content-center align-items-center rounded-circle" style="width: 56px; height: 56px; background-color: rgba(239, 68, 68, 0.1);">
                            <i class="bi bi-exclamation-triangle fs-3" style="color: var(--accent-danger)"></i>
                        </div>
                    </div>
                    <h5 class="fw-bold mb-2" id="genericConfirmTitle" style="color: var(--text-primary)">Konfirmasi</h5>
                    <p class="text-muted small mb-4" id="genericConfirmDesc">Apakah Anda yakin ingin melanjutkan?</p>
                    <div class="d-flex justify-content-center gap-2">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-danger" id="genericConfirmActionBtn">Ya</button>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- ========================================================== -->
    <!-- FRAMEWORK SCRIPT BOOTSTRAPPING ENGINE                      -->
    <!-- ========================================================== -->
    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    <script type="module" src="assets/js/app.js?v=22"></script>

    <!-- Global Interface Action Proxies for FormBuilder Inline Click Handlers -->
    <script>
        const VaultUI = {
            toggleReveal(btn) {
                const input = btn.closest('.input-group').querySelector('input');
                const icon = btn.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.classList.replace('bi-eye', 'bi-eye-slash');
                } else if (input.style.webkitTextSecurity === 'disc') {
                    input.style.webkitTextSecurity = 'none';
                    icon.classList.replace('bi-eye', 'bi-eye-slash');
                } else if (input.style.webkitTextSecurity === 'none') {
                    input.style.webkitTextSecurity = 'disc';
                    icon.classList.replace('bi-eye-slash', 'bi-eye');
                } else if (input.type === 'text') {
                    input.type = 'password';
                    icon.classList.replace('bi-eye-slash', 'bi-eye');
                }
            },
            copyToClipboard(btn) {
                let input = btn.closest('.input-group') ? btn.closest('.input-group').querySelector('input, textarea') : btn.previousElementSibling;
                if (!input) return;
                navigator.clipboard.writeText(input.value).then(() => {
                    const icon = btn.querySelector('i');
                    const origIcon = Array.from(icon.classList).find(c => c.startsWith('bi-') && c !== 'bi-check-lg');
                    icon.classList.replace(origIcon, 'bi-check-lg');
                    icon.classList.add('text-success');
                    setTimeout(() => {
                        icon.classList.replace('bi-check-lg', origIcon);
                        icon.classList.remove('text-success');
                    }, 1500);
                }).catch(err => console.error('Clipboard injection rejected:', err));
            },
            openLink(btn) {
                const input = btn.closest('.input-group').querySelector('input');
                let url = input.value.trim();
                if (url && !url.startsWith('http')) {
                    url = 'https://' + url;
                }
                if (url) {
                    window.open(url, '_blank');
                }
            }
        };
    </script>
</body>
</html>
