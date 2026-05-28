export type CommissionStatus = "in-progress" | "ready" | "shipped" | "archived";

export type Commission = {
  no: string;
  client: string;
  project: string;
  status: CommissionStatus;
  updated: string;
  owner: string;
  docs: number;
  note?: string;
};

export type CreateCommissionInput = {
  no: string;
  client: string;
  project?: string;
  owner?: string;
  note?: string;
};

export type Employee = {
  id?: string;
  initials?: string;
  kuerzel: string; // UI compatibility
  name: string;
  email?: string;
  role: string;    // UI compatibility
  is_admin?: boolean;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type CreateEmployeeInput = {
  initials: string;
  name: string;
  email?: string;
  is_admin?: boolean;
  is_active?: boolean;
};

export type UpdateEmployeeInput = Partial<CreateEmployeeInput>;


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
  shippingNote?: string;
};

export type LaufzettelFormData = {
  area?: string;
  componentName?: string;
  material?: string;
  surface?: string;
  note?: string;
  employeeInitials: string;
  categories: string[];
};

export type PaletteFormData = {
  objectName?: string;
  dimensions?: string;
  positionNumber?: string;
  packageCount: number;
  shippingNote?: string;
  employeeInitials: string;
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
  formData?: LaufzettelFormData | PaletteFormData;
};

export type LaufzettelPrintData = {
  commission: Commission;
  materials: Material[];
  stations: string[];
  printedBy: string;
  printedAt: string;
  formData?: LaufzettelFormData;
};

export type PalettePrintPage = {
  commission: Commission;
  palette: Palette;
  printedBy: string;
  printedAt: string;
};

export type Document = {
  id: string;
  commission_id: string;
  document_type: "laufzettel" | "palette";
  title: string;
  form_data: LaufzettelFormData | PaletteFormData;
  created_by_initials: string;
  created_at: string;
  updated_at: string;
};

export type DocumentPrint = {
  id: string;
  document_id: string;
  print_label: string;
  pdf_url?: string;
  created_by_initials: string;
  created_at: string;
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

// ---- Feedback ----

export type FeedbackStatus = "offen" | "beantwortet" | "erledigt";

export type FeedbackEntry = {
  id: string;
  message: string;
  category?: string;
  status: FeedbackStatus;
  response_text?: string;
  response_by_initials?: string;
  response_at?: string;
  created_by_user_id?: string;
  created_by_email?: string;
  created_by_initials?: string;
  current_path?: string;
  created_at: string;
  updated_at: string;
};

export type CreateFeedbackInput = {
  message: string;
  category?: string;
  current_path?: string;
};

export type UpdateFeedbackInput = {
  status?: FeedbackStatus;
  response_text?: string;
  response_by_initials?: string;
};
