# ADR-007: Migrasi Expand-Migrate-Contract

**Status:** Accepted  
**Tanggal:** 22 Juli 2026

## Konteks

Lajurin sudah berjalan di produksi. Perubahan tenant, identity, commerce, dan fulfillment menyentuh data paling kritis. Rewrite atau big-bang migration berisiko menghentikan layanan dan merusak data historis.

## Keputusan

Migrasi dilakukan per domain melalui expand, migrate, verify, cutover, dan contract. Perubahan awal bersifat aditif. Read dan write dipindahkan per use case menggunakan compatibility layer dan feature flag. Struktur lama dihapus hanya setelah rekonsiliasi, periode stabil, dan rollback plan tersedia.

## Alternatif

1. Rewrite dan cutover penuh. Ditolak karena risiko fungsi lama hilang dan rekonsiliasi sulit.
2. Rename semua tabel dan kolom sekaligus. Ditolak karena blast radius terlalu besar.
3. Menunda restrukturisasi sambil terus menambah fitur. Ditolak karena memperbesar utang domain.

## Konsekuensi positif

- aplikasi tetap berjalan selama migrasi;
- rollback aplikasi lebih aman;
- hasil dapat diverifikasi per domain;
- risiko dapat dibatasi.

## Konsekuensi negatif

- compatibility layer dan dual-write menambah kompleksitas sementara;
- migrasi berlangsung beberapa rilis;
- disiplin cleanup diperlukan agar struktur lama tidak permanen.

## Kriteria penerimaan

- backup dan restore drill lulus;
- setiap backfill dapat dilanjutkan dan direkonsiliasi;
- cutover memakai feature flag;
- tidak ada perubahan finansial historis;
- contract phase memiliki ADR atau change plan terpisah.

## Guardrail waktu

- Setiap compatibility layer dan dual-write mempunyai owner, metrik rekonsiliasi, tanggal evaluasi, dan exit criteria.
- Contract tidak dijalankan pada rilis yang sama dengan expand.
- Struktur lama tidak dihapus hanya karena jalur baru berhasil sekali. Diperlukan periode stabil dan bukti rekonsiliasi.

## Tinjau ulang jika

- perubahan bersifat lokal, tidak menyentuh data persisten, dan dapat dirilis atomik;
- kewajiban regulasi memerlukan cutover terjadwal dengan maintenance window;
- biaya mempertahankan dua model melebihi risiko migrasi setelah bukti staging lengkap tersedia.
