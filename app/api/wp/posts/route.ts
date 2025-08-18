// app/api/wp/posts/route.ts
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const base = process.env.WORDPRESS_BASE_URL;
    const user = process.env.WP_USERNAME;
    const pass = process.env.WP_APP_PASSWORD;

    if (!base || !user || !pass) {
      return NextResponse.json(
        { error: "ENV mancanti: WORDPRESS_BASE_URL / WP_USERNAME / WP_APP_PASSWORD" },
        { status: 500 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const perPage = parseInt(searchParams.get("per_page") || "20");
    const search = searchParams.get("search") || "";
    const status = (searchParams.get("status") || "any").toLowerCase(); // "publish" | "draft" | "any"

    const auth = "Basic " + Buffer.from(`${user}:${pass}`).toString("base64");

    const qs = new URLSearchParams({
      page: String(page),
      per_page: String(perPage),
      _fields: "id,date,modified,status,link,title",
      orderby: "date",
      order: "desc",
      context: "edit", // necessario per vedere bozze con auth
      ...(search ? { search } : {}),
    });

    // WP non accetta "any": se è publish/draft lo passiamo, altrimenti lo omettiamo
    if (status === "publish" || status === "draft") qs.set("status", status);

    const url = `${base}/wp-json/wp/v2/posts?${qs.toString()}`;
    const r = await fetch(url, {
      headers: { Authorization: auth },
      cache: "no-store",
    });

    const txt = await r.text();
    if (!r.ok) {
      return NextResponse.json(
        { error: `WP ${r.status} ${r.statusText}\nURL: ${url}\nBody: ${txt}` },
        { status: r.status }
      );
    }

    const items = JSON.parse(txt);
    const total = Number(r.headers.get("X-WP-Total") || "0");
    const totalPages = Number(r.headers.get("X-WP-TotalPages") || "1");

    return NextResponse.json({ items, total, totalPages, page, perPage });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || String(e) }, { status: 500 });
  }
}