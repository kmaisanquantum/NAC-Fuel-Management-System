import { FormEvent, useEffect, useState } from "react";
import { api } from "../api/client";

interface UserRow {
  id: string;
  email: string;
  full_name: string;
  role_id?: string;
  role_name: string;
  status: string;
  airport_id?: string | null;
  created_at?: string;
}

interface Role {
  id: string;
  name: string;
  description: string;
}

export default function Users() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Add user modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addFullName, setAddFullName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addPassword, setAddPassword] = useState("");
  const [addRoleId, setAddRoleId] = useState("");
  const [addAirportId, setAddAirportId] = useState("");

  // Edit user modal state
  const [editingUser, setEditingUser] = useState<UserRow | null>(null);
  const [editFullName, setEditFullName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRoleId, setEditRoleId] = useState("");
  const [editAirportId, setEditAirportId] = useState("");

  const fetchUsers = () => {
    api
      .get<{ data: UserRow[] }>("/users")
      .then((r) => setUsers(r.data))
      .catch((e) => setError(e.message));
  };

  const fetchRoles = () => {
    api
      .get<{ data: Role[] }>("/users/roles")
      .then((r) => {
        setRoles(r.data);
        if (r.data.length > 0 && !addRoleId) {
          setAddRoleId(r.data[0].id);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, []);

  const handleAddSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/users", {
        fullName: addFullName,
        email: addEmail,
        password: addPassword,
        roleId: addRoleId,
        airportId: addAirportId || undefined,
      });
      setShowAddModal(false);
      setAddFullName("");
      setAddEmail("");
      setAddPassword("");
      setAddAirportId("");
      fetchUsers();
    } catch (e: any) {
      setError(e.message || "Failed to create user");
    }
  };

  const openEditModal = (u: UserRow) => {
    setEditingUser(u);
    setEditFullName(u.full_name);
    setEditEmail(u.email);
    // match role_id or find role by role_name
    const currentRole = roles.find((r) => r.id === u.role_id || r.name === u.role_name);
    setEditRoleId(currentRole ? currentRole.id : u.role_id || "");
    setEditAirportId(u.airport_id || "");
  };

  const handleEditSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setError(null);
    try {
      await api.patch(`/users/${editingUser.id}`, {
        fullName: editFullName,
        email: editEmail,
        roleId: editRoleId,
        airportId: editAirportId || null,
      });
      setEditingUser(null);
      fetchUsers();
    } catch (e: any) {
      setError(e.message || "Failed to update user");
    }
  };

  const handleRoleChange = async (userId: string, newRoleId: string) => {
    setError(null);
    try {
      await api.patch(`/users/${userId}/role`, { roleId: newRoleId });
      fetchUsers();
    } catch (e: any) {
      setError(e.message || "Failed to update user role");
    }
  };

  const handleStatusToggle = async (u: UserRow) => {
    setError(null);
    const newStatus = u.status === "active" ? "suspended" : "active";
    try {
      await api.patch(`/users/${u.id}/status`, { status: newStatus });
      fetchUsers();
    } catch (e: any) {
      setError(e.message || "Failed to change user status");
    }
  };

  const handleDelete = async (u: UserRow) => {
    if (!window.confirm(`Are you sure you want to delete user "${u.full_name}"?`)) {
      return;
    }
    setError(null);
    try {
      await api.del(`/users/${u.id}`);
      fetchUsers();
    } catch (e: any) {
      setError(e.message || "Failed to delete user");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-100">Users & Roles</h1>
          <p className="text-sm text-ink-500">Role-based access control · {roles.length} roles defined</p>
        </div>
        <button
          className="btn-primary"
          onClick={() => {
            setError(null);
            if (roles.length > 0 && !addRoleId) setAddRoleId(roles[0].id);
            setShowAddModal(true);
          }}
        >
          + Add User
        </button>
      </div>

      {error && (
        <div className="panel p-3 text-sm text-signal-red border-signal-red/40 flex justify-between items-center">
          <span>{error}</span>
          <button className="text-xs text-ink-400 hover:text-ink-100 underline" onClick={() => setError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-base-700 text-left text-ink-500 text-xs uppercase tracking-wide bg-base-900/50">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-base-700">
            {users.map((u) => {
              const matchedRole = roles.find((r) => r.id === u.role_id || r.name === u.role_name);
              const currentRoleId = matchedRole ? matchedRole.id : u.role_id || "";

              return (
                <tr key={u.id} className="hover:bg-base-700/30">
                  <td className="px-4 py-3 font-medium text-ink-100">{u.full_name}</td>
                  <td className="px-4 py-3 font-mono text-ink-300 text-xs">{u.email}</td>
                  <td className="px-4 py-3 text-ink-300">
                    <select
                      className="bg-base-900 border border-base-600 rounded px-2 py-1 text-xs text-ink-200 focus:border-amber-400 outline-none"
                      value={currentRoleId}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                    >
                      {roles.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize border ${
                        u.status === "active"
                          ? "bg-emerald-950/80 text-emerald-400 border-emerald-800"
                          : "bg-amber-950/80 text-amber-400 border-amber-800"
                      }`}
                    >
                      {u.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEditModal(u)}
                      className="px-2 py-1 text-xs font-medium rounded bg-base-700 hover:bg-base-600 text-ink-200 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleStatusToggle(u)}
                      className={`px-2 py-1 text-xs font-medium rounded border transition-colors ${
                        u.status === "active"
                          ? "bg-amber-950/60 hover:bg-amber-900/80 text-amber-300 border-amber-800"
                          : "bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border-emerald-800"
                      }`}
                    >
                      {u.status === "active" ? "Suspend" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      className="px-2 py-1 text-xs font-medium rounded bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-ink-500">
                  No users found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="panel p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-display font-semibold text-ink-100">Add New User</h2>
            <form onSubmit={handleAddSubmit} className="space-y-3">
              <div>
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  value={addFullName}
                  onChange={(e) => setAddFullName(e.target.value)}
                  required
                  placeholder="John Doe"
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  className="input"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  required
                  placeholder="john.doe@company.com"
                />
              </div>
              <div>
                <label className="label">Password * (min 8 chars)</label>
                <input
                  className="input"
                  type="password"
                  value={addPassword}
                  onChange={(e) => setAddPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={addRoleId} onChange={(e) => setAddRoleId(e.target.value)} required>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.replace(/_/g, " ")} - {r.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Airport ID (Optional)</label>
                <input
                  className="input"
                  value={addAirportId}
                  onChange={(e) => setAddAirportId(e.target.value)}
                  placeholder="e.g. POM"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowAddModal(false);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="panel p-6 max-w-md w-full space-y-4">
            <h2 className="text-lg font-display font-semibold text-ink-100">Edit User</h2>
            <form onSubmit={handleEditSubmit} className="space-y-3">
              <div>
                <label className="label">Full Name *</label>
                <input
                  className="input"
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Email *</label>
                <input
                  className="input"
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className="label">Role *</label>
                <select className="input" value={editRoleId} onChange={(e) => setEditRoleId(e.target.value)} required>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.replace(/_/g, " ")} - {r.description}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label">Airport ID (Optional)</label>
                <input
                  className="input"
                  value={editAirportId}
                  onChange={(e) => setEditAirportId(e.target.value)}
                  placeholder="e.g. POM"
                />
              </div>
              <div className="flex justify-end gap-3 pt-3">
                <button type="button" className="btn-secondary" onClick={() => setEditingUser(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
