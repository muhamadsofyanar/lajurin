# Changelog

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
