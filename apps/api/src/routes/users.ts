import { Router } from "express";
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);
router.use(requireRole("nac_admin"));

router.get("/", (_req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.email, u.full_name, u.status, u.airport_id, r.name as role_name, u.created_at
    FROM users u JOIN roles r ON u.role_id = r.id ORDER BY u.full_name
  `).all();
  res.json({ data: rows });
});

router.get("/roles", (_req, res) => {
  res.json({ data: db.prepare(`SELECT * FROM roles ORDER BY name`).all() });
});

const schema = z.object({
  email: z.string().email(), password: z.string().min(8), fullName: z.string().min(2),
  roleId: z.string(), airportId: z.string().optional(),
});

router.post("/", (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const id = uuid();
    const passwordHash = bcrypt.hashSync(input.password, 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, full_name, role_id, airport_id, status, created_by, updated_by)
      VALUES (@id, @email, @passwordHash, @fullName, @roleId, @airportId, 'active', @createdBy, @createdBy)
    `).run({ id, email: input.email, passwordHash, fullName: input.fullName, roleId: input.roleId, airportId: input.airportId ?? null, createdBy: req.user!.id });
    writeAudit({ userId: req.user!.id, action: "USER_CREATED", entity: "users", entityId: id, newValue: { email: input.email, roleId: input.roleId } });
    res.status(201).json({ data: { id, email: input.email, fullName: input.fullName } });
  } catch (e) { next(e); }
});

router.patch("/:id/role", (req, res, next) => {
  try {
    const { roleId } = z.object({ roleId: z.string() }).parse(req.body);
    const before = db.prepare(`SELECT role_id FROM users WHERE id = ?`).get(req.params.id);
    db.prepare(`UPDATE users SET role_id = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`).run(roleId, req.user!.id, req.params.id);
    writeAudit({ userId: req.user!.id, action: "USER_ROLE_CHANGED", entity: "users", entityId: req.params.id, previousValue: before, newValue: { roleId } });
    res.json({ data: { id: req.params.id, roleId } });
  } catch (e) { next(e); }
});

router.patch("/:id/status", (req, res, next) => {
  try {
    const { status } = z.object({ status: z.enum(["active", "suspended"]) }).parse(req.body);
    db.prepare(`UPDATE users SET status = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`).run(status, req.user!.id, req.params.id);
    writeAudit({ userId: req.user!.id, action: "USER_STATUS_CHANGED", entity: "users", entityId: req.params.id, newValue: { status } });
    res.json({ data: { id: req.params.id, status } });
  } catch (e) { next(e); }
});

export default router;
