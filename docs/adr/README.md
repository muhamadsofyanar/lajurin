# Architecture Decision Records Lajurin

Folder ini mencatat keputusan arsitektur yang memengaruhi struktur, batas domain, kualitas, keamanan, dan evolusi Lajurin.

## Aturan

1. Satu ADR mencatat satu keputusan utama.
2. ADR yang sudah Accepted tidak diedit untuk mengubah alasan historisnya. Perubahan keputusan dibuat melalui ADR baru yang menandai ADR lama sebagai Superseded.
3. Setiap ADR minimal memuat konteks, keputusan, alternatif, konsekuensi positif, konsekuensi negatif, risiko, dan kriteria peninjauan ulang.
4. Nomor ADR tidak digunakan ulang.
5. Keputusan implementasi kecil yang tidak berdampak lintas modul tidak memerlukan ADR.

## Indeks

| ID | Judul | Status |
|---|---|---|
| ADR-001 | Global Identity dengan Isolasi Operasional per Workspace | Accepted |
| ADR-002 | Workspace untuk Unit Internal dan Organisasi Eksternal | Accepted |
| ADR-003 | Modular Monolith dan PostgreSQL | Accepted |
| ADR-004 | Transactional Outbox untuk Side Effect Lintas Modul | Accepted |
| ADR-005 | Policy Terpusat dan RLS sebagai Pertahanan Kedua | Accepted |
| ADR-006 | Entitlement sebagai Kontrak Fulfillment | Accepted |
| ADR-007 | Migrasi Expand-Migrate-Contract | Accepted |
| ADR-008 | ADR sebagai Catatan Keputusan Arsitektur | Accepted |
