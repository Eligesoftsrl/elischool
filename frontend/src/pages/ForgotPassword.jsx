import { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [link, setLink] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setLink(data.mock_reset_link || true);
      toast.success("Se l'email esiste, riceverai un link per reimpostare la password.");
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
        <h1 className="font-display text-3xl font-bold tracking-tight text-stone-900">Password dimenticata?</h1>
        <p className="mt-2 text-stone-500">Inseriremo un link di reset valido un'ora.</p>

        <form onSubmit={onSubmit} className="mt-6 bg-white border border-stone-200 rounded-3xl p-6 tactile">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@esempio.it"
              className="w-full pl-12 pr-4 h-14 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
              data-testid="forgot-email-input"
            />
          </div>
          <button
            disabled={busy}
            type="submit"
            className="mt-4 w-full h-14 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold tap-press"
            data-testid="forgot-submit-button"
          >
            {busy ? "Invio..." : "Invia link di reset"}
          </button>

          {link && typeof link === "string" && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs">
              <p className="font-semibold text-amber-800 mb-1">Email mock - link di reset:</p>
              <a className="text-amber-700 break-all underline" href={link} data-testid="forgot-mock-link">{link}</a>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
