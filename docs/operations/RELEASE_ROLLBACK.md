# Release dan Rollback

## Sebelum release

- CI pada commit target lulus.
- Migration divalidasi pada database kosong dan salinan legacy.
- Backup terbaru tersedia dan restore drill masih berlaku.
- Perubahan schema bersifat aditif.
- Smoke test staging lulus.
- Owner, waktu release, indikator kegagalan, dan keputusan rollback ditetapkan.

## Release

1. Rekam commit SHA dan image digest.
2. Ambil backup sesuai runbook.
3. Deploy satu versi aplikasi pada staging dan selesaikan smoke test.
4. Deploy ke produksi pada jendela yang disetujui.
5. Pantau readiness, error rate, latency, checkout, webhook, dan ledger.
6. Catat hasil dan keputusan go atau rollback.

## Rollback aplikasi

Deploy kembali image digest sebelumnya. Karena M1 memakai migrasi aditif, rollback aplikasi tidak memerlukan penghapusan tabel atau kolom baru.

## Rollback data

Jangan menjalankan reverse migration destruktif otomatis. Jika perubahan data salah:

1. hentikan writer terkait;
2. pertahankan bukti dan audit log;
3. jalankan skrip kompensasi yang telah ditinjau;
4. pulihkan backup hanya jika kompensasi tidak aman;
5. rekonsiliasi transaksi sebelum membuka traffic kembali.

Rollback dianggap selesai setelah readiness sehat dan transaksi kritis lolos verifikasi.
