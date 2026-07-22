# ADR-006: Entitlement sebagai Kontrak Fulfillment

**Status:** Accepted  
**Tanggal:** 22 Juli 2026

## Konteks

Pada model v1, produk selalu melahirkan course dan pembayaran menghasilkan enrollment. Model tersebut tidak mendukung file, komunitas, membership, event, konsultasi, atau bundle secara generik.

## Keputusan

Commerce menghasilkan order item. Fulfillment rule menerjemahkan order item yang paid menjadi satu atau beberapa entitlement. Modul penerima seperti LMS, Community, Membership, atau Delivery memeriksa entitlement melalui kontrak yang sama.

## Alternatif

1. Tambah kolom akses baru pada product dan order untuk setiap tipe bisnis. Ditolak karena schema akan berkembang tanpa batas.
2. Setiap modul membaca order langsung. Ditolak karena coupling dan interpretasi status akan berbeda.
3. Enrollment dibuat generik untuk semua akses. Ditolak karena istilah dan lifecycle tidak cocok untuk semua benefit.

## Konsekuensi positif

- product tidak terikat course;
- bundle dapat memberi beberapa benefit;
- revocation dan expiry memiliki model bersama;
- modul vertikal tetap independen dari commerce.

## Konsekuensi negatif

- terdapat lapisan tambahan antara order dan akses;
- kebijakan refund serta revocation harus eksplisit;
- backfill enrollment membutuhkan rekonsiliasi.

## Kriteria penerimaan

- satu order item dapat memberi beberapa entitlement;
- pemberian ulang idempoten;
- akses course lama tetap valid setelah backfill;
- produk non-course dapat dipenuhi tanpa perubahan schema commerce.

## Batas penerapan

- Entitlement menyatakan hak, bukan bukti pembayaran dan bukan progress penggunaan.
- Commerce tetap menjadi sumber kebenaran transaksi.
- LMS, Community, Membership, dan Delivery tetap memiliki state operasionalnya sendiri.
- Kebijakan revoke akibat refund harus eksplisit per fulfillment rule dan dapat diaudit.

## Tinjau ulang jika

- benefit memerlukan alokasi kapasitas atau penjadwalan yang tidak dapat direpresentasikan sebagai hak;
- regulasi mewajibkan model akses terpisah untuk kategori produk tertentu;
- model entitlement generik mulai menampung state operasional modul penerima.
