# Cara Melanjutkan Lajurin dari Akun ChatGPT Lain

## File yang diberikan ke akun baru

Unggah ZIP source rilis terbaru secara utuh. Jangan hanya mengunggah beberapa file yang berubah.

## Pesan pembuka yang dapat disalin

```text
Lanjutkan pengembangan Lajurin berdasarkan source ZIP ini. Baca terlebih dahulu README_LANJUTKAN.md, PROJECT_STATUS.md, DEPLOYMENT.md, CHANGELOG.md, TESTING_CHECKLIST.md, dan AGENTS.md. Versi terakhir seharusnya 0.3.0. Jangan mulai dari ZIP MVP lama dan jangan menghapus fitur yang sudah ada. Sebelum mengubah kode, cocokkan package.json, migration terakhir, serta fitur admin/member/transfer manual/komunitas/e-course. Tahap berikut yang direkomendasikan adalah File Materi Terlindungi + Modul/Bab. Setiap rilis baru wajib memperbarui lima dokumen serah-terima dan CHANGELOG.
```

## Cara memastikan source benar

Periksa hal berikut:

- `package.json` memiliki versi `0.3.0` atau lebih baru.
- Migration terbaru minimal `drizzle/0002_left_power_pack.sql`.
- Ada tabel `lessonProgress` pada `src/lib/schema.ts`.
- Ada `src/components/video-player.tsx`.
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
- Migration dijalankan otomatis ketika container aplikasi mulai.

Jangan menyimpan password admin, kredensial database, token Xendit, atau encryption key di dokumentasi/ZIP.
