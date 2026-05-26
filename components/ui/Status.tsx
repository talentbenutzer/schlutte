import type { CommissionStatus } from "@/lib/types";
import { STATUS_LABEL, STATUS_CLASS } from "@/lib/types";

export function Status({ value }: { value: CommissionStatus }) {
  return (
    <span className={`grb-badge ${STATUS_CLASS[value]}`}>
      <span className="dot" />
      {STATUS_LABEL[value]}
    </span>
  );
}
