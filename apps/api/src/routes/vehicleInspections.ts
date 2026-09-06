import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

const FLEET_WRITE_ROLES = ["admin", "fleet_admin", "fleet_manager", "driver"];

router.get("/", (req, res) => {
  const { vehicleId } = req.query;
  let query = `
    SELECT vi.*, v.vehicle_number, v.make, v.model
    FROM vehicle_inspections vi
    JOIN vehicles v ON v.id = vi.vehicle_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (vehicleId) {
    query += " AND vi.vehicle_id = ?";
    params.push(vehicleId);
  }
  query += " ORDER BY vi.inspection_date DESC, vi.created_at DESC";
  const rows = db.prepare(query).all(...params);
  res.json({ data: rows });
});

const inspectionSchema = z.object({
  vehicleId: z.string().min(1),
  inspectorName: z.string().min(1),
  inspectionDate: z.string().min(1),
  result: z.enum(["pass", "fail", "requires_attention"]),
  checklist: z.record(z.string()),
  notes: z.string().optional(),
});

router.post("/", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const input = inspectionSchema.parse(req.body);
    const id = uuid();
    const checklistJson = JSON.stringify(input.checklist);

    db.prepare(`
      INSERT INTO vehicle_inspections (
        id, vehicle_id, inspector_id, inspector_name, inspection_date, result, checklist, notes
      ) VALUES (
        @id, @vehicleId, @inspectorId, @inspectorName, @inspectionDate, @result, @checklist, @notes
      )
    `).run({
      id,
      vehicleId: input.vehicleId,
      inspectorId: req.user!.id,
      inspectorName: input.inspectorName,
      inspectionDate: input.inspectionDate,
      result: input.result,
      checklist: checklistJson,
      notes: input.notes ?? null,
    });

    if (input.result === "fail") {
      const veh = db.prepare("SELECT vehicle_number FROM vehicles WHERE id = ?").get(input.vehicleId) as { vehicle_number: string } | undefined;
      const vehNum = veh?.vehicle_number || input.vehicleId;

      // Generate Critical Alert
      db.prepare(`
        INSERT INTO alerts (id, severity, asset_type, asset_id, category, description, status)
        VALUES (?, 'critical', 'vehicle', ?, 'daily_inspection_failed', ?, 'open')
      `).run(
        uuid(),
        input.vehicleId,
        `Daily inspection CRITICAL FAIL for vehicle ${vehNum} on ${input.inspectionDate}. Inspector: ${input.inspectorName}`
      );

      // Auto update vehicle status to under_repair
      db.prepare("UPDATE vehicles SET status = 'under_repair', updated_at = datetime('now') WHERE id = ?").run(input.vehicleId);
    }

    writeAudit({ userId: req.user!.id, action: "VEHICLE_INSPECTION_CREATED", entity: "vehicle_inspections", entityId: id, newValue: input });
    const created = db.prepare("SELECT * FROM vehicle_inspections WHERE id = ?").get(id);
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

export default router;
