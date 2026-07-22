# ADR-005: Policy Terpusat dan RLS sebagai Pertahanan Kedua

**Status:** Accepted  
**Tanggal:** 22 Juli 2026

## Konteks

Source v1 memiliki pemeriksaan role dan `merchantId` yang tersebar. Pola ini meningkatkan risiko satu route lupa memeriksa tenant.

## Keputusan

Otorisasi memakai policy terpusat berdasarkan actor, active workspace, membership, permission, dan resource. Repository tenant mewajibkan `workspace_id`. PostgreSQL Row-Level Security dievaluasi dan diterapkan setelah context propagation stabil sebagai pertahanan kedua.

## Alternatif

1. Role check di setiap route. Ditolak karena tidak konsisten dan sulit diaudit.
2. RLS sebagai satu-satunya kontrol. Ditolak karena tidak cukup untuk aturan bisnis dan dapat menghasilkan rasa aman palsu.
3. Authorization service terpisah. Ditunda karena belum ada kebutuhan operasional.

## Konsekuensi positif

- aturan akses dapat diuji dan diaudit;
- route dan use case lebih konsisten;
- isolasi memiliki pertahanan berlapis.

## Konsekuensi negatif

- migrasi policy membutuhkan inventaris use case;
- RLS menambah kompleksitas koneksi dan debugging;
- query background job memerlukan context yang jelas.

## Kriteria penerimaan

- negative test read dan write lintas workspace lulus;
- tidak ada use case tenant tanpa workspace context;
- support access memakai permission, alasan, expiry, dan audit;
- RLS tidak diaktifkan sebelum test koneksi, migration, dan job selesai.

## Urutan penerapan

1. Bentuk `ActorContext` dan `WorkspaceContext` yang eksplisit.
2. Terapkan policy terpusat pada use case baru.
3. Wajibkan workspace scope pada repository tenant.
4. Tambahkan negative isolation test untuk read dan write.
5. Uji propagasi context pada request, job, migration, dan support tooling.
6. Aktifkan RLS secara bertahap per tabel setelah seluruh jalur akses lulus.

## Tinjau ulang jika

- model permission membutuhkan relationship-based authorization yang tidak dapat dikelola policy lokal;
- RLS menimbulkan risiko operasional yang melebihi manfaat pertahanan kedua;
- ada kebutuhan pemisahan database atau schema per tenant berdasarkan regulasi.
