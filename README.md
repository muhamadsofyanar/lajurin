# Lajurin v0.6.0

Platform penjualan produk digital berbasis Next.js, PostgreSQL, dan Drizzle ORM.

## Fitur

- Dashboard administrator: statistik global, transaksi terbaru, dan antrean konfirmasi transfer.
- Dashboard merchant: produk, omzet, transaksi, serta status pembayaran.
- Dashboard member: kursus aktif, pesanan yang perlu ditindaklanjuti, dan akses komunitas.
- Isolasi multi-merchant: setiap dashboard usaha hanya membaca produk dan transaksi merchant yang login.
- Profil toko merchant dengan URL publik `/m/[slug]`, identitas brand, kontak, dan etalase produk.
- Editor landing page per produk untuk hero, gambar, manfaat, sasaran peserta, CTA, dan warna.
- Kelas member menampilkan merchant pemilik; satu member tetap dapat mengakses pembelian dari beberapa merchant dalam satu area belajar.
- Checkout Xendit dan transfer bank manual.
- Unggah bukti transfer privat; hanya customer, merchant terkait, dan admin yang dapat membukanya.
- Persetujuan admin otomatis membuat enrollment dan membuka akses kursus.
- Komunitas eksklusif dengan postingan, komentar, dan fitur sematkan postingan bagi pengelola.
- E-course dengan video tertanam (YouTube, Vimeo, Loom, MP4/WebM/OGG), sidebar materi, navigasi, dan progres belajar.
- Bab/modul bertingkat untuk mengelompokkan lesson dan mengatur urutan kurikulum.
- File materi privat (PDF, EPUB, ZIP, Office, dan TXT) yang hanya dapat diunduh pemilik kelas, member terdaftar, atau admin.
- Preview materi gratis, pengelolaan urutan materi, serta sertifikat setelah progres 100%.
- Notifikasi transaksi otomatis melalui WhatsApp StarSender dan email Mailketing.
- Dashboard integrasi admin dengan status provider, log pengiriman, error, dan kirim ulang.
- Halaman produk, materi kursus, autentikasi cookie, webhook Xendit, Docker, dan health check.

## Dokumentasi proyek

- `PROJECT_STATUS.md` — status versi, fitur selesai, dan backlog.
- `DEPLOYMENT.md` — backup, environment variable, migration, storage, dan redeploy Coolify.
- `CHANGELOG.md` — riwayat perubahan per versi.
- `TESTING_CHECKLIST.md` — pengujian admin, merchant, dan member.
- `README_LANJUTKAN.md` — instruksi ketika melanjutkan lewat akun ChatGPT lain.

## Menjalankan secara lokal

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

`SEED_ADMIN_PASSWORD` wajib diisi minimal 12 karakter sebelum menjalankan seed.

## Environment variable

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
APP_URL=https://domain-anda.id

# Opsional jika checkout gateway diaktifkan
XENDIT_SECRET_KEY=xnd_development_atau_production_key
XENDIT_WEBHOOK_TOKEN=token_verifikasi_webhook_xendit

# Notifikasi transaksi
NOTIFICATIONS_ENABLED=true
STARSENDER_API_KEY=api-key-device-starsender
MAILKETING_API_TOKEN=token-api-mailketing
MAILKETING_FROM_NAME=Lajurin
MAILKETING_FROM_EMAIL=sender-terverifikasi@domain-anda.id

# Tujuan transfer manual
MANUAL_BANK_NAME=BCA
MANUAL_BANK_ACCOUNT=1234567890
MANUAL_BANK_HOLDER=PT Lajurin Indonesia

# Akun administrator pertama
SEED_ADMIN_EMAIL=admin@lajurin.id
SEED_ADMIN_PASSWORD=password-kuat-minimal-12-karakter

# Stabilkan Server Actions saat redeploy
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=base64-32-byte
```

## Alur transfer manual

1. Pembeli memilih **Transfer bank — konfirmasi manual** pada checkout.
2. Pembeli mentransfer nominal yang tampil lalu mengunggah bukti pembayaran.
3. Status pesanan berubah menjadi **Menunggu konfirmasi**.
4. Hanya admin platform yang dapat membuka **Admin → Konfirmasi pembayaran**, memeriksa bukti, lalu menyetujui atau menolak. Merchant dapat melihat status transaksi miliknya, tetapi tidak dapat mengubah keputusan pembayaran.
5. Jika disetujui, status menjadi **Lunas** dan kursus langsung muncul pada dashboard member.

Bukti disimpan di `/app/data/payment-proofs`. Pada Docker Compose, direktori tersebut sudah memakai volume `payment_proofs`, sehingga berkas tetap tersedia setelah container dibuat ulang. Untuk deployment non-Compose, pasang persistent volume ke direktori yang sama.

File pendamping course disimpan terpisah di `/app/data/course-files` dan memakai volume `course_files`. Batas satu file adalah 15 MB. Jangan menaruh kedua folder tersebut di repository GitHub.

## Xendit

Di Xendit Dashboard, atur webhook **Payment Session – Completed** dan **Payment Session – Expired** ke:

```text
https://domain-anda.id/api/xendit/webhook
```

Gunakan Test Mode sampai seluruh skenario webhook berhasil. Jika kredensial Xendit belum tersedia, pengguna tetap dapat menyelesaikan pembelian melalui transfer manual.

## Deployment Docker/Coolify

1. Hubungkan repository sebagai resource Dockerfile.
2. Tambahkan PostgreSQL dan isi seluruh environment variable yang diperlukan.
3. Pasang persistent volume ke `/app/data/payment-proofs` (bukan `/app/uploads`).
4. Pasang persistent volume kedua ke `/app/data/course-files` untuk PDF/ebook/file bonus.
5. Exposed port: `3000`; health check: `/api/health`.
6. Deploy. Migrasi dijalankan otomatis sebelum aplikasi aktif.
7. Jalankan seed sekali untuk membuat atau memperbarui akun admin.
8. Buka menu ADMIN → Integrasi dan pastikan kedua provider berstatus Aktif.

## Pemeriksaan sebelum rilis

```bash
npm run lint
npm run typecheck
npm run build
```
