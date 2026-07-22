# Lajurin M0–M1 Implementation Specification v1.0

**Status:** Siap ditinjau sebelum coding  
**Tanggal:** 22 Juli 2026  
**Baseline:** Lajurin v1.0.1  
**Arsitektur:** Modular Monolith dan PostgreSQL  
**Dampak saat ini:** Tidak ada perubahan pada source atau produksi

## 1. Tujuan

Dokumen ini menerjemahkan Platform Blueprint menjadi pekerjaan implementasi untuk dua tahap pertama:

- **M0 Baseline dan Kontrol Perubahan**, agar perubahan berikutnya aman, dapat diuji, dan dapat dipulihkan.
- **M1 Workspace Foundation**, agar model bisnis tidak lagi bergantung pada satu akun `MERCHANT` yang identik dengan satu bisnis.

M0 dan M1 tidak bertujuan menambah fitur penjualan. Keduanya membangun batas tenant, identitas keanggotaan, jalur migrasi, dan kontrol perubahan.

## 2. Fakta baseline

| Item | Kondisi |
|---|---|
| Source | arsip Lajurin v1.0.1 valid dan dapat dibangun |
| Package version | `1.0.1` |
| Checksum ZIP audit | `6342f3b70c1de69482a0a9f078d7752affd8a6ddf9bd15ca3d09aa8768506bda` |
| Git provenance | tidak tersedia di dalam ZIP |
| Database | PostgreSQL melalui Drizzle ORM |
| Aplikasi | Next.js 16.2.10 dan React 19.2.4 |
| Test otomatis | 4 kasus unit lulus, tetapi coverage kritis belum memadai |
| Quality checks | test, lint, typecheck, dan production build lulus |
| Tenant model lama | role global dan `merchantId` yang mengacu ke `users.id` |
| Profil bisnis lama | satu `merchant_profiles` untuk satu user |
| Risiko utama | pemeriksaan role dan akses data tersebar pada route serta action |

Baseline ini cukup untuk memulai desain implementasi. Baseline ini belum cukup untuk mengubah schema produksi sebelum backup, restore drill, staging, dan regression test tersedia.

## 3. Aturan pelaksanaan

1. Kerjakan melalui branch terpisah dari production branch.
2. Jangan mengembangkan fitur baru selama M0 belum lulus.
3. Semua migrasi M1 bersifat aditif.
4. Tabel dan kolom lama tidak dihapus pada M1.
5. Model lama tetap menjadi jalur produksi sampai cutover disetujui.
6. Tidak ada dual-write tanpa laporan rekonsiliasi dan exit criteria.
7. Setiap query tenant baru wajib menerima `WorkspaceContext`.
8. Setiap perubahan schema memiliki migration, rollback operasional, dan verifikasi data.
9. Secret tidak boleh masuk ke repository, log, fixtures, atau dokumen.
10. RLS belum diaktifkan pada M1. M1 menyiapkan kondisi agar RLS dapat diuji pada M2.

## 4. Ruang lingkup M0

### 4.1 Hasil yang harus dicapai

- baseline source dapat dilacak;
- CI mencegah regresi dasar;
- staging merepresentasikan produksi tanpa memakai data sensitif;
- backup dapat benar-benar dipulihkan;
- alur kritis memiliki automated regression test;
- schema dan konfigurasi lingkungan terdokumentasi;
- perubahan arsitektur memiliki ADR dan owner.

### 4.2 Backlog M0

