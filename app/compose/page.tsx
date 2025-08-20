"use client";

import React, { useEffect, useMemo, useState } from "react";
import TinyEditor from "@/components/TinyEditor";
import SeoAssistant from "@/components/SeoAssistant";
import SerpPreview from "@/components/SerpPreview";
import AiGenerateModal from "@/components/AiGenerateModal";

type WpTaxItem = { id: number; name: string; slug: string };

type FormState = {
  title: string;
  excerpt: string; // meta-description
  contentHtml: string;
  categories: number[];
  tags: string[]; // tag liberi (testo)
  focusKw: string;

  // Immagine in evidenza
  featuredMediaId?: number;
  featuredMediaUrl?: string;

  // SEO avanzato (Yoast)
  seoTitle?: string;
  canonical?: string;
  primaryCategoryId?: number;
  noindex?: boolean;
  nofollow?: boolean;
  isCornerstone?: boolean;
};

const emptyForm: FormState = {
  title: "",
  excerpt: "",
  contentHtml: "",
  categories: [],
  tags: [],
  focusKw: "",
  featuredMediaId: undefined,
  featuredMediaUrl: undefined,
  seoTitle: "",
  canonical: "",
  primaryCategoryId: undefined,
  noindex: false,
  nofollow: false,
  isCornerstone: false,
};

const WP_URL = (process.env.NEXT_PUBLIC_WP_URL || "").replace(/\/$/, "");

function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 90);
}

function openWpMediaPicker() {
  if (!WP_URL) {
    alert("Config mancante: NEXT_PUBLIC_WP_URL");
    return;
  }
  const origin = window.location.origin;
  const pickerUrl = `${WP_URL}/wp-admin/admin.php?page=alburninet-media-picker&origin=${encodeURIComponent(
    origin
  )}`;
  const w = 980;
  const h = 800;
  const left = window.screenX + (window.outerWidth - w) / 2;
  const top = window.screenY + (window.outerHeight - h) / 2;
  window.open(
    pickerUrl,
    "alburninetMediaPicker",
    `width=${w},height=${h},left=${left},top=${top},resizable=yes,scrollbars=yes`
  );
}

