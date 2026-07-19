<?php
// public/api.php
require_once __DIR__ . '/../src/Autoloader.php';
Autoloader::register();

use Vault\Services\CryptoService;
use Vault\Services\StorageService;
use Vault\Helpers\Response;

session_start();
header('Content-Type: application/json');

// 1. Authentication Check & Idle Timeout Guard
$timeout_duration = $_SESSION['config']['idle_timeout'] ?? 900; // 15 mins default
if (isset($_SESSION['LAST_ACTIVITY']) && (time() - $_SESSION['LAST_ACTIVITY'] > $timeout_duration)) {
    session_unset();
    session_destroy();
    echo json_encode(['success' => false, 'error' => 'LOCKED', 'message' => 'Vault auto-locked due to inactivity.']);
    exit;
}
$_SESSION['LAST_ACTIVITY'] = time();

$action = $_GET['action'] ?? '';
$payload = json_decode(file_get_contents('php://input'), true) ?? [];

// Bootstrapping Key Recovery
if (isset($_SESSION['MASTER_PIN'])) {
    try {
        CryptoService::init($_SESSION['MASTER_PIN']);
    } catch (\Exception $e) {
        echo json_encode(['success' => false, 'error' => 'CRYPTO_ERROR', 'message' => $e->getMessage()]);
        exit;
    }
} elseif ($action !== 'unlock' && $action !== 'check_status') {
    echo json_encode(['success' => false, 'error' => 'LOCKED', 'message' => 'Vault is locked. Provide master PIN.']);
    exit;
}

