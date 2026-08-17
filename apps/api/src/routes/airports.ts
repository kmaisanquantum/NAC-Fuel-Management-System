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
  const { status } = req.query;
  const rows = status
    ? db.prepare(`SELECT * FROM airports WHERE status = ? ORDER BY name`).all(status)
    : db.prepare(`SELECT * FROM airports ORDER BY name`).all();
  res.json({ data: rows });
});

router.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM airports WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Airport not found" });
  res.json({ data: row });
});

const airportSchema = z.object({
  code: z.string().min(2).max(10),
  iataCode: z.string().optional(),
  name: z.string().min(2),
  region: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  connectivityProfile: z.enum(["online", "intermittent", "offline_capable"]).default("online"),
});

// Airports are administrator-managed master data — not hard-coded (spec section 3).
router.post("/", requireRole("nac_admin", "national_fuel_manager"), (req, res, next) => {
  try {
    const input = airportSchema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO airports (id, code, iata_code, name, region, latitude, longitude, status, connectivity_profile, created_by, updated_by)
      VALUES (@id, @code, @iataCode, @name, @region, @latitude, @longitude, 'active', @connectivityProfile, @createdBy, @createdBy)
    `).run({ id, ...input, iataCode: input.iataCode ?? null, region: input.region ?? null, latitude: input.latitude ?? null, longitude: input.longitude ?? null, createdBy: req.user!.id });

    writeAudit({ userId: req.user!.id, role: req.user!.roleName, action: "AIRPORT_CREATED", entity: "airports", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input, status: "active" } });
  } catch (e) {
    next(e);
  }
});

router.patch("/:id", requireRole("nac_admin", "national_fuel_manager"), (req, res, next) => {
  try {
    const existing = db.prepare(`SELECT * FROM airports WHERE id = ?`).get(req.params.id);
    if (!existing) return res.status(404).json({ error: "Airport not found" });

    const patch = z.object({
      name: z.string().optional(),
      region: z.string().optional(),
      status: z.enum(["active", "inactive"]).optional(),
      connectivityProfile: z.enum(["online", "intermittent", "offline_capable"]).optional(),
    }).parse(req.body);

    const fields = Object.entries(patch);
    if (fields.length === 0) return res.json({ data: existing });

    const setClause = fields.map(([k]) => `${k.replace(/[A-Z]/g, (m) => "_" + m.toLowerCase())} = @${k}`).join(", ");
    db.prepare(`UPDATE airports SET ${setClause}, updated_at = datetime('now'), updated_by = @updatedBy WHERE id = @id`)
      .run({ ...patch, updatedBy: req.user!.id, id: req.params.id });

    writeAudit({ userId: req.user!.id, role: req.user!.roleName, action: "AIRPORT_UPDATED", entity: "airports", entityId: req.params.id, previousValue: existing, newValue: patch });
    res.json({ data: db.prepare(`SELECT * FROM airports WHERE id = ?`).get(req.params.id) });
  } catch (e) {
    next(e);
  }
});

export default router;
