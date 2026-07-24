# Transactional Outbox Worker

## Tujuan

Outbox memisahkan commit transaksi bisnis dari efek eksternal seperti email, WhatsApp, dan automation. Perubahan order dan event outbox ditulis dalam transaksi PostgreSQL yang sama. Provider dipanggil setelah commit oleh worker.

## Migration

Jalankan migration `0026_v500_platform_kernel.sql` sebelum mengaktifkan worker:

```bash
npm run migrations:check
npm run db:migrate
```

Tabel baru:

- `outbox_events`
- `event_consumptions`
- `job_runs`
- `job_attempts`
- `dead_letter_events`

## Menjalankan worker

Pada container Node production, worker tertanam aktif secara default. Set `OUTBOX_WORKER_ENABLED=false` untuk mematikannya. Claim memakai `FOR UPDATE SKIP LOCKED`, sehingga beberapa replica dapat berjalan bersamaan.

### Source checkout atau development

Satu batch:

```bash
npm run worker:outbox:once
```

Mode polling:

```bash
npm run worker:outbox
```

### Coolify scheduled task

Jalankan setiap menit di container aplikasi:

```bash
wget --method=POST \
  --header="Authorization: Bearer $INTERNAL_JOB_SECRET" \
  -qO- http://127.0.0.1:3000/api/jobs/outbox
```

Endpoint menolak request jika `INTERNAL_JOB_SECRET` kosong atau kurang dari 32 karakter.

## Konfigurasi

| Variabel | Default | Batas |
|---|---:|---:|
| `OUTBOX_WORKER_ENABLED` | production: aktif | `true` atau `false` |
| `OUTBOX_BATCH_SIZE` | `20` | 1–100 |
| `OUTBOX_LEASE_MS` | `300000` | 30000–3600000 |
| `OUTBOX_POLL_INTERVAL_MS` | `5000` | minimum 1000 untuk script polling |

## Retry dan dead letter

- Retry memakai exponential backoff dari 1 detik sampai maksimum 15 menit.
- Default maksimum attempt adalah 8.
- Event yang melewati maksimum attempt berstatus `DEAD_LETTER`.
- Replay manual:

```bash
npm run outbox:replay -- <event-uuid> [actor-uuid]
```

Consumer harus idempoten. Notification dan automation menggunakan unique delivery key agar retry tidak membuat delivery baru berulang kali.

## Monitoring

Buka `/admin/operations` untuk melihat:

- backlog outbox;
- dead letter terbuka;
- job failed/partial 24 jam;
- riwayat job terbaru.

Log worker membawa `event_id`, `event_type`, `correlation_id`, `worker_id`, dan nomor attempt.

## Rollback

Jangan drop tabel outbox saat masih ada event `PENDING`, `RETRY`, `PROCESSING`, atau `DEAD_LETTER` yang belum ditangani. Untuk rollback aplikasi:

1. hentikan scheduled task worker;
2. deploy source v4.0.1;
3. pertahankan migration 0026 dan tabelnya agar event tidak hilang;
4. hanya drop objek migration setelah ekspor data, verifikasi tidak ada event aktif, dan backup dapat direstore.
