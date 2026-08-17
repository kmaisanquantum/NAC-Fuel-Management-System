# Business Rules

Configurable operational values (spec section 34). Currently sourced from
environment variables and per-record fields (never hardcoded into business
logic); a future System Settings UI backed by a `business_rules` table is
the intended next step (tracked as TODO in README).

| Rule | Where it lives today | Default |
|---|---|---|
| Minimum / maximum / safety stock | `fuel_products` table, per product | Set per product (e.g. Jet A-1: min 50,000 L) |
| Tank capacity | `tanks.capacity`, per tank | Set per tank |
| Refueller capacity | `refuellers.capacity`, per asset | Set per asset |
| Max allowed reconciliation variance | `MAX_ALLOWED_VARIANCE_PCT` env var | 0.5% |
| Approval thresholds (who can approve what) | `requireRole()` calls in route definitions | See USER_ROLES.md |
| Fuel price | Entered per-uplift (`pricePerLitre`) — not a global constant, since pricing varies by contract/date | N/A |
| Invoice payment terms | Hardcoded in `upliftService`/`billing` route as `+30 days` | 30 days |
| Calibration / inspection periods | `tanks.next_calibration`, `next_inspection` — set per tank, not derived from a global rule | N/A |

## Negative inventory

Disallowed by default (`postInventoryMovement` throws `422` if a movement
would push a tank below zero). The `allowNegative` flag exists in the
service function signature as the "controlled exception" the spec asks
for, but no route currently exposes a way to set it — by design, this
requires a deliberate follow-up decision by NAC on who may authorize it
and under what documented circumstances, rather than exposing it as a
casual UI toggle.

## Capacity enforcement

Both tanks and refuellers reject movements that would exceed their
`capacity` field (`422` error), inside the same transaction as the
movement itself — never a warning after the fact.

## Reconciliation variance threshold

`Math.abs(variancePct) > MAX_ALLOWED_VARIANCE_PCT` triggers
`investigation_required` status and a critical alert. This mirrors the
brief's worked example precisely (a −1.3% variance against a conceptual
±0.5% default threshold is flagged).
