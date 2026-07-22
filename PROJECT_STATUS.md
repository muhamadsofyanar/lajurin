# Status Proyek Lajurin

## Versi aktif source

- Versi paket: **0.6.0 — Multi-Merchant & Landing Page**
- Dasar pengembangan: branch `main` repository `muhamadsofyanar/lajurin`
- Commit dasar: `4d36e11b066ebe8b504505de56d3ec44650be854` (`v2`, 22 Juli 2026)
- Database: PostgreSQL + Drizzle ORM
- Deployment pengguna: Coolify, domain `legaone.id`

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

## Database terbaru

Migration terbaru: `drizzle/0005_multi_merchant_landing.sql`.

Migration v0.6.0 hanya:

1. Menambahkan tabel `merchant_profiles` satu profil per merchant.
2. Menambahkan tabel `product_landing_pages` satu landing page per produk.
3. Membuat profil dasar untuk akun MERCHANT lama tanpa menghapus data apa pun.

Migration tidak menghapus tabel, kolom, lesson, pesanan, enrollment, atau data versi sebelumnya. Lesson lama tetap berada pada kelompok “Materi lainnya” sampai merchant memasukkannya ke bab.

## Belum dikerjakan

- Upload/hosting video langsung oleh platform; saat ini merchant memakai URL video.
- Masa berlaku akses kelas.
- Inbox/chat merchant–member dan notifikasi dalam aplikasi.
- Spaces/kategori komunitas, reaction, gambar, serta moderasi lanjutan.
- Refund, invoice, rekonsiliasi, dan log webhook yang lengkap.
- Multi-merchant settlement, saldo, komisi, dan payout.
- Builder landing page tingkat lanjut (blok bebas/drag-and-drop), kupon, order bump, upsell/downsell, pixel, broadcast, dan automation bertahap.
- Automated test dan test transaksi nyata dengan database staging/Xendit Test Mode.

## Rekomendasi tahap berikutnya

Tahap berikut paling aman adalah **Komunitas dan Inbox v0.7.0**: ruang komunitas per merchant/produk, reaction, moderasi, notifikasi dalam aplikasi, dan percakapan merchant–member. Komunitas global saat ini perlu dipisahkan sebelum payout atau funnel kompleks dibangun.
