# Panduan Kontribusi (Contributing Guidelines)

Semua kontribusi (baik oleh developer manusia maupun asisten AI) dalam proyek CoderVault ini **wajib** mengikuti aturan *Conventional Commits*.

## Disiplin Git Commit

Setiap *commit* harus menggunakan format standar berikut:
`<type>(<scope>): <pesan>`

(Bagian `<scope>` bersifat opsional tetapi disarankan untuk perubahan yang spesifik pada suatu komponen).

### Daftar Tipe (Type) yang Digunakan:
- **`feat`** : Fitur baru
- **`fix`** : Perbaikan bug
- **`security`** : Perubahan/peningkatan keamanan
- **`style`** : Perubahan UI, CSS, tampilan (tidak memengaruhi fungsionalitas)
- **`refactor`** : Merapikan kode tanpa mengubah perilaku (tidak menambah fitur atau memperbaiki bug)
- **`perf`** : Optimasi performa
- **`docs`** : Perubahan dokumentasi (README.md, CHANGELOG.md, komentar kode)
- **`test`** : Penambahan atau perbaikan Unit/Integration test
- **`build`** : Perubahan pada build system
- **`ci`** : Konfigurasi GitHub Actions / Continuous Integration
- **`chore`** : Pekerjaan pendukung (.gitignore, update dependencies, cleanup kode)

### Contoh Commit yang Benar:
- `feat(workspace): drag & drop`
- `feat(database): add PostgreSQL support`
- `feat(database): add SQLite support`
- `fix(reminder): delete bug`
- `style(ui): redesign dashboard`
- `security: improve AES encryption`
- `docs: update README`

---
*Catatan untuk AI: Selalu baca file ini sebelum melakukan `git commit` untuk memastikan format pesan sesuai dengan standar proyek.*
