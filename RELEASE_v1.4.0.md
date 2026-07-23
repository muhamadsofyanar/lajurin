# Lajurin v1.4.0

Rilis ini melanjutkan pemulihan Workspace v1.3.1 dan menyelesaikan alur akun tim, Landing Page Builder visual, Custom Domain, serta Broadcast pelanggan dan abandoned checkout.

## Perubahan utama

- Undangan anggota tim melalui tautan aman dengan masa berlaku tujuh hari.
- Anggota baru menentukan password sendiri; akun yang sudah ada cukup login dan menerima undangan.
- Owner dapat mengubah peran, menonaktifkan, mengaktifkan, atau menghapus anggota tanpa menghapus akun Lajurin-nya.
- Lupa/reset password dengan token sekali pakai, kedaluwarsa satu jam, dan pencabutan semua sesi lama.
- Hak akses Owner, Admin, Finance, dan Staff diterapkan pada halaman dan action merchant.
- Landing Page Builder visual dengan live preview desktop/mobile, urutan section, draft, dan publish terpisah.
- Custom Domain dengan verifikasi TXT dan pemetaan hostname publik.
- Broadcast email/WhatsApp untuk pelanggan berbayar atau checkout terbengkalai, berikut histori pengiriman.
- Migration `0015_team_accounts_visual_builder.sql` bersifat aditif dan dijalankan otomatis saat aplikasi mulai.

## Feature flag

- `WORKSPACE_TEAMS`: gunakan setelah migration selesai.
- `LANDING_PAGE_BUILDER`: dapat diaktifkan untuk canary lalu semua pengguna.
- `CUSTOM_DOMAINS`: default `OFF`; aktifkan setelah DNS dan domain HTTPS dikonfigurasi di Coolify.
- `CUSTOMER_BROADCASTS`: default `OFF`; aktifkan setelah Mailketing dan/atau StarSender diuji.

## Urutan aktivasi yang disarankan

1. Landing Page Builder.
2. Workspace & Tim.
3. Custom Domain pada satu merchant canary.
4. Broadcast pada satu merchant canary.

## Catatan konfigurasi

- Email undangan dan reset password membutuhkan konfigurasi Mailketing aktif. Jika Mailketing belum aktif, Owner masih dapat menyalin tautan undangan dari halaman Tim, tetapi email reset password tidak dapat dikirim.
- Custom Domain membutuhkan record TXT verifikasi, record CNAME, dan domain yang sama ditambahkan pada resource aplikasi Coolify agar HTTPS tersedia.
- Tidak perlu membuka PostgreSQL ke publik, menjalankan backfill manual, atau redeploy database.

## Batasan rilis

Automatic payout dan refund belum diaktifkan. Data pembayaran lama menyimpan identitas sesi/pembayaran yang belum cukup untuk refund berbasis Payment Request, sedangkan payout otomatis membutuhkan data penerima, routing, idempotensi, webhook, dan rekonsiliasi. Alur keuangan tetap manual sampai integrasi tersebut dilengkapi dan diuji di mode test provider.

## Pemeriksaan rilis

Jalankan sebelum deployment:

```bash
npm ci
npm run migrations:check
npm test
npm run lint
npm run typecheck
npm run build
```
