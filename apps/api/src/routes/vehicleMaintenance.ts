import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

const FLEET_WRITE_ROLES = ["nac_admin", "fleet_admin", "fleet_manager"];

router.get("/maintenance", (req, res) => {
  const { vehicleId } = req.query;
  let query = `
    SELECT vm.*, v.vehicle_number, v.make, v.model
    FROM vehicle_maintenance vm
    JOIN vehicles v ON v.id = vm.vehicle_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (vehicleId) {
    query += " AND vm.vehicle_id = ?";
    params.push(vehicleId);
  }
  query += " ORDER BY vm.scheduled_date DESC, vm.created_at DESC";
  const rows = db.prepare(query).all(...params);
  res.json({ data: rows });
});

const maintenanceSchema = z.object({
  vehicleId: z.string().min(1),
  maintenanceType: z.enum(["scheduled_service", "unscheduled_repair", "inspection_fix", "other"]),
  description: z.string().min(1),
  scheduledDate: z.string().optional(),
  completedDate: z.string().optional(),
  technician: z.string().optional(),
  workPerformed: z.string().optional(),
  parts: z.string().optional(),
  cost: z.number().optional(),
  status: z.enum(["scheduled", "in_progress", "completed", "cancelled"]).default("scheduled"),
});

router.post("/maintenance", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const input = maintenanceSchema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO vehicle_maintenance (
        id, vehicle_id, maintenance_type, description, scheduled_date, completed_date,
        technician, work_performed, parts, cost, status
      ) VALUES (
        @id, @vehicleId, @maintenanceType, @description, @scheduledDate, @completedDate,
        @technician, @workPerformed, @parts, @cost, @status
      )
    `).run({
      id,
      vehicleId: input.vehicleId,
      maintenanceType: input.maintenanceType,
      description: input.description,
      scheduledDate: input.scheduledDate ?? null,
      completedDate: input.completedDate ?? null,
      technician: input.technician ?? null,
      workPerformed: input.workPerformed ?? null,
      parts: input.parts ?? null,
      cost: input.cost ?? null,
      status: input.status,
    });

    writeAudit({ userId: req.user!.id, action: "VEHICLE_MAINTENANCE_LOGGED", entity: "vehicle_maintenance", entityId: id, newValue: input });
    const created = db.prepare("SELECT * FROM vehicle_maintenance WHERE id = ?").get(id);
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

router.get("/breakdowns", (req, res) => {
  const { vehicleId } = req.query;
  let query = `
    SELECT vb.*, v.vehicle_number, d.name as driver_name
    FROM vehicle_breakdowns vb
    JOIN vehicles v ON v.id = vb.vehicle_id
    LEFT JOIN drivers d ON d.id = vb.driver_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (vehicleId) {
    query += " AND vb.vehicle_id = ?";
    params.push(vehicleId);
  }
  query += " ORDER BY vb.breakdown_date DESC";
  const rows = db.prepare(query).all(...params);
  res.json({ data: rows });
});

const breakdownSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().optional(),
  breakdownDate: z.string().min(1),
  location: z.string().min(1),
  description: z.string().min(1),
  towingRequired: z.boolean().default(false),
});

router.post("/breakdowns", requireRole(...FLEET_WRITE_ROLES, "driver"), (req, res, next) => {
  try {
    const input = breakdownSchema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO vehicle_breakdowns (
        id, vehicle_id, driver_id, breakdown_date, location, description, towing_required, status
      ) VALUES (
        @id, @vehicleId, @driverId, @breakdownDate, @location, @description, @towingRequired, 'reported'
      )
    `).run({
      id,
      vehicleId: input.vehicleId,
      driverId: input.driverId ?? null,
      breakdownDate: input.breakdownDate,
      location: input.location,
      description: input.description,
      towingRequired: input.towingRequired ? 1 : 0,
    });

    // Generate Alert & set vehicle to under_repair
    db.prepare("UPDATE vehicles SET status = 'under_repair', updated_at = datetime('now') WHERE id = ?").run(input.vehicleId);
    db.prepare(`
      INSERT INTO alerts (id, severity, asset_type, asset_id, category, description, status)
      VALUES (?, 'warning', 'vehicle', ?, 'vehicle_breakdown', ?, 'open')
    `).run(uuid(), input.vehicleId, `Vehicle breakdown reported on ${input.breakdownDate} at ${input.location}: ${input.description}`);

    writeAudit({ userId: req.user!.id, action: "VEHICLE_BREAKDOWN_REPORTED", entity: "vehicle_breakdowns", entityId: id, newValue: input });
    const created = db.prepare("SELECT * FROM vehicle_breakdowns WHERE id = ?").get(id);
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

export default router;
