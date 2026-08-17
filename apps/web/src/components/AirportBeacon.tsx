type Status = "green" | "yellow" | "red" | "grey";

export function statusFromTank(currentLevel: number, capacity: number, minStock: number): Status {
  if (capacity === 0) return "grey";
  const pct = currentLevel / capacity;
  if (currentLevel <= minStock) return "red";
  if (pct < 0.25) return "yellow";
  return "green";
}

export default function AirportBeacon({ status, label }: { status: Status; label?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`beacon beacon-${status}`} />
      {label && <span className="text-sm text-ink-300">{label}</span>}
    </span>
  );
}
