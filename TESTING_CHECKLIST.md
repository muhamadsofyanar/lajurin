# Checklist Pengujian Lajurin v0.4.0

Gunakan database staging dan Xendit Test Mode. Jangan memakai transaksi uang nyata untuk pemeriksaan awal.

## Persiapan

- [ ] Backup PostgreSQL berhasil.
- [ ] Migration `0003_course_modules_files` berhasil setelah migration sebelumnya.
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
- [ ] Bukti transfer berhasil diunggah dan tetap tersedia setelah redeploy.
- [ ] Halaman produk mengelompokkan kurikulum berdasarkan bab.

## Admin

- [ ] Admin dapat melihat antrean pembayaran.
- [ ] Bukti transfer hanya dapat dibuka oleh pihak yang berwenang.
- [ ] Persetujuan membuat status PAID dan enrollment.
- [ ] Penolakan tidak membuka akses kelas.

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

## Komunitas dan regresi

- [ ] Member ber-enrollment dapat membuka komunitas.
- [ ] Post, komentar, dan pinned post tetap bekerja.
- [ ] Admin, merchant, dan member diarahkan ke dashboard yang benar.
- [ ] Logout menghapus sesi.
