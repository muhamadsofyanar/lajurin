# Kontrak Environment Rizqhub

## Wajib pada runtime

| Variabel | Aturan |
|---|---|
| `DEPLOYMENT_ENV` | `development`, `test`, `staging`, atau `production` |
| `DATABASE_URL` | URL PostgreSQL. Credential berbeda untuk setiap environment |
| `APP_URL` | URL absolut. Staging dan produksi wajib HTTPS |
| `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY` | Base64 yang menghasilkan tepat 32 byte. Stabil antardeploy |
| `MANUAL_BANK_NAME` | Tujuan transfer yang ditampilkan kepada pelanggan |
| `MANUAL_BANK_ACCOUNT` | Nomor rekening tujuan |
| `MANUAL_BANK_HOLDER` | Nama pemilik rekening |

## Opsional berpasangan

- `XENDIT_SECRET_KEY` dan `XENDIT_WEBHOOK_TOKEN` harus diisi bersama.
- Jika `NOTIFICATIONS_ENABLED=true`, isi `STARSENDER_API_KEY`, `MAILKETING_API_TOKEN`, dan `MAILKETING_FROM_EMAIL`.
- `MAILKETING_FROM_NAME` boleh memakai nilai bawaan `Rizqhub`.

## Aturan keamanan

1. Simpan secret pada secret manager deployment, bukan file Git.
2. Jangan menyalin credential produksi ke staging.
3. Jalankan `npm run config:check` sebelum build lokal.
4. Container menjalankan validasi strict sebelum migrasi dan startup.
5. Rotasi secret jika pernah muncul pada commit, log, screenshot, atau tiket.

Contoh lokal tersedia di `.env.example`. Contoh staging tersedia di `.env.staging.example` dan tetap harus diisi ulang sebelum dipakai.
