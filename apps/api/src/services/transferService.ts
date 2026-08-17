import { v4 as uuid } from "uuid";
import { db } from "../db";
import { ApiError } from "../middleware/errorHandler";
import { generateReference } from "../utils/reference";
import { postInventoryMovement } from "./inventoryService";
import { writeAudit } from "../utils/audit";

export interface CreateTransferInput {
  airportId: string;
  airportCode: string;
  destinationAirportId?: string;
  sourceType: "tank" | "refueller";
  sourceId: string;
  destinationType: "tank" | "refueller";
  destinationId: string;
  fuelProductId: string;
  quantity: number;
  sourceMeterReading?: number;
  destinationMeterReading?: number;
  reason?: string;
  operatorId: string;
}

/**
 * Creates and immediately posts a fuel transfer between two assets.
 * Only tank<->tank and tank<->refueller transfers move the immutable
 * inventory ledger directly (refueller stock is tracked on the refueller
 * record itself, per REFUELLER_MANAGEMENT in the spec).
 */
export function createTransfer(input: CreateTransferInput) {
  if (input.sourceType === input.destinationType && input.sourceId === input.destinationId) {
    throw new ApiError(422, "Source and destination cannot be the same asset");
  }

  const id = uuid();
  const reference = generateReference(input.airportCode, "TRF");

  const runTxn = db.transaction(() => {
    if (input.sourceType === "tank") {
      postInventoryMovement({
        tankId: input.sourceId,
        txnType: "TRANSFER_OUT",
        quantity: input.quantity,
        referenceType: "fuel_transfer",
        referenceId: id,
        createdBy: input.operatorId,
      });
    } else {
      db.prepare(`UPDATE refuellers SET current_level = current_level - ?, updated_at = datetime('now') WHERE id = ?`)
        .run(input.quantity, input.sourceId);
    }

    if (input.destinationType === "tank") {
      postInventoryMovement({
        tankId: input.destinationId,
        txnType: "TRANSFER_IN",
        quantity: input.quantity,
        referenceType: "fuel_transfer",
        referenceId: id,
        createdBy: input.operatorId,
      });
    } else {
      const refueller = db.prepare(`SELECT * FROM refuellers WHERE id = ?`).get(input.destinationId) as any;
      if (!refueller) throw new ApiError(404, "Destination refueller not found");
      const newLevel = refueller.current_level + input.quantity;
      if (newLevel > refueller.capacity) {
        throw new ApiError(422, `Transfer would exceed refueller capacity (${newLevel} > ${refueller.capacity})`);
      }
      db.prepare(`UPDATE refuellers SET current_level = ?, updated_at = datetime('now') WHERE id = ?`).run(newLevel, input.destinationId);
    }

    db.prepare(`
      INSERT INTO fuel_transfers
        (id, reference, airport_id, destination_airport_id, source_type, source_id, destination_type, destination_id,
         fuel_product_id, quantity, source_meter_reading, destination_meter_reading, reason, status, operator_id,
         approved_by, approved_at, created_by)
      VALUES (@id, @reference, @airportId, @destinationAirportId, @sourceType, @sourceId, @destinationType, @destinationId,
         @fuelProductId, @quantity, @sourceMeterReading, @destinationMeterReading, @reason, 'completed', @operatorId,
         @operatorId, datetime('now'), @operatorId)
    `).run({
      id,
      reference,
      airportId: input.airportId,
      destinationAirportId: input.destinationAirportId ?? null,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      destinationType: input.destinationType,
      destinationId: input.destinationId,
      fuelProductId: input.fuelProductId,
      quantity: input.quantity,
      sourceMeterReading: input.sourceMeterReading ?? null,
      destinationMeterReading: input.destinationMeterReading ?? null,
      reason: input.reason ?? null,
      operatorId: input.operatorId,
    });

    writeAudit({ userId: input.operatorId, action: "FUEL_TRANSFER_COMPLETED", entity: "fuel_transfers", entityId: id, newValue: input });
  });

  runTxn();
  return { id, reference, status: "completed" };
}
