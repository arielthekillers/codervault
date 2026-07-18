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
                <div class="p-3 border-bottom border-secondary d-flex align-items-center">
                    <i class="bi bi-search text-muted me-3 fs-5"></i>
                    <input type="text" id="globalSearchInput" class="form-control form-control-vault border-0 bg-transparent fs-5 p-0 shadow-none text-white" placeholder="Cari proyek, kredensial, konfigurasi, tag..." autocomplete="off">
                    <span class="badge bg-dark border border-secondary text-muted ms-2">ESC</span>
                </div>
                <div class="modal-body p-0" id="searchResultsContainer" style="max-height: 450px;">
                    <div class="p-4 text-center text-muted small">
                        Ketik untuk mulai mencari...
                    </div>
                </div>
                <div class="modal-footer p-2 bg-dark-edge border-top border-secondary d-flex justify-content-between text-muted small">
                    <div>
                        <span class="me-2"><kbd class="bg-dark text-muted border border-secondary">↑↓</kbd> Navigasi</span>
                        <span><kbd class="bg-dark text-muted border border-secondary">↵</kbd> Pilih</span>
                    </div>
                    <div>Indeks CoderVault</div>
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
                    <div class="modal-footer border-0 pt-0">
                        <button type="submit" class="btn btn-primary px-4">Save</button>
                    </div>
                </form>
            </div>
        </div>
    </div>

    <!-- 4. Delete Confirmation Modal -->
    <div class="modal fade" id="deleteConfirmModal" tabindex="-1" aria-hidden="true" style="z-index: 1060;">
        <div class="modal-dialog modal-dialog-centered modal-sm">
            <div class="modal-content bg-card shadow-lg" style="border: 1px solid var(--border-color);">
                <div class="modal-body p-4 text-center">
                    <div class="mb-3 d-flex justify-content-center">
                        <div class="d-flex justify-content-center align-items-center rounded-circle" style="width: 56px; height: 56px; background-color: rgba(239, 68, 68, 0.1);">
                            <i class="bi bi-exclamation-triangle fs-3" style="color: var(--accent-danger)"></i>
                        </div>
                    </div>
                    <h5 class="fw-bold mb-2" style="color: var(--text-primary)">Hapus Item?</h5>
                    <p class="text-muted small mb-4">Item yang dihapus tidak dapat dikembalikan lagi. Yakin ingin melanjutkan?</p>
                    <div class="d-flex justify-content-center gap-2">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Batal</button>
                        <button type="button" class="btn btn-danger" onclick="VaultEngine.confirmDeleteItem()">Hapus</button>
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
    <script type="module" src="assets/js/app.js?v=10"></script>

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
