import Link from "next/link";
import { CheckCircle2, Clock3 } from "lucide-react";
import { eq } from "drizzle-orm";
import { Brand } from "@/components/brand";
import { db } from "@/lib/db";
import { orders } from "@/lib/schema";

export default async function PaymentSuccessPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const { order: orderId } = await searchParams;
  const [order] = orderId ? await db.select({ status: orders.status }).from(orders).where(eq(orders.id, orderId)).limit(1) : [];
  const paid = order?.status === "PAID";
  return <main className="auth-main" style={{minHeight:"100vh"}}><section className="auth-card" style={{textAlign:"center"}}><Brand /><div style={{margin:"38px auto 18px",width:64,height:64,borderRadius:20,display:"grid",placeItems:"center",background:paid ? "#eafad8" : "#fff4db",color:paid ? "#4f7c15" : "#9e6700"}}>{paid ? <CheckCircle2 size={32} /> : <Clock3 size={32} />}</div><h2 className="display">{paid ? "Pembayaran berhasil" : "Pembayaran sedang dikonfirmasi"}</h2><p>{paid ? "Akses kursus sudah aktif di akun member Anda." : "Konfirmasi biasanya hanya membutuhkan beberapa detik. Silakan masuk untuk memeriksa akses."}</p><Link className="btn btn-primary" href="/login" style={{width:"100%"}}>Masuk ke member area</Link></section></main>;
}
