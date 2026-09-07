/**
 * DEMO / NOT REAL DATA
 * Generates realistic but entirely fictional demonstration data for the
 * Fleet Management System.
 */
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db, initSchema } from "../db";

initSchema();

console.log("Seeding Fleet Management System demo data...");

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

const adminUser = makeUser("admin@dspng.tech", "Admin User", "admin");

// --- Fleet Vehicles ---
const vehicleData = [
  { number: "V001", reg: "FLEET-001", make: "Toyota", model: "Hilux 4x4", year: 2022, type: "Utility / Pickup", fuel: "Diesel", dept: "Operations", loc: "Port Moresby (POM)", status: "active", acqDate: "2022-01-15", acqCost: 120000, value: 85000, ownership: "owned", insPol: "INS-2026-001", insExp: "2026-12-31", regExp: "2026-11-30" },
  { number: "V002", reg: "FLEET-002", make: "Toyota", model: "Land Cruiser", year: 2021, type: "SUV / Passenger", fuel: "Diesel", dept: "Executive", loc: "Port Moresby (POM)", status: "active", acqDate: "2021-05-10", acqCost: 180000, value: 110000, ownership: "owned", insPol: "INS-2026-002", insExp: "2026-12-31", regExp: "2026-10-15" },
  { number: "V003", reg: "FLEET-003", make: "Isuzu", model: "NPR Truck", year: 2020, type: "Light Truck", fuel: "Diesel", dept: "Maintenance", loc: "Nadzab (LAE)", status: "under_repair", acqDate: "2020-08-20", acqCost: 150000, value: 75000, ownership: "owned", insPol: "INS-2026-003", insExp: "2026-09-30", regExp: "2026-08-31" },
  { number: "V004", reg: "FLEET-004", make: "Nissan", model: "Navara", year: 2023, type: "Utility / Pickup", fuel: "Diesel", dept: "Safety", loc: "Mount Hagen (HGU)", status: "active", acqDate: "2023-03-01", acqCost: 135000, value: 115000, ownership: "leased", insPol: "INS-2026-004", insExp: "2027-02-28", regExp: "2027-01-31" },
];

const vehicleIds: Record<string, string> = {};
for (const v of vehicleData) {
  const id = uuid();
  vehicleIds[v.number] = id;
  db.prepare(`
    INSERT INTO vehicles (id, vehicle_number, registration_number, make, model, year, vehicle_type, fuel_type, department, location, status, acquisition_date, acquisition_cost, current_value, ownership, insurance_policy, insurance_expiry, registration_expiry)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, v.number, v.reg, v.make, v.model, v.year, v.type, v.fuel, v.dept, v.loc, v.status, v.acqDate, v.acqCost, v.value, v.ownership, v.insPol, v.insExp, v.regExp);
}

// --- Drivers ---
const driverData = [
  { emp: "EMP-101", name: "Peter Namaliu", dept: "Operations", lic: "DL-88231", class: "Class 6 Heavy", exp: "2027-06-30", status: "authorised" },
  { emp: "EMP-102", name: "John Somare", dept: "Executive", lic: "DL-99412", class: "Class 3 Light", exp: "2026-11-15", status: "authorised" },
  { emp: "EMP-103", name: "Samuel Abel", dept: "Maintenance", lic: "DL-77123", class: "Class 6 Heavy", exp: "2025-08-20", status: "authorised" },
];

const driverIds: Record<string, string> = {};
for (const d of driverData) {
  const id = uuid();
  driverIds[d.emp] = id;
  db.prepare(`
    INSERT INTO drivers (id, employee_number, name, department, licence_number, licence_class, licence_expiry, authorisation_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, d.emp, d.name, d.dept, d.lic, d.class, d.exp, d.status);
}

// --- Allocations ---
db.prepare(`
  INSERT INTO vehicle_allocations (id, vehicle_id, department, custodian, driver_id, allocation_date, approval_status, authorisation_status, notes)
  VALUES (?, ?, 'Operations', 'Peter Namaliu', ?, '2024-01-01', 'approved', 'active', 'Primary duty vehicle for airport perimeter patrol')
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// --- Vehicle Fuel Logs ---
db.prepare(`
  INSERT INTO vehicle_fuel_logs (id, vehicle_id, driver_id, date, time, station, fuel_type, litres, cost_per_litre, total_cost, odometer_reading, payment_method, receipt_ref, l_per_100km, km_per_l, cost_per_km)
  VALUES (?, ?, ?, '2026-03-01', '08:30', 'Puma Jacksons', 'Diesel', 65.5, 4.20, 275.10, 45200, 'Fuel Card', 'RCT-9912', 11.2, 8.9, 0.47)
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// --- Trips ---
db.prepare(`
  INSERT INTO vehicle_trips (id, vehicle_id, driver_id, date, time_out, time_in, start_location, destination, purpose, begin_odometer, end_odometer, total_km, odometer_anomaly, authorising_officer)
  VALUES (?, ?, ?, '2026-03-01', '07:00', '16:30', 'POM Depot', 'Port Moresby Airfield', 'Routine perimeter inspection', 44800, 45200, 400, 0, 'Grace Kila')
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// --- Inspections ---
db.prepare(`
  INSERT INTO vehicle_inspections (id, vehicle_id, inspector_id, inspector_name, inspection_date, result, checklist, notes)
  VALUES (?, ?, ?, 'Peter Namaliu', '2026-03-01', 'pass', '{"tyres":"ok","oil":"ok","brakes":"ok","lights":"ok"}', 'Vehicle in good working order')
`).run(uuid(), vehicleIds["V001"], adminUser);

// --- Maintenance ---
db.prepare(`
  INSERT INTO vehicle_maintenance (id, vehicle_id, maintenance_type, description, scheduled_date, status)
  VALUES (?, ?, 'scheduled_service', '50,000 km Scheduled Service & Oil Change', '2026-03-15', 'scheduled')
`).run(uuid(), vehicleIds["V001"]);

console.log("Seed complete: 4 vehicles, 3 drivers, allocations, fuel logs, trips, inspections, and maintenance records seeded.");
console.log("Demo login: admin@dspng.tech / Admin@2026");
