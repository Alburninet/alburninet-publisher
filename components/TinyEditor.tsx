"use client";

import { useMemo } from "react";
import { Editor } from "@tinymce/tinymce-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  height?: number;        // altezza iniziale (usiamo anche min/max + autoresize)
  placeholder?: string;
};

export default function TinyEditor({
  value,
  onChange,
  height = 720,
  placeholder = "Scrivi qui...",
}: Props) {
  // Se presente, usa Tiny Cloud; altrimenti self-host (nessuna API key necessaria)
  const apiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY;
  const localScript = apiKey ? undefined : "/tinymce/tinymce.min.js";

  const toolbarMode = "sliding" as const;

  const init = useMemo(
    () => ({
      // UI
      menubar: true,
      toolbar_sticky: true,
      toolbar_mode: toolbarMode,
      branding: false,
      statusbar: true,
      promotion: false,

      // Plugin ricchi (incluso autoresize!)
      plugins: [
        "advlist",
        "autolink",
        "lists",
        "link",
        "image",
        "media",
        "table",
        "charmap",
        "emoticons",
        "searchreplace",
        "visualblocks",
        "code",
        "fullscreen",
        "insertdatetime",
        "preview",
        "anchor",
        "pagebreak",
        "hr",
        "wordcount",
        "quickbars",
        "paste",
        "autoresize",
      ],

      // Toolbar completa
      toolbar: [
        "undo redo | blocks | bold italic underline strikethrough | forecolor backcolor |",
        "alignleft aligncenter alignright alignjustify | bullist numlist outdent indent |",
        "blockquote subscript superscript | hr pagebreak |",
        "link image media table charmap emoticons |",
        "removeformat | code preview fullscreen | searchreplace",
      ].join(" "),

      // Formati a menu
      block_formats:
        "Paragrafo=p; Titolo 2=h2; Titolo 3=h3; Titolo 4=h4; Citazione=blockquote; Preformattato=pre",

      // Quickbars (toolbar contestuale su selezione + inserimento)
      quickbars_selection_toolbar:
        "bold italic underline | h2 h3 | blockquote | forecolor backcolor | link",
      quickbars_insert_toolbar: "image media table | hr",

      // Immagini & wrapping testo
      image_caption: true,
      image_advtab: true,
      image_title: true,
      object_resizing: "img",

      // ⚠️ Classi WordPress per compatibilità front-end
      image_class_list: [
        { title: "Nessuna", value: "" },
        { title: "Testo a lato — sinistra", value: "alignleft" },
        { title: "Testo a lato — destra", value: "alignright" },
        { title: "Immagine centrata", value: "aligncenter" },
      ],

      // Altezza & autoresize
      height,                  // altezza iniziale
      min_height: 500,         // minimo comodo
      max_height: 1400,        // massimo
      autoresize_bottom_margin: 24,
      autoresize_overflow_padding: 24,

      // Stili dentro l’editor (WP + retro-compatibilità)
      content_style: `
        img { max-width: 100%; height: auto; }
        figure { display: inline-block; }

        /* Classi WordPress */
        img.alignleft, figure.alignleft { float: left; margin: 0 1rem 1rem 0; max-width: 50%; }
        img.alignright, figure.alignright { float: right; margin: 0 0 1rem 1rem; max-width: 50%; }
        img.aligncenter, figure.aligncenter { display:block; margin: 1rem auto; float:none; }

        /* Retro-compat (vecchie classi) */
        img.float-left, figure.float-left { float: left; margin: 0 1rem 1rem 0; max-width: 50%; }
        img.float-right, figure.float-right { float: right; margin: 0 0 1rem 1rem; max-width: 50%; }
        img.img-center, figure.img-center { display:block; margin: 1rem auto; float:none; }

        /* Paragrafo di "clear" */
        .clearfix::after { content: ""; display: table; clear: both; }

        /* Tabelle */
        table { border-collapse: collapse; width: 100%; }
        table, th, td { border: 1px solid #e5e7eb; }
        th, td { padding: .5rem; }

        /* Leggibilità */
        body { font-size: 16px; line-height: 1.7; }
      `,

      // Stili nel menu "Styles"
      style_formats: [
        {
          title: "Immagine",
          items: [
            { title: "Testo a lato — sinistra", selector: "img,figure", classes: "alignleft" },
            { title: "Testo a lato — destra", selector: "img,figure", classes: "alignright" },
            { title: "Centrata", selector: "img,figure", classes: "aligncenter" },
          ],
        },
        {
          title: "Paragrafo",
          items: [{ title: "Clear float (nuova riga)", block: "p", classes: "clearfix" }],
        },
      ],

      // Incolla & validazioni
      paste_data_images: true,
      valid_classes: {
        img: "alignleft alignright aligncenter float-left float-right img-center",
        figure: "alignleft alignright aligncenter float-left float-right img-center",
        p: "clearfix",
      },
      valid_elements: "*[*]",
      convert_urls: false,

      // Placeholder “soft”
      setup: (ed: any) => {
        ed.on("init", () => {
          if (!value && placeholder) {
            ed.setContent(`<p style="color:#9ca3af">${placeholder}</p>`);
            ed.once("focus", () => {
              const txt = ed.getContent({ format: "text" }).trim();
              if (txt === placeholder) ed.setContent("");
            });
          }
        });
        ed.on("change keyup undo redo input", () => {
          onChange(ed.getContent());
        });
      },
    }),
    [height, onChange, placeholder, value, toolbarMode]
  );

  return (
    <Editor
      id="alburninet-tiny"
      apiKey={apiKey || undefined}      // Tiny Cloud se presente
      tinymceScriptSrc={localScript}    // Self-host fallback se manca la key
      init={init as any}
      value={value}
      onEditorChange={(content) => onChange(content)}
    />
  );
}