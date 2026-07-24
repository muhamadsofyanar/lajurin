# Rizqhub v4.0.1 — Financial Integrity & Security Fix

Patch ini memperbaiki risiko transaksi yang ditemukan setelah audit v4.0.0.

## Perbaikan

- Payout affiliate mencadangkan komisi secara atomik dan hanya menyelesaikan
  komisi yang terikat ke permintaan tersebut.
- Payout yang ditolak mengembalikan komisi ke saldo tersedia.
- Stok paket dikembalikan secara idempoten ketika pembuatan payment session
  Xendit gagal atau webhook menyatakan order kedaluwarsa.
- Data level verifikasi legacy `VERIFIED` dinormalisasi menjadi `IDENTITY`.
- Dependensi Next.js, PostCSS, dan Sharp diperbarui hingga dependency audit
  produksi tidak menemukan vulnerability.
- CI menjalankan test integrasi PostgreSQL untuk dua invariant transaksi kritis.

## Database

Migration baru: `0025_financial_integrity.sql`.

Migration bersifat aditif dan tidak menghapus transaksi, komisi, payout, produk,
atau akun. Stok historis yang pernah bocor sebelum v4.0.1 tidak diubah otomatis
karena source tidak memiliki bukti yang cukup untuk membedakan koreksi manual
dari stok yang benar-benar perlu dikembalikan.

## Sebelum produksi

1. Backup database dan seluruh persistent volume.
2. Jalankan migration pada staging.
3. Jalankan `npm run migrations:test` dan `npm run test:db`.
4. Uji Xendit completed, expired, dan kegagalan pembuatan session.
5. Uji payout affiliate ditolak dan dibayar.
6. Jalankan `npm run verify` serta smoke test browser.
