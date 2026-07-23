# Checklist Pengujian Lajurin v1.3.1 Candidate

Gunakan database staging dan Xendit Test Mode. Jangan memakai transaksi uang nyata untuk pemeriksaan awal.

## Integrated Business Suite v1.3.0

- [ ] Migration `0014` otomatis membuat satu Workspace dan satu Owner aktif untuk setiap merchant lama yang belum memiliki Workspace.
- [ ] Merchant yang sudah memiliki Workspace tidak mendapat Workspace atau membership duplikat.
- [ ] Merchant baru mendapat profil merchant dan Workspace secara atomik saat pendaftaran.

- [ ] Migration `0013` berhasil dan enam feature flag muncul dalam status OFF.
- [ ] Admin dapat mengubah flag ke USERS dan ALL tanpa redeploy; User ID di luar canary tetap tidak melihat modul.
- [ ] Owner dapat menambah pengguna terdaftar sebagai Admin, Finance, atau Staff.
- [ ] Owner aktif terakhir tidak dapat diturunkan, ditangguhkan, atau dicabut.
- [ ] Transfer langsung hanya dipakai saat flag aktif dan rekening merchant aktif; saat flag mati checkout memakai rekening platform.
- [ ] Merchant mengunggah bukti pelunasan komisi; file hanya dapat dibuka merchant tersebut dan admin.
- [ ] Admin menyetujui pelunasan satu kali; ledger piutang berkurang dan klik ulang ditolak.
- [ ] Penolakan pelunasan tidak mengubah ledger dan mengirim notifikasi kepada merchant.
- [ ] Landing Page Builder menampilkan seluruh produk, editor menyimpan konten, dan pratinjau publik sesuai.
- [ ] Laporan 7/30/90 hari dan seluruh periode menghitung bruto, net, komisi, serta metode pembayaran dengan benar.
- [ ] Ekspor CSV hanya memuat transaksi merchant aktif dan aman terhadap formula injection.

## Persiapan

- [ ] Backup PostgreSQL berhasil.
- [ ] Migration `0003_course_modules_files` berhasil setelah migration sebelumnya.
- [ ] Migration `0004_glorious_vermin` berhasil setelah migration sebelumnya.
- [ ] Migration `0005_multi_merchant_landing` berhasil setelah migration sebelumnya.
- [ ] Migration `0006_multi_merchant_finance` berhasil setelah migration sebelumnya.
- [ ] Migration `0007_ambiguous_sinister_six` berhasil setelah migration sebelumnya.
- [ ] Migration `0008_third_namor` berhasil setelah migration `0007`.
- [ ] Migration `0009_v090_community_inbox_automation` berhasil setelah migration `0008`.
- [ ] Migration `0011_wide_onslaught` berhasil setelah migration `0010`.
- [ ] Migration `0012_numerous_marvel_boy` berhasil setelah migration `0011` dan aman dijalankan ulang.
- [ ] Feature flag Workspace tetap `false` pada baseline regression.

## Workspace Foundation M1

- [ ] `npm run workspace:backfill` membuat tepat satu workspace dan satu OWNER aktif per merchant legacy.
- [ ] Menjalankan backfill kedua kali menghasilkan `created=0` dan tidak menambah membership/link.
- [ ] `npm run workspace:reconcile` lulus tanpa missing owner, orphan, atau branding mismatch.
- [ ] User dengan membership pada dua workspace hanya melihat workspace miliknya.
- [ ] User workspace A tidak dapat membuka slug workspace B.
- [ ] Membership SUSPENDED/REVOKED dan workspace DRAFT/SUSPENDED/CLOSED ditolak resolver.
- [ ] Owner aktif terakhir tidak dapat diturunkan atau dinonaktifkan.
- [ ] Switcher tidak muncul ketika flag mati, user tidak termasuk canary, atau user hanya memiliki satu workspace.
- [ ] Cookie active workspace yang dipalsukan ditolak karena membership diverifikasi ulang di database.
- [ ] Product, order, ledger, payout, enrollment, LMS, komunitas, dan dashboard legacy tidak berubah saat flag mati.
- [ ] Custom domain belum memengaruhi routing produksi.
- [ ] `/api/health` merespons liveness dan `/api/ready` berstatus ready.
- [ ] Persistent storage `/app/data/payment-proofs` aktif.
- [ ] Persistent storage `/app/data/commission-proofs` aktif.
- [ ] Persistent storage `/app/data/course-files` aktif.
- [ ] Persistent storage `/app/data/landing-media` aktif.
- [ ] Persistent storage `/app/data/community-media` aktif.
- [ ] Siapkan satu akun ADMIN, satu MERCHANT, dan satu MEMBER.
- [ ] Siapkan satu produk dengan minimal tiga lesson.

