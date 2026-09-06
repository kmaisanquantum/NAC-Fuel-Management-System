import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport, Tank, Refueller, Alert } from "../types";
import StatusBadge from "../components/StatusBadge";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

// Signature element: a vertical instrument-style fuel gauge, echoing an aircraft fuel gauge dial.
function TankGauge({ tank }: { tank: Tank }) {
  const pct = tank.capacity > 0 ? Math.min(100, (tank.current_level / tank.capacity) * 100) : 0;
  const color = pct < 15 ? "#EF4B4B" : pct < 30 ? "#F5A623" : "#2DD4A7";
  return (
    <div className="panel p-4 flex gap-4">
      <div className="w-8 h-32 rounded-full bg-base-900 border border-base-600 relative overflow-hidden shrink-0">
        <div
          className="absolute bottom-0 left-0 right-0 transition-all"
          style={{ height: `${pct}%`, background: color }}
        />
        {[25, 50, 75].map((tick) => (
          <div key={tick} className="absolute left-0 right-0 border-t border-base-950/40" style={{ bottom: `${tick}%` }} />
        ))}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <div className="font-medium text-ink-100">{tank.tank_code}</div>
          <StatusBadge status={tank.status} />
        </div>
        <div className="font-data text-lg text-ink-100 mt-1">{fmt(tank.current_level)} L</div>
        <div className="text-xs text-ink-500">of {fmt(tank.capacity)} L capacity ({pct.toFixed(1)}%)</div>
        <div className="text-xs text-ink-500 mt-2 flex gap-4">
          {tank.temperature != null && <span>Temp: {tank.temperature.toFixed(1)}°C</span>}
          {tank.water_level != null && <span>Water: {tank.water_level.toFixed(2)}%</span>}
        </div>
      </div>
    </div>
  );
}

export default function AirportDashboard() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [refuellers, setRefuellers] = useState<Refueller[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<{ data: Airport[] }>("/airports").then((res) => {
      setAirports(res.data);
      if (res.data.length > 0) setSelected(res.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([
      api.get<{ data: any }>(`/reports/dashboard/airport/${selected}`),
      api.get<{ data: Tank[] }>(`/tanks?airportId=${selected}`),
      api.get<{ data: Refueller[] }>(`/refuellers?airportId=${selected}`),
      api.get<{ data: Alert[] }>(`/alerts?airportId=${selected}&status=open`),
    ])
      .then(([dash, t, r, al]) => {
        setSummary(dash.data);
        setTanks(t.data);
        setRefuellers(r.data);
        setAlerts(al.data);
      })
      .finally(() => setLoading(false));
  }, [selected]);

  const airport = airports.find((a) => a.id === selected);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Airport Dashboard</h1>
          <p className="text-sm text-ink-500">{airport ? `${airport.name} (${airport.code})` : "Select an airport"}</p>
        </div>
        <select className="input w-64" value={selected} onChange={(e) => setSelected(e.target.value)}>
          {airports.map((a) => (
            <option key={a.id} value={a.id}>{a.code} — {a.name}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-ink-500">Loading…</div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="panel p-4">
              <div className="text-xs uppercase tracking-wide text-ink-500 mb-1">Receipts Today</div>
              <div className="font-data text-xl text-ink-100">{fmt(summary.receiptsToday?.total || 0)} L</div>
              <div className="text-xs text-ink-500">{summary.receiptsToday?.cnt || 0} deliveries</div>
            </div>
            <div className="panel p-4">
              <div className="text-xs uppercase tracking-wide text-ink-500 mb-1">Uplift Today</div>
              <div className="font-data text-xl text-amber-400">{fmt(summary.upliftToday?.total || 0)} L</div>
              <div className="text-xs text-ink-500">{summary.upliftToday?.cnt || 0} aircraft</div>
            </div>
            <div className="panel p-4">
              <div className="text-xs uppercase tracking-wide text-ink-500 mb-1">Transfers Today</div>
              <div className="font-data text-xl text-ink-100">{summary.transfersToday?.cnt || 0}</div>
            </div>
            <div className="panel p-4">
              <div className="text-xs uppercase tracking-wide text-ink-500 mb-1">Pending Receipts</div>
              <div className="font-data text-xl text-ink-100">{summary.pendingReceipts?.cnt || 0}</div>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium text-ink-100 mb-3">Tank Levels</div>
            <div className="grid md:grid-cols-2 gap-4">
              {tanks.map((t) => <TankGauge key={t.id} tank={t} />)}
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4">
            <div className="panel p-5">
              <div className="text-sm font-medium text-ink-100 mb-3">Refuellers</div>
              <div className="space-y-2">
                {refuellers.map((r) => (
                  <div key={r.id} className="flex items-center justify-between text-sm py-2 border-b border-base-700 last:border-0">
                    <span className="text-ink-100">{r.asset_code}</span>
                    <span className="data-mono text-ink-300">{fmt(r.current_level)} / {fmt(r.capacity)} L</span>
                    <StatusBadge status={r.status} />
                  </div>
                ))}
                {refuellers.length === 0 && <div className="text-sm text-ink-500">No refuellers registered.</div>}
              </div>
            </div>

            <div className="panel p-5">
              <div className="text-sm font-medium text-ink-100 mb-3">Active Alerts</div>
              <div className="space-y-2">
                {alerts.map((a) => (
                  <div key={a.id} className="flex items-start justify-between text-sm py-2 border-b border-base-700 last:border-0 gap-3">
                    <span className="text-ink-300">{a.description}</span>
                    <StatusBadge status={a.severity} />
                  </div>
                ))}
                {alerts.length === 0 && <div className="text-sm text-ink-500">No active alerts.</div>}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
