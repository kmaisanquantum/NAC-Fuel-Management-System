import { useEffect, useState } from "react";
import { api } from "../api/client";
import { DivisionConsumption, DailyMileage } from "../types";

export default function DivisionConsumptionPage() {
  const [data, setData] = useState<DivisionConsumption[]>([]);
  const [dailyData, setDailyData] = useState<DailyMileage[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  function setThisWeek() {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    setFrom(d.toISOString().slice(0, 10));
    setTo(new Date().toISOString().slice(0, 10));
  }

  function setThisMonth() {
    const d = new Date();
    d.setDate(d.getDate() - 29);
    setFrom(d.toISOString().slice(0, 10));
    setTo(new Date().toISOString().slice(0, 10));
  }

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<{ data: DivisionConsumption[] }>(`/fleet-analytics/division-consumption?from=${from}&to=${to}`),
      api.get<{ data: DailyMileage[] }>(`/fleet-analytics/division-mileage-daily?from=${from}&to=${to}`)
    ])
      .then(([resConsumption, resDaily]) => {
        setData(resConsumption.data || []);
        setDailyData(resDaily.data || []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [from, to]);

  const topDivision = [...data].sort((a, b) => b.totalFuelCost - a.totalFuelCost)[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-ink-100">Division Consumption & Mileage Analysis</h1>
          <p className="text-sm text-ink-400">Refuelling frequency, total fuel consumed, and mileage comparisons per department</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={setThisWeek} className="btn-secondary text-xs">This Week</button>
          <button type="button" onClick={setThisMonth} className="btn-secondary text-xs">This Month</button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="panel p-4 flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <label className="text-ink-400 font-medium">From:</label>
          <input type="date" className="input text-xs py-1" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-ink-400 font-medium">To:</label>
          <input type="date" className="input text-xs py-1" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        {topDivision && (
          <div className="ml-auto text-xs text-ink-300">
            Highest Consumer: <span className="font-semibold text-amber-400">{topDivision.department}</span> (K{topDivision.totalFuelCost.toLocaleString()})
          </div>
        )}
      </div>

      {loading ? (
        <div className="p-4 text-ink-400">Loading Division Analytics…</div>
      ) : (
        <>
          {/* Summary Table */}
          <div className="panel overflow-hidden">
            <div className="p-4 border-b border-base-700 font-display font-semibold text-ink-100">
              Departmental Summary
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-700 bg-base-900/50 text-left text-xs uppercase tracking-wider text-ink-400">
                    <th className="p-3">Division / Department</th>
                    <th className="p-3 text-right">Vehicles</th>
                    <th className="p-3 text-right">Refuel Count</th>
                    <th className="p-3 text-right">Total Litres</th>
                    <th className="p-3 text-right">Fuel Cost (PGK)</th>
                    <th className="p-3 text-right">Distance (km)</th>
                    <th className="p-3 text-right">Avg Refuels / Vehicle</th>
                    <th className="p-3 text-right">Km / Vehicle</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-700/50 text-ink-300">
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-4 text-center text-ink-500">No consumption data found for the selected date range.</td>
                    </tr>
                  ) : (
                    data.map((row) => {
                      const avgRefuels = row.vehicleCount > 0 ? (row.refuelCount / row.vehicleCount).toFixed(1) : "0";
                      const kmPerVehicle = row.vehicleCount > 0 ? (row.totalKm / row.vehicleCount).toFixed(0) : "0";
                      const isTop = topDivision && topDivision.department === row.department;

                      return (
                        <tr key={row.department} className={`hover:bg-base-800/50 ${isTop ? "bg-amber-400/5" : ""}`}>
                          <td className="p-3 font-semibold text-ink-100 flex items-center gap-2">
                            {row.department}
                            {isTop && <span className="text-[10px] bg-amber-400/20 text-amber-400 px-1.5 py-0.5 rounded font-normal">Top Consumer</span>}
                          </td>
                          <td className="p-3 text-right font-data">{row.vehicleCount}</td>
                          <td className="p-3 text-right font-data font-semibold text-ink-100">{row.refuelCount}</td>
                          <td className="p-3 text-right font-data">{row.totalLitres.toLocaleString()} L</td>
                          <td className="p-3 text-right font-data text-amber-400 font-semibold">K{row.totalFuelCost.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                          <td className="p-3 text-right font-data text-ink-100 font-semibold">{row.totalKm.toLocaleString()} km</td>
                          <td className="p-3 text-right font-data">{avgRefuels}</td>
                          <td className="p-3 text-right font-data">{kmPerVehicle} km</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily Mileage Breakdown Table */}
          <div className="panel overflow-hidden">
            <div className="p-4 border-b border-base-700 font-display font-semibold text-ink-100">
              Daily Mileage Breakdown (km)
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-base-700 bg-base-900/50 text-left text-xs uppercase tracking-wider text-ink-400">
                    <th className="p-3">Date</th>
                    <th className="p-3">Division</th>
                    <th className="p-3 text-right">Distance Travelled (km)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-base-700/50 text-ink-300">
                  {dailyData.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-4 text-center text-ink-500">No daily trip records found for the selected date range.</td>
                    </tr>
                  ) : (
                    dailyData.map((d, idx) => (
                      <tr key={`${d.department}-${d.date}-${idx}`} className="hover:bg-base-800/50">
                        <td className="p-3 font-data text-ink-400">{d.date}</td>
                        <td className="p-3 font-medium text-ink-100">{d.department}</td>
                        <td className="p-3 text-right font-data text-amber-400 font-semibold">{d.totalKm.toLocaleString()} km</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
