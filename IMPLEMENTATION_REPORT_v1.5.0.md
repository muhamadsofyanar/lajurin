# Laporan Implementasi Lajurin v1.5.0

Tanggal pemeriksaan: 23 Juli 2026

## Ringkasan

Lima tahap telah diimplementasikan pada source. Status rilis adalah production
candidate, bukan bukti bahwa deployment produksi sudah stabil. Migration,
provider eksternal, DNS, SSL, dan restore drill masih harus divalidasi pada
staging yang menyerupai produksi.

## Hasil per tahap

| Tahap | Hasil source | Gate eksternal |
| --- | --- | --- |
| Workspace & akun tim | Matriks role terpusat, Staff diuji, token sekali pakai aman terhadap concurrency, owner terakhir terlindungi, membership nonaktif efektif | Uji browser empat role dengan database staging |
| Landing Page Builder | Drag/reorder, keyboard reorder, draft urutan/media terpisah, preview desktop/mobile, publish eksplisit | Uji visual dan persistent media setelah redeploy |
| Custom Domain | TXT, CNAME, HTTPS, status DNS/SSL, error terakhir, proteksi `legaone.id` | Domain canary nyata dan penerbitan sertifikat Coolify |
| Broadcast & abandoned checkout | Consent, segmentasi, template, antrean, batch, batas harian, attempt log, worker bertoken, retry | Sandbox Mailketing/StarSender dan scheduler Coolify |
| Stabilisasi produksi | Hardening webhook, monitoring proses, metrik operasional, error recovery UI, indeks, backup/checksum, quality gate | Migration clone, restore drill, load test, dan rollout canary |

## Matriks role merchant

| Capability | Owner | Admin | Finance | Staff |
| --- | ---: | ---: | ---: | ---: |
| Read | Ya | Ya | Ya | Ya |
| Operasional dasar | Ya | Ya | Tidak | Ya |
| Anggota | Ya | Ya | Tidak | Tidak |
| Keuangan | Ya | Tidak | Ya | Tidak |
| Broadcast | Ya | Ya | Tidak | Tidak |
| Custom Domain | Ya | Ya | Tidak | Tidak |

## Quality gate lokal

- 17 file migration tervalidasi oleh manifest SHA-256.
- 46 automated test lulus.
- ESLint lulus tanpa warning.
- TypeScript lulus.
- Next.js production build lulus.

Pengujian PostgreSQL nyata tidak dijalankan karena paket sumber tidak menyertakan
database staging. Jalankan `npm run migrations:test` dengan `DATABASE_URL`
staging sebelum rilis.

## Keputusan yang dipertahankan

Automatic payout dan automatic refund tidak diimplementasikan. Kedua fitur
menyangkut pergerakan uang, identitas tujuan, idempotensi provider, webhook,
rekonsiliasi, dispute, dan audit keamanan. Implementasi tanpa desain khusus akan
meningkatkan risiko transaksi ganda atau salah tujuan.
