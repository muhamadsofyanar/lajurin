import type { Metadata } from "next";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Rizqhub — Jual Produk Digital", template: "%s · Rizqhub" },
  description: "Buat produk, terima pembayaran, dan kirim akses kursus dalam satu tempat.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body><ServiceWorkerRegister />{children}</body></html>;
}
