import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BriefcaseBusiness,
  Check,
  CircleCheck,
  CreditCard,
  Globe2,
  LayoutDashboard,
  Mail,
  FileDown,
  MessageCircle,
  Palette,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
  Workflow,
  Zap,
} from "lucide-react";
import { Nav } from "@/components/nav";
import { Brand } from "@/components/brand";

export const metadata: Metadata = {
  title: "Rizqhub — Ubah Keahlian Menjadi Penghasilan",
  description: "Jual kursus, produk digital, dan jasa dari satu platform: landing page, checkout, pembayaran, delivery, pelanggan, dan analitik.",
};

const features = [
  {
    icon: Palette,
    title: "Landing Page Builder",
    description: "Susun penawaran yang meyakinkan, lihat preview desktop atau mobile, lalu terbitkan tanpa menyentuh kode.",
  },
  {
    icon: CreditCard,
    title: "Checkout & pembayaran",
    description: "Terima pembayaran melalui payment gateway atau transfer bank dengan alur konfirmasi yang tercatat.",
  },
  {
    icon: BookOpen,
    title: "Delivery otomatis",
    description: "Berikan kursus, file digital privat, atau portal pengerjaan jasa kepada pelanggan dari satu akun.",
  },
  {
    icon: Users,
    title: "Tim workspace",
    description: "Undang Owner, Admin, Finance, atau Staff dan berikan akses sesuai tanggung jawab masing-masing.",
  },
  {
    icon: Mail,
    title: "Pelanggan & broadcast",
    description: "Kelola data pelanggan, kirim informasi penting, dan tindak lanjuti checkout yang belum selesai.",
  },
  {
    icon: BarChart3,
    title: "Analitik usaha",
    description: "Pantau transaksi, penjualan kotor, biaya platform, pendapatan bersih, produk, dan performa funnel.",
  },
];

const steps = [
  ["01", "Buat penawaran", "Pilih kursus, produk digital, atau jasa. Tentukan hasil, harga, dan isi yang diterima pembeli."],
  ["02", "Terbitkan halaman", "Susun landing page sesuai brand, tambahkan promo, lalu lihat hasilnya sebelum dipublikasikan."],
  ["03", "Terima pembayaran", "Bagikan satu tautan. Pesanan, kupon, checkout, dan pembayaran tercatat otomatis."],
  ["04", "Tumbuhkan penjualan", "Kirim produk, layani pelanggan, dan gunakan data funnel untuk memperbaiki konversi."],
];

const useCases = [
  {
    icon: PlayCircle,
    title: "Kursus online",
    description: "Jual kelas video, program belajar, webinar, dan materi pendamping dalam satu alur.",
  },
  {
    icon: FileDown,
    title: "Produk digital",
    description: "Jual e-book, template, panduan, rekaman, atau file privat yang hanya terbuka bagi pembeli lunas.",
  },
  {
    icon: BriefcaseBusiness,
    title: "Jasa profesional",
    description: "Terima pesanan jasa, kumpulkan kebutuhan klien, kelola dokumen, dan laporkan progres lewat portal.",
  },
  {
    icon: MessageCircle,
    title: "Mentoring & konsultasi",
    description: "Jual sesi konsultasi atau program pendampingan dan lanjutkan komunikasi setelah transaksi.",
  },
];

