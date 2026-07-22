# Baseline Provenance Lajurin v1.0.1

**Status:** Baseline source resmi untuk persiapan repository  
**Tanggal verifikasi:** 22 Juli 2026

## Artefak sumber

- Nama arsip: `Lajurin-v1.0.1-responsive-navigation.zip`
- SHA-256: `6342f3b70c1de69482a0a9f078d7752affd8a6ddf9bd15ca3d09aa8768506bda`
- Versi pada `package.json`: `1.0.1`

## Hasil verifikasi

Arsip valid dan dapat diekstrak. Pemeriksaan sebelumnya memastikan test, lint, typecheck, dan production build lulus. Perubahan dari v1.0.0 terbatas pada navigasi responsif, CSS, dokumentasi, dan nomor versi. Model data dan logika bisnis tidak berubah.

## Batas pembuktian

Arsip tidak membawa direktori `.git`. Karena itu, hubungan source ini dengan commit produksi tertentu tidak dapat dibuktikan dari arsip saja. Tag Git yang dibuat saat import harus diberi nama `v1.0.1-baseline`, bukan diklaim sebagai tag historis dari repository produksi.

File `.env.example` tidak ada dalam arsip v1.0.1. File tersebut dipulihkan dari baseline v1.0.0 karena kontrak konfigurasi aplikasi tidak berubah pada v1.0.1. File ini hanya berisi contoh dan tidak boleh memuat secret produksi.

## Aturan import Git

1. Commit pertama memuat baseline source v1.0.1 yang bersih dari `node_modules`, `.next`, file build, dan secret.
2. Tag commit pertama sebagai `v1.0.1-baseline`.
3. Commit berikutnya memuat dokumentasi arsitektur dan pemulihan `.env.example`.
4. Buat branch `foundation/m0-baseline` dari kondisi tersebut.
5. Hubungkan remote GitHub hanya setelah repository tujuan dan hak akses diverifikasi.