## Merchant

- [ ] Login merchant dan buka satu produk.
- [ ] Tambahkan lesson tanpa video.
- [ ] Tambahkan lesson dengan URL YouTube.
- [ ] Uji URL Vimeo/Loom/MP4 bila tersedia.
- [ ] Edit judul, isi, dan URL video lesson.
- [ ] Tandai satu lesson sebagai preview gratis.
- [ ] Ubah urutan lesson ke atas dan ke bawah.
- [ ] Hapus satu lesson uji dan pastikan urutan tetap berlanjut 1, 2, 3.
- [ ] Terbitkan produk.
- [ ] Buat dua akun merchant dan pastikan masing-masing dashboard usaha hanya menampilkan produk sendiri.
- [ ] Pastikan merchant A tidak dapat membuka URL edit produk atau landing page merchant B.
- [ ] Isi Profil toko dan pastikan `/m/[slug]` hanya menampilkan produk merchant tersebut.
- [ ] Edit landing page: hero, gambar, manfaat, sasaran peserta, CTA, dan warna.
- [ ] Pastikan perubahan landing page tampil di `/p/[slug]` tanpa mengubah materi kursus.
- [ ] Merchant lama tetap berstatus Aktif; merchant baru berstatus Menunggu aktivasi.
- [ ] Merchant menunggu/ditangguhkan tidak mempunyai toko atau checkout publik.
- [ ] Merchant aktif dapat menyimpan rekening payout.
- [ ] Merchant dapat menyimpan dan mengaktifkan rekening penerimaan transfer manual yang terpisah dari rekening payout.
- [ ] Merchant hanya melihat dan meninjau bukti transfer langsung untuk produk miliknya.
- [ ] Merchant tidak dapat meninjau transfer rekening platform atau transaksi merchant lain.
- [ ] Bruto, komisi, pendapatan bersih, dan saldo tersedia tampil benar.
- [ ] Payout di bawah minimum dan di atas saldo ditolak.
- [ ] Dua permintaan payout tidak dapat memakai saldo yang sama.
- [ ] Unggah cover dan foto pengajar tersimpan setelah redeploy.
- [ ] Tiga template landing page dapat diganti tanpa kehilangan isi section.
- [ ] Bonus, testimoni, FAQ, pengajar, jaminan, harga coret, dan batas promo tampil sesuai input.
- [ ] Buat kupon persen dan nominal; validasi nilai, tanggal, kuota, aktif/nonaktif, dan kode duplikat bekerja.
- [ ] Kupon yang sudah digunakan tidak dapat dihapus, tetapi dapat dinonaktifkan.
- [ ] Atur order bump, upsell, dan downsell hanya dari produk merchant yang sama.
- [ ] Dashboard Analitik hanya menampilkan produk dan transaksi merchant yang login.

## Bab/modul dan file

- [ ] Buat minimal dua bab dan periksa urutan 1, 2.
- [ ] Edit judul/deskripsi bab dan ubah urutannya.
- [ ] Tempatkan lesson ke tiap bab; sisakan satu lesson tanpa bab.
- [ ] Hapus satu bab dan pastikan lesson di dalamnya tidak terhapus, tetapi pindah ke “Materi lainnya”.
- [ ] Unggah PDF kecil pada sebuah lesson.
- [ ] Uji EPUB/ZIP/Office/TXT bila tersedia.
- [ ] Pastikan file lebih dari 15 MB dan ekstensi yang tidak didukung ditolak.
- [ ] Merchant dapat mengunduh dan menghapus attachment miliknya.

## Publik dan checkout

