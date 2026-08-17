import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const NAV_GROUPS: { title: string; items: { to: string; label: string }[] }[] = [
  {
    title: "Overview",
    items: [
      { to: "/national", label: "National Dashboard" },
      { to: "/airport", label: "Airport Dashboard" },
      { to: "/map", label: "Map View" },
    ],
  },
  {
    title: "Fuel Operations",
    items: [
      { to: "/receipts", label: "Fuel Receipts" },
      { to: "/transfers", label: "Fuel Transfers" },
      { to: "/uplifts", label: "Aircraft Uplift" },
      { to: "/inventory", label: "Inventory" },
      { to: "/reconciliation", label: "Reconciliation" },
    ],
  },
  {
    title: "Assets",
    items: [
      { to: "/tanks", label: "Tanks" },
      { to: "/refuellers", label: "Refuellers" },
      { to: "/maintenance", label: "Maintenance" },
      { to: "/quality", label: "Fuel Quality" },
      { to: "/iot", label: "IoT Devices" },
    ],
  },
  {
    title: "Commercial",
    items: [
      { to: "/billing", label: "Billing & Invoices" },
      { to: "/suppliers", label: "Suppliers" },
      { to: "/airlines", label: "Airlines & Aircraft" },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/airports", label: "Airports" },
      { to: "/alerts", label: "Alerts" },
      { to: "/audit", label: "Audit Logs" },
      { to: "/users", label: "Users & Roles" },
      { to: "/settings", label: "System Settings" },
    ],
  },
];

export default function AppShell() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex bg-base-950">
      <aside className="w-64 shrink-0 border-r border-base-700 bg-base-900 flex flex-col">
        <div className="px-5 py-5 border-b border-base-700">
          <div className="font-display font-semibold text-lg leading-tight text-ink-100">NAC Fuel</div>
          <div className="font-display font-semibold text-lg leading-tight text-amber-400">Management System</div>
          <div className="text-[10px] uppercase tracking-widest text-ink-500 mt-1">National Airports Corporation · PNG</div>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="px-5 mb-1 text-[10px] uppercase tracking-widest text-ink-500 font-medium">{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-5 py-2 text-sm border-l-2 transition-colors ${
                      isActive
                        ? "border-amber-400 text-ink-100 bg-base-800"
                        : "border-transparent text-ink-300 hover:bg-base-800 hover:text-ink-100"
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="px-5 py-4 border-t border-base-700">
          <div className="text-sm text-ink-100">{user?.fullName}</div>
          <div className="text-xs text-ink-500 mb-3 capitalize">{user?.role.replace(/_/g, " ")}</div>
          <button
            className="btn-ghost text-xs w-full justify-start px-0"
            onClick={() => {
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-6 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