const faqs = [
  ["Produk apa yang bisa dijual?", "Anda dapat menjual kursus online, e-book, template, rekaman, dokumen, layanan profesional, konsultasi, dan program pendampingan."],
  ["Apakah bisa memakai domain sendiri?", "Bisa. Fitur Custom Domain memungkinkan merchant menghubungkan domain yang sudah diverifikasi ke etalase publiknya."],
  ["Bagaimana pembayarannya?", "Merchant dapat menggunakan payment gateway yang dikonfigurasi platform atau transfer bank manual dengan unggah dan verifikasi bukti pembayaran."],
  ["Apakah tim bisa mengelola toko bersama?", "Bisa. Workspace mendukung peran Owner, Admin, Finance, dan Staff agar akses setiap anggota tetap sesuai tugasnya."],
  ["Apa yang diterima pembeli setelah membayar?", "Pembeli mendapatkan akses sesuai tipe produk: kelas untuk kursus, unduhan privat untuk produk digital, atau portal pengerjaan untuk jasa."],
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="home-v2">
        <section className="home-hero">
          <div className="shell home-hero-grid">
            <div className="home-hero-copy">
              <span className="eyebrow"><Sparkles size={14} /> Satu platform untuk mulai dan bertumbuh</span>
              <h1 className="display">Ubah keahlian Anda menjadi bisnis yang terus menghasilkan.</h1>
              <p className="home-lead">Jual kursus, produk digital, dan jasa tanpa merangkai banyak aplikasi. Dari halaman penawaran hingga pelanggan menerima hasilnya—semua berjalan di Rizqhub.</p>
              <div className="home-hero-actions">
                <Link className="btn btn-primary home-primary-cta" href="/register">Buat toko Anda <ArrowRight size={17} /></Link>
                <a className="btn" href="#cara-kerja"><PlayCircle size={17} /> Lihat alurnya</a>
              </div>
              <div className="home-trust-list" aria-label="Keunggulan utama">
                <span><CircleCheck size={16} /> Tidak perlu coding</span>
                <span><CircleCheck size={16} /> Mulai dari satu produk</span>
                <span><CircleCheck size={16} /> Data bisnis tetap tertata</span>
              </div>
            </div>

            <div className="home-product-preview" aria-label="Ilustrasi dashboard Rizqhub">
              <div className="home-preview-window">
                <div className="home-preview-topbar">
                  <span className="home-preview-brand"><Zap size={14} fill="currentColor" /> Rizqhub</span>
                  <span className="home-preview-avatar">A</span>
                </div>
                <div className="home-preview-body">
                  <div className="home-preview-heading">
                    <span><small>Dashboard usaha</small><strong>Bisnis Anda, satu kendali.</strong></span>
                    <i>+ Produk baru</i>
                  </div>
                  <div className="home-preview-stats">
                    <span><small>Landing page</small><strong>Terbit</strong><em>Siap dibagikan</em></span>
                    <span><small>Checkout</small><strong>Aktif</strong><em>Pembayaran tercatat</em></span>
                    <span><small>Delivery</small><strong>Otomatis</strong><em>Sesuai tipe produk</em></span>
                  </div>
                  <div className="home-preview-chart">
                    <div><small>Ringkasan penjualan</small><strong>Performa 7 hari terakhir</strong></div>
                    <span className="bar bar-1" />
                    <span className="bar bar-2" />
                    <span className="bar bar-3" />
                    <span className="bar bar-4" />
                    <span className="bar bar-5" />
                    <span className="bar bar-6" />
                    <span className="bar bar-7" />
                  </div>
                  <div className="home-preview-orders">
                    <span><i /><strong>Produk unggulan Anda</strong><small>Pesanan baru</small></span>
                    <b>LUNAS</b>
                  </div>
                </div>
              </div>
              <span className="home-floating-card home-floating-sales"><BarChart3 size={18} /><span><small>Funnel terlihat</small><strong>Ukur & optimalkan</strong></span></span>
              <span className="home-floating-card home-floating-secure"><ShieldCheck size={18} /><span><small>Akses pembeli</small><strong>Privat & tercatat</strong></span></span>
            </div>
          </div>
        </section>

        <section className="home-proof">
          <div className="shell home-proof-grid">
            <span><LayoutDashboard size={20} /><strong>Satu dashboard</strong><small>Semua operasional utama</small></span>
            <span><CreditCard size={20} /><strong>Pembayaran fleksibel</strong><small>Gateway dan transfer manual</small></span>
            <span><Users size={20} /><strong>Kolaborasi tim</strong><small>Hak akses berbasis peran</small></span>
            <span><Globe2 size={20} /><strong>Identitas sendiri</strong><small>Profil toko dan custom domain</small></span>
          </div>
        </section>

        <section className="section home-features" id="fitur">
          <div className="shell">
            <div className="home-section-heading">
              <div><span className="eyebrow">Bukan sekadar link pembayaran</span><h2 className="display">Semua yang dibutuhkan untuk mengubah pengunjung menjadi pelanggan.</h2></div>
              <p>Rizqhub menghubungkan penawaran, checkout, pembayaran, delivery, dan hubungan pelanggan agar tidak ada langkah penting yang tercecer.</p>
            </div>
            <div className="home-feature-grid">
              {features.map(({ icon: Icon, title, description }, index) => (
                <article className="home-feature-card" key={title}>
                  <span className="home-feature-number">{String(index + 1).padStart(2, "0")}</span>
                  <span className="home-feature-icon"><Icon size={22} /></span>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section home-workflow" id="cara-kerja">
          <div className="shell">
            <div className="home-section-heading home-section-heading-light">
              <div><span className="eyebrow">Dari nol sampai siap dijual</span><h2 className="display">Empat langkah untuk mulai menerima pesanan.</h2></div>
              <p>Anda fokus pada nilai yang dijual. Rizqhub merapikan perjalanan pelanggan dari klik pertama sampai produk diterima.</p>
            </div>
            <div className="home-step-grid">
              {steps.map(([number, title, description]) => (
                <article className="home-step" key={number}>
                  <span>{number}</span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                  <ArrowRight size={19} aria-hidden="true" />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section home-use-cases">
          <div className="shell">
            <div className="home-centered-heading">
              <span className="eyebrow">Satu sistem, banyak sumber penghasilan</span>
              <h2 className="display">Apa pun yang Anda jual, alurnya tetap sederhana.</h2>
              <p>Mulai dengan satu penawaran, validasi pasar, lalu kembangkan katalog dan tim tanpa memindahkan data ke sistem lain.</p>
            </div>
            <div className="home-use-grid">
              {useCases.map(({ icon: Icon, title, description }) => (
                <article key={title}><span><Icon size={24} /></span><h3>{title}</h3><p>{description}</p><Link href="/register">Mulai sekarang <ArrowRight size={15} /></Link></article>
              ))}
            </div>
          </div>
        </section>

        <section className="section home-before-after">
          <div className="shell">
            <div className="home-centered-heading">
              <span className="eyebrow">Berhenti kehilangan momentum</span>
              <h2 className="display">Bisnis tumbuh lebih cepat ketika semua proses saling terhubung.</h2>
              <p>Kurangi pekerjaan berulang dan buat pengalaman membeli yang lebih meyakinkan.</p>
            </div>
            <div className="home-compare-grid">
              <article className="home-compare-old"><span>Tanpa sistem terpadu</span><h3>Banyak alat, banyak pekerjaan manual</h3><ul><li>Landing page, pembayaran, dan data pelanggan terpisah</li><li>File dibagikan manual setelah mengecek transfer</li><li>Progres jasa tersebar di chat pribadi</li><li>Sulit mengetahui titik kebocoran penjualan</li></ul></article>
              <article className="home-compare-new"><span>Dengan Rizqhub</span><h3>Satu alur yang siap menghasilkan</h3><ul><li><Check size={17} /> Buat penawaran dan checkout dalam satu tempat</li><li><Check size={17} /> Berikan akses sesuai produk setelah pembayaran</li><li><Check size={17} /> Kelola pelanggan, tim, dan layanan secara tertata</li><li><Check size={17} /> Lihat funnel lalu perbaiki konversi berdasarkan data</li></ul><Link className="btn btn-lime" href="/register">Mulai bangun toko <ArrowRight size={17} /></Link></article>
            </div>
          </div>
        </section>

        <section className="section home-control">
          <div className="shell home-control-grid">
            <div className="home-control-copy">
              <span className="eyebrow">Kontrol tetap di tangan Anda</span>
              <h2 className="display">Kelola bisnis dengan data dan akses yang lebih tertata.</h2>
              <p>Setiap bagian penting mempunyai tempat yang jelas. Owner dapat melihat keseluruhan usaha, sementara anggota tim bekerja sesuai perannya.</p>
              <ul>
                <li><Check size={17} /> Status transaksi dan pembayaran mudah ditelusuri.</li>
                <li><Check size={17} /> Peran Owner, Admin, Finance, dan Staff dipisahkan.</li>
                <li><Check size={17} /> Draf dan versi terbit landing page dikelola terpisah.</li>
                <li><Check size={17} /> Data produk, pelanggan, dan aktivitas berada dalam satu dashboard.</li>
              </ul>
              <Link className="btn btn-primary" href="/register">Buat akun Rizqhub <ArrowRight size={17} /></Link>
            </div>
            <div className="home-control-cards">
              <article><span><ShieldCheck size={22} /></span><div><small>Hak akses</small><h3>Workspace berbasis peran</h3><p>Setiap anggota mendapat menu dan tindakan sesuai tanggung jawabnya.</p></div></article>
              <article><span><Workflow size={22} /></span><div><small>Operasional</small><h3>Alur yang saling terhubung</h3><p>Pesanan, pembayaran, akses produk, dan komunikasi tidak berdiri sendiri.</p></div></article>
              <article><span><Store size={22} /></span><div><small>Identitas usaha</small><h3>Etalase milik brand Anda</h3><p>Atur profil, warna, konten penawaran, kontak, dan alamat domain publik.</p></div></article>
            </div>
          </div>
        </section>

        <section className="section home-faq" id="faq">
          <div className="shell home-faq-grid">
            <div>
              <span className="eyebrow">Pertanyaan umum</span>
              <h2 className="display">Yang perlu diketahui sebelum mulai.</h2>
              <p>Jawaban singkat mengenai produk, pembayaran, akses tim, dan pengalaman pembeli di Rizqhub.</p>
              <Link className="home-text-link" href="/register">Siap mencoba? Buat akun <ArrowRight size={16} /></Link>
            </div>
            <div className="home-faq-list">
              {faqs.map(([question, answer], index) => (
                <details key={question} open={index === 0}>
                  <summary>{question}<span>+</span></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="home-final-cta">
          <div className="shell">
            <div>
              <span className="eyebrow">Mulai langkah pertama</span>
              <h2 className="display">Jangan biarkan produk bagus berhenti sebagai rencana.</h2>
              <p>Buat toko Anda, terbitkan penawaran pertama, dan mulai kumpulkan pelanggan dalam sistem yang siap ikut bertumbuh.</p>
              <div className="home-hero-actions">
                <Link className="btn btn-lime" href="/register">Buat toko saya <ArrowRight size={17} /></Link>
                <Link className="btn home-dark-secondary" href="/login">Masuk ke akun</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer home-footer">
        <div className="shell home-footer-grid">
          <div><Brand /><p>Platform untuk menjual kursus, produk digital, dan jasa dari satu tempat.</p></div>
          <nav aria-label="Navigasi footer"><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara kerja</a><Link href="/help">Bantuan</Link><Link href="/terms">Ketentuan</Link><Link href="/privacy">Privasi</Link><Link href="/refund-policy">Refund</Link><Link href="/login">Masuk</Link></nav>
          <span>© 2026 Rizqhub. Dibuat untuk bisnis digital Indonesia.</span>
        </div>
      </footer>
    </>
  );
}
