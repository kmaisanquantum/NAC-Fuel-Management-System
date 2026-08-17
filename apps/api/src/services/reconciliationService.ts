import { v4 as uuid } from "uuid";
import { db } from "../db";
import { ApiError } from "../middleware/errorHandler";
import { writeAudit } from "../utils/audit";

const MAX_ALLOWED_VARIANCE_PCT = Number(process.env.MAX_ALLOWED_VARIANCE_PCT || 0.5); // configurable business rule

export interface RunReconciliationInput {
  tankId: string;
  reconDate: string; // YYYY-MM-DD
  actualClosing: number;
  userId: string;
}

/**
 * Computes expected closing stock from the immutable ledger for a given tank/day
 * and compares it against a physical/IoT reading. Flags variances beyond the
 * configured threshold as requiring investigation, per spec section 13.
 *
 *   Opening Stock + Receipts + Transfers In - Transfers Out - Aircraft Uplift
 *   - Approved Losses ± Adjustments = Expected Closing Stock
 */
export function runReconciliation(input: RunReconciliationInput) {
  const tank = db.prepare(`SELECT * FROM tanks WHERE id = ?`).get(input.tankId) as any;
  if (!tank) throw new ApiError(404, "Tank not found");

  const dayStart = `${input.reconDate} 00:00:00`;
  const dayEnd = `${input.reconDate} 23:59:59`;

  const priorTxn = db
    .prepare(`SELECT balance_after FROM inventory_transactions WHERE tank_id = ? AND created_at < ? ORDER BY created_at DESC LIMIT 1`)
    .get(input.tankId, dayStart) as { balance_after: number } | undefined;
  const openingStock = priorTxn?.balance_after ?? 0;

  const sums = db
    .prepare(`
      SELECT txn_type, COALESCE(SUM(quantity), 0) as total
      FROM inventory_transactions
      WHERE tank_id = ? AND created_at BETWEEN ? AND ?
      GROUP BY txn_type
    `)
    .all(input.tankId, dayStart, dayEnd) as { txn_type: string; total: number }[];

  const byType = Object.fromEntries(sums.map((s) => [s.txn_type, s.total]));
  const receipts = byType["RECEIPT"] ?? 0;
  const transfersIn = byType["TRANSFER_IN"] ?? 0;
  const transfersOut = Math.abs(byType["TRANSFER_OUT"] ?? 0);
  const aircraftUplift = Math.abs(byType["AIRCRAFT_UPLIFT"] ?? 0);
  const losses = Math.abs(byType["LOSS"] ?? 0);
  const adjustments = (byType["ADJUSTMENT"] ?? 0) + (byType["CORRECTION"] ?? 0);

  const expectedClosing = openingStock + receipts + transfersIn - transfersOut - aircraftUplift - losses + adjustments;
  const variance = input.actualClosing - expectedClosing;
  const variancePct = expectedClosing !== 0 ? (variance / expectedClosing) * 100 : 0;
  const status = Math.abs(variancePct) > MAX_ALLOWED_VARIANCE_PCT ? "investigation_required" : "reconciled";

  const id = uuid();
  db.prepare(`
    INSERT INTO reconciliations
      (id, airport_id, tank_id, recon_date, opening_stock, receipts, transfers_in, transfers_out, aircraft_uplift,
       adjustments, expected_closing, actual_closing, variance, variance_pct, status)
    VALUES (@id, @airportId, @tankId, @reconDate, @openingStock, @receipts, @transfersIn, @transfersOut, @aircraftUplift,
       @adjustments, @expectedClosing, @actualClosing, @variance, @variancePct, @status)
  `).run({
    id,
    airportId: tank.airport_id,
    tankId: input.tankId,
    reconDate: input.reconDate,
    openingStock,
    receipts,
    transfersIn,
    transfersOut,
    aircraftUplift,
    adjustments,
    expectedClosing,
    actualClosing: input.actualClosing,
    variance,
    variancePct,
    status,
  });

  writeAudit({
    userId: input.userId,
    action: "RECONCILIATION_RUN",
    entity: "reconciliations",
    entityId: id,
    newValue: { expectedClosing, actualClosing: input.actualClosing, variance, variancePct, status },
  });

  if (status === "investigation_required") {
    db.prepare(`
      INSERT INTO alerts (id, severity, airport_id, asset_type, asset_id, category, description, status)
      VALUES (?, 'critical', ?, 'tank', ?, 'inventory_variance', ?, 'open')
    `).run(
      uuid(),
      tank.airport_id,
      input.tankId,
      `Unexplained variance of ${variance.toFixed(1)}L (${variancePct.toFixed(2)}%) on tank ${tank.tank_code} for ${input.reconDate}`
    );
  }

  return {
    id,
    openingStock,
    receipts,
    transfersIn,
    transfersOut,
    aircraftUplift,
    losses,
    adjustments,
    expectedClosing,
    actualClosing: input.actualClosing,
    variance,
    variancePct,
    status,
  };
}

export function approveReconciliation(reconId: string, explanation: string, userId: string) {
  const recon = db.prepare(`SELECT * FROM reconciliations WHERE id = ?`).get(reconId) as any;
  if (!recon) throw new ApiError(404, "Reconciliation not found");

  db.prepare(`
    UPDATE reconciliations SET status = 'approved', explanation = ?, approved_by = ?, approved_at = datetime('now') WHERE id = ?
  `).run(explanation, userId, reconId);

  writeAudit({ userId, action: "RECONCILIATION_APPROVED", entity: "reconciliations", entityId: reconId, reason: explanation });
  return { id: reconId, status: "approved" };
}
