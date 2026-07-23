import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { addServiceNoteAction, updateServiceCaseAction, uploadMerchantServiceDocumentAction } from "@/app/actions/service";
import { requireMerchant } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/order";
import { orders, products, serviceCaseNotes, serviceCases, serviceDocuments, serviceProductFields, users, workspaceMemberships } from "@/lib/schema";
import { formatFileSize, serviceStatusLabel, serviceStatusOptions } from "@/lib/services";

export default async function MerchantServiceCasePage({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ error?: string }>;
}) {
  const merchant = await requireMerchant("manage");
  const { id } = await params;
  const { error } = await searchParams;
  const [row] = await db.select({ serviceCase: serviceCases, order: orders, product: products })
    .from(serviceCases).innerJoin(orders, eq(serviceCases.orderId, orders.id))
    .innerJoin(products, eq(orders.productId, products.id))
    .where(and(eq(serviceCases.id, id), eq(serviceCases.merchantId, merchant.id))).limit(1);
  if (!row) notFound();
  const [notes, documents, team, fields] = await Promise.all([
    db.select({ note: serviceCaseNotes, authorName: users.name }).from(serviceCaseNotes)
      .innerJoin(users, eq(serviceCaseNotes.authorId, users.id)).where(eq(serviceCaseNotes.serviceCaseId, id)).orderBy(asc(serviceCaseNotes.createdAt)),
    db.select().from(serviceDocuments).where(eq(serviceDocuments.serviceCaseId, id)).orderBy(asc(serviceDocuments.createdAt)),
    merchant.workspaceId ? db.select({ id: users.id, name: users.name }).from(workspaceMemberships)
      .innerJoin(users, eq(workspaceMemberships.userId, users.id))
      .where(and(eq(workspaceMemberships.workspaceId, merchant.workspaceId), eq(workspaceMemberships.status, "ACTIVE"))) : Promise.resolve([{ id: merchant.id, name: merchant.name }]),
    db.select().from(serviceProductFields).where(eq(serviceProductFields.productId, row.product.id)).orderBy(asc(serviceProductFields.position)),
  ]);
  const intake = row.serviceCase.intakeData;

  return <main className="app-main"><div className="shell">
    <div className="page-head"><div><Link className="home-text-link" href="/dashboard/services">← Semua layanan</Link><h1 className="display">{row.product.name}</h1><p>{row.order.customerName} · {row.order.customerEmail} · {row.order.customerPhone || "Tanpa nomor WhatsApp"}</p></div><span className="badge badge-live">{serviceStatusLabel[row.serviceCase.status]}</span></div>
    {error && <p className="alert">{error}</p>}
    <div className="two-col"><div className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Kontrol pengerjaan</h2></div>
        <form className="form" action={updateServiceCaseAction.bind(null, id)}>
          <div className="field"><label htmlFor="status">Status</label><select className="input" id="status" name="status" defaultValue={row.serviceCase.status}>{serviceStatusOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></div>
          <div className="field"><label htmlFor="assignedTo">Penanggung jawab</label><select className="input" id="assignedTo" name="assignedTo" defaultValue={row.serviceCase.assignedTo ?? ""}><option value="">Belum ditugaskan</option>{team.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></div>
          <div className="field"><label htmlFor="targetDate">Target selesai</label><input className="input" id="targetDate" name="targetDate" type="date" defaultValue={row.serviceCase.targetDate?.toISOString().slice(0, 10) ?? ""} /></div>
          <button className="btn btn-primary" type="submit">Simpan progres</button>
        </form>
      </section>
      <section className="panel"><div className="panel-head"><h2>Data kebutuhan klien</h2></div>
        {Object.keys(intake).length ? <dl className="service-intake">{fields.map((field) => <div key={field.id}><dt>{field.label}</dt><dd>{intake[field.fieldKey] || "—"}</dd></div>)}</dl> : <p className="muted">Klien belum mengisi formulir kebutuhan.</p>}
      </section>
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Tambah catatan</h2></div>
        <form className="form" action={addServiceNoteAction.bind(null, id)}><div className="field"><label htmlFor="visibility">Jenis catatan</label><select className="input" id="visibility" name="visibility"><option value="CLIENT">Pembaruan untuk klien</option><option value="INTERNAL">Catatan internal tim</option></select></div><div className="field"><label htmlFor="body">Isi</label><textarea className="input" id="body" name="body" required minLength={2} /></div><button className="btn" type="submit">Tambahkan catatan</button></form>
      </section>
    </div><aside className="stack">
      <section className="panel form-panel"><div className="panel-head" style={{ margin: -24, marginBottom: 24 }}><h2>Kirim hasil ke klien</h2></div>
        <form className="form" action={uploadMerchantServiceDocumentAction.bind(null, id)}><div className="field"><label htmlFor="label">Nama dokumen</label><input className="input" id="label" name="label" required placeholder="Contoh: Akta pendirian final" /></div><div className="field"><label htmlFor="file">File</label><input className="input" id="file" name="file" type="file" accept=".pdf,.jpg,.jpeg,.png" required /><small className="field-hint">PDF, JPG, atau PNG maksimal 10 MB.</small></div><button className="btn btn-primary" type="submit">Unggah untuk klien</button></form>
      </section>
      <section className="panel"><div className="panel-head"><h2>Dokumen</h2><span className="badge">{documents.length}</span></div>{documents.length ? documents.map((document) => <div className="attachment-row" key={document.id}><span><strong>{document.label}</strong><small>{document.audience === "CLIENT" ? "Hasil untuk klien" : "Dari klien"} · {formatFileSize(document.size)}</small></span><Link className="btn btn-compact" href={`/api/service-document/${document.id}`}>Unduh</Link></div>) : <p className="muted">Belum ada dokumen.</p>}</section>
      <section className="panel"><div className="panel-head"><h2>Riwayat</h2></div>{notes.length ? notes.map(({ note, authorName }) => <article className="service-note" key={note.id}><span className="badge">{note.visibility === "INTERNAL" ? "Internal" : "Klien"}</span><p>{note.body}</p><small>{authorName} · {formatDate(note.createdAt)}</small></article>) : <p className="muted">Belum ada catatan.</p>}</section>
    </aside></div>
  </div></main>;
}
