# Lajurin M0 Handoff

Paket ini adalah Lajurin v1.0.1 dengan kontrol M0 tahap pertama. Paket tidak mengubah schema Workspace dan tidak boleh langsung dideploy ke produksi.

## Yang ditambahkan

- CI untuk quality gate dan migration test PostgreSQL;
- validasi konfigurasi dan fail-fast container;
- checksum source serta migration baseline;
- konfigurasi staging yang terpisah;
- PR template, CODEOWNERS, ADR template, dan migration checklist;
- runbook staging, backup-restore, release-rollback, observability, dan performa;
- tiga test kontrak konfigurasi.

## Cara memasukkan ke GitHub

1. Ekstrak paket pada komputer lokal.
2. Buat branch `foundation/m0-baseline` dari repository Lajurin terbaru.
3. Salin isi paket ke branch tersebut dengan mempertahankan folder tersembunyi `.github`.
4. Pastikan `.env`, `.next`, `node_modules`, dan data runtime tidak ikut.
5. Commit dengan pesan `chore: establish M0 baseline controls`.
6. Push branch dan buat Pull Request ke `main`.
7. Jangan merge jika job `quality` atau `migrations` gagal.

## Batas status

Baca `docs/implementation/M0_STATUS.md`. Paket ini menyiapkan kontrol, tetapi belum membuktikan staging, restore drill, baseline performa, dan regression test kritis telah lulus.
