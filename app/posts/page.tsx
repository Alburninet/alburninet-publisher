"use client";

import React from "react";
import NavBar from "@/components/NavBar";

type WPPost = {
  id: number;
  date?: string;
  title?: { rendered?: string };
  link?: string;
  status?: string;
};

async function fetchJson(url: string) {
  const r = await fetch(url, { cache: "no-store" });
  const t = await r.text();
  try { return { ok: r.ok, data: t ? JSON.parse(t) : null }; }
  catch { return { ok: false, data: t }; }
}

export default function PostsPage() {
  const [pub, setPub] = React.useState<WPPost[]>([]);
  const [draft, setDraft] = React.useState<WPPost[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let abort = false;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const [p1, p2] = await Promise.all([
          fetchJson("/api/wp/posts?status=publish&page=1"),
          fetchJson("/api/wp/posts?status=draft&page=1"),
        ]);
        if (abort) return;
        if (p1.ok) setPub(Array.isArray(p1.data) ? p1.data : p1.data?.items || []);
        if (p2.ok) setDraft(Array.isArray(p2.data) ? p2.data : p2.data?.items || []);
        if (!p1.ok && !p2.ok) setErr("Errore nel caricamento degli articoli");
      } catch (e: any) {
        if (!abort) setErr(e?.message || "Errore rete");
      } finally {
        if (!abort) setLoading(false);
      }
    })();
    return () => { abort = true; };
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <h1 className="text-2xl font-semibold mb-4">Articoli</h1>

        {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{err}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-3">Pubblicati</h2>
            {loading ? (
              <div className="text-sm text-gray-500">Caricamento…</div>
            ) : pub.length === 0 ? (
              <div className="text-sm text-gray-500">Nessun articolo pubblicato.</div>
            ) : (
              <ul className="space-y-2">
                {pub.map((p) => (
                  <li key={p.id} className="rounded-lg border p-3 bg-white">
                    <div className="font-medium line-clamp-2">{p.title?.rendered || `#${p.id}`}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(p.date || "").toLocaleString()}</div>
                    <div className="mt-2 flex gap-2">
                      <a href={`/compose?postId=${p.id}`} className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs">Apri</a>
                      {p.link && (
                        <a href={p.link} target="_blank" rel="noreferrer" className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs">Vedi sul sito</a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border bg-white p-4">
            <h2 className="font-semibold mb-3">Bozze</h2>
            {loading ? (
              <div className="text-sm text-gray-500">Caricamento…</div>
            ) : draft.length === 0 ? (
              <div className="text-sm text-gray-500">Nessuna bozza.</div>
            ) : (
              <ul className="space-y-2">
                {draft.map((p) => (
                  <li key={p.id} className="rounded-lg border p-3 bg-white">
                    <div className="font-medium line-clamp-2">{p.title?.rendered || `#${p.id}`}</div>
                    <div className="text-xs text-gray-500 mt-1">{new Date(p.date || "").toLocaleString()}</div>
                    <div className="mt-2 flex gap-2">
                      <a href={`/compose?postId=${p.id}`} className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs">Apri</a>
                      <button className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs" onClick={() => {
                        localStorage.setItem("alburninet_prefill", JSON.stringify({ title: p.title?.rendered || "", excerpt: "", contentHtml: "", tags: [] }));
                        window.location.href = "/compose";
                      }}>Crea bozza</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}