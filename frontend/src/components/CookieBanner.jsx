import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Cookie } from "lucide-react";
import { getConsent, setConsent, loadExternalFonts } from "@/lib/consent";

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const c = getConsent();
    if (c === "accepted") loadExternalFonts();
    setOpen(c === null);
    const reopen = () => setOpen(true);
    window.addEventListener("tiptii:cookie-preferences", reopen);
    return () => window.removeEventListener("tiptii:cookie-preferences", reopen);
  }, []);

  const choose = (choice) => { setConsent(choice); setOpen(false); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog" aria-live="polite" aria-label="Preferenze cookie"
          initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 26 }}
          className="fixed z-[100] inset-x-3 bottom-3 sm:inset-x-auto sm:left-5 sm:bottom-5 sm:max-w-md rounded-3xl bg-white/90 backdrop-blur-xl border border-[#E2DED6] shadow-2xl shadow-stone-900/10 p-5"
          data-testid="cookie-banner"
        >
          <div className="flex items-start gap-3">
            <span className="h-11 w-11 shrink-0 rounded-2xl bg-[#FCE3C7] text-[#B8661E] flex items-center justify-center">
              <Cookie className="h-5 w-5" />
            </span>
            <div className="text-sm text-stone-600 leading-relaxed">
              <p className="font-display font-bold text-stone-800 text-base">La tua privacy conta</p>
              <p className="mt-1">
                Usiamo solo cookie tecnici necessari al funzionamento. Con il tuo consenso carichiamo anche i caratteri di
                Google Fonts, che ricevono il tuo indirizzo IP. Nessuna profilazione, nessuna pubblicità.{" "}
                <Link to="/privacy#cookie" className="font-semibold text-brand hover:text-brand-hover underline underline-offset-2" data-testid="cookie-policy-link">
                  Cookie policy
                </Link>
              </p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => choose("rejected")}
              className="h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 text-stone-800 text-sm font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand"
              data-testid="cookie-reject-button">
              Rifiuta
            </button>
            <button type="button" onClick={() => choose("accepted")}
              className="h-12 rounded-2xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-lg shadow-brand/20 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              data-testid="cookie-accept-button">
              Accetta
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
