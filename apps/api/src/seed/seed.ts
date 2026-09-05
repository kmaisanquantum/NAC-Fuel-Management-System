/**
 * DEMO / NOT REAL NAC DATA
 * Generates realistic but entirely fictional demonstration data for the
 * NAC Fuel Management System MVP, per spec section 31.
 */
import bcrypt from "bcryptjs";
import { v4 as uuid } from "uuid";
import { db, initSchema } from "../db";
import { postInventoryMovement, getTankBalance } from "../services/inventoryService";
import { createReceipt, transitionReceipt } from "../services/receiptService";
import { createUplift } from "../services/upliftService";
import { runReconciliation } from "../services/reconciliationService";

initSchema();

console.log("Seeding NAC Fuel Management System demo data (DEMO / NOT REAL NAC DATA)...");

// Wipe existing data for a clean re-seed (dev convenience only)
const tables = [
  "sync_queue", "iot_readings", "iot_devices", "audit_logs", "alerts", "payments", "invoices",
  "inspections", "maintenance_records", "fuel_quality_tests", "reconciliations", "inventory_transactions",
  "inventory_balances", "fuel_uplifts", "fuel_transfers", "fuel_receipts", "meters", "refuellers", "tanks",
  "vehicle_accidents", "vehicle_disposals", "vehicle_breakdowns", "vehicle_maintenance", "vehicle_inspections",
  "vehicle_trips", "vehicle_fuel_logs", "vehicle_allocations", "drivers", "vehicles",
  "aircraft", "airlines", "customers", "suppliers", "fuel_facilities", "fuel_products", "users", "role_permissions",
  "permissions", "roles", "airports",
];
for (const t of tables) db.prepare(`DELETE FROM ${t}`).run();

// --- Roles ---
const ROLES = [
  ["nac_admin", "NAC Administrator"],
  ["national_fuel_manager", "National Fuel Manager"],
  ["airport_fuel_manager", "Airport Fuel Manager"],
  ["fuel_operator", "Fuel Operator"],
  ["airport_manager", "Airport Manager"],
  ["finance_officer", "Finance Officer"],
  ["procurement_officer", "Procurement Officer"],
  ["engineering_maintenance", "Engineering / Maintenance"],
  ["safety_regulatory_officer", "Safety & Regulatory Officer"],
  ["auditor", "Auditor"],
  ["executive", "Executive / Management"],
  ["fleet_admin", "Fleet Administrator"],
  ["fleet_manager", "Fleet Manager"],
  ["department_manager", "Department Manager"],
  ["driver", "Driver"],
  ["finance", "Finance"],
  ["management", "Management"],
] as const;
const roleIds: Record<string, string> = {};
for (const [name, desc] of ROLES) {
  const id = uuid();
  roleIds[name] = id;
  db.prepare(`INSERT INTO roles (id, name, description) VALUES (?, ?, ?)`).run(id, name, desc);
}

// --- Airports (10+, NAC network, PNG) ---
const AIRPORTS = [
  ["POM", "Jacksons International", "National Capital District", -9.4438, 147.2200, "online"],
  ["LAE", "Nadzab", "Morobe", -6.5698, 146.7262, "online"],
  ["HGU", "Mount Hagen", "Western Highlands", -5.8269, 144.2959, "intermittent"],
  ["RAB", "Tokua", "East New Britain", -4.3453, 152.3814, "intermittent"],
  ["MAG", "Madang", "Madang", -5.2072, 145.7890, "online"],
  ["WWK", "Wewak", "East Sepik", -3.5837, 143.6692, "intermittent"],
  ["GUR", "Gurney", "Milne Bay", -9.7772, 149.8300, "offline_capable"],
  ["HKN", "Hoskins", "West New Britain", -5.4479, 150.4010, "offline_capable"],
  ["GKA", "Goroka", "Eastern Highlands", -6.0819, 145.3919, "intermittent"],
  ["KVG", "Kavieng", "New Ireland", -2.5798, 150.8067, "offline_capable"],
  ["BUA", "Buka", "Bougainville", -5.4229, 154.6739, "offline_capable"],
  ["MAS", "Momote", "Manus", -2.0614, 147.4232, "offline_capable"],
  ["VAN", "Vanimo", "West Sepik", -2.6986, 141.3011, "offline_capable"],
] as const;
const airportIds: Record<string, string> = {};
for (const [code, name, region, lat, lng, conn] of AIRPORTS) {
  const id = uuid();
  airportIds[code] = id;
  db.prepare(`
    INSERT INTO airports (id, code, iata_code, name, region, latitude, longitude, status, connectivity_profile)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?)
  `).run(id, code, code, name, region, lat, lng, conn);
}

