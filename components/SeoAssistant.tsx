"use client";
import { useMemo, useEffect } from "react";
import { firstParagraph, countWords, keywordDensity, countLinksMd, countImagesMd, countHeadings, gulpeaseIndex } from "@/lib/seo";

type Check = { ok: boolean; label: string };

export default function SeoAssistant({
  title, slug, contentMd, seoTitle, seoDescription, focusKw,
  onScoreChange
}: {
  title: string; slug?: string; contentMd: string; seoTitle?: string; seoDescription?: string; focusKw?: string;
  onScoreChange?: (score: number, checks: Check[]) => void;
}) {
  function lenOk(str: string | undefined, min: number, max: number) {
    const n = (str || "").trim().length;
    return n >= min && n <= max;
  }

  const data = useMemo(() => {
    const t = (title || "").trim();
    const s = (slug || "").trim();
    const md = (contentMd || "");
    const st = (seoTitle || "").trim();
    const sd = (seoDescription || "").trim();
    const kw = (focusKw || "").trim();

    const inputsEmpty = !t && !s && !md.trim() && !st && !sd && !kw;
    if (inputsEmpty) {
      const labels = [
        "Titolo presente","SEO Title 35–60 caratteri","Meta Description 80–160 caratteri",
        "Keyword focus impostata","Keyword nel titolo","Keyword nello slug","Keyword nel primo paragrafo",
        "Lunghezza contenuto ≥ 300 parole","Densità keyword 0.5–2.5%","Almeno 2 H2",
        "Struttura con sottosezioni (H3 o più H2)","≥ 1 link interno","≥ 1 link esterno",
        "≥ 1 immagine","Alt per tutte le immagini","Almeno un alt con keyword","Leggibilità (Gulpease) ≥ 40",
      ];
      const checks: Check[] = labels.map(label => ({ ok: false, label }));
      return {
        checks, score: 0, words: 0,
        dens: { hits: 0, density: 0 },
        links: { internal: 0, external: 0, total: 0 },
        imgs: { count: 0, withAlt: 0, altWithKw: 0 },
        heads: { h2: 0, h3: 0 },
        gul: 0
      };
    }

    const fp = firstParagraph(md);
    const words = countWords(md);
    const dens = keywordDensity(md, kw);
    const links = countLinksMd(md);
    const imgs = countImagesMd(md, kw);
    const heads = countHeadings(md);
    const gul = words > 0 ? gulpeaseIndex(md) : 0;

    const checks: Check[] = [
      { ok: !!t, label: "Titolo presente" },
      { ok: lenOk(st || t, 35, 60) && !!(st || t).trim(), label: "SEO Title 35–60 caratteri" },
      { ok: lenOk(sd, 80, 160) && !!sd, label: "Meta Description 80–160 caratteri" },
      { ok: !!kw, label: "Keyword focus impostata" },
      { ok: !!kw && t.toLowerCase().includes(kw.toLowerCase()), label: "Keyword nel titolo" },
      { ok: !!kw && s.toLowerCase().includes(kw.toLowerCase()), label: "Keyword nello slug" },
      { ok: !!kw && fp.toLowerCase().includes(kw.toLowerCase()), label: "Keyword nel primo paragrafo" },
      { ok: words >= 300, label: "Lunghezza contenuto ≥ 300 parole" },
      { ok: !!kw && words > 0 && dens.density >= 0.5 && dens.density <= 2.5, label: `Densità keyword 0.5–2.5% (attuale ${isFinite(dens.density) ? dens.density.toFixed(2) : 0}%)` },
      { ok: heads.h2 >= 2, label: "Almeno 2 H2" },
      { ok: heads.h3 >= 1 || heads.h2 >= 3, label: "Struttura con sottosezioni (H3 o più H2)" },
      { ok: links.internal >= 1, label: "≥ 1 link interno" },
      { ok: links.external >= 1, label: "≥ 1 link esterno" },
      { ok: imgs.count >= 1, label: "≥ 1 immagine" },
      { ok: imgs.count > 0 && imgs.withAlt >= imgs.count, label: "Alt per tutte le immagini" },
      { ok: !!kw && imgs.altWithKw >= 1, label: "Almeno un alt con keyword" },
      { ok: words > 0 && gul >= 40, label: `Leggibilità (Gulpease) ≥ 40 (attuale ${gul})` },
    ];

    const score = Math.round((checks.filter(c => c.ok).length / checks.length) * 100);
    return { checks, score, words, dens: { hits: dens.hits, density: dens.density }, links, imgs, heads, gul };
  }, [title, slug, contentMd, seoTitle, seoDescription, focusKw]);

  useEffect(() => {
    if (onScoreChange) onScoreChange(data.score, data.checks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.score, JSON.stringify(data.checks)]);

  return (
    <div className="border rounded-2xl p-4 bg-white grid gap-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Assistente SEO</h3>
        <span className="text-sm px-2 py-1 rounded-full border">Score: {data.score}%</span>
      </div>
      <div className="text-sm grid gap-1">
        <p>Parole: <strong>{data.words}</strong> · Densità KW: <strong>{isFinite(data.dens.density) ? data.dens.density.toFixed(2) : 0}%</strong> · Gulpease: <strong>{data.gul}</strong></p>
      </div>
      <ul className="grid gap-1 text-sm">
        {data.checks.map((c, i) => (
          <li key={i} className={c.ok ? "text-green-700" : "text-gray-800"}>
            {c.ok ? "✓" : "•"} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}