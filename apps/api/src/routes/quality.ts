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
  const { airportId } = req.query;
  const rows = airportId
    ? db.prepare(`SELECT * FROM fuel_quality_tests WHERE airport_id = ? ORDER BY sample_date DESC`).all(airportId)
    : db.prepare(`SELECT * FROM fuel_quality_tests ORDER BY sample_date DESC`).all();
  res.json({ data: rows });
});

const schema = z.object({
  airportId: z.string(), tankId: z.string().optional(), fuelProductId: z.string(),
  sampleDate: z.string(), sampleType: z.string().optional(), testType: z.string().optional(),
  result: z.string().optional(), passFail: z.enum(["pass", "fail", "pending"]).default("pending"),
  technician: z.string().optional(), certificateRef: z.string().optional(), comments: z.string().optional(),
});

router.post("/", requireRole("nac_admin", "safety_regulatory_officer", "airport_fuel_manager"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const id = uuid();
    const sampleRef = `QT-${Date.now()}`;
    db.prepare(`
      INSERT INTO fuel_quality_tests (id, sample_ref, airport_id, tank_id, fuel_product_id, sample_date, sample_type, test_type, result, pass_fail, technician, certificate_ref, comments)
      VALUES (@id, @sampleRef, @airportId, @tankId, @fuelProductId, @sampleDate, @sampleType, @testType, @result, @passFail, @technician, @certificateRef, @comments)
    `).run({ id, sampleRef, ...input, tankId: input.tankId ?? null, sampleType: input.sampleType ?? null, testType: input.testType ?? null, result: input.result ?? null, technician: input.technician ?? null, certificateRef: input.certificateRef ?? null, comments: input.comments ?? null });

    if (input.passFail === "fail") {
      db.prepare(`INSERT INTO alerts (id, severity, airport_id, asset_type, asset_id, category, description, status) VALUES (?, 'critical', ?, 'tank', ?, 'quality_failure', ?, 'open')`)
        .run(uuid(), input.airportId, input.tankId ?? null, `Fuel quality test ${sampleRef} FAILED`);
    }

    writeAudit({ userId: req.user!.id, action: "QUALITY_TEST_RECORDED", entity: "fuel_quality_tests", entityId: id, newValue: input });
    res.status(201).json({ data: { id, sampleRef, ...input } });
  } catch (e) { next(e); }
});

export default router;
