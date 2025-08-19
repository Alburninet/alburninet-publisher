"use client";

import { Editor } from "@tinymce/tinymce-react";
import React from "react";

const rawKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY || "";
const apiKey = rawKey.trim() || "no-api-key"; // fallback che non blocca l'editor
const scriptSrc = `https://cdn.tiny.cloud/1/${apiKey}/tinymce/6/tinymce.min.js`;

export default function TinyEditor({
  value,
  onChange,
  height = 1200,
  placeholder,
}: {
  value: string;
  onChange: (html: string) => void;
  height?: number;
  placeholder?: string;
}) {
  // Avviso in dev se manca la key
  React.useEffect(() => {
    if (apiKey === "no-api-key") {
      console.warn("[TinyMCE] NEXT_PUBLIC_TINYMCE_API_KEY non trovata: uso 'no-api-key'.");
    }
  }, []);

  return (
    <Editor
      apiKey={apiKey}
      tinymceScriptSrc={scriptSrc}
      value={value}
      onEditorChange={(content) => onChange(content)}
      init={{
        height,
        menubar: false,
        statusbar: false,      // nasconde "Press ⌘? for help" e wordcount
        branding: false,       // rimuove il logo Tiny
        promotion: false,      // niente banner promozionale
        toolbar_mode: "wrap",
        plugins:
          "advlist autolink lists link image charmap preview anchor " +
          "searchreplace visualblocks code fullscreen " +
          "insertdatetime media table help wordcount autoresize",
        toolbar:
          "undo redo | styles | bold italic underline forecolor backcolor | " +
          "alignleft aligncenter alignright alignjustify | " +
          "bullist numlist outdent indent | link image media table | " +
          "removeformat | code preview",
        placeholder,
        autoresize_bottom_margin: 20,
        // stile contenuto nell'iframe
        content_style:
          "body{font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.6;color:#111827;} " +
          "img{max-width:100%;height:auto;border-radius:8px;} " +
          "table{border-collapse:collapse;width:100%;} table,td,th{border:1px solid #e5e7eb;} td,th{padding:8px;}",
        // chiude eventuali notifiche gialle di default
        setup: (editor) => {
          editor.on("SkinLoaded", () => {
            try {
              // chiudi notifiche già presenti
              // @ts-ignore
              editor.notificationManager?.getNotifications?.().forEach((n: any) => n.close());
            } catch {}
          });
        },
      }}
    />
  );
}