| ID | Pekerjaan | Artefak | Gate |
|---|---|---|---|
| M0-01 | Tetapkan provenance baseline | checksum, manifest file, tag `v1.0.1-baseline`, catatan provenance gap | source lokal sama dengan artefak yang diuji |
| M0-02 | Pulihkan kontrak konfigurasi | `.env.example` tanpa secret, daftar required dan optional variable | aplikasi gagal cepat jika konfigurasi wajib hilang |
| M0-03 | Kunci migration baseline | schema snapshot, migration journal, pemeriksaan drift | database kosong dapat dimigrasikan sampai versi terbaru |
| M0-04 | Bangun CI | install deterministik, test, lint, typecheck, build, migration validation | seluruh gate wajib lulus sebelum merge |
| M0-05 | Siapkan staging | konfigurasi terpisah, provider sandbox atau fake adapter, storage terpisah | tidak memakai credential atau data produksi |
| M0-06 | Tambah regression test kritis | integration dan E2E untuk auth, checkout, webhook, finance, access | kasus positif dan negatif lulus |
| M0-07 | Uji recovery | backup, restore drill, runbook, bukti waktu pemulihan | data hasil restore lolos rekonsiliasi |
| M0-08 | Tambah observability minimum | request ID, structured log, health, readiness, error context | error kritis dapat ditelusuri tanpa membuka secret |
| M0-09 | Terapkan change control | PR template, ADR template, migration checklist, release checklist | perubahan berisiko tidak dapat merge tanpa bukti |
| M0-10 | Catat baseline performa | p50, p95, error rate untuk route kritis | target M1 memakai baseline, bukan asumsi |

### 4.3 Test minimum M0

| Area | Skenario wajib |
|---|---|
| Authentication | login valid, login gagal, session kedaluwarsa, logout, batas session aktif |
| Authorization | admin tidak masuk dashboard merchant, merchant tidak masuk admin, member tidak mengubah merchant data |
| Checkout | harga server-side, kupon valid dan tidak valid, order bump, duplikasi submit |
| Xendit webhook | signature valid dan salah, event duplikat, event tidak dikenal, retry |
| Manual payment | unggah bukti valid, file palsu, approve, reject, akses order milik pihak lain |
| Finance | ledger append-only, refund idempoten, payout tidak melebihi saldo, reversal |
| Fulfillment lama | payment sukses memberi enrollment satu kali |
| Storage | path traversal, MIME mismatch, ukuran file, akses file tanpa hak |
| Navigation | desktop dan mobile tetap dapat mengakses route utama |
| Migration | database kosong, database berisi fixture legacy, rerun yang aman |

### 4.4 Exit criteria M0

M0 selesai hanya jika semua kondisi berikut terpenuhi:

- repository memiliki baseline dan tag yang dapat direproduksi;
- provenance gap terhadap commit produksi telah ditutup atau dicatat resmi;
- `.env.example` kembali tersedia tanpa secret;
- CI lulus dari clean checkout;
- staging sehat dan terpisah dari produksi;
- backup dan restore drill lulus;
- automated test mencakup tenant boundary lama dan transaksi kritis;
- migration validation lulus pada database kosong dan fixture legacy;
- release dan rollback runbook telah diuji;
- tidak ada perubahan perilaku produksi.

Jika satu syarat gagal, M1 tidak boleh masuk produksi.

## 5. Ruang lingkup M1

### 5.1 Hasil yang harus dicapai

M1 menambahkan model Workspace secara aditif. M1 belum memindahkan seluruh query tenant dari `merchantId` ke `workspaceId`.

Hasil M1:

- setiap merchant lama memiliki satu workspace hasil backfill;
- user dapat menjadi anggota lebih dari satu workspace;
- role tenant tidak lagi harus disimpan sebagai role global untuk model baru;
- branding, module activation, dan domain mempunyai workspace scope;
- active workspace selalu divalidasi terhadap membership;
- model lama tetap berjalan selama tahap verifikasi.

### 5.2 Model data awal

#### `workspaces`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | uuid | primary key |
| `name` | text | wajib, 2 sampai 120 karakter |
| `slug` | text | unik global pada M1, lowercase dan stabil |
| `kind` | enum | `INTERNAL` atau `EXTERNAL` |
| `status` | enum | `DRAFT`, `ACTIVE`, `SUSPENDED`, `CLOSED` |
| `created_by` | uuid | FK ke `users`, restrict |
| `created_at` | timestamptz | wajib |
| `updated_at` | timestamptz | wajib |