// --- Users (one per role, at POM, plus airport managers for a few regional airports) ---
const passwordHash = bcrypt.hashSync("Password123!", 10);
function makeUser(email: string, fullName: string, role: string, airportCode?: string) {
  const id = uuid();
  db.prepare(`
    INSERT INTO users (id, email, password_hash, full_name, role_id, airport_id, status)
    VALUES (?, ?, ?, ?, ?, ?, 'active')
  `).run(id, email, passwordHash, fullName, roleIds[role], airportCode ? airportIds[airportCode] : null);
  return id;
}
makeUser("admin@nac.gov.pg", "Admin User", "nac_admin");
makeUser("fuel.manager@nac.gov.pg", "Grace Kila", "national_fuel_manager");
const pomManager = makeUser("pom.manager@nac.gov.pg", "James Waigani", "airport_fuel_manager", "POM");
const pomOperator = makeUser("pom.operator@nac.gov.pg", "Peter Namaliu", "fuel_operator", "POM");
makeUser("finance@nac.gov.pg", "Ruth Temu", "finance_officer");
makeUser("procurement@nac.gov.pg", "Michael Sori", "procurement_officer");
makeUser("engineering@nac.gov.pg", "Joseph Kaupa", "engineering_maintenance");
makeUser("safety@nac.gov.pg", "Alice Mendi", "safety_regulatory_officer");
makeUser("auditor@nac.gov.pg", "David Agiru", "auditor");
makeUser("exec@nac.gov.pg", "Susan Bola", "executive");
const laeManager = makeUser("lae.manager@nac.gov.pg", "Robert Kaupa", "airport_fuel_manager", "LAE");
const laeOperator = makeUser("lae.operator@nac.gov.pg", "Mary Yalu", "fuel_operator", "LAE");

// --- Fuel product ---
const jetA1Id = uuid();
db.prepare(`
  INSERT INTO fuel_products (id, name, code, fuel_type, unit_of_measure, density, minimum_stock, maximum_stock, safety_stock, active)
  VALUES (?, 'Jet A-1', 'JETA1', 'aviation_turbine_fuel', 'L', 0.804, 50000, 2000000, 30000, 1)
`).run(jetA1Id);

// --- Fuel facilities + tanks (2 tanks per airport = 26 tanks) ---
const tankIds: string[] = [];
const tanksByAirport: Record<string, string[]> = {};
for (const [code] of AIRPORTS) {
  const facilityId = uuid();
  db.prepare(`INSERT INTO fuel_facilities (id, airport_id, name, facility_code, status) VALUES (?, ?, ?, ?, 'active')`)
    .run(facilityId, airportIds[code], `${code} Main Fuel Farm`, `${code}-FF1`);

  tanksByAirport[code] = [];
  for (let i = 1; i <= 2; i++) {
    const capacity = code === "POM" || code === "LAE" ? 1500000 : 300000;
    const tankId = uuid();
    tankIds.push(tankId);
    tanksByAirport[code].push(tankId);
    db.prepare(`
      INSERT INTO tanks (id, airport_id, fuel_facility_id, fuel_product_id, tank_code, capacity, current_level, status, installation_date, last_inspection, next_inspection, calibration_date, next_calibration, maintenance_status)
      VALUES (?, ?, ?, ?, ?, ?, 0, 'active', '2018-03-01', '2026-02-01', '2026-08-01', '2025-11-01', '2026-11-01', 'ok')
    `).run(tankId, airportIds[code], facilityId, jetA1Id, `${code}-TK${i}`, capacity);
    db.prepare(`INSERT INTO inventory_balances (tank_id, airport_id, fuel_product_id, current_level) VALUES (?, ?, ?, 0)`)
      .run(tankId, airportIds[code], jetA1Id);
  }
}

// --- Suppliers (5+) ---
const SUPPLIERS = ["Puma Energy PNG", "Mobil Oil New Guinea", "Total Energies PNG", "InterOil (PNG) Ltd", "Bulk Fuel Distributors PNG"];
const supplierIds: string[] = [];
for (const name of SUPPLIERS) {
  const id = uuid();
  supplierIds.push(id);
  db.prepare(`
    INSERT INTO suppliers (id, name, contact_name, contact_email, contract_ref, contract_start, contract_expiry, active)
    VALUES (?, ?, 'Supply Coordinator', ?, ?, '2024-01-01', '2027-12-31', 1)
  `).run(id, name, `contracts@${name.toLowerCase().replace(/[^a-z]/g, "")}.example`, `NAC-SUP-${1000 + supplierIds.length}`);
}

