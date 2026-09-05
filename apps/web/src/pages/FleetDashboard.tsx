import { useEffect, useState } from "react";
import { api } from "../api/client";
import { FleetSummary } from "../types";

export default function FleetDashboard() {
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<FleetSummary>("/fleet-dashboard/summary")
      .then((res) => setSummary(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4 text-ink-400">Loading Fleet Dashboard…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-ink-100">Fleet Management Dashboard</h1>
        <p className="text-sm text-ink-400">Vehicle fleet operational summary, utilization, fuel costs, and maintenance KPIs</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-5 space-y-1">
          <div className="text-xs font-medium text-ink-400 uppercase tracking-wider">Total Fleet Size</div>
          <div className="text-3xl font-display font-bold text-ink-100">{summary?.vehicles.total || 0}</div>
          <div className="text-xs text-ink-400">
            <span className="text-signal-green font-medium">{summary?.vehicles.active || 0} Active</span> · {summary?.vehicles.underRepair || 0} Under Repair
          </div>
        </div>

        <div className="panel p-5 space-y-1">
          <div className="text-xs font-medium text-ink-400 uppercase tracking-wider">Total Distance (km)</div>
          <div className="text-3xl font-display font-bold text-amber-400">{(summary?.metrics.totalKm || 0).toLocaleString()} km</div>
          <div className="text-xs text-ink-400">Recorded across all trip logs</div>
        </div>

        <div className="panel p-5 space-y-1">
          <div className="text-xs font-medium text-ink-400 uppercase tracking-wider">Fuel Expense (PGK)</div>
          <div className="text-3xl font-display font-bold text-ink-100">K{(summary?.metrics.totalFuelCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-ink-400">{(summary?.metrics.totalFuelLitres || 0).toLocaleString()} Litres consumed</div>
        </div>

        <div className="panel p-5 space-y-1">
          <div className="text-xs font-medium text-ink-400 uppercase tracking-wider">Maintenance & Repair Cost</div>
          <div className="text-3xl font-display font-bold text-ink-100">K{(summary?.metrics.totalMaintenanceCost || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
          <div className="text-xs text-ink-400">{summary?.metrics.openBreakdowns || 0} open breakdowns</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="panel p-5 space-y-4">
          <h2 className="text-base font-display font-semibold text-ink-100">Vehicle Status Breakdown</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-300">Active / Operational</span>
              <span className="font-semibold text-signal-green">{summary?.vehicles.active || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-300">Under Repair / Service</span>
              <span className="font-semibold text-amber-400">{summary?.vehicles.underRepair || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-300">Inactive / Standby</span>
              <span className="font-semibold text-ink-400">{summary?.vehicles.inactive || 0}</span>
            </div>
          </div>
        </div>

        <div className="panel p-5 space-y-4">
          <h2 className="text-base font-display font-semibold text-ink-100">Authorised Personnel</h2>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-ink-300">Active Authorised Drivers</span>
              <span className="font-semibold text-ink-100">{summary?.drivers.authorised || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-300">Open Breakdown Reports</span>
              <span className="font-semibold text-signal-red">{summary?.metrics.openBreakdowns || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
