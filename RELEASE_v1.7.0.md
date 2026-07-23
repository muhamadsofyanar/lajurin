# Rizqhub v1.7.0 — Universal Commerce

Rilis ini memperluas Rizqhub dari platform kursus menjadi platform commerce universal, tanpa mengubah fokusnya menjadi aplikasi khusus satu industri.

## Fitur utama

- Tiga tipe produk: kursus, produk digital, dan jasa.
- Katalog terpadu dengan duplikat, arsip, pulihkan, dan hapus aman.
- Upload file produk digital privat.
- Unduhan hanya untuk admin, merchant pemilik, atau pelanggan dengan pesanan lunas.
- Portal unduhan pelanggan.
- Form kebutuhan jasa yang dapat disusun merchant.
- Checklist onboarding merchant berdasarkan kondisi akun sebenarnya.
- Landing page dan toko publik memakai istilah sesuai tipe produk.
- Perbaikan daftar layanan dan label produk dari v1.6.1.

## Sebelum deploy di Coolify

Tambahkan persistent storage baru:

- Destination: `/app/data/digital-products`
- Source: kosong (biarkan Coolify membuat named volume)

Volume lama `/app/data/service-documents` harus tetap dipertahankan.

Setelah volume tersedia, upload source v1.7.0 dan tekan Deploy. Migrasi `0019_universal_commerce.sql` dijalankan otomatis saat container mulai.
