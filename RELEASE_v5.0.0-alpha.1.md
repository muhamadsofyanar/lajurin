# Rizqhub v5.0.0-alpha.1 — Platform Kernel

Rilis alpha pertama v5 mengimplementasikan fondasi reliabilitas tanpa rewrite total dan tanpa menghapus fitur v4.

## Perubahan utama

- transactional outbox dan worker;
- retry, lease, idempotent consumption, dead-letter, dan replay;
- request/correlation/trace ID propagation;
- structured logging;
- generic policy engine;
- payment completion dan manual payment review tidak lagi memanggil provider eksternal dalam transaksi request utama;
- checkout stock reservation diperbaiki menjadi decrement atomik;
- operational dashboard untuk outbox dan job runs;
- migration `0026_v500_platform_kernel.sql`;
- test platform kernel dan integration test outbox.

## Aktivasi

Setelah migration, gunakan worker tertanam (`OUTBOX_WORKER_ENABLED=true`) pada deployment Coolify. Sebagai alternatif, matikan worker tertanam dan jadwalkan `POST /api/jobs/outbox` minimal setiap satu menit dengan `INTERNAL_JOB_SECRET`. Jangan mengaktifkan dua mode tanpa kebutuhan operasional yang jelas.

## Status

Alpha. Wajib staging, PostgreSQL integration test, provider sandbox, dan restore drill sebelum production.
