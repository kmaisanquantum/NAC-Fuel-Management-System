export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
  airportId: string | null;
}

export interface Airport {
  id: string;
  code: string;
  iata_code: string | null;
  name: string;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  status: "active" | "inactive";
  connectivity_profile: "online" | "intermittent" | "offline_capable";
}

export interface Tank {
  id: string;
  airport_id: string;
  fuel_facility_id: string;
  fuel_product_id: string;
  tank_code: string;
  capacity: number;
  current_level: number;
  temperature: number | null;
  water_level: number | null;
  status: string;
  maintenance_status: string;
  next_inspection: string | null;
  next_calibration: string | null;
}

export interface Refueller {
  id: string;
  airport_id: string;
  asset_code: string;
  registration: string | null;
  capacity: number;
  current_level: number;
  status: "active" | "maintenance" | "offline" | "decommissioned";
}

export interface FuelReceipt {
  id: string;
  reference: string;
  airport_id: string;
  supplier_id: string;
  tank_id: string;
  quantity: number;
  status: "draft" | "submitted" | "verified" | "approved" | "posted";
  created_at: string;
}

export interface FuelUplift {
  id: string;
  reference: string;
  airport_id: string;
  airline_id: string;
  aircraft_id: string;
  flight_number: string | null;
  quantity: number;
  price_per_litre: number;
  total_amount: number;
  invoice_status: string;
  created_at: string;
}

export interface Reconciliation {
  id: string;
  airport_id: string;
  tank_id: string;
  recon_date: string;
  opening_stock: number;
  expected_closing: number;
  actual_closing: number | null;
  variance: number | null;
  variance_pct: number | null;
  status: string;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  airport_id: string;
  customer_id: string;
  amount: number;
  total_amount: number;
  currency: string;
  invoice_date: string;
  due_date: string | null;
  status: string;
}

export interface Alert {
  id: string;
  severity: "critical" | "warning";
  airport_id: string | null;
  category: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  created_at: string;
}
