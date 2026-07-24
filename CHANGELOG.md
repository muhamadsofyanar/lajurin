# Changelog

## 5.0.0-alpha.1 — Platform Kernel

- Menambahkan transactional outbox, worker, retry, lease recovery, dead-letter, dan replay.
- Menambahkan request/correlation/trace ID serta structured logging.
- Memindahkan notification dan automation kritis ke event pasca-commit.
- Membuat reservasi stok checkout atomik.
- Menambahkan policy engine, operational metrics, migration 0026, dan test platform kernel.

## 4.0.1 — 24 Juli 2026

### Integritas finansial dan keamanan

- Komisi affiliate kini dicadangkan dan diikat ke payout request tertentu.
- Permintaan dan review payout memakai advisory lock serta validasi jumlah.
- Stok terbatas dilepas idempoten ketika pembayaran Xendit gagal atau kedaluwarsa.
- Level verifikasi legacy yang tidak valid dinormalisasi.
- Next.js, PostCSS, dan Sharp diperbarui untuk menutup temuan dependency audit.
- CI menambahkan integration test PostgreSQL untuk payout dan stok.
- Migration aditif terbaru adalah `0025_financial_integrity.sql`.

## 1.5.1 — 23 Juli 2026

### Rebrand Rizqhub dan perbaikan deployment

- Mengganti branding aktif Lajurin menjadi Rizqhub pada UI, metadata, email, sertifikat, ekspor, health response, seed, backup, konfigurasi, dan dokumentasi operasional.
- Menjaga kompatibilitas cookie sesi/workspace, visitor analytics, dan record TXT verifikasi domain lama selama rolling update.
- Menambah migration aditif `0017_rizqhub_rebrand.sql` untuk memperbarui ruang komunitas umum tanpa mengubah migration historis.
- Memperjelas `INTERNAL_JOB_SECRET` sebagai secret runtime wajib minimal 32 karakter, menolak Docker Compose yang kosong lebih awal, dan menambah langkah pengisian Coolify.
- Memasang `wget` secara eksplisit pada runner image agar perintah Docker healthcheck tersedia.
- Menambah `.dockerignore` agar secret lokal, dependency, build cache, data, dan arsip tidak masuk build context.
- Menambah logo mark Rizqhub dan favicon baru.

## 1.5.0 — 23 Juli 2026

### Penyelesaian lima tahap

- Memusatkan matriks hak akses Owner, Admin, Finance, dan Staff. Staff hanya memiliki akses baca dan operasional dasar. Finance, anggota, broadcast, dan domain tetap ditolak pada UI serta Server Action.
- Membuat konsumsi undangan dan reset password aman terhadap request bersamaan. Membership aktif kini menentukan hak owner lama, sehingga penurunan peran atau penonaktifan benar-benar berlaku.
- Memisahkan draft builder dari kolom publik, termasuk urutan section dan media. Editor mendukung drag, tombol keyboard, preview desktop/mobile, simpan draft, serta publish eksplisit.
- Memverifikasi Custom Domain melalui TXT, CNAME, dan HTTPS. Status DNS, SSL, target CNAME, waktu pemeriksaan, serta error terakhir disimpan tanpa mengubah routing `legaone.id`.
- Menambah consent pemasaran di checkout, segmentasi produk, template pesan, antrean `SKIP LOCKED`, batas 100 penerima per kampanye, batas harian, batch, log setiap percobaan, dan retry maksimal tiga kali.
- Menambah endpoint job broadcast bertoken, pemulihan claim macet, metrik webhook/broadcast pada pusat operasional, error boundary, serta monitoring error proses.
- Memperketat webhook Xendit terhadap metode pembayaran yang salah dan timestamp masa depan.
- Menambah migration aditif `0016_five_stage_production.sql`, indeks antrean/performa, serta alat membuat dan memverifikasi backup PostgreSQL.
- Automatic payout dan pengiriman refund tetap tidak diaktifkan. Kedua fitur tetap menunggu desain provider, idempotensi, rekonsiliasi, dan security review khusus transaksi uang.

