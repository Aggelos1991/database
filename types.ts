export enum Entity {
  ANDALUSIA = "IKOS ANDALUSIA",
  PORTO_PETRO = "IKOS PORTO PETRO",
  SHM = "IKOS SPANISH HOTEL MANAGEMENT",
  MARBELLA = "IKOS MARBELLA",
  MARBELLA_HOLDCO = "IKOS MARBELLA HOLDCO",
  PORTO_PETRO_HOLDCO = "IKOS PORTO PETRO HOLDCO",
  UNKNOWN = "UNKNOWN"
}

export enum DocType {
  STATEMENT = "Statement",
  INVOICE = "Invoice",
  CREDIT_NOTE = "Credit Note",
  PAYMENT_PROOF = "Payment Proof",
  EMAIL = "Email",
  IMAGE = "Image",
  SPREADSHEET = "Spreadsheet"
}

export interface DocumentRecord {
  id: string;
  vendor: string;
  entity: Entity;
  year: number;
  month: number;
  type: DocType;
  filename: string;
  uploadedAt: string;
  size: string;
  fileData?: string; // Base64 string for preview
}

export interface FilterState {
  vendor: string | null;
  entity: string | null;
  year: number | null;
  month: number | null;
  document_type: string | null;
  startDate: string | null; // ISO Date YYYY-MM-DD
  endDate: string | null;   // ISO Date YYYY-MM-DD
}

export const MONTH_MAP: Record<number, string> = {
  1: "Jan", 2: "Feb", 3: "Mar", 4: "Apr",
  5: "May", 6: "Jun", 7: "Jul", 8: "Aug",
  9: "Sep", 10: "Oct", 11: "Nov", 12: "Dec"
};

export const REVERSE_MONTH_MAP: Record<string, number> = Object.entries(MONTH_MAP).reduce((acc, [k, v]) => {
  acc[v.toLowerCase()] = parseInt(k);
  return acc;
}, {} as Record<string, number>);