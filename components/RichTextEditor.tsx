"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, BubbleMenu, FloatingMenu } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import BaseImage from "@tiptap/extension-image";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import TextStyle from "@tiptap/extension-text-style";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableHeader from "@tiptap/extension-table-header";
import TableCell from "@tiptap/extension-table-cell";

function isValidUrl(url: string) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/** Immagine con attributo width */
const CustomImage = BaseImage.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: "100%",
        parseHTML: (el) => {
          const style = el.getAttribute("style") || "";
          const styleMatch = style.match(/width:\s*([^;]+);?/i);
          return el.getAttribute("width") || (styleMatch ? styleMatch[1].trim() : "100%");
        },
        renderHTML: (attrs) => ({
          style: `width: ${attrs.width || "100%"}; height: auto; max-width: 100%;`,
        }),
      },
      alt: { default: "" },
    };
  },
});

export default function RichTextEditor({
  value,
  onChange,
  height = 520,
  onUploadImage,
}: {
  value: string;
  onChange: (html: string) => void;
  height?: number;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const baseExtensions = [
    StarterKit.configure({ codeBlock: {} }),
    Link.configure({ openOnClick: false, autolink: true }),
    CustomImage,
    Underline,
    Highlight,
    TextStyle,
    Color,
    TextAlign.configure({ types: ["heading", "paragraph"] }),
  ];
  const tableExtensions =
    Table && TableRow && TableHeader && TableCell
      ? [Table.configure({ resizable: true }), TableRow, TableHeader, TableCell]
      : [];

  const editor = useEditor({
    extensions: [...baseExtensions, ...tableExtensions],
    content: value || "<p></p>",
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: "prose prose-sm max-w-none focus:outline-none p-4 min-h-[240px]",
      },
      handlePaste(view, event) {
        const items = (event.clipboardData && event.clipboardData.items) || [];
        for (const it of items as any) {
          if (it.kind === "file") {
            const file = it.getAsFile() as File;
            if (file && file.type.startsWith("image/")) {
              event.preventDefault();
              onUploadImage(file)
                .then((url) => editor?.chain().focus().setImage({ src: url, alt: "" }).run())
                .catch((err) => console.error("Upload immagine (paste) fallito:", err));
              return true;
            }
          }
        }
        return false;
      },
      handleDrop(view, event, _slice, _moved) {
        const files = (event as DragEvent).dataTransfer?.files;
        if (!files || files.length === 0) return false;
        const img = Array.from(files).find((f) => f.type.startsWith("image/"));
        if (!img) return false;
        event.preventDefault();
        onUploadImage(img)
          .then((url) => editor?.chain().focus().setImage({ src: url, alt: "" }).run())
          .catch((err) => console.error("Upload immagine (drop) fallito:", err));
        return true;
      },
    },
    immediatelyRender: false,
  });

  useEffect(() => {
    if (!editor) return;
    if (value !== editor.getHTML()) {
      editor.commands.setContent(value || "<p></p>", false);
    }
  }, [value, editor]);

  const pickImage = () => fileRef.current?.click();

  const onPickFile: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    onUploadImage(f)
      .then((url) => editor?.chain().focus().setImage({ src: url, alt: "" }).run())
      .catch((err) => console.error("Upload immagine (file) fallito:", err))
      .finally(() => (e.target.value = ""));
  };

  const promptImageUrl = useCallback(() => {
    const url = window.prompt("URL immagine (oppure usa 'Carica immagine')");
    if (!url) return;
    if (isValidUrl(url)) editor?.chain().focus().setImage({ src: url, alt: "" }).run();
    else alert("URL non valido. Usa http:// o https://");
  }, [editor]);

  const promptLink = useCallback(() => {
    const prev = editor?.getAttributes("link").href as string | undefined;
    const url = window.prompt("URL del link", prev || "https://");
    if (url === null) return;
    if (url === "") editor?.chain().focus().unsetLink().run();
    else if (isValidUrl(url)) editor?.chain().focus().setLink({ href: url }).run();
    else alert("URL non valido. Usa http(s)://");
  }, [editor]);

  const setImageWidth = (w: string) => {
    editor?.chain().focus().updateAttributes("image", { width: w }).run();
  };

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* Toolbar */}
      <div className="flex flex-wrap gap-1 p-2 border-b bg-gray-50 text-sm">
        <button onClick={() => editor?.chain().focus().toggleBold().run()} className={btn(editor?.isActive("bold"))}>B</button>
        <button onClick={() => editor?.chain().focus().toggleItalic().run()} className={btn(editor?.isActive("italic"))}>I</button>
        <button onClick={() => editor?.chain().focus().toggleUnderline().run()} className={btn(editor?.isActive("underline"))}>U</button>
        <button onClick={() => editor?.chain().focus().toggleHighlight().run()} className={btn(editor?.isActive("highlight"))}>HL</button>

        <span className="mx-1 text-gray-300">|</span>

        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor?.isActive("heading", { level: 2 }))}>H2</button>
        <button onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()} className={btn(editor?.isActive("heading", { level: 3 }))}>H3</button>
        <button onClick={() => editor?.chain().focus().toggleBulletList().run()} className={btn(editor?.isActive("bulletList"))}>• List</button>
        <button onClick={() => editor?.chain().focus().toggleOrderedList().run()} className={btn(editor?.isActive("orderedList"))}>1. List</button>
        <button onClick={() => editor?.chain().focus().toggleBlockquote().run()} className={btn(editor?.isActive("blockquote"))}>❝</button>
        <button onClick={() => editor?.chain().focus().toggleCodeBlock().run()} className={btn(editor?.isActive("codeBlock"))}>{"</>"}</button>

        <span className="mx-1 text-gray-300">|</span>

        <button onClick={promptLink} className={btn(!!editor?.isActive("link"))}>🔗 Link</button>
        <button onClick={promptImageUrl} className={btn(false)}>🌐 Img URL</button>
        <button onClick={pickImage} className={btn(false)}>⬆︎ Carica immagine</button>
        <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} hidden />

        <span className="mx-1 text-gray-300">|</span>

        <button onClick={() => editor?.chain().focus().setTextAlign("left").run()}  className={btn(!!editor?.isActive({ textAlign: "left" }))}>⟸</button>
        <button onClick={() => editor?.chain().focus().setTextAlign("center").run()}className={btn(!!editor?.isActive({ textAlign: "center" }))}>≡</button>
        <button onClick={() => editor?.chain().focus().setTextAlign("right").run()} className={btn(!!editor?.isActive({ textAlign: "right" }))}>⟹</button>

        <span className="mx-1 text-gray-300">|</span>

        <button onClick={() => editor?.chain().focus().undo().run()} className={btn(false)}>↶</button>
        <button onClick={() => editor?.chain().focus().redo().run()} className={btn(false)}>↷</button>

        <span className="ml-auto text-xs px-2 py-1 rounded border bg-white">HTML</span>
      </div>

      {/* Editor */}
      <div style={{ minHeight: height }}>
        {mounted ? <EditorContent editor={editor} /> : <div className="p-4 text-sm text-gray-500">Caricamento editor…</div>}
      </div>

      {/* BubbleMenu TESTO — sempre montato */}
      {editor && (
        <BubbleMenu
          editor={editor}
          pluginKey="bubble-text"
          className="bg-black text-white text-xs rounded px-2 py-1 flex gap-2"
          shouldShow={({ editor }) => !editor.isActive("image") && editor.isEditable}
          tippyOptions={{ placement: "top" }}
        >
          <button onClick={() => editor.chain().focus().toggleBold().run()}>Bold</button>
          <button onClick={() => editor.chain().focus().toggleItalic().run()}>Italic</button>
          <button onClick={() => editor.chain().focus().toggleUnderline().run()}>Under</button>
          <button onClick={promptLink}>Link</button>
        </BubbleMenu>
      )}

      {/* BubbleMenu IMMAGINI — sempre montato */}
      {editor && (
        <BubbleMenu
          editor={editor}
          pluginKey="bubble-image"
          className="bg-white border rounded shadow text-xs p-1 flex items-center gap-1"
          shouldShow={({ editor }) => editor.isActive("image") && editor.isEditable}
          tippyOptions={{ placement: "top" }}
        >
          <span className="px-2 text-gray-600">Dimensione:</span>
          <button className={mini(false)} onClick={() => setImageWidth("25%")}>25%</button>
          <button className={mini(false)} onClick={() => setImageWidth("50%")}>50%</button>
          <button className={mini(false)} onClick={() => setImageWidth("75%")}>75%</button>
          <button className={mini(false)} onClick={() => setImageWidth("100%")}>100%</button>
          <input
            placeholder="es. 320px"
            className="ml-2 px-2 py-1 border rounded w-24"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                const v = (e.target as HTMLInputElement).value.trim();
                if (v) setImageWidth(v);
              }
            }}
          />
        </BubbleMenu>
      )}

      {/* Floating menu (heading/list) — sempre montato */}
      {editor && (
        <FloatingMenu
          editor={editor}
          pluginKey="floating-main"
          className="bg-white/90 border rounded shadow text-xs"
          shouldShow={({ editor }) => editor.isEditable}
          tippyOptions={{ placement: "right" }}
        >
          <div className="flex">
            <button className={mini(editor.isActive("heading", { level: 2 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
            <button className={mini(editor.isActive("heading", { level: 3 }))} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>H3</button>
            <button className={mini(editor.isActive("bulletList"))} onClick={() => editor.chain().focus().toggleBulletList().run()}>•</button>
            <button className={mini(editor.isActive("orderedList"))} onClick={() => editor.chain().focus().toggleOrderedList().run()}>1</button>
          </div>
        </FloatingMenu>
      )}
    </div>
  );
}

function btn(active?: boolean) {
  return `px-2 py-1 rounded border bg-white hover:bg-gray-100 ${active ? "bg-black text-white hover:bg-black" : ""}`;
}
function mini(active?: boolean) {
  return `px-2 py-1 border ${active ? "bg-black text-white" : "bg-white hover:bg-gray-100"}`;
}