# Cara Melanjutkan Lajurin dari Akun ChatGPT Lain

## File yang diberikan ke akun baru

Unggah ZIP source rilis terbaru secara utuh. Jangan hanya mengunggah beberapa file yang berubah.

## Pesan pembuka yang dapat disalin

```text
Lanjutkan pengembangan Lajurin berdasarkan source ZIP ini. Baca terlebih dahulu README_LANJUTKAN.md, PROJECT_STATUS.md, DEPLOYMENT.md, CHANGELOG.md, TESTING_CHECKLIST.md, dan AGENTS.md. Versi terakhir seharusnya 0.6.0. Jangan mulai dari ZIP MVP lama dan jangan menghapus fitur yang sudah ada. Sebelum mengubah kode, cocokkan package.json, migration terakhir, serta fitur admin/member/transfer manual/komunitas/e-course/modul/file terlindungi/integrasi notifikasi/profil merchant/landing page. Konfirmasi transfer hanya ADMIN. Dashboard usaha harus terisolasi per merchant, sedangkan Kelas Saya boleh menggabungkan pembelian member dari beberapa merchant. Tahap berikut yang direkomendasikan adalah Komunitas dan Inbox v0.7.0. Setiap rilis baru wajib memperbarui lima dokumen serah-terima dan CHANGELOG.
```

## Cara memastikan source benar

Periksa hal berikut:

- `package.json` memiliki versi `0.6.0` atau lebih baru.
- Migration terbaru minimal `drizzle/0005_multi_merchant_landing.sql`.
- Ada tabel `lessonProgress` pada `src/lib/schema.ts`.
- Ada `src/components/video-player.tsx`.
- Ada tabel `courseModules` dan `lessonAttachments` pada `src/lib/schema.ts`.
- Ada `src/app/api/course-file/[attachmentId]/route.ts`.
- Ada `src/lib/notifications.ts` dan `src/app/admin/integrations/page.tsx`.
- Ada tabel `notificationDeliveries` dan kolom `orders.customerPhone`.
- Ada tabel `merchantProfiles` dan `productLandingPages`.
- Ada halaman `/dashboard/profile`, `/dashboard/products/[id]/landing`, dan `/m/[slug]`.
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
- Integrasi notifikasi: StarSender + Mailketing melalui environment variable
- Migration dijalankan otomatis ketika container aplikasi mulai.

Jangan menyimpan password admin, kredensial database, token Xendit, token StarSender, token Mailketing, atau encryption key di dokumentasi/ZIP.