## 1.4.2 — 23 Juli 2026

### Routing Home di belakang Coolify

- Membaca hostname publik dari header `Host` dan `X-Forwarded-Host`, termasuk nilai berantai dari reverse proxy.
- Memastikan `legaone.id` dan `www.legaone.id` tetap membuka Home ketika URL internal container berbeda dari domain browser.
- Mempertahankan resolver Custom Domain merchant untuk hostname selain domain platform.
- Menambah regression test perilaku untuk domain utama, forwarded host Coolify, dan custom domain merchant.
- Tidak menambah migration atau mengubah database, data merchant, transaksi, payment, maupun feature flag.

## 1.4.1 — 23 Juli 2026

### Home dan pemulihan domain utama

- Memperbaiki `legaone.id` dan `www.legaone.id` agar selalu dikenali sebagai domain platform, sehingga root `/` tidak lagi salah diperlakukan sebagai Custom Domain merchant dan berakhir `404`.
- Menambah dukungan `PLATFORM_HOSTNAMES` opsional untuk alias domain platform tambahan tanpa mengubah source.
- Memperbarui Home publik menjadi halaman produk lengkap: hero, preview dashboard, ringkasan manfaat, enam kelompok fitur, alur empat langkah, model penggunaan, kontrol akses, FAQ, CTA, dan footer.
- Menambah metadata Home yang lebih spesifik untuk judul dan deskripsi mesin pencari.
- Menambah regression test untuk routing domain utama dan kelengkapan konten Home.
- Tidak menambah migration atau mengubah data merchant, transaksi, payment, ledger, payout, maupun feature flag.

## 1.3.1 — 23 Juli 2026

### Workspace recovery

- Menambah migration aditif `0014_workspace_owner_backfill.sql` yang otomatis membuat Workspace, membership Owner aktif, branding, compatibility link, dan audit log untuk merchant lama yang belum memiliki Workspace.
- Backfill bersifat idempoten dan memakai advisory lock; tidak memerlukan database public port, PowerShell, atau perintah manual setelah deployment.
- Pendaftaran merchant baru kini membuat profil merchant dan Workspace dalam transaksi database yang sama agar masalah tidak terulang.
- Tidak mengubah transaksi, payment, ledger, komisi, payout, produk, atau data merchant yang sudah memiliki Workspace.

## 1.3.0 — 23 Juli 2026

### Integrated Business Suite (candidate)

- Menambah feature flag database untuk Workspace, transfer langsung, tagihan komisi, Landing Page Builder, laporan, dan notifikasi dasar. Seluruh flag baru default `OFF` dan dapat diaktifkan global atau canary per User ID tanpa redeploy.
- Menambah manajemen anggota Workspace dengan peran Owner, Admin, Finance, dan Staff; perubahan peran/status memiliki audit log dan melindungi owner aktif terakhir.
- Menambah pelunasan komisi merchant: snapshot rekening tujuan platform, bukti privat, antrean verifikasi admin, notifikasi, advisory lock, dan pengurangan ledger piutang secara atomik.
- Menambah halaman pusat Landing Page Builder yang memakai editor dan halaman publik yang sudah kompatibel.
- Menambah laporan penjualan 7/30/90 hari atau seluruh periode beserta ekspor CSV yang melindungi formula injection.
- Transfer langsung merchant hanya digunakan bila feature flag aktif; bila nonaktif, transfer manual tetap memakai rekening platform dan jalur lama.
- Menambah migration aditif `0013_demonic_trish_tilby.sql` dan volume persisten `commission-proofs`.

## 1.2.0 — 23 Juli 2026

### Direct manual settlement (candidate)

