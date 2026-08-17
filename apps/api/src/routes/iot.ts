import { Router } from "express";
import { v4 as uuid } from "uuid";
import { z } from "zod";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";

// IoT-ready architecture (spec section 21): Sensor -> MQTT -> Gateway -> Broker -> Telemetry Service -> NAFMS.
// This REST endpoint stands in for the telemetry service ingest point for the MVP;
// a real deployment would consume from the message broker instead of accepting direct POSTs.
const router = Router();
router.use(requireAuth);

router.get("/devices", (req, res) => {
  const { airportId } = req.query;
  const rows = airportId
    ? db.prepare(`SELECT * FROM iot_devices WHERE airport_id = ?`).all(airportId)
    : db.prepare(`SELECT * FROM iot_devices`).all();
  res.json({ data: rows });
});

router.get("/devices/:id/readings", (req, res) => {
  res.json({ data: db.prepare(`SELECT * FROM iot_readings WHERE device_id = ? ORDER BY recorded_at DESC LIMIT 50`).all(req.params.id) });
});

router.post("/devices", requireRole("nac_admin", "engineering_maintenance"), (req, res, next) => {
  try {
    const input = z.object({
      airportId: z.string(), assetType: z.enum(["tank", "refueller"]), assetId: z.string(),
      deviceType: z.enum(["level_sensor", "flow_meter", "temperature", "water_detection", "gps"]),
    }).parse(req.body);
    const id = uuid();
    db.prepare(`INSERT INTO iot_devices (id, airport_id, asset_type, asset_id, device_type, status) VALUES (?,?,?,?,?, 'active')`)
      .run(id, input.airportId, input.assetType, input.assetId, input.deviceType);
    res.status(201).json({ data: { id, ...input, status: "active" } });
  } catch (e) { next(e); }
});

// TODO / FUTURE INTEGRATION: replace with MQTT subscriber. This is a simulated ingest endpoint for the MVP.
router.post("/readings", (req, res, next) => {
  try {
    const input = z.object({ deviceId: z.string(), readingType: z.string(), value: z.number(), unit: z.string().optional() }).parse(req.body);
    const id = uuid();
    db.prepare(`INSERT INTO iot_readings (id, device_id, reading_type, value, unit) VALUES (?,?,?,?,?)`)
      .run(id, input.deviceId, input.readingType, input.value, input.unit ?? null);
    res.status(201).json({ data: { id, ...input } });
  } catch (e) { next(e); }
});

export default router;
