# Checklist Migration

- [ ] Perubahan memiliki alasan bisnis dan owner.
- [ ] Migration bersifat aditif untuk tahap expand.
- [ ] SQL telah ditinjau untuk lock, full table scan, default, dan index build.
- [ ] Tidak menghapus atau mengganti nama tabel atau kolom yang masih dipakai.
- [ ] Backfill dapat dilanjutkan dan aman dijalankan ulang.
- [ ] Setiap dual-write memiliki rekonsiliasi dan batas waktu penghapusan.
- [ ] `npm run migrations:check` lulus.
- [ ] `npm run migrations:test` lulus pada database kosong.
- [ ] Fixture legacy berhasil dimigrasikan dan direkonsiliasi.
- [ ] Backup dan rollback operasional tersedia.
- [ ] Log tidak mengandung secret atau data pribadi.
- [ ] Exit criteria dan bukti hasil dilampirkan pada PR.
