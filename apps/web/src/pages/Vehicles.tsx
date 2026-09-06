import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Vehicle } from "../types";

export default function Vehicles() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [vehicleNumber, setVehicleNumber] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [make, setMake] = useState("");
  const [model, setModel] = useState("");
  const [year, setYear] = useState<number>(2023);
  const [vehicleType, setVehicleType] = useState("Utility / Pickup");
  const [fuelType, setFuelType] = useState("Diesel");
  const [department, setDepartment] = useState("Operations");
  const [location, setLocation] = useState("Port Moresby (POM)");

  const fetchVehicles = () => {
    api.get<{ data: Vehicle[] }>("/vehicles")
      .then((res) => setVehicles(res.data || []))
      .catch(() => setVehicles([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchVehicles();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/vehicles", {
        vehicleNumber,
        registrationNumber,
        make,
        model,
        year,
        vehicleType,
        fuelType,
        department,
        location,
        status: "active",
        ownership: "owned",
      });
      setShowModal(false);
      fetchVehicles();
    } catch (err: any) {
      alert(err.message || "Failed to create vehicle");
    }
  };

  if (loading) return <div className="p-4 text-ink-400">Loading Vehicle Register…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-100">Vehicle Master Register</h1>
          <p className="text-sm text-ink-400">Master record of all ground vehicles, pickups, and heavy fleet assets</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Register New Vehicle</button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-base-900 border-b border-base-700 text-ink-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Vehicle #</th>
              <th className="px-4 py-3">Reg #</th>
              <th className="px-4 py-3">Make & Model</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Fuel</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Location</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-800 text-ink-200">
            {Array.isArray(vehicles) && vehicles.map((v) => (
              <tr key={v.id} className="hover:bg-base-800/50">
                <td className="px-4 py-3 font-semibold text-amber-400">{v.vehicle_number}</td>
                <td className="px-4 py-3 font-mono">{v.registration_number}</td>
                <td className="px-4 py-3">{v.make} {v.model} ({v.year})</td>
                <td className="px-4 py-3">{v.vehicle_type}</td>
                <td className="px-4 py-3">{v.fuel_type}</td>
                <td className="px-4 py-3">{v.department || "—"}</td>
                <td className="px-4 py-3">{v.location || "—"}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 text-xs rounded font-medium ${
                    v.status === "active" ? "bg-emerald-950 text-emerald-400 border border-emerald-800" :
                    v.status === "under_repair" ? "bg-amber-950 text-amber-400 border border-amber-800" :
                    "bg-base-800 text-ink-400"
                  }`}>
                    {v.status.replace("_", " ")}
                  </span>
                </td>
              </tr>
            ))}
            {(!Array.isArray(vehicles) || vehicles.length === 0) && (
              <tr><td colSpan={8} className="px-4 py-6 text-center text-ink-500">No vehicles registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="panel p-6 max-w-lg w-full space-y-4">
            <h2 className="text-lg font-display font-semibold text-ink-100">Register Vehicle</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Vehicle Number *</label>
                  <input className="input" value={vehicleNumber} onChange={(e) => setVehicleNumber(e.target.value)} required placeholder="V005" />
                </div>
                <div>
                  <label className="label">Registration # *</label>
                  <input className="input" value={registrationNumber} onChange={(e) => setRegistrationNumber(e.target.value)} required placeholder="FLEET-005" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Make *</label>
                  <input className="input" value={make} onChange={(e) => setMake(e.target.value)} required placeholder="Toyota" />
                </div>
                <div>
                  <label className="label">Model *</label>
                  <input className="input" value={model} onChange={(e) => setModel(e.target.value)} required placeholder="Hilux" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Year</label>
                  <input className="input" type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} />
                </div>
                <div>
                  <label className="label">Vehicle Type</label>
                  <input className="input" value={vehicleType} onChange={(e) => setVehicleType(e.target.value)} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Department</label>
                  <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
                </div>
                <div>
                  <label className="label">Location</label>
                  <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Vehicle</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
