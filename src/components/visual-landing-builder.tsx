"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, CheckCircle2, Eye, GripVertical, Monitor, Smartphone, Sparkles } from "lucide-react";
import { updateLandingPageAction } from "@/app/actions/merchant";

const sections = [
  ["AUDIENCE", "Cocok untuk siapa"], ["INSTRUCTOR", "Pengajar"], ["CURRICULUM", "Kurikulum"],
  ["BONUSES", "Bonus"], ["TESTIMONIALS", "Testimoni"], ["OFFER", "Penawaran"], ["FAQ", "FAQ"],
] as const;

type Initial = Record<string, string | number | null>;
type Product = { id: string; name: string; slug: string; headline: string; description: string; price: number };

function text(initial: Initial, key: string, fallback = "") {
  const value = initial[key];
  return typeof value === "string" ? value : fallback;
}

export function VisualLandingBuilder({ product, initial, initialOrder }: { product: Product; initial: Initial; initialOrder: string[] }) {
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [order, setOrder] = useState(initialOrder);
  const [heroTitle, setHeroTitle] = useState(text(initial, "heroTitle", product.headline));
  const [heroSubtitle, setHeroSubtitle] = useState(text(initial, "heroSubtitle", product.description));
  const [eyebrow, setEyebrow] = useState(text(initial, "eyebrow", "Untuk kreator & UMKM"));
  const [cta, setCta] = useState(text(initial, "ctaText", "Mulai belajar"));
  const [accent, setAccent] = useState(text(initial, "accentColor", "#0f9f91"));
  const [template, setTemplate] = useState(text(initial, "template", "EDITORIAL"));
  const [benefits, setBenefits] = useState(text(initial, "benefitsText"));
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= order.length) return;
    setOrder((items) => { const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  }

  function dropAt(targetIndex: number) {
    if (draggedIndex === null || draggedIndex === targetIndex) return setDraggedIndex(null);
    setOrder((items) => {
      const next = [...items];
      const [moved] = next.splice(draggedIndex, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setDraggedIndex(null);
  }

  const benefitList = benefits.split("\n").map((item) => item.trim()).filter(Boolean).slice(0, 3);
  const action = updateLandingPageAction.bind(null, product.id);
  return <div className="visual-builder-grid">
    <form className="panel visual-builder-form" action={action}>
      <input type="hidden" name="sectionOrder" value={JSON.stringify(order)} />
      <div className="visual-builder-toolbar"><div><span className="eyebrow">Editor visual</span><h2>Susun halaman</h2></div><span className="builder-save-state">Draft terpisah dari versi publik</span></div>

      <details className="builder-accordion" open><summary><span>01</span><strong>Hero & tampilan</strong></summary><div className="builder-fields">
        <div className="two-field"><div className="field"><label htmlFor="template">Template</label><select className="input" id="template" name="template" value={template} onChange={(event) => setTemplate(event.target.value)}><option value="EDITORIAL">Editorial Trust</option><option value="CREATOR">Creator Momentum</option><option value="STUDIO">Creator Studio</option></select></div><div className="field color-field"><label htmlFor="accentColor">Warna aksen</label><input id="accentColor" name="accentColor" type="color" value={accent} onChange={(event) => setAccent(event.target.value)} /></div></div>
        <div className="field"><label htmlFor="eyebrow">Label audiens</label><input className="input" id="eyebrow" name="eyebrow" value={eyebrow} onChange={(event) => setEyebrow(event.target.value)} maxLength={80} /></div>
        <div className="field"><label htmlFor="heroTitle">Judul utama</label><input className="input" id="heroTitle" name="heroTitle" value={heroTitle} onChange={(event) => setHeroTitle(event.target.value)} maxLength={180} /></div>
        <div className="field"><label htmlFor="heroSubtitle">Penjelasan utama</label><textarea className="input" id="heroSubtitle" name="heroSubtitle" value={heroSubtitle} onChange={(event) => setHeroSubtitle(event.target.value)} maxLength={1000} /></div>
        <div className="two-field"><div className="field"><label htmlFor="coverImageUrl">URL cover</label><input className="input" id="coverImageUrl" name="coverImageUrl" defaultValue={text(initial, "coverImageUrl")} /></div><div className="field"><label htmlFor="heroVideoUrl">URL video</label><input className="input" id="heroVideoUrl" name="heroVideoUrl" defaultValue={text(initial, "heroVideoUrl")} /></div></div>
        <div className="field"><label htmlFor="benefitsText">Manfaat utama</label><textarea className="input" id="benefitsText" name="benefitsText" value={benefits} onChange={(event) => setBenefits(event.target.value)} maxLength={3000} placeholder="Satu manfaat per baris" /></div>
      </div></details>

      <details className="builder-accordion" open><summary><span>02</span><strong>Urutan section</strong></summary><div className="section-sort-list">{order.map((key, index) => { const label = sections.find(([id]) => id === key)?.[1] ?? key; return <div className={`section-sort-item ${draggedIndex === index ? "dragging" : ""}`} draggable key={key} onDragStart={() => setDraggedIndex(index)} onDragEnd={() => setDraggedIndex(null)} onDragOver={(event) => event.preventDefault()} onDrop={() => dropAt(index)}><GripVertical aria-hidden size={16} /><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong><div><button type="button" aria-label={`Naikkan ${label}`} onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp size={15} /></button><button type="button" aria-label={`Turunkan ${label}`} onClick={() => move(index, 1)} disabled={index === order.length - 1}><ArrowDown size={15} /></button></div></div>; })}</div><p className="field-hint">Seret section untuk mengubah urutan. Tombol naik/turun tetap tersedia untuk keyboard.</p></details>

      <details className="builder-accordion"><summary><span>03</span><strong>Audiens & pengajar</strong></summary><div className="builder-fields">
        <div className="field"><label htmlFor="audienceText">Cocok untuk siapa</label><textarea className="input" id="audienceText" name="audienceText" defaultValue={text(initial, "audienceText")} maxLength={1500} /></div>
        <div className="two-field"><div className="field"><label htmlFor="instructorName">Nama pengajar</label><input className="input" id="instructorName" name="instructorName" defaultValue={text(initial, "instructorName")} maxLength={100} /></div><div className="field"><label htmlFor="instructorRole">Keahlian/jabatan</label><input className="input" id="instructorRole" name="instructorRole" defaultValue={text(initial, "instructorRole")} maxLength={120} /></div></div>
        <div className="field"><label htmlFor="instructorBio">Bio pengajar</label><textarea className="input" id="instructorBio" name="instructorBio" defaultValue={text(initial, "instructorBio")} maxLength={1500} /></div>
        <div className="field"><label htmlFor="instructorImageUrl">URL foto pengajar</label><input className="input" id="instructorImageUrl" name="instructorImageUrl" defaultValue={text(initial, "instructorImageUrl")} /></div>
      </div></details>

      <details className="builder-accordion"><summary><span>04</span><strong>Bukti, bonus & FAQ</strong></summary><div className="builder-fields">
        <div className="field"><label htmlFor="bonusesText">Bonus</label><textarea className="input" id="bonusesText" name="bonusesText" defaultValue={text(initial, "bonusesText")} maxLength={3000} placeholder="Nama bonus | Keterangan" /></div>
        <div className="field"><label htmlFor="testimonialsText">Testimoni</label><textarea className="input" id="testimonialsText" name="testimonialsText" defaultValue={text(initial, "testimonialsText")} maxLength={5000} placeholder="Nama | Peran | Testimoni" /></div>
        <div className="field"><label htmlFor="faqText">FAQ</label><textarea className="input" id="faqText" name="faqText" defaultValue={text(initial, "faqText")} maxLength={5000} placeholder="Pertanyaan | Jawaban" /></div>
      </div></details>

      <details className="builder-accordion"><summary><span>05</span><strong>Harga, CTA & tracking</strong></summary><div className="builder-fields">
        <div className="two-field"><div className="field"><label htmlFor="compareAtPrice">Harga normal/coret</label><input className="input" id="compareAtPrice" name="compareAtPrice" type="number" min={product.price} defaultValue={initial.compareAtPrice ?? ""} /></div><div className="field"><label htmlFor="promoEndsAt">Promo berakhir</label><input className="input" id="promoEndsAt" name="promoEndsAt" type="datetime-local" defaultValue={text(initial, "promoEndsAt")} /></div></div>
        <div className="two-field"><div className="field"><label htmlFor="guaranteeTitle">Judul jaminan</label><input className="input" id="guaranteeTitle" name="guaranteeTitle" defaultValue={text(initial, "guaranteeTitle")} maxLength={120} /></div><div className="field"><label htmlFor="ctaText">Tulisan tombol</label><input className="input" id="ctaText" name="ctaText" value={cta} onChange={(event) => setCta(event.target.value)} minLength={2} maxLength={60} /></div></div>
        <div className="field"><label htmlFor="guaranteeText">Penjelasan jaminan/refund</label><textarea className="input" id="guaranteeText" name="guaranteeText" defaultValue={text(initial, "guaranteeText")} maxLength={1500} /></div>
        <div className="two-field"><div className="field"><label htmlFor="facebookPixelId">Meta Pixel ID</label><input className="input" id="facebookPixelId" name="facebookPixelId" defaultValue={text(initial, "facebookPixelId")} /></div><div className="field"><label htmlFor="tiktokPixelId">TikTok Pixel ID</label><input className="input" id="tiktokPixelId" name="tiktokPixelId" defaultValue={text(initial, "tiktokPixelId")} /></div></div>
      </div></details>

      <div className="builder-submit-bar"><button className="btn" name="intent" value="DRAFT" type="submit">Simpan draft</button><button className="btn btn-primary" name="intent" value="PUBLISH" type="submit">Publish perubahan</button></div>
    </form>

    <aside className="visual-preview-panel"><div className="visual-preview-toolbar"><span><Eye size={16} /> Pratinjau langsung</span><div><button className={device === "desktop" ? "active" : ""} type="button" onClick={() => setDevice("desktop")}><Monitor size={16} /></button><button className={device === "mobile" ? "active" : ""} type="button" onClick={() => setDevice("mobile")}><Smartphone size={16} /></button></div></div><div className={`visual-preview-frame ${device}`} style={{ "--preview-accent": accent } as React.CSSProperties}><div className={`preview-page preview-${template.toLowerCase()}`}><section className="preview-hero"><small>{eyebrow}</small><h2>{heroTitle || product.name}</h2><p>{heroSubtitle}</p>{benefitList.map((item) => <span key={item}><CheckCircle2 size={13} /> {item}</span>)}<strong>Rp{product.price.toLocaleString("id-ID")}</strong><button type="button">{cta || "Mulai belajar"}</button></section>{order.map((key) => <section className="preview-section-card" key={key}><Sparkles size={15} /><div><small>SECTION</small><strong>{sections.find(([id]) => id === key)?.[1] ?? key}</strong></div></section>)}</div></div></aside>
  </div>;
}
