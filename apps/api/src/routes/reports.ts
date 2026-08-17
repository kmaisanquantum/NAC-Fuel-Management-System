import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

// National dashboard summary (spec section 4)
router.get("/dashboard/national", (_req, res) => {
  const totalStock = db.prepare(`SELECT COALESCE(SUM(current_level),0) as total FROM inventory_balances`).get() as { total: number };

  const today = new Date().toISOString().slice(0, 10);
  const receivedToday = db
    .prepare(`SELECT COALESCE(SUM(quantity),0) as total FROM fuel_receipts WHERE status = 'posted' AND date(posted_at) = ?`)
    .get(today) as { total: number };
  const upliftedToday = db
    .prepare(`SELECT COALESCE(SUM(quantity),0) as total, COALESCE(SUM(total_amount),0) as revenue FROM fuel_uplifts WHERE date(created_at) = ?`)
    .get(today) as { total: number; revenue: number };

  const lowStockAirports = db
    .prepare(`
      SELECT a.id, a.name, a.code, t.tank_code, b.current_level, t.capacity, p.minimum_stock
      FROM inventory_balances b
      JOIN tanks t ON t.id = b.tank_id
      JOIN airports a ON a.id = b.airport_id
      JOIN fuel_products p ON p.id = b.fuel_product_id
      WHERE b.current_level <= p.minimum_stock
    `)
    .all();

  const openIncidents = db.prepare(`SELECT COUNT(*) as cnt FROM alerts WHERE status != 'resolved'`).get() as { cnt: number };
  const maintenanceDue = db.prepare(`SELECT COUNT(*) as cnt FROM maintenance_records WHERE status = 'scheduled' AND scheduled_date <= date('now', '+7 days')`).get() as { cnt: number };
  const outstandingInvoices = db.prepare(`SELECT COUNT(*) as cnt, COALESCE(SUM(total_amount),0) as total FROM invoices WHERE status IN ('issued','partially_paid','overdue')`).get();
  const varianceAlerts = db.prepare(`SELECT COUNT(*) as cnt FROM reconciliations WHERE status = 'investigation_required'`).get() as { cnt: number };

  const monthlyConsumption = db
    .prepare(`
      SELECT strftime('%Y-%m', created_at) as month, COALESCE(SUM(quantity),0) as total
      FROM fuel_uplifts GROUP BY month ORDER BY month DESC LIMIT 6
    `)
    .all();

  const airportComparison = db
    .prepare(`
      SELECT a.name, a.code, COALESCE(SUM(u.quantity),0) as total_uplift
      FROM airports a LEFT JOIN fuel_uplifts u ON u.airport_id = a.id
      GROUP BY a.id ORDER BY total_uplift DESC
    `)
    .all();

  res.json({
    data: {
      totalNationalStock: totalStock.total,
      fuelReceivedToday: receivedToday.total,
      fuelUpliftedToday: upliftedToday.total,
      revenueToday: upliftedToday.revenue,
      lowStockAirports,
      openIncidents: openIncidents.cnt,
      maintenanceDue: maintenanceDue.cnt,
      outstandingInvoices,
      inventoryVarianceAlerts: varianceAlerts.cnt,
      monthlyConsumption,
      airportComparison,
    },
  });
});

// Airport-level dashboard (spec section 5)
router.get("/dashboard/airport/:airportId", (req, res) => {
  const { airportId } = req.params;
  const today = new Date().toISOString().slice(0, 10);

  const tanks = db.prepare(`
    SELECT t.*, b.current_level as ledger_level FROM tanks t
    LEFT JOIN inventory_balances b ON b.tank_id = t.id WHERE t.airport_id = ?
  `).all(airportId);

  const receiptsToday = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total, COUNT(*) as cnt FROM fuel_receipts WHERE airport_id = ? AND date(created_at) = ?`).get(airportId, today);
  const upliftToday = db.prepare(`SELECT COALESCE(SUM(quantity),0) as total, COUNT(*) as cnt FROM fuel_uplifts WHERE airport_id = ? AND date(created_at) = ?`).get(airportId, today);
  const transfersToday = db.prepare(`SELECT COUNT(*) as cnt FROM fuel_transfers WHERE airport_id = ? AND date(created_at) = ?`).get(airportId, today);
  const refuellers = db.prepare(`SELECT * FROM refuellers WHERE airport_id = ?`).all(airportId);
  const pendingReceipts = db.prepare(`SELECT COUNT(*) as cnt FROM fuel_receipts WHERE airport_id = ? AND status NOT IN ('posted')`).get(airportId);
  const alerts = db.prepare(`SELECT * FROM alerts WHERE airport_id = ? AND status != 'resolved' ORDER BY created_at DESC`).all(airportId);
  const maintenanceDue = db.prepare(`SELECT * FROM maintenance_records WHERE airport_id = ? AND status = 'scheduled' ORDER BY scheduled_date LIMIT 10`).all(airportId);
  const qualityDue = db.prepare(`SELECT * FROM fuel_quality_tests WHERE airport_id = ? ORDER BY sample_date DESC LIMIT 10`).all(airportId);

  res.json({
    data: { tanks, receiptsToday, upliftToday, transfersToday, refuellers, pendingReceipts, alerts, maintenanceDue, qualityDue },
  });
});

router.get("/consumption", (req, res) => {
  const { airportId, from, to } = req.query;
  let sql = `SELECT date(created_at) as day, COALESCE(SUM(quantity),0) as total FROM fuel_uplifts WHERE 1=1`;
  const params: any[] = [];
  if (airportId) { sql += ` AND airport_id = ?`; params.push(airportId); }
  if (from) { sql += ` AND created_at >= ?`; params.push(from); }
  if (to) { sql += ` AND created_at <= ?`; params.push(to); }
  sql += ` GROUP BY day ORDER BY day`;
  res.json({ data: db.prepare(sql).all(...params) });
});

router.get("/revenue", (req, res) => {
  const { airportId } = req.query;
  let sql = `SELECT strftime('%Y-%m', invoice_date) as month, COALESCE(SUM(total_amount),0) as total FROM invoices WHERE status != 'cancelled'`;
  const params: any[] = [];
  if (airportId) { sql += ` AND airport_id = ?`; params.push(airportId); }
  sql += ` GROUP BY month ORDER BY month`;
  res.json({ data: db.prepare(sql).all(...params) });
});

export default router;