- Merchant dapat menyimpan dan mengaktifkan rekening penerimaan transfer manual yang terpisah dari rekening payout.
- Checkout menyimpan snapshot rekening tujuan dan settlement mode pada setiap pesanan; seluruh pesanan lama tetap `PLATFORM`.
- Merchant dapat menyetujui atau menolak bukti untuk transfer langsung miliknya. Admin tetap dapat override dengan alasan wajib dan audit log.
- Advisory lock dan conditional update mencegah konfirmasi ganda.
- Transfer langsung tidak mengkredit saldo payout. Komisi dicatat ke ledger piutang platform secara idempoten dan dibalik ketika refund dicatat.
- Xendit serta transfer ke rekening platform tetap memakai alur lama.
- Menambah migration aditif `0012_numerous_marvel_boy.sql`.

## 1.1.0 — 23 Juli 2026

### Workspace Foundation M1 (candidate)

- Menambah model `workspaces`, membership multi-workspace, branding, aktivasi modul, domain, dan compatibility link merchant lama secara aditif.
- Menambah policy terpusat untuk read/manage/member/billing serta proteksi owner aktif terakhir.
- Menambah resolver active workspace yang selalu memverifikasi membership dan status workspace server-side; cookie hanya menjadi referensi.
- Menambah backfill merchant lama per-record transaction yang idempoten, resumable, dan memakai advisory lock, serta laporan rekonsiliasi terpisah.
- Menambah `workspace_id` dan `request_id` opsional pada audit log agar operasi M1 memiliki actor dan workspace context.
- Menambah route dan switcher Workspace canary di balik `WORKSPACE_FOUNDATION_ENABLED` dan daftar UUID eksplisit `WORKSPACE_CANARY_USER_IDS`.
- Menambah migration aditif `0011_wide_onslaught.sql`; tabel dan kolom legacy tidak dihapus atau dipindahkan.

Feature flag default nonaktif. Produk, order, payment, ledger, payout, enrollment, komunitas, serta LMS masih memakai jalur legacy sampai cutover M2 disetujui. Kandidat M1 tidak boleh dipromosikan ke produksi sebelum gate M0, backfill staging, rekonsiliasi, dan regression test lulus.

## 1.0.2 — 23 Juli 2026

### Ditambahkan

- Admin memiliki halaman khusus untuk mengedit data control-plane merchant: nama pemilik, email login, email support, status verifikasi, dan komisi khusus.
- Perubahan data kontrol dicatat sebagai audit event `MERCHANT_CONTROL_UPDATED` tanpa memasukkan brand, rekening, produk, landing page, atau konten toko ke ruang edit admin.
- Validasi email unik, normalisasi email, batas komisi dua desimal, dan fallback komisi default platform.
- Quality gate rilis memisahkan pemeriksaan integritas baseline historis v1.0.1 dari verifikasi source aktif, sehingga CI rilis baru tidak salah ditolak hanya karena source berkembang secara sah.

### Diperbaiki

- Ringkasan Dashboard usaha memiliki hierarki visual yang lebih jelas untuk status toko, aksi utama, metrik keuangan, katalog, dan pintasan operasional.
- Kartu metrik kini menjelaskan konteks setiap nilai tanpa mengubah sumber maupun perhitungan data.
- Daftar produk lebih mudah dipindai pada desktop dan ponsel, termasuk harga, status, jumlah pesanan, serta kondisi kosong.
- Target fokus keyboard dan susunan responsif Dashboard diperjelas untuk mendukung target WCAG 2.2 AA.
- Perubahan hanya menyentuh presentasi Dashboard; schema, migration, hak akses, dan alur transaksi tetap sama.

### Keputusan arsitektur tertunda

- Konfirmasi transfer manual oleh merchant belum diaktifkan. Rekening tujuan manual saat ini masih rekening platform (`MANUAL_BANK_*`) dan pencatatan saldo mengasumsikan dana diterima platform; mengaktifkan merchant sebagai verifier akan melanggar otorisasi dan berisiko menggandakan hak payout.
- Implementasi berikutnya harus memisahkan rekening penerimaan merchant dari rekening payout, menyimpan snapshot tujuan pada order/payment, serta menetapkan cara penagihan komisi untuk settlement langsung sebelum hak konfirmasi merchant ditambahkan.

