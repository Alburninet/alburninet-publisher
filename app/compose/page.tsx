"use client";

import React from "react";
import Link from "next/link";
import SEOAssistant from "@/components/SeoAssistant";
import ContentEditor from "@/components/ContentEditor";
import NavBar from "@/components/NavBar"; // 👈 navbar esplicita qui

/* ===========================
   Helper locali per le API WP
   =========================== */

type CreatePayload = {
  title: string;
  slug?: string;
  excerpt?: string;
  contentHtml: string;
  tags?: string[];
  categories?: number[];
  featuredMediaUrl?: string;
  yoast?: {
    focusKw?: string;
    title?: string;
    metadesc?: string;
    canonical?: string;
    noindex?: boolean;
    nofollow?: boolean;
    cornerstone?: boolean;
  };
  status: "draft" | "publish";
};

async function fetchCategories(): Promise<Array<{ id: number; name: string }>> {
  const r = await fetch("/api/wp/taxonomy?type=categories&per_page=100", { cache: "no-store" });
  const j = await r.json().catch(() => ({}));
  const items = Array.isArray(j) ? j : j?.items || [];
  return items.map((c: any) => ({ id: c.id, name: c.name }));
}

async function saveDraftApi(payload: Omit<CreatePayload, "status">) {
  const r = await fetch("/api/wp/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, status: "draft" }),
  });
  if (!r.ok) throw new Error("Draft save failed");
  return r.json();
}

async function publishPostApi(payload: Omit<CreatePayload, "status">) {
  const r = await fetch("/api/wp/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...payload, status: "publish" }),
  });
  if (!r.ok) throw new Error("Publish failed");
  return r.json();
}

