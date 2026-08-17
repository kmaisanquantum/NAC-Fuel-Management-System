import { v4 as uuid } from "uuid";
import { db } from "../db";
import { ApiError } from "../middleware/errorHandler";
import { generateReference } from "../utils/reference";
import { postInventoryMovement } from "./inventoryService";
import { writeAudit } from "../utils/audit";

export interface CreateUpliftInput {
  airportId: string;
  airportCode: string;
  airlineId: string;
  aircraftId: string;
  flightNumber?: string;
  fuelProductId: string;
  refuellerId: string;
  tankId: string;
  quantity: number;
  startMeterReading?: number;
  endMeterReading?: number;
  pricePerLitre: number;
  customerAuthorisation?: string;
  operatorId: string;
}

/**
 * Core end-to-end workflow (spec section 33):
 *   BEGIN TRANSACTION
 *     validate stock / aircraft / refueller
 *     create uplift transaction
 *     create inventory transaction (deduct from tank)
 *     update inventory balance
 *     create billing record (invoice, status=draft)
 *     create audit record
 *   COMMIT (or ROLLBACK on any failure)
 *
 * better-sqlite3's db.transaction() wraps this in a native SQLite transaction,
 * giving us the same all-or-nothing guarantee the spec requires.
 */
export function createUplift(input: CreateUpliftInput) {
  // --- validation ---
  const aircraft = db.prepare(`SELECT * FROM aircraft WHERE id = ? AND active = 1`).get(input.aircraftId) as any;
  if (!aircraft) throw new ApiError(404, "Aircraft not found or inactive");

  const refueller = db.prepare(`SELECT * FROM refuellers WHERE id = ?`).get(input.refuellerId) as any;
  if (!refueller) throw new ApiError(404, "Refueller not found");
  if (refueller.status !== "active") throw new ApiError(422, `Refueller is ${refueller.status}, cannot dispense`);

  const tank = db.prepare(`SELECT * FROM tanks WHERE id = ?`).get(input.tankId) as any;
  if (!tank) throw new ApiError(404, "Tank not found");

  const balanceRow = db.prepare(`SELECT current_level FROM inventory_balances WHERE tank_id = ?`).get(input.tankId) as
    | { current_level: number }
    | undefined;
  const currentLevel = balanceRow?.current_level ?? tank.current_level ?? 0;
  if (currentLevel < input.quantity) {
    throw new ApiError(422, `Insufficient stock: tank has ${currentLevel}L, uplift requires ${input.quantity}L`);
  }

  const upliftId = uuid();
  const reference = generateReference(input.airportCode, "UPL");
  const totalAmount = Math.round(input.quantity * input.pricePerLitre * 100) / 100;

  const result = db.transaction(() => {
    // create uplift record
    db.prepare(`
      INSERT INTO fuel_uplifts
        (id, reference, airport_id, airline_id, aircraft_id, flight_number, fuel_product_id, refueller_id, tank_id,
         quantity, start_meter_reading, end_meter_reading, price_per_litre, total_amount, operator_id,
         customer_authorisation, invoice_status, status, created_by)
      VALUES (@id, @reference, @airportId, @airlineId, @aircraftId, @flightNumber, @fuelProductId, @refuellerId, @tankId,
         @quantity, @startMeterReading, @endMeterReading, @pricePerLitre, @totalAmount, @operatorId,
         @customerAuthorisation, 'invoiced', 'completed', @operatorId)
    `).run({
      id: upliftId,
      reference,
      airportId: input.airportId,
      airlineId: input.airlineId,
      aircraftId: input.aircraftId,
      flightNumber: input.flightNumber ?? null,
      fuelProductId: input.fuelProductId,
      refuellerId: input.refuellerId,
      tankId: input.tankId,
      quantity: input.quantity,
      startMeterReading: input.startMeterReading ?? null,
      endMeterReading: input.endMeterReading ?? null,
      pricePerLitre: input.pricePerLitre,
      totalAmount,
      operatorId: input.operatorId,
      customerAuthorisation: input.customerAuthorisation ?? null,
    });

    // deduct inventory
    postInventoryMovement({
      tankId: input.tankId,
      txnType: "AIRCRAFT_UPLIFT",
      quantity: input.quantity,
      referenceType: "fuel_uplift",
      referenceId: upliftId,
      createdBy: input.operatorId,
    });

    // generate billing record
    const airline = db.prepare(`SELECT * FROM airlines WHERE id = ?`).get(input.airlineId) as any;
    const customerId = airline?.customer_id;
    let invoiceId: string | null = null;
    if (customerId) {
      invoiceId = uuid();
      const invoiceNumber = generateReference(input.airportCode, "INV");
      db.prepare(`
        INSERT INTO invoices (id, invoice_number, airport_id, customer_id, uplift_id, amount, taxes_fees, total_amount, currency, invoice_date, due_date, status)
        VALUES (@id, @invoiceNumber, @airportId, @customerId, @upliftId, @amount, 0, @amount, 'PGK', date('now'), date('now', '+30 days'), 'draft')
      `).run({
        id: invoiceId,
        invoiceNumber,
        airportId: input.airportId,
        customerId,
        upliftId,
        amount: totalAmount,
      });
    }

    writeAudit({
      userId: input.operatorId,
      action: "FUEL_UPLIFTED",
      entity: "fuel_uplifts",
      entityId: upliftId,
      newValue: { reference, quantity: input.quantity, totalAmount },
    });

    return { id: upliftId, reference, totalAmount, invoiceId, status: "completed" };
  })();

  return result;
}
