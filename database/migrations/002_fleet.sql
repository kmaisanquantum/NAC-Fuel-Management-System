-- Fleet Management Module Schema Addition

CREATE TABLE IF NOT EXISTS vehicles (
  id TEXT PRIMARY KEY,
  vehicle_number TEXT UNIQUE NOT NULL,
  registration_number TEXT NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER,
  vehicle_type TEXT NOT NULL,
  chassis_vin TEXT,
  engine_number TEXT,
  colour TEXT,
  fuel_type TEXT NOT NULL,
  department TEXT,
  location TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'inactive', 'under_repair', 'disposed')),
  acquisition_date TEXT,
  acquisition_cost REAL,
  current_value REAL,
  ownership TEXT NOT NULL DEFAULT 'owned' CHECK(ownership IN ('owned', 'leased', 'hired', 'other')),
  insurance_policy TEXT,
  insurance_expiry TEXT,
  registration_expiry TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS drivers (
  id TEXT PRIMARY KEY,
  employee_number TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  department TEXT,
  licence_number TEXT NOT NULL,
  licence_class TEXT,
  licence_expiry TEXT NOT NULL,
  authorisation_status TEXT NOT NULL DEFAULT 'authorised' CHECK(authorisation_status IN ('authorised', 'suspended', 'revoked', 'pending')),
  accident_history TEXT,
  training TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_allocations (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  department TEXT,
  custodian TEXT,
  driver_id TEXT REFERENCES drivers(id),
  allocation_date TEXT NOT NULL,
  return_date TEXT,
  approval_status TEXT NOT NULL DEFAULT 'approved' CHECK(approval_status IN ('pending', 'approved', 'rejected', 'returned')),
  authorisation_status TEXT NOT NULL DEFAULT 'active' CHECK(authorisation_status IN ('active', 'expired', 'revoked')),
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_fuel_logs (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  driver_id TEXT REFERENCES drivers(id),
  date TEXT NOT NULL,
  time TEXT,
  station TEXT,
  fuel_type TEXT NOT NULL,
  litres REAL NOT NULL,
  cost_per_litre REAL NOT NULL,
  total_cost REAL NOT NULL,
  odometer_reading REAL NOT NULL,
  payment_method TEXT,
  receipt_ref TEXT,
  l_per_100km REAL,
  km_per_l REAL,
  cost_per_km REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_trips (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  driver_id TEXT REFERENCES drivers(id),
  date TEXT NOT NULL,
  time_out TEXT,
  time_in TEXT,
  start_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  purpose TEXT,
  begin_odometer REAL NOT NULL,
  end_odometer REAL NOT NULL,
  total_km REAL NOT NULL,
  odometer_anomaly INTEGER NOT NULL DEFAULT 0,
  authorising_officer TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  inspector_id TEXT REFERENCES users(id),
  inspector_name TEXT NOT NULL,
  inspection_date TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('pass', 'fail', 'requires_attention')),
  checklist TEXT NOT NULL,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_maintenance (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  maintenance_type TEXT NOT NULL CHECK(maintenance_type IN ('scheduled_service', 'unscheduled_repair', 'inspection_fix', 'other')),
  description TEXT NOT NULL,
  scheduled_date TEXT,
  completed_date TEXT,
  technician TEXT,
  work_performed TEXT,
  parts TEXT,
  cost REAL,
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK(status IN ('scheduled', 'in_progress', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_breakdowns (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  driver_id TEXT REFERENCES drivers(id),
  breakdown_date TEXT NOT NULL,
  location TEXT NOT NULL,
  description TEXT NOT NULL,
  towing_required INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'reported' CHECK(status IN ('reported', 'in_repair', 'resolved')),
  resolution_notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_accidents (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  driver_id TEXT REFERENCES drivers(id),
  accident_date TEXT NOT NULL,
  location TEXT,
  description TEXT,
  damage_severity TEXT,
  photo_urls TEXT,
  status TEXT NOT NULL DEFAULT 'reported',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vehicle_disposals (
  id TEXT PRIMARY KEY,
  vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
  disposal_date TEXT NOT NULL,
  disposal_method TEXT,
  disposal_amount REAL,
  reason TEXT,
  approved_by TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_fuel_logs_vehicle ON vehicle_fuel_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON vehicle_trips(vehicle_id);
