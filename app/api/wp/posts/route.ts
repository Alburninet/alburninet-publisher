// app/api/wp/posts/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getWpEnv() {
  const WP_URL =
    process.env.WP_URL ||
    process.env.NEXT_PUBLIC_WP_URL || // fallback eventuale
    "";
  const WP_USER = process.env.WP_USER || "";
  const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || "";
  return { WP_URL: WP_URL.replace(/\/$/, ""), WP_USER, WP_APP_PASSWORD };
}

function authHeader(user: string, appPass: string) {
  const token = Buffer.from(`${user}:${appPass}`).toString("base64");
  return `Basic ${token}`;
}

async function wpFetch(path: string, init?: RequestInit) {
  const { WP_URL, WP_USER, WP_APP_PASSWORD } = getWpEnv();
  if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "Config mancante: imposta WP_URL, WP_USER, WP_APP_PASSWORD nelle env.",
      },
      { status: 500 }
    );
  }

  const url = `${WP_URL}${path.startsWith("/") ? "" : "/"}${path}`;
  const headers = new Headers(init?.headers as any);
  headers.set("Authorization", authHeader(WP_USER, WP_APP_PASSWORD));
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...init,
    headers,
  });

  const text = await res.text();
  let data: any = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    return NextResponse.json(
      {
        ok: false,
        status: res.status,
        error: data?.message || data?.raw || res.statusText,
      },
      { status: res.status }
    );
  }

  return NextResponse.json(data);
}

/** Elenco articoli: /api/wp/posts?status=draft|publish&page=1&per_page=20 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status =
    (searchParams.get("status") as "draft" | "publish" | null) || "publish";
  const page = Number(searchParams.get("page") || 1);
  const per_page = Number(searchParams.get("per_page") || 20);

  return wpFetch(
    `/wp-json/wp/v2/posts?status=${encodeURIComponent(
      status
    )}&page=${page}&per_page=${per_page}&_fields=id,date,modified,status,link,title,excerpt`
  );
}

/** Creazione/SALVATAGGIO articolo */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const {
    status = "draft",
    title,
    excerpt,
    content,
    categories = [],
    tags = [],
    featured_media,
  } = body || {};

  // Validazioni minime
  if (!title || !content) {
    return NextResponse.json(
      { ok: false, error: "Titolo e contenuto sono obbligatori." },
      { status: 400 }
    );
  }

  // Costruisco il payload WP
  const payload: any = {
    status, // "draft" | "publish"
    title,
    content,
    excerpt,
    categories,
    tags,
  };
  if (featured_media) payload.featured_media = featured_media;

  return wpFetch(`/wp-json/wp/v2/posts`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/** (opzionale) Preflight per sicurezza: evita 405 sui CORS locali */
export async function OPTIONS() {
  return NextResponse.json({ ok: true });
}