import { NextRequest, NextResponse } from "next/server";

const WP_URL = (process.env.WP_URL || process.env.NEXT_PUBLIC_WP_URL || "").replace(/\/$/, "");
const WP_USER = process.env.WP_USER || "";
const WP_APP_PASSWORD = process.env.WP_APP_PASSWORD || "";

async function wpRequest(path: string, init: RequestInit = {}) {
  if (!WP_URL || !WP_USER || !WP_APP_PASSWORD) {
    return NextResponse.json(
      { ok: false, error: "Config mancante: WP_URL/WP_USER/WP_APP_PASSWORD" },
      { status: 500 }
    ) as any;
  }
  const url = `${WP_URL}${path}`;
  const auth = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");
  const headers: Record<string, string> = {
    Accept: "application/json",
    Authorization: `Basic ${auth}`,
    ...(init.headers as any),
  };
  const res = await fetch(url, { ...init, headers, cache: "no-store" });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    // riporta l’errore di WP per debug
    throw new Error(`WP ${res.status}: ${text || res.statusText}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// DELETE /api/wp/media/:id  →  DELETE https://site/wp-json/wp/v2/media/:id?force=true
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const idNum = Number(params.id);
    if (!idNum) {
      return NextResponse.json({ ok: false, error: "ID non valido" }, { status: 400 });
    }

    const data = await wpRequest(`/wp-json/wp/v2/media/${idNum}?force=true`, {
      method: "DELETE",
    });

    return NextResponse.json({ ok: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || "Errore eliminazione" },
      { status: 500 }
    );
  }
}