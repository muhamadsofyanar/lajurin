# Deployment Lajurin v1.3.0 Integrated Candidate

> Migration `0011`–`0013` dan backfill hanya dijalankan pada staging sampai exit criteria lulus. Jangan mengaktifkan modul finansial hanya berdasarkan hasil build lokal.

## Sebelum redeploy

1. Buka resource PostgreSQL `lajurin-postgres` dan buat backup manual.
2. Pastikan backup berstatus berhasil sebelum melanjutkan.
3. Di aplikasi, pastikan `DATABASE_URL` masih menunjuk ke database yang sama.
4. Tambahkan persistent storage dengan mount path **`/app/data/payment-proofs`**.
5. Tambahkan persistent storage dengan mount path **`/app/data/commission-proofs`**.
6. Tambahkan persistent storage dengan mount path **`/app/data/course-files`**.
7. Tambahkan persistent storage dengan mount path **`/app/data/landing-media`**.
8. Tambahkan persistent storage dengan mount path **`/app/data/community-media`**.
9. Jangan gunakan `/app/uploads`; path tersebut berasal dari catatan versi lama.
10. Jangan menghapus, membuat ulang, atau me-restart PostgreSQL hanya untuk deploy source ini.

Kelima storage dapat memakai volume berbeda. Untuk **Volume Mount** di Coolify, isi nama volume dan Destination Path; Source Path dikosongkan.

