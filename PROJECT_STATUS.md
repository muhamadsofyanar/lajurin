# Status Proyek Lajurin

## Versi aktif source

- Versi paket: **0.3.0 — E-course Core**
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

## Database terbaru

Migration terbaru: `drizzle/0002_left_power_pack.sql`.

Migration tersebut hanya:

1. Menambahkan tabel `lesson_progress`.
2. Menambahkan kolom `lessons.is_preview` dengan default `false`.

Migration tidak menghapus tabel, kolom, pesanan, enrollment, atau data v2.

## Belum dikerjakan

- Upload dan distribusi PDF/ebook/file bonus yang terlindungi.
- Upload/hosting video langsung oleh platform; saat ini merchant memakai URL video.
- Masa berlaku akses kelas.
- Modul/bab bertingkat di atas lesson.
- Inbox/chat merchant–member dan notifikasi.
- Spaces/kategori komunitas, reaction, gambar, serta moderasi lanjutan.
- Refund, invoice, rekonsiliasi, dan log webhook yang lengkap.
- Multi-merchant settlement, saldo, komisi, dan payout.
- Landing-page builder, kupon, order bump, upsell/downsell, pixel, dan automation email.
- Automated test dan test transaksi nyata dengan database staging/Xendit Test Mode.

## Rekomendasi tahap berikutnya

Tahap berikut paling aman adalah **File Materi Terlindungi + Modul/Bab**, kemudian **Komunitas dan Inbox**. Jangan membangun payout atau funnel kompleks sebelum pembayaran dan hak akses lulus pengujian staging.
