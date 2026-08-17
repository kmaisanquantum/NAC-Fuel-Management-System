import { v4 as uuid } from "uuid";
import { db } from "../db";
import { ApiError } from "../middleware/errorHandler";
import { generateReference } from "../utils/reference";
import { postInventoryMovement } from "./inventoryService";
import { writeAudit } from "../utils/audit";

export interface CreateReceiptInput {
  airportId: string;
  airportCode: string;
  supplierId: string;
  tankId: string;
  fuelProductId: string;
  quantity: number;
  deliveryVehicle?: string;
  driverName?: string;
  deliveryDocument?: string;
  batchNumber?: string;
  meterReading?: number;
  qualityCertRef?: string;
  createdBy: string;
}

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["submitted"],
  submitted: ["verified", "draft"],
  verified: ["approved", "submitted"],
  approved: ["posted"],
  posted: [], // terminal — immutable per section 8 of the spec
};

export function createReceipt(input: CreateReceiptInput) {
  const id = uuid();
  const reference = generateReference(input.airportCode, "RCT");
  db.prepare(`
    INSERT INTO fuel_receipts
      (id, reference, airport_id, supplier_id, tank_id, fuel_product_id, quantity, delivery_vehicle, driver_name,
       delivery_document, batch_number, meter_reading, quality_cert_ref, status, receiving_officer_id, created_by, updated_by)
    VALUES (@id, @reference, @airportId, @supplierId, @tankId, @fuelProductId, @quantity, @deliveryVehicle, @driverName,
       @deliveryDocument, @batchNumber, @meterReading, @qualityCertRef, 'draft', @createdBy, @createdBy, @createdBy)
  `).run({
    id,
    reference,
    airportId: input.airportId,
    supplierId: input.supplierId,
    tankId: input.tankId,
    fuelProductId: input.fuelProductId,
    quantity: input.quantity,
    deliveryVehicle: input.deliveryVehicle ?? null,
    driverName: input.driverName ?? null,
    deliveryDocument: input.deliveryDocument ?? null,
    batchNumber: input.batchNumber ?? null,
    meterReading: input.meterReading ?? null,
    qualityCertRef: input.qualityCertRef ?? null,
    createdBy: input.createdBy,
  });

  writeAudit({ userId: input.createdBy, action: "FUEL_RECEIPT_CREATED", entity: "fuel_receipts", entityId: id, newValue: input });
  return { id, reference, status: "draft" };
}

export function transitionReceipt(receiptId: string, toStatus: string, userId: string, userRole: string) {
  const receipt = db.prepare(`SELECT * FROM fuel_receipts WHERE id = ?`).get(receiptId) as any;
  if (!receipt) throw new ApiError(404, "Receipt not found");

  const allowed = VALID_TRANSITIONS[receipt.status] || [];
  if (!allowed.includes(toStatus)) {
    throw new ApiError(422, `Invalid transition from '${receipt.status}' to '${toStatus}'`);
  }

  if (toStatus === "approved" && !["nac_admin", "airport_fuel_manager", "national_fuel_manager"].includes(userRole)) {
    throw new ApiError(403, "Only fuel managers or administrators may approve receipts");
  }

  const runTxn = db.transaction(() => {
    if (toStatus === "posted") {
      // Posting is the moment the receipt hits the immutable inventory ledger.
      postInventoryMovement({
        tankId: receipt.tank_id,
        txnType: "RECEIPT",
        quantity: receipt.quantity,
        referenceType: "fuel_receipt",
        referenceId: receipt.id,
        createdBy: userId,
      });
      db.prepare(`UPDATE fuel_receipts SET status = ?, posted_at = datetime('now'), updated_at = datetime('now'), updated_by = ? WHERE id = ?`)
        .run(toStatus, userId, receiptId);
    } else if (toStatus === "approved") {
      db.prepare(`UPDATE fuel_receipts SET status = ?, approved_by = ?, approved_at = datetime('now'), updated_at = datetime('now'), updated_by = ? WHERE id = ?`)
        .run(toStatus, userId, userId, receiptId);
    } else {
      db.prepare(`UPDATE fuel_receipts SET status = ?, updated_at = datetime('now'), updated_by = ? WHERE id = ?`)
        .run(toStatus, userId, receiptId);
    }

    writeAudit({
      userId,
      role: userRole,
      action: `FUEL_RECEIPT_${toStatus.toUpperCase()}`,
      entity: "fuel_receipts",
      entityId: receiptId,
      previousValue: { status: receipt.status },
      newValue: { status: toStatus },
    });
  });

  runTxn();
  return { id: receiptId, status: toStatus };
}
