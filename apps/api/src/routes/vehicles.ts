import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

const FLEET_WRITE_ROLES = ["admin", "fleet_admin", "fleet_manager"];

router.get("/", (req, res) => {
  const { status, department } = req.query;
  let query = "SELECT * FROM vehicles WHERE 1=1";
  const params: any[] = [];
  if (status) {
    query += " AND status = ?";
    params.push(status);
  }
  if (department) {
    query += " AND department = ?";
    params.push(department);
  }
  query += " ORDER BY vehicle_number ASC";
  const rows = db.prepare(query).all(...params);
  res.json({ data: rows });
});

router.get("/:id", (req, res) => {
  const vehicle = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
  if (!vehicle) return res.status(404).json({ error: "Vehicle not found" });
  res.json({ data: vehicle });
});

const vehicleSchema = z.object({
  vehicleNumber: z.string().min(1),
  registrationNumber: z.string().min(1),
  make: z.string().min(1),
  model: z.string().min(1),
  year: z.number().optional(),
  vehicleType: z.string().min(1),
  chassisVin: z.string().optional(),
  engineNumber: z.string().optional(),
  colour: z.string().optional(),
  fuelType: z.string().min(1),
  department: z.string().optional(),
  location: z.string().optional(),
  status: z.enum(["active", "inactive", "under_repair", "disposed"]).default("active"),
  acquisitionDate: z.string().optional(),
  acquisitionCost: z.number().optional(),
  currentValue: z.number().optional(),
  ownership: z.enum(["owned", "leased", "hired", "other"]).default("owned"),
  insurancePolicy: z.string().optional(),
  insuranceExpiry: z.string().optional(),
  registrationExpiry: z.string().optional(),
});

router.post("/", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const input = vehicleSchema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO vehicles (
        id, vehicle_number, registration_number, make, model, year, vehicle_type,
        chassis_vin, engine_number, colour, fuel_type, department, location, status,
        acquisition_date, acquisition_cost, current_value, ownership, insurance_policy,
        insurance_expiry, registration_expiry
      ) VALUES (
        @id, @vehicleNumber, @registrationNumber, @make, @model, @year, @vehicleType,
        @chassisVin, @engineNumber, @colour, @fuelType, @department, @location, @status,
        @acquisitionDate, @acquisitionCost, @currentValue, @ownership, @insurancePolicy,
        @insuranceExpiry, @registrationExpiry
      )
    `).run({
      id,
      vehicleNumber: input.vehicleNumber,
      registrationNumber: input.registrationNumber,
      make: input.make,
      model: input.model,
      year: input.year ?? null,
      vehicleType: input.vehicleType,
      chassisVin: input.chassisVin ?? null,
      engineNumber: input.engineNumber ?? null,
      colour: input.colour ?? null,
      fuelType: input.fuelType,
      department: input.department ?? null,
      location: input.location ?? null,
      status: input.status,
      acquisitionDate: input.acquisitionDate ?? null,
      acquisitionCost: input.acquisitionCost ?? null,
      currentValue: input.currentValue ?? null,
      ownership: input.ownership,
      insurancePolicy: input.insurancePolicy ?? null,
      insuranceExpiry: input.insuranceExpiry ?? null,
      registrationExpiry: input.registrationExpiry ?? null,
    });

    writeAudit({ userId: req.user!.id, action: "VEHICLE_CREATED", entity: "vehicles", entityId: id, newValue: input });
    const created = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(id);
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

router.put("/:id", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const input = vehicleSchema.partial().parse(req.body);
    const existing = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id) as any;
    if (!existing) return res.status(404).json({ error: "Vehicle not found" });

    db.prepare(`
      UPDATE vehicles SET
        registration_number = COALESCE(@registrationNumber, registration_number),
        make = COALESCE(@make, make),
        model = COALESCE(@model, model),
        year = COALESCE(@year, year),
        vehicle_type = COALESCE(@vehicleType, vehicle_type),
        chassis_vin = COALESCE(@chassisVin, chassis_vin),
        engine_number = COALESCE(@engineNumber, engine_number),
        colour = COALESCE(@colour, colour),
        fuel_type = COALESCE(@fuelType, fuel_type),
        department = COALESCE(@department, department),
        location = COALESCE(@location, location),
        status = COALESCE(@status, status),
        acquisition_date = COALESCE(@acquisitionDate, acquisition_date),
        acquisition_cost = COALESCE(@acquisitionCost, acquisition_cost),
        current_value = COALESCE(@currentValue, current_value),
        ownership = COALESCE(@ownership, ownership),
        insurance_policy = COALESCE(@insurancePolicy, insurance_policy),
        insurance_expiry = COALESCE(@insuranceExpiry, insurance_expiry),
        registration_expiry = COALESCE(@registrationExpiry, registration_expiry),
        updated_at = datetime('now')
      WHERE id = @id
    `).run({
      id: req.params.id,
      registrationNumber: input.registrationNumber ?? null,
      make: input.make ?? null,
      model: input.model ?? null,
      year: input.year ?? null,
      vehicleType: input.vehicleType ?? null,
      chassisVin: input.chassisVin ?? null,
      engineNumber: input.engineNumber ?? null,
      colour: input.colour ?? null,
      fuelType: input.fuelType ?? null,
      department: input.department ?? null,
      location: input.location ?? null,
      status: input.status ?? null,
      acquisitionDate: input.acquisitionDate ?? null,
      acquisitionCost: input.acquisitionCost ?? null,
      currentValue: input.currentValue ?? null,
      ownership: input.ownership ?? null,
      insurancePolicy: input.insurancePolicy ?? null,
      insuranceExpiry: input.insuranceExpiry ?? null,
      registrationExpiry: input.registrationExpiry ?? null,
    });

    writeAudit({ userId: req.user!.id, action: "VEHICLE_UPDATED", entity: "vehicles", entityId: req.params.id, previousValue: existing, newValue: input });
    const updated = db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id);
    res.json({ data: updated });
  } catch (e) { next(e); }
});

router.patch("/:id/status", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["active", "inactive", "under_repair", "disposed"]) }).parse(req.body);
    db.prepare("UPDATE vehicles SET status = ?, updated_at = datetime('now') WHERE id = ?").run(status, req.params.id);
    writeAudit({ userId: req.user!.id, action: "VEHICLE_STATUS_CHANGED", entity: "vehicles", entityId: req.params.id, newValue: { status } });
    res.json({ data: db.prepare("SELECT * FROM vehicles WHERE id = ?").get(req.params.id) });
  } catch (e) { next(e); }
});

export default router;
