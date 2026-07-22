# Status Proyek Lajurin

## Versi aktif source

- Versi paket: **0.4.0 — Modul & File Terlindungi**
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

## Database terbaru

Migration terbaru: `drizzle/0003_course_modules_files.sql`.

Migration v0.4.0 hanya:

1. Menambahkan tabel `course_modules`.
2. Menambahkan tabel `lesson_attachments`.
3. Menambahkan kolom nullable `lessons.module_id`.

Migration tidak menghapus tabel, kolom, lesson, pesanan, enrollment, atau data versi sebelumnya. Lesson lama tetap berada pada kelompok “Materi lainnya” sampai merchant memasukkannya ke bab.

## Belum dikerjakan

- Upload/hosting video langsung oleh platform; saat ini merchant memakai URL video.
- Masa berlaku akses kelas.
- Inbox/chat merchant–member dan notifikasi.
- Spaces/kategori komunitas, reaction, gambar, serta moderasi lanjutan.
- Refund, invoice, rekonsiliasi, dan log webhook yang lengkap.
- Multi-merchant settlement, saldo, komisi, dan payout.
- Landing-page builder, kupon, order bump, upsell/downsell, pixel, dan automation email.
- Automated test dan test transaksi nyata dengan database staging/Xendit Test Mode.

## Rekomendasi tahap berikutnya

Tahap berikut paling aman adalah **Komunitas dan Inbox**: spaces/kategori, reaction, moderasi, notifikasi dasar, dan percakapan merchant–member. Jangan membangun payout atau funnel kompleks sebelum pembayaran dan hak akses lulus pengujian staging.
