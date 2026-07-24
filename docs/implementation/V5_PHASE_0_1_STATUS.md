# Rizqhub v5.0 Alpha — Status Fase 0 dan Fase 1

**Versi:** `5.0.0-alpha.1`  
**Migration:** `0026_v500_platform_kernel.sql`  
**Cakupan:** baseline safety dan platform kernel; bukan implementasi seluruh blueprint v5.

## Implementasi selesai pada source

- correlation header `request_id`, `correlation_id`, dan `trace_id` melalui `proxy.ts`;
- structured logger terpusat;
- policy engine generik dan integrasi awal pada Workspace permission;
- transactional outbox PostgreSQL;
- consumer idempotency record;
- worker claim menggunakan `FOR UPDATE SKIP LOCKED`;
- lease recovery untuk event worker yang terhenti;
- exponential retry, job run, job attempt, dead-letter, dan replay;
- endpoint internal `POST /api/jobs/outbox`;
- event notification order dan merchant automation;
- checkout stock decrement atomik dalam transaksi;
- checkout, manual payment review, dan Xendit payment completion menulis event outbox;
- halaman admin operations menampilkan backlog dan kesehatan worker;
- static/unit test serta PostgreSQL integration test outbox.

## Belum termasuk

- Row-Level Security;
- migrasi seluruh tabel tenant ke `workspace_id` langsung;
- double-entry ledger v5;
- entitlement aggregate baru;
- redesign dashboard menyeluruh;
- CRM v2, workflow builder v2, analytics projection, dan AI copilot.

Area tersebut tetap mengikuti fase lanjutan dalam `Rizqhub_v5_Blueprint.md`.

## Gate deployment

Sebelum production:

1. `npm ci`
2. `npm run config:check`
3. `npm run verify`
4. `npm run migrations:test`
5. `npm run test:db`
6. deploy ke staging;
7. aktifkan scheduled task outbox;
8. uji payment sandbox dan pastikan outbox menjadi `COMPLETED`;
9. hentikan provider sementara dan verifikasi retry/dead letter;
10. lakukan backup dan restore drill.

## Catatan verifikasi paket ChatGPT

Source telah diperbarui secara statis. Full dependency install pada lingkungan penyusunan dapat tertunda bila registry package mengalami gangguan; hasil `verify`, migration PostgreSQL, dan Docker build tetap wajib dijalankan pada CI/staging sebelum promosi production.
