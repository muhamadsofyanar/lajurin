"use client";

import { useEffect } from "react";

export default function ApplicationError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("application_render_error", { digest: error.digest, name: error.name });
  }, [error]);

  return <main className="app-main"><div className="shell"><section className="panel empty"><h1>Halaman belum dapat dimuat</h1><p>Kesalahan sudah dicatat. Coba sekali lagi. Jika tetap terjadi, berikan kode berikut kepada tim operasional: <code>{error.digest ?? "tanpa-kode"}</code>.</p><button className="btn btn-primary" type="button" onClick={reset}>Coba lagi</button></section></div></main>;
}
