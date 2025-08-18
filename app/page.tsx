// app/page.tsx
"use client";
import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 px-6">
      <h1 className="text-3xl font-bold mb-10">Alburninet Publisher</h1>
      <div className="flex flex-col md:flex-row gap-6">
        <Link
          href="/compose"
          className="px-10 py-6 bg-blue-600 text-white text-xl rounded-2xl shadow-lg hover:bg-blue-700 transition text-center"
        >
          Nuovo Articolo
        </Link>
        <Link
          href="/posts"
          className="px-10 py-6 bg-green-600 text-white text-xl rounded-2xl shadow-lg hover:bg-green-700 transition text-center"
        >
          Vedi Articoli
        </Link>
      </div>
    </div>
  );
}