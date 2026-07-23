import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  CircleCheck,
  CreditCard,
  Globe2,
  LayoutDashboard,
  Mail,
  MessageCircle,
  Package,
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
  title: "Rizqhub — Platform Jualan Produk Digital",
  description: "Buat halaman jualan, terima pembayaran, kelola produk digital, pelanggan, tim, dan komunitas dari satu dashboard.",
};

const features = [
  {
    icon: Palette,
    title: "Landing Page Builder",
    description: "Susun halaman penawaran secara visual, simpan sebagai draf, lihat preview desktop atau mobile, lalu terbitkan saat siap.",
  },
  {
    icon: CreditCard,
    title: "Checkout & pembayaran",
    description: "Terima pembayaran melalui payment gateway atau transfer bank dengan alur konfirmasi yang tercatat.",
  },
  {
    icon: BookOpen,
    title: "Kursus & member area",
    description: "Atur modul, materi, video, lampiran, progres belajar, dan sertifikat dalam area member yang rapi.",
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
  ["01", "Buat produk", "Tentukan nama, harga, deskripsi, materi, dan penawaran produk digital Anda."],
  ["02", "Susun halaman", "Gunakan builder untuk menyusun landing page yang sesuai dengan identitas usaha."],
  ["03", "Bagikan & jual", "Publikasikan halaman, bagikan tautannya, lalu terima pesanan dan pembayaran."],
  ["04", "Layani pelanggan", "Berikan akses produk, rawat komunitas, dan pantau pertumbuhan dari dashboard."],
];

const useCases = [
  {
    icon: PlayCircle,
    title: "Kursus online",
    description: "Jual kelas video, program belajar, webinar, dan materi pendamping dalam satu alur.",
  },
  {
    icon: Package,
    title: "Produk digital",
    description: "Pasarkan e-book, template, panduan, dokumen, atau produk unduhan lainnya.",
  },
  {
    icon: MessageCircle,
    title: "Komunitas & mentoring",
    description: "Bangun ruang diskusi eksklusif dan jaga hubungan dengan pelanggan setelah transaksi.",
  },
];

const faqs = [
  ["Produk apa yang bisa dijual?", "Rizqhub dirancang untuk kursus online dan berbagai produk digital seperti e-book, template, rekaman kelas, panduan, atau akses komunitas."],
  ["Apakah bisa memakai domain sendiri?", "Bisa. Fitur Custom Domain memungkinkan merchant menghubungkan domain yang sudah diverifikasi ke etalase publiknya."],
  ["Bagaimana pembayarannya?", "Merchant dapat menggunakan payment gateway yang dikonfigurasi platform atau transfer bank manual dengan unggah dan verifikasi bukti pembayaran."],
  ["Apakah tim bisa mengelola toko bersama?", "Bisa. Workspace mendukung peran Owner, Admin, Finance, dan Staff agar akses setiap anggota tetap sesuai tugasnya."],
  ["Apa yang diterima pembeli setelah membayar?", "Setelah pembayaran terkonfirmasi, pembeli memperoleh akses member ke produk atau materi yang dibeli sesuai pengaturan merchant."],
];

export default function Home() {
  return (
    <>
      <Nav />
      <main className="home-v2">
        <section className="home-hero">
          <div className="shell home-hero-grid">
            <div className="home-hero-copy">
              <span className="eyebrow"><Sparkles size={14} /> Platform bisnis digital Indonesia</span>
              <h1 className="display">Jual produk digital tanpa merangkai banyak aplikasi.</h1>
              <p className="home-lead">Rizqhub menyatukan halaman jualan, checkout, pembayaran, kursus, pelanggan, tim, dan komunitas dalam satu sistem yang mudah dikelola.</p>
              <div className="home-hero-actions">
                <Link className="btn btn-primary home-primary-cta" href="/register">Mulai jualan <ArrowRight size={17} /></Link>
                <a className="btn" href="#cara-kerja"><PlayCircle size={17} /> Lihat cara kerja</a>
              </div>
              <div className="home-trust-list" aria-label="Keunggulan utama">
                <span><CircleCheck size={16} /> Siap untuk produk digital</span>
                <span><CircleCheck size={16} /> Akses sesuai peran</span>
                <span><CircleCheck size={16} /> Pembayaran tercatat</span>
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
                    <span><small>Dashboard usaha</small><strong>Selamat datang, Abu.</strong></span>
                    <i>+ Produk baru</i>
                  </div>
                  <div className="home-preview-stats">
                    <span><small>Penjualan</small><strong>Rp12,8 jt</strong><em>+18% bulan ini</em></span>
                    <span><small>Pesanan</small><strong>148</strong><em>132 terbayar</em></span>
                    <span><small>Pelanggan</small><strong>96</strong><em>12 pelanggan baru</em></span>
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
                    <span><i /><strong>Kelas Bisnis Digital</strong><small>Pesanan baru</small></span>
                    <b>LUNAS</b>
                  </div>
                </div>
              </div>
              <span className="home-floating-card home-floating-sales"><BarChart3 size={18} /><span><small>Konversi naik</small><strong>+24,6%</strong></span></span>
              <span className="home-floating-card home-floating-secure"><ShieldCheck size={18} /><span><small>Akses member</small><strong>Aktif otomatis</strong></span></span>
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
              <div><span className="eyebrow">Fitur terhubung</span><h2 className="display">Satu alur dari produk sampai pelanggan.</h2></div>
              <p>Anda tidak hanya mendapat halaman checkout. Rizqhub membantu mengelola pekerjaan sebelum, saat, dan setelah penjualan berlangsung.</p>
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
              <div><span className="eyebrow">Cara kerja</span><h2 className="display">Mulai dari ide. Berakhir pada bisnis yang terkelola.</h2></div>
              <p>Alur kerja dibuat singkat agar Anda dapat lebih banyak fokus pada isi produk, pemasaran, dan pelanggan.</p>
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
              <span className="eyebrow">Dibuat untuk bertumbuh</span>
              <h2 className="display">Cocok untuk banyak model bisnis digital.</h2>
              <p>Mulai dengan satu produk, lalu kembangkan katalog, pelanggan, dan tim tanpa harus berpindah sistem.</p>
            </div>
            <div className="home-use-grid">
              {useCases.map(({ icon: Icon, title, description }) => (
                <article key={title}><span><Icon size={24} /></span><h3>{title}</h3><p>{description}</p><Link href="/register">Mulai sekarang <ArrowRight size={15} /></Link></article>
              ))}
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
              <h2 className="display">Produk Anda layak punya sistem jualan yang lebih rapi.</h2>
              <p>Buat akun, siapkan produk pertama, dan kelola pertumbuhan usaha digital Anda dari Rizqhub.</p>
              <div className="home-hero-actions">
                <Link className="btn btn-lime" href="/register">Mulai sekarang <ArrowRight size={17} /></Link>
                <Link className="btn home-dark-secondary" href="/login">Masuk ke akun</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer home-footer">
        <div className="shell home-footer-grid">
          <div><Brand /><p>Platform untuk menjual, mengelola, dan mengembangkan produk digital.</p></div>
          <nav aria-label="Navigasi footer"><a href="#fitur">Fitur</a><a href="#cara-kerja">Cara kerja</a><a href="#faq">FAQ</a><Link href="/login">Masuk</Link></nav>
          <span>© 2026 Rizqhub. Dibuat untuk bisnis digital Indonesia.</span>
        </div>
      </footer>
    </>
  );
}
