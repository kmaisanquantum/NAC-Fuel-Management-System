/**
 * DEMO / NOT REAL DATA
 * Generates demonstration data for the Fleet Management System.
 */
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db, initSchema } from "../db";

initSchema();

console.log("Seeding Fleet Management System demo data...");

// Wipe existing data for a clean re-seed
const tables = [
  "audit_logs", "alerts", "vehicle_accidents", "vehicle_disposals",
  "vehicle_breakdowns", "vehicle_maintenance", "vehicle_inspections",
  "vehicle_trips", "vehicle_fuel_logs", "vehicle_allocations",
  "drivers", "vehicles", "users", "role_permissions", "permissions", "roles",
];
for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();

// --- Roles ---
const ROLES = [
  ["nac_admin", "System Administrator"],
  ["fleet_admin", "Fleet Administrator"],
  ["fleet_manager", "Fleet Manager"],
  ["department_manager", "Department Manager"],
  ["driver", "Driver"],
  ["finance", "Finance"],
  ["management", "Executive / Management"],
] as const;
const roleIds: Record<string, string> = {};
for (const [name, desc] of ROLES) {
  const id = uuid();
  roleIds[name] = id;
  db.prepare(`INSERT INTO roles (id, name, description) VALUES (?, ?, ?)`).run(id, name, desc);
}

// --- Users ---
const passwordHash = bcrypt.hashSync("Password123!", 10);
function makeUser(email: string, fullName: string, role: string) {
  const id = uuid();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role_id, status)
    VALUES (?, ?, ?, ?, ?, 'active')
  `).run(id, email, passwordHash, fullName, roleIds[role]);
  return id;
}

const adminUser = makeUser("admin@nac.gov.pg", "Admin User", "nac_admin");
const fleetManagerUser = makeUser("fleet.manager@nac.gov.pg", "Grace Kila", "fleet_manager");
const driverUser = makeUser("driver@nac.gov.pg", "Peter Namaliu", "driver");

// --- Fleet Vehicles ---
const vehicleData = [
  { number: "V001", reg: "P2-NAC01", make: "Toyota", model: "Hilux 4x4", year: 2022, type: "Utility / Pickup", fuel: "Diesel", dept: "Operations", loc: "Port Moresby (POM)", status: "active", acqDate: "2022-01-15", acqCost: 120000, value: 85000, ownership: "owned", insPol: "INS-2026-001", insExp: "2026-12-31", regExp: "2026-11-30" },
  { number: "V002", reg: "P2-NAC02", make: "Toyota", model: "Land Cruiser", year: 2021, type: "SUV / Passenger", fuel: "Diesel", dept: "Executive", loc: "Port Moresby (POM)", status: "active", acqDate: "2021-05-10", acqCost: 180000, value: 110000, ownership: "owned", insPol: "INS-2026-002", insExp: "2026-12-31", regExp: "2026-10-15" },
  { number: "V003", reg: "P2-NAC03", make: "Isuzu", model: "NPR Truck", year: 2020, type: "Light Truck", fuel: "Diesel", dept: "Maintenance", loc: "Nadzab (LAE)", status: "under_repair", acqDate: "2020-08-20", acqCost: 150000, value: 75000, ownership: "owned", insPol: "INS-2026-003", insExp: "2026-09-30", regExp: "2026-08-31" },
  { number: "V004", reg: "P2-NAC04", make: "Nissan", model: "Navara", year: 2023, type: "Utility / Pickup", fuel: "Diesel", dept: "Safety", loc: "Mount Hagen (HGU)", status: "active", acqDate: "2023-03-01", acqCost: 135000, value: 115000, ownership: "leased", insPol: "INS-2026-004", insExp: "2027-02-28", regExp: "2027-01-31" },
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
  { empNum: "EMP-101", name: "John Kaupa", dept: "Operations", licNum: "DL-88201", licClass: "Class 4 (Heavy)", licExp: "2027-05-15", status: "authorised", accHistory: "None", training: "Defensive Driving 2025" },
  { empNum: "EMP-102", name: "Paias Wingti", dept: "Maintenance", licNum: "DL-88202", licClass: "Class 3 (Medium)", licExp: "2026-11-20", status: "authorised", accHistory: "Minor dent 2024", training: "First Aid & Vehicle Inspection 2024" },
  { empNum: "EMP-103", name: "Sione Kila", dept: "Executive", licNum: "DL-88203", licClass: "Class 1 (Light)", licExp: "2026-08-10", status: "authorised", accHistory: "None", training: "VIP Transport 2025" },
];

const driverIds: Record<string, string> = {};
for (const d of driverData) {
  const id = uuid();
  driverIds[d.empNum] = id;
  db.prepare(`
    INSERT INTO drivers (id, employee_number, name, department, licence_number, licence_class, licence_expiry, authorisation_status, accident_history, training)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, d.empNum, d.name, d.dept, d.licNum, d.licClass, d.licExp, d.status, d.accHistory, d.training);
}

// --- Allocations ---
db.prepare(`
  INSERT INTO vehicle_allocations (id, vehicle_id, department, custodian, driver_id, allocation_date, approval_status, authorisation_status, notes)
  VALUES (?, ?, 'Operations', 'John Kaupa', ?, '2026-01-01', 'approved', 'active', 'Primary airport operations pickup')
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// --- Fuel Logs ---
db.prepare(`
  INSERT INTO vehicle_fuel_logs (id, vehicle_id, driver_id, date, time, station, fuel_type, litres, cost_per_litre, total_cost, odometer_reading, payment_method, receipt_ref, l_per_100km, km_per_l, cost_per_km)
  VALUES (?, ?, ?, '2026-02-25', '08:30', 'Puma Energy Jacksons', 'Diesel', 60.0, 4.50, 270.0, 45200.0, 'Fuel Card', 'RC-9901', 10.0, 10.0, 0.45)
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// --- Trips ---
db.prepare(`
  INSERT INTO vehicle_trips (id, vehicle_id, driver_id, date, time_out, time_in, start_location, destination, purpose, begin_odometer, end_odometer, total_km, odometer_anomaly, authorising_officer)
  VALUES (?, ?, ?, '2026-02-26', '07:30', '16:00', 'POM Depot', 'Nadzab Highway Checkpoint', 'Routine Inspection', 45200.0, 45350.0, 150.0, 0, 'Fleet Manager')
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// --- Inspections ---
db.prepare(`
  INSERT INTO vehicle_inspections (id, vehicle_id, inspector_id, inspector_name, inspection_date, result, checklist, notes)
  VALUES (?, ?, ?, 'John Kaupa', '2026-02-27', 'pass', ?, 'All systems functional')
`).run(uuid(), vehicleIds["V001"], driverUser, JSON.stringify({ tires: "pass", brakes: "pass", lights: "pass", fluid_levels: "pass" }));

// --- Maintenance ---
db.prepare(`
  INSERT INTO vehicle_maintenance (id, vehicle_id, maintenance_type, description, scheduled_date, technician, cost, status)
  VALUES (?, ?, 'scheduled_service', '50,000km Major Service & Oil Filter Change', '2026-03-10', 'Toyota Port Moresby', 1250.0, 'scheduled')
`).run(uuid(), vehicleIds["V001"]);

console.log("Seed complete: 4 vehicles, 3 drivers, allocations, fuel logs, trips, inspections, and maintenance records seeded.");
console.log("Demo login: admin@nac.gov.pg / Password123!");
