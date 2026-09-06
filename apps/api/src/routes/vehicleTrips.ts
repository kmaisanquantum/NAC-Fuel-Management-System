import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { writeAudit } from "../utils/audit";

const router = Router();
router.use(requireAuth);

const FLEET_WRITE_ROLES = ["admin", "fleet_admin", "fleet_manager", "driver"];

router.get("/", (req, res) => {
  const { vehicleId } = req.query;
  let query = `
    SELECT vt.*, v.vehicle_number, d.name as driver_name
    FROM vehicle_trips vt
    JOIN vehicles v ON v.id = vt.vehicle_id
    LEFT JOIN drivers d ON d.id = vt.driver_id
    WHERE 1=1
  `;
  const params: any[] = [];
  if (vehicleId) {
    query += " AND vt.vehicle_id = ?";
    params.push(vehicleId);
  }
  query += " ORDER BY vt.date DESC, vt.created_at DESC";
  const rows = db.prepare(query).all(...params);
  res.json({ data: rows });
});

const tripSchema = z.object({
  vehicleId: z.string().min(1),
  driverId: z.string().optional(),
  date: z.string().min(1),
  timeOut: z.string().optional(),
  timeIn: z.string().optional(),
  startLocation: z.string().min(1),
  destination: z.string().min(1),
  purpose: z.string().optional(),
  beginOdometer: z.number().nonnegative(),
  endOdometer: z.number().nonnegative(),
  authorisingOfficer: z.string().optional(),
});

router.post("/", requireRole(...FLEET_WRITE_ROLES), (req, res, next) => {
  try {
    const input = tripSchema.parse(req.body);
    const totalKm = Number((input.endOdometer - input.beginOdometer).toFixed(1));

    // Odometer Anomaly Detection
    let odometerAnomaly = 0;
    if (input.endOdometer < input.beginOdometer) {
      odometerAnomaly = 1;
    } else {
      const prevTrip = db.prepare(`
        SELECT end_odometer FROM vehicle_trips
        WHERE vehicle_id = ? AND date <= ?
        ORDER BY date DESC, created_at DESC LIMIT 1
      `).get(input.vehicleId, input.date) as { end_odometer: number } | undefined;

      if (prevTrip && input.beginOdometer < prevTrip.end_odometer) {
        odometerAnomaly = 1;
      }
    }

    const id = uuid();
    db.prepare(`
      INSERT INTO vehicle_trips (
        id, vehicle_id, driver_id, date, time_out, time_in, start_location,
        destination, purpose, begin_odometer, end_odometer, total_km,
        odometer_anomaly, authorising_officer
      ) VALUES (
        @id, @vehicleId, @driverId, @date, @timeOut, @timeIn, @startLocation,
        @destination, @purpose, @beginOdometer, @endOdometer, @totalKm,
        @odometerAnomaly, @authorisingOfficer
      )
    `).run({
      id,
      vehicleId: input.vehicleId,
      driverId: input.driverId ?? null,
      date: input.date,
      timeOut: input.timeOut ?? null,
      timeIn: input.timeIn ?? null,
      startLocation: input.startLocation,
      destination: input.destination,
      purpose: input.purpose ?? null,
      beginOdometer: input.beginOdometer,
      endOdometer: input.endOdometer,
      totalKm,
      odometerAnomaly,
      authorisingOfficer: input.authorisingOfficer ?? null,
    });

    writeAudit({ userId: req.user!.id, action: "VEHICLE_TRIP_LOGGED", entity: "vehicle_trips", entityId: id, newValue: { ...input, totalKm, odometerAnomaly } });
    const created = db.prepare("SELECT * FROM vehicle_trips WHERE id = ?").get(id);
    res.status(201).json({ data: created });
  } catch (e) { next(e); }
});

export default router;
