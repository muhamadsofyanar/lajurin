# Lajurin v1.3.1 — Workspace Recovery Candidate

Rilis ini memperbaiki kekurangan operasional v1.3.0: tabel Workspace sudah tersedia, tetapi data merchant lama sebelumnya memerlukan skrip backfill terpisah yang tidak ikut masuk ke image produksi.

## Perbaikan

- Migration `0014_workspace_owner_backfill.sql` otomatis memprovisi Workspace untuk merchant lama yang belum memilikinya.
- Setiap Workspace hasil backfill memperoleh Owner aktif, branding, compatibility link, dan audit log.
- Proses idempoten, memakai advisory lock, dan melewati merchant yang sudah memiliki Workspace.
- Merchant baru langsung memperoleh Workspace dalam transaksi pendaftaran yang sama.
- Tidak diperlukan public port PostgreSQL atau eksekusi skrip dari komputer lokal.

## Deployment

1. Pastikan akses publik PostgreSQL dinonaktifkan.
2. Backup database melalui Coolify.
3. Deploy source v1.3.1 pada aplikasi Lajurin satu kali.
4. Tunggu healthcheck `ready`.
5. Logout dan login kembali sebagai merchant, lalu buka **Lainnya → Tim workspace**.

Tidak ada container proxy database yang perlu dibuat atau dihapus untuk rilis ini.
