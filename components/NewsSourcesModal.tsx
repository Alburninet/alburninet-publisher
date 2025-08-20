"use client";

import React from "react";

export type FeedSource = {
  key: string;     // es. "locale", "national", "world", o "custom-1"
  name: string;    // es. "ANSA", "BBC World", "Mio feed"
  url: string;     // URL RSS
  group?: "locale" | "national" | "world" | "custom";
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (sources: FeedSource[]) => void;
  initial?: FeedSource[];
};

const PRESETS: FeedSource[] = [
  // Locale
  { key: "salernotoday", name: "SalernoToday", url: "https://www.salernotoday.it/rss", group: "locale" },
  { key: "voce-di-strada", name: "Voce di Strada", url: "https://www.vocedistrada.it/feed/", group: "locale" },

  // Nazionale
  { key: "ansa-top", name: "ANSA", url: "https://www.ansa.it/sito/ansait_rss.xml", group: "national" },
  { key: "repubblica", name: "Repubblica", url: "https://www.repubblica.it/rss/homepage/rss2.0.xml", group: "national" },

  // Internazionale
  { key: "bbc-world", name: "BBC World", url: "https://feeds.bbci.co.uk/news/world/rss.xml", group: "world" },
  { key: "guardian", name: "The Guardian", url: "https://www.theguardian.com/world/rss", group: "world" },
];

function groupLabel(g?: FeedSource["group"]) {
  switch (g) {
    case "locale": return "Locale";
    case "national": return "Nazionale";
    case "world": return "Internazionale";
    case "custom": return "Personalizzati";
    default: return "Altro";
  }
}

const GROUP_OPTIONS: Array<{ value: FeedSource["group"], label: string }> = [
  { value: "locale", label: "Locale" },
  { value: "national", label: "Nazionale" },
  { value: "world", label: "Internazionale" },
  { value: "custom", label: "Personalizzati" },
];

