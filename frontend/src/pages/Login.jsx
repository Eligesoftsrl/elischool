import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, Mail, Lock, ArrowRight, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { apiErrorMessage } from "@/lib/api";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      toast.success(`Benvenuta/o, ${u.first_name || u.name || ""}`);
      nav(u.role === "parent" ? "/g" : "/s", { replace: true });
    } catch (err) {
      toast.error(apiErrorMessage(err, "Accesso non riuscito"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#FDFBF7] flex items-center justify-center px-5 py-10">
      {/* Soft background blobs */}
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#FFB38A]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#A2D2FF]/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/3 right-1/4 h-72 w-72 rounded-full bg-[#FDE68A]/30 blur-3xl" />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: "easeOut" }}
        className="relative w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-stone-200 text-xs font-semibold text-stone-600 mb-5">
            <span className="h-2 w-2 rounded-full bg-brand pulse-dot" />
            Scuola dell'infanzia
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-stone-900">
            Bentornati
          </h1>
          <p className="mt-2 text-stone-500 text-base">
            Accedi al tuo spazio dedicato.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          className="bg-white/90 backdrop-blur border border-stone-200 rounded-[2rem] p-6 tactile"
          data-testid="login-form"
        >
          <label className="block mb-4">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Email</span>
            <div className="mt-2 relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tuanome@esempio.it"
                className="w-full pl-12 pr-4 h-14 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-base"
                data-testid="login-email-input"
              />
            </div>
          </label>

          <label className="block mb-2">
            <span className="text-xs font-bold text-stone-500 uppercase tracking-wider">Password</span>
            <div className="mt-2 relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
              <input
                type={show ? "text" : "password"}
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-12 pr-12 h-14 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 focus:border-brand text-base"
                data-testid="login-password-input"
              />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl text-stone-400 hover:text-stone-700 hover:bg-stone-100 flex items-center justify-center"
                data-testid="login-toggle-password"
              >
                {show ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </label>

          <div className="text-right -mt-1 mb-5">
            <Link to="/forgot-password" className="text-sm font-semibold text-stone-500 hover:text-brand" data-testid="login-forgot-link">
              Password dimenticata?
            </Link>
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full h-14 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] disabled:opacity-60 text-white font-semibold text-base tap-press transition-all shadow-sm flex items-center justify-center gap-2"
            data-testid="login-submit-button"
          >
            {busy ? "Accesso..." : "Entra"}
            {!busy && <ArrowRight className="h-5 w-5" />}
          </button>

          <div className="mt-6 pt-5 border-t border-stone-100 text-center text-xs text-stone-500 leading-relaxed">
            <Sparkles className="h-3.5 w-3.5 inline-block mr-1 text-amber-400" />
            L'app è ottimizzata per smartphone e tablet.
          </div>
        </form>

        <div className="text-center mt-5 text-xs text-stone-400">
          <Link to="/" className="hover:text-stone-700">← Torna alla home</Link>
          <span className="mx-2">·</span>
          <Link to="/iscrizione" className="hover:text-brand font-semibold" data-testid="login-enrollment-link">
            Iscrivi tuo figlio
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
