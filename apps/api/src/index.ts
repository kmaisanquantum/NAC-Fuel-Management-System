import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import path from "path";
import fs from "fs";

import { initSchema } from "./db";
import { ensureBootstrapAccounts } from "./db/bootstrap";
import { errorHandler, notFound } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import alertRoutes from "./routes/alerts";
import auditRoutes from "./routes/audit";
import userRoutes from "./routes/users";
import vehicleRoutes from "./routes/vehicles";
import driverRoutes from "./routes/drivers";
import vehicleAllocationRoutes from "./routes/vehicleAllocations";
import vehicleFuelLogRoutes from "./routes/vehicleFuelLogs";
import vehicleTripRoutes from "./routes/vehicleTrips";
import vehicleInspectionRoutes from "./routes/vehicleInspections";
import vehicleMaintenanceRoutes from "./routes/vehicleMaintenance";
import fleetDashboardRoutes from "./routes/fleetDashboard";

initSchema();
ensureBootstrapAccounts();

const app = express();

app.set("trust proxy", 1);
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "Fuel Management System API", time: new Date().toISOString() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/alerts", alertRoutes);
app.use("/api/v1/audit-logs", auditRoutes);
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/vehicles", vehicleRoutes);
app.use("/api/v1/drivers", driverRoutes);
app.use("/api/v1/vehicle-allocations", vehicleAllocationRoutes);
app.use("/api/v1/vehicle-fuel-logs", vehicleFuelLogRoutes);
app.use("/api/v1/vehicle-trips", vehicleTripRoutes);
app.use("/api/v1/vehicle-inspections", vehicleInspectionRoutes);
app.use("/api/v1/vehicle-maintenance", vehicleMaintenanceRoutes);
app.use("/api/v1/fleet-dashboard", fleetDashboardRoutes);

const webDir = process.env.WEB_DIR || path.join(__dirname, "public");
if (fs.existsSync(webDir)) {
  app.use(express.static(webDir));
  app.get(/^\/(?!api|health).*/, (_req, res) => {
    res.sendFile(path.join(webDir, "index.html"));
  });
}

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Fuel Management System API listening on port ${PORT}`);
});

export default app;
