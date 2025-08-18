"use client";
import { useEffect, useMemo, useRef, useState } from "react";

export type TagItem = { id?: number; name: string };

export default function TagsInput({
  value,
  onChange,
}: {
  value: TagItem[];
  onChange: (tags: TagItem[]) => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<TagItem[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handler = (ev: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(ev.target as any)) setOpen(false);
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!query.trim()) { setSuggestions([]); return; }
      const res = await fetch(`/api/wp/taxonomy?type=tags&q=${encodeURIComponent(query)}&per_page=10`, { cache: "no-store" });
      const json = await res.json();
      if (Array.isArray(json) && active) {
        setSuggestions(json.map((t: any) => ({ id: t.id, name: t.name })));
        setOpen(true);
      }
    })();
    return () => { active = false; };
  }, [query]);

  const names = useMemo(() => value.map(t => t.name.toLowerCase()), [value]);
  const alreadyHas = (name: string) => names.includes(name.toLowerCase());

  function addTag(tag: TagItem) {
    if (!tag.name.trim() || alreadyHas(tag.name)) return;
    onChange([...value, tag]);
    setQuery("");
    setOpen(false);
  }

  function removeTag(index: number) {
    const next = [...value];
    next.splice(index, 1);
    onChange(next);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && query.trim()) {
      e.preventDefault();
      addTag({ name: query.trim() }); // new tag (senza id)
    }
    if (e.key === "Backspace" && !query && value.length) {
      // backspace rimuove l’ultimo chip
      removeTag(value.length - 1);
    }
  }

  const showCreate = query.trim() && !suggestions.some(s => s.name.toLowerCase() === query.trim().toLowerCase()) && !alreadyHas(query);

  return (
    <div className="grid gap-2" ref={boxRef}>
      <label className="font-medium">Tag</label>

      <div className="flex flex-wrap items-center gap-2 border rounded p-2">
        {value.map((t, i) => (
          <span key={`${t.id || "new"}-${i}`} className="px-2 py-1 rounded-full bg-gray-100 border text-sm flex items-center gap-1">
            {t.name}
            <button type="button" className="text-gray-500 hover:text-black" onClick={() => removeTag(i)}>×</button>
          </span>
        ))}
        <input
          className="flex-1 min-w-[140px] outline-none"
          placeholder="Aggiungi tag…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          onFocus={() => query && setOpen(true)}
        />
      </div>

      {open && (suggestions.length > 0 || showCreate) && (
        <div className="border rounded bg-white shadow max-h-60 overflow-auto">
          {suggestions.map(s => (
            <button
              key={s.id}
              type="button"
              onClick={() => addTag(s)}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
            >
              {s.name}
            </button>
          ))}
          {showCreate && (
            <button
              type="button"
              onClick={() => addTag({ name: query.trim() })}
              className="w-full text-left px-3 py-2 hover:bg-gray-50"
            >
              + Crea nuovo tag: <strong>{query.trim()}</strong>
            </button>
          )}
        </div>
      )}
    </div>
  );
}