import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { airportId } = req.query;
  const rows = airportId
    ? db.prepare(`SELECT * FROM refuellers WHERE airport_id = ? ORDER BY asset_code`).all(airportId)
    : db.prepare(`SELECT * FROM refuellers ORDER BY asset_code`).all();
  res.json({ data: rows });
});

const schema = z.object({
  airportId: z.string(),
  assetCode: z.string(),
  registration: z.string().optional(),
  capacity: z.number().positive(),
  fuelProductId: z.string().optional(),
});

router.post("/", requireRole("nac_admin", "airport_fuel_manager", "engineering_maintenance"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO refuellers (id, airport_id, asset_code, registration, capacity, fuel_product_id, current_level, status)
      VALUES (@id, @airportId, @assetCode, @registration, @capacity, @fuelProductId, 0, 'active')
    `).run({ id, ...input, registration: input.registration ?? null, fuelProductId: input.fuelProductId ?? null });
    writeAudit({ userId: req.user!.id, action: "REFUELLER_CREATED", entity: "refuellers", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

router.patch("/:id/status", requireRole("nac_admin", "airport_fuel_manager", "engineering_maintenance"), (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["active", "maintenance", "offline", "decommissioned"]) }).parse(req.body);
    db.prepare(`UPDATE refuellers SET status = ?, updated_at = datetime('now') WHERE id = ?`).run(status, req.params.id);
    writeAudit({ userId: req.user!.id, action: "REFUELLER_STATUS_CHANGED", entity: "refuellers", entityId: req.params.id, newValue: { status } });
    res.json({ data: db.prepare(`SELECT * FROM refuellers WHERE id = ?`).get(req.params.id) });
  } catch (e) { next(e); }
});

export default router;
