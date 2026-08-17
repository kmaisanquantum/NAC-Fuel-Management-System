# Offline-First Design

## Why

PNG airport connectivity varies significantly — POM and LAE are reliably
online; several regional airports (Gurney, Hoskins, Kavieng, Buka, Momote,
Vanimo) are modeled in this MVP as `offline_capable` (see
`airports.connectivity_profile`). Regional operators must be able to keep
recording fuel receipts and aircraft uplifts when the link to the central
platform is down.

## Target architecture

```mermaid
flowchart LR
    LOCAL[Local Application / Data Store<br/>at airport] --> QUEUE[Sync Queue]
    QUEUE --> VALID[Validation]
    VALID --> CENTRAL[Central NAC Platform]
    CENTRAL --> CONFIRM[Confirmation]
    CONFIRM --> SYNCED[Synced]
```

1. **Local store**: each airport's operational terminal (tablet/desktop)
   maintains a local copy of the data it needs (its own tanks, refuellers,
   in-flight transactions) and can create receipts/transfers/uplifts
   entirely offline.
2. **Unique offline IDs**: locally created records get a client-generated
   UUID at creation time (already true throughout this codebase — every
   `INSERT` uses `uuid()` client- or server-side, never an auto-increment
   integer), so IDs never collide when multiple airports sync concurrently.
3. **Sync queue**: the `sync_queue` table (present in both schemas) is the
   landing zone: `{ entity, local_id, payload, status }`. A background sync
   agent on the local terminal pushes queued records here when connectivity
   returns.
4. **Validation on reconnect**: the central platform re-validates each
   queued record against current server-side state (stock levels, asset
   status, RBAC) before applying it — a queued uplift that would now
   over-draw a tank is flagged, not silently applied.
5. **Conflict detection**: if two airports (or an airport and a central
   correction) modified overlapping state while offline, the sync engine
   marks the record `conflict` rather than silently overwriting — per the
   brief's explicit requirement ("never silently overwrite transactions").
   Conflict resolution requires a human decision, surfaced to an
   `airport_fuel_manager` or `national_fuel_manager`.
6. **Confirmation**: once applied, the central record's ID is linked back
   to the local record so the terminal can mark it `synced` and stop
   retrying.

## What's implemented in this MVP vs. what's designed

The `sync_queue` table exists in both schemas and the API/frontend already
generate client-safe UUIDs everywhere, which is the foundation this design
needs. The actual sync agent (a background process on a local terminal that
detects connectivity, batches queued writes, and reconciles conflicts) is
**not implemented** in this MVP — it's a meaningful standalone engineering
effort (essentially an offline-first client architecture, e.g. built on
IndexedDB + a service worker for a web terminal, or SQLite + a native sync
client for a tablet app) and is called out explicitly as TODO / FUTURE
INTEGRATION in the README rather than stubbed with fake functionality.

## Progressive rollout

Per the brief's PNG-specific requirement, airports should be able to move
Manual → Digital → IoT-enabled without a redesign. The schema already
supports this: a tank with no `iot_devices` row is just manually read
(`POST /tanks/:id/reading`); adding a device row and wiring up
`/iot/readings` posts for that same tank requires no schema change.
