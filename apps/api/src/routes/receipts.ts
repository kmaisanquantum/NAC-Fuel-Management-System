import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { createReceipt, transitionReceipt } from "../services/receiptService";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { airportId, status } = req.query;
  let sql = `SELECT * FROM fuel_receipts WHERE 1=1`;
  const params: any[] = [];
  if (airportId) { sql += ` AND airport_id = ?`; params.push(airportId); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY created_at DESC`;
  res.json({ data: db.prepare(sql).all(...params) });
});

router.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM fuel_receipts WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Receipt not found" });
  res.json({ data: row });
});

const schema = z.object({
  airportId: z.string(),
  airportCode: z.string(),
  supplierId: z.string(),
  tankId: z.string(),
  fuelProductId: z.string(),
  quantity: z.number().positive(),
  deliveryVehicle: z.string().optional(),
  driverName: z.string().optional(),
  deliveryDocument: z.string().optional(),
  batchNumber: z.string().optional(),
  meterReading: z.number().optional(),
  qualityCertRef: z.string().optional(),
});

router.post("/", requireRole("nac_admin", "airport_fuel_manager", "fuel_operator"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const result = createReceipt({ ...input, createdBy: req.user!.id });
    res.status(201).json({ data: result });
  } catch (e) { next(e); }
});

router.post("/:id/transition", requireRole("nac_admin", "airport_fuel_manager", "fuel_operator", "national_fuel_manager"), (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["submitted", "verified", "approved", "posted", "draft"]) }).parse(req.body);
    const result = transitionReceipt(req.params.id, status, req.user!.id, req.user!.roleName);
    res.json({ data: result });
  } catch (e) { next(e); }
});

export default router;
