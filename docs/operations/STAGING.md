# Runbook Staging

## Tujuan

Staging memvalidasi perubahan dengan schema dan topologi yang mendekati produksi tanpa memakai pelanggan, credential, atau storage produksi.

## Syarat

- host, domain, database, volume, dan credential staging terpisah;
- data sintetis atau data yang sudah dianonimkan;
- provider pembayaran memakai sandbox atau dinonaktifkan;
- notifikasi eksternal dinonaktifkan secara default;
- akses dibatasi ke tim pengembangan.

## Deployment awal

1. Salin `.env.staging.example` menjadi file environment di secret manager server.
2. Buat kunci Server Actions Base64 32 byte yang khusus staging.
3. Isi `APP_URL` dengan domain HTTPS staging.
4. Jalankan `docker compose -f docker-compose.staging.yml config` dan pastikan tidak ada variabel wajib kosong.
5. Jalankan `docker compose -f docker-compose.staging.yml up -d --build`.
6. Pastikan `/api/health` mengembalikan HTTP 200.
7. Pastikan `/api/ready` mengembalikan HTTP 200.
8. Jalankan smoke test login, checkout manual, akses file, navigasi desktop, dan navigasi mobile.

## Larangan

- Jangan menghubungkan database atau volume produksi.
- Jangan mengimpor dump produksi tanpa proses anonimisasi yang disetujui.
- Jangan memakai webhook, API key, rekening, atau alamat email produksi.
- Jangan mempromosikan image ke produksi jika CI atau smoke test gagal.
