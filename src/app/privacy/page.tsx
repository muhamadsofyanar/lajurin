import { LegalPage } from "@/components/legal-page";
export default function PrivacyPage() {
  return <LegalPage title="Kebijakan Privasi" updated="23 Juli 2026" sections={[
    ["Data yang diproses", "Rizqhub memproses informasi akun, profil merchant, pesanan, pembayaran, komunikasi, aktivitas produk, serta data teknis yang diperlukan untuk keamanan dan operasional."],
    ["Tujuan penggunaan", "Data digunakan untuk menjalankan layanan, memproses transaksi, memberikan akses produk, mencegah penyalahgunaan, menyediakan dukungan, dan meningkatkan pengalaman pengguna."],
    ["Berbagi data", "Data hanya dibagikan kepada merchant terkait, penyedia pembayaran, penyedia komunikasi, dan pihak berwenang apabila diwajibkan hukum. Rizqhub tidak menjual data pribadi."],
    ["Penyimpanan dan keamanan", "Data dilindungi dengan kontrol akses, pencatatan aktivitas, koneksi aman, serta prosedur backup. Tidak ada sistem yang sepenuhnya bebas risiko."],
    ["Hak pengguna", "Pengguna dapat meminta koreksi atau penghapusan data sesuai kewajiban hukum dan kebutuhan penyimpanan transaksi."],
  ]} />;
}