`CLOSED` adalah soft lifecycle state. Hard delete tidak digunakan.

#### `workspace_memberships`

| Kolom | Tipe | Aturan |
|---|---|---|
| `id` | uuid | primary key |
| `workspace_id` | uuid | FK ke `workspaces`, cascade hanya pada lingkungan non-produksi |
| `user_id` | uuid | FK ke `users`, restrict |
| `role` | enum | `OWNER`, `ADMIN`, atau `MEMBER` |
| `status` | enum | `INVITED`, `ACTIVE`, `SUSPENDED`, `REVOKED` |
| `created_at` | timestamptz | wajib |
| `updated_at` | timestamptz | wajib |

Constraint minimum:

- unique `workspace_id, user_id`;
- index `user_id, status`;
- index `workspace_id, status`;
- satu workspace harus memiliki minimal satu `OWNER` aktif pada level use case;
- owner terakhir tidak dapat keluar atau diturunkan role-nya.

Role M1 sengaja dibatasi. Custom role belum dibangun. Permission didefinisikan sebagai konstanta policy yang dipetakan dari role. Ini mencegah desain permission yang terlalu dini tanpa bukti kebutuhan.

#### `workspace_branding`

Satu record per workspace. Kolom minimum: `workspace_id`, `display_name`, `logo_url`, `accent_color`, `support_email`, `whatsapp`, `created_at`, dan `updated_at`.

#### `workspace_modules`

Satu record per kombinasi `workspace_id` dan `module_key`. Kolom minimum: `enabled`, `settings` JSONB, `created_at`, dan `updated_at`. `settings` harus divalidasi oleh schema milik modul. JSONB tidak boleh menjadi tempat menyimpan state domain.

#### `workspace_domains`

Kolom minimum: `id`, `workspace_id`, `hostname`, `status`, `verification_token_hash`, `verified_at`, `is_primary`, `created_at`, dan `updated_at`.

Aturan:

- hostname unik secara global;
- token verifikasi disimpan sebagai hash;
- satu workspace hanya memiliki satu domain primary aktif;
- domain belum memengaruhi routing produksi pada M1.

#### `legacy_merchant_workspace_links`

Tabel compatibility sementara yang memetakan `merchant_profiles.id`, legacy `users.id`, dan `workspaces.id`.

Aturan:

- satu merchant profile tepat satu workspace;
- satu legacy merchant user tepat satu workspace hasil backfill;
- tabel mempunyai owner dan dihapus pada tahap contract setelah seluruh use case pindah;
- tabel tidak menjadi domain permanen.

### 5.3 Policy dan context

M1 memperkenalkan dua context:

```text
ActorContext {
  userId
  platformRole
  requestId
}

WorkspaceContext {
  workspaceId
  membershipId
  membershipRole
  membershipStatus
}
```

Aturan resolver:

1. Identifikasi user dari session server-side.
2. Ambil workspace dari route, subdomain, atau pilihan aktif.
3. Jangan mempercayai workspace ID dari form atau cookie tanpa verifikasi.
4. Verifikasi membership aktif di database.
5. Bentuk `WorkspaceContext` yang immutable untuk satu request.
6. Tolak request jika workspace suspended atau membership tidak aktif.
7. Catat `requestId`, `userId`, dan `workspaceId` pada audit context.

Policy minimum:

- `workspace.read` untuk anggota aktif;
- `workspace.manage` untuk OWNER dan ADMIN;
- `workspace.members.manage` untuk OWNER dan ADMIN, dengan proteksi owner terakhir;
- `workspace.billing.manage` hanya OWNER pada tahap awal;
- `workspace.delete` tidak tersedia;
- platform ADMIN tidak otomatis menjadi anggota workspace.

Akses support lintas workspace ditunda ke M2 dan harus memakai permission platform, alasan, expiry, serta audit.

### 5.4 Backfill merchant ke workspace

Backfill harus dapat dilanjutkan dan aman dijalankan ulang.

Urutan:

