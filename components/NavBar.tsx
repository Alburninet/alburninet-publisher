// components/NavBar.tsx
"use client";
import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="w-full bg-white border-b shadow-sm mb-6">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="text-lg font-semibold text-gray-800">
          Alburninet Publisher
        </Link>
        <div className="flex gap-4">
          <Link href="/compose" className="text-blue-600 hover:underline">Nuovo Articolo</Link>
          <Link href="/posts" className="text-green-600 hover:underline">Vedi Articoli</Link>
        </div>
      </div>
    </nav>
  );
}