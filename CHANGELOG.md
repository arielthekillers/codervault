# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-07-24

### Added
- **2FA Authenticator (TOTP)**: Added built-in support for generating 2FA codes.
  - Paste QR code text directly into the secret field for instant parsing.
  - Real-time animated circular progress indicator.
  - Auto-generated secret keys with duplicate application detection.
- **Hybrid Auto-Updater**: System can now update itself directly via the Magic Launcher.
  - Support for `git pull` updates for developer environments.
  - Support for ZIP extraction updates directly from GitHub API for standard users.
  - Command: Type `update` in Magic Launcher to check for updates.

## [1.0.0] - 2026-07-20

### Added
- **Initial Release:** The first stable release of CoderVault, an offline encrypted credential and workspace manager for developers.
- AES-256-GCM encrypted credential storage
- Offline-first architecture
- Workspace management
- Password generator
- Magic Launcher (`Shift` + `F`)
- Light & Dark theme
- Reminder system
- Auto Lock
- Import & Export (`.cvshare`)
- Modern responsive interface
