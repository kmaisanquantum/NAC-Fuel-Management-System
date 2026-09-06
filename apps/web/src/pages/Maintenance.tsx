import { useEffect, useState } from "react";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";

interface MR { id: string; asset_type: string; maintenance_type: string | null; scheduled_date: string | null; technician: string | null; status: string; }

export default function Maintenance() {
  const [records, setRecords] = useState<MR[]>([]);
  function load() { api.get<{ data: MR[] }>("/maintenance").then((r) => setRecords(r.data)); }
  useEffect(load, []);

  async function complete(id: string) { await api.post(`/maintenance/${id}/complete`); load(); }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Maintenance</h1>
        <p className="text-sm text-ink-500">Tanks, refuellers, meters and fuel infrastructure</p>
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Asset Type</th><th className="px-4 py-3">Type</th><th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Status</th><th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 text-ink-100 capitalize">{r.asset_type}</td>
                <td className="px-4 py-3 text-ink-300">{r.maintenance_type || "—"}</td>
                <td className="px-4 py-3 text-ink-500">{r.scheduled_date || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
                <td className="px-4 py-3 text-right">
                  {r.status === "scheduled" && <button className="btn-secondary text-xs" onClick={() => complete(r.id)}>Mark Complete</button>}
                </td>
              </tr>
            ))}
            {records.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No maintenance records.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
