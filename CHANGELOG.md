# Changelog

## 0.6.0 — 22 Juli 2026

### Ditambahkan

- Profil toko satu-per-merchant dengan identitas brand, slug publik, kontak, logo URL, dan warna.
- Etalase merchant publik di `/m/[slug]`.
- Editor landing page per produk dan landing page publik dengan hero, gambar, manfaat, sasaran peserta, CTA, kurikulum, harga, dan identitas merchant.
- Identitas merchant pada checkout, kartu kursus member, dan halaman belajar.
- Migration `0005_multi_merchant_landing.sql` yang juga membuat profil dasar untuk merchant lama.

### Diperjelas dan diamankan

- Dashboard merchant diberi label “Dashboard usaha” dan tetap difilter berdasarkan merchant yang login.
- “Kelas Saya” tetap satu area lintas merchant karena merupakan perpustakaan milik member, bukan dashboard penjual.
- Dashboard admin menampilkan agregat seluruh merchant.
- Aksi setujui/tolak transfer tetap hanya menggunakan `requireAdmin`; merchant tidak mendapat kontrol konfirmasi.
- Navigasi membedakan area Admin, Dashboard usaha, dan Kelas Saya.

## 0.5.0 — 22 Juli 2026

### Ditambahkan

- Integrasi WhatsApp StarSender melalui API key device.
- Integrasi email transaksional Mailketing melalui API token dan sender terverifikasi.
- Nomor WhatsApp wajib pada checkout baru.
- Notifikasi otomatis untuk pesanan dibuat, pembayaran disetujui, dan pembayaran ditolak.
- Template pesan dengan tautan pembayaran, unggah bukti, atau akses kelas sesuai konteks.
- Tabel log pengiriman dengan status, jumlah percobaan, response provider, dan detail error.
- Halaman ADMIN Integrasi dengan indikator konfigurasi, ringkasan, riwayat, dan kirim ulang.
- Migration `0004_glorious_vermin.sql`.

### Keamanan dan keandalan

- Token provider hanya dibaca dari environment variable dan tidak dikirim ke browser.
- Pengiriman dibuat idempoten per pesanan, kanal, dan event untuk mencegah duplikasi webhook.
- Timeout provider dibatasi 10 detik; kegagalan notifikasi tidak menggagalkan transaksi.
- Respons provider dibatasi ukurannya dan tidak mencatat header/token.

## 0.4.0 — 22 Juli 2026

### Ditambahkan

- Bab/modul course dengan tambah, edit, hapus, dan pengurutan.
- Penempatan lesson ke bab serta kelompok otomatis untuk lesson lama tanpa bab.
- Tampilan kurikulum per bab pada halaman produk dan ruang belajar member.
- Upload file pendamping privat: PDF, EPUB, ZIP, Office, dan TXT maksimal 15 MB.
- Endpoint download dengan verifikasi ADMIN, merchant pemilik, atau enrollment member.
- Persistent storage `/app/data/course-files` dan volume Docker Compose `course_files`.
- Migration `0003_course_modules_files.sql`.

### Diperbaiki

- File attachment ikut dibersihkan saat attachment atau lesson dihapus.
- Batas body Server Actions dinaikkan secukupnya untuk upload 15 MB.
- Dokumentasi deploy, testing, status, dan serah-terima diperbarui ke v0.4.0.

## 0.3.0 — 22 Juli 2026

### Ditambahkan

- Pemutar video tertanam untuk YouTube, Vimeo, Loom, MP4, WebM, dan OGG.
- Tampilan kelas dengan sidebar materi dan navigasi sebelumnya/berikutnya.
- Penyimpanan progres per member dan persentase progres di dashboard.
- Sertifikat penyelesaian yang dapat dicetak/disimpan sebagai PDF.
- Preview lesson gratis pada halaman produk.
- Edit, hapus, dan ubah urutan lesson oleh merchant.
- Migration `0002_left_power_pack.sql`.
- Dokumentasi status, deployment, testing, dan serah-terima lintas akun.
- `.env.example` dan `.gitignore`.

### Diperbaiki

- Video course tidak lagi selalu diarahkan ke tab eksternal.
- Fungsi format tanggal yang dibutuhkan komunitas ditambahkan kembali.
- Direktori bukti pembayaran dibuat dengan owner aplikasi pada image Docker.
- Build artifact `tsconfig.tsbuildinfo` dikeluarkan dari source distribution.

## 0.2.0 — v2

- Dashboard admin, merchant, dan member.
- Transfer manual, unggah bukti, serta konfirmasi admin.
- Komunitas dasar.
- Navigasi berbasis role.

## 0.1.0 — MVP awal

- Produk digital, course/lesson, autentikasi, checkout Xendit, webhook, Docker, dan PostgreSQL.
