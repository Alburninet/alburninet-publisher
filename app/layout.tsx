// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import NavBar from "@/components/NavBar"; // se non lo usi, rimuovi import e <NavBar />

export const metadata: Metadata = {
  title: "Alburninet Publisher",
  description: "Webapp di supporto alla redazione di Alburninet",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="it">
      <body className="bg-gray-50 text-slate-900">
        <NavBar />
        <main className="container max-w-7xl mx-auto px-4 py-6">{children}</main>
      </body>
    </html>
  );
}