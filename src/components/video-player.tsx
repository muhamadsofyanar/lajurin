import { ExternalLink, VideoOff } from "lucide-react";

type VideoSource =
  | { kind: "iframe"; src: string; title: string }
  | { kind: "file"; src: string }
  | { kind: "unsupported"; src: string };

function parseVideoSource(value: string): VideoSource {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}`, title: "Video YouTube" };
    }
    if (host === "youtube.com" || host === "m.youtube.com") {
      const id = url.searchParams.get("v") ?? url.pathname.match(/^\/(?:embed|shorts)\/([^/?]+)/)?.[1];
      if (id) return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}`, title: "Video YouTube" };
    }
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const id = url.pathname.match(/(?:video\/)?(\d+)/)?.[1];
      if (id) return { kind: "iframe", src: `https://player.vimeo.com/video/${id}`, title: "Video Vimeo" };
    }
    if (host === "loom.com") {
      const id = url.pathname.match(/^\/(?:share|embed)\/([^/?]+)/)?.[1];
      if (id) return { kind: "iframe", src: `https://www.loom.com/embed/${id}`, title: "Video Loom" };
    }
    if (/\.(mp4|webm|ogg)$/i.test(url.pathname)) return { kind: "file", src: url.toString() };
  } catch {
    // URL yang tidak valid ditangani sebagai sumber yang belum didukung.
  }
  return { kind: "unsupported", src: value };
}

export function VideoPlayer({ url, title }: { url: string; title: string }) {
  const source = parseVideoSource(url);
  if (source.kind === "iframe") {
    return <div className="video-frame"><iframe src={source.src} title={`${title} — ${source.title}`} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div>;
  }
  if (source.kind === "file") {
    return <div className="video-frame"><video controls preload="metadata"><source src={source.src} />Browser Anda belum mendukung pemutar video.</video></div>;
  }
  const safeExternalUrl = /^https?:\/\//i.test(source.src) ? source.src : null;
  return <div className="video-unsupported"><VideoOff size={28} /><div><strong>Video belum dapat diputar di dalam kelas.</strong><p>Gunakan tautan YouTube, Vimeo, Loom, atau file MP4/WebM/OGG langsung.</p></div>{safeExternalUrl && <a className="btn btn-compact" href={safeExternalUrl} target="_blank" rel="noreferrer">Buka sumber <ExternalLink size={14} /></a>}</div>;
}
