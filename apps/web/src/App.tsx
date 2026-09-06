import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import AppShell from "./components/AppShell";
import Login from "./pages/Login";
import FleetDashboard from "./pages/FleetDashboard";
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
        <Route path="/vehicles" element={<Vehicles />} />
        <Route path="/drivers" element={<Drivers />} />
        <Route path="/fleet-allocations" element={<VehicleAllocations />} />
        <Route path="/fleet-fuel" element={<VehicleFuelLogs />} />
        <Route path="/fleet-trips" element={<VehicleTrips />} />
        <Route path="/fleet-inspections" element={<VehicleInspections />} />
        <Route path="/fleet-maintenance" element={<VehicleMaintenance />} />

        <Route path="/alerts" element={<Alerts />} />
        <Route path="/audit" element={<AuditLog />} />
        <Route path="/users" element={<Users />} />
        <Route path="/settings" element={<Settings />} />
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
