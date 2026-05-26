"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BrandMark } from "@/components/ui/BrandMark";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        if (error.message === "Invalid login credentials") {
          setErrorMsg("Ungültige E-Mail-Adresse oder falsches Passwort.");
        } else {
          setErrorMsg(`Fehler: ${error.message}`);
        }
        setIsSubmitting(false);
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setErrorMsg("Ein unerwarteter Fehler ist aufgetreten.");
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "var(--bg)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--bg-raised)",
          border: "1px solid var(--border-strong)",
          padding: "40px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 28,
        }}
      >
        <div style={{ display: "flex", justifyContent: "center" }}>
          <BrandMark />
        </div>

        <div style={{ textAlign: "center" }}>
          <span className="grb-eyebrow">Schlutte · Grabner Design</span>
          <h1
            className="grb-h-h1"
            style={{
              fontSize: 28,
              fontWeight: 300,
              marginTop: 6,
              letterSpacing: "-0.015em",
            }}
          >
            Anmelden
          </h1>
        </div>

        {errorMsg && (
          <div
            role="alert"
            style={{
              border: "1.5px solid var(--gd-danger)",
              color: "var(--gd-danger)",
              background: "var(--bg-alt)",
              padding: "12px 14px",
              fontFamily: "var(--font-sans)",
              fontSize: 14,
            }}
          >
            ❌ {errorMsg}
          </div>
        )}

        <form
          onSubmit={handleLogin}
          style={{ display: "flex", flexDirection: "column", gap: 20 }}
        >
          <label
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <span className="grb-eyebrow">E-Mail-Adresse</span>
            <input
              type="email"
              required
              className="grb-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@grabner-design.com"
            />
          </label>

          <label
            style={{ display: "flex", flexDirection: "column", gap: 6 }}
          >
            <span className="grb-eyebrow">Passwort</span>
            <input
              type="password"
              required
              className="grb-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </label>

          <button
            type="submit"
            className="grb-btn grb-btn-primary"
            style={{ marginTop: 8 }}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Wird angemeldet..." : "Anmelden"}
          </button>
        </form>
      </div>
    </div>
  );
}
