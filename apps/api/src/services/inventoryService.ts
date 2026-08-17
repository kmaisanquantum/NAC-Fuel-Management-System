import { v4 as uuid } from "uuid";
import { db } from "../db";
import { ApiError } from "../middleware/errorHandler";

export type InventoryTxnType =
  | "RECEIPT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT"
  | "AIRCRAFT_UPLIFT"
  | "RETURN"
  | "ADJUSTMENT"
  | "LOSS"
  | "CORRECTION";

export interface PostMovementInput {
  tankId: string;
  txnType: InventoryTxnType;
  quantity: number; // always positive magnitude; direction derived from txnType
  referenceType: string;
  referenceId?: string | null;
  reason?: string | null;
  createdBy?: string | null;
  allowNegative?: boolean; // controlled exception, business-rule gated
}

const OUTBOUND_TYPES = new Set<InventoryTxnType>(["TRANSFER_OUT", "AIRCRAFT_UPLIFT", "LOSS"]);

/**
 * Posts a single inventory movement as an immutable ledger entry and updates
 * the cached balance. Must always run inside a DB transaction alongside the
 * originating business transaction (receipt/transfer/uplift) — see callers.
 *
 * Enforces: no negative inventory unless explicitly allowed (BUSINESS_RULES.md).
 */
export function postInventoryMovement(input: PostMovementInput) {
  const tank = db.prepare(`SELECT * FROM tanks WHERE id = ?`).get(input.tankId) as any;
  if (!tank) throw new ApiError(404, "Tank not found");

  const signedQty = OUTBOUND_TYPES.has(input.txnType) || (input.txnType === "ADJUSTMENT" && input.quantity < 0)
    ? -Math.abs(input.quantity)
    : Math.abs(input.quantity);

  const balanceRow = db.prepare(`SELECT current_level FROM inventory_balances WHERE tank_id = ?`).get(input.tankId) as
    | { current_level: number }
    | undefined;
  const currentLevel = balanceRow?.current_level ?? tank.current_level ?? 0;
  const newLevel = currentLevel + signedQty;

  if (newLevel < 0 && !input.allowNegative) {
    throw new ApiError(422, `Movement would result in negative inventory (${currentLevel} + ${signedQty} = ${newLevel})`);
  }
  if (newLevel > tank.capacity) {
    throw new ApiError(422, `Movement would exceed tank capacity (${newLevel} > ${tank.capacity})`);
  }

  const txnId = uuid();
  db.prepare(`
    INSERT INTO inventory_transactions
      (id, airport_id, tank_id, fuel_product_id, txn_type, quantity, reference_type, reference_id, balance_after, reason, created_by)
    VALUES (@id, @airportId, @tankId, @fuelProductId, @txnType, @quantity, @referenceType, @referenceId, @balanceAfter, @reason, @createdBy)
  `).run({
    id: txnId,
    airportId: tank.airport_id,
    tankId: input.tankId,
    fuelProductId: tank.fuel_product_id,
    txnType: input.txnType,
    quantity: signedQty,
    referenceType: input.referenceType,
    referenceId: input.referenceId ?? null,
    balanceAfter: newLevel,
    reason: input.reason ?? null,
    createdBy: input.createdBy ?? null,
  });

  db.prepare(`
    INSERT INTO inventory_balances (tank_id, airport_id, fuel_product_id, current_level, last_updated)
    VALUES (@tankId, @airportId, @fuelProductId, @level, datetime('now'))
    ON CONFLICT(tank_id) DO UPDATE SET current_level = @level, last_updated = datetime('now')
  `).run({ tankId: input.tankId, airportId: tank.airport_id, fuelProductId: tank.fuel_product_id, level: newLevel });

  db.prepare(`UPDATE tanks SET current_level = ?, updated_at = datetime('now') WHERE id = ?`).run(newLevel, input.tankId);

  return { transactionId: txnId, balanceAfter: newLevel };
}

export function getTankBalance(tankId: string): number {
  const row = db.prepare(`SELECT current_level FROM inventory_balances WHERE tank_id = ?`).get(tankId) as
    | { current_level: number }
    | undefined;
  return row?.current_level ?? 0;
}

export function getLedger(tankId: string, limit = 100) {
  return db
    .prepare(`SELECT * FROM inventory_transactions WHERE tank_id = ? ORDER BY created_at DESC LIMIT ?`)
    .all(tankId, limit);
}
