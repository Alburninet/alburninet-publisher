// app/api/wp/posts/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Legge le ENV richieste per parlare con WordPress */
function getWpEnv() {
  const WP_URL =
    process.env.WP_URL ||
    process.env.NEXT_PUBLIC_WP_URL ||
    "";
  const WP_USER = process.env.WP_USER || "";
  const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || "";
  return { WP_URL: WP_URL.replace(/\/$/, ""), WP_USER, WP_APP_PASSWORD };
}

function authHeader(user: string, appPass: string) {
  const token = Buffer.from(`${user}:${appPass}`).toString("base64");
  return `Basic ${token}`;
}

/** Piccolo proxy fetch verso WP con Basic Auth e risposta sempre JSON */
async function wpFetch(path: string, init?: RequestInit) {
  const { WP_URL, WP_USER, WP_APP_PASSWORD } = getWpEnv();
  if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "Config mancante: imposta WP_URL, WP_USER, WP_APP_PASSWORD nelle env." },
      { status: 500 }
    );
  }

  const url = `${WP_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(init?.headers as any);
  headers.set("Authorization", authHeader(WP_USER, WP_APP_PASSWORD));
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, { ...init, headers });

  const text = await res.text();
  let data: any = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

  if (!res.ok) {
    return NextResponse.json(
      { ok: false, status: res.status, error: data?.message || data?.raw || res.statusText },
      { status: res.status }
    );
  }
  return NextResponse.json(data);
}

/** GET elenco articoli: /api/wp/posts?status=draft|publish&page=1&per_page=20 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = (searchParams.get("status") as "draft" | "publish" | null) || "publish";
  const page = Number(searchParams.get("page") || 1);
  const per_page = Number(searchParams.get("per_page") || 20);

  return wpFetch(
    `/wp-json/wp/v2/posts?status=${encodeURIComponent(status)}&page=${page}&per_page=${per_page}&_fields=id,date,modified,status,link,title,excerpt`
  );
}

/** Normalizza booleani a “1”/“0” come atteso da Yoast per alcuni flag */
function boolToYoastFlag(v: unknown): "1" | "0" {
  return v === true || v === "1" || v === 1 ? "1" : "0";
}

/** POST crea/salva articolo; accetta anche campi “amichevoli” per Yoast */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Campi standard WP
  const {
    status = "draft",
    title,
    excerpt,
    content,
    categories = [],
    tags = [],
    featured_media,

    // —— Campi “amichevoli” lato client (facoltativi) ——
    seoTitle,                 // -> _yoast_wpseo_title
    metaDesc,                 // -> _yoast_wpseo_metadesc
    focusKw,                  // -> _yoast_wpseo_focuskw
    canonical,                // -> _yoast_wpseo_canonical
    primaryCategoryId,        // -> _yoast_wpseo_primary_category (ID)
    noindex,                  // -> _yoast_wpseo_meta-robots-noindex ("1"/"0")
    nofollow,                 // -> _yoast_wpseo_meta-robots-nofollow ("1"/"0")
    isCornerstone,            // -> _yoast_wpseo_is_cornerstone e _yoast_wpseo_cornerstone ("1"/"0")

    // Pass-through diretto opzionale: meta: { _yoast_wpseo_...: ... }
    meta,
  } = body || {};

  // Validazioni minime
  if (!title || !content) {
    return NextResponse.json(
      { ok: false, error: "Titolo e contenuto sono obbligatori." },
      { status: 400 }
    );
  }

  // Costruzione payload base
  const payload: any = {
    status,         // "draft" | "publish"
    title,
    content,
    excerpt,
    categories,
    tags,
  };
  if (featured_media) payload.featured_media = featured_media;

  // Compone i meta Yoast se presenti (richiede il plugin “Extended” attivo)
  const metaOut: Record<string, any> = { ...(meta || {}) };

  if (typeof seoTitle === "string")     metaOut["_yoast_wpseo_title"] = seoTitle;
  if (typeof metaDesc === "string")     metaOut["_yoast_wpseo_metadesc"] = metaDesc;
  if (typeof focusKw === "string")      metaOut["_yoast_wpseo_focuskw"] = focusKw;
  if (typeof canonical === "string")    metaOut["_yoast_wpseo_canonical"] = canonical;

  if (primaryCategoryId !== undefined && primaryCategoryId !== null && primaryCategoryId !== "") {
    const pid = Number(primaryCategoryId);
    if (!Number.isNaN(pid)) metaOut["_yoast_wpseo_primary_category"] = pid;
  }

  if (noindex !== undefined)   metaOut["_yoast_wpseo_meta-robots-noindex"] = boolToYoastFlag(noindex);
  if (nofollow !== undefined)  metaOut["_yoast_wpseo_meta-robots-nofollow"] = boolToYoastFlag(nofollow);

  if (isCornerstone !== undefined) {
    const flag = boolToYoastFlag(isCornerstone);
    metaOut["_yoast_wpseo_is_cornerstone"] = flag;  // variante moderna
    metaOut["_yoast_wpseo_cornerstone"] = flag;     // variante storica (compat)
  }

  if (Object.keys(metaOut).length) {
    payload.meta = metaOut;
  }

  return wpFetch(`/wp-json/wp/v2/posts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** Preflight (utile in locale) */
export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}