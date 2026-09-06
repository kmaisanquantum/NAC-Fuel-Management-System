import { useEffect, useState } from "react";
import { api } from "../api/client";

interface Device { id: string; asset_type: string; device_type: string; status: string; airport_id: string; }

export default function IoTDevices() {
  const [devices, setDevices] = useState<Device[]>([]);
  useEffect(() => { api.get<{ data: Device[] }>("/iot/devices").then((r) => setDevices(r.data)); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">IoT Devices</h1>
        <p className="text-sm text-ink-500">Simulated telemetry for the MVP — see IOT_INTEGRATION.md for the production architecture</p>
      </div>
      <div className="panel p-4 text-sm text-ink-500 bg-amber-400/5 border-amber-400/20">
        TODO / FUTURE INTEGRATION: live MQTT ingestion via IoT Gateway → Message Broker → Telemetry Service. This screen currently reflects simulated device readings seeded for demonstration.
      </div>
      <div className="grid md:grid-cols-3 gap-4">
        {devices.map((d) => (
          <div key={d.id} className="panel p-4">
            <div className="text-ink-100 font-medium capitalize">{d.device_type.replace(/_/g, " ")}</div>
            <div className="text-xs text-ink-500 mt-1 capitalize">Attached to {d.asset_type}</div>
            <div className="text-xs mt-2"><span className="badge bg-signal-green/15 text-signal-green">{d.status}</span></div>
          </div>
        ))}
        {devices.length === 0 && <div className="text-ink-500 col-span-3 text-center py-8">No IoT devices registered.</div>}
      </div>
    </div>
  );
}
