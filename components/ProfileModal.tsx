"use client";
import React from "react";
import { ProfileCtx } from "./ProfileProvider";

export default function ProfileModal() {
  const { loginOpen, closeLogin, setProfileId, profiles } = React.useContext(ProfileCtx);
  const [selected, setSelected] = React.useState<string>("");

  React.useEffect(() => {
    setSelected("");
  }, [loginOpen]);

  if (!loginOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Chi sei?</h3>
          <p className="text-sm text-gray-600">Seleziona il tuo profilo operativo.</p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-sm">Profilo</label>
            <select
              className="mt-1 w-full rounded-lg border px-3 py-2"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
            >
              <option value="" disabled>— Seleziona —</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-end gap-2">
            <button onClick={closeLogin} className="rounded-lg border px-3 py-2 hover:bg-gray-50">
              Annulla
            </button>
            <button
              onClick={() => { if (!selected) return; setProfileId(selected); closeLogin(); }}
              disabled={!selected}
              className="rounded-lg bg-black text-white px-3 py-2 hover:opacity-90 disabled:opacity-50"
            >
              Conferma
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-gray-500">
          Il profilo serve solo per attribuire correttamente l’autore su WordPress.
        </p>
      </div>
    </div>
  );
}