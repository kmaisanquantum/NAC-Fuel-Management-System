import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

const router = Router();
router.use(requireAuth);
router.use(requireRole("nac_admin", "auditor", "national_fuel_manager", "executive"));

router.get("/", (req, res) => {
  const { entity, entityId, userId, limit } = req.query;
  let sql = `SELECT * FROM audit_logs WHERE 1=1`;
  const params: any[] = [];
  if (entity) { sql += ` AND entity = ?`; params.push(entity); }
  if (entityId) { sql += ` AND entity_id = ?`; params.push(entityId); }
  if (userId) { sql += ` AND user_id = ?`; params.push(userId); }
  sql += ` ORDER BY created_at DESC LIMIT ?`;
  params.push(Number(limit) || 500);
  res.json({ data: db.prepare(sql).all(...params) });
});

export default router;
