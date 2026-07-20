import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Lajurin — Jual Produk Digital", template: "%s · Lajurin" },
  description: "Buat produk, terima pembayaran, dan kirim akses kursus dalam satu tempat.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