Tidak ada migration baru; migration terbaru tetap `0010`.

## 1.0.1 — 22 Juli 2026

### Diperbaiki

- Navigasi desktop diringkas menjadi empat tujuan utama, menu sekunder terkelompok, notifikasi, dan menu akun agar header tidak lagi padat.
- Navigasi tablet dan ponsel menggunakan panel vertikal dengan target sentuh yang jelas; daftar menu tidak lagi meluber atau bergulir horizontal.
- Kepala halaman dashboard berubah menjadi susunan vertikal pada layar kecil dan tombol aksi tersusun dalam grid dua kolom.
- Seluruh rute admin, merchant, member, komunitas, inbox, notifikasi, dan logout tetap tersedia sesuai role.

## 1.0.0 — 22 Juli 2026

### Production readiness

- Pusat **Admin → Operasional** untuk status database, konfigurasi, empat storage persisten, rate limit aktif, dan 100 webhook terakhir.
- Endpoint liveness `/api/health` dipisahkan dari readiness `/api/ready`; health check container kini memakai readiness.
- Log webhook Xendit dengan fingerprint idempoten, request ID, status proses, response status, payload, error, dan waktu proses.
- Rate limit berbasis PostgreSQL untuk login, pendaftaran, checkout, unggah bukti, serta event analitik publik.
- Refund penuh manual oleh admin setelah dana dikirim: akses enrollment dicabut, hak bersih merchant dibalik melalui ledger, member diberi notifikasi, dan tindakan masuk audit log.
- Pemeriksaan signature JPG/PNG/WebP/PDF serta penolakan path traversal pada seluruh storage.
- Security headers global, pembatasan sesi aktif, pembersihan sesi kedaluwarsa, dan structured log untuk webhook.
- Manifest SHA-256 empat volume melalui `npm run ops:storage-manifest` untuk verifikasi backup/restore file.
- Automated test untuk perhitungan komisi/diskon, signature upload, dan keamanan path storage.
- Migration `0010_v100_production_readiness.sql` tanpa menghapus atau menulis ulang data lama.

### Diperbaiki

- Webhook completed/expired dan refund memakai advisory lock pesanan yang sama agar status tidak saling menimpa saat diproses bersamaan.
- Webhook completed yang datang setelah refund tidak dapat mengaktifkan kembali pesanan atau enrollment.
- Unggah ulang bukti pembayaran menghapus file lama setelah database berhasil diperbarui dan membersihkan file baru bila update gagal.
- Pendaftaran email yang bersamaan tidak lagi menghasilkan error server karena konflik unique ditangani secara atomik.

## 0.9.0 — 22 Juli 2026

### Ditambahkan

- Ruang komunitas umum, per merchant, dan per produk dengan akses berbasis enrollment.
- Upload gambar komunitas privat melalui persistent storage `/app/data/community-media`.
- Reaction, laporan post/komentar, antrean moderasi, sematkan, serta sembunyikan/tampilkan konten.
- Inbox privat merchant–member yang dipisahkan per produk, status baca, dan notifikasi pesan.
- Pusat notifikasi dalam aplikasi untuk transaksi, komunitas, inbox, dan automation.
- Menu Pelanggan merchant dengan filter produk, segmentasi progres, aktivitas terakhir, serta pintasan percakapan.
- Automation Mailketing/StarSender untuk pembayaran lunas dan kelas selesai, filter produk, template variabel, dan riwayat delivery.
- Migration `0009_v090_community_inbox_automation.sql` beserta backfill postingan lama ke ruang umum.

### Keamanan dan keandalan

- Hak akses ruang diverifikasi ulang pada setiap Server Action dan route media, bukan hanya disembunyikan dari UI.
- Merchant hanya dapat membuat ruang, melihat pelanggan, memulai inbox, serta membuat automation untuk produk miliknya.
- Percakapan unik per merchant–member–produk mencegah data lintas merchant tercampur.
- Delivery automation unik per aturan, sumber kejadian, dan kanal agar webhook/progres berulang tidak menggandakan pesan.
- Kegagalan provider tidak membatalkan pembayaran, enrollment, progres, atau notifikasi dalam aplikasi.
- Postingan dan komentar lama dipertahankan; migration tidak menghapus data versi sebelumnya.

