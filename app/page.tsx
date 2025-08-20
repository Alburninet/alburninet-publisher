"use client";

import React from "react";
import NewsSourcesModal, { FeedSource } from "@/components/NewsSourcesModal";

/* ========= Tipi ========= */
type NewsItem = {
  title: string;
  link: string;
  pubDateISO?: string;
  category?: string;
  imageUrl?: string;
};

type FeedPayload = {
  key: string;
  name: string;
  group?: GroupKey;
  items: NewsItem[];
};

type NewsResponse = {
  ok: boolean;
  feeds: FeedPayload[];
  error?: string;
};

type CountState = {
  published: number;
  drafts: number;
  loading: boolean;
  error?: string | null;
};

/** Gruppi/colonne supportate (inclusi “Personalizzati”). */
type GroupKey = "locale" | "national" | "world" | "custom";

/* ========= Costanti ========= */
const LS_SOURCES = "alburninet_feed_sources";
const LS_FILTERS = "alburninet_feed_filters";
const LS_PINS = "alburninet_pins";
const INITIAL_SHOW = 20;
const STEP_SHOW = 20;

// parole chiave da evidenziare
const KEYWORDS = ["alburni", "salerno", "cilento", "campania", "paestum", "tanagro"];

/* ========= Helper ========= */
function timeAgo(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso).getTime();
  if (isNaN(d)) return "";
  const diff = Math.floor((Date.now() - d) / 1000);
  if (diff < 60) return `${diff}s fa`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m fa`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h fa`;
  return `${Math.floor(diff / 86400)}g fa`;
}

function isFresh(iso?: string) {
  if (!iso) return { fresh30: false, fresh60: false };
  const ms = Date.now() - new Date(iso).getTime();
  const fresh30 = ms <= 30 * 60 * 1000;
  const fresh60 = ms <= 60 * 60 * 1000;
  return { fresh30, fresh60 };
}

