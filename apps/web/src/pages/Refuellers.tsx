import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport, Refueller } from "../types";
import StatusBadge from "../components/StatusBadge";

function fmt(n: number) { return new Intl.NumberFormat("en-US").format(n); }

export default function Refuellers() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [refuellers, setRefuellers] = useState<Refueller[]>([]);
  const [airportId, setAirportId] = useState("");

  useEffect(() => { api.get<{ data: Airport[] }>("/airports").then((r) => setAirports(r.data)); }, []);
  useEffect(() => {
    const url = airportId ? `/refuellers?airportId=${airportId}` : "/refuellers";
    api.get<{ data: Refueller[] }>(url).then((r) => setRefuellers(r.data));
  }, [airportId]);

  async function setStatus(id: string, status: string) {
    await api.patch(`/refuellers/${id}/status`, { status });
    const url = airportId ? `/refuellers?airportId=${airportId}` : "/refuellers";
    api.get<{ data: Refueller[] }>(url).then((r) => setRefuellers(r.data));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Refuellers / Bowsers</h1>
          <p className="text-sm text-ink-500">Fuel dispensing fleet across the network</p>
        </div>
        <select className="input w-56" value={airportId} onChange={(e) => setAirportId(e.target.value)}>
          <option value="">All airports</option>
          {airports.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
        </select>
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {refuellers.map((r) => (
          <div key={r.id} className="panel p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="text-ink-100 font-medium">{r.asset_code}</div>
              <StatusBadge status={r.status} />
            </div>
            <div className="data-mono text-lg text-ink-100">{fmt(r.current_level)} / {fmt(r.capacity)} L</div>
            <div className="text-xs text-ink-500 mb-3">{r.registration || "No registration on file"}</div>
            <div className="flex gap-2">
              {["active", "maintenance", "offline"].filter((s) => s !== r.status).map((s) => (
                <button key={s} className="btn-ghost text-xs border border-base-600" onClick={() => setStatus(r.id, s)}>{s}</button>
              ))}
            </div>
          </div>
        ))}
        {refuellers.length === 0 && <div className="text-ink-500 col-span-3 text-center py-8">No refuellers found.</div>}
      </div>
    </div>
  );
}
