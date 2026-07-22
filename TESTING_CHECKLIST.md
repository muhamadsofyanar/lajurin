# Checklist Pengujian Lajurin v0.3.0

Gunakan database staging dan Xendit Test Mode. Jangan memakai transaksi uang nyata untuk pemeriksaan awal.

## Persiapan

- [ ] Backup PostgreSQL berhasil.
- [ ] Migration `0002_left_power_pack` berhasil.
- [ ] Aplikasi healthy.
- [ ] Persistent storage `/app/data/payment-proofs` aktif.
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

## Publik dan checkout

- [ ] Halaman produk menampilkan daftar lesson.
- [ ] Lesson preview dapat dibuka tanpa login.
- [ ] Lesson non-preview tidak dapat dibuka lewat URL preview.
- [ ] Checkout Xendit tetap dapat dibuat jika kredensial tersedia.
- [ ] Checkout transfer manual tetap dapat dibuat tanpa Xendit.
- [ ] Bukti transfer berhasil diunggah dan tetap tersedia setelah redeploy.

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

## Komunitas dan regresi

- [ ] Member ber-enrollment dapat membuka komunitas.
- [ ] Post, komentar, dan pinned post tetap bekerja.
- [ ] Admin, merchant, dan member diarahkan ke dashboard yang benar.
- [ ] Logout menghapus sesi.
