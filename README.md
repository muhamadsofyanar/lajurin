# Lajurin

MVP platform penjualan produk digital: dashboard merchant, halaman produk, checkout Xendit, webhook pembayaran, kursus, dan member area.

## Lokal

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
npm run db:seed
npm run dev
```

## Coolify

1. Buat repository Git dan hubungkan sebagai resource `Dockerfile` di Coolify.
2. Tambahkan PostgreSQL di project yang sama.
3. Isi environment variable:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
APP_URL=https://domain-anda.id
XENDIT_SECRET_KEY=xnd_development_atau_production_key
XENDIT_WEBHOOK_TOKEN=token_verifikasi_webhook_xendit
```

4. Exposed port: `3000`; health check: `/api/health`.
5. Deploy. Migration dijalankan otomatis sebelum server aktif.
6. Daftarkan akun merchant pertama melalui `/register`.
7. Di Xendit Dashboard, atur webhook **Payment Session – Completed** dan **Payment Session – Expired** ke:

```text
https://domain-anda.id/api/xendit/webhook
```

Gunakan Test Mode Xendit sampai seluruh skenario webhook berhasil.
