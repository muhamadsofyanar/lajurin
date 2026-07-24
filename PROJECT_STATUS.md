# Status Proyek Rizqhub

## Versi aktif source

- Versi paket source: **5.0.0-alpha.1 — Platform Kernel**
- Dasar pengembangan: branch `main` repository `muhamadsofyanar/lajurin`
- Commit dasar: `4d36e11b066ebe8b504505de56d3ec44650be854` (`v2`, 22 Juli 2026)
- Database: PostgreSQL + Drizzle ORM
- Deployment pengguna: Coolify, domain `legaone.id`
- Migration terbaru: `0026_v500_platform_kernel.sql`.
- Quality gate target v5 alpha: checksum migration, unit/static test, lint, TypeScript, production build, PostgreSQL integration test, payment sandbox, dan restore drill. Pada paket ini, checksum/configuration validation telah lulus; install dependency penuh tertahan oleh respons 503 registry internal sehingga quality gate lengkap wajib dijalankan kembali di CI/staging.


## Rizqhub v5.0.0-alpha.1

Fase 0–1 blueprint v5 telah diterapkan secara aditif: transactional outbox, worker, retry/dead-letter, correlation context, policy engine, observability, dan integrasi alur payment kritis. RLS, finance v5, entitlement v2, redesign UI, CRM, analytics, dan AI belum termasuk pada alpha ini.

## Rizqhub v4.0.1

- Komisi affiliate yang diajukan untuk payout berubah dari `PENDING` menjadi `RESERVED` dan terikat ke satu permintaan payout.
- Advisory lock dan validasi jumlah mencegah permintaan paralel, perubahan saldo saat payout diproses, dan penutupan komisi yang tidak termasuk snapshot.
- Penolakan payout mengembalikan komisi ke `PENDING`; persetujuan hanya menandai komisi yang dicadangkan sebagai `PAID`.
- Stok paket berbayar dikembalikan satu kali ketika pembuatan pembayaran Xendit gagal atau webhook menyatakan order kedaluwarsa.
- Level verifikasi legacy `VERIFIED` dinormalisasi menjadi `IDENTITY`.
- Next.js diperbarui ke 16.2.11 dengan override PostCSS dan Sharp yang telah menutup temuan audit dependensi.
- CI menjalankan test integrasi transaksi kritis pada PostgreSQL setelah seluruh migration berhasil.

## Riwayat pra-v4

## Rizqhub v1.5.1

- Seluruh branding aktif pada UI, metadata, notifikasi, sertifikat, ekspor, seed, backup, health response, dan konfigurasi default sudah memakai Rizqhub.
- Cookie sesi, cookie workspace, visitor analytics, dan verifikasi TXT legacy tetap dibaca selama masa transisi.
- Migration aditif `0017_rizqhub_rebrand.sql` memperbarui ruang komunitas umum tanpa mengubah migration lama.
- `INTERNAL_JOB_SECRET` tetap wajib minimal 32 karakter; Docker Compose sekarang menolak konfigurasi kosong lebih awal dan runbook Coolify menjelaskan pengisian yang benar.
- Image runner memasang `wget` secara eksplisit untuk healthcheck `/api/ready`.

## Lima tahap v1.5.0

- Tahap 1 selesai pada source: undangan, password, reset, empat role, penonaktifan, proteksi owner, matriks navigasi, dan Server Action konsisten. Pengujian otomatis mencakup Staff secara eksplisit.
- Tahap 2 selesai pada source: urutan draft tidak lagi bocor ke publik, unggahan media masuk draft, drag/reorder tersedia, dan publish mengubah versi publik secara eksplisit.
- Tahap 3 selesai pada source: TXT, CNAME, SSL, error terakhir, dan proteksi hostname platform tersedia. Aktivasi Coolify serta sertifikat tetap harus diuji pada satu domain canary nyata.
- Tahap 4 selesai pada source: consent, segmentasi produk/audience, template, antrean, batch, batas harian, delivery log, attempt log, dan retry tersedia.
- Tahap 5 selesai pada source: pemeriksaan webhook, monitoring proses, error UI, metrik operasional, indeks, alat backup, verifikasi arsip, automated test, lint, typecheck, dan build.
- Automatic payout dan automatic refund berada di luar v1.5.0.

## Workspace Foundation M1 — candidate

