import { LegalPage } from "@/components/legal-page";
export default function TermsPage() {
  return <LegalPage title="Syarat dan Ketentuan" updated="23 Juli 2026" sections={[
    ["Penggunaan platform", "Rizqhub menyediakan perangkat bagi merchant untuk memasarkan dan mengelola kursus, produk digital, serta jasa. Merchant bertanggung jawab atas legalitas, kualitas, deskripsi, harga, dan pemenuhan produk yang dijual."],
    ["Akun dan keamanan", "Pengguna wajib memberikan informasi yang benar, menjaga kerahasiaan password, serta segera melaporkan akses yang tidak sah. Aktivitas pada akun dianggap dilakukan oleh pemilik akun sampai dilaporkan."],
    ["Pembayaran", "Metode pembayaran dapat diproses oleh payment gateway atau transfer manual. Status lunas hanya diberikan setelah pembayaran terverifikasi pada sistem."],
    ["Konten terlarang", "Dilarang menjual produk ilegal, menipu, melanggar hak kekayaan intelektual, mengandung malware, atau melanggar hukum Republik Indonesia."],
    ["Pembatasan layanan", "Rizqhub dapat membatasi atau menangguhkan akun untuk menjaga keamanan, mematuhi hukum, menangani penipuan, atau melindungi pengguna lain."],
  ]} />;
}
