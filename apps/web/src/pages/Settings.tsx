export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink-100">System Settings</h1>
        <p className="text-sm text-ink-500">Configurable business rules — see BUSINESS_RULES.md</p>
      </div>
      <div className="panel p-6 space-y-3 text-sm text-ink-300">
        <div className="flex justify-between border-b border-base-700 pb-3"><span>Max allowed reconciliation variance</span><span className="data-mono text-ink-100">0.5%</span></div>
        <div className="flex justify-between border-b border-base-700 pb-3"><span>Default currency</span><span className="data-mono text-ink-100">PGK</span></div>
        <div className="flex justify-between border-b border-base-700 pb-3"><span>Invoice payment terms</span><span className="data-mono text-ink-100">30 days</span></div>
        <div className="flex justify-between border-b border-base-700 pb-3"><span>Calibration period (default)</span><span className="data-mono text-ink-100">12 months</span></div>
        <div className="flex justify-between"><span>Negative inventory allowed</span><span className="data-mono text-signal-red">No (controlled exception only)</span></div>
      </div>
      <div className="panel p-4 text-sm text-ink-500 bg-amber-400/5 border-amber-400/20">
        TODO / FUTURE INTEGRATION: an editable settings UI backed by a business_rules table. Values above are currently read from environment configuration (see .env.example) and documentation, not yet editable in-app.
      </div>
    </div>
  );
}
