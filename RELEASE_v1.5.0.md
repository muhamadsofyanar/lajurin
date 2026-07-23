# Lajurin v1.5.0

Rilis kandidat ini menyelesaikan lima tahap Workspace, Landing Page Builder, Custom Domain, Broadcast, dan stabilisasi produksi pada source.

## Hasil utama

- Staff hanya memiliki capability `read` dan `manage`. Finance, anggota, broadcast, dan domain ditolak pada UI serta Server Action.
- Token undangan dan reset password sekali pakai aman terhadap request bersamaan.
- Draft builder, urutan section, dan media terpisah dari versi publik sampai tombol Publish dipakai.
- Custom Domain memeriksa TXT, CNAME, dan SSL sebelum routing merchant aktif.
- Checkout mencatat consent pemasaran opsional.
- Broadcast mendukung segmentasi produk/audience, template, antrean terkunci, batch, batas harian, log percobaan, dan retry maksimal tiga.
- Pusat operasional menampilkan kegagalan webhook serta backlog broadcast.
- Webhook Xendit menolak metode pembayaran salah dan timestamp masa depan.
- Backup PostgreSQL menghasilkan dump custom dan metadata SHA-256. Verifikasi backup membaca katalog arsip serta mencocokkan checksum.

## Migration

Migration `0016_five_stage_production.sql` bersifat aditif. Migration menambah metadata DNS/SSL, consent order, template dan antrean broadcast, attempt log, serta indeks operasional.

## Environment variable baru

```env
INTERNAL_JOB_SECRET=rahasia-acak-minimal-32-karakter
BROADCAST_BATCH_SIZE=20
BROADCAST_DAILY_RECIPIENT_LIMIT=500
```

Scheduler dapat memanggil `POST /api/jobs/broadcast` dengan header `Authorization: Bearer <INTERNAL_JOB_SECRET>`. Jadwal yang disarankan adalah satu kali per menit. Pengiriman manual per batch tetap tersedia dari halaman detail kampanye.

## Gate produksi

1. Backup database dan seluruh volume.
2. Terapkan migration pada clone staging.
3. Jalankan `npm run verify`.
4. Uji seluruh matriks role, terutama Staff.
5. Uji satu domain canary sampai TXT, CNAME, dan SSL aktif.
6. Uji Mailketing dan StarSender dengan penerima internal yang memberi consent.
7. Jalankan restore drill dan rekonsiliasi.
8. Rollout feature flag secara canary sebelum ALL.

Automatic payout dan automatic refund tidak termasuk rilis ini.
