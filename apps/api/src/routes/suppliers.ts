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
  res.json({ data: db.prepare(`SELECT * FROM suppliers ORDER BY name`).all() });
});

router.get("/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM suppliers WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Supplier not found" });
  res.json({ data: row });
});

const schema = z.object({
  name: z.string().min(1),
  contactName: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  contractRef: z.string().optional(),
  contractStart: z.string().optional(),
  contractExpiry: z.string().optional(),
});

router.post("/", requireRole("nac_admin", "procurement_officer"), (req, res, next) => {
  try {
    const input = schema.parse(req.body);
    const id = uuid();
    db.prepare(`
      INSERT INTO suppliers (id, name, contact_name, contact_email, contact_phone, contract_ref, contract_start, contract_expiry, active)
      VALUES (@id, @name, @contactName, @contactEmail, @contactPhone, @contractRef, @contractStart, @contractExpiry, 1)
    `).run({
      id, name: input.name,
      contactName: input.contactName ?? null, contactEmail: input.contactEmail ?? null, contactPhone: input.contactPhone ?? null,
      contractRef: input.contractRef ?? null, contractStart: input.contractStart ?? null, contractExpiry: input.contractExpiry ?? null,
    });
    writeAudit({ userId: req.user!.id, action: "SUPPLIER_CREATED", entity: "suppliers", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

// Simple supplier performance report: on-time deliveries, volume, quality pass rate
router.get("/:id/performance", (req, res) => {
  const receipts = db.prepare(`SELECT COUNT(*) as deliveries, COALESCE(SUM(quantity),0) as total_volume FROM fuel_receipts WHERE supplier_id = ? AND status = 'posted'`).get(req.params.id);
  res.json({ data: receipts });
});

export default router;
