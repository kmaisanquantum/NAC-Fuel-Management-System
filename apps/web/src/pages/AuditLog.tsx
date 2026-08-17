import { useEffect, useState } from "react";
import { api } from "../api/client";

interface AuditEntry {
  id: string; user_id: string | null; role: string | null; action: string; entity: string;
  entity_id: string | null; reason: string | null; created_at: string;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  useEffect(() => { api.get<{ data: AuditEntry[] }>("/audit-logs?limit=200").then((r) => setEntries(r.data)); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Audit Logs</h1>
        <p className="text-sm text-ink-500">Immutable record of every sensitive operation — never deleted</p>
      </div>
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Action</th><th className="px-4 py-3">Entity</th><th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Reason</th><th className="px-4 py-3">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 data-mono text-amber-400 text-xs">{e.action}</td>
                <td className="px-4 py-3 text-ink-300 text-xs">{e.entity}{e.entity_id ? ` #${e.entity_id.slice(0, 8)}` : ""}</td>
                <td className="px-4 py-3 text-ink-500 text-xs capitalize">{e.role?.replace(/_/g, " ") || "system"}</td>
                <td className="px-4 py-3 text-ink-500 text-xs">{e.reason || "—"}</td>
                <td className="px-4 py-3 text-ink-500 text-xs">{new Date(e.created_at).toLocaleString()}</td>
              </tr>
            ))}
            {entries.length === 0 && <tr><td colSpan={5} className="px-4 py-8 text-center text-ink-500">No audit entries.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