- [ ] Halaman produk menampilkan daftar lesson.
- [ ] Lesson preview dapat dibuka tanpa login.
- [ ] Lesson non-preview tidak dapat dibuka lewat URL preview.
- [ ] Checkout Xendit tetap dapat dibuat jika kredensial tersedia.
- [ ] Checkout transfer manual tetap dapat dibuat tanpa Xendit.
- [ ] Checkout mewajibkan nomor WhatsApp dan menerima format `08...` atau `62...`.
- [ ] Bukti transfer berhasil diunggah dan tetap tersedia setelah redeploy.
- [ ] Halaman produk mengelompokkan kurikulum berdasarkan bab.
- [ ] Parameter `utm_source`, `utm_medium`, dan `utm_campaign` diteruskan ke checkout dan tersimpan pada pesanan.
- [ ] Kupon valid mengurangi harga produk utama; kupon tidak valid tidak mengubah harga.
- [ ] Order bump bersifat opsional dan menambah total sesuai snapshot harga produk tambahan.
- [ ] Pembayaran order bump mengaktifkan course utama dan course tambahan.
- [ ] Retry webhook tidak menggandakan enrollment, redemption kupon, event purchase, atau saldo.
- [ ] Pesanan menyimpan snapshot rekening tujuan; perubahan rekening merchant tidak mengubah pesanan lama.
- [ ] Persetujuan transfer langsung tidak menambah saldo payout dan hanya membuat satu piutang komisi.
- [ ] Halaman sukses menampilkan upsell dan alternatif downsell yang benar.
- [ ] Meta/TikTok pixel hanya dimuat jika ID valid diisi; tidak ada input custom script.

## Admin

- [ ] Admin dapat melihat antrean pembayaran.
- [ ] Bukti transfer hanya dapat dibuka oleh pihak yang berwenang.
- [ ] Persetujuan membuat status PAID dan enrollment.
- [ ] Penolakan tidak membuka akses kelas.
- [ ] Menu Integrasi hanya dapat dibuka ADMIN.
- [ ] Status StarSender dan Mailketing tampil Aktif ketika environment variable lengkap.
- [ ] Admin melihat jumlah merchant dan produk dari seluruh merchant.
- [ ] Admin memiliki antrean seluruh pembayaran manual; merchant memiliki antrean terbatas untuk transfer langsung miliknya.
- [ ] Merchant yang mencoba membuka `/admin/payments` dialihkan ke dashboard usaha.
- [ ] Merchant tidak dapat menyetujui transfer ke rekening platform; antrean konfirmasi tetap hanya tersedia untuk ADMIN.
- [ ] Override admin pada transfer langsung ditolak tanpa alasan minimal 10 karakter dan tercatat di audit log.
- [ ] Dua konfirmasi bersamaan tidak dapat menggandakan enrollment, saldo, atau piutang komisi.
- [ ] Admin dapat mengaktifkan dan menangguhkan merchant.
- [ ] Admin dapat membuka halaman Edit data merchant dan mengubah nama pemilik, email login, email support, status verifikasi, serta komisi.
- [ ] Email login merchant dinormalisasi ke huruf kecil dan email yang sudah digunakan akun lain ditolak.
- [ ] Edit data kontrol merchant tidak menyediakan perubahan brand, WhatsApp, rekening, produk, landing page, atau konten toko.
- [ ] Audit log mencatat `MERCHANT_CONTROL_UPDATED`, pelaku, merchant, waktu, dan daftar field yang berubah.
- [ ] Merchant tidak dapat membuka halaman edit merchant milik admin.
- [ ] Komisi khusus merchant mengalahkan komisi default hanya untuk transaksi baru.
- [ ] Admin dapat memfilter transaksi lintas merchant dan mengunduh CSV.
- [ ] Admin dapat memoderasi status produk dan melihat daftar member.
- [ ] Admin payout wajib mengisi referensi transfer sebelum menandai Dibayar.
- [ ] Payout ditolak membuat entry pengembalian dan memulihkan saldo merchant.
- [ ] Audit log mencatat aktivasi merchant, perubahan komisi, payout, dan pembayaran manual.

## StarSender dan Mailketing

