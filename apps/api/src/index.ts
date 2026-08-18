import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import { initSchema } from "./db";
import { errorHandler, notFound } from "./middleware/errorHandler";

import authRoutes from "./routes/auth";
import airportRoutes from "./routes/airports";
import fuelProductRoutes from "./routes/fuelProducts";
import tankRoutes from "./routes/tanks";
import supplierRoutes from "./routes/suppliers";
import refuellerRoutes from "./routes/refuellers";
import airlineRoutes from "./routes/airlines";
import aircraftRoutes from "./routes/aircraft";
import customerRoutes from "./routes/customers";
import receiptRoutes from "./routes/receipts";
import transferRoutes from "./routes/transfers";
import upliftRoutes from "./routes/uplifts";
import inventoryRoutes from "./routes/inventory";
import reconciliationRoutes from "./routes/reconciliation";
import billingRoutes from "./routes/billing";
import qualityRoutes from "./routes/quality";
import maintenanceRoutes from "./routes/maintenance";
import alertRoutes from "./routes/alerts";
import auditRoutes from "./routes/audit";
import iotRoutes from "./routes/iot";
import reportRoutes from "./routes/reports";
import userRoutes from "./routes/users";

initSchema();

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN?.split(",") || "*" }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 1000, standardHeaders: true, legacyHeaders: false });
app.use("/api", apiLimiter);

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "NAC Fuel Management System API", time: new Date().toISOString() });
});

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/airports", airportRoutes);
app.use("/api/v1/fuel-products", fuelProductRoutes);
app.use("/api/v1/tanks", tankRoutes);
app.use("/api/v1/suppliers", supplierRoutes);
app.use("/api/v1/refuellers", refuellerRoutes);
app.use("/api/v1/airlines", airlineRoutes);
app.use("/api/v1/aircraft", aircraftRoutes);
app.use("/api/v1/customers", customerRoutes);
app.use("/api/v1/receipts", receiptRoutes);
app.use("/api/v1/transfers", transferRoutes);
app.use("/api/v1/uplifts", upliftRoutes);
app.use("/api/v1/inventory", inventoryRoutes);
app.use("/api/v1/reconciliation", reconciliationRoutes);
app.use("/api/v1/billing", billingRoutes);
app.use("/api/v1/quality", qualityRoutes);
app.use("/api/v1/maintenance", maintenanceRoutes);
app.use("/api/v1/alerts", alertRoutes);
app.use("/api/v1/audit-logs", auditRoutes);
app.use("/api/v1/iot", iotRoutes);
app.use("/api/v1/reports", reportRoutes);
app.use("/api/v1/users", userRoutes);

app.use(notFound);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`NAC Fuel Management System API listening on port ${PORT}`);
});

export default app;
