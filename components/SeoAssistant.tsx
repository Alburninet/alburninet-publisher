"use client";

import * as React from "react";

type CheckStatus = "good" | "bad" | "neutral";

export type Check = {
  label: string;
  status: CheckStatus;
  note?: string;
};

type Props = {
  title: string;
  slug: string;
  contentHtml: string;
  seoTitle: string;
  seoDescription: string;
  focusKw: string;
  onScoreChange?: (score: number, checks: Check[]) => void;
};

/* =========================
   Utilità di conteggio testo
   ========================= */
function toPlain(html: string) {
  if (!html) return "";
  // rimuove script/style
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "");
  // to text
  return cleaned.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function countWords(text: string) {
  return (text.match(/\b[\p{L}\p{N}’']+\b/gu) || []).length;
}
function countSentences(text: string) {
  return (text.match(/[.!?…]+(\s|$)/g) || []).length;
}
function countLetters(text: string) {
  return (text.match(/\p{L}/gu) || []).length;
}

/* =========================
   Gulpease (ritorna null se non calcolabile)
   ========================= */
function computeGulpease(text: string): number | null {
  const words = countWords(text);
  const sentences = countSentences(text);
  const letters = countLetters(text);
  if (words < 1 || sentences < 1 || letters < 1) return null;
  const g = 89 + (300 * sentences - 10 * letters) / Math.max(words, 1);
  return Math.max(0, Math.min(100, g));
}

/* =========================
   Parser contenuti HTML per H2, IMG, link
   ========================= */
function hasH2(html: string) {
  return /<h2\b[^>]*>/i.test(html || "");
}

function imgsWithAlt(html: string) {
  const imgTags = (html.match(/<img\b[^>]*>/gi) || []) as string[];
  const total = imgTags.length;
  let withAlt = 0;
  for (const tag of imgTags) {
    const m = tag.match(/\balt\s*=\s*("([^"]*)"|'([^']*)')/i);
    const alt = m ? (m[2] ?? m[3] ?? "").trim() : "";
    if (alt.length > 0) withAlt++;
  }
  return { total, withAlt };
}

function countExternalLinks(html: string) {
  const aTags = (html.match(/<a\b[^>]*href\s*=\s*("([^"]+)"|'([^']+)')/gi) || []) as string[];
  let n = 0;
  for (const a of aTags) {
    const m = a.match(/href\s*=\s*("([^"]+)"|'([^']+)')/i);
    const href = m ? (m[2] ?? m[3] ?? "") : "";
    if (/^https?:\/\//i.test(href)) n++;
  }
  return n;
}

/* =========================
   Componente
   ========================= */
export default function SeoAssistant({
  title,
  slug,
  contentHtml,
  seoTitle,
  seoDescription,
  focusKw,
  onScoreChange,
}: Props) {
  const plain = React.useMemo(() => toPlain(contentHtml || ""), [contentHtml]);

  const checks = React.useMemo<Check[]>(() => {
    const list: Check[] = [];

    // 1) Titolo SEO 35–60
    const t = (seoTitle || title || "").trim();
    const tl = t.length;
    if (!t) {
      list.push({
        label: `Titolo SEO 35–60 (attuale 0)`,
        status: "bad",
        note: "Ottimizza la lunghezza del titolo.",
      });
    } else {
      const ok = tl >= 35 && tl <= 60;
      list.push({
        label: `Titolo SEO 35–60 (attuale ${tl})`,
        status: ok ? "good" : "bad",
        note: ok ? "Titolo di buona lunghezza." : "Ottimizza la lunghezza del titolo.",
      });
    }

    // 2) Meta description 80–160
    const d = (seoDescription || "").trim();
    const dl = d.length;
    if (!d) {
      list.push({
        label: `Meta-description 80–160 (attuale 0)`,
        status: "bad",
        note: "Rendi la descrizione informativa e concisa.",
      });
    } else {
      const ok = dl >= 80 && dl <= 160;
      list.push({
        label: `Meta-description 80–160 (attuale ${dl})`,
        status: ok ? "good" : "bad",
        note: ok ? "Lunghezza descrizione ok." : "Accorcia o allunga la descrizione.",
      });
    }

    // 3) H2 presente
    if (!contentHtml || !hasH2(contentHtml)) {
      list.push({
        label: `Almeno un H2 presente`,
        status: "bad",
        note: "Aggiungi sottotitoli H2 per la struttura.",
      });
    } else {
      list.push({
        label: `Almeno un H2 presente`,
        status: "good",
        note: "Buona struttura del testo.",
      });
    }

    // 4) ALT immagini
    const { total, withAlt } = imgsWithAlt(contentHtml || "");
    if (total === 0) {
      // *** QUI il comportamento richiesto ***
      list.push({
        label: `ALT immagini (0/0)`,
        status: "neutral",
        note: "Aggiungi almeno 1 immagine con alt descrittivo.",
      });
    } else if (withAlt === total) {
      list.push({
        label: `ALT immagini (${withAlt}/${total})`,
        status: "good",
        note: "Ottimo: tutte le immagini hanno ALT.",
      });
    } else {
      list.push({
        label: `ALT immagini (${withAlt}/${total})`,
        status: "bad",
        note: "Aggiungi ALT descrittivi alle immagini mancanti.",
      });
    }

    // 5) Link esterni (almeno 1)
    const links = countExternalLinks(contentHtml || "");
    if (links === 0) {
      list.push({
        label: `Link (tot: 0, ext: 0)`,
        status: "bad",
        note: "Aggiungi almeno 1 link esterno autorevole.",
      });
    } else {
      list.push({
        label: `Link (tot: ${links}, ext: ${links})`,
        status: "good",
        note: "Ottimo: ci sono link esterni.",
      });
    }

    // 6) Keyword nel titolo
    const kw = (focusKw || "").trim().toLowerCase();
    if (!kw) {
      list.push({
        label: `Keyword nel titolo`,
        status: "neutral",
        note: "Inserisci la focus keyword nel titolo.",
      });
    } else {
      const ok = t.toLowerCase().includes(kw);
      list.push({
        label: `Keyword nel titolo`,
        status: ok ? "good" : "bad",
        note: ok ? "Keyword presente nel titolo." : "Inserisci la keyword nel titolo.",
      });
    }

    // 7) Keyword nella description
    if (!kw) {
      list.push({
        label: `Keyword nella description`,
        status: "neutral",
        note: "Inserisci la focus keyword nella meta description.",
      });
    } else {
      const ok = d.toLowerCase().includes(kw);
      list.push({
        label: `Keyword nella description`,
        status: ok ? "good" : "bad",
        note: ok
          ? "Keyword presente nella description."
          : "Inserisci la keyword nella description.",
      });
    }

    // 8) Leggibilità (Gulpease) ≥ 40
    const MIN_WORDS = 30;
    const MIN_SENTENCES = 2;
    const words = countWords(plain);
    const sents = countSentences(plain);
    const g = computeGulpease(plain);

    if (words < MIN_WORDS || sents < MIN_SENTENCES || g === null) {
      list.push({
        label: `Leggibilità (Gulpease) ≥ 40`,
        status: "neutral",
        note: "Scrivi almeno 30 parole e 2 frasi per valutare la leggibilità.",
      });
    } else {
      const ok = g >= 40;
      list.push({
        label: `Leggibilità (Gulpease) ≥ 40 (attuale ${Math.round(g)})`,
        status: ok ? "good" : "bad",
        note: ok ? "Testo leggibile." : "Frasi più corte, parole semplici.",
      });
    }

    return list;
  }, [title, seoTitle, seoDescription, focusKw, contentHtml, plain]);

  /* ================
     Score SOLO sui "good"
     ================ */
  const score = React.useMemo(() => {
    const passed = checks.filter((c) => c.status === "good").length;
    const total = checks.length || 1;
    return Math.round((passed / total) * 100);
  }, [checks]);

  React.useEffect(() => {
    onScoreChange?.(score, checks);
  }, [score, checks, onScoreChange]);

  return (
    <div>
      <div className="text-sm mb-2">
        <span className="font-medium">Score stimato</span>: {score}% •{" "}
        <span className="font-medium">Gulpease</span>:{" "}
        {
          // estrai il valore se presente tra i check
          (() => {
            const g = checks.find((c) => c.label.startsWith("Leggibilità (Gulpease)"));
            const m = g?.label.match(/attuale\s+(\d+)/i);
            return m ? m[1] : "N/D";
          })()
        }
      </div>

      <ul className="space-y-2">
        {checks.map((c, i) => {
          const dot =
            c.status === "good"
              ? "bg-green-500"
              : c.status === "bad"
              ? "bg-orange-500"
              : "bg-gray-300";
          return (
            <li key={i} className="text-sm flex gap-2 items-start">
              <span className={`inline-block w-2 h-2 rounded-full mt-2 ${dot}`} />
              <div>
                <div>{c.label}</div>
                {c.note && <div className="text-gray-500 text-xs">{c.note}</div>}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}