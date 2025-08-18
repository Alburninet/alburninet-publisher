"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type TagItem = { id?: number; name: string };

export default function TagsPanel({
  value,
  onChange,
}: {
  value: TagItem[];
  onChange: (tags: TagItem[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [popular, setPopular] = useState<TagItem[]>([]);
  const [suggestions, setSuggestions] = useState<TagItem[]>([]);
  const boxRef = useRef<HTMLDivElement | null>(null);

  // popolari (prime 20)
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/wp/taxonomy?type=tags&q=&per_page=20`, { cache: "no-store" });
        const j = await r.json();
        if (Array.isArray(j)) setPopular(j.map((t: any) => ({ id: t.id, name: t.name })));
      } catch {}
    })();
  }, []);

  // suggerimenti ricerca
  useEffect(() => {
    let active = true;
    (async () => {
      if (!query.trim()) { setSuggestions([]); return; }
      const r = await fetch(`/api/wp/taxonomy?type=tags&q=${encodeURIComponent(query)}&per_page=10`, { cache: "no-store" });
      const j = await r.json();
      if (Array.isArray(j) && active) setSuggestions(j.map((t: any) => ({ id: t.id, name: t.name })));
    })();
    return () => { active = false; };
  }, [query]);

  const names = useMemo(() => value.map(t => t.name.toLowerCase()), [value]);
  const has = (name: string) => names.includes(name.toLowerCase());

  function add(t: TagItem) {
    if (!t.name.trim() || has(t.name)) return;
    onChange([...value, t]);
    setQuery("");
  }
  function remove(i: number) {
    const next = [...value]; next.splice(i, 1); onChange(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      add({ name: query.trim() }); // crea nuovo se non esiste
    }
  }

  const showCreate = query.trim() &&
    !suggestions.some(s => s.name.toLowerCase() === query.trim().toLowerCase()) &&
    !has(query);

  return (
    <section ref={boxRef} className="bg-white rounded-2xl border p-5 grid gap-4">
      <header className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Tag</h3>
        <span className="text-sm text-gray-500">{value.length} selezionati</span>
      </header>

      {/* Chip selezionati */}
      <div className="flex flex-wrap gap-2">
        {value.map((t, i) => (
          <span key={`${t.id || "new"}-${i}`} className="px-2 py-1 rounded-full bg-gray-100 border text-sm flex items-center gap-1">
            {t.name}
            <button type="button" className="text-gray-500 hover:text-black" onClick={() => remove(i)}>×</button>
          </span>
        ))}
        {value.length === 0 && <span className="text-sm text-gray-500">Nessun tag selezionato</span>}
      </div>

      {/* Ricerca + suggerimenti */}
      <div className="grid gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder="Cerca o crea un tag e premi Invio…"
          className="border rounded p-2"
        />
        {(suggestions.length > 0 || showCreate) && (
          <div className="border rounded bg-white shadow max-h-60 overflow-auto">
            {suggestions.map((s) => (
              <button key={s.id} type="button" onClick={() => add(s)} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                {s.name}
              </button>
            ))}
            {showCreate && (
              <button type="button" onClick={() => add({ name: query.trim() })} className="w-full text-left px-3 py-2 hover:bg-gray-50">
                + Crea nuovo tag: <strong>{query.trim()}</strong>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tag popolari */}
      {popular.length > 0 && (
        <div className="grid gap-2">
          <p className="text-sm text-gray-600">Tag popolari</p>
          <div className="flex flex-wrap gap-2">
            {popular.map((p) => (
              <button key={p.id} type="button" onClick={() => add(p)} className="px-2 py-1 rounded-full border text-sm bg-gray-50 hover:bg-gray-100">
                {p.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}