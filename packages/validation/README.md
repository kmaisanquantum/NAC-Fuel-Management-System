# @nac-fms/validation

Placeholder for shared zod validation schemas.

**Status: not yet extracted.** `apps/api` defines zod schemas per-route
today (e.g. in `routes/receipts.ts`, `routes/uplifts.ts`). Extracting them
here would let `apps/web` import the same schemas for client-side form
validation before submit — a worthwhile follow-up, not yet done for the
MVP.
