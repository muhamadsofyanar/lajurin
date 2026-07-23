import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { saveServiceIntakeAction, uploadClientServiceDocumentAction } from "@/app/actions/service";
import { requireUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { orders, products, serviceCaseNotes, serviceCases, serviceDocuments, users } from "@/lib/schema";
import { formatFileSize, serviceStatusLabel } from "@/lib/services";

export default async function ClientServicePage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const { error } = await searchParams;
  const [row] = await db.select({ serviceCase: serviceCases, order: orders, product: products })
    .from(serviceCases).innerJoin(orders, eq(serviceCases.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(eq(serviceCases.id, id), eq(serviceCases.customerId, user.id), eq(orders.customerId, user.id))).limit(1);
  if (!row) notFound();
  const [notes, documents] = await Promise.all([
    db.select({ note: serviceCaseNotes, authorName: users.name }).from(serviceCaseNotes)
      .innerJoin(users, eq(serviceCaseNotes.authorId, users.id))
      .where(and(eq(serviceCaseNotes.serviceCaseId, id), eq(serviceCaseNotes.visibility, "CLIENT"))).orderBy(asc(serviceCaseNotes.createdAt)),
    db.select().from(serviceDocuments).where(eq(serviceDocuments.serviceCaseId, id)).orderBy(asc(serviceDocuments.createdAt)),
  ]);
  const intake = row.serviceCase.intakeData;
  const paid = row.order.status === "PAID";

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><Link className="home-text-link" href="/member/orders">← Pesanan saya</Link><h1 className="display">{row.product.name}</h1><p>Portal layanan privat Anda.</p></div><span className="badge badge-live">{serviceStatusLabel[row.serviceCase.status]}</span></div>
    {error && <p className="alert">{error}</p>}{!paid && <p className="alert">Formulir dan upload dokumen terbuka setelah pembayaran dikonfirmasi.</p>}
    <div className="two-col"><div className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Data kebutuhan</h2></div><form className="form" action={saveServiceIntakeAction.bind(null, id)}>
        <div className="field"><label htmlFor="companyName">Nama badan usaha saat ini</label><input className="input" id="companyName" name="companyName" defaultValue={intake.companyName ?? ""} disabled={!paid} /></div>
        <div className="field"><label htmlFor="desiredName">Nama badan usaha yang diinginkan</label><input className="input" id="desiredName" name="desiredName" defaultValue={intake.desiredName ?? ""} disabled={!paid} /></div>
        <div className="field"><label htmlFor="businessActivity">Kegiatan usaha</label><textarea className="input" id="businessActivity" name="businessActivity" defaultValue={intake.businessActivity ?? ""} disabled={!paid} /></div>
        <div className="field"><label htmlFor="address">Alamat usaha</label><textarea className="input" id="address" name="address" defaultValue={intake.address ?? ""} disabled={!paid} /></div>
        <div className="field"><label htmlFor="notes">Catatan tambahan</label><textarea className="input" id="notes" name="notes" defaultValue={intake.notes ?? ""} disabled={!paid} /></div>
        <button className="btn btn-primary" type="submit" disabled={!paid}>Simpan data</button>
      </form></section>
      <section className="panel"><div className="panel-head"><h2>Pembaruan pengerjaan</h2></div>{notes.length ? notes.map(({ note, authorName }) => <article className="service-note" key={note.id}><p>{note.body}</p><small>{authorName} · {formatDate(note.createdAt)}</small></article>) : <p className="muted">Belum ada pembaruan dari tim.</p>}</section>
    </div><aside className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Upload persyaratan</h2></div><form className="form" action={uploadClientServiceDocumentAction.bind(null, id)}>
        <div className="field"><label htmlFor="label">Jenis dokumen</label><input className="input" id="label" name="label" required placeholder="Contoh: KTP pendiri" disabled={!paid} /></div>
        <div className="field"><label htmlFor="file">Pilih file</label><input className="input" id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required disabled={!paid} /><small className="field-hint">PDF, JPG, atau PNG maksimal 10 MB.</small></div>
        <button className="btn" type="submit" disabled={!paid}>Upload dokumen</button>
      </form></section>
      <section className="panel"><div className="panel-head"><h2>Dokumen</h2><span className="badge">{documents.length}</span></div>{documents.length ? documents.map((document) => <div className="attachment-row" key={document.id}><span><strong>{document.label}</strong><small>{document.audience === "CLIENT" ? "Hasil dari tim" : "Dikirim ke tim"} · {formatFileSize(document.size)}</small></span><Link className="btn btn-compact" href={`/api/service-document/${document.id}`}>Unduh</Link></div>) : <p className="muted">Belum ada dokumen.</p>}</section>
      <section className="panel"><div className="panel-head"><h2>Target</h2></div><p>{row.serviceCase.targetDate ? formatDate(row.serviceCase.targetDate) : "Belum ditetapkan oleh tim."}</p></section>
    </aside></div>
  </div></main>;
}
