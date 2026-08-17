import { describe, it, expect, beforeEach } from "vitest";
import path from "path";

process.env.DB_PATH = path.join(__dirname, "../../data/test_nac_fms.db");

import { db, initSchema } from "../src/db";
import { postInventoryMovement, getTankBalance } from "../src/services/inventoryService";
import { v4 as uuid } from "uuid";

function seedMinimalTank(capacity = 100000) {
  const airportId = uuid();
  const facilityId = uuid();
  const productId = uuid();
  const tankId = uuid();
  const airportCode = `T${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  db.prepare(`INSERT INTO airports (id, code, name, status, connectivity_profile) VALUES (?, ?, 'Test Airport', 'active', 'online')`).run(airportId, airportCode);
  db.prepare(`INSERT INTO fuel_facilities (id, airport_id, name, facility_code, status) VALUES (?, ?, 'Test Facility', 'TST-FF1', 'active')`).run(facilityId, airportId);
  db.prepare(`INSERT INTO fuel_products (id, name, code, fuel_type, unit_of_measure, minimum_stock, maximum_stock, safety_stock, active) VALUES (?, 'Jet A-1', 'JETA1', 'aviation_turbine_fuel', 'L', 1000, 200000, 500, 1)`).run(productId);
  db.prepare(`INSERT INTO tanks (id, airport_id, fuel_facility_id, fuel_product_id, tank_code, capacity, current_level, status, maintenance_status) VALUES (?, ?, ?, ?, 'TST-TK1', ?, 0, 'active', 'ok')`).run(tankId, airportId, facilityId, productId, capacity);
  db.prepare(`INSERT INTO inventory_balances (tank_id, airport_id, fuel_product_id, current_level) VALUES (?, ?, ?, 0)`).run(tankId, airportId, productId);

  return { airportId, tankId };
}

describe("inventoryService", () => {
  beforeEach(() => {
    initSchema();
    for (const t of ["inventory_transactions", "inventory_balances", "tanks", "fuel_facilities", "fuel_products", "airports"]) {
      db.prepare(`DELETE FROM ${t}`).run();
    }
  });

  it("posts a receipt and increases balance", () => {
    const { tankId } = seedMinimalTank();
    const result = postInventoryMovement({ tankId, txnType: "RECEIPT", quantity: 5000, referenceType: "test" });
    expect(result.balanceAfter).toBe(5000);
    expect(getTankBalance(tankId)).toBe(5000);
  });

  it("posts an aircraft uplift and decreases balance", () => {
    const { tankId } = seedMinimalTank();
    postInventoryMovement({ tankId, txnType: "RECEIPT", quantity: 10000, referenceType: "test" });
    const result = postInventoryMovement({ tankId, txnType: "AIRCRAFT_UPLIFT", quantity: 3000, referenceType: "test" });
    expect(result.balanceAfter).toBe(7000);
  });

  it("rejects a movement that would result in negative inventory", () => {
    const { tankId } = seedMinimalTank();
    postInventoryMovement({ tankId, txnType: "RECEIPT", quantity: 1000, referenceType: "test" });
    expect(() => postInventoryMovement({ tankId, txnType: "AIRCRAFT_UPLIFT", quantity: 5000, referenceType: "test" })).toThrow(/negative inventory/);
  });

  it("rejects a movement that would exceed tank capacity", () => {
    const { tankId } = seedMinimalTank(5000);
    expect(() => postInventoryMovement({ tankId, txnType: "RECEIPT", quantity: 10000, referenceType: "test" })).toThrow(/exceed tank capacity/);
  });

  it("allows negative inventory only when explicitly permitted", () => {
    const { tankId } = seedMinimalTank();
    postInventoryMovement({ tankId, txnType: "RECEIPT", quantity: 1000, referenceType: "test" });
    const result = postInventoryMovement({ tankId, txnType: "LOSS", quantity: 1500, referenceType: "test", allowNegative: true });
    expect(result.balanceAfter).toBe(-500);
  });

  it("writes an immutable ledger row for every movement", () => {
    const { tankId } = seedMinimalTank();
    postInventoryMovement({ tankId, txnType: "RECEIPT", quantity: 2000, referenceType: "test" });
    postInventoryMovement({ tankId, txnType: "AIRCRAFT_UPLIFT", quantity: 500, referenceType: "test" });
    const rows = db.prepare(`SELECT * FROM inventory_transactions WHERE tank_id = ? ORDER BY created_at`).all(tankId) as any[];
    expect(rows.length).toBe(2);
    expect(rows[0].quantity).toBe(2000);
    expect(rows[1].quantity).toBe(-500);
    expect(rows[1].balance_after).toBe(1500);
  });
});
