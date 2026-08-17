const STYLES: Record<string, string> = {
  draft: "bg-base-600 text-ink-300",
  submitted: "bg-amber-400/15 text-amber-400",
  verified: "bg-amber-400/15 text-amber-400",
  approved: "bg-signal-green/15 text-signal-green",
  posted: "bg-signal-green/15 text-signal-green",
  completed: "bg-signal-green/15 text-signal-green",
  pending: "bg-base-600 text-ink-300",
  pending_approval: "bg-amber-400/15 text-amber-400",
  investigation_required: "bg-signal-red/15 text-signal-red",
  reconciled: "bg-signal-green/15 text-signal-green",
  open: "bg-signal-red/15 text-signal-red",
  in_progress: "bg-amber-400/15 text-amber-400",
  resolved: "bg-signal-green/15 text-signal-green",
  issued: "bg-amber-400/15 text-amber-400",
  paid: "bg-signal-green/15 text-signal-green",
  overdue: "bg-signal-red/15 text-signal-red",
  active: "bg-signal-green/15 text-signal-green",
  maintenance: "bg-amber-400/15 text-amber-400",
  offline: "bg-signal-red/15 text-signal-red",
  critical: "bg-signal-red/15 text-signal-red",
  warning: "bg-amber-400/15 text-amber-400",
};

export default function StatusBadge({ status }: { status: string }) {
  const cls = STYLES[status] || "bg-base-600 text-ink-300";
  return <span className={`badge ${cls}`}>{status.replace(/_/g, " ")}</span>;
}
