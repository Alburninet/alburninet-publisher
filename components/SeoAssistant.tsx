"use client";

import { useEffect, useMemo } from "react";

type Check = { ok: boolean; label: string; hint?: string };

function stripHtml(html: string): string {
  if (!html) return "";
  // Rimuovi script/style
  html = html.replace(/<script[\s\S]*?<\/script>/gi, "").replace(/<style[\s\S]*?<\/style>/gi, "");
  // Sostituisci </p> e <br> con separatori
  html = html.replace(/<\/p>/gi, ". ").replace(/<br\s*\/?>/gi, " ");
  // Rimuovi i tag rimanenti
  const text = html.replace(/<[^>]+>/g, " ");
  return text.replace(/\s+/g, " ").trim();
}

function countSentences(text: string): number {
  if (!text) return 0;
  // FIX: niente backslash davanti a "…" (ellissi)
  const parts = text.split(/(?<=[.!?…])\s+/u).filter(s => s.trim().length > 0);
  return parts.length;
}

function countWords(text: string): number {
  if (!text) return 0;
  const words = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ0-9’']+/gu);
  return words ? words.length : 0;
}

function countLetters(text: string): number {
  if (!text) return 0;
  const letters = text.match(/[A-Za-zÀ-ÖØ-öø-ÿ]/gu);
  return letters ? letters.length : 0;
}

/** Gulpease: 89 + (300*frasi - 10*lettere) / parole  — 0..100 (alto=facile) */
function gulpeaseIndex(text: string): { value: number | null; sentences: number; words: number; letters: number } {
  const sentences = countSentences(text);
  const words = countWords(text);
  const letters = countLetters(text);
  if (sentences === 0 || words === 0) return { value: null, sentences, words, letters };
  const value = 89 + (300 * sentences - 10 * letters) / Math.max(1, words);
  const v = Math.max(0, Math.min(100, Math.round(value)));
  return { value: v, sentences, words, letters };
}

function hasH2(html: string) {
  return /<h2(\s|>)/i.test(html);
}
function imageAltCoverage(html: string) {
  const imgs = html.match(/<img\b[^>]*>/gi) || [];
  if (imgs.length === 0) return { withAlt: 0, total: 0 };
  let withAlt = 0;
  for (const tag of imgs) {
    const m = tag.match(/alt\s*=\s*"(.*?)"/i);
    if (m && m[1].trim().length > 0) withAlt++;
  }
  return { withAlt, total: imgs.length };
}
function linkStats(html: string) {
  const links = html.match(/<a\b[^>]*href="([^"]+)"[^>]*>/gi) || [];
  let internal = 0, external = 0;
  for (const a of links) {
    const m = a.match(/href="([^"]+)"/i);
    if (!m) continue;
    const href = m[1];
    if (/^https?:\/\/(www\.)?alburninet\.it/i.test(href) || href.startsWith("/") || href.startsWith("#")) internal++;
    else external++;
  }
  return { total: links.length, internal, external };
}

export default function SeoAssistant({
  title,
  slug,
  contentHtml,           // ⬅️ HTML dal tuo editor
  seoTitle,
  seoDescription,
  focusKw,
  onScoreChange,
}: {
  title: string;
  slug: string;
  contentHtml: string;
  seoTitle: string;
  seoDescription: string;
  focusKw: string;
  onScoreChange?: (score: number, checks: Check[]) => void;
}) {
  const text = useMemo(() => stripHtml(contentHtml), [contentHtml]);

  const gul = useMemo(() => gulpeaseIndex(text), [text]);
  const links = useMemo(() => linkStats(contentHtml || ""), [contentHtml]);
  const img = useMemo(() => imageAltCoverage(contentHtml || ""), [contentHtml]);

  const titleLen = (seoTitle || title || "").trim().length;
  const descLen  = (seoDescription || "").trim().length;

  const containsKw = (s: string) =>
    (focusKw || "").length > 0 && s.toLowerCase().includes(focusKw.toLowerCase());

  const checks: Check[] = [
    { ok: titleLen >= 35 && titleLen <= 60, label: `Titolo SEO 35–60 (attuale ${titleLen})`, hint: "Ottimizza la lunghezza del titolo." },
    { ok: descLen >= 80 && descLen <= 160, label: `Meta-description 80–160 (attuale ${descLen})`, hint: "Rendi la descrizione informativa e concisa." },
    { ok: !!hasH2(contentHtml || ""), label: "Almeno un H2 presente", hint: "Aggiungi sottotitoli H2 per la struttura." },
    { ok: img.total === 0 || img.withAlt === img.total, label: `ALT immagini (${img.withAlt}/${img.total})`, hint: "Aggiungi alt descrittivi alle immagini." },
    { ok: links.total >= 1 && links.external >= 1, label: `Link (tot: ${links.total}, ext: ${links.external})`, hint: "Aggiungi almeno 1 link esterno autorevole." },
    { ok: containsKw(seoTitle || title || ""), label: "Keyword nel titolo", hint: "Inserisci la focus keyword nel titolo." },
    { ok: containsKw(seoDescription || ""), label: "Keyword nella description", hint: "Inserisci la focus keyword nella meta description." },
    { ok: gul.value === null ? true : gul.value >= 40, label: `Leggibilità (Gulpease) ≥ 40 (attuale ${gul.value === null ? "N/D" : gul.value})`, hint: "Frasi più corte, parole semplici." },
  ];

  const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);

  useEffect(() => {
    onScoreChange?.(score, checks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, contentHtml, seoTitle, seoDescription, title, slug, focusKw]);

  return (
    <div className="bg-white border rounded-2xl p-4">
      <h3 className="font-semibold mb-2">Assistente SEO</h3>
      <div className="text-sm text-gray-600 mb-3">
        Score stimato: <strong>{score}%</strong>{" "}
        {gul.value !== null
          ? <span className="ml-2">• Gulpease: <strong>{gul.value}</strong> (frasi {gul.sentences}, parole {gul.words})</span>
          : <span className="ml-2">• Gulpease: <strong>N/D</strong></span>}
      </div>
      <ul className="space-y-1 text-sm">
        {checks.map((c, i) => (
          <li key={i} className="flex items-start gap-2">
            <span className={`mt-0.5 inline-block h-2.5 w-2.5 rounded-full ${c.ok ? "bg-green-600" : "bg-amber-600"}`} />
            <span>{c.label}{c.hint ? <span className="text-gray-500"> — {c.hint}</span> : null}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}