// --- Customers / Airlines (10+) ---
const AIRLINES = [
  "Air Niugini", "PNG Air", "Airlines PNG", "Hevilift", "North Coast Aviation",
  "Heli Solutions PNG", "Talair", "Nationwide Air", "Islands Nationair", "MAF PNG",
];
const customerIds: string[] = [];
const airlineIds: string[] = [];
for (const name of AIRLINES) {
  const custId = uuid();
  customerIds.push(custId);
  db.prepare(`INSERT INTO customers (id, name, customer_type, billing_email, active) VALUES (?, ?, 'airline', ?, 1)`)
    .run(custId, name, `billing@${name.toLowerCase().replace(/[^a-z]/g, "")}.example`);
  const airlineId = uuid();
  airlineIds.push(airlineId);
  db.prepare(`INSERT INTO airlines (id, customer_id, name, iata_code, active) VALUES (?, ?, ?, ?, 1)`)
    .run(airlineId, custId, name, name.slice(0, 2).toUpperCase());
}

// --- Aircraft (50+) ---
const aircraftTypes = ["DHC-8-200", "Fokker 100", "DHC-6 Twin Otter", "ATR 72-600", "B737-800", "Cessna 208 Caravan"];
const aircraftIds: string[] = [];
for (let i = 0; i < 55; i++) {
  const id = uuid();
  aircraftIds.push(id);
  const airlineId = airlineIds[i % airlineIds.length];
  const reg = `P2-${(100 + i).toString()}`;
  db.prepare(`INSERT INTO aircraft (id, airline_id, registration, aircraft_type, active) VALUES (?, ?, ?, ?, 1)`)
    .run(id, airlineId, reg, aircraftTypes[i % aircraftTypes.length]);
}

// --- Refuellers (10+, spread across airports) ---
const refuellerIds: Record<string, string[]> = {};
let rIdx = 0;
for (const [code] of AIRPORTS) {
  refuellerIds[code] = [];
  const count = code === "POM" || code === "LAE" ? 2 : 1;
  for (let i = 0; i < count; i++) {
    const id = uuid();
    refuellerIds[code].push(id);
    rIdx++;
    db.prepare(`
      INSERT INTO refuellers (id, airport_id, asset_code, registration, capacity, fuel_product_id, current_level, status, last_maintenance, next_maintenance)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'active', '2026-05-01', '2026-11-01')
    `).run(id, airportIds[code], `BOW-${code}-${i + 1}`, `NAC-BOW-${1000 + rIdx}`, 40000, jetA1Id, 15000);
  }
}

// --- Historical inventory: post opening receipts to give each tank real starting stock ---
const receiptRefUsers: Record<string, string> = { POM: pomOperator, LAE: laeOperator };
for (const [code] of AIRPORTS) {
  for (const tankId of tanksByAirport[code]) {
    postInventoryMovement({
      tankId,
      txnType: "RECEIPT",
      quantity: code === "POM" || code === "LAE" ? 800000 : 120000,
      referenceType: "manual_adjustment",
      reason: "Opening balance (demo seed)",
      createdBy: receiptRefUsers[code] ?? pomOperator,
    });
  }
}

// --- 100+ fuel transactions: mix of receipts (posted) and aircraft uplifts over the last 14 days ---
let receiptCount = 0;
let upliftCount = 0;
const now = Date.now();

