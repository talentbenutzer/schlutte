import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schlutte — Grabner Design",
  description: "Interne WebApp für Kommissionen, Laufzettel und Palettenbeschriftung.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
