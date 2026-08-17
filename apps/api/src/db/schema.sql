-- NAC Fuel Management System
-- Demo/dev schema (SQLite). Production schema is PostgreSQL: see /database/migrations/001_init.sql
-- Types are simplified for SQLite (TEXT for UUID/timestamps, REAL for numerics, INTEGER 0/1 for booleans).

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  description TEXT
);

CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL REFERENCES roles(id),
  permission_code TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_code)
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_id TEXT NOT NULL REFERENCES roles(id),
  airport_id TEXT REFERENCES airports(id),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS airports (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  iata_code TEXT,
  name TEXT NOT NULL,
  region TEXT,
  latitude REAL,
  longitude REAL,
  status TEXT NOT NULL DEFAULT 'active',
  connectivity_profile TEXT NOT NULL DEFAULT 'online',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS fuel_facilities (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  name TEXT NOT NULL,
  facility_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fuel_products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  fuel_type TEXT NOT NULL,
  unit_of_measure TEXT NOT NULL DEFAULT 'L',
  density REAL,
  minimum_stock REAL NOT NULL DEFAULT 0,
  maximum_stock REAL NOT NULL DEFAULT 0,
  safety_stock REAL NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS suppliers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  contract_ref TEXT,
  contract_start TEXT,
  contract_expiry TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  customer_type TEXT NOT NULL DEFAULT 'airline',
  billing_email TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS airlines (
  id TEXT PRIMARY KEY,
  customer_id TEXT REFERENCES customers(id),
  name TEXT NOT NULL,
  iata_code TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS aircraft (
  id TEXT PRIMARY KEY,
  airline_id TEXT REFERENCES airlines(id),
  registration TEXT UNIQUE NOT NULL,
  aircraft_type TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS tanks (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  fuel_facility_id TEXT NOT NULL REFERENCES fuel_facilities(id),
  fuel_product_id TEXT NOT NULL REFERENCES fuel_products(id),
  tank_code TEXT NOT NULL,
  capacity REAL NOT NULL,
  current_level REAL NOT NULL DEFAULT 0,
  temperature REAL,
  water_level REAL,
  status TEXT NOT NULL DEFAULT 'active',
  installation_date TEXT,
  last_inspection TEXT,
  next_inspection TEXT,
  calibration_date TEXT,
  next_calibration TEXT,
  maintenance_status TEXT NOT NULL DEFAULT 'ok',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS refuellers (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  asset_code TEXT UNIQUE NOT NULL,
  registration TEXT,
  capacity REAL NOT NULL,
  fuel_product_id TEXT REFERENCES fuel_products(id),
  current_level REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active',
  last_maintenance TEXT,
  next_maintenance TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS meters (
  id TEXT PRIMARY KEY,
  refueller_id TEXT REFERENCES refuellers(id),
  meter_code TEXT NOT NULL,
  last_calibration TEXT,
  next_calibration TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);

-- Immutable fuel receipt records (workflow: draft -> submitted -> verified -> approved -> posted)
CREATE TABLE IF NOT EXISTS fuel_receipts (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  supplier_id TEXT NOT NULL REFERENCES suppliers(id),
  tank_id TEXT NOT NULL REFERENCES tanks(id),
  fuel_product_id TEXT NOT NULL REFERENCES fuel_products(id),
  quantity REAL NOT NULL,
  delivery_vehicle TEXT,
  driver_name TEXT,
  delivery_document TEXT,
  batch_number TEXT,
  meter_reading REAL,
  quality_cert_ref TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  receiving_officer_id TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  posted_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT,
  updated_by TEXT
);

CREATE TABLE IF NOT EXISTS fuel_transfers (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  destination_airport_id TEXT REFERENCES airports(id),
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  destination_type TEXT NOT NULL,
  destination_id TEXT NOT NULL,
  fuel_product_id TEXT NOT NULL REFERENCES fuel_products(id),
  quantity REAL NOT NULL,
  source_meter_reading REAL,
  destination_meter_reading REAL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval',
  operator_id TEXT REFERENCES users(id),
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS fuel_uplifts (
  id TEXT PRIMARY KEY,
  reference TEXT UNIQUE NOT NULL,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  airline_id TEXT NOT NULL REFERENCES airlines(id),
  aircraft_id TEXT NOT NULL REFERENCES aircraft(id),
  flight_number TEXT,
  fuel_product_id TEXT NOT NULL REFERENCES fuel_products(id),
  refueller_id TEXT NOT NULL REFERENCES refuellers(id),
  tank_id TEXT NOT NULL REFERENCES tanks(id),
  quantity REAL NOT NULL,
  start_meter_reading REAL,
  end_meter_reading REAL,
  price_per_litre REAL NOT NULL,
  total_amount REAL NOT NULL,
  operator_id TEXT REFERENCES users(id),
  customer_authorisation TEXT,
  invoice_status TEXT NOT NULL DEFAULT 'not_invoiced',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

-- Immutable inventory ledger: every movement is a row, current stock is derived/cached in inventory_balances
CREATE TABLE IF NOT EXISTS inventory_transactions (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  tank_id TEXT NOT NULL REFERENCES tanks(id),
  fuel_product_id TEXT NOT NULL REFERENCES fuel_products(id),
  txn_type TEXT NOT NULL, -- RECEIPT, TRANSFER_IN, TRANSFER_OUT, AIRCRAFT_UPLIFT, RETURN, ADJUSTMENT, LOSS, CORRECTION
  quantity REAL NOT NULL, -- positive for inbound, negative for outbound
  reference_type TEXT NOT NULL, -- fuel_receipt | fuel_transfer | fuel_uplift | manual_adjustment
  reference_id TEXT,
  balance_after REAL NOT NULL,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_by TEXT
);

CREATE TABLE IF NOT EXISTS inventory_balances (
  tank_id TEXT PRIMARY KEY REFERENCES tanks(id),
  airport_id TEXT NOT NULL REFERENCES airports(id),
  fuel_product_id TEXT NOT NULL REFERENCES fuel_products(id),
  current_level REAL NOT NULL DEFAULT 0,
  last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reconciliations (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  tank_id TEXT NOT NULL REFERENCES tanks(id),
  recon_date TEXT NOT NULL,
  opening_stock REAL NOT NULL,
  receipts REAL NOT NULL DEFAULT 0,
  transfers_in REAL NOT NULL DEFAULT 0,
  transfers_out REAL NOT NULL DEFAULT 0,
  aircraft_uplift REAL NOT NULL DEFAULT 0,
  adjustments REAL NOT NULL DEFAULT 0,
  expected_closing REAL NOT NULL,
  actual_closing REAL,
  variance REAL,
  variance_pct REAL,
  status TEXT NOT NULL DEFAULT 'pending',
  explanation TEXT,
  approved_by TEXT REFERENCES users(id),
  approved_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS fuel_quality_tests (
  id TEXT PRIMARY KEY,
  sample_ref TEXT UNIQUE NOT NULL,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  tank_id TEXT REFERENCES tanks(id),
  fuel_product_id TEXT NOT NULL REFERENCES fuel_products(id),
  sample_date TEXT NOT NULL,
  sample_type TEXT,
  test_type TEXT,
  result TEXT,
  pass_fail TEXT NOT NULL DEFAULT 'pending',
  technician TEXT,
  certificate_ref TEXT,
  comments TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS maintenance_records (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  asset_type TEXT NOT NULL, -- tank | refueller | meter | other
  asset_id TEXT NOT NULL,
  maintenance_type TEXT,
  scheduled_date TEXT,
  completed_date TEXT,
  technician TEXT,
  work_performed TEXT,
  parts TEXT,
  cost REAL,
  next_maintenance TEXT,
  status TEXT NOT NULL DEFAULT 'scheduled',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  asset_type TEXT NOT NULL,
  asset_id TEXT NOT NULL,
  inspection_date TEXT NOT NULL,
  inspector TEXT,
  result TEXT,
  notes TEXT,
  next_inspection TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS invoices (
  id TEXT PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  customer_id TEXT NOT NULL REFERENCES customers(id),
  uplift_id TEXT REFERENCES fuel_uplifts(id),
  amount REAL NOT NULL,
  taxes_fees REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL,
  currency TEXT NOT NULL DEFAULT 'PGK',
  invoice_date TEXT NOT NULL,
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  invoice_id TEXT NOT NULL REFERENCES invoices(id),
  amount REAL NOT NULL,
  paid_at TEXT NOT NULL DEFAULT (datetime('now')),
  method TEXT,
  reference TEXT
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  severity TEXT NOT NULL, -- critical | warning
  airport_id TEXT REFERENCES airports(id),
  asset_type TEXT,
  asset_id TEXT,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  assigned_to TEXT REFERENCES users(id),
  resolution TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  role TEXT,
  action TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT,
  previous_value TEXT,
  new_value TEXT,
  ip_address TEXT,
  device TEXT,
  reason TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS iot_devices (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  asset_type TEXT NOT NULL, -- tank | refueller
  asset_id TEXT NOT NULL,
  device_type TEXT NOT NULL, -- level_sensor | flow_meter | temperature | water_detection | gps
  status TEXT NOT NULL DEFAULT 'active',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS iot_readings (
  id TEXT PRIMARY KEY,
  device_id TEXT NOT NULL REFERENCES iot_devices(id),
  reading_type TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  airport_id TEXT NOT NULL REFERENCES airports(id),
  entity TEXT NOT NULL,
  local_id TEXT NOT NULL,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | validated | synced | conflict
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  synced_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_inv_txn_tank ON inventory_transactions(tank_id);
CREATE INDEX IF NOT EXISTS idx_uplift_airport ON fuel_uplifts(airport_id);
CREATE INDEX IF NOT EXISTS idx_receipt_airport ON fuel_receipts(airport_id);
CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity, entity_id);
