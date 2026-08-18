import { useState } from "react";
import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
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
  const location = useLocation();
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-base-950">
      {/* Mobile Top Bar */}
      <header className="lg:hidden flex items-center justify-between px-4 py-3 bg-base-900 border-b border-base-700 shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <img src="/nac-mark.png" alt="National Airports Corporation" className="h-8 w-auto" />
          <div className="font-display font-semibold text-base leading-tight text-ink-100">
            NAC Fuel <span className="text-amber-400">Management System</span>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setNavOpen(!navOpen)}
          className="p-2 text-ink-300 hover:text-ink-100 hover:bg-base-800 rounded-md transition-colors"
          aria-label="Toggle navigation menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {navOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </header>

      {/* Mobile Drawer Backdrop */}
      {navOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setNavOpen(false)}
        />
      )}

      {/* Navigation Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 shrink-0 border-r border-base-700 bg-base-900 flex flex-col transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          navOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="px-5 py-5 border-b border-base-700 flex items-center justify-between">
          <div>
            <img src="/nac-logo.png" alt="National Airports Corporation" className="h-10 w-auto mb-2" />
            <div className="font-display font-semibold text-lg leading-tight text-ink-100">NAC Fuel</div>
            <div className="font-display font-semibold text-lg leading-tight text-amber-400">Management System</div>
            <div className="text-[10px] uppercase tracking-widest text-ink-500 mt-1">National Airports Corporation · PNG</div>
          </div>
          <button
            type="button"
            onClick={() => setNavOpen(false)}
            className="lg:hidden text-ink-400 hover:text-ink-100 p-1"
            aria-label="Close navigation menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.title} className="mb-4">
              <div className="px-5 mb-1 text-[10px] uppercase tracking-widest text-ink-500 font-medium">{group.title}</div>
              {group.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setNavOpen(false)}
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
          <div className="text-xs text-ink-500 mb-3 capitalize">{user?.role?.replace(/_/g, " ")}</div>
          <button
            className="btn-ghost text-xs w-full justify-start px-0"
            onClick={() => {
              setNavOpen(false);
              logout();
              navigate("/login");
            }}
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[1400px] mx-auto p-4 lg:p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
