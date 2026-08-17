interface Props {
  label: string;
  value: string;
  sublabel?: string;
  accent?: "amber" | "green" | "red" | "default";
}

const accentClasses: Record<string, string> = {
  amber: "text-amber-400",
  green: "text-signal-green",
  red: "text-signal-red",
  default: "text-ink-100",
};

export default function StatCard({ label, value, sublabel, accent = "default" }: Props) {
  return (
    <div className="panel p-5">
      <div className="text-xs uppercase tracking-wide text-ink-500 mb-2">{label}</div>
      <div className={`font-data text-2xl font-semibold ${accentClasses[accent]}`}>{value}</div>
      {sublabel && <div className="text-xs text-ink-500 mt-1">{sublabel}</div>}
    </div>
  );
}
