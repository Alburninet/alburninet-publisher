"use client";

import React from "react";

type MediaItem = {
  id: number;
  date?: string;
  title?: { rendered?: string };
  alt_text?: string;
  source_url?: string;
  guid?: { rendered?: string };
  mime_type?: string;
};

function cls(...s: (string | false | null | undefined)[]) {
  return s.filter(Boolean).join(" ");
}

export default function MediaManagerPage() {
  const [tab, setTab] = React.useState<"upload" | "library">("library");
  const [items, setItems] = React.useState<MediaItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [perPage] = React.useState(24);
  const [loading, setLoading] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [errMsg, setErrMsg] = React.useState<string | null>(null);

  function getSrc(m: MediaItem) {
    return m.source_url || m.guid?.rendered || "";
  }

  async function fetchMedia(p = 1, q = "") {
    setLoading(true);
    setErrMsg(null);
    try {
      const url = `/api/wp/media?page=${p}&per_page=${perPage}${
        q ? `&q=${encodeURIComponent(q)}` : ""
      }`;
      const res = await fetch(url, { cache: "no-store" });
      const raw = await res.text();
      let data: any = [];
      try {
        data = raw ? JSON.parse(raw) : [];
      } catch (e) {
        throw new Error("Risposta API non valida");
      }

      const itemsArr: MediaItem[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
        ? data.items
        : [];

      setItems(itemsArr);
      setPage(p);

      if (!res.ok) {
        const apiErr = (data && (data.error || data.message)) || `HTTP ${res.status}`;
        setErrMsg(apiErr);
      }
    } catch (e: any) {
      setErrMsg(e?.message || "Errore nel caricamento dei media.");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchMedia(1, "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(item: MediaItem) {
    if (!confirm(`Eliminare definitivamente: "${item.title?.rendered || item.id}"?`)) return;
    try {
      const res = await fetch(`/api/wp/media/${item.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Errore eliminazione HTTP ${res.status}`);
      alert("File eliminato!");
      fetchMedia(page, query);
    } catch (e: any) {
      alert(`Eliminazione fallita: ${e?.message || e}`);
    }
  }

  async function handleUpload(files: FileList | null) {
    if (!files || files.length === 0) return;
    const fd = new FormData();
    fd.append("file", files[0]);
    try {
      const res = await fetch("/api/wp/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Upload fallito");
      alert("Caricamento riuscito!");
      setTab("library");
      fetchMedia(1, query);
    } catch (e: any) {
      alert(e?.message || "Errore nell'upload");
    }
  }

  function copyUrl(url?: string) {
    if (!url) return;
    navigator.clipboard.writeText(url).then(() => alert("URL copiato negli appunti"));
  }

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">Gestione Media WordPress</h1>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow p-4 mb-4 flex gap-2">
          <button
            className={cls(
              "px-3 py-2 rounded-lg border text-sm",
              tab === "library" ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
            )}
            onClick={() => setTab("library")}
            type="button"
          >
            Libreria
          </button>
          <button
            className={cls(
              "px-3 py-2 rounded-lg border text-sm",
              tab === "upload" ? "bg-black text-white border-black" : "bg-white hover:bg-gray-50"
            )}
            onClick={() => setTab("upload")}
            type="button"
          >
            Carica
          </button>
        </div>

        {tab === "upload" ? (
          <div className="bg-white rounded-xl shadow p-6">
            <label className="block border-2 border-dashed rounded-xl p-8 text-center text-gray-500 hover:bg-gray-50 cursor-pointer">
              <input
                type="file"
                accept="image/*,video/*,audio/*,application/pdf"
                className="hidden"
                onChange={(e) => handleUpload(e.target.files)}
              />
              Trascina qui un file o <span className="underline">scegli</span>
            </label>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6">
            {errMsg && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {errMsg}
              </div>
            )}

            {/* Grid */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {items.map((m) => {
                const isImg = (m.mime_type || "").startsWith("image/");
                const title = m.title?.rendered || `Media #${m.id}`;
                const src = getSrc(m);

                return (
                  <div
                    key={m.id}
                    className="relative border rounded-lg overflow-hidden bg-white group hover:shadow"
                  >
                    {/* Anteprima */}
                    <div className="bg-gray-100 flex items-center justify-center h-64">
                      {isImg && src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={src}
                          alt={m.alt_text || title}
                          className="object-cover w-full h-full"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-xs text-gray-600 p-2 text-center break-words">
                          {m.mime_type || "file"}
                        </div>
                      )}
                    </div>

                    {/* Footer */}
                    <div className="p-2">
                      <div className="text-sm font-medium line-clamp-2">{title}</div>
                      <div className="mt-2 flex gap-1">
                        <button
                          type="button"
                          className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
                          onClick={() => copyUrl(src)}
                        >
                          Copia URL
                        </button>
                        <button
                          type="button"
                          className="ml-auto px-2 py-1 rounded border text-red-600 hover:bg-red-50 text-xs"
                          onClick={() => handleDelete(m)}
                        >
                          Elimina
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Paginazione */}
            <div className="mt-6 flex justify-between items-center">
              <button
                disabled={page <= 1}
                onClick={() => fetchMedia(page - 1, query)}
                className="px-3 py-2 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                ← Indietro
              </button>
              <span className="text-sm text-gray-600">Pagina {page}</span>
              <button
                onClick={() => fetchMedia(page + 1, query)}
                className="px-3 py-2 rounded border text-sm bg-white hover:bg-gray-50"
              >
                Avanti →
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}