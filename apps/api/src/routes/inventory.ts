import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { postInventoryMovement, getTankBalance } from "../services/inventoryService";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/balances", (req, res) => {
  const { airportId } = req.query;
  const rows = airportId
    ? db.prepare(`SELECT b.*, t.tank_code FROM inventory_balances b JOIN tanks t ON t.id = b.tank_id WHERE b.airport_id = ?`).all(airportId)
    : db.prepare(`SELECT b.*, t.tank_code FROM inventory_balances b JOIN tanks t ON t.id = b.tank_id`).all();
  res.json({ data: rows });
});

router.get("/balances/:tankId", (req, res) => {
  res.json({ data: { tankId: req.params.tankId, currentLevel: getTankBalance(req.params.tankId) } });
});

router.get("/transactions", (req, res) => {
  const { tankId, airportId, limit } = req.query;
  let sql = `SELECT * FROM inventory_transactions WHERE 1=1`;
  const params: any[] = [];
  if (tankId) { sql += ` AND tank_id = ?`; params.push(tankId); }
  if (airportId) { sql += ` AND airport_id = ?`; params.push(airportId); }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(Number(limit) || 200);
  res.json({ data: db.prepare(sql).all(...params) });
});

// Manual adjustment: requires reason, goes straight to ledger, always audited (spec section 12/32)
const adjustSchema = z.object({
  tankId: z.string(),
  quantity: z.number(),
  reason: z.string().min(5, "A reason of at least 5 characters is required for adjustments"),
});

router.post("/adjustments", requireRole("nac_admin", "airport_fuel_manager", "national_fuel_manager"), (req, res, next) => {
  try {
    const input = adjustSchema.parse(req.body);
    const result = postInventoryMovement({
      tankId: input.tankId,
      txnType: "ADJUSTMENT",
      quantity: input.quantity,
      referenceType: "manual_adjustment",
      reason: input.reason,
      createdBy: req.user!.id,
    });
    writeAudit({
      userId: req.user!.id, role: req.user!.roleName, action: "INVENTORY_ADJUSTED",
      entity: "inventory_transactions", entityId: result.transactionId, reason: input.reason, newValue: input,
    });
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

export default router;
