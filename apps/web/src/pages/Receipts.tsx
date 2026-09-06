import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport, FuelReceipt, Tank } from "../types";
import StatusBadge from "../components/StatusBadge";
import { useAuth } from "../context/AuthContext";

interface Supplier { id: string; name: string; }
interface FuelProduct { id: string; name: string; code: string; }

const NEXT_STATUS: Record<string, string | null> = {
  draft: "submitted",
  submitted: "verified",
  verified: "approved",
  approved: "posted",
  posted: null,
};

function fmt(n: number) {
  return new Intl.NumberFormat("en-US").format(n);
}

export default function Receipts() {
  const { user } = useAuth();
  const [airports, setAirports] = useState<Airport[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [products, setProducts] = useState<FuelProduct[]>([]);
  const [receipts, setReceipts] = useState<FuelReceipt[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ airportId: "", supplierId: "", tankId: "", fuelProductId: "", quantity: "", deliveryVehicle: "", driverName: "", deliveryDocument: "" });

  function loadReceipts() {
    api.get<{ data: FuelReceipt[] }>("/receipts").then((r) => setReceipts(r.data));
  }

  useEffect(() => {
    Promise.all([
      api.get<{ data: Airport[] }>("/airports"),
      api.get<{ data: Supplier[] }>("/suppliers"),
      api.get<{ data: FuelProduct[] }>("/fuel-products"),
    ]).then(([a, s, p]) => {
      setAirports(a.data);
      setSuppliers(s.data);
      setProducts(p.data);
      if (a.data.length) setForm((f) => ({ ...f, airportId: a.data[0].id }));
    });
    loadReceipts();
  }, []);

  useEffect(() => {
    if (form.airportId) {
      api.get<{ data: Tank[] }>(`/tanks?airportId=${form.airportId}`).then((r) => setTanks(r.data));
    }
  }, [form.airportId]);

  async function handleCreate() {
    setError(null);
    const airport = airports.find((a) => a.id === form.airportId);
    if (!airport) return;
    try {
      await api.post("/receipts", {
        airportId: form.airportId,
        airportCode: airport.code,
        supplierId: form.supplierId,
        tankId: form.tankId,
        fuelProductId: form.fuelProductId,
        quantity: Number(form.quantity),
        deliveryVehicle: form.deliveryVehicle || undefined,
        driverName: form.driverName || undefined,
        deliveryDocument: form.deliveryDocument || undefined,
      });
      setShowForm(false);
      setForm((f) => ({ ...f, quantity: "", deliveryVehicle: "", driverName: "", deliveryDocument: "" }));
      loadReceipts();
    } catch (e: any) {
      setError(e.message);
    }
  }

  async function advance(receipt: FuelReceipt) {
    const next = NEXT_STATUS[receipt.status];
    if (!next) return;
    try {
      await api.post(`/receipts/${receipt.id}/transition`, { status: next });
      loadReceipts();
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Fuel Receipts</h1>
          <p className="text-sm text-ink-500">Draft → Submitted → Verified → Approved → Posted to Inventory</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "New Receipt"}</button>
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
            <label className="label">Supplier</label>
            <select className="input" value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}>
              <option value="">Select supplier…</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Receiving Tank</label>
            <select className="input" value={form.tankId} onChange={(e) => setForm({ ...form, tankId: e.target.value })}>
              <option value="">Select tank…</option>
              {tanks.map((t) => <option key={t.id} value={t.id}>{t.tank_code}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Fuel Product</label>
            <select className="input" value={form.fuelProductId} onChange={(e) => setForm({ ...form, fuelProductId: e.target.value })}>
              <option value="">Select product…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Quantity (L)</label>
            <input className="input" type="number" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          </div>
          <div>
            <label className="label">Delivery Vehicle</label>
            <input className="input" value={form.deliveryVehicle} onChange={(e) => setForm({ ...form, deliveryVehicle: e.target.value })} />
          </div>
          <div>
            <label className="label">Driver</label>
            <input className="input" value={form.driverName} onChange={(e) => setForm({ ...form, driverName: e.target.value })} />
          </div>
          <div>
            <label className="label">Delivery Document</label>
            <input className="input" value={form.deliveryDocument} onChange={(e) => setForm({ ...form, deliveryDocument: e.target.value })} />
          </div>
          <div className="flex items-end">
            <button className="btn-primary w-full" onClick={handleCreate}>Create Draft Receipt</button>
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Reference</th>
              <th className="px-4 py-3">Quantity</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {receipts.map((r) => (
              <tr key={r.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 data-mono text-ink-100">{r.reference}</td>
                <td className="px-4 py-3 data-mono text-ink-300">{fmt(r.quantity)} L</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-ink-500">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-right">
                  {NEXT_STATUS[r.status] && (
                    <button className="btn-secondary text-xs" onClick={() => advance(r)}>
                      Advance → {NEXT_STATUS[r.status]}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {receipts.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No receipts yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
