"use client";

import React from "react";
import NavBar from "@/components/NavBar";

type MediaItem = {
  id: number;
  source_url: string;
  title?: { rendered?: string };
  date?: string;
};

async function fetchJson(url: string, init?: RequestInit) {
  const r = await fetch(url, init);
  const t = await r.text();
  try { return { ok: r.ok, data: t ? JSON.parse(t) : null, status: r.status }; }
  catch { return { ok: false, data: t, status: r.status }; }
}

export default function MediaPage() {
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const perPage = 24;

  const load = React.useCallback(async (pg: number) => {
    setLoading(true); setErr(null);
    const { ok, data } = await fetchJson(`/api/wp/media?page=${pg}&per_page=${perPage}`, { cache: "no-store" });
    if (!ok) { setErr("Errore nel caricamento media"); setItems([]); setLoading(false); return; }
    setItems(Array.isArray(data) ? data : data?.items || []);
    setLoading(false);
  }, []);

  React.useEffect(() => { load(page); }, [page, load]);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="mx-auto max-w-7xl p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Media WP</h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border px-3 py-2 bg-white hover:bg-gray-50"
              disabled={page === 1}
            >
              ← Indietro
            </button>
            <span className="text-sm text-gray-600">Pagina {page}</span>
            <button
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border px-3 py-2 bg-white hover:bg-gray-50"
            >
              Avanti →
            </button>
          </div>
        </div>

        {err && <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700">{err}</div>}

        {loading ? (
          <div className="text-sm text-gray-500">Caricamento…</div>
        ) : items.length === 0 ? (
          <div className="text-sm text-gray-500">Nessun media trovato.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-4">
            {items.map((m) => (
              <div key={m.id} className="rounded-xl border bg-white p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.source_url} alt={m.title?.rendered || ""} className="w-full h-[180px] object-cover rounded-lg border" />
                <div className="mt-2 text-xs line-clamp-2">{m.title?.rendered || `#${m.id}`}</div>
                <div className="mt-2 flex gap-2">
                  <a href={m.source_url} target="_blank" rel="noreferrer" className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs">Apri</a>
                  {/* Elimina: assicurati che la tua API /api/wp/media supporti DELETE
                  <button
                    className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
                    onClick={async () => {
                      const okDel = confirm("Eliminare questo media?");
                      if (!okDel) return;
                      const res = await fetchJson(`/api/wp/media?id=${m.id}`, { method: "DELETE" });
                      if (!res.ok) { alert("Eliminazione fallita"); return; }
                      load(page);
                    }}
                  >
                    Elimina
                  </button> */}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}