1. Baca `merchant_profiles` dalam batch yang stabil.
2. Buat workspace dengan nama, slug, status, dan branding yang setara.
3. Tentukan `kind = EXTERNAL` untuk merchant lama, kecuali daftar internal yang ditetapkan eksplisit.
4. Buat membership `OWNER` untuk `merchant_profiles.user_id`.
5. Buat `legacy_merchant_workspace_links`.
6. Salin branding tanpa menghapus data lama.
7. Catat success, skip, dan failure per record.
8. Jalankan laporan rekonsiliasi.

Backfill tidak boleh:

- menebak workspace internal hanya berdasarkan email;
- mengubah `users.role`;
- memindahkan product, order, ledger, atau enrollment;
- menulis secret atau data pribadi ke log;
- membuat dua workspace ketika job dijalankan ulang.

### 5.5 Rekonsiliasi M1

| Pemeriksaan | Hasil yang diwajibkan |
|---|---|
| Merchant ke workspace | jumlah link sama dengan jumlah merchant profile |
| Workspace owner | setiap workspace hasil backfill memiliki satu owner aktif |
| Slug | tidak ada duplikasi dan perubahan slug tercatat |
| Branding | nilai penting sama dengan profil merchant lama |
| Orphan | tidak ada link tanpa merchant, user, atau workspace |
| Idempotensi | rerun tidak menambah workspace atau membership |
| Produksi lama | jumlah product, order, ledger, payout, dan enrollment tidak berubah |

### 5.6 Backlog M1

| ID | Pekerjaan | Ketergantungan | Gate |
|---|---|---|---|
| M1-01 | Buat modul `workspace` dan kontraknya | M0 selesai | aturan import lulus |
| M1-02 | Tambah enum dan tabel M1 | M1-01 | migration aditif lulus |
| M1-03 | Implementasikan repository workspace | M1-02 | tidak ada query tanpa scope pada repository baru |
| M1-04 | Implementasikan membership policy | M1-03 | unit dan negative test lulus |
| M1-05 | Implementasikan resolver active workspace | M1-04 | session, route, dan membership tervalidasi |
| M1-06 | Buat backfill idempoten | M1-02 | rerun menghasilkan selisih nol |
| M1-07 | Buat laporan rekonsiliasi | M1-06 | seluruh pemeriksaan lulus |
| M1-08 | Tambah workspace switcher di balik feature flag | M1-05 | hanya user multi-workspace yang melihat |
| M1-09 | Tambah audit context | M1-05 | log terstruktur tanpa PII berlebih |
| M1-10 | Uji staging dan canary internal | seluruh pekerjaan | tidak ada regresi route lama |

### 5.7 Strategi route dan pengalaman pengguna

M1 mempertahankan `/dashboard` sebagai compatibility route.

- User dengan satu workspace diarahkan ke workspace tersebut secara transparan.
- User dengan beberapa workspace harus memilih active workspace.
- Target route baru memakai pola `/w/[workspaceSlug]/dashboard`.
- Cookie pilihan workspace hanya menyimpan referensi. Server tetap memverifikasi membership setiap request.
- Workspace switcher dirilis lebih dahulu untuk akun internal Rizqhub melalui feature flag.
- Route lama tidak dihapus sebelum M2 dan periode stabil selesai.

### 5.8 Test minimum M1

| Area | Skenario wajib |
|---|---|
| Membership | satu user dua workspace, role berbeda, status berbeda |
| Isolation | anggota A tidak dapat membaca atau mengubah workspace B |
| Owner invariant | owner terakhir tidak dapat keluar atau diturunkan |
| Resolver | route valid, slug salah, membership dicabut, workspace suspended |
| Backfill | data normal, slug bentrok, rerun, kegagalan sebagian, resume |
| Branding | data legacy tersalin dan tetap terisolasi |
| Modules | module key tidak valid ditolak, settings divalidasi |
| Domains | hostname dinormalisasi, unik, token tidak tersimpan mentah |
| Compatibility | dashboard merchant lama tetap berfungsi |
| Regression | checkout, payment, order, LMS, community, finance tidak berubah |

