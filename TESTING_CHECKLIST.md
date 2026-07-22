# Checklist Pengujian Lajurin v0.6.0

Gunakan database staging dan Xendit Test Mode. Jangan memakai transaksi uang nyata untuk pemeriksaan awal.

## Persiapan

- [ ] Backup PostgreSQL berhasil.
- [ ] Migration `0003_course_modules_files` berhasil setelah migration sebelumnya.
- [ ] Migration `0004_glorious_vermin` berhasil setelah migration sebelumnya.
- [ ] Migration `0005_multi_merchant_landing` berhasil setelah migration sebelumnya.
- [ ] Aplikasi healthy.
- [ ] Persistent storage `/app/data/payment-proofs` aktif.
- [ ] Persistent storage `/app/data/course-files` aktif.
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

## Admin

- [ ] Admin dapat melihat antrean pembayaran.
- [ ] Bukti transfer hanya dapat dibuka oleh pihak yang berwenang.
- [ ] Persetujuan membuat status PAID dan enrollment.
- [ ] Penolakan tidak membuka akses kelas.
- [ ] Menu Integrasi hanya dapat dibuka ADMIN.
- [ ] Status StarSender dan Mailketing tampil Aktif ketika environment variable lengkap.
- [ ] Admin melihat jumlah merchant dan produk dari seluruh merchant.
- [ ] Hanya ADMIN memiliki menu dan halaman Konfirmasi pembayaran.
- [ ] Merchant yang mencoba membuka `/admin/payments` dialihkan ke dashboard usaha.

## StarSender dan Mailketing

- [ ] Checkout baru menghasilkan satu email dan satu WhatsApp “Pesanan dibuat”.
- [ ] Transfer manual menyertakan URL unggah bukti yang benar.
- [ ] Checkout Xendit menyertakan payment link Xendit yang benar.
- [ ] Persetujuan pembayaran menghasilkan email dan WhatsApp akses kelas.
- [ ] Penolakan bukti menghasilkan email dan WhatsApp untuk unggah ulang.
- [ ] Retry webhook Xendit tidak menggandakan pesan untuk event yang sama.
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

## Komunitas dan regresi

- [ ] Member ber-enrollment dapat membuka komunitas.
- [ ] Post, komentar, dan pinned post tetap bekerja.
- [ ] Admin, merchant, dan member diarahkan ke dashboard yang benar.
- [ ] Logout menghapus sesi.
