import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import NationalDashboard from "./pages/NationalDashboard";
import AirportDashboard from "./pages/AirportDashboard";
import Receipts from "./pages/Receipts";
import Transfers from "./pages/Transfers";
import Uplifts from "./pages/Uplifts";
import Inventory from "./pages/Inventory";
import ReconciliationPage from "./pages/Reconciliation";
import Tanks from "./pages/Tanks";
import Refuellers from "./pages/Refuellers";
import Billing from "./pages/Billing";
import Suppliers from "./pages/Suppliers";
import Airlines from "./pages/Airlines";
import Airports from "./pages/Airports";
import Alerts from "./pages/Alerts";
import AuditLog from "./pages/AuditLog";
import Quality from "./pages/Quality";
import Maintenance from "./pages/Maintenance";
import Users from "./pages/Users";
import IoTDevices from "./pages/IoTDevices";
import MapView from "./pages/MapView";
import Settings from "./pages/Settings";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <RequireAuth>
            <AppShell />
          </RequireAuth>
        }
      >
        <Route path="/" element={<Navigate to="/national" replace />} />
        <Route path="/national" element={<NationalDashboard />} />
        <Route path="/airport" element={<AirportDashboard />} />
        <Route path="/map" element={<MapView />} />
        <Route path="/receipts" element={<Receipts />} />
        <Route path="/transfers" element={<Transfers />} />
        <Route path="/uplifts" element={<Uplifts />} />
        <Route path="/inventory" element={<Inventory />} />
        <Route path="/reconciliation" element={<ReconciliationPage />} />
        <Route path="/tanks" element={<Tanks />} />
        <Route path="/refuellers" element={<Refuellers />} />
        <Route path="/maintenance" element={<Maintenance />} />
        <Route path="/quality" element={<Quality />} />
        <Route path="/iot" element={<IoTDevices />} />
        <Route path="/billing" element={<Billing />} />
        <Route path="/suppliers" element={<Suppliers />} />
        <Route path="/airlines" element={<Airlines />} />
        <Route path="/airports" element={<Airports />} />
        <Route path="/alerts" element={<Alerts />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/national" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
