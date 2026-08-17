import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";
import { getLedger } from "../services/inventoryService";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { airportId } = req.query;
  const rows = airportId
    ? db.prepare(`SELECT * FROM tanks WHERE airport_id = ? ORDER BY tank_code`).all(airportId)
    : db.prepare(`SELECT * FROM tanks ORDER BY tank_code`).all();
  res.json({ data: rows });
});

router.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM tanks WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Tank not found" });
  res.json({ data: row });
});

router.get("/:id/ledger", (req, res) => {
  res.json({ data: getLedger(req.params.id, Number(req.query.limit) || 100) });
});

const schema = z.object({
  airportId: z.string(),
  fuelFacilityId: z.string(),
  fuelProductId: z.string(),
  tankCode: z.string(),
  capacity: z.number().positive(),
  installationDate: z.string().optional(),
});

router.post("/", requireRole("nac_admin", "airport_fuel_manager", "engineering_maintenance"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO tanks (id, airport_id, fuel_facility_id, fuel_product_id, tank_code, capacity, current_level, status, installation_date, maintenance_status)
      VALUES (@id, @airportId, @fuelFacilityId, @fuelProductId, @tankCode, @capacity, 0, 'active', @installationDate, 'ok')
    `).run({ id, ...input, installationDate: input.installationDate ?? null });
    db.prepare(`INSERT INTO inventory_balances (tank_id, airport_id, fuel_product_id, current_level) VALUES (?,?,?,0)`)
      .run(id, input.airportId, input.fuelProductId);
    writeAudit({ userId: req.user!.id, action: "TANK_CREATED", entity: "tanks", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

// Manual/IoT reading update
router.post("/:id/reading", requireRole("nac_admin", "airport_fuel_manager", "fuel_operator", "engineering_maintenance"), (req, res, next) => {
  try {
    const { temperature, waterLevel } = z.object({ temperature: z.number().optional(), waterLevel: z.number().optional() }).parse(req.body);
    db.prepare(`UPDATE tanks SET temperature = COALESCE(?, temperature), water_level = COALESCE(?, water_level), updated_at = datetime('now') WHERE id = ?`)
      .run(temperature ?? null, waterLevel ?? null, req.params.id);
    res.json({ data: db.prepare(`SELECT * FROM tanks WHERE id = ?`).get(req.params.id) });
  } catch (e) { next(e); }
});

export default router;
