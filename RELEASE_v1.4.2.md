# Lajurin v1.4.2

Rilis pemulihan routing Home untuk deployment di belakang reverse proxy Coolify.

## Perbaikan

- Host publik dibaca dari `Host`, `X-Forwarded-Host`, dan URL request.
- Nilai `X-Forwarded-Host` berantai dari reverse proxy dinormalisasi.
- `legaone.id` dan `www.legaone.id` tetap dikenali sebagai domain platform saat hostname internal container berbeda.
- Custom Domain merchant tetap diarahkan ke resolver domain seperti sebelumnya.

## Dampak deployment

- Tidak ada migration baru.
- Tidak ada perubahan schema atau data produksi.
- Tidak perlu mengubah PostgreSQL, public port, atau proxy global Coolify.
- `APP_URL=https://legaone.id` yang sudah terpasang tetap digunakan.
- Cukup push source ke branch `main`, lalu redeploy aplikasi satu kali.

## Pemeriksaan rilis

```bash
npm ci
npm run migrations:check
npm test
npm run lint
npm run typecheck
npm run build
```
