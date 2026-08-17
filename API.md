# API Reference

Base URL: `/api/v1`. All endpoints except `/auth/login` and `/auth/refresh`
require `Authorization: Bearer <accessToken>`. Errors return
`{ "error": string, "details"?: [...] }` with an appropriate HTTP status.

Full OpenAPI generation is a TODO (see README MVP status); this document is
the interim reference, grouped exactly as specified in the build brief
(section 23).

## Auth — `/api/v1/auth`

| Method | Path | Notes |
|---|---|---|
| POST | `/login` | `{ email, password }` → `{ accessToken, refreshToken, user }` |
| POST | `/refresh` | `{ refreshToken }` → `{ accessToken }` |
| GET | `/me` | Current authenticated user |

Access tokens expire in 15 minutes; refresh tokens in 7 days.

## Airports — `/api/v1/airports`

| Method | Path | Role required |
|---|---|---|
| GET | `/` | any authenticated |
| GET | `/:id` | any authenticated |
| POST | `/` | nac_admin, national_fuel_manager |
| PATCH | `/:id` | nac_admin, national_fuel_manager |

## Fuel products — `/api/v1/fuel-products`
GET (all), POST (nac_admin, national_fuel_manager).

## Tanks — `/api/v1/tanks`
GET `?airportId=`, GET `/:id`, GET `/:id/ledger`, POST, POST `/:id/reading`.

## Suppliers — `/api/v1/suppliers`
GET, GET `/:id`, GET `/:id/performance`, POST (nac_admin, procurement_officer).

## Refuellers — `/api/v1/refuellers`
GET `?airportId=`, POST, PATCH `/:id/status`.

## Airlines / Aircraft / Customers
`/api/v1/airlines`, `/api/v1/aircraft` (supports `?registration=` search),
`/api/v1/customers` — standard GET/POST.

## Receipts — `/api/v1/receipts`

| Method | Path | Notes |
|---|---|---|
| GET | `/?airportId=&status=` | list |
| GET | `/:id` | detail |
| POST | `/` | creates in `draft` status |
| POST | `/:id/transition` | `{ status }`; enforces the workflow state machine draft→submitted→verified→approved→posted |

Posting is the only transition that writes to the inventory ledger.
Posted receipts cannot be transitioned further (immutable per spec section 8).

## Transfers — `/api/v1/transfers`
GET `?airportId=`, POST — completes immediately (tank↔tank, tank↔refueller).

## Uplifts — `/api/v1/uplifts`
GET `?airportId=`, GET `/:id`, POST — the core atomic transaction
(validates stock → deducts inventory → generates invoice → audits, see
ARCHITECTURE.md).

## Inventory — `/api/v1/inventory`

| Method | Path | Notes |
|---|---|---|
| GET | `/balances?airportId=` | cached current levels |
| GET | `/balances/:tankId` | single tank balance |
| GET | `/transactions?tankId=&airportId=&limit=` | ledger rows |
| POST | `/adjustments` | `{ tankId, quantity, reason }` — reason required, always audited |

## Reconciliation — `/api/v1/reconciliation`

| Method | Path | Notes |
|---|---|---|
| GET | `/?airportId=&tankId=&status=` | history |
| POST | `/run` | `{ tankId, reconDate, actualClosing }` — computes variance, raises alert if beyond threshold |
| POST | `/:id/approve` | `{ explanation }` — required to close out a flagged variance |

## Billing — `/api/v1/billing`
`/invoices` (GET, `?airportId=&status=`), `/invoices/:id` (GET, with
payments), `/invoices/:id/issue` (POST), `/invoices/:id/payments` (POST).

## Quality — `/api/v1/quality`
GET `?airportId=`, POST — a `fail` result auto-raises a critical alert.

## Maintenance — `/api/v1/maintenance`
GET `?airportId=&status=`, POST, POST `/:id/complete`.

## Alerts — `/api/v1/alerts`
GET `?airportId=&status=&severity=`, POST `/:id/resolve`, POST `/:id/assign`.

## Reports / dashboards — `/api/v1/reports`

| Method | Path | Notes |
|---|---|---|
| GET | `/dashboard/national` | national KPIs, low-stock list, charts data |
| GET | `/dashboard/airport/:airportId` | airport-level operational view |
| GET | `/consumption?airportId=&from=&to=` | daily uplift totals |
| GET | `/revenue?airportId=` | monthly invoiced revenue |

## IoT — `/api/v1/iot`
`/devices` (GET `?airportId=`, POST), `/devices/:id/readings` (GET),
`/readings` (POST — simulated ingest; see IOT_INTEGRATION.md).

## Audit logs — `/api/v1/audit-logs`
GET `?entity=&entityId=&userId=&limit=` — restricted to nac_admin, auditor,
national_fuel_manager, executive.

## Users — `/api/v1/users`
Restricted to nac_admin. GET `/`, GET `/roles`, POST `/`, PATCH `/:id/role`,
PATCH `/:id/status`.

## Cross-cutting behaviour

- **Validation**: all POST/PATCH bodies validated with `zod`; failures
  return `400` with a `details` array.
- **Rate limiting**: `express-rate-limit`, 1000 req / 15 min per IP on all
  `/api` routes.
- **Pagination/filtering**: implemented per-resource via query params
  (`?limit=`, `?airportId=`, `?status=`, etc.) rather than a single generic
  scheme, matching each resource's actual access patterns.
- **Logging**: `morgan` (dev format locally, combined format in production).
- **Security headers**: `helmet` on every response.
