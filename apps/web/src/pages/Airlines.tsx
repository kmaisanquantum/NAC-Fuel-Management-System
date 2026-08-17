import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Airline { id: string; name: string; iata_code: string | null; }
interface AircraftT { id: string; registration: string; aircraft_type: string | null; airline_id: string; }

export default function Airlines() {
  const [airlines, setAirlines] = useState<Airline[]>([]);
  const [aircraft, setAircraft] = useState<AircraftT[]>([]);

  useEffect(() => {
    api.get<{ data: Airline[] }>("/airlines").then((r) => setAirlines(r.data));
    api.get<{ data: AircraftT[] }>("/aircraft").then((r) => setAircraft(r.data));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">Airlines & Aircraft</h1>
        <p className="text-sm text-ink-500">Customer fleet registry</p>
      </div>
      <div className="space-y-4">
        {airlines.map((al) => (
          <div key={al.id} className="panel p-5">
            <div className="text-ink-100 font-medium mb-3">{al.name} <span className="text-ink-500 font-normal">({al.iata_code})</span></div>
            <div className="flex flex-wrap gap-2">
              {aircraft.filter((ac) => ac.airline_id === al.id).map((ac) => (
                <span key={ac.id} className="badge bg-base-700 text-ink-300 data-mono">{ac.registration} · {ac.aircraft_type}</span>
              ))}
            </div>
          </div>
        ))}
        {airlines.length === 0 && <div className="text-ink-500 text-center py-8">No airlines found.</div>}
      </div>
    </div>
  );
}
