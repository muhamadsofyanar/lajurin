# Rizqhub v1.6.0 — Service Commerce Foundation

Tanggal kandidat: 23 Juli 2026

## Hasil

- Produk dapat bertipe `COURSE` atau `SERVICE`; produk lama otomatis tetap `COURSE`.
- Checkout produk jasa otomatis membuat kasus layanan privat.
- Konfirmasi pembayaran manual dan webhook Xendit membuka tahap pengumpulan dokumen.
- Merchant memperoleh pusat Layanan, status operasional, target, penanggung jawab, catatan internal, dan pembaruan klien.
- Klien memperoleh portal privat untuk formulir kebutuhan, upload persyaratan, progres, serta dokumen hasil.
- Dokumen PDF/JPG/PNG maksimal 10 MB disimpan pada storage privat baru.
- Akses unduhan dibatasi untuk admin, tim merchant terkait, klien penerima, atau pengunggah dokumen.
- Semua perubahan schema berada pada migration aditif `0018_service_commerce_foundation.sql`.

## Deployment

Tambahkan persistent storage Coolify:

`/app/data/service-documents`

Source ini belum mengganti atau mengaktifkan Xendit. Transfer manual tetap dapat digunakan selama verifikasi Xendit berlangsung.
