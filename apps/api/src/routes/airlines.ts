import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", (_req, res) => res.json({ data: db.prepare(`SELECT * FROM airlines ORDER BY name`).all() }));

router.post("/", (req, res, next) => {
  try {
    const input = z.object({ name: z.string(), iataCode: z.string().optional(), customerId: z.string().optional() }).parse(req.body);
    const id = uuid();
    db.prepare(`INSERT INTO airlines (id, customer_id, name, iata_code, active) VALUES (?, ?, ?, ?, 1)`)
      .run(id, input.customerId ?? null, input.name, input.iataCode ?? null);
    writeAudit({ userId: req.user!.id, action: "AIRLINE_CREATED", entity: "airlines", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

export default router;
