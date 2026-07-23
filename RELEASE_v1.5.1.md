# Rizqhub v1.5.1 — Rebrand & Configuration Fix

Tanggal kandidat: 23 Juli 2026

## Ringkasan

Rilis ini mengganti branding aktif dari Lajurin menjadi Rizqhub dan memperbaiki
jalur deployment yang berhenti ketika `INTERNAL_JOB_SECRET` belum tersedia.
Tidak ada pengurangan validasi keamanan: startup produksi tetap menolak secret
kosong atau kurang dari 32 karakter.

## Perubahan utama

- Branding UI, metadata, notifikasi, sertifikat, file ekspor, seed, backup,
  service health, konfigurasi, dan dokumentasi memakai Rizqhub.
- Cookie sesi/workspace dan key analytics lama tetap diterima selama transisi.
- Verifikasi domain baru memakai `_rizqhub` dan `rizqhub-verification`; record
  `_lajurin` lama tetap diterima untuk domain yang sudah menunggu verifikasi.
- Migration `0017_rizqhub_rebrand.sql` memperbarui nama ruang komunitas umum.
- Runner Docker memasang `wget` secara eksplisit untuk healthcheck.
- Docker Compose menolak `INTERNAL_JOB_SECRET` kosong sebelum container dibuat.
- Build context Docker mengecualikan secret lokal, dependency, cache, data, dan arsip.

## Tindakan wajib di Coolify

Tambahkan `INTERNAL_JOB_SECRET` sebagai environment variable runtime dengan
nilai dari:

```bash
openssl rand -hex 32
```

Simpan dan redeploy aplikasi. Pertahankan `DATABASE_URL` dan resource PostgreSQL
yang sudah dipakai; rebranding tidak memerlukan database baru.
