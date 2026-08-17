import { Request, Response, NextFunction } from "express";

/**
 * Role-Based Access Control.
 * Roles per USER_ROLES.md: nac_admin, national_fuel_manager, airport_fuel_manager,
 * fuel_operator, airport_manager, finance_officer, procurement_officer,
 * engineering_maintenance, safety_regulatory_officer, auditor, executive.
 */
export function requireRole(...allowedRoles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (!allowedRoles.includes(req.user.roleName)) {
      return res.status(403).json({ error: "Forbidden: insufficient role", required: allowedRoles });
    }
    next();
  };
}

/**
 * Restricts non-national roles to their assigned airport.
 * National-level roles (nac_admin, national_fuel_manager, executive, auditor,
 * finance_officer, procurement_officer) may access all airports.
 */
const NATIONAL_ROLES = new Set([
  "nac_admin",
  "national_fuel_manager",
  "executive",
  "auditor",
  "finance_officer",
  "procurement_officer",
]);

export function scopeToAirport(getAirportId: (req: Request) => string | undefined) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Not authenticated" });
    if (NATIONAL_ROLES.has(req.user.roleName)) return next();

    const requestedAirportId = getAirportId(req);
    if (requestedAirportId && requestedAirportId !== req.user.airportId) {
      return res.status(403).json({ error: "Forbidden: outside assigned airport" });
    }
    next();
  };
}
