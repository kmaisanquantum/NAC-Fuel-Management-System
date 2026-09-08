/**
 * Generates initial system data for the Fleet Management System.
 */
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db, initSchema } from "../db";

initSchema();

console.log("Seeding Fleet Management System data...");

// Wipe existing data for a clean re-seed
const tables = [
  "audit_logs", "alerts", "vehicle_disposals", "vehicle_accidents", "vehicle_breakdowns",
  "vehicle_maintenance", "vehicle_inspections", "vehicle_trips", "vehicle_fuel_logs",
  "vehicle_allocations", "drivers", "vehicles", "users", "role_permissions",
  "permissions", "roles"
];
for (const t of tables) {
  try { db.prepare(`DELETE FROM ${t}`).run(); } catch {}
}

// --- Roles ---
const ROLES = [
  ["admin", "System Administrator"],
  ["fleet_admin", "Fleet Administrator"],
  ["fleet_manager", "Fleet Manager"],
  ["department_manager", "Department Manager"],
  ["driver", "Driver"],
  ["finance", "Finance"],
  ["management", "Management"],
  ["fuel_operator", "Fuel Operator"]
] as const;

const roleIds: Record<string, string> = {};
for (const [name, desc] of ROLES) {
  const id = uuid();
  roleIds[name] = id;
  db.prepare(`INSERT INTO roles (id, name, description) VALUES (?, ?, ?)`).run(id, name, desc);
}

// --- Users ---
const passwordHash = bcrypt.hashSync("Admin@2026", 10);
function makeUser(email: string, fullName: string, role: string) {
  const id = uuid();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role_id, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, email, passwordHash, fullName, roleIds[role]);
  return id;
}

makeUser("admin@dspng.tech", "Admin User", "admin");

console.log("Seed complete: Roles and admin user (admin@dspng.tech) created.");
console.log("Admin login: admin@dspng.tech / Admin@2026");
