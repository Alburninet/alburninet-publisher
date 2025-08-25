"use client";

import Link from "next/link";
import Image from "next/image";
import React from "react";
import { ProfileCtx } from "@/components/ProfileProvider";

export default function NavBar() {
  const { profile, openLogin } = React.useContext(ProfileCtx);

  return (
    <nav className="sticky top-0 z-40 w-full bg-white/80 backdrop-blur border-b">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Alburninet" width={28} height={28} className="rounded" />
          <Link href="/" className="font-semibold">Alburninet Publisher</Link>
          <div className="hidden md:flex items-center gap-3 ml-6 text-sm">
            <Link href="/compose" className="hover:underline">Nuovo Articolo</Link>
            <Link href="/posts" className="hover:underline">Vedi Articoli</Link>
            <Link href="/media" className="hover:underline">Media WP</Link>
          </div>
        </div>

        <div className="text-sm">
          {profile ? (
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 bg-white">
                <span className="text-gray-500">Operatore:</span>
                <span className="font-medium">{profile.label}</span>
              </span>
              <button
                onClick={openLogin}
                className="rounded-lg border px-3 py-1 hover:bg-gray-50"
                title="Cambia profilo"
              >
                Cambia
              </button>
            </div>
          ) : (
            <button onClick={openLogin} className="rounded-lg border px-3 py-1 hover:bg-gray-50">
              Seleziona profilo
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}