# Observability Minimum M0

## Yang sudah tersedia pada baseline

- `/api/health` untuk liveness tanpa query database;
- `/api/ready` untuk database, konfigurasi, dan storage;
- log JSON melalui `logEvent`;
- request ID pada webhook Xendit;
- audit log dan halaman operasi untuk event kritis tertentu.

## Gap yang belum boleh dianggap selesai

- request ID belum konsisten pada seluruh request dan response;
- belum ada agregasi terpusat untuk p50, p95, dan error rate;
- belum ada alert berbasis Service Level Indicator;
- belum ada korelasi penuh antara request, job, order, dan domain event;
- belum ada bukti bahwa log production telah meredaksi data pribadi dan secret pada semua jalur.

## Gate sebelum M1 produksi

1. Tentukan sink log staging dan produksi.
2. Propagasikan request ID pada route kritis.
3. Buat dashboard minimum untuk availability, latency, error, checkout, webhook, dan readiness.
4. Uji satu insiden sintetis dan buktikan jejaknya dapat ditelusuri.
5. Dokumentasikan retensi dan akses log.

Perubahan observability lintas request sengaja tidak dimasukkan ke paket ini karena memerlukan keputusan platform hosting dan pengujian perilaku runtime.
