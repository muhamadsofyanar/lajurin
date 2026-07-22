# Lajurin v1.3.0 — Integrated Business Suite Candidate

Paket ini menggabungkan pengembangan lanjutan setelah v1.2.0 agar source cukup diunggah dan diuji sebagai satu kandidat rilis.

## Modul

- Workspace & anggota tim: Owner, Admin, Finance, Staff.
- Transfer manual langsung ke merchant dengan fallback rekening platform.
- Tagihan dan pelunasan komisi melalui bukti transfer privat.
- Landing Page Builder dan pratinjau publik.
- Laporan penjualan berperiode dan ekspor CSV.
- Notifikasi operasional dasar dan audit log.
- Feature flag database: `OFF`, `USERS`, atau `ALL`.

## Keamanan rilis

- Migration `0013` bersifat aditif; tidak menghapus tabel atau kolom lama.
- Seluruh feature flag baru dibuat `OFF`.
- Bukti pelunasan komisi hanya dapat dibuka merchant pemilik atau admin.
- Persetujuan pembayaran memakai advisory lock dan pemeriksaan status.
- Owner aktif terakhir tidak dapat diturunkan atau dinonaktifkan.
- Transfer langsung tidak menambah saldo payout; komisi tetap masuk ledger piutang.

## Urutan aktivasi setelah staging lulus

1. `BASIC_NOTIFICATIONS`
2. `SALES_REPORTS`
3. `LANDING_PAGE_BUILDER`
4. `WORKSPACE_TEAMS` secara canary
5. `DIRECT_MANUAL_PAYMENTS` secara canary
6. `COMMISSION_BILLING` setelah rekening komisi platform diisi

## Gate sebelum produksi

- Backup database dan seluruh volume persisten.
- Jalankan migration `0011` sampai `0013` pada database staging.
- Jalankan backfill Workspace dua kali dan rekonsiliasi.
- Uji checkout Xendit, transfer platform, transfer langsung, refund, payout, dan pelunasan komisi.
- Uji role Workspace dan proteksi owner terakhir.
- Uji editor landing, halaman publik, laporan, dan CSV.
- Pastikan healthcheck `/api/ready` sehat setelah rolling update.
