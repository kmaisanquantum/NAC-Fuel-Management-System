import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", (_req, res) => {
  res.json({ data: db.prepare(`SELECT * FROM fuel_products ORDER BY name`).all() });
});

const schema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  fuelType: z.string().min(1),
  unitOfMeasure: z.string().default("L"),
  density: z.number().optional(),
  minimumStock: z.number().default(0),
  maximumStock: z.number().default(0),
  safetyStock: z.number().default(0),
});

router.post("/", requireRole("nac_admin", "national_fuel_manager"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO fuel_products (id, name, code, fuel_type, unit_of_measure, density, minimum_stock, maximum_stock, safety_stock, active)
      VALUES (@id, @name, @code, @fuelType, @unitOfMeasure, @density, @minimumStock, @maximumStock, @safetyStock, 1)
    `).run({ id, ...input, density: input.density ?? null });
    writeAudit({ userId: req.user!.id, action: "FUEL_PRODUCT_CREATED", entity: "fuel_products", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

export default router;
