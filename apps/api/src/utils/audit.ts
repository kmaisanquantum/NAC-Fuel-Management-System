import { v4 as uuid } from "uuid";
import { db } from "../db";

export interface AuditEntry {
  userId?: string | null;
  role?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  previousValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  device?: string | null;
  reason?: string | null;
}

/**
 * Writes an immutable audit record. Fuel and financial records are never
 * hard-deleted (see BUSINESS_RULES.md) — this is the system of record for
 * "who did what, when, and why".
 */
export function writeAudit(entry: AuditEntry) {
  // Prepared lazily (not at module load) so this module can be safely imported
  // before initSchema() has run (e.g. by the seed script).
  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, user_id, role, action, entity, entity_id, previous_value, new_value, ip_address, device, reason, created_at)
    VALUES (@id, @userId, @role, @action, @entity, @entityId, @previousValue, @newValue, @ipAddress, @device, @reason, datetime('now'))
  `);
  insertAudit.run({
    id: uuid(),
    userId: entry.userId ?? null,
    role: entry.role ?? null,
    action: entry.action,
    entity: entry.entity,
    entityId: entry.entityId ?? null,
    previousValue: entry.previousValue !== undefined ? JSON.stringify(entry.previousValue) : null,
    newValue: entry.newValue !== undefined ? JSON.stringify(entry.newValue) : null,
    ipAddress: entry.ipAddress ?? null,
    device: entry.device ?? null,
    reason: entry.reason ?? null,
  });
}
