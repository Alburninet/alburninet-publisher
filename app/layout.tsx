import "./globals.css";

/* ✅ percorsi corretti per le versioni recenti */
import '@uiw/react-md-editor/markdown-editor.css';
import '@uiw/react-markdown-preview/markdown.css';

export const metadata = { title: "Alburninet Publisher" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  );
}