import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

// Usa le stesse env delle altre route
const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL;
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || process.env.WP_APP_PASS;

function assertEnv() {
  const missing: string[] = [];
  if (!WP_URL) missing.push("WP_URL (o NEXT_PUBLIC_WP_URL)");
  if (!WP_USER) missing.push("WP_USER");
  if (!WP_APP_PASSWORD) missing.push("WP_APP_PASSWORD (o WP_APP_PASS)");
  if (missing.length) throw new Error("Config mancante: " + missing.join(", "));
}

async function wpFetch(path: string, init: RequestInit = {}) {
  assertEnv();
  const base = (WP_URL as string).replace(/\/+$/, "");
  const url = `${base}/wp-json${path}`;
  const auth = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");

  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Basic ${auth}`,
      Accept: "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`WP ${res.status} ${res.statusText}: ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

export async function POST(req: NextRequest) {
  try {
    // Il client invia FormData
    const fd = await req.formData();

    const title = String(fd.get("title") || "");
    const content = String(fd.get("content") || "");
    const status = (String(fd.get("status") || "draft") as
      | "draft"
      | "publish"
      | "pending"
      | "future");
    const excerpt = String(fd.get("excerpt") || "");
    const slug = String(fd.get("slug") || "");

    const categories = String(fd.get("categories") || ""); // "1,2,3"
    const tags = String(fd.get("tags") || ""); // "4,5,6"
    const featuredMedia = String(fd.get("featured_media") || ""); // id numerico opzionale

    // Mappa ai campi WP
    const body: any = {
      title,
      content,
      status,
      excerpt,
    };
    if (slug) body.slug = slug;
    if (categories) {
      body.categories = categories
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => Number.isFinite(n));
    }
    if (tags) {
      body.tags = tags
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => Number.isFinite(n));
    }
    if (featuredMedia) {
      const id = parseInt(featuredMedia, 10);
      if (Number.isFinite(id)) body.featured_media = id;
    }

    // NOTA: impostare i meta di Yoast (title/description) via REST richiede che i meta
    // siano registrati per l'API. Se il tuo WP li ha registrati, puoi decommentare:
    // const seoTitle = String(fd.get("seo_title") || "");
    // const seoDescription = String(fd.get("seo_description") || "");
    // if (seoTitle || seoDescription) {
    //   body.meta = {
    //     ...(seoTitle ? { _yoast_wpseo_title: seoTitle } : {}),
    //     ...(seoDescription ? { _yoast_wpseo_metadesc: seoDescription } : {}),
    //   };
    // }

    const post = await wpFetch(`/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    return NextResponse.json({ ok: true, post });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}