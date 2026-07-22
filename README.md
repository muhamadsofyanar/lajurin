# Lajurin v1.3.0

Platform penjualan produk digital berbasis Next.js, PostgreSQL, dan Drizzle ORM.

## Fitur

- Dashboard administrator: statistik global, transaksi terbaru, dan antrean konfirmasi transfer.
- Dashboard merchant: produk, omzet, transaksi, serta status pembayaran.
- Dashboard member: kursus aktif, pesanan yang perlu ditindaklanjuti, dan akses komunitas.
- Isolasi multi-merchant: setiap dashboard usaha hanya membaca produk dan transaksi merchant yang login.
- Profil toko merchant dengan URL publik `/m/[slug]`, identitas brand, kontak, dan etalase produk.
- Editor landing page dengan tiga template, upload media, hero video, pengajar, bonus, testimoni, FAQ, jaminan, promo, dan pixel.
- Kelas member menampilkan merchant pemilik; satu member tetap dapat mengakses pembelian dari beberapa merchant dalam satu area belajar.
- Checkout Xendit dan transfer bank manual.
- Unggah bukti transfer privat; hanya customer, merchant terkait, dan admin yang dapat membukanya.
- Persetujuan admin otomatis membuat enrollment dan membuka akses kursus.
- Komunitas scoped umum/merchant/produk dengan gambar privat, reaction, komentar, laporan, dan moderasi berbasis kepemilikan.
- Inbox merchant–member per produk, status belum dibaca, dan pusat notifikasi dalam aplikasi.
- Menu Pelanggan dengan segmentasi progres serta automation pembayaran lunas/kelas selesai melalui StarSender dan Mailketing.
- E-course dengan video tertanam (YouTube, Vimeo, Loom, MP4/WebM/OGG), sidebar materi, navigasi, dan progres belajar.
- Bab/modul bertingkat untuk mengelompokkan lesson dan mengatur urutan kurikulum.
- File materi privat (PDF, EPUB, ZIP, Office, dan TXT) yang hanya dapat diunduh pemilik kelas, member terdaftar, atau admin.
- Preview materi gratis, pengelolaan urutan materi, serta sertifikat setelah progres 100%.
- Notifikasi transaksi otomatis melalui WhatsApp StarSender dan email Mailketing.
- Dashboard integrasi admin dengan status provider, log pengiriman, error, dan kirim ulang.
- Fondasi bisnis multi-merchant: aktivasi/penangguhan merchant, komisi default atau khusus, snapshot fee per transaksi, saldo berbasis ledger, rekening payout, permintaan pencairan, dan verifikasi payout oleh admin.
- Pusat operasional admin untuk merchant, member, produk, transaksi lintas merchant, ekspor CSV, payout, pengaturan keuangan, dan audit log.
- Sales funnel merchant: kupon, order bump satu transaksi, rekomendasi upsell/downsell, UTM, serta dashboard conversion rate dan atribusi kampanye.
- Halaman produk, materi kursus, autentikasi cookie, webhook Xendit, Docker, dan health check.
- Production readiness: rate limit, validasi signature upload, security headers, log webhook, readiness check, refund penuh tercatat, dan pusat operasional admin.
- Feature flag berbasis database dengan mode nonaktif, canary per User ID, atau aktif untuk semua tanpa redeploy.
- Workspace team management dengan peran Owner, Admin, Finance, dan Staff serta proteksi owner terakhir.
- Pelunasan tagihan komisi: rekening platform, upload bukti privat, antrean admin, audit log, dan pengurangan piutang atomik.
- Landing Page Builder terpusat untuk mengelola seluruh halaman penjualan merchant.
- Laporan penjualan berperiode dengan ringkasan bruto, net, komisi, metode pembayaran, performa produk, dan ekspor CSV aman.

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
2. Jika merchant mengaktifkan rekening penerimaan manual, pembeli mentransfer langsung ke rekening merchant. Jika belum, rekening platform dari `MANUAL_BANK_*` tetap menjadi fallback.
3. Tujuan transfer disimpan sebagai snapshot pada pesanan, sehingga perubahan rekening tidak mengubah transaksi lama.
4. Transfer langsung ditinjau merchant pemilik produk. Admin dapat override dengan alasan yang tercatat. Transfer ke rekening platform tetap hanya ditinjau admin.
5. Jika disetujui, status menjadi **Lunas** dan kursus langsung muncul pada dashboard member.
6. Transfer platform mengkredit saldo payout merchant. Transfer langsung tidak mengkredit payout; komisi platform dicatat sebagai piutang merchant secara idempoten.

## Alur payout merchant

1. Admin mengaktifkan merchant dan menentukan komisi default atau khusus.
2. Merchant menyimpan rekening di **Dashboard usaha → Saldo & payout**.
3. Setelah saldo mencapai minimum, merchant mengajukan nominal payout.
4. Saldo langsung dicadangkan agar tidak dapat diajukan dua kali.
5. Admin mentransfer di bank lalu mengisi referensi dan menandai payout dibayar.
6. Jika ditolak, saldo otomatis dikembalikan ke ledger merchant.

Nilai awal yang aman adalah komisi 0% dan minimum payout Rp100.000. Admin perlu menetapkan komisi bisnis yang diinginkan sebelum menerima penjualan baru; perubahan hanya berlaku pada transaksi berikutnya.

Bukti disimpan di `/app/data/payment-proofs`. Pada Docker Compose, direktori tersebut sudah memakai volume `payment_proofs`, sehingga berkas tetap tersedia setelah container dibuat ulang. Untuk deployment non-Compose, pasang persistent volume ke direktori yang sama.

File pendamping course disimpan di `/app/data/course-files`, media landing page di `/app/data/landing-media`, dan gambar komunitas di `/app/data/community-media`. Ketiganya memakai volume persisten terpisah. Batas file course 15 MB, sedangkan cover/foto landing page dan gambar komunitas 5 MB. Jangan menaruh keempat folder data—termasuk bukti pembayaran—di repository GitHub.

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
5. Pasang persistent volume ketiga ke `/app/data/landing-media` untuk cover dan foto pengajar.
6. Pasang persistent volume keempat ke `/app/data/community-media` untuk gambar post komunitas.
7. Exposed port: `3000`; liveness: `/api/health`; health check container: `/api/ready`.
8. Deploy. Migrasi dijalankan otomatis sebelum aplikasi aktif.
9. Jalankan seed sekali untuk membuat atau memperbarui akun admin.
10. Buka menu ADMIN → Integrasi dan pastikan kedua provider berstatus Aktif.

## Pemeriksaan sebelum rilis

```bash
npm run test
npm run lint
npm run typecheck
npm run build
```

Untuk membuat manifest hash seluruh file persistent storage setelah backup/restore:

```bash
npm run ops:storage-manifest
```