async function uploadFeaturedFromUrlApi(url: string) {
  const r = await fetch("/api/wp/media", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  if (!r.ok) throw new Error("Upload media failed");
  return r.json();
}

/* ==============
   Tipi locali
   ============== */
type Category = { id: number; name: string };
type SaveState = "idle" | "saving" | "success" | "error";

/* ==================
   Pagina Compose
   ================== */

export default function ComposePage() {
  // Campi base
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState(""); // 👈 nascosto in UI
  const [excerpt, setExcerpt] = React.useState(""); // 👈 sotto il titolo
  const [contentHtml, setContentHtml] = React.useState("");

  // SEO
  const [seoTitle, setSeoTitle] = React.useState("");
  const [focusKw, setFocusKw] = React.useState("");
  const [canonical, setCanonical] = React.useState("");
  const [noindex, setNoindex] = React.useState(false);
  const [nofollow, setNofollow] = React.useState(false);
  const [cornerstone, setCornerstone] = React.useState(false);

  // Tag
  const [tags, setTags] = React.useState<string[]>([]);
  const [newTag, setNewTag] = React.useState("");

  // Categorie
  const [categories, setCategories] = React.useState<Category[]>([]);
  const [selectedCats, setSelectedCats] = React.useState<number[]>([]);

  // Immagine in evidenza
  const [featuredUrl, setFeaturedUrl] = React.useState<string | null>(null);

  // AI
  const [aiOpen, setAiOpen] = React.useState(false);

  // Stato salvataggio
  const [saving, setSaving] = React.useState<SaveState>("idle");

  // Carica categorie + eventuale prefilling da Dashboard
  React.useEffect(() => {
    (async () => {
      try {
        const cats = await fetchCategories();
        setCategories(cats);
      } catch {}
    })();

    try {
      const raw = localStorage.getItem("alburninet_prefill");
      if (raw) {
        const p = JSON.parse(raw);
        if (p.title) setTitle(p.title);
        if (p.contentHtml) setContentHtml(p.contentHtml);
        if (p.excerpt) setExcerpt(p.excerpt);
        if (p.seoTitle) setSeoTitle(p.seoTitle);
        if (p.featuredMediaUrl) setFeaturedUrl(p.featuredMediaUrl);
        if (p.canonical) setCanonical(p.canonical);
        localStorage.removeItem("alburninet_prefill");
      }
    } catch {}
  }, []);

  // Tag
  function addTag() {
    const t = newTag.trim();
    if (!t) return;
    if (!tags.includes(t)) setTags((prev) => [...prev, t]);
    setNewTag("");
  }
  function removeTag(t: string) {
    setTags((prev) => prev.filter((x) => x !== t));
  }

  // Categorie
  function toggleCat(id: number) {
    setSelectedCats((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  // Immagine evidenza
  async function onUploadFeaturedFromUrl() {
    if (!featuredUrl) return;
    try {
      setSaving("saving");
      await uploadFeaturedFromUrlApi(featuredUrl);
      setSaving("success");
      setTimeout(() => setSaving("idle"), 900);
    } catch {
      setSaving("error");
      setTimeout(() => setSaving("idle"), 1400);
    }
  }

  // Salva/Pubblica
  async function onSaveDraft() {
    try {
      setSaving("saving");
      await saveDraftApi({
        title,
        slug,
        excerpt,
        contentHtml,
        tags,
        categories: selectedCats,
        featuredMediaUrl: featuredUrl || undefined,
        yoast: {
          focusKw,
          title: seoTitle || title,
          metadesc: excerpt || "", // continua ad andare a Yoast come metadesc (il campo è quello “Estratto”)
          canonical: canonical || undefined,
          noindex,
          nofollow,
          cornerstone,
        },
      });
      setSaving("success");
      setTimeout(() => setSaving("idle"), 1000);
    } catch {
      setSaving("error");
      setTimeout(() => setSaving("idle"), 1500);
    }
  }

  async function onPublish() {
    try {
      setSaving("saving");
      await publishPostApi({
        title,
        slug,
        excerpt,
        contentHtml,
        tags,
        categories: selectedCats,
        featuredMediaUrl: featuredUrl || undefined,
        yoast: {
          focusKw,
          title: seoTitle || title,
          metadesc: excerpt || "",
          canonical: canonical || undefined,
          noindex,
          nofollow,
          cornerstone,
        },
      });
      setSaving("success");
      setTimeout(() => setSaving("idle"), 1000);
    } catch {
      setSaving("error");
      setTimeout(() => setSaving("idle"), 1500);
    }
  }

  // Pulisci
  function onReset() {
    setTitle("");
    setSlug("");
    setExcerpt("");
    setContentHtml("");
    setTags([]);
    setSelectedCats([]);
    setSeoTitle("");
    setFocusKw("");
    setCanonical("");
    setNoindex(false);
    setNofollow(false);
    setCornerstone(false);
    setFeaturedUrl(null);
  }

  return (
    <>
      {/* NAVBAR in cima (full width) */}
      <NavBar />

      <main className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
          {/* COLONNA SINISTRA */}
          <section className="space-y-4">
            {/* Titolo */}
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Titolo (H1)</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titolo dell’articolo"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>

            {/* SLUG (nascosto ma presente) */}
            <div className="hidden" aria-hidden>
              <input type="text" value={slug} onChange={(e) => setSlug(e.target.value)} tabIndex={-1} />
            </div>

            {/* Estratto / Meta description */}
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700">
                Estratto / Meta description{" "}
                <span className="text-gray-400 text-xs">(80–160 caratteri consigliati)</span>
              </label>
              <textarea
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                rows={3}
                placeholder="Breve riassunto dell’articolo…"
                className="mt-2 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>

            {/* Contenuto */}
            <div className="bg-white rounded-xl shadow p-0">
              <div className="px-4 pt-4">
                <div className="text-sm font-medium text-gray-700">Contenuto</div>
              </div>
              <div className="p-4 pt-2">
                <ContentEditor value={contentHtml} onChange={setContentHtml} />
              </div>
            </div>

            {/* Tag */}
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Tag</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTag}
                  onChange={(e) => setNewTag(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTag();
                    }
                  }}
                  placeholder="Aggiungi tag e premi Invio…"
                  className="flex-1 rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                >
                  Aggiungi
                </button>
              </div>
              {!!tags.length && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-2 px-2 py-1 rounded-full border text-sm"
                    >
                      {t}
                      <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600"
                        onClick={() => removeTag(t)}
                        aria-label={`Rimuovi ${t}`}
                      >
                        ✕
                      </button>
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-gray-500">
                Suggerimento: 4–8 tag pertinenti aiutano l’organizzazione e la SEO.
              </p>
            </div>

            {/* Focus keyphrase (box centrale principale) */}
            <div className="bg-white rounded-xl shadow p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Focus keyphrase (Yoast)
              </label>
              <input
                type="text"
                value={focusKw}
                onChange={(e) => setFocusKw(e.target.value)}
                placeholder="Parola/frase chiave principale…"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
              />
            </div>
          </section>

          {/* COLONNA DESTRA */}
          <aside className="space-y-4">
            {/* Azioni */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="grid grid-cols-2 gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setAiOpen(true)}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                >
                  Genera con AI
                </button>
                <Link
                  href="/preview"
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-center"
                >
                  Anteprima
                </Link>
                <button
                  type="button"
                  onClick={onSaveDraft}
                  disabled={saving === "saving"}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                >
                  Salva bozza
                </button>
                <button
                  type="button"
                  onClick={onPublish}
                  disabled={saving === "saving"}
                  className="px-3 py-2 rounded-lg bg-black text-white hover:bg-black/90"
                >
                  Pubblica
                </button>
              </div>
              <button
                type="button"
                onClick={onReset}
                className="w-full px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Pulisci
              </button>
              {saving === "saving" && <p className="mt-2 text-sm text-gray-500">Salvataggio…</p>}
              {saving === "success" && <p className="mt-2 text-sm text-green-600">Fatto!</p>}
              {saving === "error" && (
                <p className="mt-2 text-sm text-red-600">Errore durante il salvataggio.</p>
              )}
            </div>

            {/* Immagine in evidenza */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Immagine in evidenza</div>
              <div className="aspect-video w-full rounded-lg border border-dashed grid place-items-center text-sm text-gray-400">
                {featuredUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={featuredUrl} alt="" className="w-full h-full object-cover rounded-lg" />
                ) : (
                  <span>Nessuna immagine</span>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <label className="col-span-2">
                  <span className="sr-only">URL immagine</span>
                  <input
                    type="url"
                    value={featuredUrl || ""}
                    onChange={(e) => setFeaturedUrl(e.target.value || null)}
                    placeholder="Incolla URL immagine…"
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
                  />
                </label>
                <button
                  type="button"
                  onClick={onUploadFeaturedFromUrl}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                >
                  Carica immagine
                </button>
                <button
                  type="button"
                  onClick={() => window.alert("Libreria Media in sospeso")}
                  className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                >
                  Seleziona dalla Libreria Media
                </button>
              </div>
            </div>

            {/* Categorie */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">Categorie</div>
              <div className="flex flex-wrap gap-2">
                {categories.map((c) => {
                  const active = selectedCats.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleCat(c.id)}
                      className={`px-3 py-1 rounded-full border text-sm ${
                        active ? "bg-black text-white border-black" : "bg-white"
                      }`}
                    >
                      {c.name}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assistente SEO */}
            <div className="bg-white rounded-xl shadow p-4">
              <SEOAssistant
                title={title}
                slug={slug}
                contentHtml={contentHtml}
                seoTitle={seoTitle || title}
                seoDescription={excerpt} // l’assistente usa l’estratto come metadesc
                focusKw={focusKw}
              />
            </div>

            {/* SEO avanzato — senza il campo “Focus keyphrase” */}
            <div className="bg-white rounded-xl shadow p-4">
              <div className="text-sm font-medium text-gray-700 mb-2">SEO avanzato</div>

              <label className="block text-xs text-gray-600 mb-1">Titolo SEO (opzionale)</label>
              <input
                type="text"
                value={seoTitle}
                onChange={(e) => setSeoTitle(e.target.value)}
                placeholder="Se vuoto usa il Titolo"
                className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
              />

              <label className="block text-xs text-gray-600 mb-1">Canonical URL</label>
              <input
                type="url"
                value={canonical}
                onChange={(e) => setCanonical(e.target.value)}
                placeholder="https://esempio.it/articolo"
                className="mb-3 w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
              />

              <div className="flex items-center gap-3 text-xs text-gray-600">
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={noindex}
                    onChange={(e) => setNoindex(e.target.checked)}
                    className="rounded border-gray-300"
                  />{" "}
                  Noindex
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={nofollow}
                    onChange={(e) => setNofollow(e.target.checked)}
                    className="rounded border-gray-300"
                  />{" "}
                  Nofollow
                </label>
                <label className="flex items-center gap-1">
                  <input
                    type="checkbox"
                    checked={cornerstone}
                    onChange={(e) => setCornerstone(e.target.checked)}
                    className="rounded border-gray-300"
                  />{" "}
                  Cornerstone
                </label>
              </div>
            </div>
          </aside>
        </div>

        {/* Modal AI inline */}
        {aiOpen && (
          <AIModalInline
            open={aiOpen}
            defaultTopic={title || ""}
            onClose={() => setAiOpen(false)}
            onApply={(data) => {
              if (data.title) setTitle(data.title);
              if (data.excerpt) setExcerpt(data.excerpt);
              if (data.contentHtml) setContentHtml(data.contentHtml);
              if (data.seoTitle) setSeoTitle(data.seoTitle);
              if (data.focusKw) setFocusKw(data.focusKw);
              if (data.canonical) setCanonical(data.canonical);
              if (data.featuredMediaUrl) setFeaturedUrl(data.featuredMediaUrl);
            }}
          />
        )}
      </main>
    </>
  );
}

/* ===========================
   AIModalInline (semplice)
   =========================== */
function AIModalInline(props: {
  open: boolean;
  defaultTopic?: string;
  onClose: () => void;
  onApply: (data: {
    title?: string;
    excerpt?: string;
    contentHtml?: string;
    seoTitle?: string;
    focusKw?: string;
    canonical?: string;
    featuredMediaUrl?: string;
  }) => void;
}) {
  const { open, defaultTopic = "", onClose, onApply } = props;
  const [topic, setTopic] = React.useState(defaultTopic);
  const [loading, setLoading] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setTopic(defaultTopic);
      setErr(null);
    }
  }, [open, defaultTopic]);

  if (!open) return null;

  async function generate() {
    try {
      setLoading(true);
      setErr(null);
      const res = await fetch("/api/ai/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const txt = await res.text();
      const data = txt ? JSON.parse(txt) : {};
      onApply({
        title: data.title,
        excerpt: data.excerpt,
        contentHtml: data.contentHtml,
        seoTitle: data.seoTitle,
        focusKw: data.focusKw,
        canonical: data.canonical,
        featuredMediaUrl: data.featuredMediaUrl,
      });
      onClose();
    } catch (e: any) {
      setErr(e?.message || "Errore generazione");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Genera con AI</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            ✕
          </button>
        </div>
        <label className="block text-sm text-gray-700 mb-1">Argomento</label>
        <input
          type="text"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Inserisci l’argomento di partenza…"
          className="w-full rounded-lg border border-gray-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-black/5"
        />
        {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
        <div className="mt-4 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50">
            Annulla
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="px-3 py-2 rounded-lg bg-black text-white hover:bg-black/90 disabled:opacity-50"
          >
            {loading ? "Generazione…" : "Genera"}
          </button>
        </div>
      </div>
    </div>
  );
}