"use client";
export default function ArticlePreview({
  title,
  excerpt,
  html,
  featuredUrl,
}: {
  title: string;
  excerpt: string;
  html: string;
  featuredUrl?: string;
}) {
  return (
    <aside className="bg-white border rounded-2xl p-4 grid gap-3">
      <h3 className="font-semibold text-lg">Anteprima Articolo</h3>
      {featuredUrl && (
        <img src={featuredUrl} alt="" className="w-full h-40 object-cover rounded-lg border" />
      )}
      <div className="grid gap-2">
        <h2 className="text-xl font-bold">{title || "Titolo dell'articolo"}</h2>
        <p className="text-gray-600">{excerpt || "Estratto / meta description…"}</p>
      </div>
      <div className="border-t pt-3">
        <div
          className="prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: html || "<p>Contenuto dell'articolo…</p>" }}
        />
      </div>
    </aside>
  );
}