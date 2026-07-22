# ADR-004: Transactional Outbox untuk Side Effect Lintas Modul

**Status:** Accepted  
**Tanggal:** 22 Juli 2026

## Konteks

Pembayaran, fulfillment, notifikasi, automation, dan analytics harus terhubung. Pemanggilan provider langsung di transaksi utama membuat proses rapuh. Menyimpan data lalu menerbitkan event secara terpisah juga dapat kehilangan event.

## Keputusan

Perubahan domain dan record outbox ditulis dalam satu transaksi PostgreSQL. Worker mengambil event, menjalankan consumer idempoten, mencatat attempt, dan menerapkan retry dengan backoff. Event yang gagal permanen masuk dead-letter state.

## Alternatif

1. Panggilan sinkron langsung ke provider. Ditolak karena kegagalan provider dapat merusak transaksi pengguna.
2. Publish langsung ke broker setelah commit. Ditolak karena ada celah event hilang antara commit dan publish.
3. CDC penuh dari database. Ditunda karena kompleksitas operasi belum diperlukan.

## Konsekuensi positif

- event tidak hilang setelah transaksi berhasil;
- side effect dapat diulang;
- modul terhubung melalui kontrak;
- provider failure terisolasi.

## Konsekuensi negatif

- konsistensi lintas modul menjadi eventual;
- worker, retry, dead-letter, dan observability harus dibangun;
- event schema harus berversi.

## Risiko dan mitigasi

- Delivery ganda dimitigasi dengan idempotency key.
- Backlog dimitigasi dengan metric lag dan alert.
- Payload sensitif dimitigasi dengan minimisasi data dan reference ID.

## Kriteria penerimaan

- `order.paid` tidak hilang pada crash setelah commit;
- retry tidak menggandakan entitlement atau notifikasi;
- backlog dan kegagalan dapat dilihat operator;
- consumer dapat dihentikan tanpa menghentikan checkout.

## Batas penerapan

- Outbox diperkenalkan ketika event lintas modul pertama dibutuhkan. M0 dan M1 hanya menyiapkan kontrak dan konvensinya.
- Tidak ada broker eksternal pada tahap awal. PostgreSQL menjadi penyimpanan outbox.
- Exactly-once delivery tidak diklaim. Sistem memakai at-least-once delivery dengan consumer idempoten.

## Tinjau ulang jika

- backlog outbox melampaui SLO secara konsisten;
- kebutuhan throughput tidak dapat dipenuhi worker dan PostgreSQL;
- organisasi membutuhkan isolasi kegagalan atau deployment independen antarmodul.
