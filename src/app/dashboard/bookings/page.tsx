import { asc, desc, eq } from "drizzle-orm";
import { createBookingSlotAction } from "@/app/actions/booking";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { bookingAppointments, bookingSlots, orders, products } from "@/lib/schema";

export default async function BookingDashboard({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const merchant = await requireMerchant();
  const query = await searchParams;
  const services = await db.select().from(products).where(eq(products.merchantId, merchant.id)).orderBy(asc(products.name));
  const slots = await db.select({ slot: bookingSlots, productName: products.name }).from(bookingSlots)
    .innerJoin(products, eq(products.id, bookingSlots.productId)).where(eq(products.merchantId, merchant.id))
    .orderBy(desc(bookingSlots.startsAt)).limit(100);
  const appointments = await db.select({ appointment: bookingAppointments, slot: bookingSlots, order: orders, productName: products.name })
    .from(bookingAppointments).innerJoin(bookingSlots, eq(bookingSlots.id, bookingAppointments.slotId))
    .innerJoin(products, eq(products.id, bookingSlots.productId)).innerJoin(orders, eq(orders.id, bookingAppointments.orderId))
    .where(eq(products.merchantId, merchant.id)).orderBy(desc(bookingSlots.startsAt)).limit(100);
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Operasional jasa</span><h1 className="display">Booking & jadwal</h1><p>Buat slot layanan. Pelanggan yang sudah lunas dapat memilih jadwal dari member area.</p></div></div>
    {query.success && <p className="alert alert-success">{query.success}</p>}{query.error && <p className="alert">{query.error}</p>}
    <section className="panel"><div className="panel-head"><h2>Buat jadwal</h2></div><form className="form form-grid" action={createBookingSlotAction}><div className="field"><label>Produk jasa</label><select className="input" name="productId" required>{services.filter((product) => product.type === "SERVICE").map((product) => <option value={product.id} key={product.id}>{product.name}</option>)}</select></div><div className="field"><label>Mulai</label><input className="input" name="startsAt" type="datetime-local" required /></div><div className="field"><label>Selesai</label><input className="input" name="endsAt" type="datetime-local" required /></div><div className="field"><label>Kapasitas</label><input className="input" name="capacity" type="number" min="1" defaultValue="1" required /></div><button className="btn btn-primary" type="submit">Buat jadwal</button></form></section>
    <section className="panel"><div className="panel-head"><h2>Daftar slot</h2></div>{slots.length ? slots.map(({ slot, productName }) => <div className="finance-row" key={slot.id}><div><strong>{productName}</strong><small>{formatDate(slot.startsAt)} sampai {formatDate(slot.endsAt)}</small></div><span className="badge">{slot.bookedCount}/{slot.capacity} terisi</span></div>) : <div className="empty"><p>Belum ada jadwal.</p></div>}</section>
    <section className="panel"><div className="panel-head"><h2>Booking pelanggan</h2></div>{appointments.length ? appointments.map(({ appointment, slot, order, productName }) => <div className="finance-row" key={appointment.id}><div><strong>{order.customerName} · {productName}</strong><small>{order.customerEmail} · {formatDate(slot.startsAt)}</small></div><span className="badge status-paid">Terkonfirmasi</span></div>) : <div className="empty"><p>Belum ada booking pelanggan.</p></div>}</section>
  </div></main>;
}
