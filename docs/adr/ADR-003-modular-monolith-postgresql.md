# ADR-003: Modular Monolith dan PostgreSQL

**Status:** Accepted  
**Tanggal:** 22 Juli 2026

## Konteks

Lajurin v1 sudah berjalan dengan Next.js, PostgreSQL, Drizzle ORM, Docker, dan Coolify. Masalah utama berada pada batas domain, tenant model, dan coupling. Bukan pada kemampuan deployment tunggal.

## Keputusan

Lajurin tetap satu aplikasi Modular Monolith dan memakai PostgreSQL sebagai primary datastore. Batas modul ditegakkan melalui source structure, ownership data, kontrak aplikasi, event, automated test, dan aturan dependensi.

Microservices tidak menjadi target pada tahap ini.

## Alternatif

1. Rewrite ke microservices. Ditolak karena biaya operasi, transaksi terdistribusi, observability, dan risiko migrasinya belum sebanding dengan kebutuhan.
2. Mempertahankan monolith tanpa batas modul. Ditolak karena coupling saat ini akan semakin memburuk.
3. Mengganti database. Ditolak karena PostgreSQL telah memenuhi kebutuhan transaksi dan tidak ada bukti bottleneck teknologi.

## Konsekuensi positif

- transaksi lokal tetap sederhana;
- deployment dan operasi lebih ringan;
- migrasi dapat dilakukan bertahap;
- batas modul dapat dipelajari sebelum pemisahan fisik.

## Konsekuensi negatif

- disiplin batas modul harus ditegakkan oleh tim;
- satu deployment masih berbagi failure domain;
- worker dan web dapat bersaing untuk resource jika tidak diatur.

## Risiko dan mitigasi

- Coupling baru dimitigasi dengan aturan import, repository ownership, dan architecture test.
- Beban worker dimitigasi dengan proses terpisah dan resource limit tanpa memecah domain menjadi service.
- Pertumbuhan database dimitigasi dengan index, partitioning, archiving, dan pengukuran sebelum sharding.

## Tinjau ulang jika

Ada bukti terukur tentang kebutuhan scaling independen, isolation reliability, data residency, atau ownership tim yang tidak dapat dipenuhi modular monolith.

