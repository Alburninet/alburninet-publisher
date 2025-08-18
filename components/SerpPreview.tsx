// components/SerpPreview.tsx
"use client";
type Props = { url?: string; title?: string; description?: string };

export default function SerpPreview({ url = "alburninet.it", title, description }: Props) {
  return (
    <div className="border rounded-2xl p-4 bg-white">
      <p className="text-sm text-green-700">{url.replace(/^https?:\/\//, "")}</p>
      <h4 className="text-xl text-blue-700 truncate">{title || "Titolo SEO di esempio - Alburni"}</h4>
      <p className="text-sm text-gray-700 line-clamp-3">{description || "Anteprima meta description… (Alburni)"}</p>
    </div>
  );
}
