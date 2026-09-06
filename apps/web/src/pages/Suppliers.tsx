import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Supplier { id: string; name: string; contact_name: string | null; contact_email: string | null; contract_ref: string | null; contract_expiry: string | null; active: number; }

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  useEffect(() => { api.get<{ data: Supplier[] }>("/suppliers").then((r) => setSuppliers(r.data)); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Suppliers</h1>
        <p className="text-sm text-ink-500">Fuel supply contracts and delivery performance</p>
      </div>
      <div className="grid md:grid-cols-2 gap-4">
        {suppliers.map((s) => (
          <div key={s.id} className="panel p-5">
            <div className="text-ink-100 font-medium">{s.name}</div>
            <div className="text-sm text-ink-500 mt-1">{s.contact_name} · {s.contact_email}</div>
            <div className="text-xs text-ink-500 mt-3 flex justify-between border-t border-base-700 pt-3">
              <span>Contract: {s.contract_ref || "—"}</span>
              <span>Expires: {s.contract_expiry || "—"}</span>
            </div>
          </div>
        ))}
        {suppliers.length === 0 && <div className="text-ink-500 col-span-2 text-center py-8">No suppliers found.</div>}
      </div>
    </div>
  );
}
