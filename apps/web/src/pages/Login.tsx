import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("admin@dspng.tech");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await login(email, password);
      navigate("/national");
    } catch (err: any) {
      setError(err.message || "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-950 relative overflow-hidden">
      {/* Ambient instrument-panel glow, signature element */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full bg-amber-400/5 blur-[120px]" />
      </div>

      <div className="relative w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full border-2 border-amber-400 flex items-center justify-center">
            <span className="beacon beacon-green" />
          </div>
          <h1 className="font-display text-xl font-semibold text-ink-100">NAC Fuel Management System</h1>
          <p className="text-xs text-ink-500 mt-1 uppercase tracking-widest">National Airports Corporation · Papua New Guinea</p>
        </div>

        <form onSubmit={handleSubmit} className="panel p-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          {error && <div className="text-sm text-signal-red">{error}</div>}
          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <div className="text-xs text-ink-500 pt-2 border-t border-base-600">
            Demo accounts: <span className="font-data">admin@dspng.tech</span> or <span className="font-data">user@dspng.tech</span> / <span className="font-data">Admin@123!</span>
            <br />DEMO / NOT REAL NAC DATA
          </div>
        </form>
      </div>
    </div>
  );
}
