import { useEffect, useState } from "react";
import { Airport } from "../types";
import { api } from "../api/client";
import AirportBeacon from "../components/AirportBeacon";

export default function MapView() {
  const [airports, setAirports] = useState<Airport[]>([]);
  useEffect(() => { api.get<{ data: Airport[] }>("/airports").then((r) => setAirports(r.data)); }, []);

  // Simple lat/lng-plotted overview (no external map tiles / API key required for the MVP).
  const lats = airports.map((a) => a.latitude || 0);
  const lngs = airports.map((a) => a.longitude || 0);
  const minLat = Math.min(...lats, -10), maxLat = Math.max(...lats, -1);
  const minLng = Math.min(...lngs, 140), maxLng = Math.max(...lngs, 156);

  function pos(a: Airport) {
    const x = ((a.longitude! - minLng) / (maxLng - minLng)) * 100;
    const y = ((a.latitude! - minLat) / (maxLat - minLat)) * 100;
    return { left: `${x}%`, top: `${100 - y}%` };
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Map View</h1>
        <p className="text-sm text-ink-500">Airport network status — Papua New Guinea</p>
      </div>
      <div className="panel p-8 relative h-[480px] overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(245,166,35,0.04),transparent_60%)]" />
        {airports.map((a) => (
          <div key={a.id} className="absolute -translate-x-1/2 -translate-y-1/2 group" style={pos(a)}>
            <AirportBeacon status={a.status === "active" ? "green" : "grey"} />
            <div className="absolute left-1/2 -translate-x-1/2 mt-1 text-[10px] text-ink-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
              {a.code}
            </div>
          </div>
        ))}
      </div>
      <div className="text-xs text-ink-500">Green = Normal · Yellow = Warning · Red = Critical · Grey = Offline. Selecting an airport (see Airport Dashboard) opens its fuel operations view.</div>
    </div>
  );
}
