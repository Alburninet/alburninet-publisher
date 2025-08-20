"use client";

import React from "react";

type PreviewData = {
  title?: string;
  excerpt?: string;
  contentHtml?: string;
  featuredMediaUrl?: string;
  categories?: Array<{ id: number; name: string }>;
  seoTitle?: string;
  canonical?: string;
  focusKw?: string;
  tags?: string[];
};

function toPlain(html: string) {
  if (!html) return "";
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  return cleaned.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function estimateReadTime(html: string) {
  const text = toPlain(html || "");
  const words = (text.match(/\b[\p{L}\p{N}’']+\b/gu) || []).length;
  const minutes = Math.max(1, Math.ceil(words / 200)); // ~200 wpm
  return { words, minutes };
}

export default function PreviewPage() {
  const [data, setData] = React.useState<PreviewData | null>(null);
  const [dark, setDark] = React.useState(false);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem("alburninet_preview");
      if (raw) setData(JSON.parse(raw));
    } catch {
      setData(null);
    }
  }, []);

  const title = data?.seoTitle || data?.title || "Titolo dell'articolo";
  const description =
    data?.excerpt || "Anteprima della meta description… (compila l’estratto).";

  const rt = estimateReadTime(data?.contentHtml || "");

  return (
    <div className={dark ? "min-h-screen bg-gray-900 text-gray-100" : "min-h-screen bg-gray-50 text-gray-900"}>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header della preview */}
        <div className={dark ? "mb-6 flex items-center justify-between" : "mb-6 flex items-center justify-between"}>
          <div className="text-sm opacity-80">
            <span className="mr-3">⏱️ {rt.minutes} min</span>
            <span>~{rt.words} parole</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setDark((v) => !v)}
              className={dark
                ? "px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm"
                : "px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"}
              type="button"
            >
              {dark ? "Light mode" : "Dark mode"}
            </button>
            <a
              href="/compose"
              className={dark
                ? "px-3 py-2 rounded-lg border border-gray-700 bg-gray-800 hover:bg-gray-700 text-sm"
                : "px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"}
            >
              ↩︎ Torna alla composizione
            </a>
          </div>
        </div>

        {/* SERP mini preview */}
        <div className={dark ? "mb-8 border border-gray-800 rounded-xl p-4 bg-gray-850" : "mb-8 bg-white border rounded-xl p-4"}>
          <div className={dark ? "text-xs text-gray-400 mb-1" : "text-xs text-gray-500 mb-1"}>Anteprima Google</div>
          <div className="text-[#1a0dab] dark:text-blue-400 text-xl leading-snug">{title}</div>
          <div className="text-[#006621] dark:text-green-400 text-sm">https://alburninet.it/articolo-di-prova</div>
          <div className={dark ? "text-gray-300 text-sm mt-1" : "text-[#545454] text-sm mt-1"}>{description}</div>
        </div>

        {/* Titolo */}
        <h1 className="text-3xl font-semibold mb-3">{data?.title || "Titolo dell'articolo"}</h1>

        {/* Tag + Meta leggibili */}
        <div className={dark ? "text-sm text-gray-300 mb-4" : "text-sm text-gray-600 mb-4"}>
          {data?.focusKw ? (
            <span className="mr-3">
              <strong>Focus keyphrase:</strong> {data.focusKw}
            </span>
          ) : null}
          {data?.canonical ? (
            <span className="mr-3">
              <strong>Canonical:</strong> {data.canonical}
            </span>
          ) : null}
          {data?.categories?.length ? (
            <span className="mr-3">
              <strong>Categorie:</strong>{" "}
              {data.categories.map((c) => c.name).join(", ")}
            </span>
          ) : null}
        </div>

        {/* Tag chips */}
        {data?.tags && data.tags.length > 0 ? (
          <div className="mb-6 flex flex-wrap gap-2">
            {data.tags.map((t) => (
              <span
                key={t}
                className={dark
                  ? "inline-flex items-center px-2 py-1 rounded-full text-xs border border-gray-700 bg-gray-800"
                  : "inline-flex items-center px-2 py-1 rounded-full text-xs border bg-gray-50"}
              >
                #{t}
              </span>
            ))}
          </div>
        ) : null}

        {/* Immagine in evidenza */}
        {data?.featuredMediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={data.featuredMediaUrl}
            alt="Immagine in evidenza"
            className="w-full rounded-xl border mb-6"
          />
        ) : null}

        {/* Contenuto */}
        <article
          className={dark
            ? "prose max-w-none border border-gray-800 rounded-xl p-6 prose-invert"
            : "prose max-w-none bg-white border rounded-xl p-6"}
          dangerouslySetInnerHTML={{
            __html:
              data?.contentHtml ||
              "<p>Scrivi il contenuto nella pagina di composizione per vederlo qui in anteprima.</p>",
          }}
        />
      </div>
    </div>
  );
}