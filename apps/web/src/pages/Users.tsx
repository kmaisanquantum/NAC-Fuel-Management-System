import { useEffect, useState } from "react";
import { api } from "../api/client";

interface UserRow { id: string; email: string; full_name: string; role_name: string; status: string; }
interface Role { id: string; name: string; description: string; }

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<{ data: UserRow[] }>("/users").then((r) => setUsers(r.data)).catch((e) => setError(e.message));
    api.get<{ data: Role[] }>("/users/roles").then((r) => setRoles(r.data)).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Users & Roles</h1>
        <p className="text-sm text-ink-500">Role-based access control · {roles.length} roles defined</p>
      </div>
      {error && <div className="panel p-3 text-sm text-signal-red border-signal-red/40">{error} (NAC Administrator access required)</div>}
      <div className="panel overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide">
              <th className="px-4 py-3">Name</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-base-700 last:border-0">
                <td className="px-4 py-3 text-ink-100">{u.full_name}</td>
                <td className="px-4 py-3 data-mono text-ink-300 text-xs">{u.email}</td>
                <td className="px-4 py-3 text-ink-300 capitalize">{u.role_name.replace(/_/g, " ")}</td>
                <td className="px-4 py-3 text-ink-500 capitalize">{u.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
