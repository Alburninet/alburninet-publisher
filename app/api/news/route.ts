import { NextResponse } from "next/server";

export type FeedSource = {
  key: string;
  name: string;
  url: string;
  group?: "locale" | "national" | "world" | "custom";
};

const DEFAULTS: FeedSource[] = [
  { key: "salernotoday", name: "SalernoToday", url: process.env.FEED_SALERNO_TODAY || "https://www.salernotoday.it/rss", group: "locale" },
  { key: "ansa-top",     name: "ANSA",         url: process.env.FEED_ANSA_TOP     || "https://www.ansa.it/sito/ansait_rss.xml", group: "national" },
  { key: "bbc-world",    name: "BBC World",    url: process.env.FEED_BBC_WORLD    || "https://feeds.bbci.co.uk/news/world/rss.xml", group: "world" },
];

// Helpers parsing
function extractTag(block: string, tag: string) {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const m = block.match(re);
  if (!m) return "";
  let s = m[1] || "";
  s = s.replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "");
  return s.trim();
}
function matchAttr(tagBlock: string, attr: string) {
  const re = new RegExp(`${attr}\\s*=\\s*"(.*?)"`, "i");
  const m = tagBlock.match(re);
  return m ? m[1] : "";
}
function firstMatch(re: RegExp, s: string) {
  const m = s.match(re);
  return m ? m[1] : "";
}
function extractImageFromItem(block: string) {
  const enclosure = block.match(/<enclosure\s+[^>]*>/gi) || [];
  for (const enc of enclosure) {
    const type = matchAttr(enc, "type");
    const url = matchAttr(enc, "url");
    if (url && /^image\//i.test(type || "")) return url;
  }
  const medias = block.match(/<media:(?:content|thumbnail)\b[^>]*>/gi) || [];
  for (const m of medias) {
    const url = matchAttr(m, "url");
    if (url) return url;
  }
  const description = extractTag(block, "description");
  const content = extractTag(block, "content:encoded");
  const html = description + "\n" + content;
  const img = firstMatch(/<img[^>]+src=["']([^"']+)["']/i, html);
  if (img) return img;
  return "";
}
function parseRss(xml: string) {
  const items: any[] = [];
  const parts = xml.split(/<item[\s>]/i);
  parts.shift();
  for (const p of parts) {
    const block = "<item " + p;
    const title = extractTag(block, "title");
    const link = extractTag(block, "link") || extractTag(block, "guid");
    const pubDate = extractTag(block, "pubDate") || extractTag(block, "updated");
    const category = extractTag(block, "category");
    const imageUrl = extractImageFromItem(block);
    items.push({
      title,
      link,
      pubDateISO: pubDate ? new Date(pubDate).toISOString() : undefined,
      category,
      imageUrl,
    });
  }
  return items;
}

async function fetchFeeds(sources: FeedSource[]) {
  const results = await Promise.all(
    sources.map(async (f) => {
      try {
        const res = await fetch(f.url, { cache: "no-store" });
        const text = await res.text();
        const items = parseRss(text).filter((x) => x.title && x.link);
        return { key: f.key, name: f.name, group: f.group || "custom", items: items.slice(0, 20) };
      } catch {
        return { key: f.key, name: f.name, group: f.group || "custom", items: [] as any[] };
      }
    })
  );
  return NextResponse.json({ ok: true, feeds: results });
}

export async function GET() {
  try {
    return await fetchFeeds(DEFAULTS);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore generico" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const sources = (body?.sources as FeedSource[]) || [];
    const valid = sources.filter((s) => s && s.url && s.name && s.key);
    if (!valid.length) {
      // fallback ai default se non arrivano sorgenti valide
      return await fetchFeeds(DEFAULTS);
    }
    return await fetchFeeds(valid);
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Errore generico" }, { status: 500 });
  }
}