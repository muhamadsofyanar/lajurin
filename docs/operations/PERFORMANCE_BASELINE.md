# Baseline Performa M0

**Status:** Menunggu pengukuran pada staging sehat

## Route yang diukur

| Route atau alur | Indikator |
|---|---|
| Login | p50, p95, error rate |
| Dashboard merchant | p50, p95, error rate |
| Halaman produk publik | p50, p95, error rate |
| Submit checkout | p50, p95, error rate, duplicate rate |
| Webhook Xendit | p50, p95, error rate, retry rate |
| Akses course | p50, p95, error rate |

## Protokol

1. Ukur pada staging dengan build release dan data sintetis representatif.
2. Lakukan warm-up sebelum pencatatan.
3. Gunakan beban, durasi, concurrency, dan region yang sama pada M0 dan M1.
4. Pisahkan error aplikasi dari timeout jaringan dan error provider.
5. Simpan timestamp, commit SHA, spesifikasi host, ukuran database, dan tool pengukuran.

Jangan mengisi angka dari laptop lokal lalu menyebutnya baseline produksi. Hasil baru sah setelah staging dan dataset uji ditetapkan.
