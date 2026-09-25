import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Schlutte — Grabner Design",
  description: "Interne WebApp für Kommissionen, Palettenlabel intern und Palettenversand-Label.",
  manifest: "/schlutte.webmanifest",
  appleWebApp: { capable: true, title: "Schlutte", statusBarStyle: "default" },
  icons: {
    apple: [{ url: "/icons/belege-180.png", sizes: "180x180", type: "image/png" }],
  },
  other: { "apple-mobile-web-app-capable": "yes" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FBF9F4" },
    { media: "(prefers-color-scheme: dark)", color: "#2A2926" },
  ],
  viewportFit: "cover",
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
