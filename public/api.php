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
        echo json_encode([
            'success' => true, 
            'locked' => !isset($_SESSION['MASTER_PIN']), 
            'setup_required' => !$is_setup
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
        echo json_encode(['success' => true, 'message' => 'Vault unlocked successfully.', 'must_change_pin' => $_SESSION['config']['must_change_pin'] ?? false]);
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

    default:
        http_response_code(444);
        echo json_encode(['success' => false, 'message' => 'Action unrecognized.']);
        break;
}