### 5.9 Rollout M1

1. Jalankan migration aditif di staging.
2. Jalankan backfill staging dan rekonsiliasi.
3. Ulangi migration serta backfill dari backup produksi yang dianonimkan bila tersedia.
4. Deploy kode dengan feature flag workspace nonaktif.
5. Jalankan migration produksi melalui satu release job.
6. Jalankan backfill batch kecil di luar transaksi panjang.
7. Pantau error, lock, latency, dan hasil rekonsiliasi.
8. Aktifkan resolver untuk akun internal Rizqhub.
9. Aktifkan switcher untuk canary internal.
10. Perluas hanya setelah periode stabil dan regression test produksi lulus.

Rollback aplikasi dilakukan dengan mematikan feature flag. Tabel M1 tetap ada. Rollback tidak menghapus data yang telah di-backfill.

### 5.10 Exit criteria M1

M1 selesai jika:

- setiap merchant lama memiliki workspace dan owner aktif;
- satu user dapat memiliki membership aktif pada dua workspace;
- active workspace selalu diverifikasi server-side;
- negative read dan write isolation test lulus;
- rerun backfill menghasilkan selisih nol;
- route dashboard lama tetap bekerja;
- checkout, payment, finance, LMS, dan community tidak mengalami regresi;
- workspace switcher lulus canary internal;
- tidak ada perubahan pada total product, order, ledger, payout, dan enrollment;
- tidak ada tabel lama yang dihapus;
- rencana M2 disetujui berdasarkan hasil M1, bukan asumsi awal.

## 6. Struktur source target untuk M1

```text
src/
  modules/
    workspace/
      domain/
      application/
      infrastructure/
      presentation/
      index.ts
  platform/
    auth/
    database/
    observability/
    feature-flags/
```

Aturan import:

- route mengakses application use case, bukan tabel;
- domain tidak mengimpor Next.js, Drizzle, atau provider eksternal;
- infrastructure mengimplementasikan repository contract;
- modul lain hanya mengimpor public contract dari `modules/workspace/index.ts`;
- `src/lib/schema.ts` dapat tetap menjadi compatibility export sementara, tetapi schema baru harus memiliki ownership yang jelas;
- pelanggaran batas import harus diperiksa oleh lint atau architecture test.

## 7. Definition of Ready untuk mulai coding

Coding M0 dapat dimulai setelah:

- repository target dan production branch diketahui;
- aturan akses repository jelas;
- staging database dan credential non-produksi tersedia;
- keputusan provider sandbox atau fake adapter tersedia;
- penanggung jawab release dan rollback ditetapkan.

Coding M1 dapat dimulai setelah seluruh exit criteria M0 lulus.

## 8. Keputusan yang sengaja ditunda

Hal berikut tidak termasuk M0 dan M1:

- custom role dan custom permission;
- RLS aktif pada tabel produksi;
- migrasi product, order, ledger, payout, dan enrollment ke `workspace_id`;
- Customer 360;
- entitlement;
- transactional outbox runtime;
- landing page builder;
- CRM baru;
- automasi baru;
- custom domain routing aktif;
- perubahan branding menjadi Lajurin by Rizqhub;
- microservices.

Penundaan ini bukan penolakan. Urutannya dijaga agar fitur baru tidak dibangun di atas tenant model yang belum stabil.

## 9. Urutan keputusan berikutnya

Setelah dokumen ini diterima:

1. Tetapkan repository dan branch kerja.
2. Kerjakan M0-01 sampai M0-05.
3. Tambah test M0-06 sebelum perubahan schema M1.
4. Selesaikan recovery dan observability.
5. Review exit criteria M0.
6. Baru buat migration M1.

Tidak ada estimasi tanggal dalam dokumen ini. Estimasi tanpa ukuran tim, kapasitas mingguan, akses staging, dan velocity akan menyesatkan. Estimasi dibuat setelah backlog M0 dipecah menjadi issue teknis dan owner ditetapkan.
