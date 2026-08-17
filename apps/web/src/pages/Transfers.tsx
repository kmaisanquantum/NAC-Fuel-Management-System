import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport, Tank, Refueller } from "../types";
import StatusBadge from "../components/StatusBadge";

function fmt(n: number) { return new Intl.NumberFormat("en-US").format(n); }

interface Transfer { id: string; reference: string; source_type: string; destination_type: string; quantity: number; status: string; created_at: string; }

export default function Transfers() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [refuellers, setRefuellers] = useState<Refueller[]>([]);
  const [transfers, setTransfers] = useState<Transfer[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    airportId: "", fuelProductId: "", sourceType: "tank", sourceId: "",
    destinationType: "refueller", destinationId: "", quantity: "", reason: "",
  });

  function load() { api.get<{ data: Transfer[] }>("/transfers").then((r) => setTransfers(r.data)); }

  useEffect(() => {
    Promise.all([api.get<{ data: Airport[] }>("/airports"), api.get<{ data: any[] }>("/fuel-products")]).then(([a, p]) => {
      setAirports(a.data);
      if (a.data.length) setForm((f) => ({ ...f, airportId: a.data[0].id, fuelProductId: p.data[0]?.id || "" }));
    });
    load();
  }, []);

  useEffect(() => {
    if (!form.airportId) return;
    api.get<{ data: Tank[] }>(`/tanks?airportId=${form.airportId}`).then((r) => setTanks(r.data));
    api.get<{ data: Refueller[] }>(`/refuellers?airportId=${form.airportId}`).then((r) => setRefuellers(r.data));
  }, [form.airportId]);

  const sourceOptions = form.sourceType === "tank" ? tanks : refuellers;
  const destOptions = form.destinationType === "tank" ? tanks : refuellers;

  async function handleCreate() {
    setError(null);
    const airport = airports.find((a) => a.id === form.airportId);
    if (!airport) return;
    try {
      await api.post("/transfers", {
        airportId: form.airportId, airportCode: airport.code, fuelProductId: form.fuelProductId,
        sourceType: form.sourceType, sourceId: form.sourceId,
        destinationType: form.destinationType, destinationId: form.destinationId,
        quantity: Number(form.quantity), reason: form.reason || undefined,
      });
      setShowForm(false);
      setForm((f) => ({ ...f, quantity: "", reason: "" }));
      load();
    } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Fuel Transfers</h1>
          <p className="text-sm text-ink-500">Tank ↔ Tank, Tank ↔ Bowser, Airport ↔ Airport</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "New Transfer"}</button>
      </div>

      {error && <div className="panel p-3 text-sm text-signal-red border-signal-red/40">{error}</div>}

      {showForm && (
        <div className="panel p-5 grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Airport</label>
            <select className="input" value={form.airportId} onChange={(e) => setForm({ ...form, airportId: e.target.value })}>
              {airports.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Source Type</label>
            <select className="input" value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value, sourceId: "" })}>
              <option value="tank">Tank</option>
              <option value="refueller">Refueller</option>
            </select>
          </div>
          <div>
            <label className="label">Source Asset</label>
            <select className="input" value={form.sourceId} onChange={(e) => setForm({ ...form, sourceId: e.target.value })}>
              <option value="">Select…</option>
              {sourceOptions.map((o: any) => <option key={o.id} value={o.id}>{o.tank_code || o.asset_code}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Destination Type</label>
            <select className="input" value={form.destinationType} onChange={(e) => setForm({ ...form, destinationType: e.target.value, destinationId: "" })}>
              <option value="tank">Tank</option>
              <option value="refueller">Refueller</option>
            </select>
          </div>
          <div>
            <label className="label">Destination Asset</label>
            <select className="input" value={form.destinationId} onChange={(e) => setForm({ ...form, destinationId: e.target.value })}>
              <option value="">Select…</option>
              {destOptions.map((o: any) => <option key={o.id} value={o.id}>{o.tank_code || o.asset_code}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantity (L)</label>
            <input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="label">Reason</label>
            <input className="input" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={handleCreate}>Complete Transfer</button>
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Route</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {transfers.map((t) => (
              <tr key={t.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 data-mono text-ink-100">{t.reference}</td>
                <td className="px-4 py-3 text-ink-300 capitalize">{t.source_type} → {t.destination_type}</td>
                <td className="px-4 py-3 data-mono text-ink-300">{fmt(t.quantity)} L</td>
                <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-3 text-ink-500">{new Date(t.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {transfers.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No transfers yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
