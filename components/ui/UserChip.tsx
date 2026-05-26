export function UserChip({
  kuerzel = "EDL",
  name = "Eddy Lorenz",
  role = "Admin",
  compact = false,
  onLogout,
}: {
  kuerzel?: string;
  name?: string;
  role?: string;
  compact?: boolean;
  onLogout?: () => void;
}) {
  return (
    <div className="grb-user">
      {!compact && (
        <div style={{ textAlign: "right" }}>
          <div className="grb-user-name">{name}</div>
          <div
            className="grb-user-role"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 8,
              marginTop: 2,
            }}
          >
            <span>{role} · {kuerzel}</span>
            {onLogout && (
              <>
                <span style={{ color: "var(--border-strong)" }}>|</span>
                <button
                  onClick={onLogout}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    margin: 0,
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    color: "var(--accent)",
                    cursor: "pointer",
                    transition: "color var(--dur-fast) var(--ease-out)",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "var(--accent)")}
                >
                  Abmelden
                </button>
              </>
            )}
          </div>
        </div>
      )}
      <div className="grb-user-initials">{kuerzel}</div>
    </div>
  );
}
