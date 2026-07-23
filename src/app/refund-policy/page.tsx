import { LegalPage } from "@/components/legal-page";
export default function RefundPolicyPage() {
  return <LegalPage title="Kebijakan Pengembalian Dana" updated="23 Juli 2026" sections={[
    ["Tanggung jawab merchant", "Ketentuan refund produk ditetapkan oleh merchant dan harus dijelaskan pada halaman penawaran. Rizqhub menyediakan pencatatan transaksi dan alat operasional refund."],
    ["Permintaan refund", "Pembeli mengajukan permintaan kepada merchant dengan nomor pesanan, alasan, dan bukti pendukung. Produk digital yang sudah diunduh atau jasa yang sudah dikerjakan dapat memiliki batasan refund."],
    ["Proses pemeriksaan", "Merchant memeriksa permintaan berdasarkan ketentuan penawaran, bukti pemenuhan, dan peraturan yang berlaku. Rizqhub dapat membantu menyediakan catatan transaksi."],
    ["Waktu pengembalian", "Refund yang disetujui mengikuti metode dan waktu pemrosesan penyedia pembayaran. Biaya pihak ketiga yang tidak dapat dikembalikan dapat diperhitungkan apabila diperbolehkan hukum."],
  ]} />;
}