- Schema Workspace ditambahkan secara aditif melalui migration `0011_wide_onslaught.sql`.
- Merchant legacy dapat di-backfill menjadi satu workspace EXTERNAL, satu membership OWNER aktif, branding tersalin, dan compatibility link unik.
- Backfill berjalan per merchant, memakai transaction dan advisory lock, dapat dilanjutkan, serta aman dijalankan ulang.
- Resolver active workspace memverifikasi user, membership, dan status workspace server-side.
- Workspace switcher hanya muncul untuk akun dengan minimal dua workspace yang tercantum eksplisit sebagai canary.
- `WORKSPACE_FOUNDATION_ENABLED` default `false`; route dan switcher baru tidak mengubah pengalaman produksi saat flag mati.
- Query produk, transaksi, payment, ledger, payout, enrollment, LMS, dan komunitas belum dipindahkan ke `workspace_id` pada M1.
- Custom domain baru dimodelkan; verifikasi dan routing domain belum diaktifkan.
- Verifikasi lokal kandidat v1.2.0: 13 migration file valid, 19/19 test lulus, lint, TypeScript, dan production build lulus. Migration/backfill PostgreSQL nyata menunggu staging.

## Perubahan dalam pengerjaan — Sprint 1

- UI Ringkasan Dashboard usaha dirapikan tanpa mengubah schema atau logika bisnis.
- Status toko, metrik keuangan, katalog produk, dan aksi cepat memiliki hierarki yang lebih jelas.
- Tampilan responsif Dashboard sudah dipromosikan melalui Coolify pada 23 Juli 2026 dan healthcheck produksi berhasil.
- Landing Page Builder dasar tetap tersedia dari v0.8. Custom Domain, Broadcast & Abandoned Checkout, serta Automatic Payout & Refund belum dimulai pada perubahan ini.
- Admin dapat mengedit nama pemilik, email login, email support, status verifikasi, dan komisi merchant melalui halaman control plane yang diaudit.
- Edit merchant v1.0.2 telah diunggah dan deployment commit `2a73b412...` berstatus healthy.
- Schema M1 dan direct manual settlement tetap backward compatible; migration terbaru source kandidat v1.3.1 adalah `0014`.

## Integrated Business Suite v1.3.0 — candidate

- Feature flag database mengaktifkan modul tanpa redeploy dengan mode OFF, USERS/canary, dan ALL; seluruh flag baru default OFF.
- Workspace team management mendukung Owner, Admin, Finance, dan Staff dengan audit serta proteksi owner terakhir.
- Pelunasan komisi memiliki rekening tujuan platform, upload bukti privat, antrean admin, notifikasi, dan ledger atomik.
- Landing Page Builder memiliki pusat daftar halaman; editor lengkap dan halaman publik tetap memakai model yang kompatibel.
- Laporan penjualan mendukung periode 7/30/90 hari atau seluruh data dan ekspor CSV aman.
- Migration aditif terbaru `0013_demonic_trish_tilby.sql`; volume baru `/app/data/commission-proofs` wajib persisten.
- Verifikasi lokal v1.3.0: 14 migration file valid, 26/26 test lulus, lint tanpa warning, TypeScript, dan production build lulus. Migration PostgreSQL nyata tetap wajib diuji di staging.

## Workspace Recovery v1.3.1 — candidate

- Migration aditif `0014_workspace_owner_backfill.sql` otomatis memprovisi Workspace dan Owner aktif untuk merchant lama yang belum memiliki Workspace.
- Pendaftaran merchant baru memprovisi profil merchant dan Workspace dalam satu transaksi.
- Public port PostgreSQL dan backfill dari PowerShell tidak lagi diperlukan.
- Verifikasi lokal v1.3.1: 15 migration file valid, 28/28 test lulus, lint tanpa warning, TypeScript, dan production build lulus.

## Pembayaran manual direct — candidate

- Rekening penerimaan transfer manual merchant dipisahkan dari rekening payout dan harus diaktifkan merchant.
- Pesanan baru menyimpan snapshot tujuan serta mode `PLATFORM` atau `MERCHANT_DIRECT`; pesanan lama tetap `PLATFORM`.
- Merchant hanya dapat meninjau `MERCHANT_DIRECT` miliknya. Admin dapat override dengan alasan dan audit log.
- Settlement langsung tidak menambah saldo payout; komisi dicatat sebagai piutang platform dan refund membalik piutang tersebut.
- Migration `0012` dan alur ini masih kandidat sampai regression database staging selesai.

