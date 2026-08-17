import { db } from "../db";

/**
 * Generates transaction references in the format:
 *   NAC-<AIRPORT>-<TYPE>-<YYYYMMDD>-<sequence>
 * e.g. NAC-POM-UPL-20260815-000123
 */
export function generateReference(airportCode: string, typeCode: "UPL" | "RCT" | "TRF" | "INV", date: Date = new Date()): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const datePart = `${y}${m}${d}`;
  const prefix = `NAC-${airportCode}-${typeCode}-${datePart}-`;

  const table = typeCode === "UPL" ? "fuel_uplifts" : typeCode === "RCT" ? "fuel_receipts" : typeCode === "TRF" ? "fuel_transfers" : "invoices";
  const col = typeCode === "INV" ? "invoice_number" : "reference";

  const row = db
    .prepare(`SELECT COUNT(*) as cnt FROM ${table} WHERE ${col} LIKE ?`)
    .get(`${prefix}%`) as { cnt: number };

  const seq = String(row.cnt + 1).padStart(6, "0");
  return `${prefix}${seq}`;
}
