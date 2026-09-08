import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import FleetDashboard from "./pages/FleetDashboard";
import DivisionConsumption from "./pages/DivisionConsumption";
import Vehicles from "./pages/Vehicles";
import Drivers from "./pages/Drivers";
import VehicleAllocations from "./pages/VehicleAllocations";
import VehicleFuelLogs from "./pages/VehicleFuelLogs";
import VehicleTrips from "./pages/VehicleTrips";
import VehicleInspections from "./pages/VehicleInspections";
import VehicleMaintenance from "./pages/VehicleMaintenance";

import Alerts from "./pages/Alerts";
import AuditLog from "./pages/AuditLog";
import Users from "./pages/Users";
import Settings from "./pages/Settings";

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function RequireAdmin({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-ink-500">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to="/fleet" replace />;
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
        <Route path="/" element={<Navigate to="/fleet" replace />} />
        <Route path="/fleet" element={<FleetDashboard />} />
        <Route path="/fleet-consumption" element={<DivisionConsumption />} />
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/fleet-allocations" element={<VehicleAllocations />} />
        <Route path="/fleet-fuel" element={<VehicleFuelLogs />} />
        <Route path="/fleet-trips" element={<VehicleTrips />} />
        <Route path="/fleet-inspections" element={<VehicleInspections />} />
        <Route path="/fleet-maintenance" element={<VehicleMaintenance />} />

        <Route path="/alerts" element={<RequireAdmin><Alerts /></RequireAdmin>} />
        <Route path="/audit" element={<RequireAdmin><AuditLog /></RequireAdmin>} />
        <Route path="/users" element={<RequireAdmin><Users /></RequireAdmin>} />
        <Route path="/settings" element={<RequireAdmin><Settings /></RequireAdmin>} />
      </Route>
      <Route path="*" element={<Navigate to="/fleet" replace />} />
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
