import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

function getDefaultDateRange(from?: string, to?: string) {
  const endDate = to || new Date().toISOString().slice(0, 10);
  let startDate = from;
  if (!startDate) {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    startDate = d.toISOString().slice(0, 10);
  }
  return { startDate, endDate };
}

// GET /api/v1/fleet-analytics/division-consumption?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/division-consumption", (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const { startDate, endDate } = getDefaultDateRange(from, to);

  const vehicleRows = db.prepare(`
    SELECT COALESCE(department, 'Unassigned') as department, COUNT(*) as vehicleCount
    FROM vehicles
    WHERE status != 'disposed'
    GROUP BY COALESCE(department, 'Unassigned')
  `).all() as { department: string; vehicleCount: number }[];

  const fuelRows = db.prepare(`
    SELECT COALESCE(v.department, 'Unassigned') as department,
           COUNT(fl.id) as refuelCount,
           COALESCE(SUM(fl.litres), 0) as totalLitres,
           COALESCE(SUM(fl.total_cost), 0) as totalFuelCost
    FROM vehicle_fuel_logs fl
    JOIN vehicles v ON fl.vehicle_id = v.id
    WHERE fl.date >= ? AND fl.date <= ?
    GROUP BY COALESCE(v.department, 'Unassigned')
  `).all(startDate, endDate) as { department: string; refuelCount: number; totalLitres: number; totalFuelCost: number }[];

  const tripRows = db.prepare(`
    SELECT COALESCE(v.department, 'Unassigned') as department,
           COALESCE(SUM(vt.total_km), 0) as totalKm
    FROM vehicle_trips vt
    JOIN vehicles v ON vt.vehicle_id = v.id
    WHERE vt.date >= ? AND vt.date <= ?
    GROUP BY COALESCE(v.department, 'Unassigned')
  `).all(startDate, endDate) as { department: string; totalKm: number }[];

  const deptMap: Record<string, { department: string; refuelCount: number; totalLitres: number; totalFuelCost: number; totalKm: number; vehicleCount: number }> = {};

  for (const v of vehicleRows) {
    deptMap[v.department] = {
      department: v.department,
      refuelCount: 0,
      totalLitres: 0,
      totalFuelCost: 0,
      totalKm: 0,
      vehicleCount: v.vehicleCount,
    };
  }

  for (const f of fuelRows) {
    if (!deptMap[f.department]) {
      deptMap[f.department] = { department: f.department, refuelCount: 0, totalLitres: 0, totalFuelCost: 0, totalKm: 0, vehicleCount: 0 };
    }
    deptMap[f.department].refuelCount = f.refuelCount;
    deptMap[f.department].totalLitres = f.totalLitres;
    deptMap[f.department].totalFuelCost = f.totalFuelCost;
  }

  for (const t of tripRows) {
    if (!deptMap[t.department]) {
      deptMap[t.department] = { department: t.department, refuelCount: 0, totalLitres: 0, totalFuelCost: 0, totalKm: 0, vehicleCount: 0 };
    }
    deptMap[t.department].totalKm = t.totalKm;
  }

  const data = Object.values(deptMap);
  res.json({ data, range: { from: startDate, to: endDate } });
});

// GET /api/v1/fleet-analytics/division-mileage-daily?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/division-mileage-daily", (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const { startDate, endDate } = getDefaultDateRange(from, to);

  const rows = db.prepare(`
    SELECT COALESCE(v.department, 'Unassigned') as department,
           vt.date,
           COALESCE(SUM(vt.total_km), 0) as totalKm
    FROM vehicle_trips vt
    JOIN vehicles v ON vt.vehicle_id = v.id
    WHERE vt.date >= ? AND vt.date <= ?
    GROUP BY COALESCE(v.department, 'Unassigned'), vt.date
    ORDER BY vt.date ASC, department ASC
  `).all(startDate, endDate);

  res.json({ data: rows, range: { from: startDate, to: endDate } });
});

// GET /api/v1/fleet-analytics/division-mileage-weekly?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get("/division-mileage-weekly", (req, res) => {
  const { from, to } = req.query as { from?: string; to?: string };
  const { startDate, endDate } = getDefaultDateRange(from, to);

  const rows = db.prepare(`
    SELECT COALESCE(v.department, 'Unassigned') as department,
           strftime('%Y-%W', vt.date) as week,
           COALESCE(SUM(vt.total_km), 0) as totalKm
    FROM vehicle_trips vt
    JOIN vehicles v ON vt.vehicle_id = v.id
    WHERE vt.date >= ? AND vt.date <= ?
    GROUP BY COALESCE(v.department, 'Unassigned'), week
    ORDER BY week ASC, department ASC
  `).all(startDate, endDate);

  res.json({ data: rows, range: { from: startDate, to: endDate } });
});

export default router;