## Environment variable wajib

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE
APP_URL=https://legaone.id
MANUAL_BANK_NAME=BCA
MANUAL_BANK_ACCOUNT=nomor-rekening
MANUAL_BANK_HOLDER=nama-pemilik-rekening
NEXT_SERVER_ACTIONS_ENCRYPTION_KEY=base64-32-byte-yang-stabil
```

Jika Xendit digunakan:

```env
XENDIT_SECRET_KEY=xnd_development_atau_production_key
XENDIT_WEBHOOK_TOKEN=token-webhook
```

Untuk StarSender dan Mailketing:

```env
NOTIFICATIONS_ENABLED=true
STARSENDER_API_KEY=api-key-device-starsender
MAILKETING_API_TOKEN=token-api-mailketing
MAILKETING_FROM_NAME=Lajurin
MAILKETING_FROM_EMAIL=email-pengirim-yang-sudah-diverifikasi
```

Catatan:

- `STARSENDER_API_KEY` adalah API key **device** yang terhubung dan aktif, bukan password akun.
- `MAILKETING_FROM_EMAIL` harus persis dengan sender yang sudah diverifikasi di Mailketing.
- Jangan menambahkan tanda kutip jika nilai tidak memerlukannya.
- Jangan mengirim token melalui screenshot atau memasukkannya ke GitHub.
- `NOTIFICATIONS_ENABLED=false` menghentikan semua pengiriman tanpa menghapus konfigurasi.
- URL API sudah memakai endpoint resmi dan tidak perlu diisi manual.

Jangan menaruh nilai rahasia di GitHub, dokumentasi, atau screenshot publik.

## Membuat kunci Server Actions

Jalankan sekali pada komputer yang aman, lalu simpan hasilnya sebagai environment variable di Coolify:

```bash
openssl rand -base64 32
```

Gunakan nilai yang sama pada setiap redeploy/replica. Jangan menggantinya tanpa alasan karena browser pengguna yang masih memuat versi lama dapat gagal menjalankan aksi.

## Redeploy

1. Pastikan branch yang dipakai Coolify sudah memuat source v1.0.0 final yang sama dengan kandidat yang diuji di staging.
2. Klik **Redeploy** pada aplikasi, bukan pada PostgreSQL.
3. Proses start menjalankan seluruh migration Drizzle secara otomatis sebelum server aktif.
4. Untuk kandidat M1 di staging, periksa log dan pastikan migration `0011_wide_onslaught` berhasil setelah migration `0010_v100_production_readiness`.
5. Pastikan `/api/health` merespons `ok` dan health check `/api/ready` berstatus ready.
6. Login ADMIN, buka `/admin/operations`, dan pastikan database, konfigurasi wajib, serta lima storage berstatus **Siap**.
7. Buka `/admin/integrations`; StarSender dan Mailketing harus berstatus **Aktif** bila notifikasi diaktifkan.

Tidak ada environment variable atau storage baru pada v1.0.0. Migration menambah log webhook, rate limit, dan metadata refund tanpa mengubah harga, saldo, enrollment, atau file lama.

## Rollout Workspace Foundation M1 di staging

Mulai dengan flag mati:

```env
WORKSPACE_FOUNDATION_ENABLED=false
WORKSPACE_CANARY_USER_IDS=
WORKSPACE_BACKFILL_BATCH_SIZE=50
```

Setelah backup–restore staging terverifikasi dan migration `0011` selesai, jalankan dari checkout staging yang sudah `npm ci`:

```bash
npm run workspace:backfill
npm run workspace:backfill
npm run workspace:reconcile
```

Run kedua wajib tidak membuat workspace baru. Setelah rekonsiliasi dan regression test lulus, masukkan UUID akun internal secara eksplisit ke `WORKSPACE_CANARY_USER_IDS`, lalu aktifkan flag hanya pada staging. Jangan menebak akun internal dari domain email. Untuk rollback aplikasi, matikan flag; tabel M1 tetap dipertahankan dan tidak dihapus.

## Strategi file dan backup

- Source tidak perlu diunduh per versi; simpan hanya rilis final di GitHub.
- Sebelum deployment final, unduh backup PostgreSQL dari Coolify dan pastikan statusnya berhasil.
- Media landing page, file course, dan bukti pembayaran berada di volume, bukan di backup PostgreSQL. Aktifkan backup volume terpisah bila data unggahan sudah dipakai produksi.
- Gambar komunitas juga berada di volume `/app/data/community-media`; backup database saja tidak mencadangkan gambarnya.
- Setelah backup atau restore volume, jalankan `npm run ops:storage-manifest` dari container/checkout yang mengakses folder `data`. Simpan output manifest secara terpisah dan bandingkan `fileCount`, `totalBytes`, serta hash SHA-256 sebelum menerima transaksi.

## Pemeriksaan production readiness v1.0

1. Buka **Admin → Operasional** dan pastikan tidak ada item wajib berstatus Perlu tindakan.
2. Kirim payload webhook Xendit Test Mode, lalu pastikan event tercatat sebagai `PROCESSED`.
3. Kirim ulang payload identik; event harus dianggap duplicate dan tidak menambah enrollment, kupon, saldo, atau notifikasi.
4. Uji lima password salah lalu pastikan login dibatasi; tunggu periode blokir atau bersihkan hanya data rate-limit staging.
5. Unggah file berekstensi gambar tetapi isi teks; file harus ditolak.
6. Catat refund hanya setelah dana uji dikembalikan. Pastikan status menjadi REFUNDED, enrollment pesanan dicabut, member mendapat notifikasi, dan ledger merchant berkurang sebesar net transaksi.
7. Pastikan webhook completed lama setelah refund tidak mengaktifkan kembali pesanan.

Refund v1.0 adalah pencatatan **refund penuh manual**, bukan pengiriman dana otomatis. Admin wajib mengembalikan dana melalui bank/Xendit lebih dahulu, lalu mengisi referensi dan alasan. Kupon tetap tercatat sebagai pernah digunakan untuk menjaga histori audit.

## Pemeriksaan keuangan setelah deploy

1. Admin membuka **Merchant** dan memastikan merchant lama berstatus Aktif.
2. Admin membuka **Pengaturan** lalu mengonfirmasi komisi default dan minimum payout.
3. Merchant membuka **Saldo & payout**, menyimpan rekening, dan memeriksa transaksi lama yang sudah lunas.
4. Gunakan transaksi uji untuk memastikan bruto, komisi, net, dan saldo benar.
5. Ajukan payout kecil pada staging; penolakan harus mengembalikan saldo, sedangkan “Sudah ditransfer” wajib memiliki referensi.
6. Jangan menandai payout dibayar sebelum transfer bank benar-benar dilakukan. Versi ini belum mengirim uang secara otomatis.

## Pembagian dashboard v0.6.0

- `/admin`: ringkasan seluruh platform; hanya ADMIN dapat mengonfirmasi transfer.
- `/dashboard`: dashboard usaha yang terisolasi untuk merchant yang login.
- `/member`: “Kelas Saya” milik pengguna; dapat berisi kursus dari beberapa merchant.
- `/m/[slug]`: profil/etalase publik satu merchant.
- `/p/[slug]`: landing page satu produk.

## Alur uji notifikasi

1. Gunakan nomor WhatsApp dan email milik sendiri sebagai pembeli uji.
2. Checkout satu produk melalui transfer manual.
3. Pastikan email dan WhatsApp “Pesanan dibuat” diterima.
4. Unggah bukti transfer uji.
5. Setujui melalui ADMIN dan pastikan dua pesan “Pembayaran disetujui” diterima.
6. Ulangi dengan pesanan lain lalu tolak buktinya untuk menguji pesan penolakan.
7. Buka menu **Integrasi** untuk memeriksa status dan error provider.

Pengujian awal tidak perlu memakai uang nyata. Gunakan transfer manual atau Xendit Test Mode.

## Jika upload bukti transfer gagal

Periksa:

- Mount path persis `/app/data/payment-proofs`.
- Source menyimpan bukti pada path tetap `/app/data/payment-proofs`.
- Storage dapat ditulis oleh UID/GID `1001:1001` yang menjalankan aplikasi.
- Storage tidak bersifat ephemeral.

## Jika upload file course gagal

Periksa:

- Mount path persis `/app/data/course-files`.
- Volume dapat ditulis oleh UID/GID `1001:1001`.
- Ukuran file tidak lebih dari 15 MB.
- Format file adalah PDF, EPUB, ZIP, DOC/DOCX, XLS/XLSX, PPT/PPTX, atau TXT.
- Reverse proxy Coolify tidak menetapkan batas upload di bawah 17 MB.

## Jika upload media landing page gagal

Periksa:

- Mount path persis `/app/data/landing-media`.
- Volume dapat ditulis oleh UID/GID `1001:1001`.
- File adalah JPG, PNG, atau WebP maksimal 5 MB.
- Cover publik dapat dibuka melalui `/api/landing-media/[storageKey]` setelah tersimpan.

## Jika upload gambar komunitas gagal

Periksa:

- Mount path persis `/app/data/community-media`.
- Volume dapat ditulis oleh UID/GID `1001:1001`.
- File adalah JPG, PNG, atau WebP maksimal 5 MB.
- Route `/api/community-media/[postId]` hanya dapat dibuka pengguna yang memiliki akses ke ruang tersebut.

## Pemeriksaan v0.9 setelah deploy

1. Merchant membuat satu ruang toko dan satu ruang produk.
2. Member tanpa enrollment tidak dapat melihat ruang produk; member pembeli dapat melihatnya.
3. Uji post bergambar, reaction, komentar, laporan, dan moderasi.
4. Member membuka kelas lalu memilih **Hubungi merchant**; pastikan pesan dan notifikasi belum dibaca muncul.
5. Merchant membuka **Pelanggan** dan memastikan hanya member produknya yang tampil.
6. Buat automation pembayaran lunas memakai email/nomor sendiri, kemudian jalankan transaksi uji di staging.
7. Selesaikan seluruh lesson dan pastikan automation kelas selesai hanya terkirim sekali.

## Rollback

Jika aplikasi gagal setelah deploy:

1. Simpan log error.
2. Rollback source ke deployment v2 terakhir yang sehat.
3. Jangan menghapus tabel/kolom dari migration `0002` sampai `0011`; versi lama dapat mengabaikan tabel M1 saat feature flag mati.
4. Pulihkan backup database hanya bila terbukti ada kerusakan data, bukan sebagai langkah pertama.
