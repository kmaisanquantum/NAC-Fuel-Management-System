import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";
import { Driver } from "../types";

export default function Drivers() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [employeeNumber, setEmployeeNumber] = useState("");
  const [name, setName] = useState("");
  const [department, setDepartment] = useState("Operations");
  const [licenceNumber, setLicenceNumber] = useState("");
  const [licenceClass, setLicenceClass] = useState("Class 4 (Heavy)");
  const [licenceExpiry, setLicenceExpiry] = useState("2027-12-31");

  const fetchDrivers = () => {
    api.get<Driver[]>("/drivers")
      .then((res) => setDrivers(res))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDrivers();
  }, []);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/drivers", {
        employeeNumber,
        name,
        department,
        licenceNumber,
        licenceClass,
        licenceExpiry,
        authorisationStatus: "authorised",
      });
      setShowModal(false);
      fetchDrivers();
    } catch (err: any) {
      alert(err.message || "Failed to register driver");
    }
  };

  if (loading) return <div className="p-4 text-ink-400">Loading Driver Register…</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-100">Driver Register</h1>
          <p className="text-sm text-ink-400">Authorised drivers, licence classes, training, and accident histories</p>
        </div>
        <button className="btn-primary" onClick={() => setShowModal(true)}>+ Add Driver</button>
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-base-900 border-b border-base-700 text-ink-400 uppercase text-xs">
            <tr>
              <th className="px-4 py-3">Emp #</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Licence #</th>
              <th className="px-4 py-3">Class</th>
              <th className="px-4 py-3">Expiry</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-800 text-ink-200">
            {drivers.map((d) => (
              <tr key={d.id} className="hover:bg-base-800/50">
                <td className="px-4 py-3 font-semibold text-amber-400">{d.employee_number}</td>
                <td className="px-4 py-3 font-medium">{d.name}</td>
                <td className="px-4 py-3">{d.department || "—"}</td>
                <td className="px-4 py-3 font-mono">{d.licence_number}</td>
                <td className="px-4 py-3">{d.licence_class || "—"}</td>
                <td className="px-4 py-3">{d.licence_expiry}</td>
                <td className="px-4 py-3">
                  <span className="px-2 py-0.5 text-xs rounded font-medium bg-emerald-950 text-emerald-400 border border-emerald-800">
                    {d.authorisation_status}
                  </span>
                </td>
              </tr>
            ))}
            {drivers.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-6 text-center text-ink-500">No drivers registered yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="panel p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-display font-semibold text-ink-100">Register Driver</h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="label">Employee # *</label>
                <input className="input" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} required placeholder="EMP-104" />
              </div>
              <div>
                <label className="label">Full Name *</label>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Michael Somare" />
              </div>
              <div>
                <label className="label">Department</label>
                <input className="input" value={department} onChange={(e) => setDepartment(e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="label">Licence # *</label>
                  <input className="input" value={licenceNumber} onChange={(e) => setLicenceNumber(e.target.value)} required placeholder="DL-88204" />
                </div>
                <div>
                  <label className="label">Licence Expiry *</label>
                  <input className="input" type="date" value={licenceExpiry} onChange={(e) => setLicenceExpiry(e.target.value)} required />
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Save Driver</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
