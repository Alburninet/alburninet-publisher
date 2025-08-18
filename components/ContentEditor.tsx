"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { ICommand, TextState, TextAreaTextApi } from "@uiw/react-md-editor";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

function customCommand(
  name: string,
  icon: string,
  execute: (state: TextState, api: TextAreaTextApi) => void,
): ICommand {
  return {
    name,
    keyCommand: name,
    icon: <span style={{ padding: "0 6px" }}>{icon}</span>,
    execute,
  };
}

const H2 = customCommand("h2", "H2", (state, api) => {
  api.replaceSelection(`\n\n## ${state.selectedText || "Titolo sezione"}\n`);
});
const H3 = customCommand("h3", "H3", (state, api) => {
  api.replaceSelection(`\n\n### ${state.selectedText || "Sottosezione"}\n`);
});
const QUOTE = customCommand("quote", "❝", (state, api) => {
  const text = state.selectedText || "Citazione…";
  api.replaceSelection(`\n\n> ${text}\n`);
});
const CODE = customCommand("codeblock", "</>", (state, api) => {
  const text = state.selectedText || "codice";
  api.replaceSelection(`\n\n\`\`\`\n${text}\n\`\`\`\n`);
});
const IMAGE = customCommand("image", "🖼", (state, api) => {
  const alt = state.selectedText || "alt immagine";
  api.replaceSelection(`![${alt}](https://...)`);
});
const LINK = customCommand("link", "🔗", (state, api) => {
  const text = state.selectedText || "testo del link";
  api.replaceSelection(`[${text}](https://...)`);
});
const UL = customCommand("ul", "•", (state, api) => {
  const text = state.selectedText || "voce";
  api.replaceSelection(`\n- ${text}\n- ...\n`);
});

export default function ContentEditor({
  value,
  onChange,
  height = 460,
}: {
  value: string;
  onChange: (v: string) => void;
  height?: number;
}) {
  const toolbar = useMemo(
    () => [H2, H3, "|", LINK, UL, QUOTE, CODE, IMAGE],
    []
  );

  return (
    <div data-color-mode="light" className="rounded-lg border overflow-hidden">
      <MDEditor
        value={value}
        onChange={(v) => onChange(v || "")}
        height={height}
        visibleDragbar={false}
        commands={toolbar as any}
        preview="live" // editor+preview
      />
    </div>
  );
}