- [ ] Checkout baru menghasilkan satu email dan satu WhatsApp “Pesanan dibuat”.
- [ ] Transfer manual menyertakan URL unggah bukti yang benar.
- [ ] Checkout Xendit menyertakan payment link Xendit yang benar.
- [ ] Persetujuan pembayaran menghasilkan email dan WhatsApp akses kelas.
- [ ] Penolakan bukti menghasilkan email dan WhatsApp untuk unggah ulang.
- [ ] Retry webhook Xendit tidak menggandakan pesan untuk event yang sama.
- [ ] Retry webhook Xendit tidak menggandakan kredit saldo merchant.
- [ ] Webhook expired yang datang setelah PAID tidak menurunkan status transaksi.
- [ ] Log menampilkan kanal, penerima, event, waktu, jumlah percobaan, dan status.
- [ ] Token/API key tidak tampil pada halaman admin maupun response provider yang disimpan.
- [ ] Tombol Kirim ulang bekerja untuk status Gagal atau Dilewati setelah konfigurasi diperbaiki.
- [ ] API provider yang gagal tidak membatalkan checkout atau perubahan status pembayaran.
- [ ] `NOTIFICATIONS_ENABLED=false` membuat pesan berstatus Dilewati tanpa memanggil provider.

## Member dan e-course

- [ ] Kelas muncul setelah enrollment aktif.
- [ ] Video diputar di dalam halaman kelas.
- [ ] Sidebar berpindah ke lesson yang dipilih.
- [ ] Tombol sebelumnya/berikutnya bekerja.
- [ ] Tandai selesai menyimpan progres.
- [ ] Refresh/login ulang tidak menghilangkan progres.
- [ ] Dashboard member menampilkan persentase yang benar.
- [ ] Member lain tidak dapat membuka course yang belum dibeli.
- [ ] Sertifikat belum dapat dibuka sebelum progres 100%.
- [ ] Sertifikat tersedia setelah semua lesson selesai.
- [ ] Tombol cetak/simpan PDF sertifikat bekerja.
- [ ] Sidebar course menampilkan bab dan lesson dalam kelompok yang benar.
- [ ] Member terdaftar dapat mengunduh file pendamping.
- [ ] Member tanpa enrollment menerima 403 ketika membuka URL file course.
- [ ] Pengguna tanpa login menerima 401 ketika membuka URL file course.
- [ ] File course tetap tersedia setelah redeploy.
- [ ] Satu member yang membeli kursus dari dua merchant melihat keduanya pada satu halaman Kelas Saya.
- [ ] Setiap kartu kursus dan halaman belajar menampilkan nama merchant yang benar.
- [ ] Profil/etalase merchant dapat dibuka dari kelas bila profil tersedia.

## Komunitas scoped dan moderasi

- [ ] Member ber-enrollment dapat membuka komunitas.
- [ ] Postingan lama tersedia pada ruang umum setelah migration.
- [ ] Merchant dapat membuat ruang untuk seluruh pembeli dan ruang khusus satu produk.
- [ ] Member tanpa enrollment produk tidak dapat membuka ruang produk melalui URL.
- [ ] Merchant A tidak dapat membuka atau memoderasi ruang merchant B.
- [ ] Post, komentar, pinned post, dan upload gambar privat bekerja.
- [ ] Reaction pengguna bersifat satu per post dan dapat diganti/dibatalkan.
- [ ] Member dapat melaporkan post/komentar; moderator dapat menyembunyikan atau mengabaikan laporan.
- [ ] Gambar post tersembunyi tidak dapat dibuka member biasa, tetapi tetap dapat diperiksa moderator.

## Inbox dan notifikasi aplikasi

- [ ] Member dapat memulai percakapan dari kelas yang dimiliki.
- [ ] Merchant dapat memulai percakapan hanya dengan pelanggan produknya.
- [ ] Percakapan produk/merchant lain tidak dapat dibuka lewat URL.
- [ ] Pesan baru menambah indikator belum dibaca dan notifikasi aplikasi penerima.
- [ ] Membuka percakapan menandai pesan lawan bicara sebagai dibaca.
- [ ] Admin dapat mengaudit percakapan tanpa mengubah status baca merchant/member.
- [ ] Balasan dan reaction komunitas menghasilkan notifikasi untuk penulis, kecuali aktivitas sendiri.
- [ ] Notifikasi transaksi muncul satu kali per pesanan/event dan dapat ditandai dibaca.

## Pelanggan dan automation

