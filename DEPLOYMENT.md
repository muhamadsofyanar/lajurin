# Deployment Lajurin v0.3.0 di Coolify

## Sebelum redeploy

1. Buka resource PostgreSQL `lajurin-postgres` dan buat backup manual.
2. Pastikan backup berstatus berhasil sebelum melanjutkan.
3. Di aplikasi, pastikan `DATABASE_URL` masih menunjuk ke database yang sama.
4. Tambahkan persistent storage dengan mount path **`/app/data/payment-proofs`**.
5. Jangan gunakan `/app/uploads`; path tersebut berasal dari catatan versi lama dan tidak dipakai source v0.3.0.
6. Jangan menghapus, membuat ulang, atau me-restart PostgreSQL hanya untuk deploy source ini.

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

Jangan menaruh nilai rahasia di GitHub, dokumentasi, atau screenshot publik.

## Membuat kunci Server Actions

Jalankan sekali pada komputer yang aman, lalu simpan hasilnya sebagai environment variable di Coolify:

```bash
openssl rand -base64 32
```

Gunakan nilai yang sama pada setiap redeploy/replica. Jangan menggantinya tanpa alasan karena browser pengguna yang masih memuat versi lama dapat gagal menjalankan aksi.

## Redeploy

1. Pastikan branch yang dipakai Coolify sudah memuat source v0.3.0.
2. Klik **Redeploy** pada aplikasi, bukan pada PostgreSQL.
3. Proses start menjalankan seluruh migration Drizzle secara otomatis sebelum server aktif.
4. Periksa log dan pastikan migration `0002_left_power_pack` berhasil.
5. Pastikan health check `/api/health` berstatus healthy.

## Jika upload bukti transfer gagal

Periksa:

- Mount path persis `/app/data/payment-proofs`.
- Source menyimpan bukti pada path tetap `/app/data/payment-proofs`.
- Storage dapat ditulis oleh UID/GID `1001:1001` yang menjalankan aplikasi.
- Storage tidak bersifat ephemeral.

## Rollback

Jika aplikasi gagal setelah deploy:

1. Simpan log error.
2. Rollback source ke deployment v2 terakhir yang sehat.
3. Jangan menghapus tabel `lesson_progress` atau kolom `is_preview`; v2 dapat mengabaikannya.
4. Pulihkan backup database hanya bila terbukti ada kerusakan data, bukan sebagai langkah pertama.
