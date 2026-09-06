import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", (_req, res) => res.json({ data: db.prepare(`SELECT * FROM customers ORDER BY name`).all() }));

router.post("/", (req, res, next) => {
  try {
    const input = z.object({ name: z.string(), customerType: z.string().default("airline"), billingEmail: z.string().email().optional() }).parse(req.body);
    const id = uuid();
    db.prepare(`INSERT INTO customers (id, name, customer_type, billing_email, active) VALUES (?, ?, ?, ?, 1)`)
      .run(id, input.name, input.customerType, input.billingEmail ?? null);
    writeAudit({ userId: req.user!.id, action: "CUSTOMER_CREATED", entity: "customers", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

export default router;
