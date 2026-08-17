# @nac-fms/shared

Placeholder for cross-cutting utilities shared between `apps/api` and
`apps/web` (e.g. reference-number formatting, currency formatting).

**Status: not yet extracted.** In the current MVP, the small amount of
formatting logic that could live here (e.g. `fmt()` number formatters) is
duplicated locally in each frontend page rather than shared, since the
duplication is trivial (one-line functions) and premature extraction would
add import indirection without real benefit yet. Extract into this package
once a second consumer needs the same logic with enough complexity to
justify sharing.
