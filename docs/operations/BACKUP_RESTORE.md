# Runbook Backup dan Restore PostgreSQL

## Prinsip

Backup belum dianggap valid sampai berhasil dipulihkan pada database terpisah dan lolos rekonsiliasi.

## Backup

Gunakan credential baca yang sesuai dan simpan hasil pada lokasi terenkripsi dengan retensi terbatas.

```bash
pg_dump --format=custom --no-owner --no-acl --dbname="$DATABASE_URL" --file=lajurin.backup
```

Source v1.5.0 menyediakan perintah yang membuat dump custom dan metadata SHA-256:

```bash
npm run ops:backup -- /path/backup-terpisah
npm run ops:backup:verify -- /path/backup-terpisah/lajurin-TIMESTAMP.dump
```

Host yang menjalankan perintah harus memiliki `pg_dump` dan `pg_restore` dengan
major version yang kompatibel dengan PostgreSQL server.

Catat waktu mulai, waktu selesai, ukuran file, checksum SHA-256, versi PostgreSQL, dan operator. Jangan commit file backup.

## Restore drill

1. Buat database drill yang kosong dan terisolasi.
2. Pulihkan backup ke database drill.
3. Jalankan pemeriksaan schema dan query rekonsiliasi.
4. Jalankan aplikasi staging terhadap database drill.
5. Verifikasi `/api/ready`, login, order, enrollment, ledger, dan file reference.
6. Catat Recovery Time Objective aktual dan jumlah record utama.
7. Hapus database drill mengikuti kebijakan retensi setelah bukti disimpan.

```bash
pg_restore --clean --if-exists --no-owner --no-acl --dbname="$DRILL_DATABASE_URL" lajurin.backup
```

## Rekonsiliasi minimum

- jumlah `users`, `merchant_profiles`, `products`, `orders`, dan `enrollments` sama;
- total nominal order per status sama;
- total ledger per merchant sama;
- tidak ada foreign key invalid;
- migration journal sama dengan sumber;
- referensi storage terpilih dapat dibuka dari staging.

Restore drill wajib dilakukan oleh operator yang memiliki akses server. Dokumen ini tidak membuktikan bahwa drill sudah dijalankan.
