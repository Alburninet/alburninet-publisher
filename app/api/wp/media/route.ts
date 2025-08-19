import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

// Legge anche alias comuni per compatibilità
const WP_URL = process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL;
const WP_USER = process.env.WP_USER;
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || process.env.WP_APP_PASS;

function assertEnv() {
  const missing: string[] = [];
  if (!WP_URL) missing.push("WP_URL (o NEXT_PUBLIC_WP_URL)");
  if (!WP_USER) missing.push("WP_USER");
  if (!WP_APP_PASSWORD) missing.push("WP_APP_PASSWORD (o WP_APP_PASS)");
  if (missing.length) {
    throw new Error(
      "Config mancante: imposta le variabili " + missing.join(", ")
    );
  }
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

  const totalPages = Number(res.headers.get("X-WP-TotalPages") || 0);
  const data = text ? JSON.parse(text) : null;
  return { data, totalPages };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const perPage = Math.min(100, Math.max(1, parseInt(searchParams.get("per_page") || "24", 10)));
    const mediaType = searchParams.get("media_type") || "image";

    const qs = new URLSearchParams();
    qs.set("page", String(page));
    qs.set("per_page", String(perPage));
    qs.set("media_type", mediaType);
    if (search) qs.set("search", search);

    const { data, totalPages } = await wpFetch(`/wp/v2/media?${qs.toString()}`, { method: "GET" });
    const hasMore = totalPages ? page < totalPages : Array.isArray(data) && data.length === perPage;

    return NextResponse.json({ ok: true, items: data || [], page, perPage, hasMore });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}