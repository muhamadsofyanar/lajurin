# Rizqhub v3.0.0 — Distribution & Automation

## Fitur baru

- Marketplace publik lintas merchant dengan pencarian dan filter kategori.
- SEO teknis: metadata produk, sitemap dinamis, robots, dan Open Graph.
- Affiliate per produk: persentase komisi, mitra, tautan referral, atribusi order, dan komisi otomatis saat lunas.
- Pengingat checkout satu jam untuk pelanggan yang memberi persetujuan pemasaran.
- Funnel upsell/downsell dan order bump tetap terintegrasi dengan checkout.
- Booking internal untuk produk jasa: slot, kapasitas, reservasi pelanggan, dan dashboard merchant.
- Subscription manual: aktivasi dari order lunas, interval, pembaruan, dan penghentian.
- PWA: manifest, ikon, service worker aman, dan halaman offline.
- Smart Commerce Assistant untuk draft headline, manfaat, CTA, serta follow-up.
- Navigasi merchant dan member untuk seluruh modul baru.

## Setelah deploy

1. Tidak ada environment variable wajib baru.
2. Jalankan deployment seperti biasa; migrasi `0022_distribution_automation.sql` berjalan otomatis.
3. Untuk pengingat checkout, jadwalkan `POST /api/jobs/checkout-reminders` dengan header `Authorization: Bearer <INTERNAL_JOB_SECRET>` setiap 15–60 menit.
4. Email/WhatsApp hanya terkirim jika Mailketing/StarSender telah dikonfigurasi. Tanpa provider, log dicatat sebagai dilewati.
5. Subscription belum mendebit otomatis. Recurring payment baru aktif setelah gateway yang mendukung recurring dihubungkan.

## Quality gate

- Validasi checksum migrasi
- Unit/integration tests
- ESLint
- TypeScript
- Next.js production build