// 2. Request Routing Matrix
switch ($action) {
    case 'check_status':
        $is_setup = file_exists(__DIR__ . '/../config/config.json');
        $idleTimeout = 900;
        $layoutMode = 'modern';
        if ($is_setup) {
            $config = StorageService::readJson(__DIR__ . '/../config/config.json', false);
            $idleTimeout = $config['idle_timeout'] ?? 900;
            $layoutMode = $config['layout_mode'] ?? 'modern';
        }
        echo json_encode([
            'success' => true, 
            'locked' => !isset($_SESSION['MASTER_PIN']), 
            'setup_required' => !$is_setup,
            'idle_timeout' => $idleTimeout,
            'layout_mode' => $layoutMode
        ]);
        break;

    case 'unlock':
        $pin = $payload['pin'] ?? '';
        if (empty($pin) || strlen($pin) < 6) {
            echo json_encode(['success' => false, 'message' => 'Invalid PIN format.']);
            exit;
        }

        $configFile = __DIR__ . '/../config/config.json';
        if (!file_exists($configFile)) {
            // First Launch: Initialize with 123456
            if ($pin !== '123456') {
                echo json_encode(['success' => false, 'message' => 'Masukkan PIN default: 123456']);
                exit;
            }
            $initialConfig = ['idle_timeout' => 900, 'theme' => 'dark', 'pin_hash' => password_hash('123456', PASSWORD_BCRYPT), 'must_change_pin' => true];
            StorageService::writeJson($configFile, $initialConfig, false);
            $_SESSION['config'] = $initialConfig;
        } else {
            $config = StorageService::readJson($configFile, false);
            if (empty($config) || !isset($config['pin_hash'])) {
                if ($pin !== '123456') {
                    echo json_encode(['success' => false, 'message' => 'Konfigurasi kosong. Masukkan PIN default: 123456']);
                    exit;
                }
                $config = ['idle_timeout' => 900, 'theme' => 'dark', 'pin_hash' => password_hash('123456', PASSWORD_BCRYPT), 'must_change_pin' => true];
                StorageService::writeJson($configFile, $config, false);
            } else if (!password_verify($pin, $config['pin_hash'])) {
                echo json_encode(['success' => false, 'message' => 'Incorrect Master PIN.']);
                exit;
            }
            $_SESSION['config'] = $config;
        }

        $_SESSION['MASTER_PIN'] = $pin;
        echo json_encode(['success' => true, 'message' => 'Vault unlocked successfully.', 'must_change_pin' => $_SESSION['config']['must_change_pin'] ?? false, 'idle_timeout' => $_SESSION['config']['idle_timeout'] ?? 900]);
        break;

    case 'get_projects':
        $projectDir = __DIR__ . '/../storage/projects/';
        $projects = [];
        if (is_dir($projectDir)) {
            $dirs = array_filter(glob($projectDir . '*'), 'is_dir');
            foreach ($dirs as $dir) {
                $metaFile = $dir . '/project.json';
                if (file_exists($metaFile)) {
                    try {
                        $projects[] = StorageService::readJson($metaFile, true);
                    } catch (\Exception $e) {
                        // Skip corrupted/un-decryptable entries gracefully
                    }
                }
            }
        }
        echo json_encode(['success' => true, 'projects' => $projects]);
        break;

    case 'get_dashboard_aggregates':
        $projectDir = __DIR__ . '/../storage/projects/';
        $reminders = [];
        $bookmarks = [];
        
        if (is_dir($projectDir)) {
            $dirs = array_filter(glob($projectDir . '*'), 'is_dir');
            foreach ($dirs as $dir) {
                $metaFile = $dir . '/project.json';
                $itemsDir = $dir . '/items/';
                if (file_exists($metaFile)) {
                    try {
                        $project = StorageService::readJson($metaFile, true);
                        if (is_dir($itemsDir)) {
                            $itemFiles = glob($itemsDir . '*.json');
                            foreach ($itemFiles as $file) {
                                try {
                                    $item = StorageService::readJson($file, true);
                                    if ($item['type'] === 'reminder') {
                                        $reminders[] = [
                                            'project_id' => $project['id'],
                                            'project_name' => $project['name'],
                                            'project_color' => $project['color'],
                                            'item' => $item
                                        ];
                                    } else if (!empty($item['fields']['bookmark']) && ($item['fields']['bookmark'] === true || $item['fields']['bookmark'] === 'true')) {
                                        $bookmarks[] = [
                                            'project_id' => $project['id'],
                                            'project_name' => $project['name'],
                                            'project_color' => $project['color'],
                                            'item' => $item
                                        ];
                                    }
                                } catch (\Exception $e) {}
                            }
                        }
                    } catch (\Exception $e) {}
                }
            }
        }
        echo json_encode(['success' => true, 'reminders' => $reminders, 'bookmarks' => $bookmarks]);
        break;

    case 'get_project_data':
        $id = preg_replace('/[^a-zA-Z0-9\-_]/', '', $_GET['id'] ?? '');
        $projectFile = __DIR__ . "/../storage/projects/{$id}/project.json";
        $itemsDir = __DIR__ . "/../storage/projects/{$id}/items/";
        
        if (!file_exists($projectFile)) {
            echo json_encode(['success' => false, 'message' => 'Project footprint not found.']);
            exit;
        }

        $projectData = StorageService::readJson($projectFile, true);
        $items = [];
        
        if (is_dir($itemsDir)) {
            $itemFiles = glob($itemsDir . '*.json');
            foreach ($itemFiles as $file) {
                try {
                    $items[] = StorageService::readJson($file, true);
                } catch (\Exception $e) {}
            }
        }
        
        echo json_encode(['success' => true, 'project' => $projectData, 'items' => $items]);
        break;

    case 'save_item':
        $projectId = preg_replace('/[^a-zA-Z0-9\-_]/', '', $payload['project_id'] ?? '');
        if (empty($projectId)) {
            echo json_encode(['success' => false, 'message' => 'Target project ID missing.']);
            exit;
        }

        $itemData = $payload['item'] ?? [];
        if (empty($itemData['id'])) {
            $itemData['id'] = uniqid('item_', true);
            $itemData['created_at'] = time();
        }
        $itemData['updated_at'] = time();

        if (!empty($payload['is_project'])) {
            $targetFile = __DIR__ . "/../storage/projects/{$projectId}/project.json";
        } else {
            $targetFile = __DIR__ . "/../storage/projects/{$projectId}/items/{$itemData['id']}.json";
        }
        $saved = StorageService::writeJson($targetFile, $itemData, true);
        
        echo json_encode(['success' => $saved, 'item' => $itemData]);
        break;

    case 'delete_item':
        $projectId = preg_replace('/[^a-zA-Z0-9\-_]/', '', $payload['project_id'] ?? '');
        $itemId = preg_replace('/[^a-zA-Z0-9\-_\.]/', '', $payload['item_id'] ?? '');
        if (empty($projectId) || empty($itemId)) {
            echo json_encode(['success' => false, 'message' => 'Project ID or Item ID missing.']);
            exit;
        }
        $targetFile = __DIR__ . "/../storage/projects/{$projectId}/items/{$itemId}.json";
        if (file_exists($targetFile)) {
            unlink($targetFile);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Item not found.']);
        }
        break;

    case 'delete_project':
        $projectId = preg_replace('/[^a-zA-Z0-9\-_]/', '', $payload['project_id'] ?? '');
        if (empty($projectId)) {
            echo json_encode(['success' => false, 'message' => 'Project ID missing.']);
            exit;
        }
        $projectDir = __DIR__ . "/../storage/projects/{$projectId}";
        if (is_dir($projectDir)) {
            // Recursively delete the directory
            $files = new RecursiveIteratorIterator(
                new RecursiveDirectoryIterator($projectDir, RecursiveDirectoryIterator::SKIP_DOTS),
                RecursiveIteratorIterator::CHILD_FIRST
            );
            foreach ($files as $fileinfo) {
                $todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
                $todo($fileinfo->getRealPath());
            }
            rmdir($projectDir);
            echo json_encode(['success' => true]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Project not found.']);
        }
        break;

    case 'save_theme':
        $theme = $payload['theme'] ?? 'dark';
        $configFile = __DIR__ . '/../config/config.json';
        if (file_exists($configFile)) {
            $config = StorageService::readJson($configFile, false);
            $config['theme'] = $theme;
            StorageService::writeJson($configFile, $config, false);
            $_SESSION['config'] = $config;
        }
        echo json_encode(['success' => true]);
        break;

    case 'logout':
        session_unset();
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    case 'logout':
        session_unset();
        session_destroy();
        echo json_encode(['success' => true]);
        break;

    case 'change_pin':
        $oldPin = $payload['old_pin'] ?? '';
        $newPin = $payload['new_pin'] ?? '';
        
        if (empty($oldPin) || empty($newPin) || strlen($newPin) < 6) {
            echo json_encode(['success' => false, 'message' => 'PIN baru harus minimal 6 digit.']);
            exit;
        }

        $configFile = __DIR__ . '/../config/config.json';
        if (!file_exists($configFile)) {
            echo json_encode(['success' => false, 'message' => 'Vault belum diinisialisasi.']);
            exit;
        }

        $config = StorageService::readJson($configFile, false);
        if (!password_verify($oldPin, $config['pin_hash'])) {
            echo json_encode(['success' => false, 'message' => 'PIN lama salah.']);
            exit;
        }

        // Must match session pin to be safe
        if (!isset($_SESSION['MASTER_PIN']) || $oldPin !== $_SESSION['MASTER_PIN']) {
             echo json_encode(['success' => false, 'message' => 'Sesi tidak sinkron. Harap login kembali.']);
             exit;
        }

        // 1. Read all data using OLD PIN
        $projectDir = __DIR__ . '/../storage/projects/';
        $projects = [];
        $items = [];
        if (is_dir($projectDir)) {
            $dirs = array_filter(glob($projectDir . '*'), 'is_dir');
            foreach ($dirs as $dir) {
                $metaFile = $dir . '/project.json';
                if (file_exists($metaFile)) {
                    try {
                        $projects[$metaFile] = StorageService::readJson($metaFile, true);
                        
                        $itemsDir = $dir . '/items/';
                        if (is_dir($itemsDir)) {
                            $itemFiles = glob($itemsDir . '*.json');
                            foreach ($itemFiles as $iFile) {
                                $items[$iFile] = StorageService::readJson($iFile, true);
                            }
                        }
                    } catch (\Exception $e) {}
                }
            }
        }

        // 2. Change Crypto Key to New PIN
        try {
            CryptoService::init($newPin);
        } catch (\Exception $e) {
            echo json_encode(['success' => false, 'message' => 'Gagal inisialisasi kunci baru.']);
            exit;
        }

        // 3. Re-encrypt and Save all data
        foreach ($projects as $file => $data) {
            StorageService::writeJson($file, $data, true);
        }
        foreach ($items as $file => $data) {
            StorageService::writeJson($file, $data, true);
        }

        // 4. Update Config
        $config['pin_hash'] = password_hash($newPin, PASSWORD_BCRYPT);
        $config['must_change_pin'] = false;
        StorageService::writeJson($configFile, $config, false);

        $_SESSION['config'] = $config;
        $_SESSION['MASTER_PIN'] = $newPin;

        echo json_encode(['success' => true]);
        break;

    case 'get_config':
        $configFile = __DIR__ . '/../config/config.json';
        if (file_exists($configFile)) {
            $config = StorageService::readJson($configFile, false);
            echo json_encode([
                'success' => true,
                'config' => [
                    'idle_timeout' => $config['idle_timeout'] ?? 900,
                    'theme' => $config['theme'] ?? 'dark'
                ]
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Config not found']);
        }
        break;

    case 'get_sharing_code':
        $configFile = __DIR__ . '/../config/config.json';
        if (file_exists($configFile)) {
            $config = StorageService::readJson($configFile, false);
            echo json_encode([
                'success' => true,
                'sharing_code' => $config['sharing_code'] ?? null
            ]);
        } else {
            echo json_encode(['success' => false, 'message' => 'Config not found']);
        }
        break;

    case 'generate_sharing_code':
        $configFile = __DIR__ . '/../config/config.json';
        if (!file_exists($configFile)) {
            echo json_encode(['success' => false, 'message' => 'Config not found']);
            exit;
        }
        $config = StorageService::readJson($configFile, false);
        
        // Generate random 6 character alphanumeric string
        $characters = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        $sharingCode = '';
        for ($i = 0; $i < 6; $i++) {
            $sharingCode .= $characters[rand(0, strlen($characters) - 1)];
        }
        
        $config['sharing_code'] = $sharingCode;
        StorageService::writeJson($configFile, $config, false);
        
        echo json_encode(['success' => true, 'sharing_code' => $sharingCode]);
        break;

    case 'update_config':
        $configFile = __DIR__ . '/../config/config.json';
        if (!file_exists($configFile)) {
            echo json_encode(['success' => false, 'message' => 'Config not found']);
            exit;
        }
        $config = StorageService::readJson($configFile, false);
        
        if (isset($payload['idle_timeout'])) {
            $config['idle_timeout'] = intval($payload['idle_timeout']);
            $_SESSION['config']['idle_timeout'] = $config['idle_timeout'];
        }
        if (isset($payload['theme'])) {
            $config['theme'] = $payload['theme'];
            $_SESSION['config']['theme'] = $config['theme'];
        }
        if (isset($payload['layout_mode'])) {
            $config['layout_mode'] = $payload['layout_mode'];
            $_SESSION['config']['layout_mode'] = $config['layout_mode'];
        }
        
        StorageService::writeJson($configFile, $config, false);
        echo json_encode(['success' => true]);
        break;

    case 'download_backup':
        // Generate a zip of the storage directory
        $storageDir = realpath(__DIR__ . '/../storage');
        if (!$storageDir) {
            echo json_encode(['success' => false, 'message' => 'Storage not found.']);
            exit;
        }
        
        $zipFile = tempnam(sys_get_temp_dir(), 'vault_backup_');
        $zip = new ZipArchive();
        if ($zip->open($zipFile, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
            echo json_encode(['success' => false, 'message' => 'Failed to create zip file.']);
            exit;
        }
        
        $files = new RecursiveIteratorIterator(
            new RecursiveDirectoryIterator($storageDir),
            RecursiveIteratorIterator::LEAVES_ONLY
        );
        
        foreach ($files as $name => $file) {
            if (!$file->isDir()) {
                $filePath = $file->getRealPath();
                $relativePath = substr($filePath, strlen($storageDir) + 1);
                $zip->addFile($filePath, $relativePath);
            }
        }
        $zip->close();
        
        // Stream the file
        header('Content-Type: application/zip');
        header('Content-disposition: attachment; filename=codervault_backup_' . date('Y-m-d_H-i-s') . '.zip');
        header('Content-Length: ' . filesize($zipFile));
        readfile($zipFile);
        unlink($zipFile);
        exit;

    case 'export_share':
        $projectId = $payload['project_id'] ?? null;
        $itemId = $payload['item_id'] ?? null;
        if (!$projectId) {
            echo json_encode(['success' => false, 'message' => 'Project ID required']);
            exit;
        }

        $configFile = __DIR__ . '/../config/config.json';
        $config = file_exists($configFile) ? StorageService::readJson($configFile, false) : [];
        if (empty($config['sharing_code'])) {
            echo json_encode(['success' => false, 'message' => 'Sharing Code belum dikonfigurasi di Pengaturan.']);
            exit;
        }

        $projectDir = __DIR__ . '/../storage/projects/' . $projectId;
        if (!is_dir($projectDir)) {
            echo json_encode(['success' => false, 'message' => 'Workspace tidak ditemukan.']);
            exit;
        }

        $exportData = ['type' => $itemId ? 'item' : 'workspace'];
        
        if ($itemId) {
            $itemFile = $projectDir . '/items/' . $itemId . '.json';
            if (!file_exists($itemFile)) {
                echo json_encode(['success' => false, 'message' => 'Item tidak ditemukan.']);
                exit;
            }
            $exportData['data'] = StorageService::readJson($itemFile, true);
        } else {
            $projectFile = $projectDir . '/project.json';
            $exportData['project'] = StorageService::readJson($projectFile, true);
            $exportData['items'] = [];
            $itemsDir = $projectDir . '/items/';
            if (is_dir($itemsDir)) {
                $itemFiles = glob($itemsDir . '*.json');
                foreach ($itemFiles as $iFile) {
                    $exportData['items'][] = StorageService::readJson($iFile, true);
                }
            }
        }

        // Encrypt with Sharing Code
        CryptoService::init($config['sharing_code'], 'VaultShareSalt2026!');
        $sharePayload = CryptoService::encrypt($exportData);
        // Restore Master PIN context immediately
        CryptoService::init($_SESSION['MASTER_PIN']);

        echo json_encode(['success' => true, 'payload' => $sharePayload]);
        break;

    case 'import_share':
        if (!isset($_FILES['share_file']) || !isset($_POST['sharing_code'])) {
            echo json_encode(['success' => false, 'message' => 'File dan Sharing Code diperlukan.']);
            exit;
        }

        $providedCode = strtoupper(trim($_POST['sharing_code']));
        $payloadStr = file_get_contents($_FILES['share_file']['tmp_name']);

        try {
            CryptoService::init($providedCode, 'VaultShareSalt2026!');
            $rawArray = CryptoService::decrypt($payloadStr);
        } catch (\Exception $e) {
            // Restore context
            CryptoService::init($_SESSION['MASTER_PIN']);
            echo json_encode(['success' => false, 'message' => 'Sharing Code salah atau file rusak.']);
            exit;
        }

        // Restore Master PIN context to save
        CryptoService::init($_SESSION['MASTER_PIN']);
        
        $importedCount = 0;
        $skippedCount = 0;

        if ($rawArray['type'] === 'item') {
            $itemData = $rawArray['data'];
            $projectId = $_POST['project_id'] ?? '';
            
            if (empty($projectId)) {
                echo json_encode(['success' => false, 'message' => 'Silakan masuk ke dalam Workspace terlebih dahulu sebelum mengimpor Item.']);
                exit;
            }

            $projectDir = __DIR__ . '/../storage/projects/' . preg_replace('/[^a-zA-Z0-9\-_]/', '', $projectId);
            
            // Auto create workspace if missing? Let's just create a dummy one or require it.
            // Better to recreate the workspace minimally if it doesn't exist
            if (!is_dir($projectDir)) {
                mkdir($projectDir . '/items', 0777, true);
                StorageService::writeJson($projectDir . '/project.json', [
                    'id' => $projectId,
                    'name' => 'Imported Workspace',
                    'color' => '#6c757d',
                    'updated_at' => date('c')
                ], true);
            }
            
            $itemFile = $projectDir . '/items/' . $itemData['id'] . '.json';
            if (file_exists($itemFile)) {
                $skippedCount++;
            } else {
                StorageService::writeJson($itemFile, $itemData, true);
                $importedCount++;
            }
        } else if ($rawArray['type'] === 'workspace') {
            $projData = $rawArray['project'];
            $projectDir = __DIR__ . '/../storage/projects/' . $projData['id'];
            
            if (!is_dir($projectDir)) {
                mkdir($projectDir . '/items', 0777, true);
                StorageService::writeJson($projectDir . '/project.json', $projData, true);
                $importedCount++; // Count workspace as 1
            } else {
                $skippedCount++;
            }
            
            foreach ($rawArray['items'] as $itemData) {
                $itemFile = $projectDir . '/items/' . $itemData['id'] . '.json';
                if (file_exists($itemFile)) {
                    $skippedCount++;
                } else {
                    StorageService::writeJson($itemFile, $itemData, true);
                    $importedCount++;
                }
            }
        }

        echo json_encode([
            'success' => true, 
            'message' => "Import selesai. Berhasil: $importedCount, Dilewati (sudah ada): $skippedCount"
        ]);
        break;

    case 'restore_backup':
        if (!isset($_FILES['backup_zip'])) {
            echo json_encode(['success' => false, 'message' => 'File ZIP tidak ditemukan.']);
            exit;
        }

        $zipFile = $_FILES['backup_zip']['tmp_name'];
        $zip = new ZipArchive();
        if ($zip->open($zipFile) !== true) {
            echo json_encode(['success' => false, 'message' => 'Format ZIP tidak valid.']);
            exit;
        }

        $storageDir = realpath(__DIR__ . '/../storage');
        if (!$storageDir) {
            echo json_encode(['success' => false, 'message' => 'Direktori storage tidak ditemukan.']);
            exit;
        }

        // 1. Wipe existing projects safely
        $projectDir = $storageDir . '/projects/';
        if (is_dir($projectDir)) {
            $dirs = array_filter(glob($projectDir . '*'), 'is_dir');
            foreach ($dirs as $dir) {
                $files = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($dir, RecursiveDirectoryIterator::SKIP_DOTS),
                    RecursiveIteratorIterator::CHILD_FIRST
                );
                foreach ($files as $fileinfo) {
                    $todo = ($fileinfo->isDir() ? 'rmdir' : 'unlink');
                    $todo($fileinfo->getRealPath());
                }
                rmdir($dir);
            }
        }

        // 2. Extract Zip directly into storage (assuming the zip structure matches the 'projects/' root)
        // Wait, our download_backup zipped the inside of `storage/`. So it has `projects/ariel...` inside.
        $zip->extractTo($storageDir);
        $zip->close();

        echo json_encode(['success' => true, 'message' => 'Sistem berhasil di-restore!']);
        break;
        http_response_code(444);
        echo json_encode(['success' => false, 'message' => 'Action unrecognized.']);
        break;
}