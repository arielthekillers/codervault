# CoderVault

CoderVault is a secure, local-first credentials and secrets manager designed specifically for developers and teams. 
It helps you securely store API keys, SSH configs, database passwords, environment variables, and snippets in organized Workspaces.

## Key Features

- **End-to-End Encryption**: Everything is encrypted with AES-256 before being stored on the disk.
- **Local First (PHP & JSON)**: No complex databases needed. Data is stored locally in `.json` files for high portability and easy backups.
- **Master PIN & Auto-Lock**: Access is gated behind a 6-digit Master PIN. Idle auto-lock ensures your vault is safe even if you leave your desk.
- **Modern Minimalist UI**: Beautiful, dark-themed UI built with Bootstrap 5, complete with dynamic layouts, intuitive search, and instant toast notifications.
- **Export & Import (Sharing)**: Easily export items or entire workspaces as encrypted `.cvshare` files and share them securely using a 6-character PIN code.
- **Smart Engine**: Customizable schemas for Credentials, APIs, SSH setups, Env configs, Notes, FTP, Database, Cloud platforms, and Git.

## Requirements

- A web server running PHP 7.4 or newer (e.g., XAMPP, Laragon, or Nginx+PHP-FPM).
- No relational database required! Everything runs on local flat-files.

## Installation

1. Clone this repository to your local server directory (e.g., `htdocs/codervault` for XAMPP).
2. Ensure the `storage/` and `config/` directories have **Write Permissions** (`chmod -R 775` or similar depending on OS/Server).
3. Open your browser and navigate to `http://localhost/codervault/public`.
4. Follow the setup wizard to create your first Master PIN and unlock the vault!

## Security Notes

- Do not expose your `config/` or `storage/` directory to the public internet without proper server configuration. If hosting on a live server, ensure that requests to `/storage` and `/config` are blocked via `.htaccess` or Nginx configs.
- The `.gitignore` is already configured to prevent your private `.json` credentials from being pushed to a public repository.

## Usage

- Start by creating a **Workspace**.
- Use the **Magic Launcher (Cmd/Ctrl + K)** to quickly search, create, or navigate.
- Click the **Gear Icon** to access settings such as Auto-lock timeouts and modifying the Master PIN.

---
*Built with ❤️ for developers who value speed, beauty, and security.*
