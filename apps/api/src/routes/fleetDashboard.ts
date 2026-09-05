import { Router } from "express";
import { db } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();
router.use(requireAuth);

router.get("/summary", (_req, res) => {
  const totalVehicles = (db.prepare("SELECT COUNT(*) as count FROM vehicles").get() as any).count || 0;
  const activeVehicles = (db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'active'").get() as any).count || 0;
  const inactiveVehicles = (db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'inactive'").get() as any).count || 0;
  const underRepairVehicles = (db.prepare("SELECT COUNT(*) as count FROM vehicles WHERE status = 'under_repair'").get() as any).count || 0;

  const totalKmResult = (db.prepare("SELECT SUM(total_km) as sum FROM vehicle_trips").get() as any).sum || 0;
  const totalFuelCostResult = (db.prepare("SELECT SUM(total_cost) as sum FROM vehicle_fuel_logs").get() as any).sum || 0;
  const totalFuelLitresResult = (db.prepare("SELECT SUM(litres) as sum FROM vehicle_fuel_logs").get() as any).sum || 0;

  const totalMaintenanceCostResult = (db.prepare("SELECT SUM(cost) as sum FROM vehicle_maintenance").get() as any).sum || 0;

  const openBreakdowns = (db.prepare("SELECT COUNT(*) as count FROM vehicle_breakdowns WHERE status != 'resolved'").get() as any).count || 0;
  const totalDrivers = (db.prepare("SELECT COUNT(*) as count FROM drivers WHERE authorisation_status = 'authorised'").get() as any).count || 0;

  res.json({
    data: {
      vehicles: {
        total: totalVehicles,
        active: activeVehicles,
        inactive: inactiveVehicles,
        underRepair: underRepairVehicles,
      },
      drivers: {
        authorised: totalDrivers,
      },
      metrics: {
        totalKm: totalKmResult,
        totalFuelCost: totalFuelCostResult,
        totalFuelLitres: totalFuelLitresResult,
        totalMaintenanceCost: totalMaintenanceCostResult,
        openBreakdowns,
      },
    },
  });
});

export default router;
