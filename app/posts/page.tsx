"use client";
import { useEffect, useState } from "react";
import NavBar from "@/components/NavBar";

type WPItem = {
  id: number;
  date: string;
  modified: string;
  status: string;
  link: string;
  title?: { rendered?: string };
};

export default function PostsPage() {
  const [items, setItems] = useState<WPItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"any" | "publish" | "draft">("any");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const perPage = 20;

  async function load() {
    try {
      setLoading(true);
      setErr(null);
      const params = new URLSearchParams({
        page: String(page),
        per_page: String(perPage),
        ...(q ? { search: q } : {}),
        ...(status ? { status } : {}),
      });
      const res = await fetch(`/api/wp/posts?${params.toString()}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setErr(json?.error || `Errore ${res.status}`);
        setItems([]); setTotalPages(1);
        return;
      }
      setItems(json.items || []);
      setTotalPages(json.totalPages || 1);
    } catch (e: any) {
      setErr(e.message || String(e));
      setItems([]); setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [page, status]);

  return (
    <div>
      <NavBar />
      <div className="max-w-6xl mx-auto p-6 grid gap-4 bg-white rounded-2xl">
        <h1 className="text-2xl font-semibold">Articoli</h1>

        <div className="flex flex-wrap gap-2 items-center">
          <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder="Cerca titolo…" className="border p-2 rounded flex-1 min-w-[240px]" />
          <select value={status} onChange={(e)=>setStatus(e.target.value as any)} className="border p-2 rounded">
            <option value="any">Tutti</option>
            <option value="publish">Pubblicati</option>
            <option value="draft">Bozze</option>
          </select>
          <button onClick={()=>{ setPage(1); load(); }} className="px-3 py-2 border rounded">Cerca</button>
        </div>

        {loading && <p className="text-gray-500">Caricamento…</p>}
        {err && <pre className="text-red-600 whitespace-pre-wrap">{err}</pre>}

        {!loading && !err && (
          <>
            <div className="overflow-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="text-left border-b">
                    <th className="py-2 pr-3">ID</th>
                    <th className="py-2 pr-3">Titolo</th>
                    <th className="py-2 pr-3">Stato</th>
                    <th className="py-2 pr-3">Data</th>
                    <th className="py-2 pr-3">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(p => (
                    <tr key={p.id} className="border-b">
                      <td className="py-2 pr-3">{p.id}</td>
                      <td className="py-2 pr-3" dangerouslySetInnerHTML={{__html: p.title?.rendered || "(senza titolo)"}} />
                      <td className="py-2 pr-3 uppercase">{p.status}</td>
                      <td className="py-2 pr-3">{new Date(p.date).toLocaleString()}</td>
                      <td className="py-2 pr-3">
                        <a className="underline mr-3" href={p.link} target="_blank">Apri</a>
                        <a className="underline" href={`${process.env.NEXT_PUBLIC_WORDPRESS_BASE_URL || ""}/wp-admin/post.php?post=${p.id}&action=edit`} target="_blank">Modifica in WP</a>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr><td className="py-6 text-gray-500" colSpan={5}>Nessun articolo trovato.</td></tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex gap-2 justify-end">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-2 border rounded disabled:opacity-50">Indietro</button>
              <span className="px-2 py-2 text-sm">Pagina {page} / {totalPages}</span>
              <button disabled={page>=totalPages} onClick={()=>setPage(p=>p+1)} className="px-3 py-2 border rounded disabled:opacity-50">Avanti</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}