"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

const APP_URL = "https://schlutte.vercel.app/start";

type InstallPrompt = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

declare global {
  interface Navigator {
    standalone?: boolean;
  }
}

export function InstallAppButton() {
  const [open, setOpen] = useState(false);
  const [qrCode, setQrCode] = useState("");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
    const frame = window.requestAnimationFrame(() => setInstalled(standalone));

    QRCode.toDataURL(APP_URL, {
      width: 360,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#1d1d1b", light: "#fbf9f4" },
    }).then(setQrCode).catch(() => setQrCode(""));

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setPrompt(event as InstallPrompt);
    };
    const onInstalled = () => {
      setInstalled(true);
      setOpen(false);
      setPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    const result = await prompt.userChoice;
    if (result.outcome === "accepted") setOpen(false);
    setPrompt(null);
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(APP_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.assign(APP_URL);
    }
  }

  if (installed) return null;

  return (
    <div
      className={`install-app${open ? " is-open" : ""}`}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        type="button"
        className="install-app-button"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((value) => !value)}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M12 3v12m0 0 4-4m-4 4-4-4M5 15v4h14v-4" />
        </svg>
        <span>Als App</span>
      </button>

      <section className="install-app-popover" role="dialog" aria-label="Schlutte auf dem iPhone installieren">
        <span className="install-app-kicker">Schlutte fürs iPhone</span>
        <strong>Mit der Kamera scannen</strong>
        <p>Der QR-Code öffnet Schlutte direkt auf deinem Handy.</p>
        <div className="install-app-qr">
          {/* Data-URL wird lokal erzeugt; Next-Image würde hier keine Optimierung bringen. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {qrCode ? <img src={qrCode} alt="QR-Code zu Schlutte" /> : <span>QR-Code wird geladen …</span>}
        </div>
        <ol>
          <li>Link in Safari öffnen</li>
          <li>Unten auf <b>Teilen</b> tippen</li>
          <li><b>Zum Home-Bildschirm</b> wählen</li>
        </ol>
        {prompt ? (
          <button type="button" className="install-app-action" onClick={install}>App installieren</button>
        ) : (
          <button type="button" className="install-app-link" onClick={copyLink}>{copied ? "Link kopiert" : "Link kopieren"}</button>
        )}
      </section>
    </div>
  );
}
