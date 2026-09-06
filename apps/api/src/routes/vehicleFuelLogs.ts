import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

const FLEET_WRITE_ROLES = ["admin", "fleet_admin", "fleet_manager", "driver", "finance"];

router.get("/", (req, res) => {
  const { vehicleId } = req.query;
  let query = `
    SELECT fl.*, v.vehicle_number, d.name as driver_name
    FROM vehicle_fuel_logs fl
    JOIN vehicles v ON v.id = fl.vehicle_id
    LEFT JOIN drivers d ON d.id = fl.driver_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (vehicleId) {
    query += " AND fl.vehicle_id = ?";
    params.push(vehicleId);
  }
  query += " ORDER BY fl.date DESC, fl.created_at DESC";
  const rows = db.prepare(query).all(...params);
  res.json({ data: rows });
});

const fuelLogSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().optional(),
  date: z.string().min(1),
  time: z.string().optional(),
  station: z.string().optional(),
  fuelType: z.string().min(1),
  litres: z.number().positive(),
  costPerLitre: z.number().positive(),
  odometerReading: z.number().positive(),
  paymentMethod: z.string().optional(),
  receiptRef: z.string().optional(),
});

router.post("/", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const input = fuelLogSchema.parse(req.body);
    const totalCost = Number((input.litres * input.costPerLitre).toFixed(2));

    // Get last fuel log reading for derived metric calculation
    const prevLog = db.prepare(`
      SELECT odometer_reading FROM vehicle_fuel_logs
      WHERE vehicle_id = ? AND date <= ?
      ORDER BY date DESC, created_at DESC LIMIT 1
    `).get(input.vehicleId, input.date) as { odometer_reading: number } | undefined;

    let lPer100km: number | null = null;
    let kmPerL: number | null = null;
    let costPerKm: number | null = null;

    if (prevLog && input.odometerReading > prevLog.odometer_reading) {
      const distance = input.odometerReading - prevLog.odometer_reading;
      lPer100km = Number(((input.litres / distance) * 100).toFixed(2));
      kmPerL = Number((distance / input.litres).toFixed(2));
      costPerKm = Number((totalCost / distance).toFixed(2));
    }

    const id = uuid();
    db.prepare(`
      INSERT INTO vehicle_fuel_logs (
        id, vehicle_id, driver_id, date, time, station, fuel_type, litres,
        cost_per_litre, total_cost, odometer_reading, payment_method, receipt_ref,
        l_per_100km, km_per_l, cost_per_km
      ) VALUES (
        @id, @vehicleId, @driverId, @date, @time, @station, @fuelType, @litres,
        @costPerLitre, @totalCost, @odometerReading, @paymentMethod, @receiptRef,
        @lPer100km, @kmPerL, @costPerKm
      )
    `).run({
      id,
      vehicleId: input.vehicleId,
      driverId: input.driverId ?? null,
      date: input.date,
      time: input.time ?? null,
      station: input.station ?? null,
      fuelType: input.fuelType,
      litres: input.litres,
      costPerLitre: input.costPerLitre,
      totalCost,
      odometerReading: input.odometerReading,
      paymentMethod: input.paymentMethod ?? null,
      receiptRef: input.receiptRef ?? null,
      lPer100km,
      kmPerL,
      costPerKm,
    });

    writeAudit({ userId: req.user!.id, action: "VEHICLE_FUEL_LOGGED", entity: "vehicle_fuel_logs", entityId: id, newValue: { ...input, totalCost, lPer100km, kmPerL, costPerKm } });
    const created = db.prepare("SELECT * FROM vehicle_fuel_logs WHERE id = ?").get(id);
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

export default router;
