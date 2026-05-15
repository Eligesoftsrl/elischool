import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Heart, Calendar, Camera, MessageCircle } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#FDFBF7] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#FFB38A]/30 blur-3xl" />
      <div className="pointer-events-none absolute top-1/4 -right-24 h-[28rem] w-[28rem] rounded-full bg-[#A2D2FF]/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#FDE68A]/30 blur-3xl" />

      <div className="relative max-w-6xl mx-auto px-5 pt-10 pb-20">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2 font-display text-lg font-bold text-stone-900">
            <span className="h-9 w-9 rounded-2xl bg-[#FF8C6B] flex items-center justify-center shadow-sm">
              <Heart className="h-5 w-5 text-white" fill="white" />
            </span>
            <span>nido<span className="text-brand">.</span></span>
          </div>
          <Link
            to="/login"
            className="h-11 px-5 rounded-2xl bg-stone-900 text-white text-sm font-semibold flex items-center gap-2 tap-press"
            data-testid="landing-login-button"
          >
            Accedi <ArrowRight className="h-4 w-4" />
          </Link>
        </header>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mt-16 max-w-3xl"
        >
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 border border-stone-200 text-xs font-semibold text-stone-600">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> La giornata del tuo bambino, raccontata con cura
          </span>
          <h1 className="mt-5 font-display text-5xl md:text-7xl font-bold tracking-[-0.03em] text-stone-900 leading-[1.05]">
            Una scuola dell'infanzia<br />
            <span className="text-brand">vicina</span>, ogni giorno.
          </h1>
          <p className="mt-6 text-lg md:text-xl text-stone-600 max-w-2xl leading-relaxed">
            Maestre, alunni e genitori: una sola app, leggera come una carezza.
            Pensata per il telefono che hai in tasca, costruita per la fiducia che meriti.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              to="/login"
              className="h-14 px-7 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-base tap-press flex items-center gap-2 shadow-sm"
              data-testid="landing-start-button"
            >
              Entra ora <ArrowRight className="h-5 w-5" />
            </Link>
            <a
              href="#features"
              className="h-14 px-7 rounded-2xl bg-white border border-stone-200 text-stone-800 font-semibold text-base tap-press"
            >
              Scopri di più
            </a>
          </div>
        </motion.div>

        <div id="features" className="mt-24 grid md:grid-cols-3 gap-5">
          {[
            { i: <Calendar className="h-5 w-5" />, t: "Anno scolastico", d: "Passaggio classi con un click. Gestisci più anni senza paura.", c: "#FDE68A" },
            { i: <MessageCircle className="h-5 w-5" />, t: "Report AI giornaliero", d: "Un riassunto in italiano della giornata: caldo, naturale, mai freddo.", c: "#A7D7C5" },
            { i: <Camera className="h-5 w-5" />, t: "Famiglie tranquille", d: "I genitori vedono solo il proprio figlio. Accesso sicuro e privato.", c: "#A2D2FF" },
          ].map((f, idx) => (
            <motion.div
              key={f.t}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * idx + 0.2 }}
              className="bg-white border border-stone-200 rounded-3xl p-7 tactile"
            >
              <div
                className="h-12 w-12 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: f.c }}
              >
                {f.i}
              </div>
              <h3 className="font-display text-xl font-bold text-stone-900">{f.t}</h3>
              <p className="mt-2 text-stone-600 leading-relaxed">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
