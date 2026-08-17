import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, LineChart, Line } from "recharts";
import { api } from "../api/client";
import StatCard from "../components/StatCard";
import AirportBeacon, { statusFromTank } from "../components/AirportBeacon";
import { Airport } from "../types";

interface NationalDashboardData {
  totalNationalStock: number;
  fuelReceivedToday: number;
  fuelUpliftedToday: number;
  revenueToday: number;
  lowStockAirports: { id: string; name: string; code: string; tank_code: string; current_level: number; capacity: number; minimum_stock: number }[];
  openIncidents: number;
  maintenanceDue: number;
  outstandingInvoices: { cnt: number; total: number };
  inventoryVarianceAlerts: number;
  monthlyConsumption: { month: string; total: number }[];
  airportComparison: { name: string; code: string; total_uplift: number }[];
}

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
}

export default function NationalDashboard() {
  const [data, setData] = useState<NationalDashboardData | null>(null);
  const [airports, setAirports] = useState<Airport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<{ data: NationalDashboardData }>("/reports/dashboard/national"),
      api.get<{ data: Airport[] }>("/airports"),
    ])
      .then(([dash, ap]) => {
        setData(dash.data);
        setAirports(ap.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-ink-500">Loading national dashboard…</div>;
  if (error) return <div className="text-signal-red">{error}</div>;
  if (!data) return null;

  const lowStockCodes = new Set(data.lowStockAirports.map((a) => a.code));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">National Dashboard</h1>
        <p className="text-sm text-ink-500">Fleet-wide fuel operations across the NAC airport network</p>
      </div>

      {/* Airport status beacon strip — signature element evoking runway edge lighting */}
      <div className="panel p-4">
        <div className="text-xs uppercase tracking-wide text-ink-500 mb-3">Airport Network Status</div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          {airports.map((a) => (
            <Link key={a.id} to="/airport" className="hover:opacity-80 transition-opacity">
              <AirportBeacon
                status={a.status === "inactive" ? "grey" : lowStockCodes.has(a.code) ? "red" : "green"}
                label={`${a.code} · ${a.name}`}
              />
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total National Stock" value={`${fmt(data.totalNationalStock)} L`} accent="default" />
        <StatCard label="Received Today" value={`${fmt(data.fuelReceivedToday)} L`} accent="green" />
        <StatCard label="Uplifted Today" value={`${fmt(data.fuelUpliftedToday)} L`} accent="amber" />
        <StatCard label="Revenue Today" value={`K ${fmt(data.revenueToday)}`} accent="green" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Low-Stock Airports" value={String(data.lowStockAirports.length)} accent={data.lowStockAirports.length ? "red" : "default"} />
        <StatCard label="Open Incidents" value={String(data.openIncidents)} accent={data.openIncidents ? "red" : "default"} />
        <StatCard label="Maintenance Due (7d)" value={String(data.maintenanceDue)} accent={data.maintenanceDue ? "amber" : "default"} />
        <StatCard label="Variance Alerts" value={String(data.inventoryVarianceAlerts)} accent={data.inventoryVarianceAlerts ? "red" : "default"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="panel p-5">
          <div className="text-sm font-medium text-ink-100 mb-4">Airport Comparison — Total Uplift (L)</div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data.airportComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2438" />
              <XAxis dataKey="code" stroke="#8A97AC" fontSize={12} />
              <YAxis stroke="#8A97AC" fontSize={12} />
              <Tooltip contentStyle={{ background: "#121A2B", border: "1px solid #223049", borderRadius: 8 }} labelStyle={{ color: "#E8EDF5" }} />
              <Bar dataKey="total_uplift" fill="#F5A623" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="panel p-5">
          <div className="text-sm font-medium text-ink-100 mb-4">Monthly Consumption Trend (L)</div>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={[...data.monthlyConsumption].reverse()}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1A2438" />
              <XAxis dataKey="month" stroke="#8A97AC" fontSize={12} />
              <YAxis stroke="#8A97AC" fontSize={12} />
              <Tooltip contentStyle={{ background: "#121A2B", border: "1px solid #223049", borderRadius: 8 }} labelStyle={{ color: "#E8EDF5" }} />
              <Line type="monotone" dataKey="total" stroke="#2DD4A7" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {data.lowStockAirports.length > 0 && (
        <div className="panel p-5">
          <div className="text-sm font-medium text-ink-100 mb-3">Airports Requiring Attention</div>
          <div className="space-y-2">
            {data.lowStockAirports.map((a, i) => (
              <div key={i} className="flex items-center justify-between text-sm py-2 border-b border-base-700 last:border-0">
                <AirportBeacon status="red" label={`${a.code} — ${a.tank_code}`} />
                <span className="data-mono text-ink-300">{fmt(a.current_level)} L / min {fmt(a.minimum_stock)} L</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
