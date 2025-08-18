"use client";
import { useMemo } from "react";
import { mdToHtml } from "@/lib/markdown";

type Props = { title: string; content: string; excerpt?: string };

export default function Preview({ title, content, excerpt }: Props) {
  const html = useMemo(() => mdToHtml(content), [content]);
  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-sm">
      <h2 className="text-xl font-semibold mb-2">Anteprima</h2>
      <h3 className="text-2xl font-bold mb-2">{title}</h3>
      {excerpt && <p className="text-gray-600 mb-4">{excerpt}</p>}
      <div className="prose" dangerouslySetInnerHTML={{ __html: html as string }} />
    </div>
  );
}
