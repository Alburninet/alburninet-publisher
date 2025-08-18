"use client";
import { useRef, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import NavBar from "@/components/NavBar";
import SeoAssistant from "@/components/SeoAssistant";
import SerpPreview from "@/components/SerpPreview";
import RichTextEditor from "@/components/RichTextEditor";
import TagsPanel, { TagItem } from "@/components/TagsPanel";
import ArticlePreview from "@/components/ArticlePreview";
import { slugify, suggestMetaDescription, firstParagraph } from "@/lib/seo";

type WPCategory = { id: number; name: string };
type Check = { ok: boolean; label: string };

const SEO_MIN_SCORE_PUBLISH = 60;

export default function ComposePage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);

  // Campi unificati
  const [title, setTitle] = useState("");     // = SEO Title
  const [excerpt, setExcerpt] = useState(""); // = Meta Description
  const [contentHtml, setContentHtml] = useState<string>("<p></p>");
  const [slug, setSlug] = useState("");
  const [seoFocus, setSeoFocus] = useState("");

  // Tassonomie
  const [categories, setCategories] = useState<WPCategory[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);

  // UI/SEO
  const [result, setResult] = useState<any>(null);
  const [serp, setSerp] = useState<{ url?: string; title?: string; description?: string } | null>(null);
  const [loading, setLoading] = useState<"idle" | "draft" | "publish">("idle");
  const [showAfterActionModal, setShowAfterActionModal] = useState<null | "draft" | "publish">(null);
  const [seoScore, setSeoScore] = useState(0);
  const [seoChecks, setSeoChecks] = useState<Check[]>([]);
  const [showSeoGate, setShowSeoGate] = useState<null | { mode: "publish" | "draft"; checks: Check[] }>(null);

  // featured image (preview locale)
  const [featuredFile, setFeaturedFile] = useState<File | null>(null);
  const [featuredPreview, setFeaturedPreview] = useState<string | undefined>(undefined);

  useEffect(() => {
    if (!featuredFile) { setFeaturedPreview(undefined); return; }
    const url = URL.createObjectURL(featuredFile);
    setFeaturedPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [featuredFile]);

  // categorie da WP
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/wp/taxonomy?type=categories&q=&per_page=100", { cache: "no-store" });
        const json = await res.json();
        if (Array.isArray(json)) setCategories(json);
      } catch (err) { console.error("Errore categorie:", err); }
    })();
  }, []);

  function toggleCategory(id: number) {
    setSelectedCategories(prev => (prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]));
  }

  function resetAll() {
    formRef.current?.reset();
    setTitle(""); setExcerpt(""); setContentHtml("<p></p>"); setSlug("");
    setSeoFocus(""); setSelectedCategories([]); setTags([]);
    setFeaturedFile(null); setFeaturedPreview(undefined);
    setResult(null); setSerp(null);
    setSeoScore(0); setSeoChecks([]);
  }

  function handleGenerateSlug() { if (title.trim()) setSlug(slugify(title)); }
  function handleSuggestDescription() { setExcerpt(suggestMetaDescription(contentHtml)); }

  function suggestH2(): string[] {
    const kw = (seoFocus || title).trim();
    if (!kw) return [];
    const _ = firstParagraph(contentHtml) || title;
    return [ `Cos'è ${kw}`, `${kw}: date, luoghi e dettagli`, `Come partecipare a ${kw}`, `${kw}: curiosità e consigli pratici` ];
  }

  function handlePreview() { setResult({ preview: true }); }

  // Contatori + colori (UX)
  const seoTitleLen = title.trim().length;
  const seoDescLen  = excerpt.trim().length;
  const titleLenClass = seoTitleLen === 0 ? "text-gray-400" : (seoTitleLen >= 35 && seoTitleLen <= 60 ? "text-green-700" : "text-amber-600");
  const descLenClass  = seoDescLen  === 0 ? "text-gray-400" : (seoDescLen  >= 80 && seoDescLen  <= 160 ? "text-green-700" : "text-amber-600");

  // SERP preview live
  const liveSerp = useMemo(() => ({
    url: "alburninet.it",
    title: title || "Titolo SEO di esempio - Alburni",
    description: excerpt || "Anteprima meta description…",
  }), [title, excerpt]);

  // Upload immagini dentro l'editor
  async function uploadInlineImage(file: File): Promise<string> {
    const up = new FormData();
    up.append("file", file);
    const mediaRes = await fetch("/api/wp/upload", { method: "POST", body: up });
    if (!mediaRes.ok) throw new Error("Upload immagine fallito");
    const mediaJson = await mediaRes.json();
    if (!mediaJson?.source_url) throw new Error("Risposta upload non valida");
    return String(mediaJson.source_url);
  }

  // crea tag mancanti e ritorna solo ID
  async function resolveTagsToIds(items: TagItem[]): Promise<number[]> {
    const ids: number[] = [];
    for (const t of items) {
      if (t.id) { ids.push(t.id); continue; }
      try {
        const r = await fetch("/api/wp/taxonomy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type: "tags", name: t.name }),
        });
        const j = await r.json();
        if (j?.id) ids.push(j.id);
      } catch (e) { console.error("Errore creazione tag:", t.name, e); }
    }
    return ids;
  }

  async function actuallyPublish(mode: "draft" | "publish") {
    const fd = new FormData(formRef.current || undefined);
    fd.set("title", title);
    slug ? fd.set("slug", slug) : fd.delete("slug");
    fd.set("excerpt", excerpt);                 // WP excerpt
    fd.set("seo_title", title);                 // Yoast title
    fd.set("seo_description", excerpt);         // Yoast meta
    fd.set("seo_focuskw", seoFocus);
    fd.set("content", contentHtml);             // HTML dal TipTap
    fd.set("categories", selectedCategories.join(","));
    fd.set("status", mode);

    const tagIds = await resolveTagsToIds(tags);
    if (tagIds.length) fd.set("tags", tagIds.join(","));

    // immagine in evidenza
    if (featuredFile) {
      const up = new FormData(); up.append("file", featuredFile);
      const mediaRes = await fetch("/api/wp/upload", { method: "POST", body: up });
      const mediaJson = await mediaRes.json();
      if (mediaJson?.id) fd.append("featured_media", String(mediaJson.id));
    }

    const res = await fetch("/api/wp/publish", { method: "POST", body: fd });
    const json = await res.json();
    setResult(json);

    if (json?.ok && json?.post?.id) {
      try {
        const r = await fetch(`/api/wp/serp?id=${json.post.id}`, { cache: "no-store" });
        if (r.ok) {
          const p = await r.json();
          const h = p?.yoast_head_json || {};
          setSerp({ url: p?.link, title: h?.title, description: h?.description });
        }
      } catch {}
    }

    if (json?.ok) { resetAll(); setShowAfterActionModal(mode); setResult(json); }
  }

  async function handlePublish(mode: "draft" | "publish") {
    try {
      setLoading(mode);
      if (mode === "publish" && seoScore < SEO_MIN_SCORE_PUBLISH) {
        setShowSeoGate({ mode, checks: seoChecks });
        return;
      }
      await actuallyPublish(mode);
    } finally {
      setLoading("idle");
    }
  }

  return (
    <div>
      <NavBar />
      <div className="grid lg:grid-cols-[1fr_420px] gap-6 p-6 max-w-7xl mx-auto">
        {/* COLONNA SINISTRA: form + editor + tag */}
        <form
          ref={formRef}
          onSubmit={(e)=>{ e.preventDefault(); handlePreview(); }}
          className="grid gap-4 bg-white p-6 rounded-2xl shadow-sm"
        >
          <h1 className="text-2xl font-semibold">Nuovo Articolo</h1>

          {/* Titolo */}
          <div className="grid gap-1">
            <label className="font-medium">Titolo</label>
            <input
              name="title"
              value={title}
              onChange={(e)=>setTitle(e.target.value)}
              placeholder="Titolo (consigliati 35–60 caratteri)"
              required
              className="border p-2 rounded"
            />
            <span className={`text-xs ${titleLenClass}`}>Lunghezza Titolo/SEO Title: {seoTitleLen}/60</span>
          </div>

          {/* Slug */}
          <div className="flex gap-2">
            <input
              name="slug"
              value={slug}
              onChange={(e)=>setSlug(e.target.value)}
              placeholder="Slug (opzionale)"
              className="border p-2 rounded flex-1"
            />
            <button type="button" onClick={handleGenerateSlug} className="px-3 py-2 border rounded">
              Genera slug
            </button>
          </div>

          {/* Estratto / Meta Description */}
          <div className="grid gap-1">
            <label className="font-medium">Estratto / Meta Description</label>
            <div className="flex gap-2">
              <textarea
                name="excerpt"
                value={excerpt}
                onChange={(e)=>setExcerpt(e.target.value)}
                placeholder="(80–160 caratteri)"
                className="border p-2 rounded flex-1 h-24"
              />
              <button type="button" onClick={handleSuggestDescription} className="px-3 py-2 border rounded whitespace-nowrap">
                Suggerisci
              </button>
            </div>
            <span className={`text-xs ${descLenClass}`}>Lunghezza Meta Description: {seoDescLen}/160</span>
          </div>

          {/* Contenuto (TipTap) */}
          <div className="grid gap-2">
            <label className="font-medium">Contenuto</label>
            <RichTextEditor value={contentHtml} onChange={setContentHtml} height={520} onUploadImage={uploadInlineImage} />
          </div>

          {/* Snippet H2 veloci */}
          <div className="flex flex-wrap gap-2 text-sm">
            {suggestH2().map((h, i) => (
              <button key={i} type="button" onClick={() => setContentHtml(prev => `${prev}<h2>${h}</h2>`)} className="px-3 py-1 border rounded">
                + {h}
              </button>
            ))}
          </div>

          {/* Categorie */}
          <div>
            <p className="font-medium mb-2">Categorie</p>
            <div className="flex flex-wrap gap-2">
              {categories.length === 0 && <p className="text-gray-500 text-sm">Caricamento categorie…</p>}
              {categories.map(cat => (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1 rounded-full border text-sm ${selectedCategories.includes(cat.id) ? "bg-black text-white" : "bg-gray-100 hover:bg-gray-200"}`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* TAG – pannello centrale */}
          <TagsPanel value={tags} onChange={setTags} />

          {/* Immagine in evidenza (una riga) + Pulsanti sotto */}
          <div className="grid gap-4">
            {/* — Immagine in evidenza: un solo rigo */}
            <div className="grid gap-1">
              <div className="flex items-center gap-3">
                <label className="font-medium shrink-0">Immagine in evidenza</label>
                <input
                  type="file"
                  name="featured"
                  accept="image/*"
                  className="border p-2 rounded"
                  onChange={(e) => setFeaturedFile(e.target.files?.[0] || null)}
                />
                {featuredPreview && (
                  <img
                    src={featuredPreview}
                    alt=""
                    className="h-12 w-20 object-cover rounded border"
                  />
                )}
                <span className="text-xs text-gray-500 ml-auto hidden md:inline">
                  Usa immagini ottimizzate (≤ 200 KB)
                </span>
              </div>
              {/* hint responsive (solo mobile) */}
              <p className="text-xs text-gray-500 md:hidden">
                Usa immagini ottimizzate (≤ 200 KB)
              </p>
            </div>

            {/* — Pulsanti azione sotto */}
            <div className="flex flex-wrap gap-3 items-center">
              <button type="submit" className="px-4 py-2 border rounded">
                Anteprima
              </button>

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
                className={`px-4 py-2 text-white rounded disabled:opacity-60 ${
                  seoScore >= SEO_MIN_SCORE_PUBLISH
                    ? "bg-black"
                    : "bg-amber-600 hover:bg-amber-700"
                }`}
                title={
                  seoScore >= SEO_MIN_SCORE_PUBLISH
                    ? "Pubblica subito in WordPress"
                    : `Score ${seoScore}%: consigliato migliorare prima di pubblicare`
                }
              >
                {loading === "publish" ? "Pubblicazione…" : `Pubblica (SEO ${seoScore}%)`}
              </button>

              <button
                type="button"
                onClick={() => resetAll()}
                className="px-4 py-2 border rounded"
              >
                Pulisci
              </button>
            </div>
          </div>
        </form>

        {/* COLONNA DESTRA: Preview + SEO helper */}
        <div className="grid gap-6">
          <ArticlePreview title={title} excerpt={excerpt} html={contentHtml} featuredUrl={featuredPreview} />
          <div className="bg-white border rounded-2xl p-4 grid gap-2">
            <p className="text-sm text-gray-600">Anteprima SERP (live)</p>
            <SerpPreview url={liveSerp.url} title={liveSerp.title} description={liveSerp.description} />
          </div>
          <SeoAssistant
            title={title}
            slug={slug}
            contentMd={contentHtml}
            seoTitle={title}
            seoDescription={excerpt}
            focusKw={seoFocus}
            onScoreChange={(score, checks) => { setSeoScore(score); setSeoChecks(checks); }}
          />
        </div>

        {/* Esito + SERP post-pubblicazione */}
        {result && (
          <div className="lg:col-span-2 border rounded p-4 bg-white grid gap-3">
            <h3 className="font-semibold">Esito</h3>
            {result.ok ? (
              <p>Operazione completata! ID: {result.post?.id} — <a className="underline" href={result.post?.link} target="_blank">apri</a></p>
            ) : result.preview ? (
              <p className="text-gray-600">Anteprima aggiornata.</p>
            ) : (
              <pre className="text-red-600 whitespace-pre-wrap">{String(result.error)}</pre>
            )}
            {serp && (
              <div className="grid gap-2">
                <h4 className="font-semibold">Anteprima SERP (post-pubblicazione)</h4>
                <SerpPreview url={serp.url} title={serp.title} description={serp.description} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal post-azione */}
      {showAfterActionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAfterActionModal(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-lg p-6 w-[90%] max-w-md">
            <h4 className="text-lg font-semibold mb-2">{showAfterActionModal === "publish" ? "Articolo pubblicato" : "Bozza salvata"}</h4>
            <p className="text-sm text-gray-600 mb-4">Cosa vuoi fare adesso?</p>
            <div className="flex gap-2 justify-end">
              <button className="px-4 py-2 border rounded" onClick={() => setShowAfterActionModal(null)}>Nuovo articolo</button>
              <button className="px-4 py-2 bg-black text-white rounded" onClick={() => router.push("/posts")}>Vedi articoli</button>
            </div>
          </div>
        </div>
      )}

      {/* SEO Gate Modal */}
      {showSeoGate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSeoGate(null)} />
          <div className="relative z-10 bg-white rounded-2xl shadow-lg p-6 w-[90%] max-w-lg">
            <h4 className="text-lg font-semibold mb-2">Migliora la SEO prima di pubblicare</h4>
            <p className="text-sm text-gray-600 mb-3">Score attuale: <strong>{seoScore}%</strong> (soglia consigliata: {SEO_MIN_SCORE_PUBLISH}%)</p>
            <ul className="list-disc pl-5 text-sm max-h-48 overflow-auto">
              {seoChecks.filter(c=>!c.ok).map((c,i)=>(<li key={i} className="text-gray-800">{c.label}</li>))}
            </ul>
            <div className="flex gap-2 justify-end mt-4">
              <button className="px-4 py-2 border rounded" onClick={()=>setShowSeoGate(null)}>Torna a modificare</button>
              <button className="px-4 py-2 bg-amber-600 text-white rounded" onClick={async()=>{ setShowSeoGate(null); await actuallyPublish("publish"); }}>Pubblica comunque</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}