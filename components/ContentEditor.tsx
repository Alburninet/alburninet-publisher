"use client";

import React from "react";
import { Editor } from "@tinymce/tinymce-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  height?: number;
};

export default function ContentEditor({ value, onChange, height = 520 }: Props) {
  const apiKey = process.env.NEXT_PUBLIC_TINYMCE_API_KEY || "";

  return (
    <div className="rounded-xl border bg-white">
      <Editor
        apiKey={apiKey || undefined}
        value={value}
        onEditorChange={(content) => onChange(content)}
        init={{
          height,
          menubar: true,
          toolbar_sticky: true,
          toolbar_mode: "sliding",
          branding: false,
          statusbar: true,
          plugins:
            "advlist anchor autolink charmap code codesample emoticons image link lists media searchreplace table visualblocks wordcount fullscreen preview",
          toolbar:
            "undo redo | blocks | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link image media table | blockquote codesample removeformat | fullscreen preview",
          // Upload immagini verso WordPress
          images_upload_handler: async (blobInfo) => {
            const form = new FormData();
            form.append("file", blobInfo.blob(), blobInfo.filename());
            const r = await fetch("/api/wp/media", { method: "POST", body: form });
            const data = await r.json();
            if (!r.ok || !data?.source_url) throw new Error("Upload fallito");
            return data.source_url as string;
          },
          automatic_uploads: true,
          convert_urls: false,
          content_style:
            "body{font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:16px;line-height:1.6} img{max-width:100%;height:auto}",
        }}
      />
    </div>
  );
}