function MediaPickerBridge({
  onPicked,
}: {
  onPicked: (att: { id: number; url: string; alt?: string }) => void;
}) {
  React.useEffect(() => {
    function handler(ev: MessageEvent) {
      const data = ev.data;
      if (!data || data.type !== "ALBURNINET_MEDIA_PICKED") return;
      try {
        const a = data.attachment || {};
        if (a.id && a.url) onPicked({ id: a.id, url: a.url, alt: a.alt });
      } catch {}
    }
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [onPicked]);

  return null;
}

export default function ComposePage() {
  const [form, setForm] = useState<FormState>(emptyForm);
  const [cats, setCats] = useState<WpTaxItem[]>([]);
  const [loading, setLoading] = useState(false);

  const [tagQuery, setTagQuery] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<WpTaxItem[]>([]);
  const [showTagSug, setShowTagSug] = useState(false);

  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const c = await fetch("/api/wp/categories").then((r) => r.json());
        setCats(Array.isArray(c) ? c : []);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const q = tagQuery.trim();
    if (!q) {
      setTagSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(
          `/api/wp/taxonomy?type=tags&q=${encodeURIComponent(q)}&per_page=10`,
          { signal: ctrl.signal }
        );
        const items = await res.json();
        if (Array.isArray(items)) setTagSuggestions(items);
      } catch {}
    })();
    return () => ctrl.abort();
  }, [tagQuery]);

  const canPublish = useMemo(
    () =>
      form.title.trim().length > 0 &&
      form.excerpt.trim().length > 0 &&
      form.contentHtml.trim().length > 0,
    [form]
  );

  function toggleCategory(id: number) {
    setForm((s) =>
      s.categories.includes(id)
        ? { ...s, categories: s.categories.filter((x) => x !== id) }
        : { ...s, categories: [...s.categories, id] }
    );
  }

  async function handleUploadFeatured(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/wp/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err?.error || "Upload immagine fallito");
      return;
    }
    const j = await res.json();
    const url =
      j?.source_url || j?.guid?.rendered || j?.url || j?.data?.source_url;
    setForm((s) => ({
      ...s,
      featuredMediaId: j?.id,
      featuredMediaUrl: url,
    }));
  }

  async function resolveTagIds(tagNames: string[]): Promise<number[]> {
    const names = [...new Set(tagNames.map((t) => t.trim()).filter(Boolean))];
    const ids: number[] = [];
    for (const name of names) {
      try {
        const search = await fetch(
          `/api/wp/taxonomy?type=tags&q=${encodeURIComponent(name)}&per_page=1`
        ).then((r) => r.json());
        const foundId = Array.isArray(search) && search[0]?.id ? search[0].id : null;
        if (foundId) {
          ids.push(Number(foundId));
          continue;
        }
        const created = await fetch(`/api/wp/taxonomy`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "tags", name }),
        }).then((r) => r.json());
        if (created?.id) ids.push(Number(created.id));
      } catch {}
    }
    return ids;
  }

  function handlePreview() {
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        contentHtml: form.contentHtml,
        featuredMediaUrl: form.featuredMediaUrl,
        categories: form.categories
          .map((id) => cats.find((c) => c.id === id))
          .filter(Boolean)
          .map((c) => ({ id: (c as any).id, name: (c as any).name })),
        seoTitle: form.seoTitle,
        canonical: form.canonical,
        focusKw: form.focusKw,
        tags: form.tags,
      };
      localStorage.setItem("alburninet_preview", JSON.stringify(payload));
      window.open("/preview", "_blank");
    } catch {
      alert("Impossibile aprire l’anteprima.");
    }
  }

  async function submitToWP(status: "draft" | "publish") {
    setLoading(true);
    try {
      const tagIds = await resolveTagIds(form.tags);

      const res = await fetch("/api/wp/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status,
          title: form.title,
          excerpt: form.excerpt,
          content: form.contentHtml,
          categories: form.categories,
          tags: tagIds,
          featured_media: form.featuredMediaId,
          // Yoast
          seoTitle: form.seoTitle || form.title,
          metaDesc: form.excerpt,
          focusKw: form.focusKw,
          canonical: form.canonical,
          primaryCategoryId: form.primaryCategoryId,
          noindex: !!form.noindex,
          nofollow: !!form.nofollow,
          isCornerstone: !!form.isCornerstone,
        }),
      });

      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        data = null;
      }

      if (!res.ok) {
        const msg =
          (data && (data.error || data.message)) ||
          raw ||
          `HTTP ${res.status} ${res.statusText}`;
        alert(`Salvataggio fallito: ${msg}`);
        return;
      }

      setForm(emptyForm);
      const go = window.confirm(
        status === "publish"
          ? "Articolo pubblicato! Vuoi vedere gli articoli?"
          : "Bozza salvata! Vuoi vedere le bozze?"
      );
      if (go) window.location.href = "/posts";
    } catch (err: any) {
      alert(`Errore di rete: ${err?.message || err}`);
    } finally {
      setLoading(false);
    }
  }

  function onClear() {
    if (confirm("Sicuro di ripulire il form?")) setForm(emptyForm);
  }

  function addTag(name: string) {
    const t = name.trim();
    if (!t) return;
    setForm((s) => (s.tags.includes(t) ? s : { ...s, tags: [...s.tags, t] }));
    setTagQuery("");
    setShowTagSug(false);
  }
  function removeTag(name: string) {
    setForm((s) => ({ ...s, tags: s.tags.filter((t) => t !== name) }));
  }

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* COLONNA SINISTRA */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-xl shadow p-4">
            <label className="block text-sm font-medium mb-1">Titolo (H1)</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((s) => ({ ...s, title: e.target.value }))}
              placeholder="Titolo dell'articolo"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <label className="block text-sm font-medium mb-1">
              Estratto / Meta description
            </label>
            <textarea
              value={form.excerpt}
              onChange={(e) => setForm((s) => ({ ...s, excerpt: e.target.value }))}
              rows={3}
              placeholder="Breve riassunto (80–160 caratteri consigliati)…"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          <div className="bg-white rounded-xl shadow p-4">
            <label className="block text-sm font-medium mb-2">Contenuto</label>
            <TinyEditor
              value={form.contentHtml}
              onChange={(html) => setForm((s) => ({ ...s, contentHtml: html }))}
              height={900}
              placeholder="Scrivi qui il contenuto…"
            />
          </div>

          {/* TAG + KEYPHRASE */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="mb-4">
              <div className="text-sm font-medium mb-2">Tag</div>
              <div className="relative">
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-2 px-2 py-1 rounded-full text-sm border bg-gray-50"
                    >
                      {t}
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700"
                        onClick={() => removeTag(t)}
                        aria-label={`Rimuovi tag ${t}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <input
                  type="text"
                  value={tagQuery}
                  onChange={(e) => {
                    setTagQuery(e.target.value);
                    setShowTagSug(true);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag(tagQuery);
                    }
                  }}
                  placeholder="Aggiungi tag e premi Invio…"
                  className="w-full border rounded-lg px-3 py-2"
                />
                {showTagSug && tagSuggestions.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow">
                    {tagSuggestions.map((s) => (
                      <button
                        type="button"
                        key={s.id}
                        className="block w-full text-left px-3 py-2 hover:bg-gray-50"
                        onClick={() => addTag(s.name)}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Suggerimento: 4–8 tag pertinenti aiutano l’organizzazione e la SEO.
              </p>
            </div>

            <div className="border-t pt-4">
              <label className="block text-sm font-medium mb-1">
                Focus keyphrase (Yoast)
              </label>
              <input
                type="text"
                value={form.focusKw}
                onChange={(e) => setForm((s) => ({ ...s, focusKw: e.target.value }))}
                placeholder="Parola/frase chiave principale…"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
          </div>
        </div>

        {/* SIDEBAR DESTRA */}
        <div className="space-y-6">
          {/* Pulsanti */}
          <div className="bg-white rounded-xl shadow p-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              onClick={() => setAiOpen(true)}
            >
              Genera con AI
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              onClick={handlePreview}
            >
              Anteprima
            </button>
            <button
              type="button"
              disabled={loading}
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 disabled:opacity-60"
              onClick={() => submitToWP("draft")}
            >
              Salva bozza
            </button>
            <button
              type="button"
              disabled={!canPublish || loading}
              className="px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-60"
              onClick={() => submitToWP("publish")}
            >
              Pubblica
            </button>
            <button
              type="button"
              className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              onClick={onClear}
            >
              Pulisci
            </button>
          </div>

          {/* Immagine in evidenza */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm font-medium mb-2">Immagine in evidenza</div>

            <MediaPickerBridge
              onPicked={(att) =>
                setForm((s) => ({
                  ...s,
                  featuredMediaId: att.id,
                  featuredMediaUrl: att.url,
                }))
              }
            />

            <div className="flex flex-col gap-3">
              {form.featuredMediaUrl ? (
                <div className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.featuredMediaUrl}
                    alt="Immagine in evidenza"
                    className="w-full rounded-lg border object-cover max-h-60"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setForm((s) => ({
                          ...s,
                          featuredMediaId: undefined,
                          featuredMediaUrl: undefined,
                        }))
                      }
                      className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                    >
                      Rimuovi immagine
                    </button>
                    <button
                      type="button"
                      onClick={() => openWpMediaPicker()}
                      className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                    >
                      Cambia dalla Libreria Media
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-full h-32 border rounded-lg flex items-center justify-center text-sm text-gray-500 bg-gray-50">
                    Nessuna immagine
                  </div>
                  <div className="flex gap-2">
                    <label className="inline-flex items-center px-3 py-2 border rounded-lg cursor-pointer bg-white hover:bg-gray-50 text-sm">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleUploadFeatured(f);
                        }}
                      />
                      Carica immagine
                    </label>
                    <button
                      type="button"
                      onClick={() => openWpMediaPicker()}
                      className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                    >
                      Seleziona dalla Libreria Media
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Categorie */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm font-medium mb-2">Categorie</div>
            <div className="flex flex-wrap gap-2">
              {cats.map((c) => {
                const active = form.categories.includes(c.id);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => toggleCategory(c.id)}
                    className={`px-2 py-1 rounded-full border text-sm ${
                      active
                        ? "bg-blue-600 border-blue-600 text-white"
                        : "bg-white hover:bg-gray-50"
                    }`}
                    title={c.slug}
                  >
                    {c.name}
                  </button>
                );
              })}
              {cats.length === 0 && (
                <div className="text-sm text-gray-500">Nessuna categoria disponibile.</div>
              )}
            </div>
          </div>

          {/* Assistente SEO */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm font-medium mb-3">Assistente SEO</div>
            <SeoAssistant
              title={form.title}
              slug={slugify(form.title || "")}
              contentHtml={form.contentHtml}
              seoTitle={form.title}
              seoDescription={form.excerpt}
              focusKw={form.focusKw}
            />
            <div className="mt-4">
              <SerpPreview
                title={form.seoTitle || form.title || "Titolo dell'articolo"}
                description={form.excerpt || "Anteprima della meta description…"}
                url="https://alburninet.it/articolo-di-prova"
              />
            </div>
          </div>

          {/* SEO avanzato */}
          <div className="bg-white rounded-xl shadow p-4">
            <div className="text-sm font-medium mb-3">SEO avanzato</div>

            <label className="block text-sm mb-1">Titolo SEO (opzionale)</label>
            <input
              type="text"
              value={form.seoTitle || ""}
              onChange={(e) => setForm((s) => ({ ...s, seoTitle: e.target.value }))}
              placeholder="Se vuoto usa il Titolo"
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />

            <label className="block text-sm mb-1">Canonical URL</label>
            <input
              type="url"
              value={form.canonical || ""}
              onChange={(e) => setForm((s) => ({ ...s, canonical: e.target.value }))}
              placeholder="https://esempio.it/articolo"
              className="w-full border rounded-lg px-3 py-2 mb-3"
            />

            <label className="block text-sm mb-1">Categoria primaria</label>
            <select
              value={form.primaryCategoryId ?? ""}
              onChange={(e) =>
                setForm((s) => ({
                  ...s,
                  primaryCategoryId: e.target.value ? Number(e.target.value) : undefined,
                }))
              }
              className="w-full border rounded-lg px-3 py-2 mb-3"
            >
              <option value="">(nessuna: lascia a Yoast)</option>
              {form.categories.map((cid) => {
                const c = cats.find((x) => x.id === cid);
                if (!c) return null;
                return (
                  <option key={cid} value={cid}>
                    {c.name}
                  </option>
                );
              })}
            </select>

            <div className="flex items-center gap-4">
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.noindex}
                  onChange={(e) => setForm((s) => ({ ...s, noindex: e.target.checked }))}
                />
                Noindex
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.nofollow}
                  onChange={(e) => setForm((s) => ({ ...s, nofollow: e.target.checked }))}
                />
                Nofollow
              </label>
              <label className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!form.isCornerstone}
                  onChange={(e) => setForm((s) => ({ ...s, isCornerstone: e.target.checked }))}
                />
                Cornerstone
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL AI */}
      <AiGenerateModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        onApply={(data) => {
          setForm((s) => ({
            ...s,
            title: data.title || s.title,
            seoTitle: data.seoTitle || data.title || s.seoTitle,
            excerpt: data.excerpt || s.excerpt,
            focusKw: data.focusKw || s.focusKw,
            contentHtml: data.contentHtml || s.contentHtml,
            tags:
              data.tags?.length
                ? Array.from(new Set([...(s.tags || []), ...data.tags]))
                : s.tags,
          }));
        }}
      />
    </div>
  );
}