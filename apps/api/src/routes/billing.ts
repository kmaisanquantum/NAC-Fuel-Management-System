import { Router } from "express";
import { z } from "zod";
import { v4 as uuid } from "uuid";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

router.get("/invoices", (req, res) => {
  const { airportId, status } = req.query;
  let sql = `SELECT * FROM invoices WHERE 1=1`;
  const params: any[] = [];
  if (airportId) { sql += ` AND airport_id = ?`; params.push(airportId); }
  if (status) { sql += ` AND status = ?`; params.push(status); }
  sql += ` ORDER BY invoice_date DESC`;
  res.json({ data: db.prepare(sql).all(...params) });
});

router.get("/invoices/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Invoice not found" });
  const payments = db.prepare(`SELECT * FROM payments WHERE invoice_id = ?`).all(req.params.id);
  res.json({ data: { ...(row as object), payments } });
});

router.post("/invoices/:id/issue", requireRole("nac_admin", "finance_officer"), (req, res, next) => {
  try {
    const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(req.params.id) as any;
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    if (inv.status !== "draft") return res.status(422).json({ error: `Cannot issue invoice in status ${inv.status}` });
    db.prepare(`UPDATE invoices SET status = 'issued' WHERE id = ?`).run(req.params.id);
    writeAudit({ userId: req.user!.id, action: "INVOICE_ISSUED", entity: "invoices", entityId: req.params.id });
    res.json({ data: { id: req.params.id, status: "issued" } });
  } catch (e) { next(e); }
});

const paySchema = z.object({ amount: z.number().positive(), method: z.string().optional(), reference: z.string().optional() });

router.post("/invoices/:id/payments", requireRole("nac_admin", "finance_officer"), (req, res, next) => {
  try {
    const inv = db.prepare(`SELECT * FROM invoices WHERE id = ?`).get(req.params.id) as any;
    if (!inv) return res.status(404).json({ error: "Invoice not found" });
    const input = paySchema.parse(req.body);
    const id = uuid();
    db.prepare(`INSERT INTO payments (id, invoice_id, amount, method, reference) VALUES (?,?,?,?,?)`)
      .run(id, req.params.id, input.amount, input.method ?? null, input.reference ?? null);

    const paidRow = db.prepare(`SELECT COALESCE(SUM(amount),0) as paid FROM payments WHERE invoice_id = ?`).get(req.params.id) as { paid: number };
    const newStatus = paidRow.paid >= inv.total_amount ? "paid" : "partially_paid";
    db.prepare(`UPDATE invoices SET status = ? WHERE id = ?`).run(newStatus, req.params.id);

    writeAudit({ userId: req.user!.id, action: "PAYMENT_RECORDED", entity: "invoices", entityId: req.params.id, newValue: input });
    res.status(201).json({ data: { paymentId: id, invoiceStatus: newStatus } });
  } catch (e) { next(e); }
});

export default router;
