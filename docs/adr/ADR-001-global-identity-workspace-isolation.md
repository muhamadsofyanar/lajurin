# ADR-001: Global Identity dengan Isolasi Operasional per Workspace

**Status:** Accepted  
**Tanggal:** 22 Juli 2026

## Konteks

Satu orang dapat menjadi pemilik pada satu workspace, anggota tim pada workspace lain, dan pelanggan pada workspace ketiga. Model v1 memakai user sekaligus sebagai akun, merchant, member, dan customer. Model tersebut tidak cukup untuk Customer 360 yang aman.

## Keputusan

Lajurin memakai `Person` dan `User` sebagai identitas global. Hubungan bisnis disimpan melalui `Contact` dan `WorkspaceMembership` yang terikat pada workspace.

CRM, consent, transaksi, aktivitas, komunikasi, dan entitlement tetap terisolasi per workspace. Ringkasan lintas workspace hanya tersedia melalui control plane untuk peran platform terbatas dan diaudit.

## Alternatif

1. Identitas sepenuhnya terpisah per workspace. Ditolak karena menghasilkan akun ganda dan menyulitkan pengalaman lintas produk.
2. Satu customer global yang dapat dibaca semua workspace. Ditolak karena melanggar isolasi data dan meningkatkan risiko privasi.
3. User tetap menjadi semua jenis aktor. Ditolak karena role dan hubungan bisnis menjadi ambigu.

## Konsekuensi positif

- satu login dapat mengakses beberapa workspace;
- data hubungan pelanggan tetap terisolasi;
- Customer 360 dapat dibangun tanpa membuka data tenant;
- customer tidak wajib memiliki akun login.

## Konsekuensi negatif

- deduplikasi identitas menjadi lebih kompleks;
- merge person membutuhkan audit dan kemampuan pembatalan;
- aplikasi harus membedakan user, person, contact, dan membership.

## Risiko dan mitigasi

- Merge salah dimitigasi dengan pencocokan konservatif dan identitas terverifikasi.
- Kebocoran lintas workspace dimitigasi melalui policy, repository scope, isolation test, dan audit.
- Consent salah dimitigasi dengan penyimpanan per workspace, purpose, dan channel.

## Tinjau ulang jika

Regulasi, model bisnis, atau kebutuhan data residency mengharuskan pemisahan identitas secara fisik.

