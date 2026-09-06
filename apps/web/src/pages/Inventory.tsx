import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport } from "../types";

function fmt(n: number) { return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(n); }

interface Balance { tank_id: string; tank_code: string; current_level: number; last_updated: string; }
interface Txn { id: string; tank_id: string; txn_type: string; quantity: number; balance_after: number; reference_type: string; created_at: string; reason: string | null; }

const TXN_COLORS: Record<string, string> = {
  RECEIPT: "text-signal-green", TRANSFER_IN: "text-signal-green", RETURN: "text-signal-green",
  TRANSFER_OUT: "text-amber-400", AIRCRAFT_UPLIFT: "text-amber-400", LOSS: "text-signal-red",
  ADJUSTMENT: "text-ink-300", CORRECTION: "text-ink-300",
};

export default function Inventory() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [airportId, setAirportId] = useState("");
  const [balances, setBalances] = useState<Balance[]>([]);
  const [txns, setTxns] = useState<Txn[]>([]);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjust, setAdjust] = useState({ tankId: "", quantity: "", reason: "" });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: Airport[] }>("/airports").then((r) => {
      setAirports(r.data);
      if (r.data.length) setAirportId(r.data[0].id);
    });
  }, []);

  function load() {
    if (!airportId) return;
    api.get<{ data: Balance[] }>(`/inventory/balances?airportId=${airportId}`).then((r) => setBalances(r.data));
    api.get<{ data: Txn[] }>(`/inventory/transactions?airportId=${airportId}&limit=50`).then((r) => setTxns(r.data));
  }

  useEffect(load, [airportId]);

  async function submitAdjustment() {
    setError(null);
    try {
      await api.post("/inventory/adjustments", { tankId: adjust.tankId, quantity: Number(adjust.quantity), reason: adjust.reason });
      setShowAdjust(false);
      setAdjust({ tankId: "", quantity: "", reason: "" });
      load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Inventory Ledger</h1>
          <p className="text-sm text-ink-500">Immutable movement log — every fuel transaction creates a ledger entry</p>
        </div>
        <div className="flex gap-3">
          <select className="input w-56" value={airportId} onChange={(e) => setAirportId(e.target.value)}>
            {airports.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
          </select>
          <button className="btn-secondary" onClick={() => setShowAdjust((v) => !v)}>{showAdjust ? "Cancel" : "Manual Adjustment"}</button>
        </div>
      </div>

      {error && <div className="panel p-3 text-sm text-signal-red border-signal-red/40">{error}</div>}

      {showAdjust && (
        <div className="panel p-5 grid md:grid-cols-4 gap-4">
          <div>
            <label className="label">Tank</label>
            <select className="input" value={adjust.tankId} onChange={(e) => setAdjust({ ...adjust, tankId: e.target.value })}>
              <option value="">Select…</option>
              {balances.map((b) => <option key={b.tank_id} value={b.tank_id}>{b.tank_code}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantity (± L)</label>
            <input className="input" type="number" value={adjust.quantity} onChange={(e) => setAdjust({ ...adjust, quantity: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Reason (required)</label>
            <input className="input" value={adjust.reason} onChange={(e) => setAdjust({ ...adjust, reason: e.target.value })} />
          </div>
          <div className="md:col-span-4 text-xs text-ink-500">Adjustments are audited and require a documented reason. They do not bypass negative-stock or capacity checks.</div>
          <div>
            <button className="btn-primary" onClick={submitAdjustment}>Post Adjustment</button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-4">
        {balances.map((b) => (
          <div key={b.tank_id} className="panel p-4">
            <div className="text-ink-100 font-medium">{b.tank_code}</div>
            <div className="data-mono text-xl text-amber-400 mt-1">{fmt(b.current_level)} L</div>
            <div className="text-xs text-ink-500 mt-1">Updated {new Date(b.last_updated).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="panel overflow-hidden">
        <div className="px-4 py-3 border-b border-base-700 text-sm font-medium text-ink-100">Recent Ledger Entries</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Balance After</th>
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {txns.map((t) => (
              <tr key={t.id} className="border-b border-base-700 last:border-0">
                <td className={`px-4 py-3 font-medium ${TXN_COLORS[t.txn_type] || "text-ink-300"}`}>{t.txn_type.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 data-mono text-ink-300">{t.quantity > 0 ? "+" : ""}{fmt(t.quantity)} L</td>
                <td className="px-4 py-3 data-mono text-ink-100">{fmt(t.balance_after)} L</td>
                <td className="px-4 py-3 text-ink-500 text-xs">{t.reference_type}{t.reason ? ` — ${t.reason}` : ""}</td>
                <td className="px-4 py-3 text-ink-500">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {txns.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No transactions yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
