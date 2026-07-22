# ADR-008: ADR sebagai Catatan Keputusan Arsitektur

**Status:** Accepted  
**Tanggal:** 22 Juli 2026

## Konteks

Keputusan arsitektur kehilangan konteks ketika hanya tersimpan dalam percakapan atau kode. Tim yang berkembang membutuhkan alasan, alternatif, dan konsekuensi agar tidak mengulang debat atau membatalkan keputusan tanpa memahami risikonya.

## Keputusan

Setiap keputusan arsitektur utama dicatat sebagai ADR yang version-controlled. ADR memuat konteks, keputusan, alternatif, konsekuensi, risiko, dan kondisi peninjauan ulang.

ADR Accepted tidak ditulis ulang untuk mengubah sejarah. Keputusan baru membuat ADR baru dan menandai ADR lama sebagai Superseded.

## Alternatif

1. Dokumentasi hanya pada README. Ditolak karena keputusan sulit dilacak dan mudah tertimpa.
2. Dokumentasi hanya pada tiket. Ditolak karena akses dan umur tiket tidak selalu mengikuti source.
3. Dokumentasi hanya melalui komentar kode. Ditolak karena tidak memuat alternatif dan dampak lintas modul.

## Konsekuensi positif

- alasan keputusan dapat ditelusuri;
- onboarding tim lebih cepat;
- perubahan arsitektur menjadi eksplisit;
- trade-off tidak hilang.

## Konsekuensi negatif

- membutuhkan disiplin pemeliharaan;
- ADR yang terlalu banyak dapat menjadi noise;
- status harus diperbarui saat keputusan diganti.

## Tinjau ulang jika

Format ini tidak lagi memadai untuk governance tim. Kebutuhan tersebut mengubah format, bukan menghapus catatan historis.
