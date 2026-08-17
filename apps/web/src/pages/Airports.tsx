import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Airport } from "../types";
import AirportBeacon from "../components/AirportBeacon";

export default function Airports() {
  const [airports, setAirports] = useState<Airport[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", region: "", connectivityProfile: "online" });
  const [error, setError] = useState<string | null>(null);

  function load() { api.get<{ data: Airport[] }>("/airports").then((r) => setAirports(r.data)); }
  useEffect(load, []);

  async function create() {
    setError(null);
    try {
      await api.post("/airports", form);
      setShowForm(false);
      setForm({ code: "", name: "", region: "", connectivityProfile: "online" });
      load();
    } catch (e: any) { setError(e.message); }
  }

  async function toggleStatus(a: Airport) {
    await api.patch(`/airports/${a.id}`, { status: a.status === "active" ? "inactive" : "active" });
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Airports</h1>
          <p className="text-sm text-ink-500">NAC network master data — configurable, not hard-coded</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "Add Airport"}</button>
      </div>

      {error && <div className="panel p-3 text-sm text-signal-red border-signal-red/40">{error}</div>}

      {showForm && (
        <div className="panel p-5 grid md:grid-cols-4 gap-4">
          <div><label className="label">Code</label><input className="input" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} maxLength={4} /></div>
          <div><label className="label">Name</label><input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><label className="label">Region</label><input className="input" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} /></div>
          <div>
            <label className="label">Connectivity</label>
            <select className="input" value={form.connectivityProfile} onChange={(e) => setForm({ ...form, connectivityProfile: e.target.value })}>
              <option value="online">Online</option>
              <option value="intermittent">Intermittent</option>
              <option value="offline_capable">Offline-capable</option>
            </select>
          </div>
          <div className="md:col-span-4"><button className="btn-primary" onClick={create}>Create Airport</button></div>
        </div>
      )}

      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Code</th><th className="px-4 py-3">Name</th><th className="px-4 py-3">Region</th>
              <th className="px-4 py-3">Connectivity</th><th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {airports.map((a) => (
              <tr key={a.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 data-mono text-ink-100">{a.code}</td>
                <td className="px-4 py-3 text-ink-100">{a.name}</td>
                <td className="px-4 py-3 text-ink-500">{a.region}</td>
                <td className="px-4 py-3 text-ink-500 capitalize">{a.connectivity_profile.replace(/_/g, " ")}</td>
                <td className="px-4 py-3"><AirportBeacon status={a.status === "active" ? "green" : "grey"} label={a.status} /></td>
                <td className="px-4 py-3 text-right"><button className="btn-ghost text-xs" onClick={() => toggleStatus(a)}>Toggle</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