for (let day = 13; day >= 0; day--) {
  const dayDate = new Date(now - day * 24 * 3600 * 1000);
  for (const [code] of AIRPORTS) {
    const operatorId = code === "POM" ? pomOperator : code === "LAE" ? laeOperator : pomOperator;
    const tankId = tanksByAirport[code][0];

    // ~1 receipt every 3 days per airport
    if (day % 3 === 0) {
      const supplierId = supplierIds[receiptCount % supplierIds.length];
      const receipt = createReceipt({
        airportId: airportIds[code],
        airportCode: code,
        supplierId,
        tankId,
        fuelProductId: jetA1Id,
        quantity: code === "POM" || code === "LAE" ? 150000 : 25000,
        deliveryVehicle: `Tanker-${100 + receiptCount}`,
        driverName: "Demo Driver",
        deliveryDocument: `DN-${20260000 + receiptCount}`,
        batchNumber: `BATCH-${2026}-${receiptCount}`,
        meterReading: 1000 + receiptCount * 10,
        createdBy: operatorId,
      });
      transitionReceipt(receipt.id, "submitted", operatorId, "fuel_operator");
      transitionReceipt(receipt.id, "verified", operatorId, "fuel_operator");
      transitionReceipt(receipt.id, "approved", pomManager, "airport_fuel_manager");
      transitionReceipt(receipt.id, "posted", pomManager, "airport_fuel_manager");
      receiptCount++;
    }

    // 2-4 uplifts per airport per day
    const upliftsToday = code === "POM" || code === "LAE" ? 4 : 2;
    for (let u = 0; u < upliftsToday; u++) {
      const airlineIdx = (day + u) % airlineIds.length;
      const aircraftIdx = (day * 3 + u) % aircraftIds.length;
      const refuellerId = refuellerIds[code][u % refuellerIds[code].length];
      try {
        createUplift({
          airportId: airportIds[code],
          airportCode: code,
          airlineId: airlineIds[airlineIdx],
          aircraftId: aircraftIds[aircraftIdx],
          flightNumber: `PX${100 + u}`,
          fuelProductId: jetA1Id,
          refuellerId,
          tankId,
          quantity: code === "POM" || code === "LAE" ? 4500 + u * 300 : 1200 + u * 150,
          startMeterReading: 5000 + u,
          endMeterReading: 5000 + u + 4500,
          pricePerLitre: 2.35, // PGK per litre (demo)
          customerAuthorisation: `AUTH-${2026}-${day}-${u}`,
          operatorId,
        });
        upliftCount++;
      } catch {
        // insufficient stock on a low day — skip, this is expected demo behaviour
      }
    }
  }
}
console.log(`  Posted ${receiptCount} fuel receipts, ${upliftCount} aircraft uplifts.`);

// --- Fuel quality tests ---
let qualityCount = 0;
for (const [code] of AIRPORTS) {
  const id = uuid();
  db.prepare(`
    INSERT INTO fuel_quality_tests (id, sample_ref, airport_id, tank_id, fuel_product_id, sample_date, sample_type, test_type, result, pass_fail, technician, certificate_ref)
    VALUES (?, ?, ?, ?, ?, date('now', '-2 days'), 'routine', 'density_and_water_content', 'within_spec', 'pass', 'Demo Technician', ?)
  `).run(id, `QT-DEMO-${1000 + qualityCount}`, airportIds[code], tanksByAirport[code][0], jetA1Id, `CERT-${2026}-${qualityCount}`);
  qualityCount++;
}
// One failed test to demonstrate the alert path
const failId = uuid();
db.prepare(`
  INSERT INTO fuel_quality_tests (id, sample_ref, airport_id, tank_id, fuel_product_id, sample_date, sample_type, test_type, result, pass_fail, technician)
  VALUES (?, 'QT-DEMO-FAIL-01', ?, ?, ?, date('now', '-1 days'), 'routine', 'water_content', 'elevated_water_content', 'fail', 'Demo Technician')
`).run(failId, airportIds["WWK"], tanksByAirport["WWK"][0], jetA1Id);
db.prepare(`
  INSERT INTO alerts (id, severity, airport_id, asset_type, asset_id, category, description, status)
  VALUES (?, 'critical', ?, 'tank', ?, 'quality_failure', 'Fuel quality test QT-DEMO-FAIL-01 FAILED — elevated water content', 'open')
`).run(uuid(), airportIds["WWK"], tanksByAirport["WWK"][0]);

// --- Maintenance records ---
let maintCount = 0;
for (const [code] of AIRPORTS) {
  const id = uuid();
  db.prepare(`
    INSERT INTO maintenance_records (id, airport_id, asset_type, asset_id, maintenance_type, scheduled_date, technician, work_performed, cost, next_maintenance, status)
    VALUES (?, ?, 'tank', ?, 'routine_inspection', date('now', '+10 days'), 'NAC Engineering Team', NULL, NULL, date('now', '+190 days'), 'scheduled')
  `).run(id, airportIds[code], tanksByAirport[code][0]);
  maintCount++;
}

// --- Alerts: low stock + calibration due, on top of the quality-failure one above ---
const lowStockRows = db.prepare(`
  SELECT b.airport_id, b.tank_id, t.tank_code, b.current_level, p.minimum_stock
  FROM inventory_balances b JOIN tanks t ON t.id = b.tank_id JOIN fuel_products p ON p.id = b.fuel_product_id
  WHERE b.current_level <= p.minimum_stock
`).all() as any[];
for (const row of lowStockRows) {
  db.prepare(`
    INSERT INTO alerts (id, severity, airport_id, asset_type, asset_id, category, description, status)
    VALUES (?, 'warning', ?, 'tank', ?, 'low_stock', ?, 'open')
  `).run(uuid(), row.airport_id, row.tank_id, `Tank ${row.tank_code} at ${row.current_level}L is at or below minimum stock (${row.minimum_stock}L)`);
}

