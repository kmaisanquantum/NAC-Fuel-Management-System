import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/", (req, res) => {
  const { registration } = req.query;
  if (registration) {
    return res.json({ data: db.prepare(`SELECT * FROM aircraft WHERE registration LIKE ?`).all(`%${registration}%`) });
  }
  res.json({ data: db.prepare(`SELECT * FROM aircraft ORDER BY registration`).all() });
});

router.post("/", (req, res, next) => {
  try {
    const input = z.object({ registration: z.string(), aircraftType: z.string().optional(), airlineId: z.string().optional() }).parse(req.body);
    const id = uuid();
    db.prepare(`INSERT INTO aircraft (id, airline_id, registration, aircraft_type, active) VALUES (?, ?, ?, ?, 1)`)
      .run(id, input.airlineId ?? null, input.registration, input.aircraftType ?? null);
    writeAudit({ userId: req.user!.id, action: "AIRCRAFT_CREATED", entity: "aircraft", entityId: id, newValue: input });
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

export default router;
