"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full">
        <h1 className="text-2xl font-semibold mb-6">Alburninet Publisher</h1>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            href="/compose"
            className="rounded-2xl border bg-white hover:bg-gray-50 shadow p-6 text-center transition"
          >
            <div className="text-3xl mb-2">✍️</div>
            <div className="font-medium text-lg">Nuovo Articolo</div>
            <div className="text-sm text-gray-500 mt-1">Crea un nuovo post</div>
          </Link>

          <Link
            href="/posts"
            className="rounded-2xl border bg-white hover:bg-gray-50 shadow p-6 text-center transition"
          >
            <div className="text-3xl mb-2">📰</div>
            <div className="font-medium text-lg">Vedi Articoli</div>
            <div className="text-sm text-gray-500 mt-1">Bozze e pubblicati</div>
          </Link>

          <Link
            href="/media"
            className="rounded-2xl border bg-white hover:bg-gray-50 shadow p-6 text-center transition"
          >
            <div className="text-3xl mb-2">🖼️</div>
            <div className="font-medium text-lg">Gestione Media WP</div>
            <div className="text-sm text-gray-500 mt-1">Carica e gestisci file</div>
          </Link>
        </div>
      </div>
    </main>
  );
}