// --- Reconciliation for today at POM tank 1 (demonstrates the variance workflow) ---
const todayStr = new Date().toISOString().slice(0, 10);
try {
  const expectedApprox = getTankBalance(tanksByAirport.POM[0]);
  runReconciliation({
    tankId: tanksByAirport.POM[0],
    reconDate: todayStr,
    actualClosing: expectedApprox - 6500, // simulate a variance, matching the spec's worked example
    userId: pomManager,
  });
} catch (e) {
  console.log("  Reconciliation demo skipped:", (e as Error).message);
}

// --- IoT devices (simulated, spec section 21) ---
let iotCount = 0;
for (const [code] of AIRPORTS.slice(0, 3)) {
  const deviceId = uuid();
  db.prepare(`INSERT INTO iot_devices (id, airport_id, asset_type, asset_id, device_type, status) VALUES (?, ?, 'tank', ?, 'level_sensor', 'active')`)
    .run(deviceId, airportIds[code], tanksByAirport[code][0]);
  for (let i = 0; i < 5; i++) {
    db.prepare(`INSERT INTO iot_readings (id, device_id, reading_type, value, unit, recorded_at) VALUES (?, ?, 'level', ?, 'L', datetime('now', ?))`)
      .run(uuid(), deviceId, 100000 + Math.random() * 5000, `-${i} hours`);
  }
  iotCount++;
}

// --- Fleet Management Demo Seed Data ---
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

// Allocations
db.prepare(`
  INSERT INTO vehicle_allocations (id, vehicle_id, department, custodian, driver_id, allocation_date, approval_status, authorisation_status, notes)
  VALUES (?, ?, 'Operations', 'John Kaupa', ?, '2026-01-01', 'approved', 'active', 'Primary airport operations pickup')
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// Fuel Logs
db.prepare(`
  INSERT INTO vehicle_fuel_logs (id, vehicle_id, driver_id, date, time, station, fuel_type, litres, cost_per_litre, total_cost, odometer_reading, payment_method, receipt_ref, l_per_100km, km_per_l, cost_per_km)
  VALUES (?, ?, ?, '2026-02-25', '08:30', 'Puma Energy Jacksons', 'Diesel', 60.0, 4.50, 270.0, 45200.0, 'Fuel Card', 'RC-9901', 10.0, 10.0, 0.45)
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// Trips
db.prepare(`
  INSERT INTO vehicle_trips (id, vehicle_id, driver_id, date, time_out, time_in, start_location, destination, purpose, begin_odometer, end_odometer, total_km, odometer_anomaly, authorising_officer)
  VALUES (?, ?, ?, '2026-02-26', '07:30', '16:00', 'POM Depot', 'Nadzab Highway Checkpoint', 'Routine Inspection', 45200.0, 45350.0, 150.0, 0, 'Fleet Manager')
`).run(uuid(), vehicleIds["V001"], driverIds["EMP-101"]);

// Daily Inspection Pass
db.prepare(`
  INSERT INTO vehicle_inspections (id, vehicle_id, inspector_id, inspector_name, inspection_date, result, checklist, notes)
  VALUES (?, ?, ?, 'John Kaupa', '2026-02-27', 'pass', ?, 'All systems functional')
`).run(uuid(), vehicleIds["V001"], pomOperator, JSON.stringify({ tires: "pass", brakes: "pass", lights: "pass", fluid_levels: "pass" }));

// Maintenance
db.prepare(`
  INSERT INTO vehicle_maintenance (id, vehicle_id, maintenance_type, description, scheduled_date, technician, cost, status)
  VALUES (?, ?, 'scheduled_service', '50,000km Major Service & Oil Filter Change', '2026-03-10', 'Toyota Port Moresby', 1250.0, 'scheduled')
`).run(uuid(), vehicleIds["V001"]);

console.log(`Seed complete: ${AIRPORTS.length} airports, ${tankIds.length} tanks, ${rIdx} refuellers, ${supplierIds.length} suppliers, ${airlineIds.length} airlines, ${aircraftIds.length} aircraft, ${qualityCount + 1} quality tests, ${maintCount} maintenance records, ${iotCount} IoT devices, plus 4 vehicles and 3 drivers seeded.`);
console.log("Demo login: admin@nac.gov.pg / Password123!  (DEMO / NOT REAL NAC DATA)");
