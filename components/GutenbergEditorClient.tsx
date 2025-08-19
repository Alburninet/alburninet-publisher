"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  BlockEditorProvider,
  BlockList,
  WritingFlow,
  ObserveTyping,
  __experimentalLibrary as Library,
  BlockEditorKeyboardShortcuts,
} from "@wordpress/block-editor";
import { registerCoreBlocks } from "@wordpress/block-library";
import "@wordpress/format-library";

import { RegistryProvider, createRegistry } from "@wordpress/data";

// ✅ RE-EXPORT degli store dai pacchetti ufficiali
import { store as blockEditorStore } from "@wordpress/block-editor";
import { store as coreDataStore } from "@wordpress/core-data";
import { store as preferencesStore } from "@wordpress/preferences";
import { store as noticesStore } from "@wordpress/notices";
import { store as keyboardShortcutsStore } from "@wordpress/keyboard-shortcuts";
import { store as blocksStore, setCategories } from "@wordpress/blocks"; // ⬅️ IMPORTANTISSIMO

import { Popover, SlotFillProvider } from "@wordpress/components";
import domReady from "@wordpress/dom-ready";

let coreRegistered = false;
function ensureCoreBlocks() {
  if (!coreRegistered) {
    registerCoreBlocks();
    coreRegistered = true;
  }
}

// Categorie di default per l’inserter (come in WP)
const DEFAULT_BLOCK_CATEGORIES = [
  { slug: "text",     title: "Testo" },
  { slug: "media",    title: "Media" },
  { slug: "design",   title: "Design" },
  { slug: "widgets",  title: "Widget" },
  { slug: "theme",    title: "Tema" },
  { slug: "embed",    title: "Embed" },
];

export default function GutenbergEditorClient() {
  const [blocks, setBlocks] = useState<any[]>([]);
  const [ready, setReady] = useState(false);

  // Registry isolato per questo editor
  const registry = useMemo(() => createRegistry(), []);

  useEffect(() => {
    // 1) Registra TUTTI gli store necessari nel registry
    registry.register(blocksStore as any);              // ⬅️ Store dei blocchi (risolve getCategories)
    registry.register(blockEditorStore as any);
    registry.register(coreDataStore as any);
    registry.register(preferencesStore as any);
    registry.register(noticesStore as any);
    registry.register(keyboardShortcutsStore as any);

    // 2) Registra i core blocks (paragrafo, immagine, ecc.)
    ensureCoreBlocks();

    // 3) Imposta le categorie per l’inserter (fuori da wp-admin non lo fa nessuno)
    setCategories(DEFAULT_BLOCK_CATEGORIES);

    // 4) Attendi il DOM pronto (alcuni hook ne hanno bisogno)
    domReady(() => setReady(true));
  }, [registry]);

  if (!ready) {
    return <div className="p-6">Caricamento editor…</div>;
  }

  return (
    <div className="max-w-6xl mx-auto p-4">
      <header className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Nuovo Articolo (Gutenberg)</h1>
      </header>

      <RegistryProvider value={registry}>
        <SlotFillProvider>
          <BlockEditorKeyboardShortcuts.Register />
          <BlockEditorProvider
            value={blocks}
            onInput={setBlocks}
            onChange={setBlocks}
            settings={{ hasFixedToolbar: true }}
          >
            <div className="bg-white border rounded-lg p-2">
              {/* Libreria/Inserter */}
              <Library />
              <div className="border rounded mt-2">
                <WritingFlow>
                  <ObserveTyping>
                    <BlockList />
                  </ObserveTyping>
                </WritingFlow>
              </div>
            </div>
            <Popover.Slot />
          </BlockEditorProvider>
        </SlotFillProvider>
      </RegistryProvider>
    </div>
  );
}