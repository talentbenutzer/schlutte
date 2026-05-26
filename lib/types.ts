export type CommissionStatus = "in-progress" | "ready" | "shipped" | "archived";

export type Commission = {
  no: string;
  client: string;
  project: string;
  status: CommissionStatus;
  updated: string;
  owner: string;
  docs: number;
};

export type Employee = {
  kuerzel: string;
  name: string;
  role: string;
};

export type RecentDoc = {
  type: string;
  kommission: string;
  client: string;
  stamp: string;
  by: string;
};

export type Palette = {
  idx: number;
  total: number;
  content: string;
  weight: string;
  dim: string;
  positions: string[];
};

export type Material = {
  pos: string;
  desc: string;
  qty: string;
  dim: string;
};

export type DocumentKind = "laufzettel" | "palette";

export type CommissionDocument = {
  id: string;
  kommission: string;
  kind: DocumentKind;
  label: string;
  client: string;
  stamp: string;
  by: string;
};

export type LaufzettelPrintData = {
  commission: Commission;
  materials: Material[];
  stations: string[];
  printedBy: string;
  printedAt: string;
};

export type PalettePrintPage = {
  commission: Commission;
  palette: Palette;
  printedBy: string;
  printedAt: string;
};

export const STATUS_LABEL: Record<CommissionStatus, string> = {
  "in-progress": "in Arbeit",
  ready: "fertig",
  shipped: "versendet",
  archived: "archiviert",
};

export const STATUS_CLASS: Record<CommissionStatus, string> = {
  "in-progress": "is-progress",
  ready: "is-done",
  shipped: "is-shipped",
  archived: "is-archive",
};
