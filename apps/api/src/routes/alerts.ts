import { Router } from "express";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { airportId, status, severity } = req.query;
  let sql = `SELECT * FROM alerts WHERE 1=1`;
  const params: any[] = [];
  if (airportId) { sql += ` AND airport_id = ?`; params.push(airportId); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  if (severity) { sql += ` AND severity = ?`; params.push(severity); }
  sql += ` ORDER BY created_at DESC`;
  res.json({ data: db.prepare(sql).all(...params) });
});

router.post("/:id/resolve", (req, res, next) => {
  try {
    const { resolution } = z.object({ resolution: z.string().min(3) }).parse(req.body);
    db.prepare(`UPDATE alerts SET status = 'resolved', resolution = ?, resolved_at = datetime('now') WHERE id = ?`).run(resolution, req.params.id);
    writeAudit({ userId: req.user!.id, action: "ALERT_RESOLVED", entity: "alerts", entityId: req.params.id, reason: resolution });
    res.json({ data: { id: req.params.id, status: "resolved" } });
  } catch (e) { next(e); }
});

router.post("/:id/assign", (req, res, next) => {
  try {
    const { assignedTo } = z.object({ assignedTo: z.string() }).parse(req.body);
    db.prepare(`UPDATE alerts SET assigned_to = ?, status = 'in_progress' WHERE id = ?`).run(assignedTo, req.params.id);
    writeAudit({ userId: req.user!.id, action: "ALERT_ASSIGNED", entity: "alerts", entityId: req.params.id, newValue: { assignedTo } });
    res.json({ data: { id: req.params.id, assignedTo } });
  } catch (e) { next(e); }
});

export default router;
