import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schlutte — Grabner Design",
  description: "Interne WebApp für Kommissionen, Palettenlabel intern und Palettenversand-Label.",
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