## Fitur selesai

### Platform v2

- Role ADMIN, MERCHANT, dan MEMBER.
- Dashboard global admin, dashboard merchant, dan dashboard member.
- Checkout Xendit atau transfer bank manual.
- Unggah bukti transfer privat dan persetujuan/penolakan admin.
- Enrollment otomatis setelah pembayaran disetujui.
- Komunitas dasar: post, komentar, dan pinned post.

### E-course v0.3.0

- Video diputar di halaman kelas, bukan membuka tab baru.
- Dukungan YouTube, Vimeo, Loom, dan URL langsung MP4/WebM/OGG.
- Sidebar daftar materi dan materi aktif.
- Navigasi materi sebelumnya/berikutnya.
- Tandai selesai atau batalkan selesai.
- Progres per member tersimpan di database.
- Persentase progres pada dashboard member.
- Sertifikat penyelesaian saat semua materi selesai.
- Merchant dapat menambah, mengedit, menghapus, dan mengurutkan materi.
- Materi dapat ditandai sebagai preview gratis di halaman produk.

### Modul dan file v0.4.0

- Merchant dapat membuat, mengedit, menghapus, dan mengurutkan bab/modul.
- Setiap lesson dapat ditempatkan ke satu bab atau dibiarkan tanpa bab.
- Halaman produk dan ruang belajar menampilkan kurikulum yang dikelompokkan per bab.
- Merchant dapat mengunggah PDF, EPUB, ZIP, dokumen Office, dan TXT maksimal 15 MB per file.
- File hanya dapat diunduh ADMIN, merchant pemilik course, atau member dengan enrollment aktif.
- File fisik ikut dibersihkan saat attachment atau lesson dihapus.

### Integrasi notifikasi v0.5.0

- Checkout mewajibkan nomor WhatsApp pembeli dan menyimpannya pada pesanan.
- Email transaksi dikirim melalui Mailketing.
- Pesan WhatsApp transaksi dikirim melalui StarSender.
- Pemicu aktif: pesanan dibuat, pembayaran disetujui, dan pembayaran ditolak.
- Notifikasi pesanan Xendit menyertakan payment link; transfer manual menyertakan halaman unggah bukti.
- Pengiriman bersifat fail-safe: gangguan provider tidak membatalkan checkout, pembayaran, atau enrollment.
- Kombinasi pesanan, kanal, dan pemicu dibuat unik untuk mencegah notifikasi ganda akibat retry webhook.
- Admin memiliki halaman status integrasi, riwayat 100 pesan terakhir, detail kegagalan, dan kirim ulang.
- Token provider hanya dibaca dari environment variable dan tidak disimpan di database/source.

### Multi-merchant dan landing page v0.6.0

- Konfirmasi transfer tetap eksklusif ADMIN; merchant hanya melihat status transaksi miliknya.
- Dashboard usaha difilter menggunakan `products.merchant_id` milik akun yang login.
- Dashboard admin tetap global dan kini menegaskan total merchant, produk semua merchant, serta transaksi platform.
- Setiap merchant memiliki profil toko: nama brand, slug, headline, bio, logo URL, email, WhatsApp, dan warna brand.
- Merchant lama memperoleh profil dasar otomatis saat migration; merchant baru memperoleh profil saat registrasi.
- Halaman toko publik `/m/[slug]` menampilkan identitas dan seluruh produk terbit milik merchant tersebut.
- Editor landing page per produk tersedia di `/dashboard/products/[id]/landing`.
- Landing page publik mendukung hero, gambar, manfaat, sasaran peserta, CTA, warna, kurikulum, dan identitas merchant.
- Dashboard member tetap satu area belajar lintas merchant, tetapi setiap kartu dan halaman kelas menampilkan pemilik kursus.
- Navigasi membedakan “Dashboard usaha”, “Kelas saya”, dan “Admin” agar peran tidak tercampur secara visual.

### Fondasi bisnis multi-merchant v0.7.0

