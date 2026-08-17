import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { createUplift } from "../services/upliftService";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { airportId } = req.query;
  const rows = airportId
    ? db.prepare(`SELECT * FROM fuel_uplifts WHERE airport_id = ? ORDER BY created_at DESC`).all(airportId)
    : db.prepare(`SELECT * FROM fuel_uplifts ORDER BY created_at DESC LIMIT 200`).all();
  res.json({ data: rows });
});

router.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM fuel_uplifts WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Uplift not found" });
  res.json({ data: row });
});

const schema = z.object({
  airportId: z.string(),
  airportCode: z.string(),
  airlineId: z.string(),
  aircraftId: z.string(),
  flightNumber: z.string().optional(),
  fuelProductId: z.string(),
  refuellerId: z.string(),
  tankId: z.string(),
  quantity: z.number().positive(),
  startMeterReading: z.number().optional(),
  endMeterReading: z.number().optional(),
  pricePerLitre: z.number().positive(),
  customerAuthorisation: z.string().optional(),
});

router.post("/", requireRole("nac_admin", "airport_fuel_manager", "fuel_operator"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const result = createUplift({ ...input, operatorId: req.user!.id });
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

export default router;