## 0.8.0 — 22 Juli 2026

### Ditambahkan

- Tiga template landing page dengan section hero video, pengajar, bonus, testimoni, FAQ, jaminan, harga coret, dan masa promo.
- Upload cover serta foto pengajar ke persistent storage `/app/data/landing-media`.
- Kupon persen/nominal dengan periode aktif, kuota, status, dan redemption saat transaksi lunas.
- Order bump dalam satu transaksi serta enrollment produk utama dan produk tambahan.
- Rekomendasi upsell dan downsell setelah pembelian sebagai transaksi baru yang tetap dapat diaudit.
- Meta Pixel, TikTok Pixel, parameter UTM, event page view/checkout/purchase, dan dashboard analitik merchant.
- Snapshot subtotal, diskon, kode kupon, harga order bump, serta atribusi pada pesanan dan ekspor CSV.
- Migration `0007_ambiguous_sinister_six.sql` dan `0008_third_namor.sql`.

### Keamanan dan keandalan

- Penawaran funnel hanya dapat memakai produk milik merchant yang sama.
- Input tracking hanya menerima ID provider; merchant tidak dapat menyisipkan script bebas.
- Penggunaan kupon, enrollment bump, event purchase, dan ledger tetap idempoten terhadap retry webhook.
- Satu order dapat memiliki beberapa enrollment tanpa menghapus constraint unik user–course.
- Kupon yang sudah memiliki redemption tidak dapat dihapus agar jejak transaksi tetap tersedia.

## 0.7.0 — 22 Juli 2026

### Ditambahkan

- Status merchant PENDING, ACTIVE, dan SUSPENDED beserta kontrol aktivasi admin.
- Komisi default platform dan komisi khusus merchant dalam basis points.
- Snapshot bruto, komisi, dan pendapatan bersih pada setiap transaksi PAID.
- Ledger saldo merchant yang idempoten terhadap retry webhook.
- Rekening pencairan, permintaan payout, pencadangan saldo, konfirmasi admin, dan pengembalian saldo saat ditolak.
- Pusat admin untuk merchant, produk, member, seluruh transaksi, ekspor CSV, payout, pengaturan, dan audit log.
- Halaman merchant **Saldo & payout** dengan rincian penjualan, saldo, payout, dan mutasi ledger.
- Migration `0006_multi_merchant_finance.sql` dengan backfill transaksi PAID lama.

### Keamanan dan keandalan

- Advisory transaction lock mencegah dua payout memakai saldo yang sama.
- Komisi disimpan sebagai snapshot sehingga perubahan tarif tidak menulis ulang transaksi lama.
- Payout hanya ditandai dibayar oleh admin setelah referensi transfer diisi; tidak ada transfer otomatis tersembunyi.
- Merchant tertangguh tidak memiliki toko/checkout publik, tetapi masih dapat login untuk melihat data.
- Webhook expired yang datang terlambat tidak dapat menurunkan transaksi PAID.

## 0.6.0 — 22 Juli 2026

### Ditambahkan

- Profil toko satu-per-merchant dengan identitas brand, slug publik, kontak, logo URL, dan warna.
- Etalase merchant publik di `/m/[slug]`.
- Editor landing page per produk dan landing page publik dengan hero, gambar, manfaat, sasaran peserta, CTA, kurikulum, harga, dan identitas merchant.
- Identitas merchant pada checkout, kartu kursus member, dan halaman belajar.
- Migration `0005_multi_merchant_landing.sql` yang juga membuat profil dasar untuk merchant lama.

### Diperjelas dan diamankan

