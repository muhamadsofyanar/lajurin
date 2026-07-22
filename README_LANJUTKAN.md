# Cara Melanjutkan Lajurin dari Akun ChatGPT Lain

## File yang diberikan ke akun baru

Unggah ZIP source rilis terbaru secara utuh. Jangan hanya mengunggah beberapa file yang berubah.

## Pesan pembuka yang dapat disalin

```text
Lanjutkan Lajurin berdasarkan source final ini. Baca README_LANJUTKAN.md, PROJECT_STATUS.md, DEPLOYMENT.md, CHANGELOG.md, TESTING_CHECKLIST.md, dan AGENTS.md. Versi terakhir seharusnya 1.0.1 dengan migration 0010. Jangan mulai dari ZIP MVP/v0.9 lama dan jangan menghapus fitur yang sudah ada. Konfirmasi transfer, payout, serta pencatatan refund hanya ADMIN. Dashboard usaha wajib terisolasi per merchant; Kelas Saya boleh menggabungkan kursus lintas merchant; inbox/komunitas wajib memeriksa ownership/enrollment. Webhook dan refund harus memakai lock pesanan dan tetap idempoten. Tahap berikut adalah validasi staging serta rollout final, bukan menambah fitur sebelum alur kritis lolos. Setiap rilis baru wajib memperbarui dokumen serah-terima.
```

## Cara memastikan source benar

Periksa hal berikut:

- `package.json` memiliki versi `1.0.0` atau lebih baru.
- Migration terbaru minimal `drizzle/0010_v100_production_readiness.sql`.
- Ada tabel `lessonProgress` pada `src/lib/schema.ts`.
- Ada `src/components/video-player.tsx`.
- Ada tabel `courseModules` dan `lessonAttachments` pada `src/lib/schema.ts`.
- Ada `src/app/api/course-file/[attachmentId]/route.ts`.
- Ada `src/lib/notifications.ts` dan `src/app/admin/integrations/page.tsx`.
- Ada tabel `notificationDeliveries` dan kolom `orders.customerPhone`.
- Ada tabel `merchantProfiles` dan `productLandingPages`.
- Ada halaman `/dashboard/profile`, `/dashboard/products/[id]/landing`, dan `/m/[slug]`.
- Ada tabel `merchantLedgerEntries`, `merchantPayouts`, `platformSettings`, dan `auditLogs`.
- Ada halaman `/dashboard/finance`, `/admin/merchants`, `/admin/transactions`, `/admin/payouts`, dan `/admin/settings`.
- Ada tabel `coupons`, `productFunnels`, `analyticsEvents`, dan `couponRedemptions`.
- Ada halaman `/dashboard/products/[id]/funnel`, `/dashboard/analytics`, route `/api/analytics`, dan route `/api/landing-media/[storageKey]`.
- Ada tabel `communitySpaces`, `communityReactions`, `communityReports`, `conversations`, `conversationMessages`, `inAppNotifications`, `automationRules`, dan `automationDeliveries`.
- Ada halaman `/inbox`, `/notifications`, `/dashboard/customers`, `/dashboard/automation`, serta route `/api/community-media/[postId]`.
- Ada tabel `webhookEvents` dan `rateLimits`, route `/api/ready`, halaman `/admin/operations`, serta automated test pada folder `tests`.
- Ada fitur dashboard admin/member, transfer manual, dan komunitas.

Jika salah satu tanda tersebut tidak ada, kemungkinan ZIP yang digunakan adalah source lama. Hentikan perubahan dan minta source terbaru.

## Aturan rilis berikutnya

1. Naikkan versi di `package.json` dan `package-lock.json`.
2. Tambahkan migration baru; jangan mengubah migration yang sudah pernah dideploy.
3. Perbarui `PROJECT_STATUS.md` dan `CHANGELOG.md`.
4. Perbarui `DEPLOYMENT.md` jika ada environment variable, storage, migration, atau langkah server baru.
5. Perbarui `TESTING_CHECKLIST.md` untuk fitur baru.
6. Perbarui file ini jika prioritas tahap berikut berubah.
7. Jalankan `npm ci`, `npm run lint`, `npm run typecheck`, dan `npm run build`.
8. Kemas source tanpa `.git`, `node_modules`, `.next`, `.env`, log, upload pengguna, dan build cache.

## Informasi deployment saat ini

- Domain: `https://legaone.id`
- Platform: Coolify
- Database: PostgreSQL resource `lajurin-postgres`
- Persistent payment proof path: `/app/data/payment-proofs`
- Persistent course file path: `/app/data/course-files`
- Persistent landing media path: `/app/data/landing-media`
- Persistent community media path: `/app/data/community-media`
- Integrasi notifikasi: StarSender + Mailketing melalui environment variable
- Migration dijalankan otomatis ketika container aplikasi mulai.
- Container health check memakai `/api/ready`; `/api/health` hanya liveness.

Jangan menyimpan password admin, kredensial database, token Xendit, token StarSender, token Mailketing, atau encryption key di dokumentasi/ZIP.
