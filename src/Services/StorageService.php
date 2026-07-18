<?php
namespace Vault\Services;

class StorageService {
    public static function writeJson(string $path, array $data, bool $encrypt = true): bool {
        $dir = dirname($path);
        if (!is_dir($dir)) {
            mkdir($dir, 0755, true);
        }

        $content = $encrypt ? CryptoService::encrypt($data) : json_encode($data, JSON_PRETTY_PRINT);
        
        // Atomic file write using a temporary staging pattern
        $tmpFile = tempnam($dir, 'tmp_');
        if (file_put_contents($tmpFile, $content, LOCK_EX) !== false) {
            if (rename($tmpFile, $path)) {
                return true;
            }
        }
        @unlink($tmpFile);
        return false;
    }

    public static function readJson(string $path, bool $encrypted = true): array {
        if (!file_exists($path)) {
            return [];
        }
        $content = file_get_contents($path);
        return $encrypted ? CryptoService::decrypt($content) : json_decode($content, true);
    }
}