- Dashboard merchant diberi label “Dashboard usaha” dan tetap difilter berdasarkan merchant yang login.
- “Kelas Saya” tetap satu area lintas merchant karena merupakan perpustakaan milik member, bukan dashboard penjual.
- Dashboard admin menampilkan agregat seluruh merchant.
- Aksi setujui/tolak transfer tetap hanya menggunakan `requireAdmin`; merchant tidak mendapat kontrol konfirmasi.
- Navigasi membedakan area Admin, Dashboard usaha, dan Kelas Saya.

## 0.5.0 — 22 Juli 2026

### Ditambahkan

- Integrasi WhatsApp StarSender melalui API key device.
- Integrasi email transaksional Mailketing melalui API token dan sender terverifikasi.
- Nomor WhatsApp wajib pada checkout baru.
- Notifikasi otomatis untuk pesanan dibuat, pembayaran disetujui, dan pembayaran ditolak.
- Template pesan dengan tautan pembayaran, unggah bukti, atau akses kelas sesuai konteks.
- Tabel log pengiriman dengan status, jumlah percobaan, response provider, dan detail error.
- Halaman ADMIN Integrasi dengan indikator konfigurasi, ringkasan, riwayat, dan kirim ulang.
- Migration `0004_glorious_vermin.sql`.

### Keamanan dan keandalan

- Token provider hanya dibaca dari environment variable dan tidak dikirim ke browser.
- Pengiriman dibuat idempoten per pesanan, kanal, dan event untuk mencegah duplikasi webhook.
- Timeout provider dibatasi 10 detik; kegagalan notifikasi tidak menggagalkan transaksi.
- Respons provider dibatasi ukurannya dan tidak mencatat header/token.

## 0.4.0 — 22 Juli 2026

### Ditambahkan

- Bab/modul course dengan tambah, edit, hapus, dan pengurutan.
- Penempatan lesson ke bab serta kelompok otomatis untuk lesson lama tanpa bab.
- Tampilan kurikulum per bab pada halaman produk dan ruang belajar member.
- Upload file pendamping privat: PDF, EPUB, ZIP, Office, dan TXT maksimal 15 MB.
- Endpoint download dengan verifikasi ADMIN, merchant pemilik, atau enrollment member.
- Persistent storage `/app/data/course-files` dan volume Docker Compose `course_files`.
- Migration `0003_course_modules_files.sql`.

### Diperbaiki

- File attachment ikut dibersihkan saat attachment atau lesson dihapus.
- Batas body Server Actions dinaikkan secukupnya untuk upload 15 MB.
- Dokumentasi deploy, testing, status, dan serah-terima diperbarui ke v0.4.0.

## 0.3.0 — 22 Juli 2026

### Ditambahkan

- Pemutar video tertanam untuk YouTube, Vimeo, Loom, MP4, WebM, dan OGG.
- Tampilan kelas dengan sidebar materi dan navigasi sebelumnya/berikutnya.
- Penyimpanan progres per member dan persentase progres di dashboard.
- Sertifikat penyelesaian yang dapat dicetak/disimpan sebagai PDF.
- Preview lesson gratis pada halaman produk.
- Edit, hapus, dan ubah urutan lesson oleh merchant.
- Migration `0002_left_power_pack.sql`.
- Dokumentasi status, deployment, testing, dan serah-terima lintas akun.
- `.env.example` dan `.gitignore`.

### Diperbaiki

- Video course tidak lagi selalu diarahkan ke tab eksternal.
- Fungsi format tanggal yang dibutuhkan komunitas ditambahkan kembali.
- Direktori bukti pembayaran dibuat dengan owner aplikasi pada image Docker.
- Build artifact `tsconfig.tsbuildinfo` dikeluarkan dari source distribution.

## 0.2.0 — v2

- Dashboard admin, merchant, dan member.
- Transfer manual, unggah bukti, serta konfirmasi admin.
- Komunitas dasar.
- Navigasi berbasis role.

## 0.1.0 — MVP awal

- Produk digital, course/lesson, autentikasi, checkout Xendit, webhook, Docker, dan PostgreSQL.
