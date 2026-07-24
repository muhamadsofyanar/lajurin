# Cara Melanjutkan Rizqhub dari Akun ChatGPT Lain

## File yang diberikan ke akun baru

Unggah ZIP source rilis terbaru secara utuh. Jangan hanya mengunggah beberapa file yang berubah.

## Pesan pembuka yang dapat disalin

```text
Lanjutkan Rizqhub berdasarkan source final ini. Baca README_LANJUTKAN.md, PROJECT_STATUS.md, DEPLOYMENT.md, CHANGELOG.md, TESTING_CHECKLIST.md, RELEASE_v4.0.1.md, dan AGENTS.md. Versi aktif harus 4.0.1 dengan migration 0025. Pertahankan reservasi payout affiliate, pelepasan stok idempoten, dan normalisasi level verifikasi. Rilis wajib melewati migration database staging, test:db, provider sandbox, backup/restore drill, dan smoke test sebelum produksi. Jangan memperluas hak Staff ke finance, team, broadcast, atau domain. Draft builder tidak boleh mengubah publik sebelum publish. Broadcast wajib consent, antrean, batas, attempt log, dan retry maksimal tiga. Automatic payout dan automatic refund belum boleh diaktifkan.
```

## Cara memastikan source benar

Periksa hal berikut:

- `package.json` memiliki versi `4.0.1` atau lebih baru.
- Migration terbaru minimal `drizzle/0025_financial_integrity.sql`.
- `affiliate_commissions.payout_request_id` mengikat komisi ke payout tertentu.
- `orders.stock_released_at` mencegah pengembalian stok ganda.
- Ada `src/modules/workspace`, `src/platform/auth/workspace-context.ts`, dan `src/platform/feature-flags/workspace.ts`.
- Ada tabel `workspaces`, `workspaceMemberships`, `workspaceBranding`, `workspaceModules`, `workspaceDomains`, dan `legacyMerchantWorkspaceLinks`.
- Feature flag Workspace default nonaktif dan canary memakai UUID eksplisit.
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

`npm run baseline:check` hanya digunakan pada tag baseline historis `v1.0.1-baseline`. Untuk source aktif setelah baseline, quality gate menggunakan `npm run verify`; jangan memperbarui checksum baseline historis agar perubahan fitur tampak seolah-olah bagian dari baseline lama.

## Informasi deployment saat ini

- Domain: `https://legaone.id`
- Platform: Coolify
- Database: pertahankan PostgreSQL resource yang sudah dipakai (`lajurin-postgres` bila nama resource lama belum diubah)
- Persistent payment proof path: `/app/data/payment-proofs`
- Persistent commission proof path: `/app/data/commission-proofs`
- Persistent course file path: `/app/data/course-files`
- Persistent landing media path: `/app/data/landing-media`
- Persistent community media path: `/app/data/community-media`
- Integrasi notifikasi: StarSender + Mailketing melalui environment variable
- Migration dijalankan otomatis ketika container aplikasi mulai.
- Container health check memakai `/api/ready`; `/api/health` hanya liveness.

Jangan menyimpan password admin, kredensial database, token Xendit, token StarSender, token Mailketing, atau encryption key di dokumentasi/ZIP.
