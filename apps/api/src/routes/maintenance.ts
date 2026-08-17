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
  const { airportId, status } = req.query;
  let sql = `SELECT * FROM maintenance_records WHERE 1=1`;
  const params: any[] = [];
  if (airportId) { sql += ` AND airport_id = ?`; params.push(airportId); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY scheduled_date DESC`;
  res.json({ data: db.prepare(sql).all(...params) });
});

const schema = z.object({
  airportId: z.string(), assetType: z.enum(["tank", "refueller", "meter", "other"]), assetId: z.string(),
  maintenanceType: z.string().optional(), scheduledDate: z.string().optional(), technician: z.string().optional(),
  workPerformed: z.string().optional(), parts: z.string().optional(), cost: z.number().optional(), nextMaintenance: z.string().optional(),
});

router.post("/", requireRole("nac_admin", "engineering_maintenance", "airport_fuel_manager"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO maintenance_records (id, airport_id, asset_type, asset_id, maintenance_type, scheduled_date, technician, work_performed, parts, cost, next_maintenance, status)
      VALUES (@id, @airportId, @assetType, @assetId, @maintenanceType, @scheduledDate, @technician, @workPerformed, @parts, @cost, @nextMaintenance, 'scheduled')
    `).run({ id, ...input, maintenanceType: input.maintenanceType ?? null, scheduledDate: input.scheduledDate ?? null, technician: input.technician ?? null, workPerformed: input.workPerformed ?? null, parts: input.parts ?? null, cost: input.cost ?? null, nextMaintenance: input.nextMaintenance ?? null });
    writeAudit({ userId: req.user!.id, action: "MAINTENANCE_SCHEDULED", entity: "maintenance_records", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

router.post("/:id/complete", requireRole("nac_admin", "engineering_maintenance"), (req, res, next) => {
  try {
    db.prepare(`UPDATE maintenance_records SET status = 'completed', completed_date = date('now') WHERE id = ?`).run(req.params.id);
    writeAudit({ userId: req.user!.id, action: "MAINTENANCE_COMPLETED", entity: "maintenance_records", entityId: req.params.id });
    res.json({ data: { id: req.params.id, status: "completed" } });
  } catch (e) { next(e); }
});

export default router;
