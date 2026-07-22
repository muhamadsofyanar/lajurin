# Status Implementasi M0

**Baseline:** Lajurin v1.0.1  
**Tanggal:** 22 Juli 2026  
**Prinsip:** status hanya `Lulus` jika bukti telah dijalankan, bukan jika dokumen atau skrip baru tersedia.

## Ringkasan

| ID | Area | Status | Bukti atau blocker |
|---|---|---|---|
| M0-01 | Provenance baseline | Parsial | checksum arsip, manifest source, dan pemeriksaan versi tersedia. Tag Git belum dibuat pada repository pengguna |
| M0-02 | Kontrak konfigurasi | Lulus lokal | `.env.example`, `.env.staging.example`, validator, dan fail-fast container tersedia |
| M0-03 | Migration baseline | Parsial | journal dan checksum tervalidasi. Uji PostgreSQL nyata menunggu CI atau host dengan PostgreSQL |
| M0-04 | CI | Siap dijalankan | workflow quality dan migration tersedia. Belum ada run GitHub yang dapat diperiksa |
| M0-05 | Staging | Siap disiapkan | compose dan runbook tersedia. Host, domain, dan credential staging belum disediakan |
| M0-06 | Regression test kritis | Belum lulus | tujuh unit test lulus, termasuk kontrak konfigurasi. Integration dan E2E kritis belum lengkap |
| M0-07 | Recovery | Belum lulus | runbook tersedia. Backup dan restore drill membutuhkan akses PostgreSQL serta storage |
| M0-08 | Observability | Parsial | health, readiness, log JSON, dan request ID webhook tersedia. Korelasi global dan metrik belum ada |
| M0-09 | Change control | Lulus lokal | PR template, CODEOWNERS, ADR template, migration checklist, dan release runbook tersedia |
| M0-10 | Baseline performa | Belum lulus | protokol tersedia. Pengukuran harus dilakukan pada staging sehat |

## Verifikasi lokal paket

Hasil terakhir pada 22 Juli 2026:

- checksum baseline lulus;
- checksum dan journal 11 migration lulus;
- 7 dari 7 unit test lulus;
- lint lulus;
- typecheck lulus;
- production build lulus dan seluruh route aplikasi berhasil dibangun.

PostgreSQL migration test tidak dijalankan di lingkungan penyusunan karena PostgreSQL dan Docker tidak tersedia.

Perintah wajib:

```bash
npm ci
npm run config:check
npm run verify
```

`npm run baseline:check` dijalankan hanya pada tag historis `v1.0.1-baseline`. Source aktif setelah baseline diverifikasi dengan `npm run verify` agar manifest baseline tetap immutable dan tidak ditulis ulang untuk menyamarkan perubahan fitur.

Migration database dijalankan oleh job CI `migrations` atau host PostgreSQL:

```bash
npm run migrations:test
```

## Keputusan gate

M0 belum selesai. M1 boleh dikembangkan pada branch terpisah setelah tim menerima risiko, tetapi M1 tidak boleh masuk produksi sebelum seluruh exit criteria M0 lulus. Blocker utama adalah regression test kritis, staging nyata, restore drill, dan baseline performa.

## Tindakan pemilik repository

1. Unggah paket melalui branch `foundation/m0-baseline`.
2. Jalankan Pull Request dan periksa dua job CI.
3. Buat tag `v1.0.1-baseline` pada commit source yang disepakati.
4. Siapkan staging terpisah.
5. Jalankan restore drill dan simpan bukti waktunya.
6. Lanjutkan M0-06 sebelum memulai perubahan Workspace yang akan dipromosikan ke produksi.
