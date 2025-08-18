// lib/seo.ts
export function slugify(str: string) {
  return (str || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // accenti
    .replace(/&/g, " e ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function firstParagraph(md: string) {
  const lines = (md || "").split(/\n+/).map(l => l.trim());
  return lines.find(l => l.length > 0) || "";
}

export function clamp(str: string, max = 160) {
  const s = (str || "").trim().replace(/\s+/g, " ");
  return s.length <= max ? s : s.slice(0, max - 1).trimEnd() + "…";
}

// Meta description proposta dal primo paragrafo
export function suggestMetaDescription(md: string) {
  return clamp(firstParagraph(md), 160);
}

// Conteggio parole semplice
export function countWords(text: string) {
  return (text || "").trim().split(/\s+/).filter(Boolean).length;
}

// Densità keyword (parole intere)
export function keywordDensity(text: string, kw: string) {
  const words = (text || "").toLowerCase().match(/\b[\p{L}\p{N}]+\b/gu) || [];
  const total = words.length || 1;
  const term = (kw || "").trim().toLowerCase();
  if (!term) return { total, hits: 0, density: 0 };
  const hits = words.filter(w => w === term).length;
  return { total, hits, density: (hits / total) * 100 };
}

// Conta link markdown
export function countLinksMd(md: string) {
  const links = md.match(/\[[^\]]+\]\(([^)]+)\)/g) || [];
  let internal = 0, external = 0;
  for (const l of links) {
    const m = l.match(/\(([^)]+)\)/);
    const url = m?.[1] || "";
    if (/^https?:\/\//i.test(url)) external++;
    else internal++;
  }
  return { internal, external, total: links.length };
}

// Conta immagini markdown e alt
export function countImagesMd(md: string, kw?: string) {
  const imgs = md.match(/!\[([^\]]*)\]\(([^)]+)\)/g) || [];
  const withAlt = imgs.filter(x => /!\[[^\]]+\]/.test(x)).length;
  const altWithKw = kw
    ? imgs.filter(x => {
        const m = x.match(/!\[([^\]]*)\]/);
        return (m?.[1] || "").toLowerCase().includes(kw.toLowerCase());
      }).length
    : 0;
  return { count: imgs.length, withAlt, altWithKw };
}

// Heading H2/H3 nel markdown (#, ##, ###)
export function countHeadings(md: string) {
  const h2 = (md.match(/^\s*##\s+/gm) || []).length;
  const h3 = (md.match(/^\s*###\s+/gm) || []).length;
  return { h2, h3 };
}

// Leggibilità (Indice di Gulpease) per ITA
export function gulpeaseIndex(text: string) {
  const T = (text || "").replace(/\s+/g, " ").trim();
  const L = (T.match(/[a-zA-Zà-ùÀ-Ù]/g) || []).length; // lettere
  const P = (T.match(/[.!?]+/g) || []).length || 1;     // frasi
  const W = countWords(T) || 1;                         // parole
  const I = 89 + (300 * P - 10 * L) / W;
  return Math.max(0, Math.min(100, Math.round(I)));
}