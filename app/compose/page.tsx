// app/compose/page.tsx
"use client";

import { useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import SeoAssistant from "@/components/SeoAssistant";
import SerpPreview from "@/components/SerpPreview";
import NavBar from "@/components/NavBar";
import { slugify, suggestMetaDescription, firstParagraph } from "@/lib/seo";

type WPCategory = { id: number; name: string };

export default function ComposePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Stato form (controllato per SEO live)
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [excerpt, setExcerpt] = useState("");
  const [contentMd, setContentMd] = useState("");
  const [seoTitle, setSeoTitle] = useState("");
  const [seoDesc, setSeoDesc] = useState("");
  const [seoFocus, setSeoFocus] = useState("");

  // Categorie da WP
  const [categories, setCategories] = useState<WPCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);

  // Esiti e preview SERP
  const [result, setResult] = useState<any>(null);
  const [serp, setSerp] = useState<{ url?: string; title?: string; description?: string } | null>(null);

  // Loading state
  const [loading, setLoading] = useState<"idle" | "draft" | "publish">("idle");

  // Popup dopo azione
  const [showAfterActionModal, setShowAfterActionModal] = useState<null | "draft" | "publish">(null);

  // Carica categorie da WordPress (API interne)
  useEffect(() => {
    async function fetchCategories() {
      try {
        const res = await fetch("/api/wp/taxonomy?type=categories&q=&per_page=100", { cache: "no-store" });
        const json = await res.json();
        if (Array.isArray(json)) setCategories(json);
      } catch (err) {
        console.error("Errore caricamento categorie:", err);
      }
    }
    fetchCategories();
  }, []);

  // Toggle categoria
  function toggleCategory(id: number) {
    setSelectedCategories(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]));
  }

  // Reset completo
  function resetAll() {
    formRef.current?.reset();
    setTitle(""); setSlug(""); setExcerpt(""); setContentMd("");
    setSeoTitle(""); setSeoDesc(""); setSeoFocus("");
    setSelectedCategories([]);
    setResult(null);
    setSerp(null);
  }

  // Helpers UX
  function handleGenerateSlug() {
    if (!title.trim()) return;
    setSlug(slugify(title));
  }
  function handleSuggestDescription() {
    setSeoDesc(suggestMetaDescription(contentMd));
  }
  function suggestH2(): string[] {
    const kw = (seoFocus || title).trim();
    if (!kw) return [];
    const _ = firstParagraph(contentMd) || title;
    return [
      `Cos'è ${kw}`,
      `${kw}: date, luoghi e dettagli`,
      `Come partecipare a ${kw}`,
      `${kw}: curiosità e consigli pratici`,
    ];
  }

  // Anteprima locale (facoltativa)
  function handlePreview() {
    setResult({ preview: true });
  }

  // Pubblica / Salva bozza (con reset + popup)
  async function handlePublish(mode: "draft" | "publish") {
    try {
      setLoading(mode);

      const fd = new FormData(formRef.current || undefined);
      // campi controllati
      fd.set("title", title);
      slug ? fd.set("slug", slug) : fd.delete("slug");
      excerpt ? fd.set("excerpt", excerpt) : fd.delete("excerpt");
      fd.set("content", contentMd);
      fd.set("seo_title", seoTitle);
      fd.set("seo_description", seoDesc);
      fd.set("seo_focuskw", seoFocus);
      fd.set("categories", selectedCategories.join(","));
      fd.set("status", mode);

      // Upload featured (field "featured")
      const featured = fd.get("featured");
      if (featured instanceof File && featured.size > 0) {
        const up = new FormData();
        up.append("file", featured);
        const mediaRes = await fetch("/api/wp/upload", { method: "POST", body: up });
        const mediaJson = await mediaRes.json();
        if (mediaJson?.id) {
          fd.delete("featured");
          fd.append("featured_media", String(mediaJson.id));
        }
      }

      // Chiamata publish
      const res = await fetch("/api/wp/publish", { method: "POST", body: fd });
      const json = await res.json();
      setResult(json);

      // SERP preview (solo se ok e abbiamo id)
      if (json?.ok && json?.post?.id) {
        try {
          const r = await fetch(`/api/wp/serp?id=${json.post.id}`, { cache: "no-store" });
          if (r.ok) {
            const p = await r.json();
            const h = p?.yoast_head_json || {};
            setSerp({ url: p?.link, title: h?.title, description: h?.description });
          }
        } catch (e) {
          console.warn("SERP preview non disponibile:", e);
        }
      }

      // Reset sempre + popup
      if (json?.ok) {
        resetAll();
        setShowAfterActionModal(mode);
        setResult(json);
      }
    } finally {
      setLoading("idle");
    }
  }

  return (
    <div>
      {/* Navbar superiore */}
      <NavBar />

      {/* Contenuto pagina */}
      <div className="grid gap-6 p-6 max-w-6xl mx-auto">
        <form
          ref={formRef}
          onSubmit={(e) => { e.preventDefault(); handlePreview(); }}
          className="grid gap-4 bg-white p-6 rounded-2xl shadow-sm"
        >
          <h1 className="text-2xl font-semibold">Nuovo Articolo</h1>

          {/* Titolo / Slug / Estratto / Contenuto */}
          <input
            name="title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Titolo"
            required
            className="border p-2 rounded"
          />

          <div className="flex gap-2">
            <input
              name="slug"
              value={slug}
              onChange={e => setSlug(e.target.value)}
              placeholder="Slug (opzionale)"
              className="border p-2 rounded flex-1"
            />
            <button type="button" onClick={handleGenerateSlug} className="px-3 py-2 border rounded">
              Genera slug
            </button>
          </div>

          <textarea
            name="excerpt"
            value={excerpt}
            onChange={e => setExcerpt(e.target.value)}
            placeholder="Estratto"
            className="border p-2 rounded"
            rows={3}
          />

          <textarea
            name="content"
            value={contentMd}
            onChange={e => setContentMd(e.target.value)}
            placeholder="Contenuto (Markdown)"
            className="border p-3 rounded h-64 font-mono"
          />

          {/* Suggerimenti H2 rapidi */}
          <div className="flex flex-wrap gap-2 text-sm">
            {suggestH2().map((h, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setContentMd(prev => `${prev}\n\n## ${h}\n`)}
                className="px-3 py-1 border rounded"
                title="Inserisci come H2"
              >
                + {h}
              </button>
            ))}
          </div>

          {/* Categorie da WP come pulsanti */}
          <div>
            <p className="font-medium mb-2">Categorie</p>
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && <p className="text-gray-500 text-sm">Caricamento categorie…</p>}
              {categories.map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1 rounded-full border text-sm ${
                    selectedCategories.includes(cat.id) ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Tag semplice per ora */}
          <input name="tags" placeholder="Tag (ID separati da virgola)" className="border p-2 rounded" />

          {/* SEO fields + utility */}
          <div className="grid md:grid-cols-3 gap-4">
            <input
              name="seo_title"
              value={seoTitle}
              onChange={e => setSeoTitle(e.target.value)}
              placeholder="SEO Title (35–60)"
              className="border p-2 rounded"
            />
            <div className="flex gap-2">
              <input
                name="seo_description"
                value={seoDesc}
                onChange={e => setSeoDesc(e.target.value)}
                placeholder="Meta Description (80–160)"
                className="border p-2 rounded flex-1"
              />
              <button type="button" onClick={handleSuggestDescription} className="px-3 py-2 border rounded whitespace-nowrap">
                Suggerisci
              </button>
            </div>
            <input
              name="seo_focuskw"
              value={seoFocus}
              onChange={e => setSeoFocus(e.target.value)}
              placeholder="Focus Keyphrase (es: 'Sagra Alburni')"
              className="border p-2 rounded"
            />
          </div>
          <p className="text-xs text-gray-500">
            SEO Title: {(seoTitle || title).length}/60 · Meta Description: {(seoDesc || "").length}/160
          </p>

          {/* Featured + Azioni */}
          <div className="grid md:grid-cols-2 gap-4">
            <input type="file" name="featured" accept="image/*" className="border p-2 rounded" />
            <div className="flex flex-wrap gap-3">
              <button type="submit" className="px-4 py-2 border rounded">Anteprima</button>

              <button
                type="button"
                disabled={loading !== "idle"}
                onClick={() => handlePublish("draft")}
                className="px-4 py-2 border rounded disabled:opacity-60"
                title="Salva come bozza in WordPress"
              >
                {loading === "draft" ? "Salvataggio…" : "Salva bozza"}
              </button>

              <button
                type="button"
                disabled={loading !== "idle"}
                onClick={() => handlePublish("publish")}
                className="px-4 py-2 bg-black text-white rounded disabled:opacity-60"
                title="Pubblica subito in WordPress"
              >
                {loading === "publish" ? "Pubblicazione…" : "Pubblica"}
              </button>

              <button
                type="button"
                onClick={resetAll}
                className="px-4 py-2 border rounded"
                title="Pulisci tutti i campi"
              >
                Pulisci
              </button>
            </div>
          </div>
        </form>

        {/* Assistente SEO */}
        <SeoAssistant
          title={title}
          slug={slug}
          contentMd={contentMd}
          seoTitle={seoTitle}
          seoDescription={seoDesc}
          focusKw={seoFocus}
        />

        {/* Esito + SERP */}
        {result && (
          <div className="border rounded p-4 bg-white grid gap-3">
            <h3 className="font-semibold">Esito</h3>
            {result.ok ? (
              <p>
                Operazione completata! ID: {result.post?.id} —{" "}
                <a className="underline" href={result.post?.link} target="_blank">apri</a>
              </p>
            ) : result.preview ? (
              <p className="text-gray-600">Anteprima aggiornata.</p>
            ) : (
              <pre className="text-red-600 whitespace-pre-wrap">{String(result.error)}</pre>
            )}

            {serp && (
              <div className="grid gap-2">
                <h4 className="font-semibold">Anteprima SERP</h4>
                <SerpPreview url={serp.url} title={serp.title} description={serp.description} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* MODAL dopo azione */}
      {showAfterActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAfterActionModal(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-lg p-6 w-[90%] max-w-md">
            <h4 className="text-lg font-semibold mb-2">
              {showAfterActionModal === "publish" ? "Articolo pubblicato" : "Bozza salvata"}
            </h4>
            <p className="text-sm text-gray-600 mb-4">Cosa vuoi fare adesso?</p>
            <div className="flex gap-2 justify-end">
              <button
                className="px-4 py-2 border rounded"
                onClick={() => setShowAfterActionModal(null)}
                title="Rimani su Nuovo articolo"
              >
                Nuovo articolo
              </button>
              <button
                className="px-4 py-2 bg-black text-white rounded"
                onClick={() => router.push("/posts")}
                title="Vai alla lista articoli"
              >
                Vedi articoli
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}