- Admin dapat mengaktifkan, menangguhkan, dan menetapkan komisi khusus per merchant.
- Pengaturan platform menyimpan komisi default (awal aman 0%) dan minimum payout (awal Rp100.000).
- Setiap transaksi PAID menyimpan snapshot bruto, tarif komisi, nilai komisi, dan hak bersih merchant.
- Saldo merchant berasal dari ledger append-only; retry webhook tidak membuat kredit penjualan ganda.
- Merchant dapat menyimpan rekening pencairan dan mengajukan payout sesuai saldo serta minimum platform.
- Permintaan payout langsung mencadangkan saldo dan memakai advisory transaction lock untuk mencegah saldo terpakai dua kali.
- Admin menandai payout dibayar setelah transfer manual dan referensi diisi, atau menolak sehingga saldo otomatis dikembalikan.
- Admin memiliki halaman merchant, produk, member, transaksi + ekspor CSV, payout, pengaturan keuangan, dan audit log.
- Merchant PENDING/SUSPENDED tidak memiliki toko atau checkout publik; merchant lama diaktifkan saat migration.
- Webhook expired yang terlambat tidak dapat menurunkan transaksi yang sudah PAID.

### Landing page dan sales funnel v0.8.0

- Editor landing page memiliki tiga template: Editorial Trust, Creator Momentum, dan Creator Studio.
- Merchant dapat mengunggah cover serta foto pengajar ke storage persisten, atau tetap memakai URL eksternal.
- Landing page mendukung hero video, manfaat, audiens, profil pengajar, bonus, testimoni, FAQ, jaminan, harga coret, dan batas promo.
- Merchant dapat membuat kupon persen/nominal dengan periode, status, kuota, serta jumlah penggunaan yang hanya bertambah saat pembayaran PAID.
- Order bump menambahkan produk kedua milik merchant yang sama ke satu pesanan; kedua course di-enroll setelah pembayaran lunas.
- Upsell dan downsell ditampilkan sebagai rekomendasi setelah pembelian dan tetap membuat pesanan baru untuk menjaga audit keuangan.
- Meta Pixel dan TikTok Pixel menerima event view, checkout, dan purchase melalui ID provider; script bebas tidak pernah disimpan.
- UTM source, medium, dan campaign diteruskan dari landing page ke checkout serta disimpan pada pesanan.
- Dashboard Analitik menampilkan page view, checkout dimulai, pembelian, conversion rate, omzet, dan performa kampanye.
- Retry webhook tetap idempoten untuk enrollment utama/bump, redemption kupon, event purchase, dan ledger merchant.

### Komunitas, inbox, dan automation v0.9.0

- Komunitas memiliki ruang umum, ruang merchant, dan ruang produk dengan akses berdasarkan enrollment.
- Postingan mendukung gambar privat, tiga reaction, komentar, sematan, laporan, serta sembunyikan/tampilkan oleh moderator.
- Merchant hanya memoderasi ruang miliknya; ADMIN dapat memoderasi seluruh ruang.
- Postingan lama dimigrasikan ke ruang umum tanpa dihapus.
- Inbox mengikat satu merchant, satu member, dan satu produk; merchant lain tidak dapat membaca percakapan tersebut.
- Pesan baru menghasilkan notifikasi dalam aplikasi dan status belum dibaca.
- Pusat notifikasi menggabungkan transaksi, komunitas, inbox, dan automation serta mendukung tandai dibaca.
- Merchant memiliki menu Pelanggan dengan filter produk/progres, kontak, aktivitas terakhir, dan pintasan percakapan.
- Automation mendukung pemicu pembayaran lunas dan kelas selesai, filter per produk, template variabel, email Mailketing, serta WhatsApp StarSender.
- Delivery automation dicatat terpisah dan idempoten per aturan, sumber kejadian, dan kanal.

### Production readiness v1.0.0

- Rate limit PostgreSQL melindungi login, registrasi, checkout, bukti pembayaran, dan analitik publik pada deployment multi-replica.
- Upload gambar/PDF diverifikasi dari signature file dan seluruh path storage menolak traversal.
- Webhook Xendit disimpan pada log idempoten dengan request ID, status, response, payload, serta error untuk audit operasional.
- Advisory lock pesanan mencegah race antara webhook completed, expired, dan refund.
- Admin memiliki halaman Operasional untuk memeriksa database, konfigurasi, storage, blokir aktif, dan webhook terbaru tanpa menampilkan secret.
- Liveness dan readiness dipisahkan; container hanya healthy jika database, konfigurasi wajib, dan lima volume siap.
- Admin dapat mencatat refund penuh yang sudah dikirim; enrollment dicabut dan net merchant dibalik melalui ledger append-only.
- Security headers global, maksimal lima sesi aktif per akun, serta cleanup sesi kedaluwarsa diterapkan.
- Empat automated test kritis dan alat manifest SHA-256 volume tersedia.

