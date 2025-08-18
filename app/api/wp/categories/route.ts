import { NextResponse } from "next/server";

export async function GET() {
  const url = `${process.env.WP_URL}/wp-json/wp/v2/categories?per_page=100`;
  const auth = Buffer.from(
    `${process.env.WP_USER}:${process.env.WP_APP_PASS}`
  ).toString("base64");

  const res = await fetch(url, {
    headers: { Authorization: `Basic ${auth}` },
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Errore nel recupero categorie" }, { status: 500 });
  }

  const data = await res.json();
  return NextResponse.json(data);
}