import Link from "next/link";
import { Brand } from "@/components/brand";

export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: [string, string][] }) {
  return <><header><nav className="shell nav"><Brand /><Link className="btn" href="/">Kembali ke beranda</Link></nav></header><main className="legal-page"><div className="shell narrow"><span className="eyebrow">Dokumen Rizqhub</span><h1 className="display">{title}</h1><p className="muted">Terakhir diperbarui: {updated}</p>{sections.map(([heading, body]) => <section key={heading}><h2>{heading}</h2><p>{body}</p></section>)}</div></main></>;
}
