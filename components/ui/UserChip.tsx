export function UserChip({
  kuerzel = "EDL",
  name = "Eddy Lorenz",
  role = "Admin",
  compact = false,
}: {
  kuerzel?: string;
  name?: string;
  role?: string;
  compact?: boolean;
}) {
  return (
    <div className="grb-user">
      {!compact && (
        <div style={{ textAlign: "right" }}>
          <div className="grb-user-name">{name}</div>
          <div className="grb-user-role">
            {role} · {kuerzel}
          </div>
        </div>
      )}
      <div className="grb-user-initials">{kuerzel}</div>
    </div>
  );
}
