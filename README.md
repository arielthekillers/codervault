# 🛡️ CoderVault

**CoderVault** adalah asisten keamanan dan manajemen kredensial pribadi berbasis *web* yang dirancang khusus untuk _developer_ dan _power user_. Dengan antarmuka yang sangat bersih, minimalis, dan modern, CoderVault membantu Anda mengelola berbagai data rahasia tanpa mengorbankan kecepatan maupun estetika.

Semua data Anda tersimpan **secara lokal (offline) dan terenkripsi menggunakan algoritma AES-256-GCM tingkat militer**. Tidak ada satupun data yang mengalir ke server pihak ketiga!

## ✨ Fitur Unggulan

- **🔒 Enkripsi Mutlak (AES-256)** — Semua item kredensial dan konfigurasi diamankan di tingkat server (PHP backend) menggunakan Master PIN Anda. Data JSON Anda tidak dapat dibaca oleh siapa pun tanpa PIN yang benar.
- **🎨 UI/UX Premium & Dinamis** — Antarmuka responsif yang terinspirasi dari standar desain modern (Linear & Vercel) dengan efek *glassmorphism*, ikon yang interaktif, dan animasi *micro-interactions* yang mulus.
- **🌗 Mode Terang & Gelap (Theme Switcher)** — Ganti tema sesuka Anda hanya dengan satu klik tombol di *Navbar*.
- **🎲 Generator Kata Sandi** — Buat *password* aman 16-karakter (huruf, angka, simbol) secara instan saat menambah kredensial baru.
- **🗂️ Manajemen Workspace Intuitif** — Kelola proyek dan kredensial Anda ke dalam berbagai *Workspace* berwarna. Pindahkan item antar *Workspace* dengan mudah lewat fitur **Drag & Drop**!
- **🪄 Magic Launcher (Shift+F)** — Eksekusi perintah (seperti `lock`, `settings`, `lightmode`) atau cari kredensial Anda secepat kilat layaknya *Spotlight* / *Raycast*.
- **📅 Pengingat (Reminders) & Bookmarks Pintar** — Sematkan tautan penting atau atur pengingat kedaluwarsa domain/SSL. Reminders disajikan dalam desain *list-view* ala kalender yang sangat bersih di dasbor utama.
- **⏱️ Auto-Lock (Penguncian Otomatis)** — Workspace akan otomatis terkunci jika tidak ada aktivitas dalam waktu yang Anda tentukan (kustomisasi batas waktu dari Pengaturan).
- **📦 Ekspor & Impor Instan** — Bagikan *Workspace* secara aman melalui *file* berekstensi `.cvshare` terenkripsi dengan kode PIN sekali pakai, sehingga memudahkan kolaborasi antar tim.

## 🚀 Cara Menjalankan
1. Pastikan Anda memiliki server lokal (seperti **XAMPP / Laragon**) yang mendukung **PHP 7.4+**.
2. Kloning atau letakkan *folder* CoderVault di dalam direktori `htdocs` (atau `www`) Anda.
3. Akses `http://localhost/codervault/` (sesuaikan dengan nama folder Anda) melalui *browser* Anda.
4. Buat **Master PIN** (minimum 6 angka) pada saat pertama kali dijalankan.
5. Selesai! Ruang kerja pribadi Anda kini sudah terlindungi sepenuhnya.

---
*Untuk masukan, saran, atau Private Tech Support, silakan hubungi via email: **arielthekillers@gmail.com**.*
