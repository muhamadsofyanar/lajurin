import { and, asc, eq, gt, sql } from "drizzle-orm";
import { reserveBookingAction } from "@/app/actions/booking";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { bookingAppointments, bookingSlots, orders, products } from "@/lib/schema";

export default async function MemberBookings({ searchParams }: { searchParams: Promise<{ success?: string; error?: string }> }) {
  const user = await requireUser();
  const query = await searchParams;
  const paidServices = await db.select({ order: orders, product: products, appointment: bookingAppointments, slot: bookingSlots })
    .from(orders).innerJoin(products, eq(products.id, orders.productId))
    .leftJoin(bookingAppointments, eq(bookingAppointments.orderId, orders.id))
    .leftJoin(bookingSlots, eq(bookingSlots.id, bookingAppointments.slotId))
    .where(and(eq(orders.customerId, user.id), eq(orders.status, "PAID"), eq(products.type, "SERVICE")));
  return <main className="app-main"><div className="shell"><div className="page-head"><div><span className="eyebrow">Jadwal layanan</span><h1 className="display">Booking saya</h1><p>Pilih waktu layanan untuk pesanan jasa yang sudah lunas.</p></div></div>
    {query.success && <p className="alert alert-success">{query.success}</p>}{query.error && <p className="alert">{query.error}</p>}
    {await Promise.all(paidServices.map(async ({ order, product, appointment, slot }) => {
      const available = appointment ? [] : await db.select().from(bookingSlots).where(and(
        eq(bookingSlots.productId, product.id), eq(bookingSlots.isActive, true), gt(bookingSlots.startsAt, new Date()),
        sql`${bookingSlots.bookedCount} < ${bookingSlots.capacity}`,
      )).orderBy(asc(bookingSlots.startsAt)).limit(20);
      return <section className="panel" key={order.id}><div className="panel-head"><div><h2>{product.name}</h2><span className="muted">{order.externalId}</span></div></div>{appointment && slot ? <p className="alert alert-success">Jadwal terkonfirmasi: <strong>{formatDate(slot.startsAt)}</strong> sampai {formatDate(slot.endsAt)}</p> : available.length ? <div className="stack">{available.map((choice) => <form className="finance-row" action={reserveBookingAction.bind(null, order.id, choice.id)} key={choice.id}><div><strong>{formatDate(choice.startsAt)}</strong><small>Selesai {formatDate(choice.endsAt)} · sisa {choice.capacity - choice.bookedCount} tempat</small></div><button className="btn btn-primary" type="submit">Pilih jadwal</button></form>)}</div> : <div className="empty"><p>Merchant belum membuka jadwal yang tersedia.</p></div>}</section>;
    }))}{!paidServices.length && <section className="panel empty"><p>Belum ada pesanan jasa yang lunas.</p></section>}
  </div></main>;
}
