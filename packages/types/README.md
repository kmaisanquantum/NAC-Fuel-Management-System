# @nac-fms/types

Placeholder for a shared TypeScript type package between `apps/api` and
`apps/web`.

**Status: not yet extracted.** `apps/web/src/types/index.ts` currently
hand-declares the frontend's view of API response shapes. The more robust
long-term approach — generating these types from the PostgreSQL schema or
from zod schemas already defined in `apps/api/src/routes/*.ts` — is called
out here as the intended direction rather than done, to avoid a build-time
dependency between the two apps for this MVP.
