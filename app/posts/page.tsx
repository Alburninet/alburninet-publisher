"use client";

import React, { useEffect, useMemo, useState } from "react";

type WpPost = {
  id: number;
  date: string;
  modified: string;
  status: "publish" | "draft";
  link: string;
  title?: { rendered?: string };
  excerpt?: { rendered?: string };
};

type ApiList = WpPost[];

/* UI helpers */
function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function PostsPage() {
  const [status, setStatus] = useState<"all" | "publish" | "draft">("all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [perPage] = useState(20);

  const [items, setItems] = useState<WpPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasNext, setHasNext] = useState(false);

  const empty = useMemo(() => items.length === 0, [items]);

  async function fetchOne(st: "publish" | "draft", pg: number) {
    const res = await fetch(
      `/api/wp/posts?status=${st}&page=${pg}&per_page=${perPage}`,
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error(await res.text());
    return (await res.json()) as ApiList;
  }

  async function load() {
    setLoading(true);
    try {
      let data: WpPost[] = [];
      if (status === "all") {
        const [pub, dr] = await Promise.all([fetchOne("publish", page), fetchOne("draft", page)]);
        data = [...pub, ...dr].sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        // stima grezza next: se almeno uno dei due ha lunghezza piena
        setHasNext(pub.length === perPage || dr.length === perPage);
      } else {
        const list = await fetchOne(status, page);
        data = list;
        setHasNext(list.length === perPage);
      }

      // filtro client-side di cortesia (se /api non supporta ?search)
      const filtered = q.trim()
        ? data.filter((p) => {
            const t = p.title?.rendered?.toLowerCase() || "";
            const e = p.excerpt?.rendered?.toLowerCase() || "";
            const needle = q.trim().toLowerCase();
            return t.includes(needle) || e.includes(needle);
          })
        : data;

      setItems(filtered);
    } catch (e) {
      console.error("Errore caricamento articoli:", e);
      setItems([]);
      setHasNext(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, page]);

  function applyFilters() {
    setPage(1);
    load();
  }

  return (
    <div className="space-y-8">
      {/* Titolo pagina */}
      <h1 className="text-3xl font-semibold">Articoli</h1>

      {/* Barra filtri (nessuna Navbar qui) */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as any);
            setPage(1);
          }}
          className="border rounded-lg px-3 py-2"
        >
          <option value="all">Tutti gli stati</option>
          <option value="publish">Pubblicati</option>
          <option value="draft">Bozze</option>
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per titolo/contenuto..."
          className="flex-1 min-w-[260px] border rounded-lg px-3 py-2"
        />

        <button
          onClick={applyFilters}
          className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
        >
          Applica
        </button>
      </div>

      {/* Lista / tabella */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4">
          {loading ? (
            <div className="text-sm text-gray-500">Caricamento…</div>
          ) : empty ? (
            <div className="text-sm text-gray-500">Nessun articolo trovato.</div>
          ) : (
            <ul className="divide-y">
              {items.map((p) => (
                <li key={p.id} className="py-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs border ${
                            p.status === "publish"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-amber-50 text-amber-700 border-amber-200"
                          }`}
                        >
                          {p.status === "publish" ? "Pubblicato" : "Bozza"}
                        </span>
                        <a
                          href={p.link}
                          target="_blank"
                          rel="noreferrer"
                          className="font-medium hover:underline truncate"
                          title="Apri sul sito"
                        >
                          {p.title?.rendered || "(senza titolo)"}
                        </a>
                      </div>
                      <div
                        className="prose prose-sm text-gray-600 mt-1 line-clamp-2"
                        dangerouslySetInnerHTML={{
                          __html: p.excerpt?.rendered || "",
                        }}
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        creato: {fmtDate(p.date)} · modificato: {fmtDate(p.modified)}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <a
                        href={p.link}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                      >
                        Apri
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Paginazione semplice */}
      <div className="flex items-center gap-3">
        <button
          disabled={page <= 1 || loading}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          ← Precedente
        </button>
        <button
          disabled={!hasNext || loading}
          onClick={() => setPage((p) => p + 1)}
          className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-50"
        >
          Successiva →
        </button>
      </div>
    </div>
  );
}