- [ ] Menu Pelanggan hanya menampilkan enrollment dari produk merchant yang login.
- [ ] Filter produk dan segmen Belum mulai/Sedang belajar/Selesai sesuai progres lesson.
- [ ] Nomor kontak diambil dari pesanan enrollment yang benar.
- [ ] Merchant dapat membuat automation pembayaran lunas atau kelas selesai untuk semua/satu produk.
- [ ] Minimal satu kanal wajib dipilih; produk merchant lain ditolak.
- [ ] Variabel `{nama}`, `{produk}`, `{nama_toko}`, dan `{link_kelas}` dirender benar.
- [ ] Mailketing/StarSender yang belum dikonfigurasi menghasilkan status Dilewati tanpa membatalkan transaksi/progres.
- [ ] Webhook berulang tidak menggandakan delivery automation.
- [ ] Menandai kelas belum selesai lalu selesai kembali tidak menggandakan delivery automation.
- [ ] Riwayat automation menampilkan kanal, penerima, waktu, status, dan error.

## Regresi umum

- [ ] Admin, merchant, dan member diarahkan ke dashboard yang benar.
- [ ] Logout menghapus sesi.
- [ ] Desktop 1280/1440 px menampilkan empat menu utama tanpa bertabrakan dengan logo, notifikasi, atau menu akun.
- [ ] Menu Lainnya menampilkan seluruh tautan sekunder sesuai role dan tidak keluar dari viewport.
- [ ] Tablet dan ponsel 320/375/390/768 px menampilkan tombol Menu dan panel vertikal tanpa horizontal overflow.
- [ ] Dashboard usaha menampilkan status merchant, metrik keuangan, produk, dan pintasan hanya dari merchant yang login.
- [ ] Aksi Lihat toko hanya tampil untuk merchant aktif dengan slug dan membuka etalase merchant yang benar.
- [ ] Desktop menampilkan katalog dan panel aksi cepat berdampingan tanpa teks atau nominal terpotong.
- [ ] Tablet dan ponsel menumpuk hero, metrik, katalog, serta aksi cepat tanpa horizontal overflow; seluruh tombol tetap dapat disentuh.
- [ ] Navigasi keyboard memperlihatkan fokus yang jelas pada tautan, tombol, dan elemen menu Dashboard.

## Production readiness v1.0

- [ ] Admin → Operasional hanya dapat dibuka ADMIN dan tidak pernah menampilkan nilai secret.
- [ ] Database, konfigurasi wajib, serta lima storage tampil Siap.
- [ ] Security headers `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, dan HSTS tersedia.
- [ ] Lima percobaan login gagal memicu rate limit; login valid dapat dilakukan kembali setelah masa blokir.
- [ ] Registrasi, checkout, unggah bukti, dan analitik publik memiliki batas yang terdokumentasi.
- [ ] File gambar/PDF palsu dengan MIME/ekstensi benar tetapi signature salah ditolak.
- [ ] Path storage yang berisi `../` atau separator tidak dapat dibaca.
- [ ] Webhook valid tercatat lengkap dengan request ID dan status PROCESSED.
- [ ] Retry payload identik tidak menggandakan pembayaran, enrollment, redemption, saldo, analytics purchase, atau pesan.
- [ ] Webhook dengan nominal/status salah tercatat REJECTED dan tidak mengubah pesanan.
- [ ] Webhook gagal dapat diproses ulang setelah sumber gangguan diperbaiki.
- [ ] Refund penuh hanya tersedia untuk pesanan PAID dan membutuhkan referensi serta alasan.
- [ ] Refund mencabut seluruh enrollment yang masih terikat ke order tersebut.
- [ ] Refund membuat ledger `REFUND` sebesar negatif net merchant, audit log, dan notifikasi member tepat satu kali.
- [ ] Webhook completed/expired yang datang bersamaan atau setelah refund tidak mengubah status final secara salah.
- [ ] Upload ulang bukti pembayaran menghapus file lama tanpa menghilangkan file baru.
- [ ] `npm run ops:storage-manifest` menghasilkan jumlah, ukuran, dan SHA-256 yang sama sebelum/akhir uji restore volume.
- [ ] `npm run test`, `npm run lint`, `npm run typecheck`, dan `npm run build` lulus dari instalasi bersih.
