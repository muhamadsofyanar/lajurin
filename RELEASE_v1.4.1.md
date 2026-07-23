# Lajurin v1.4.1

Rilis pemulihan Home dan routing domain utama setelah deployment v1.4.0.

## Perbaikan utama

- `legaone.id` dan `www.legaone.id` tidak lagi diarahkan ke resolver Custom Domain merchant.
- Root `/` menampilkan Home Lajurin meskipun `APP_URL` produksi masih memakai hostname deployment lama.
- Alias platform tambahan dapat dimasukkan melalui `PLATFORM_HOSTNAMES`.

## Home baru

- Hero dan CTA pendaftaran/login.
- Preview visual dashboard.
- Ringkasan manfaat produk.
- Landing Page Builder, pembayaran, kursus, Workspace, broadcast, dan analitik.
- Alur penggunaan empat langkah.
- Model penggunaan untuk kursus, produk digital, serta komunitas/mentoring.
- Penjelasan kontrol data dan role.
- FAQ dan CTA penutup.
- Layout responsif untuk desktop, tablet, dan ponsel.

## Dampak deployment

- Tidak ada migration baru.
- Tidak ada perubahan schema atau data produksi.
- Tidak perlu membuka PostgreSQL ke publik.
- Tidak perlu mengubah feature flag.
- Cukup push source ke branch `main`, lalu redeploy aplikasi sekali.

## Pemeriksaan rilis

```bash
npm ci
npm run migrations:check
npm test
npm run lint
npm run typecheck
npm run build
```
