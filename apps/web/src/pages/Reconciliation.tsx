import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport, Tank, Reconciliation } from "../types";
import StatusBadge from "../components/StatusBadge";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n);
}

export default function ReconciliationPage() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [records, setRecords] = useState<Reconciliation[]>([]);
  const [airportId, setAirportId] = useState("");
  const [tankId, setTankId] = useState("");
  const [reconDate, setReconDate] = useState(new Date().toISOString().slice(0, 10));
  const [actualClosing, setActualClosing] = useState("");
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [explanation, setExplanation] = useState("");

  useEffect(() => {
    api.get<{ data: Airport[] }>("/airports").then((r) => {
      setAirports(r.data);
      if (r.data.length) setAirportId(r.data[0].id);
    });
  }, []);

  useEffect(() => {
    if (!airportId) return;
    api.get<{ data: Tank[] }>(`/tanks?airportId=${airportId}`).then((r) => {
      setTanks(r.data);
      if (r.data.length) setTankId(r.data[0].id);
    });
    api.get<{ data: Reconciliation[] }>(`/reconciliation?airportId=${airportId}`).then((r) => setRecords(r.data));
  }, [airportId]);

  async function runRecon() {
    setError(null);
    setResult(null);
    try {
      const res = await api.post<{ data: any }>("/reconciliation/run", {
        tankId, reconDate, actualClosing: Number(actualClosing),
      });
      setResult(res.data);
      const r = await api.get<{ data: Reconciliation[] }>(`/reconciliation?airportId=${airportId}`);
      setRecords(r.data);
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function approve(id: string) {
    if (!explanation) { setError("An explanation is required to approve a variance."); return; }
    try {
      await api.post(`/reconciliation/${id}/approve`, { explanation });
      const r = await api.get<{ data: Reconciliation[] }>(`/reconciliation?airportId=${airportId}`);
      setRecords(r.data);
      setExplanation("");
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Fuel Reconciliation</h1>
        <p className="text-sm text-ink-500">Opening + Receipts + Transfers In − Transfers Out − Uplift − Losses ± Adjustments = Expected Closing</p>
      </div>

      <div className="panel p-5 grid md:grid-cols-4 gap-4">
        <div>
          <label className="label">Airport</label>
          <select className="input" value={airportId} onChange={(e) => setAirportId(e.target.value)}>
            {airports.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Tank</label>
          <select className="input" value={tankId} onChange={(e) => setTankId(e.target.value)}>
            {tanks.map((t) => <option key={t.id} value={t.id}>{t.tank_code}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Date</label>
          <input className="input" type="date" value={reconDate} onChange={(e) => setReconDate(e.target.value)} />
        </div>
        <div>
          <label className="label">Physical / Actual Closing (L)</label>
          <input className="input" type="number" value={actualClosing} onChange={(e) => setActualClosing(e.target.value)} />
        </div>
        <div className="md:col-span-4">
          <button className="btn-primary" onClick={runRecon}>Run Reconciliation</button>
        </div>
      </div>

      {error && <div className="panel p-3 text-sm text-signal-red border-signal-red/40">{error}</div>}

      {result && (
        <div className="panel p-5">
          <div className="text-sm font-medium text-ink-100 mb-4">Result</div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
            <div><div className="text-ink-500 text-xs">Opening Stock</div><div className="data-mono text-ink-100">{fmt(result.openingStock)} L</div></div>
            <div><div className="text-ink-500 text-xs">Receipts</div><div className="data-mono text-signal-green">+{fmt(result.receipts)} L</div></div>
            <div><div className="text-ink-500 text-xs">Aircraft Uplift</div><div className="data-mono text-amber-400">−{fmt(result.aircraftUplift)} L</div></div>
            <div><div className="text-ink-500 text-xs">Expected Closing</div><div className="data-mono text-ink-100">{fmt(result.expectedClosing)} L</div></div>
          </div>
          <div className="flex items-center gap-6 pt-4 border-t border-base-600">
            <div>
              <div className="text-ink-500 text-xs">Actual Closing</div>
              <div className="data-mono text-lg text-ink-100">{fmt(result.actualClosing)} L</div>
            </div>
            <div>
              <div className="text-ink-500 text-xs">Variance</div>
              <div className={`data-mono text-lg ${Math.abs(result.variancePct) > 0.5 ? "text-signal-red" : "text-signal-green"}`}>
                {result.variance > 0 ? "+" : ""}{fmt(result.variance)} L ({result.variancePct.toFixed(2)}%)
              </div>
            </div>
            <StatusBadge status={result.status} />
          </div>
          {result.status === "investigation_required" && (
            <div className="mt-4 p-3 bg-signal-red/10 border border-signal-red/30 rounded-md text-sm text-signal-red">
              STATUS: INVESTIGATION REQUIRED — an alert has been raised for this tank.
            </div>
          )}
        </div>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Expected</th>
              <th className="px-4 py-3">Actual</th>
              <th className="px-4 py-3">Variance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 text-ink-300">{r.recon_date}</td>
                <td className="px-4 py-3 data-mono text-ink-300">{fmt(r.expected_closing)} L</td>
                <td className="px-4 py-3 data-mono text-ink-300">{r.actual_closing != null ? `${fmt(r.actual_closing)} L` : "—"}</td>
                <td className={`px-4 py-3 data-mono ${r.variance && Math.abs(r.variance_pct || 0) > 0.5 ? "text-signal-red" : "text-signal-green"}`}>
                  {r.variance != null ? `${r.variance > 0 ? "+" : ""}${fmt(r.variance)} L` : "—"}
                </td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  {r.status === "investigation_required" && (
                    <div className="flex gap-2 justify-end">
                      <input className="input w-40 text-xs" placeholder="Explanation…" value={explanation} onChange={(e) => setExplanation(e.target.value)} />
                      <button className="btn-secondary text-xs" onClick={() => approve(r.id)}>Approve</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {records.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">No reconciliations run yet for this airport.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
