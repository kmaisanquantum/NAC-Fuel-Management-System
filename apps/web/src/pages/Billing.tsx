import { useEffect, useState } from "react";
import { api } from "../api/client";
import { Invoice } from "../types";
import StatusBadge from "../components/StatusBadge";

export default function Billing() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() { api.get<{ data: Invoice[] }>("/billing/invoices").then((r) => setInvoices(r.data)); }
  useEffect(load, []);

  async function issue(id: string) {
    try { await api.post(`/billing/invoices/${id}/issue`); load(); } catch (e: any) { setError(e.message); }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Billing & Invoices</h1>
        <p className="text-sm text-ink-500">Auto-generated from completed aircraft uplifts</p>
      </div>
      {error && <div className="panel p-3 text-sm text-signal-red border-signal-red/40">{error}</div>}
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Invoice #</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Due</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((i) => (
              <tr key={i.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 data-mono text-ink-100">{i.invoice_number}</td>
                <td className="px-4 py-3 data-mono text-ink-300">{i.currency} {i.total_amount.toFixed(2)}</td>
                <td className="px-4 py-3 text-ink-500">{i.invoice_date}</td>
                <td className="px-4 py-3 text-ink-500">{i.due_date || "—"}</td>
                <td className="px-4 py-3"><StatusBadge status={i.status} /></td>
                <td className="px-4 py-3 text-right">
                  {i.status === "draft" && <button className="btn-secondary text-xs" onClick={() => issue(i.id)}>Issue</button>}
                </td>
              </tr>
            ))}
            {invoices.length === 0 && <tr><td colSpan={6} className="px-4 py-8 text-center text-ink-500">No invoices yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
