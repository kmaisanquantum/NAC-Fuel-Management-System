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

router.get("/", (_req, res) => {
  const rows = db.prepare("SELECT * FROM drivers ORDER BY name ASC").all();
  res.json({ data: rows });
});

router.get("/:id", (req, res) => {
  const driver = db.prepare("SELECT * FROM drivers WHERE id = ?").get(req.params.id);
  if (!driver) return res.status(404).json({ error: "Driver not found" });
  res.json({ data: driver });
});

const driverSchema = z.object({
  employeeNumber: z.string().min(1),
  name: z.string().min(1),
  department: z.string().optional(),
  licenceNumber: z.string().min(1),
  licenceClass: z.string().optional(),
  licenceExpiry: z.string().min(1),
  authorisationStatus: z.enum(["authorised", "suspended", "revoked", "pending"]).default("authorised"),
  accidentHistory: z.string().optional(),
  training: z.string().optional(),
});

router.post("/", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const input = driverSchema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO drivers (
        id, employee_number, name, department, licence_number, licence_class,
        licence_expiry, authorisation_status, accident_history, training
      ) VALUES (
        @id, @employeeNumber, @name, @department, @licenceNumber, @licenceClass,
        @licenceExpiry, @authorisationStatus, @accidentHistory, @training
      )
    `).run({
      id,
      employeeNumber: input.employeeNumber,
      name: input.name,
      department: input.department ?? null,
      licenceNumber: input.licenceNumber,
      licenceClass: input.licenceClass ?? null,
      licenceExpiry: input.licenceExpiry,
      authorisationStatus: input.authorisationStatus,
      accidentHistory: input.accidentHistory ?? null,
      training: input.training ?? null,
    });

    writeAudit({ userId: req.user!.id, action: "DRIVER_CREATED", entity: "drivers", entityId: id, newValue: input });
    const created = db.prepare("SELECT * FROM drivers WHERE id = ?").get(id);
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

router.put("/:id", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const input = driverSchema.partial().parse(req.body);
    const existing = db.prepare("SELECT * FROM drivers WHERE id = ?").get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Driver not found" });

    db.prepare(`
      UPDATE drivers SET
        name = COALESCE(@name, name),
        department = COALESCE(@department, department),
        licence_number = COALESCE(@licenceNumber, licence_number),
        licence_class = COALESCE(@licenceClass, licence_class),
        licence_expiry = COALESCE(@licenceExpiry, licence_expiry),
        authorisation_status = COALESCE(@authorisationStatus, authorisation_status),
        accident_history = COALESCE(@accidentHistory, accident_history),
        training = COALESCE(@training, training),
        updated_at = datetime('now')
      WHERE id = @id
    `).run({
      id: req.params.id,
      name: input.name ?? null,
      department: input.department ?? null,
      licenceNumber: input.licenceNumber ?? null,
      licenceClass: input.licenceClass ?? null,
      licenceExpiry: input.licenceExpiry ?? null,
      authorisationStatus: input.authorisationStatus ?? null,
      accidentHistory: input.accidentHistory ?? null,
      training: input.training ?? null,
    });

    writeAudit({ userId: req.user!.id, action: "DRIVER_UPDATED", entity: "drivers", entityId: req.params.id, newValue: input });
    const updated = db.prepare("SELECT * FROM drivers WHERE id = ?").get(req.params.id);
    res.json({ data: updated });
  } catch (e) { next(e); }
});

export default router;
