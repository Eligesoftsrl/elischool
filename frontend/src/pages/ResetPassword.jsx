import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Lock, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";

function passwordChecks(p) {
  return {
    length: p.length >= 8,
    upper: /[A-Z]/.test(p),
    lower: /[a-z]/.test(p),
    digit: /\d/.test(p),
  };
}

export default function ResetPassword() {
  const { token } = useParams();
  const nav = useNavigate();
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  const checks = passwordChecks(pwd);
  const allOk = Object.values(checks).every(Boolean) && pwd === pwd2;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!allOk) return;
    setBusy(true);
    try {
      await api.post("/auth/reset-password", { token, password: pwd });
      toast.success("Password aggiornata. Ora puoi accedere.");
      nav("/login", { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link to="/login" className="inline-flex items-center text-sm text-stone-500 hover:text-brand mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Torna al login
        </Link>
        <h1 className="font-display text-3xl font-bold text-stone-900">Reimposta password</h1>
        <p className="mt-2 text-stone-500">Scegli una nuova password sicura.</p>

        <form onSubmit={onSubmit} className="mt-6 bg-white border border-stone-200 rounded-3xl p-6 tactile space-y-4">
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="password" required value={pwd} onChange={(e) => setPwd(e.target.value)}
              placeholder="Nuova password"
              className="w-full pl-12 pr-4 h-14 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
              data-testid="reset-pwd-input"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="password" required value={pwd2} onChange={(e) => setPwd2(e.target.value)}
              placeholder="Conferma password"
              className="w-full pl-12 pr-4 h-14 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
              data-testid="reset-pwd2-input"
            />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              ["length", "Almeno 8 caratteri"],
              ["upper", "Una maiuscola"],
              ["lower", "Una minuscola"],
              ["digit", "Un numero"],
            ].map(([k, label]) => (
              <div key={k} className={`px-3 py-2 rounded-xl ${checks[k] ? "bg-emerald-50 text-emerald-700" : "bg-stone-50 text-stone-500"}`}>
                {checks[k] ? "✓" : "○"} {label}
              </div>
            ))}
          </div>

          <button
            type="submit"
            disabled={!allOk || busy}
            className="w-full h-14 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] disabled:opacity-50 text-white font-semibold tap-press"
            data-testid="reset-submit-button"
          >
            {busy ? "Salvataggio..." : "Aggiorna password"}
          </button>
        </form>
      </div>
    </div>
  );
}
