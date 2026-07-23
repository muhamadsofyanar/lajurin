import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, HeartHandshake, Lightbulb, Sprout } from "lucide-react";
import { Brand } from "@/components/brand";
import { Nav } from "@/components/nav";

export const metadata: Metadata = {
  title: "Filosofi RizqHub",
  description: "RizqHub adalah ikhtiar untuk menjadi jalan rezeki yang halal, bernilai, dan penuh keberkahan bagi banyak orang.",
};

export default function PhilosophyPage() {
  return <><Nav /><main className="philosophy-page">
    <section className="philosophy-hero"><div className="shell narrow"><span className="eyebrow">Filosofi RizqHub</span><h1 className="display">Menjadi wasilah, bukan tujuan. Menjadi penghubung, bukan pemilik.</h1><p>RizqHub lahir dari keyakinan bahwa Allah adalah Ar-Razzāq, Maha Pemberi Rezeki.</p></div></section>
    <section className="section"><article className="shell philosophy-article">
      <p className="philosophy-lead"><strong>RizqHub</strong> lahir dari sebuah keyakinan sederhana, namun mendasar: <strong>Allah adalah Ar-Razzāq, Maha Pemberi Rezeki.</strong> Tidak ada rezeki yang datang tanpa izin-Nya, dan tidak ada satu pun makhluk yang luput dari jaminan-Nya.</p>
      <p>Nama <strong>RizqHub</strong> terinspirasi dari nama <strong>Abdul Rozaq</strong>, yang berarti <em>hamba Allah Yang Maha Pemberi Rezeki</em>. Nama ini menjadi pengingat bahwa manusia bukanlah sumber rezeki, melainkan hanya hamba yang diberi amanah untuk berikhtiar dan menjadi jalan kebaikan bagi sesama.</p>
      <p>Karena itu, RizqHub tidak dibangun sekadar sebagai platform bisnis atau tempat bertransaksi. RizqHub hadir sebagai sebuah <strong>ekosistem yang mempertemukan manfaat dengan kebutuhan, potensi dengan peluang, serta manusia dengan ikhtiar terbaiknya</strong>. Kami percaya bahwa ketika seseorang dimudahkan mendapatkan ilmu, pekerjaan, pelanggan, legalitas usaha, pendidikan, atau jaringan yang baik, sesungguhnya ia sedang dipertemukan dengan salah satu bentuk rezeki dari Allah.</p>
      <div className="philosophy-values"><article><Lightbulb /><h2>Rezeki lebih luas dari harta</h2><p>Ilmu, kesehatan, keluarga, sahabat, kesempatan, kepercayaan, dan hidayah adalah karunia Allah yang tak ternilai.</p></article><article><Sprout /><h2>Ikhtiar yang bertumbuh</h2><p>Setiap produk dan kolaborasi diarahkan untuk membuka pintu rezeki yang halal, bernilai, dan penuh keberkahan.</p></article><article><HeartHandshake /><h2>Perantara kebaikan</h2><p>Kami ingin semakin banyak orang bertemu peluang, saling menguatkan, dan menghadirkan manfaat yang lebih luas.</p></article></div>
      <p>Bagi kami, rezeki tidak hanya berarti harta. Rezeki adalah ilmu yang bermanfaat, kesehatan yang memungkinkan seseorang berkarya, keluarga yang menenangkan hati, sahabat yang menguatkan, kesempatan untuk bertumbuh, kepercayaan yang diberikan orang lain, hingga hidayah yang mengarahkan langkah menuju kebaikan. Semua itu adalah karunia Allah yang tak ternilai.</p>
      <p>Maka, setiap layanan, produk, dan kolaborasi yang lahir melalui RizqHub diupayakan memiliki satu tujuan yang sama: <strong>membuka lebih banyak pintu rezeki yang halal, bernilai, dan penuh keberkahan</strong>. Kami ingin membantu para pelaku usaha bertumbuh, para profesional mengembangkan kompetensi, para pendidik menyebarkan ilmu, para pencari kerja menemukan kesempatan, serta siapa pun yang memiliki potensi agar dapat menghadirkan manfaat yang lebih luas.</p>
      <p>Kami tidak ingin dikenal sebagai pihak yang sekadar mengejar keuntungan. Kami ingin dikenal sebagai <strong>perantara kebaikan</strong>—tempat di mana semakin banyak orang bertemu dengan peluang, saling menguatkan, dan bersama-sama membangun kehidupan yang lebih bermakna.</p>
      <p>Karena pada akhirnya, keberhasilan terbesar bukanlah ketika kami menjadi yang paling kaya, melainkan ketika semakin banyak orang yang Allah mudahkan rezekinya melalui ikhtiar yang kami lakukan. Itulah makna yang ingin kami jaga dalam setiap langkah RizqHub: <strong>menjadi wasilah, bukan tujuan; menjadi penghubung, bukan pemilik; menjadi hamba yang mengajak sesama untuk semakin yakin bahwa Allah adalah Ar-Razzāq, Maha Pemberi Rezeki.</strong></p>
      <blockquote><Brand /><p>RizqHub bukan hanya tentang bisnis.</p><strong>RizqHub adalah ikhtiar untuk menjadi jalan rezeki bagi banyak orang, sambil bersama-sama belajar menjadi hamba Ar-Razzāq yang senantiasa bersyukur, berikhtiar, dan memberi manfaat.</strong></blockquote>
      <div className="philosophy-actions"><Link className="btn btn-primary btn-large" href="/register">Mulai ikhtiar bersama RizqHub <ArrowRight size={18} /></Link><Link className="btn btn-large" href="/marketplace">Temukan manfaat</Link></div>
    </article></section>
  </main></>;
}
