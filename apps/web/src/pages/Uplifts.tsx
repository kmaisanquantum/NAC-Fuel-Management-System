import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport, FuelUplift, Tank, Refueller } from "../types";
import StatusBadge from "../components/StatusBadge";

interface Airline { id: string; name: string; }
interface Aircraft { id: string; registration: string; airline_id: string; }
interface FuelProduct { id: string; name: string; }

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function Uplifts() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [refuellers, setRefuellers] = useState<Refueller[]>([]);
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [aircraft, setAircraft] = useState<Aircraft[]>([]);
  const [products, setProducts] = useState<FuelProduct[]>([]);
  const [uplifts, setUplifts] = useState<FuelUplift[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    airportId: "", tankId: "", refuellerId: "", airlineId: "", aircraftId: "",
    flightNumber: "", fuelProductId: "", quantity: "", pricePerLitre: "2.35",
  });

  function loadUplifts() {
    api.get<{ data: FuelUplift[] }>("/uplifts").then((r) => setUplifts(r.data));
  }

  useEffect(() => {
    Promise.all([
      api.get<{ data: Airport[] }>("/airports"),
      api.get<{ data: Airline[] }>("/airlines"),
      api.get<{ data: Aircraft[] }>("/aircraft"),
      api.get<{ data: FuelProduct[] }>("/fuel-products"),
    ]).then(([a, al, ac, p]) => {
      setAirports(a.data);
      setAirlines(al.data);
      setAircraft(ac.data);
      setProducts(p.data);
      if (a.data.length) setForm((f) => ({ ...f, airportId: a.data[0].id, fuelProductId: p.data[0]?.id || "" }));
    });
    loadUplifts();
  }, []);

  useEffect(() => {
    if (!form.airportId) return;
    api.get<{ data: Tank[] }>(`/tanks?airportId=${form.airportId}`).then((r) => setTanks(r.data));
    api.get<{ data: Refueller[] }>(`/refuellers?airportId=${form.airportId}`).then((r) => setRefuellers(r.data));
  }, [form.airportId]);

  async function handleCreate() {
    setError(null);
    setSuccess(null);
    const airport = airports.find((a) => a.id === form.airportId);
    if (!airport) return;
    try {
      const result = await api.post<{ data: { reference: string; totalAmount: number } }>("/uplifts", {
        airportId: form.airportId,
        airportCode: airport.code,
        tankId: form.tankId,
        refuellerId: form.refuellerId,
        airlineId: form.airlineId,
        aircraftId: form.aircraftId,
        flightNumber: form.flightNumber || undefined,
        fuelProductId: form.fuelProductId,
        quantity: Number(form.quantity),
        pricePerLitre: Number(form.pricePerLitre),
      });
      setSuccess(`Uplift ${result.data.reference} posted — K${result.data.totalAmount.toFixed(2)} invoiced.`);
      setForm((f) => ({ ...f, quantity: "", flightNumber: "" }));
      loadUplifts();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Aircraft Fuel Uplift</h1>
          <p className="text-sm text-ink-500">Deducts inventory and generates a billing record in one atomic transaction</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Record Uplift"}</button>
      </div>

      {error && <div className="panel p-3 text-sm text-signal-red border-signal-red/40">{error}</div>}
      {success && <div className="panel p-3 text-sm text-signal-green border-signal-green/40">{success}</div>}

      {showForm && (
        <div className="panel p-5 grid md:grid-cols-3 gap-4">
          <div>
            <label className="label">Airport</label>
            <select className="input" value={form.airportId} onChange={(e) => setForm({ ...form, airportId: e.target.value })}>
              {airports.map((a) => <option key={a.id} value={a.id}>{a.code} — {a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Tank</label>
            <select className="input" value={form.tankId} onChange={(e) => setForm({ ...form, tankId: e.target.value })}>
              <option value="">Select tank…</option>
              {tanks.map((t) => <option key={t.id} value={t.id}>{t.tank_code} ({fmt(t.current_level)} L)</option>)}
            </select>
          </div>
          <div>
            <label className="label">Refueller / Bowser</label>
            <select className="input" value={form.refuellerId} onChange={(e) => setForm({ ...form, refuellerId: e.target.value })}>
              <option value="">Select refueller…</option>
              {refuellers.map((r) => <option key={r.id} value={r.id}>{r.asset_code}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Airline</label>
            <select className="input" value={form.airlineId} onChange={(e) => setForm({ ...form, airlineId: e.target.value })}>
              <option value="">Select airline…</option>
              {airlines.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Aircraft Registration</label>
            <select className="input" value={form.aircraftId} onChange={(e) => setForm({ ...form, aircraftId: e.target.value })}>
              <option value="">Select aircraft…</option>
              {aircraft.filter((ac) => !form.airlineId || ac.airline_id === form.airlineId).map((ac) => (
                <option key={ac.id} value={ac.id}>{ac.registration}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Flight Number</label>
            <input className="input" value={form.flightNumber} onChange={(e) => setForm({ ...form, flightNumber: e.target.value })} />
          </div>
          <div>
            <label className="label">Fuel Product</label>
            <select className="input" value={form.fuelProductId} onChange={(e) => setForm({ ...form, fuelProductId: e.target.value })}>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantity (L)</label>
            <input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="label">Price / Litre (PGK)</label>
            <input className="input" type="number" step="0.01" value={form.pricePerLitre} onChange={(e) => setForm({ ...form, pricePerLitre: e.target.value })} />
          </div>
          <div className="md:col-span-3 flex justify-end">
            <button className="btn-primary" onClick={handleCreate}>Complete Uplift & Generate Invoice</button>
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Flight</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {uplifts.map((u) => (
              <tr key={u.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 data-mono text-ink-100">{u.reference}</td>
                <td className="px-4 py-3 text-ink-300">{u.flight_number || "—"}</td>
                <td className="px-4 py-3 data-mono text-ink-300">{fmt(u.quantity)} L</td>
                <td className="px-4 py-3 data-mono text-ink-100">K {u.total_amount.toFixed(2)}</td>
                <td className="px-4 py-3"><StatusBadge status={u.invoice_status} /></td>
                <td className="px-4 py-3 text-ink-500">{new Date(u.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {uplifts.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">No uplifts recorded yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
