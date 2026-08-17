import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { createTransfer } from "../services/transferService";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { airportId } = req.query;
  const rows = airportId
    ? db.prepare(`SELECT * FROM fuel_transfers WHERE airport_id = ? ORDER BY created_at DESC`).all(airportId)
    : db.prepare(`SELECT * FROM fuel_transfers ORDER BY created_at DESC`).all();
  res.json({ data: rows });
});

const schema = z.object({
  airportId: z.string(),
  airportCode: z.string(),
  destinationAirportId: z.string().optional(),
  sourceType: z.enum(["tank", "refueller"]),
  sourceId: z.string(),
  destinationType: z.enum(["tank", "refueller"]),
  destinationId: z.string(),
  fuelProductId: z.string(),
  quantity: z.number().positive(),
  sourceMeterReading: z.number().optional(),
  destinationMeterReading: z.number().optional(),
  reason: z.string().optional(),
});

router.post("/", requireRole("nac_admin", "airport_fuel_manager", "fuel_operator"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const result = createTransfer({ ...input, operatorId: req.user!.id });
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

export default router;
