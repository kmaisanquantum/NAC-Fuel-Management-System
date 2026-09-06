import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport, Tank } from "../types";
import StatusBadge from "../components/StatusBadge";

function fmt(n: number) { return new Intl.NumberFormat("en-US").format(n); }

export default function Tanks() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [airportId, setAirportId] = useState("");

  useEffect(() => { api.get<{ data: Airport[] }>("/airports").then((r) => setAirports(r.data)); }, []);
  useEffect(() => {
    const url = airportId ? `/tanks?airportId=${airportId}` : "/tanks";
    api.get<{ data: Tank[] }>(url).then((r) => setTanks(r.data));
  }, [airportId]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Storage Tanks</h1>
          <p className="text-sm text-ink-500">Capacity, level, inspection and calibration status across the network</p>
        </div>
        <select className="input w-56" value={airportId} onChange={(e) => setAirportId(e.target.value)}>
          <option value="">All airports</option>
          {airports.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
        </select>
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Tank</th>
              <th className="px-4 py-3">Level / Capacity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Next Inspection</th>
              <th className="px-4 py-3">Next Calibration</th>
              <th className="px-4 py-3">Maintenance</th>
            </tr>
          </thead>
          <tbody>
            {tanks.map((t) => (
              <tr key={t.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 text-ink-100 font-medium">{t.tank_code}</td>
                <td className="px-4 py-3 data-mono text-ink-300">{fmt(t.current_level)} / {fmt(t.capacity)} L</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-ink-500">{t.next_inspection || "—"}</td>
                <td className="px-4 py-3 text-ink-500">{t.next_calibration || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={t.maintenance_status} /></td>
              </tr>
            ))}
            {tanks.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">No tanks found.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
