import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { runReconciliation, approveReconciliation } from "../services/reconciliationService";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { airportId, tankId, status } = req.query;
  let sql = `SELECT * FROM reconciliations WHERE 1=1`;
  const params: any[] = [];
  if (airportId) { sql += ` AND airport_id = ?`; params.push(airportId); }
  if (tankId) { sql += ` AND tank_id = ?`; params.push(tankId); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY recon_date DESC`;
  res.json({ data: db.prepare(sql).all(...params) });
});

const runSchema = z.object({ tankId: z.string(), reconDate: z.string(), actualClosing: z.number() });

router.post("/run", requireRole("nac_admin", "airport_fuel_manager", "national_fuel_manager", "finance_officer"), (req, res, next) => {
  try {
    const input = runSchema.parse(req.body);
    res.status(201).json({ data: runReconciliation({ ...input, userId: req.user!.id }) });
  } catch (e) { next(e); }
});

router.post("/:id/approve", requireRole("nac_admin", "airport_fuel_manager", "national_fuel_manager"), (req, res, next) => {
  try {
    const { explanation } = z.object({ explanation: z.string().min(3) }).parse(req.body);
    res.json({ data: approveReconciliation(req.params.id, explanation, req.user!.id) });
  } catch (e) { next(e); }
});

export default router;
