# Status Implementasi M1 Workspace Foundation

**Versi source:** 1.1.0 candidate  
**Migration:** `0011_wide_onslaught.sql`  
**Prinsip rollout:** expand–migrate–verify; feature flag default nonaktif

## Status backlog

| ID | Area | Status kandidat | Bukti / blocker |
|---|---|---|---|
| M1-01 | Modul dan kontrak Workspace | Selesai lokal | domain/application/infrastructure/presentation dipisahkan; architecture test tersedia |
| M1-02 | Enum dan tabel M1 | Selesai lokal | migration aditif `0011`; database PostgreSQL nyata masih perlu diuji di CI/staging |
| M1-03 | Repository Workspace | Selesai lokal | lookup selalu memakai user/workspace scope; resource read menerima `WorkspaceContext` |
| M1-04 | Membership policy | Selesai lokal | permission role dan last-owner invariant memiliki unit test |
| M1-05 | Active workspace resolver | Selesai lokal | route/cookie selalu diverifikasi terhadap membership dan status database |
| M1-06 | Backfill idempoten | Siap staging | per-record transaction, advisory lock, cursor, resume, dan rerun; belum dijalankan pada data staging |
| M1-07 | Rekonsiliasi | Siap staging | pemeriksaan link, owner, branding, dan orphan tersedia |
| M1-08 | Workspace switcher | Selesai lokal | hanya multi-workspace canary; flag default mati |
| M1-09 | Audit context | Selesai lokal | `workspace_id` dan `request_id` nullable ditambahkan; helper audit workspace tersedia |
| M1-10 | Staging/canary | Belum | membutuhkan staging terpisah, backup–restore, dan akun UUID canary eksplisit |

## Batas kandidat

- Tidak ada tabel atau kolom legacy yang dihapus.
- Tidak ada product, order, payment, ledger, payout, enrollment, LMS, atau community yang dipindahkan.
- RLS dan custom domain routing belum diaktifkan.
- Kandidat belum boleh masuk produksi sampai M0 dan seluruh rekonsiliasi/regresi M1 lulus.

## Verifikasi lokal

- 12 migration file dan journal tervalidasi.
- 16/16 unit/contract test lulus.
- ESLint dan TypeScript lulus.
- Production build Next.js lulus, termasuk route canary `/w/[workspaceSlug]/dashboard`.
- Migration PostgreSQL nyata, backfill, rerun, dan rekonsiliasi menunggu database staging; lingkungan penyusunan tidak menyediakan PostgreSQL/Docker.
