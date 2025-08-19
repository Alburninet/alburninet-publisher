"use client";
import { useEffect, useState } from "react";

type MediaItem = {
  id: number;
  source_url: string;
  alt_text?: string;
  media_type?: string;
  media_details?: any;
};

export default function MediaPicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (item: { url: string; alt?: string; id: number }) => void;
}) {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    fetch(`/api/wp/media?search=${encodeURIComponent(q)}&page=${page}`)
      .then(r => r.json())
      .then(j => {
        setItems(j.items || []);
        setHasMore(j.hasMore || false);
      })
      .catch(e => console.error(e))
      .finally(() => setLoading(false));
  }, [q, page, open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-x-0 top-10 mx-auto bg-white w-[95%] max-w-4xl rounded-2xl shadow-lg p-4">
        <div className="flex items-center gap-3 mb-3">
          <h3 className="font-semibold text-lg">Libreria Media (WordPress)</h3>
          <input
            value={q}
            onChange={(e)=>{ setPage(1); setQ(e.target.value); }}
            placeholder="Cerca immagini…"
            className="ml-auto border rounded px-3 py-2 w-64"
          />
          <button className="px-3 py-2 border rounded" onClick={onClose}>Chiudi</button>
        </div>
        <div className="min-h-[280px]">
          {loading ? (
            <p className="text-sm text-gray-500">Caricamento…</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-500">Nessun risultato</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {items.map(m => (
                <button
                  key={m.id}
                  onClick={() => onSelect({ url: m.source_url, alt: m.alt_text || "", id: m.id })}
                  className="group rounded border overflow-hidden hover:shadow"
                  title={m.alt_text || ""}
                >
                  <img src={m.source_url} alt={m.alt_text || ""} className="w-full h-32 object-cover" />
                  <div className="p-2 text-xs text-gray-600 truncate group-hover:text-black">
                    #{m.id} {m.alt_text || ""}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="mt-4 flex justify-between">
          <button disabled={page<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="px-3 py-2 border rounded disabled:opacity-50">← Precedente</button>
          <button disabled={!hasMore} onClick={()=>setPage(p=>p+1)} className="px-3 py-2 border rounded disabled:opacity-50">Successiva →</button>
        </div>
      </div>
    </div>
  );
}