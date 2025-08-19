import { NextRequest, NextResponse } from "next/server";

export const revalidate = 0;
export const dynamic = "force-dynamic";

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

export async function POST(req: NextRequest) {
  try {
    assertEnv();
    const base = (WP_URL as string).replace(/\/+$/, "");
    const url = `${base}/wp-json/wp/v2/media`;
    const auth = Buffer.from(`${WP_USER}:${WP_APP_PASSWORD}`).toString("base64");

    const form = await req.formData();
    const file = form.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "File mancante (campo 'file')." },
        { status: 400 }
      );
    }

    // Converti File (Web) in Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Disposition": `attachment; filename="${file.name || "upload.jpg"}"`,
        "Content-Type": file.type || "application/octet-stream",
        Accept: "application/json",
      },
      body: buffer,
      cache: "no-store",
    });

    const text = await res.text();
    if (!res.ok) {
      throw new Error(`WP ${res.status} ${res.statusText}: ${text}`);
    }

    const json = text ? JSON.parse(text) : null;
    return NextResponse.json(json);
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}