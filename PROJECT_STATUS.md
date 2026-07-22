# Status Proyek Lajurin

## Versi aktif source

- Versi paket: **1.0.2 — Sprint 1 Merchant Control Candidate**
- Dasar pengembangan: branch `main` repository `muhamadsofyanar/lajurin`
- Commit dasar: `4d36e11b066ebe8b504505de56d3ec44650be854` (`v2`, 22 Juli 2026)
- Database: PostgreSQL + Drizzle ORM
- Deployment pengguna: Coolify, domain `legaone.id`

## Perubahan dalam pengerjaan — Sprint 1

- UI Ringkasan Dashboard usaha dirapikan tanpa mengubah schema atau logika bisnis.
- Status toko, metrik keuangan, katalog produk, dan aksi cepat memiliki hierarki yang lebih jelas.
- Tampilan responsif Dashboard sudah dipromosikan melalui Coolify pada 23 Juli 2026 dan healthcheck produksi berhasil.
- Landing Page Builder dasar tetap tersedia dari v0.8. Custom Domain, Broadcast & Abandoned Checkout, serta Automatic Payout & Refund belum dimulai pada perubahan ini.
- Admin dapat mengedit nama pemilik, email login, email support, status verifikasi, dan komisi merchant melalui halaman control plane yang diaudit.
- Edit merchant v1.0.2 masih berstatus kandidat dan belum dipromosikan ke produksi.
- Schema dan migration tetap kompatibel; migration terbaru tetap `0010`.

## Keputusan pembayaran manual yang masih diblokir

- Rekening transfer manual saat ini berasal dari `MANUAL_BANK_*` dan merupakan rekening platform.
- Ledger setelah pembayaran disetujui mengkredit saldo merchant untuk payout, sehingga uang dianggap diterima platform.
- Merchant belum boleh menyetujui/menolak bukti transfer tersebut karena tidak memiliki kewenangan memeriksa mutasi rekening platform.
- Sebelum konfirmasi merchant dapat diterapkan, desain harus menetapkan rekening penerimaan per merchant, snapshot tujuan pembayaran, settlement langsung, cara penagihan komisi, idempotensi, dan perlakuan payout/refund.

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
- Liveness dan readiness dipisahkan; container hanya healthy jika database, konfigurasi wajib, dan empat volume siap.
- Admin dapat mencatat refund penuh yang sudah dikirim; enrollment dicabut dan net merchant dibalik melalui ledger append-only.
- Security headers global, maksimal lima sesi aktif per akun, serta cleanup sesi kedaluwarsa diterapkan.
- Empat automated test kritis dan alat manifest SHA-256 volume tersedia.

### Responsive navigation v1.0.1

- Header desktop menampilkan empat menu utama sesuai role, menu sekunder terkelompok, notifikasi, dan menu akun.
- Tablet dan ponsel menggunakan panel navigasi vertikal tanpa horizontal overflow.
- Kepala dashboard dan tombol aksi menyesuaikan layar sempit tanpa mengubah rute maupun hak akses.

## Database terbaru

Migration terbaru: `drizzle/0010_v100_production_readiness.sql`.

Migration v1.0.0 (`0010`):

1. Menambah tabel `webhook_events` dan enum status pemrosesan.
2. Menambah tabel `rate_limits` untuk throttling konsisten lintas replica.
3. Menambah metadata refund penuh pada pesanan.
4. Tidak menghapus, mengubah nominal, atau memigrasikan ulang transaksi/enrollment lama.

Migration v0.9.0 (`0009`):

1. Menambah ruang komunitas, reaction, laporan, status moderasi, dan media postingan.
2. Memindahkan postingan lama ke ruang umum Lajurin tanpa kehilangan post atau komentar.
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
- Builder blok bebas/drag-and-drop dan custom domain merchant.
- Broadcast massal, abandoned checkout terjadwal, dan automation dengan delay/branch.
- Cakupan automated integration/E2E yang lebih luas dan uji transaksi nyata dengan database staging/Xendit Test Mode.

## Rekomendasi tahap berikutnya

Tahap berikut adalah **validasi staging dan rollout kandidat v1.0.2**. Uji edit merchant oleh ADMIN, navigasi ADMIN/MERCHANT/MEMBER pada desktop serta ponsel, lalu lanjutkan regresi checkout manual/Xendit Test Mode, refund, payout, komunitas, inbox, automation, dan backup–restore volume sebelum redeploy produksi satu kali. Konfirmasi manual oleh merchant tetap diblokir sampai desain settlement langsung disetujui.
