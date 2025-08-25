import "./globals.css";
import type { Metadata } from "next";

// Popup “Chi sei?”
import ProfileProvider from "@/components/ProfileProvider";
import ProfileModal from "@/components/ProfileModal";

export const metadata: Metadata = {
  title: "Alburninet Publisher",
  description: "Webapp editoriale per Alburninet",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it">
      <body>
        <ProfileProvider>
          {children}
          <ProfileModal />
        </ProfileProvider>
      </body>
    </html>
  );
}