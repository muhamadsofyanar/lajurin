# ADR-002: Workspace untuk Unit Internal dan Organisasi Eksternal

**Status:** Accepted  
**Tanggal:** 22 Juli 2026

## Konteks

Lajurin harus melayani unit bisnis Rizqhub dan pengguna eksternal tanpa membuat aplikasi atau model tenant yang berbeda.

## Keputusan

`Workspace` menjadi unit isolasi operasional yang dapat dimiliki unit internal, individu eksternal, atau organisasi eksternal. Perbedaan jenis pemilik direpresentasikan melalui metadata, paket, kebijakan, dan konfigurasi. Bukan melalui schema domain terpisah.

## Alternatif

1. Platform hanya untuk unit Rizqhub. Ditolak karena membatasi produk sebagai sistem internal.
2. Platform hanya untuk merchant eksternal. Ditolak karena tidak memenuhi penggunaan lintas bisnis Rizqhub.
3. Membuat tenant type dengan jalur kode terpisah. Ditolak karena menimbulkan duplikasi dan drift.

## Konsekuensi positif

- kapabilitas dapat dipakai ulang;
- unit internal menjadi pengguna nyata platform;
- onboarding dan operasi dapat distandardisasi;
- tidak perlu aplikasi baru untuk setiap bisnis.

## Konsekuensi negatif

- control plane harus membedakan kebijakan internal dan eksternal;
- billing, support, dan compliance dapat berbeda per kategori workspace;
- fitur internal khusus tidak boleh bocor ke core tanpa evaluasi.

## Risiko dan mitigasi

- Kebutuhan internal mendominasi roadmap. Mitigasi dengan Product Principles dan metrik lintas segmen.
- Akses platform terlalu luas. Mitigasi dengan permission control plane yang terpisah dari membership workspace.

## Tinjau ulang jika

Regulasi atau kontrak enterprise mengharuskan deployment atau database terdedikasi.

