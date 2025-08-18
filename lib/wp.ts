// lib/wp.ts
const baseUrl = process.env.WORDPRESS_BASE_URL;
const username = process.env.WP_USERNAME;
const appPassword = process.env.WP_APP_PASSWORD;

const authHeader =
  "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");

export async function wpFetch(path: string, init: RequestInit = {}) {
  const url = `${baseUrl}${path}`;
  const res = await fetch(url, {
    ...init,
    headers: { Authorization: authHeader, ...(init.headers || {}) },
    cache: "no-store",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`[WP] ${res.status} ${res.statusText}: ${text}`);
  }
  return res;
}

export async function createPost(payload: any) {
  const res = await wpFetch("/wp-json/wp/v2/posts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function searchTaxonomy(
  type: "categories" | "tags",
  q: string,
  perPage = 100
) {
  const res = await wpFetch(
    `/wp-json/wp/v2/${type}?search=${encodeURIComponent(q)}&per_page=${perPage}`
  );
  return res.json();
}

/** ⬅️ AGGIUNTA: serve alla route POST /api/wp/taxonomy */
export async function createTaxonomy(
  type: "categories" | "tags",
  name: string,
  parent?: number
) {
  const payload: any = { name };
  if (parent) payload.parent = parent;

  const res = await wpFetch(`/wp-json/wp/v2/${type}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}