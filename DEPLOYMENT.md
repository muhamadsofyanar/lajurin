# Deployment Lajurin v0.6.0 di Coolify

## Sebelum redeploy

1. Buka resource PostgreSQL `lajurin-postgres` dan buat backup manual.
2. Pastikan backup berstatus berhasil sebelum melanjutkan.
3. Di aplikasi, pastikan `DATABASE_URL` masih menunjuk ke database yang sama.
4. Tambahkan persistent storage dengan mount path **`/app/data/payment-proofs`**.
5. Tambahkan persistent storage kedua dengan mount path **`/app/data/course-files`**.
6. Jangan gunakan `/app/uploads`; path tersebut berasal dari catatan versi lama.
7. Jangan menghapus, membuat ulang, atau me-restart PostgreSQL hanya untuk deploy source ini.

Kedua storage dapat memakai volume berbeda. Untuk **Volume Mount** di Coolify, isi nama volume dan Destination Path; Source Path dikosongkan.

## Environment variable wajib

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
APP_URL=https://legaone.id
MANUAL_BANK_NAME=BCA
MANUAL_BANK_ACCOUNT=nomor-rekening
MANUAL_BANK_HOLDER=nama-pemilik-rekening
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=base64-32-byte-yang-stabil
```

Jika Xendit digunakan:

```env
XENDIT_SECRET_KEY=xnd_development_atau_production_key
XENDIT_WEBHOOK_TOKEN=token-webhook
```

Untuk StarSender dan Mailketing:

```env
NOTIFICATIONS_ENABLED=true
STARSENDER_API_KEY=api-key-device-starsender
MAILKETING_API_TOKEN=token-api-mailketing
MAILKETING_FROM_NAME=Lajurin
MAILKETING_FROM_EMAIL=email-pengirim-yang-sudah-diverifikasi
```

Catatan:

- `STARSENDER_API_KEY` adalah API key **device** yang terhubung dan aktif, bukan password akun.
- `MAILKETING_FROM_EMAIL` harus persis dengan sender yang sudah diverifikasi di Mailketing.
- Jangan menambahkan tanda kutip jika nilai tidak memerlukannya.
- Jangan mengirim token melalui screenshot atau memasukkannya ke GitHub.
- `NOTIFICATIONS_ENABLED=false` menghentikan semua pengiriman tanpa menghapus konfigurasi.
- URL API sudah memakai endpoint resmi dan tidak perlu diisi manual.

Jangan menaruh nilai rahasia di GitHub, dokumentasi, atau screenshot publik.

## Membuat kunci Server Actions

Jalankan sekali pada komputer yang aman, lalu simpan hasilnya sebagai environment variable di Coolify:

```bash
openssl rand -base64 32
```

Gunakan nilai yang sama pada setiap redeploy/replica. Jangan menggantinya tanpa alasan karena browser pengguna yang masih memuat versi lama dapat gagal menjalankan aksi.

## Redeploy

1. Pastikan branch yang dipakai Coolify sudah memuat source v0.6.0.
2. Klik **Redeploy** pada aplikasi, bukan pada PostgreSQL.
3. Proses start menjalankan seluruh migration Drizzle secara otomatis sebelum server aktif.
4. Periksa log dan pastikan migration `0005_multi_merchant_landing` berhasil.
5. Pastikan health check `/api/health` berstatus healthy.
6. Login ADMIN dan buka `/admin/integrations`; StarSender dan Mailketing harus berstatus **Aktif**.

Tidak ada environment variable atau persistent storage baru pada v0.6.0. Migration membuat profil dasar untuk merchant lama. Setelah deploy, masing-masing merchant perlu login dan memperbarui **Dashboard usaha → Profil toko** agar nama brand serta alamat tokonya sesuai.

## Pembagian dashboard v0.6.0

- `/admin`: ringkasan seluruh platform; hanya ADMIN dapat mengonfirmasi transfer.
- `/dashboard`: dashboard usaha yang terisolasi untuk merchant yang login.
- `/member`: “Kelas Saya” milik pengguna; dapat berisi kursus dari beberapa merchant.
- `/m/[slug]`: profil/etalase publik satu merchant.
- `/p/[slug]`: landing page satu produk.

## Alur uji notifikasi

1. Gunakan nomor WhatsApp dan email milik sendiri sebagai pembeli uji.
2. Checkout satu produk melalui transfer manual.
3. Pastikan email dan WhatsApp “Pesanan dibuat” diterima.
4. Unggah bukti transfer uji.
5. Setujui melalui ADMIN dan pastikan dua pesan “Pembayaran disetujui” diterima.
6. Ulangi dengan pesanan lain lalu tolak buktinya untuk menguji pesan penolakan.
7. Buka menu **Integrasi** untuk memeriksa status dan error provider.

Pengujian awal tidak perlu memakai uang nyata. Gunakan transfer manual atau Xendit Test Mode.

## Jika upload bukti transfer gagal

Periksa:

- Mount path persis `/app/data/payment-proofs`.
- Source menyimpan bukti pada path tetap `/app/data/payment-proofs`.
- Storage dapat ditulis oleh UID/GID `1001:1001` yang menjalankan aplikasi.
- Storage tidak bersifat ephemeral.

## Jika upload file course gagal

Periksa:

- Mount path persis `/app/data/course-files`.
- Volume dapat ditulis oleh UID/GID `1001:1001`.
- Ukuran file tidak lebih dari 15 MB.
- Format file adalah PDF, EPUB, ZIP, DOC/DOCX, XLS/XLSX, PPT/PPTX, atau TXT.
- Reverse proxy Coolify tidak menetapkan batas upload di bawah 17 MB.

## Rollback

Jika aplikasi gagal setelah deploy:

1. Simpan log error.
2. Rollback source ke deployment v2 terakhir yang sehat.
3. Jangan menghapus tabel/kolom dari migration `0002`, `0003`, maupun `0004`; versi lama dapat mengabaikannya.
4. Pulihkan backup database hanya bila terbukti ada kerusakan data, bukan sebagai langkah pertama.
