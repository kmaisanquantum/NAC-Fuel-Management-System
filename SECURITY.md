# Security

## Implemented in this MVP

- **Password hashing**: bcrypt (`bcryptjs`, 10 rounds) — never stored in plaintext.
- **JWT auth**: short-lived access tokens (15 min) + longer-lived refresh
  tokens (7 days), signed with `JWT_SECRET` (see `.env.example` — must be
  overridden in any real deployment, never left as the dev default).
- **RBAC**: enforced server-side on every mutating route via `requireRole()`
  middleware; airport-scoping via `scopeToAirport()` for non-national roles
  (see `middleware/rbac.ts`).
- **Input validation**: every request body validated with `zod` schemas
  before touching the database — rejects malformed/unexpected fields.
- **SQL injection protection**: all queries use parameterized prepared
  statements (`better-sqlite3` `.prepare()` / named params); no string
  concatenation into SQL anywhere in the codebase.
- **Security headers**: `helmet` applied globally.
- **CORS**: restricted via `CORS_ORIGIN` env var (comma-separated allowlist);
  defaults to `*` only in local dev.
- **Rate limiting**: `express-rate-limit` on all `/api` routes.
- **Audit logging**: every sensitive mutation (login, create/update on
  master data, workflow transitions, adjustments, role changes) writes an
  immutable `audit_logs` row with actor, action, entity, before/after
  values, and — where available — IP address.
- **No hardcoded credentials**: all secrets sourced from environment
  variables (`.env.example` documents required variables; real values are
  never committed).
- **Soft deletion / immutability**: fuel and financial records are never
  hard-deleted. Receipts become immutable once `posted`; inventory and
  audit tables are append-only by design (see DATABASE.md).

## Architecturally ready, not fully built in the MVP

- **MFA**: `users.mfa_enabled` column exists; TOTP enrollment/verification
  flow is not implemented. Architecture is MFA-ready, not MFA-complete.
- **HTTPS**: the app is HTTPS-ready (no hardcoded `http://` assumptions) but
  TLS termination is a deployment concern — see DEPLOYMENT.md (typically a
  reverse proxy or load balancer in front of the Node process).
- **CSRF**: the API is a pure JSON REST API consumed by a separate SPA using
  bearer tokens (not cookies), which is inherently not vulnerable to
  classic CSRF. If a cookie-based session is introduced later, CSRF tokens
  would need to be added at that point.
- **Secret management**: `.env` is used for local/dev; production
  deployment should source secrets from a managed secret store (e.g. AWS
  Secrets Manager, Vault, or the hosting platform's equivalent) rather than
  `.env` files on disk.

## Known gaps / explicit TODOs

- No automated dependency vulnerability scanning wired into CI yet (a
  `npm audit` or equivalent step is recommended — see the sample GitHub
  Actions workflow in DEPLOYMENT.md).
- No WAF / DDoS protection at the infrastructure layer — expected to be
  provided by the hosting environment.
- No penetration testing has been performed. This is a prototype and
  should undergo a formal security review before handling real operational
  or financial data.
- Refresh tokens are not currently revocable server-side (no token
  blacklist/rotation store). For production, consider a refresh-token
  table with revocation support.

## Data sovereignty note (PNG-specific)

Per the brief's PNG-specific requirements (spec section 40), production
deployment should consider hosting fuel and financial data within
jurisdictions acceptable to NAC and PNG regulatory requirements. This MVP
does not make an infrastructure hosting decision — that is a deployment-time
choice for NAC, documented as an open question in DEPLOYMENT.md.