export default function NewsSourcesModal({ open, onClose, onSave, initial = [] }: Props) {
  const [selected, setSelected] = React.useState<Record<string, FeedSource>>({});
  const [customName, setCustomName] = React.useState("");
  const [customUrl, setCustomUrl] = React.useState("");
  const [customGroup, setCustomGroup] = React.useState<FeedSource["group"]>("custom");
  const [tab, setTab] = React.useState<"presets" | "custom">("presets");

  React.useEffect(() => {
    if (open) {
      const map: Record<string, FeedSource> = {};
      (initial || []).forEach((s) => { map[s.key] = s; });
      setSelected(map);
    }
  }, [open, initial]);

  if (!open) return null;

  const selectedList = Object.values(selected);

  function toggleSource(s: FeedSource) {
    setSelected((prev) => {
      const cp = { ...prev };
      if (cp[s.key]) delete cp[s.key];
      else cp[s.key] = s;
      return cp;
    });
  }

  function setSelectedGroup(key: string, g: FeedSource["group"]) {
    setSelected((prev) => {
      const cp = { ...prev };
      if (!cp[key]) return prev;
      cp[key] = { ...cp[key], group: g };
      return cp;
    });
  }

  function addCustom() {
    const name = customName.trim();
    const url = customUrl.trim();
    if (!name || !url) return;
    const key = `custom-${Math.random().toString(36).slice(2, 8)}`;
    const item: FeedSource = { key, name, url, group: customGroup || "custom" };
    setSelected((prev) => ({ ...prev, [key]: item }));
    setCustomName("");
    setCustomUrl("");
    setCustomGroup("custom");
    setTab("presets"); // torna ai preset dopo l’aggiunta
  }

  function handleSave() {
    const arr = Object.values(selected);
    onSave(arr);
    onClose();
  }

  // Raggruppa i preset per categoria
  const groups: Array<{ group: FeedSource["group"], items: FeedSource[] }> = [
    { group: "locale", items: PRESETS.filter(p => p.group === "locale") },
    { group: "national", items: PRESETS.filter(p => p.group === "national") },
    { group: "world", items: PRESETS.filter(p => p.group === "world") },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl bg-white rounded-xl shadow p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Sorgenti RSS</h3>
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 rounded border bg-white hover:bg-gray-50 text-sm"
          >
            Chiudi
          </button>
        </div>

        {/* Tabs */}
        <div className="mb-3">
          <div className="inline-flex rounded-lg border overflow-hidden">
            <button
              type="button"
              className={`px-3 py-2 text-sm ${tab === "presets" ? "bg-black text-white" : "bg-white"}`}
              onClick={() => setTab("presets")}
            >
              Preset
            </button>
            <button
              type="button"
              className={`px-3 py-2 text-sm ${tab === "custom" ? "bg-black text-white" : "bg-white"}`}
              onClick={() => setTab("custom")}
            >
              Aggiungi personalizzato
            </button>
          </div>
        </div>

        {/* Contenuto tab Preset */}
        {tab === "presets" && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {groups.map(({ group, items }) => (
              <section key={group} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-medium">{groupLabel(group)}</div>
                </div>
                <ul className="space-y-2">
                  {items.map((p) => {
                    const active = !!selected[p.key];
                    return (
                      <li key={p.key} className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{p.name}</div>
                          <div className="text-xs text-gray-500 truncate">{p.url}</div>
                        </div>
                        <button
                          type="button"
                          className={`px-2 py-1 rounded border text-xs ${active ? "bg-black text-white" : "bg-white hover:bg-gray-50"}`}
                          onClick={() => toggleSource(p)}
                        >
                          {active ? "Selezionato" : "Seleziona"}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Contenuto tab Custom */}
        {tab === "custom" && (
          <section className="border rounded-lg p-3">
            <div className="font-medium mb-2">Aggiungi feed personalizzato</div>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
              <input
                type="text"
                placeholder="Nome feed"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="border rounded-lg px-3 py-2 md:col-span-2"
              />
              <input
                type="url"
                placeholder="https://esempio.it/feed"
                value={customUrl}
                onChange={(e) => setCustomUrl(e.target.value)}
                className="border rounded-lg px-3 py-2 md:col-span-2"
              />
              <select
                value={customGroup || "custom"}
                onChange={(e) => setCustomGroup(e.target.value as FeedSource["group"])}
                className="border rounded-lg px-3 py-2"
                aria-label="Gruppo"
              >
                {GROUP_OPTIONS.map((g) => (
                  <option key={g.value} value={g.value!}>{g.label}</option>
                ))}
              </select>
            </div>
            <div className="mt-3">
              <button
                type="button"
                onClick={addCustom}
                className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
              >
                Aggiungi
              </button>
            </div>
          </section>
        )}

        {/* Selezionati (con possibilità di cambiare gruppo) */}
        <div className="mt-4">
          <div className="text-sm font-medium mb-1">Selezionati</div>
          {selectedList.length === 0 ? (
            <div className="text-sm text-gray-500">Nessuna sorgente selezionata.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {selectedList.map((s) => (
                <div key={s.key} className="border rounded-lg p-2 flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-xs text-gray-500 truncate">{s.url}</div>
                  </div>
                  <select
                    value={s.group || "custom"}
                    onChange={(e) => setSelectedGroup(s.key, e.target.value as FeedSource["group"])}
                    className="border rounded px-2 py-1 text-xs"
                    title="Gruppo"
                  >
                    {GROUP_OPTIONS.map((g) => (
                      <option key={g.value} value={g.value!}>{g.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => toggleSource(s)}
                    className="px-2 py-1 rounded border text-xs bg-white hover:bg-gray-50"
                    title="Rimuovi"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg border bg-white hover:bg-gray-50"
          >
            Annulla
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-3 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
          >
            Salva sorgenti
          </button>
        </div>
      </div>
    </div>
  );
}