// normalizza titolo per clustering
function normalizeTitle(t: string) {
  return (t || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
// chiave cluster grezza: prime 6 parole normalizzate
function clusterKey(t: string) {
  const words = normalizeTitle(t).split("").length
    ? normalizeTitle(t).split(" ").filter(Boolean)
    : [];
  return words.slice(0, 6).join(" ");
}

// evidenzia parole chiave nel titolo (badge)
function keywordBadges(title: string) {
  const t = (title || "").toLowerCase();
  const hits = KEYWORDS.filter((k) => t.includes(k.toLowerCase()));
  return hits.slice(0, 3);
}

/* ========= Card singola (sposta qui gli state!) ========= */
function NewsCard({
  n,
  label,
  onPin,
  onSummarize,
}: {
  n: any;
  label: string;
  onPin: (item: NewsItem) => void;
  onSummarize: (
    item: NewsItem,
    setSummary: (s: string) => void,
    setErr: (e: string | null) => void
  ) => Promise<void>;
}) {
  const [summary, setSummary] = React.useState<string>("");
  const [sumErr, setSumErr] = React.useState<string | null>(null);

  const fresh = isFresh(n.pubDateISO);
  const kw = keywordBadges(n.title || "");

  return (
    <li
      className={`rounded-lg border p-3 hover:bg-gray-50 transition ${
        fresh.fresh30 ? "ring-2 ring-blue-300" : fresh.fresh60 ? "border-blue-300" : ""
      }`}
    >
      <div className="flex gap-3">
        {/* Thumb */}
        {n.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={n.imageUrl}
            alt=""
            className="w-24 h-24 object-cover rounded-md flex-shrink-0 border"
            loading="lazy"
          />
        ) : (
          <div className="w-24 h-24 rounded-md bg-gray-100 border flex items-center justify-center text-xs text-gray-400 flex-shrink-0">
            ——
          </div>
        )}

        {/* Testo */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            {/* badge fonte */}
            <span className="inline-flex items-center px-2 py-0.5 rounded-full border text-xs">
              {n.__sourceName || label}
            </span>
            {/* badge cluster */}
            {n.__clusterSize > 1 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-xs text-purple-700">
                +{n.__clusterSize - 1} fonti
              </span>
            )}
            {/* badge keywords */}
            {kw.map((k) => (
              <span
                key={k}
                className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-xs text-amber-700"
              >
                {k}
              </span>
            ))}
            {/* freschezza */}
            {fresh.fresh30 && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-xs text-blue-700">
                Ultimi 30'
              </span>
            )}
          </div>

          <div className="mt-1 font-medium line-clamp-2" title={n.title}>
            {n.title}
          </div>
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-2 flex-wrap">
            {n.pubDateISO && <span>{timeAgo(n.pubDateISO)}</span>}
            {n.category && <span className="text-gray-400">• {n.category}</span>}
          </div>

          {/* Snippet AI opzionale */}
          {summary ? (
            <p className="mt-2 text-sm text-gray-700 line-clamp-3">{summary}</p>
          ) : sumErr ? (
            <p className="mt-2 text-sm text-red-600">{sumErr}</p>
          ) : null}

          <div className="mt-2 flex flex-wrap gap-2">
            <a
              href={n.link}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
            >
              Apri fonte
            </a>
            <button
              type="button"
              className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
              onClick={() => {
                localStorage.setItem(
                  "alburninet_prefill",
                  JSON.stringify({
                    title: n.title || "",
                    excerpt: "",
                    contentHtml: `<p>Fonte: <a href="${n.link}" target="_blank" rel="nofollow noopener">${n.link}</a></p><p><br/></p>`,
                    featuredMediaUrl: n.imageUrl || undefined,
                    seoTitle: n.title || "",
                    canonical: n.link || "",
                    focusKw: "",
                    tags: [],
                  })
                );
                window.location.href = "/compose";
              }}
            >
              Crea bozza
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
              onClick={() => {
                localStorage.setItem(
                  "alburninet_ai_idea",
                  JSON.stringify({
                    topic: n.title,
                    sourceUrl: n.link,
                    imageUrl: n.imageUrl || undefined,
                  })
                );
                window.location.href = "/compose";
              }}
            >
              Elabora con AI
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
              onClick={() => onPin(n)}
            >
              Salva per dopo
            </button>
            <button
              type="button"
              className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
              onClick={() => onSummarize(n, setSummary, setSumErr)}
              title="Riassunto flash AI"
            >
              Snippet AI
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}

/* ========= Pagina principale ========= */
export default function HomeDashboard() {
  const [feeds, setFeeds] = React.useState<FeedPayload[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);

  const [counts, setCounts] = React.useState<CountState>({
    published: 0,
    drafts: 0,
    loading: true,
  });

  const [sourcesOpen, setSourcesOpen] = React.useState(false);
  const [currentSources, setCurrentSources] = React.useState<FeedSource[] | null>(null);

  // Filtri per fonte per gruppo
  const [enabledByGroup, setEnabledByGroup] = React.useState<
    Record<GroupKey, Set<string>>
  >({
    locale: new Set<string>(),
    national: new Set<string>(),
    world: new Set<string>(),
    custom: new Set<string>(),
  });

  // Quanti item mostrare per gruppo (per “Mostra altri” & autoload)
  const [showCount, setShowCount] = React.useState<Record<GroupKey, number>>({
    locale: INITIAL_SHOW,
    national: INITIAL_SHOW,
    world: INITIAL_SHOW,
    custom: INITIAL_SHOW,
  });

  // Pinned
  const [pins, setPins] = React.useState<NewsItem[]>([]);

  // sentinelle per infinite scroll
  const sentinels = {
    locale: React.useRef<HTMLDivElement | null>(null),
    national: React.useRef<HTMLDivElement | null>(null),
    world: React.useRef<HTMLDivElement | null>(null),
    custom: React.useRef<HTMLDivElement | null>(null),
  };

  /* ====== Caricamento feed ====== */
  async function loadFeeds() {
    try {
      setLoading(true);
      setErr(null);
      const raw = typeof window !== "undefined" ? localStorage.getItem(LS_SOURCES) : null;
      if (raw) {
        const sources: FeedSource[] = JSON.parse(raw);
        setCurrentSources(sources);
        const res = await fetch("/api/news", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sources }),
        });
        const data: NewsResponse = await res.json();
        if (!data.ok) setErr(data.error || "Errore caricamento feed");
        setFeeds(data.feeds || []);
      } else {
        setCurrentSources(null);
        const res = await fetch("/api/news", { cache: "no-store" });
        const data: NewsResponse = await res.json();
        if (!data.ok) setErr(data.error || "Errore caricamento feed");
        setFeeds(data.feeds || []);
      }
    } catch (e: any) {
      setErr(e?.message || "Errore rete");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    loadFeeds();
  }, []);

  // carica filtri salvati
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_FILTERS);
      if (raw) {
        const parsed: Record<GroupKey, string[]> = JSON.parse(raw);
        setEnabledByGroup({
          locale: new Set(parsed.locale || []),
          national: new Set(parsed.national || []),
          world: new Set(parsed.world || []),
          custom: new Set(parsed.custom || []),
        });
      }
    } catch {}
  }, []);

  // quando i feed cambiano: se i set sono vuoti, abilita tutte le fonti disponibili per gruppo
  React.useEffect(() => {
    if (!feeds.length) return;
    setEnabledByGroup((prev) => {
      const next: Record<GroupKey, Set<string>> = {
        locale: new Set(prev.locale),
        national: new Set(prev.national),
        world: new Set(prev.world),
        custom: new Set(prev.custom),
      };
      (["locale", "national", "world", "custom"] as GroupKey[]).forEach((g) => {
        const keys = feeds.filter((f) => (f.group || "custom") === g).map((f) => f.key);
        if (keys.length && next[g].size === 0) {
          keys.forEach((k) => next[g].add(k));
        }
      });
      try {
        localStorage.setItem(
          LS_FILTERS,
          JSON.stringify({
            locale: Array.from(next.locale),
            national: Array.from(next.national),
            world: Array.from(next.world),
            custom: Array.from(next.custom),
          })
        );
      } catch {}
      return next;
    });
  }, [feeds]);

  // reimposta showCount quando ricarico feed
  React.useEffect(() => {
    setShowCount({
      locale: INITIAL_SHOW,
      national: INITIAL_SHOW,
      world: INITIAL_SHOW,
      custom: INITIAL_SHOW,
    });
  }, [feeds]);

  // carica pins
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_PINS);
      if (raw) {
        setPins(JSON.parse(raw));
      }
    } catch {}
  }, []);

  // conteggi WP
  React.useEffect(() => {
    let abort = false;
    (async () => {
      try {
        const [pub, draft] = await Promise.all([
          fetch("/api/wp/posts?status=publish&page=1", { cache: "no-store" })
            .then((r) => r.text())
            .then((t) => {
              let j: any = [];
              try { j = t ? JSON.parse(t) : []; } catch {}
              const arr = Array.isArray(j) ? j : j?.items || [];
              return arr.length || 0;
            }),
          fetch("/api/wp/posts?status=draft&page=1", { cache: "no-store" })
            .then((r) => r.text())
            .then((t) => {
              let j: any = [];
              try { j = t ? JSON.parse(t) : []; } catch {}
              const arr = Array.isArray(j) ? j : j?.items || [];
              return arr.length || 0;
            }),
        ]);
        if (abort) return;
        setCounts({ published: pub, drafts: draft, loading: false });
      } catch (e: any) {
        if (!abort)
          setCounts((s) => ({
            ...s,
            loading: false,
            error: e?.message || "Errore conteggi",
          }));
      }
    })();
    return () => { abort = true; };
  }, []);

  /* ====== Merge / Cluster / Filtri ====== */
  function mergedForGroup(group: GroupKey) {
    const packs = feeds.filter((f) => (f.group || "custom") === group);
    const activeKeys = enabledByGroup[group].size
      ? enabledByGroup[group]
      : new Set(packs.map((p) => p.key));
    const merged = packs
      .filter((p) => activeKeys.has(p.key))
      .flatMap((p) =>
        p.items.map((it) => ({
          ...it,
          __sourceKey: p.key,
          __sourceName: p.name,
          __group: group as GroupKey,
        }))
      );
    merged.sort((a, b) => {
      const ta = a.pubDateISO ? new Date(a.pubDateISO).getTime() : 0;
      const tb = b.pubDateISO ? new Date(b.pubDateISO).getTime() : 0;
      return tb - ta;
    });
    return merged;
  }

  function clusterItems(items: any[]) {
    const clusters = new Map<string, any[]>();
    for (const it of items) {
      const key = clusterKey(it.title || "");
      if (!clusters.has(key)) clusters.set(key, []);
      clusters.get(key)!.push(it);
    }
    const out: Array<{ head: any; others: any[] }> = [];
    clusters.forEach((arr) => {
      arr.sort((a, b) => {
        const ta = a.pubDateISO ? new Date(a.pubDateISO).getTime() : 0;
        const tb = b.pubDateISO ? new Date(b.pubDateISO).getTime() : 0;
        return tb - ta;
      });
      out.push({ head: arr[0], others: arr.slice(1) });
    });
    out.sort((a, b) => {
      const ta = a.head.pubDateISO ? new Date(a.head.pubDateISO).getTime() : 0;
      const tb = b.head.pubDateISO ? new Date(b.head.pubDateISO).getTime() : 0;
      return tb - ta;
    });
    return out;
  }

  function toggleSource(group: GroupKey, key: string) {
    setEnabledByGroup((prev) => {
      const copy = new Set(prev[group]);
      if (copy.has(key)) copy.delete(key);
      else copy.add(key);
      try {
        const toSave = {
          locale: Array.from(group === "locale" ? copy : prev.locale),
          national: Array.from(group === "national" ? copy : prev.national),
          world: Array.from(group === "world" ? copy : prev.world),
          custom: Array.from(group === "custom" ? copy : prev.custom),
        };
        localStorage.setItem(LS_FILTERS, JSON.stringify(toSave));
      } catch {}
      return { ...prev, [group]: copy };
    });
  }

  function resetFilters() {
    const packs = feeds.reduce<Record<GroupKey, string[]>>(
      (acc, p) => {
        const g = (p.group || "custom") as GroupKey;
        acc[g].push(p.key);
        return acc;
      },
      { locale: [], national: [], world: [], custom: [] }
    );
    setEnabledByGroup({
      locale: new Set(packs.locale),
      national: new Set(packs.national),
      world: new Set(packs.world),
      custom: new Set(packs.custom),
    });
    try {
      localStorage.setItem(LS_FILTERS, JSON.stringify(packs));
    } catch {}
  }

  function showMore(group: GroupKey) {
    setShowCount((s) => ({ ...s, [group]: s[group] + STEP_SHOW }));
  }

  // infinite scroll
  React.useEffect(() => {
    const groups: GroupKey[] = ["locale", "national", "world", "custom"];
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const id = (e.target as HTMLElement).dataset.group as GroupKey | undefined;
          if (!id) return;
          showMore(id);
        });
      },
      { rootMargin: "600px 0px" }
    );
    groups.forEach((g) => {
      const el = sentinels[g].current;
      if (el) {
        el.dataset.group = g;
        obs.observe(el);
      }
    });
    return () => obs.disconnect();
  }, []);

  // pin/unpin
  function pinItem(n: NewsItem) {
    setPins((prev) => {
      const exists = prev.find((x) => x.link === n.link);
      if (exists) return prev;
      const next = [n, ...prev].slice(0, 50);
      try { localStorage.setItem(LS_PINS, JSON.stringify(next)); } catch {}
      return next;
    });
  }
  function unpin(link: string) {
    setPins((prev) => {
      const next = prev.filter((x) => x.link !== link);
      try { localStorage.setItem(LS_PINS, JSON.stringify(next)); } catch {}
      return next;
    });
  }

  async function summarizeAI(
    n: NewsItem,
    setSummary: (s: string) => void,
    setErr: (e: string | null) => void
  ) {
    try {
      setErr(null);
      const res = await fetch("/api/ai/generate-article", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: `Riassumi in 2-3 frasi questa notizia: ${n.title}. Fonte: ${n.link}`,
        }),
      });
      const text = await res.text();
      const data = text ? JSON.parse(text) : {};
      const excerpt = data?.excerpt || data?.contentHtml || "";
      const clean = String(excerpt).replace(/<[^>]+>/g, "").trim();
      setSummary(clean || "Riassunto non disponibile.");
    } catch (e: any) {
      setErr(e?.message || "Errore AI");
    }
  }

  const columns: Array<{ key: GroupKey; label: string }> = [
    { key: "locale", label: "Locale" },
    { key: "national", label: "Nazionale" },
    { key: "world", label: "Internazionale" },
    ...(feeds.some((f) => (f.group || "custom") === "custom")
      ? ([{ key: "custom" as GroupKey, label: "Personalizzati" }] as Array<{
          key: GroupKey;
          label: string;
        }>)
      : []),
  ];

  /* ========= RENDER ========= */
  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header + Stats */}
        <div className="mb-6 flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Dashboard Editoriale</h1>
            <p className="text-gray-600">
              Spazio denso di spunti da fonti locali, nazionali, internazionali e personalizzate.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-xl shadow px-4 py-3">
              <div className="text-xs text-gray-500">Articoli pubblicati</div>
              <div className="text-xl font-semibold">
                {counts.loading ? "—" : counts.published}
              </div>
            </div>
            <div className="bg-white rounded-xl shadow px-4 py-3">
              <div className="text-xs text-gray-500">Bozze</div>
              <div className="text-xl font-semibold">
                {counts.loading ? "—" : counts.drafts}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSourcesOpen(true)}
                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                title="Scegli feed RSS"
              >
                Sorgenti
              </button>
              <button
                type="button"
                onClick={resetFilters}
                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
                title="Riattiva tutte le fonti"
              >
                Reset filtri
              </button>
            </div>
          </div>
        </div>

        {/* Barra “Pin per dopo” */}
        {pins.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Salvati per dopo</div>
              <div className="text-xs text-gray-500">{pins.length} elemento/i</div>
            </div>
            <div className="flex gap-3 overflow-x-auto">
              {pins.map((p) => (
                <div key={p.link} className="min-w-[220px] max-w-[260px] border rounded-lg p-2">
                  <div className="text-xs font-medium line-clamp-2">{p.title}</div>
                  <div className="mt-1 text-[11px] text-gray-500">{timeAgo(p.pubDateISO)}</div>
                  <div className="mt-2 flex gap-2">
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
                    >
                      Fonte
                    </a>
                    <button
                      className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
                      onClick={() => {
                        localStorage.setItem(
                          "alburninet_prefill",
                          JSON.stringify({
                            title: p.title || "",
                            excerpt: "",
                            contentHtml: `<p>Fonte: <a href="${p.link}" target="_blank" rel="nofollow noopener">${p.link}</a></p><p><br/></p>`,
                            featuredMediaUrl: p.imageUrl || undefined,
                            seoTitle: p.title || "",
                            canonical: p.link || "",
                            focusKw: "",
                            tags: [],
                          })
                        );
                        window.location.href = "/compose";
                      }}
                    >
                      Crea bozza
                    </button>
                    <button
                      className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-xs"
                      onClick={() => unpin(p.link!)}
                    >
                      Rimuovi
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {err && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        {/* Griglia colonne */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {columns.map(({ key, label }) => {
            const packs = feeds.filter((f) => (f.group || "custom") === key);
            const sourceKeys = packs.map((p) => p.key);
            const enabledSet =
              enabledByGroup[key].size > 0
                ? enabledByGroup[key]
                : new Set(sourceKeys);

            // merge + sort + filtri
            const merged = mergedForGroup(key).filter((it: any) =>
              (enabledSet as Set<string>).has(it.__sourceKey)
            );

            // clustering
            const clusters = clusterItems(merged);
            const flat: any[] = [];
            clusters.forEach((c) => {
              flat.push({ ...c.head, __clusterSize: (c.others?.length || 0) + 1 });
            });

            const toShow = flat.slice(0, showCount[key]);

            return (
              <section key={key} className="bg-white rounded-xl shadow p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">{label}</h2>
                  <div className="text-xs text-gray-500">
                    {(enabledSet as Set<string>).size || packs.length} fonte/e
                  </div>
                </div>

                {/* Filtri per fonte */}
                {packs.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {packs.map((p) => {
                      const active = (enabledSet as Set<string>).has(p.key);
                      return (
                        <label
                          key={p.key}
                          className={`inline-flex items-center gap-2 px-2 py-1 rounded-full border text-xs cursor-pointer ${
                            active ? "bg-black text-white border-black" : "bg-white"
                          }`}
                          title={p.name}
                        >
                          <input
                            type="checkbox"
                            className="hidden"
                            checked={active}
                            onChange={() => toggleSource(key, p.key)}
                          />
                          {p.name}
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Lista */}
                {loading ? (
                  <div className="text-sm text-gray-500">Caricamento…</div>
                ) : toShow.length === 0 ? (
                  <div className="text-sm text-gray-500">Nessuna notizia disponibile.</div>
                ) : (
                  <ul className="space-y-3">
                    {toShow.map((n: any, idx: number) => (
                      <NewsCard
                        key={(n.link || "") + idx}
                        n={n}
                        label={label}
                        onPin={pinItem}
                        onSummarize={summarizeAI}
                      />
                    ))}
                  </ul>
                )}

                {/* “Mostra altri” + sentinella per autoload */}
                <div className="mt-3 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => showMore(key)}
                    className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm"
                  >
                    Mostra altri
                  </button>
                  <div ref={sentinels[key]} className="h-1 w-1" />
                </div>
              </section>
            );
          })}
        </div>
      </div>

      {/* Modal Sorgenti */}
      <NewsSourcesModal
        open={sourcesOpen}
        onClose={() => setSourcesOpen(false)}
        initial={currentSources || undefined}
        onSave={(sources) => {
          try {
            localStorage.setItem(LS_SOURCES, JSON.stringify(sources));
          } catch {}
          loadFeeds();
        }}
      />
    </main>
  );
}