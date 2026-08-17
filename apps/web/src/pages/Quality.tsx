import { useEffect, useState } from "react";
import { api } from "../api/client";
import StatusBadge from "../components/StatusBadge";

interface QT { id: string; sample_ref: string; sample_date: string; test_type: string | null; pass_fail: string; technician: string | null; comments: string | null; }

export default function Quality() {
  const [tests, setTests] = useState<QT[]>([]);
  useEffect(() => { api.get<{ data: QT[] }>("/quality").then((r) => setTests(r.data)); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Fuel Quality</h1>
        <p className="text-sm text-ink-500">Sample testing and certification records</p>
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Sample</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Test Type</th>
              <th className="px-4 py-3">Result</th><th className="px-4 py-3">Technician</th>
            </tr>
          </thead>
          <tbody>
            {tests.map((t) => (
              <tr key={t.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 data-mono text-ink-100">{t.sample_ref}</td>
                <td className="px-4 py-3 text-ink-500">{t.sample_date}</td>
                <td className="px-4 py-3 text-ink-300">{t.test_type || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={t.pass_fail} /></td>
                <td className="px-4 py-3 text-ink-500">{t.technician || "—"}</td>
              </tr>
            ))}
            {tests.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No quality tests recorded.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
