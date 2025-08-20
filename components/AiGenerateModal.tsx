"use client";

import * as React from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onApply: (payload: {
    title: string;
    seoTitle: string;
    excerpt: string;
    focusKw: string;
    tags: string[];
    contentHtml: string;
  }) => void;
};

export default function AiGenerateModal({ open, onClose, onApply }: Props) {
  const [topic, setTopic] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setTopic("");
      setError(null);
      setLoading(false);
    }
  }, [open]);

  async function handleGenerate() {
    if (!topic.trim()) {
      setError("Inserisci un argomento.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/ai/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: topic.trim() }),
      });
      const j = await res.json();
      if (!res.ok || !j?.ok) {
        throw new Error(j?.error || `HTTP ${res.status}`);
      }
      onApply(j.data);
      onClose();
    } catch (e: any) {
      setError(e?.message || "Errore durante la generazione");
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Genera contenuto con AI</h3>
          <button
            type="button"
            className="px-2 py-1 text-gray-500 hover:text-gray-700"
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div className="space-y-3">
          <div className="text-sm text-gray-600">
            Useremo impostazioni di default: <strong>tono</strong> informativo e autorevole,
            <strong> 900–1200 parole</strong>, struttura con <strong>H2/H3</strong>,
            focus keyword, meta description e tag ottimizzati per Yoast. Inserisci solo l’<strong>argomento</strong>.
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Argomento</label>
            <input
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Es. Escursione nei Monti Alburni in estate"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {error && <div className="text-sm text-red-600">{error}</div>}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            type="button"
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
            onClick={onClose}
            disabled={loading}
          >
            Annulla
          </button>
          <button
            type="button"
            className="px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-60"
            onClick={handleGenerate}
            disabled={loading}
          >
            {loading ? "Generazione in corso…" : "Genera"}
          </button>
        </div>
      </div>
    </div>
  );
}