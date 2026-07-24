# Rizqhub v5.0.0-alpha.1 — Platform Kernel

Rilis ini adalah fase pertama blueprint v5, bukan klaim bahwa seluruh v5 sudah
selesai. Schema bersifat aditif dan jalur v4 dipertahankan selama shadow rollout.

## Isi rilis

- Workspace scope langsung pada `products`, `orders`, dan `webhook_events`.
- Backfill workspace dari compatibility link merchant.
- Transactional outbox untuk pembayaran berhasil dan ditolak.
- Worker `SKIP LOCKED`, retry eksponensial, stale-lock recovery, consumption
  idempoten, attempt log, dead-letter, dan replay.
- RLS pilot pada `outbox_events`.
- Backlog dan dead-letter pada pusat operasional.
- Migration `0026_v5_platform_kernel.sql`.

## Rollout produksi

1. Rotasi semua secret yang pernah terekspos dan buat backup PostgreSQL.
2. Restore backup ke staging dan jalankan seluruh migration serta `npm run test:db`.
3. Deploy dengan:

   ```env
   DEPLOYMENT_ENV=production
   OUTBOX_PROCESSING_ENABLED=false
   OUTBOX_BATCH_SIZE=20
   ```

4. Pastikan `/api/ready` sehat dan `/admin/operations` tidak menampilkan error.
5. Buat scheduler Coolify setiap satu menit:

   ```text
   POST https://rizqhub.id/api/jobs/events
   Authorization: Bearer <INTERNAL_JOB_SECRET>
   ```

6. Amati event `PENDING`, `RETRY`, dan `DEAD`. Shadow mode tetap menjalankan
   side effect legacy; unique delivery mencegah pengiriman ulang.
7. Setelah staging dan produksi canary stabil, ubah
   `OUTBOX_PROCESSING_ENABLED=true`, lalu redeploy.

## Rollback aman

Jika worker bermasalah, kembalikan `OUTBOX_PROCESSING_ENABLED=false` dan
redeploy. Jangan menghapus migration atau tabel outbox. Event yang tertunda dapat
diproses kembali setelah worker diperbaiki.

## Gate wajib

- Migration dan rerun migration lulus pada PostgreSQL.
- Cross-workspace read/write ditolak oleh negative test RLS.
- Duplicate webhook tidak membuat dua event finansial atau dua delivery.
- Retry dan dead-letter terbukti dengan provider mock/sandbox.
- Backup dan restore memiliki bukti, bukan hanya status jadwal.
