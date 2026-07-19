<?php
namespace Vault\Services;

class CryptoService {
    private static $derivedKey = null;

    /**
     * Derives a highly secure key from the Master PIN using PBKDF2
     */
    public static function init(string $pin, string $salt = 'VaultProjectEngineSalt2026!'): void {
        self::$derivedKey = hash_pbkdf2('sha256', $pin, $salt, 10000, 32, true);
    }

    public static function encrypt(array $data): string {
        if (!self::$derivedKey) {
            throw new \Exception("Vault is locked. Encryption key missing.");
        }
        
        $plaintext = json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $iv = openssl_random_pseudo_bytes(openssl_cipher_iv_length('aes-256-gcm'));
        
        $ciphertext = openssl_encrypt(
            $plaintext, 
            'aes-256-gcm', 
            self::$derivedKey, 
            OPENSSL_RAW_DATA, 
            $iv, 
            $tag
        );

        return base64_encode($iv . $tag . $ciphertext);
    }

    public static function decrypt(string $payload): array {
        if (!self::$derivedKey) {
            throw new \Exception("Vault is locked. Decryption key missing.");
        }

        $decoded = base64_decode($payload);
        $ivLen = openssl_cipher_iv_length('aes-256-gcm');
        $tagLen = 16; // Standard GCM auth tag length
        
        $iv = substr($decoded, 0, $ivLen);
        $tag = substr($decoded, $ivLen, $tagLen);
        $ciphertext = substr($decoded, $ivLen + $tagLen);

        $plaintext = openssl_decrypt(
            $ciphertext, 
            'aes-256-gcm', 
            self::$derivedKey, 
            OPENSSL_RAW_DATA, 
            $iv, 
            $tag
        );

        if ($plaintext === false) {
            throw new \Exception("Decryption failed. Invalid key or corrupted payload.");
        }

        return json_decode($plaintext, true);
    }
}