"use client";

import Link from "next/link";
import Image from "next/image";

export default function NavBar() {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white shadow-md">
      {/* Logo a sinistra */}
      <Link href="/" className="flex items-center space-x-2">
        <Image
          src="/logo.png"
          alt="Alburninet"
          width={40}
          height={40}
          className="rounded-full"
        />
        <span className="text-lg font-bold text-gray-800">Alburninet</span>
      </Link>

      {/* Pulsanti a destra */}
      <nav className="flex space-x-4">
        <Link
          href="/compose"
          className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
        >
          Nuovo Articolo
        </Link>
        <Link
          href="/articles"
          className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          Articoli
        </Link>
        <Link
          href="/media"
          className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300"
        >
          Media
        </Link>
      </nav>
    </header>
  );
}