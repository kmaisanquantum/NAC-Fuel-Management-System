import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Alert } from "../types";
import StatusBadge from "../components/StatusBadge";

export default function Alerts() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [resolution, setResolution] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() { api.get<{ data: Alert[] }>("/alerts").then((r) => setAlerts(r.data)); }
  useEffect(load, []);

  async function resolve(id: string) {
    if (!resolution) { setError("Resolution notes are required."); return; }
    try { await api.post(`/alerts/${id}/resolve`, { resolution }); setResolution(""); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Alerts</h1>
        <p className="text-sm text-ink-500">Critical and warning conditions across the network</p>
      </div>
      {error && <div className="panel p-3 text-sm text-signal-red border-signal-red/40">{error}</div>}
      <div className="space-y-2">
        {alerts.map((a) => (
          <div key={a.id} className="panel p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <StatusBadge status={a.severity} />
              <div>
                <div className="text-sm text-ink-100">{a.description}</div>
                <div className="text-xs text-ink-500">{a.category} · {new Date(a.created_at).toLocaleString()}</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={a.status} />
              {a.status !== "resolved" && (
                <>
                  <input className="input w-48 text-xs" placeholder="Resolution notes…" value={resolution} onChange={(e) => setResolution(e.target.value)} />
                  <button className="btn-secondary text-xs" onClick={() => resolve(a.id)}>Resolve</button>
                </>
              )}
            </div>
          </div>
        ))}
        {alerts.length === 0 && <div className="text-ink-500 text-center py-8">No alerts.</div>}
      </div>
    </div>
  );
}