### Responsive navigation v1.0.1

- Header desktop menampilkan empat menu utama sesuai role, menu sekunder terkelompok, notifikasi, dan menu akun.
- Tablet dan ponsel menggunakan panel navigasi vertikal tanpa horizontal overflow.
- Kepala dashboard dan tombol aksi menyesuaikan layar sempit tanpa mengubah rute maupun hak akses.

## Database terbaru

Migration terbaru: `drizzle/0026_v500_platform_kernel.sql`.

Migration integritas finansial (`0025`):

1. Mengikat komisi affiliate ke satu permintaan payout.
2. Menambah penanda pelepasan stok idempoten pada order.
3. Menormalisasi level verifikasi legacy yang tidak lagi valid.
4. Tidak mengubah nominal order, komisi, atau payout historis.

Migration direct manual settlement (`0012`):

1. Menambah rekening penerimaan merchant dan ledger piutang platform.
2. Menambah settlement mode serta snapshot tujuan pada order dengan default `PLATFORM`.
3. Tidak mengubah nominal, status, rekening tujuan, atau ledger pesanan lama.

Migration Workspace Foundation M1 (`0011`):

1. Menambah lima enum Workspace dan enam tabel M1 tanpa menghapus struktur lama.
2. Menambah `workspace_id` dan `request_id` nullable pada audit log.
3. Menambah foreign key restrict, unique compatibility links, dan index membership/domain/module.
4. Tidak memindahkan atau menulis ulang product, order, payment, ledger, payout, enrollment, maupun konten.

Migration v1.0.0 (`0010`):

1. Menambah tabel `webhook_events` dan enum status pemrosesan.
2. Menambah tabel `rate_limits` untuk throttling konsisten lintas replica.
3. Menambah metadata refund penuh pada pesanan.
4. Tidak menghapus, mengubah nominal, atau memigrasikan ulang transaksi/enrollment lama.

Migration v0.9.0 (`0009`):

1. Menambah ruang komunitas, reaction, laporan, status moderasi, dan media postingan.
2. Memindahkan postingan lama ke ruang umum Rizqhub tanpa kehilangan post atau komentar.
3. Menambah conversation, message, notifikasi dalam aplikasi, automation rule, dan delivery log.
4. Menambah constraint idempotensi pengiriman serta pemisahan percakapan merchant–member–produk.

Migration v0.8.0 (`0007` dan `0008`):

1. Menambah landing section lanjutan, template, harga promo, dan ID pixel.
2. Menambah kupon, redemption, konfigurasi funnel, serta event analitik.
3. Menambah snapshot subtotal, diskon, kupon, order bump, dan UTM pada pesanan.
4. Mengubah relasi enrollment–order agar satu pesanan dapat mengaktifkan produk utama dan order bump.
5. Melakukan backfill `subtotal_amount` dari nilai transaksi lama tanpa mengubah nominal lama.

Migration tidak menghapus tabel, kolom, lesson, pesanan, enrollment, atau data versi sebelumnya. Lesson lama tetap berada pada kelompok “Materi lainnya” sampai merchant memasukkannya ke bab.

## Belum dikerjakan

- Upload/hosting video langsung oleh platform; saat ini merchant memakai URL video.
- Masa berlaku akses kelas.
- Refund otomatis melalui API, invoice pajak, rekonsiliasi bank otomatis, dan manajemen dispute formal.
- Integrasi disbursement otomatis; payout v0.7 masih ditransfer manual oleh admin sebelum dikonfirmasi.
- Builder blok bebas/drag-and-drop.
- Recurring payment otomatis; subscription saat ini masih diaktifkan manual.
- Object storage S3-compatible, antivirus scanning, dan signed delivery URL.
- Automation dengan delay/branch serta cakupan browser E2E yang lebih luas.
- Pencarian marketplace full-text, pagination database, dan agregasi rating berskala besar.

## Rekomendasi tahap berikutnya

Tahap berikut adalah **validasi migration `0025` pada staging terpisah** lalu
menjalankan skenario payout affiliate reject/pay, checkout stok terbatas,
Xendit failed/expired/completed, refund, dan race webhook. Produksi harus
menunggu database integration test, provider sandbox, backup/restore drill,
dan smoke test browser lulus.
