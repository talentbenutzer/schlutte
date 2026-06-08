import { getFeedbackList } from "@/lib/data/feedback";
import { CHANGELOG } from "@/lib/changelog";
import { APP_VERSION } from "@/lib/version";
import { FeedbackForm } from "./FeedbackForm";
import { FeedbackList } from "./FeedbackList";

export default async function FeedbackPage() {
  const feedbackList = await getFeedbackList();

  return (
    <div
      style={{
        padding: "40px 56px 80px",
        maxWidth: 960,
        margin: "0 auto",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 56,
      }}
    >
      {/* ─── Header ─────────────────────────────────────────────── */}
      <div
        style={{
          paddingBottom: 18,
          borderBottom: "1px solid var(--fg)",
        }}
      >
        <span className="grb-eyebrow">Schlutte · Intern</span>
        <h1
          className="grb-h-h1"
          style={{ marginTop: 6, fontSize: 40, letterSpacing: "-0.02em" }}
        >
          Feedback & Updates
        </h1>
      </div>

      {/* ─── Feedback-Formular ───────────────────────────────────── */}
      <section>
        <div style={{ marginBottom: 20 }}>
          <span className="grb-eyebrow">Feedback abgeben</span>
          <p
            style={{
              fontFamily: "var(--font-sans)",
              fontSize: 14,
              color: "var(--fg-muted)",
              marginTop: 8,
              maxWidth: 600,
            }}
          >
            Schreib eine Nachricht zu Fehlern, Wünschen oder
            Verbesserungsvorschlägen. Eddy liest alles.
          </p>
        </div>
        <FeedbackForm />
      </section>

      {/* ─── Update-Info / Changelog ─────────────────────────────── */}
      <section>
        <div style={{ marginBottom: 20 }}>
          <span className="grb-eyebrow">Update-Info</span>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 400,
              color: "var(--fg)",
              letterSpacing: "-0.005em",
              marginTop: 4,
            }}
          >
            Was ist neu in Schlutte?
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {CHANGELOG.map((entry) => (
            <div
              key={entry.version}
              style={{
                borderLeft: "2px solid var(--accent)",
                paddingLeft: 20,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 14,
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 13,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    color: "var(--fg)",
                  }}
                >
                  v{entry.version}
                </span>
                {entry.version === APP_VERSION && (
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 10,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      color: "var(--accent)",
                      border: "1px solid var(--accent)",
                      padding: "1px 6px",
                    }}
                  >
                    Aktuell
                  </span>
                )}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-subtle)",
                  }}
                >
                  {entry.date}
                </span>
              </div>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {entry.changes.map((change, i) => (
                  <li
                    key={i}
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 14,
                      color: "var(--fg)",
                      lineHeight: 1.5,
                    }}
                  >
                    {change}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Feedback-Verwaltung ─────────────────────────────────── */}
      <section>
        <div style={{ marginBottom: 20 }}>
          <span className="grb-eyebrow">Feedback-Verwaltung</span>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 22,
              fontWeight: 400,
              color: "var(--fg)",
              letterSpacing: "-0.005em",
              marginTop: 4,
            }}
          >
            Alle Einträge · {feedbackList.length} gesamt
          </div>
        </div>
        <FeedbackList entries={feedbackList} />
      </section>
    </div>
  );
}
