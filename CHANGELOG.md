# Changelog

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
