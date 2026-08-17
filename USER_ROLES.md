# User Roles & Permissions

11 roles, matching the build brief exactly (section 2). Enforced via
`requireRole()` on each route (see API.md for the per-endpoint role
requirements) and airport-scoping via `scopeToAirport()`.

| Role | Scope | Typical permissions |
|---|---|---|
| `nac_admin` | National | Full system administration; user management; all master data |
| `national_fuel_manager` | National | National visibility, airport creation, receipt approval |
| `airport_fuel_manager` | Assigned airport | Manage fuel operations for their airport; approve receipts/transfers |
| `fuel_operator` | Assigned airport | Record receipts, transfers, aircraft uplift |
| `airport_manager` | Assigned airport | View airport-level operational information |
| `finance_officer` | National | Billing, invoices, revenue, reconciliation sign-off |
| `procurement_officer` | National | Supplier and procurement data |
| `engineering_maintenance` | Assigned airport | Tank/bowser/meter/equipment management |
| `safety_regulatory_officer` | Assigned airport | Fuel quality, inspections, incidents, compliance |
| `auditor` | National, read-only | Transactions and audit trail |
| `executive` | National, read-only | National dashboards and reports |

## Airport scoping

Roles tied to a single airport (`airport_fuel_manager`, `fuel_operator`,
`airport_manager`, `engineering_maintenance`, `safety_regulatory_officer`)
carry an `airport_id` on their user record and are blocked from acting on
other airports' data by `scopeToAirport()`. National-level roles
(`nac_admin`, `national_fuel_manager`, `executive`, `auditor`,
`finance_officer`, `procurement_officer`) are not airport-scoped.

## Adding a new role

Roles are data, not code — see `roles` table. To add one: insert a row,
then reference the new role name in `requireRole(...)` calls on whichever
routes it should access. No schema migration needed for the role itself.
