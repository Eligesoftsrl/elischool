import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, Globe, Smartphone, UtensilsCrossed, Bed, Camera } from "lucide-react";
import { COMPANY } from "@/config/site";

const CHIPS = [
  { icon: <UtensilsCrossed className="h-4 w-4" />, bg: "#F2A65A", title: "Pappa", text: "Ha mangiato tutto", pos: "left-0 sm:-left-6 top-6", delay: 0.6 },
  { icon: <Bed className="h-4 w-4" />, bg: "#8B7FD4", title: "Nanna", text: "13:10 – 14:45", pos: "right-0 sm:-right-4 top-1/3", delay: 0.85 },
  { icon: <Camera className="h-4 w-4" />, bg: "#2F7D6D", title: "Nuova foto", text: "Laboratorio di pittura", pos: "left-4 sm:left-10 bottom-2", delay: 1.1 },
];

export function HeroSection() {
  return (
    <section id="hero" className="relative">
      <div className="pointer-events-none absolute -top-32 -left-24 h-[28rem] w-[28rem] rounded-full bg-[#F2A65A]/25 blur-3xl blob-drift" />
      <div className="pointer-events-none absolute top-1/4 -right-32 h-[32rem] w-[32rem] rounded-full bg-brand/15 blur-3xl blob-drift [animation-delay:-6s]" />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 h-96 w-96 rounded-full bg-[#FBEBA8]/50 blur-3xl blob-drift [animation-delay:-12s]" />

      <div className="relative max-w-7xl mx-auto px-5 sm:px-8 pt-10 md:pt-16 pb-16 lg:pb-24 grid lg:grid-cols-12 gap-10 lg:gap-6 items-center">
        <motion.div className="lg:col-span-6" initial="hidden" animate="show"
          variants={{ show: { transition: { staggerChildren: 0.1 } } }}>
          <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-[#E2DED6] text-xs font-semibold text-stone-600">
            <span className="h-2 w-2 rounded-full bg-brand pulse-dot" /> La giornata del tuo bambino, raccontata con cura
          </motion.span>
          <motion.h1 variants={fadeUp} className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-stone-800 leading-[1.05]">
            Un passo dopo l'altro,{" "}
            <span className="relative inline-block text-brand">
              cresciamo insieme.
              <svg aria-hidden viewBox="0 0 300 18" className="absolute left-0 -bottom-2 w-full h-3" preserveAspectRatio="none">
                <motion.path d="M2 12 C 70 2, 150 18, 298 6" fill="none" stroke="#F2A65A" strokeWidth="5" strokeLinecap="round"
                  initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.7, duration: 0.9, ease: "easeOut" }} />
              </svg>
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="mt-7 max-w-xl text-stone-600 text-base sm:text-lg leading-relaxed">
            Tiptii è l'app per asilo nido e scuola dell'infanzia 0–6 anni: diario giornaliero, presenze,
            mensa e comunicazioni scuola-famiglia in un unico posto. Maestre, bambini e famiglie connessi ogni giorno, dal telefono che hai in tasca.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-9 flex flex-wrap items-center gap-3">
            <a href={`mailto:${COMPANY.email}?subject=Richiesta%20demo%20Tiptii`}
              className="group h-14 px-7 rounded-full bg-brand hover:bg-brand-hover text-white text-base font-bold flex items-center gap-2 shadow-xl shadow-brand/25 transition-[background-color,transform] hover:-translate-y-0.5"
              data-testid="hero-primary-cta">
              Richiedi una demo <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#come-funziona" className="h-14 px-7 rounded-full bg-white/90 border border-[#E2DED6] hover:bg-white text-stone-800 text-base font-semibold flex items-center transition-transform hover:-translate-y-0.5"
              data-testid="hero-secondary-cta">
              Guarda come funziona
            </a>
          </motion.div>
          <motion.div variants={fadeUp} className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs sm:text-sm text-stone-600">
            <Trust icon={<ShieldCheck className="h-4 w-4" />} label="Foto cifrate AES-256" />
            <Trust icon={<Globe className="h-4 w-4" />} label="100% italiano" />
            <Trust icon={<Smartphone className="h-4 w-4" />} label="Pensata per smartphone" />
          </motion.div>
        </motion.div>

        <div className="lg:col-span-6 relative">
          <motion.div initial={{ opacity: 0, scale: 0.92, rotate: -2 }} animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }} className="relative">
            <motion.img src="/illustrations/hero.webp" width="1200" height="797" fetchpriority="high"
              alt="Illustrazione di bambini che giocano con la maestra lungo un sentiero di piccole impronte colorate"
              className="w-full h-auto drop-shadow-[0_30px_40px_rgba(47,125,109,0.18)] float-slow" data-testid="hero-illustration" />
          </motion.div>
          {CHIPS.map((c) => (
            <motion.div key={c.title} className={`absolute ${c.pos} hidden sm:flex items-center gap-3 rounded-2xl bg-white/90 backdrop-blur-xl border border-white shadow-xl shadow-stone-900/10 px-3.5 py-2.5`}
              initial={{ opacity: 0, y: 16, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: c.delay, type: "spring", stiffness: 220, damping: 18 }}>
              <span className="h-9 w-9 rounded-xl text-white flex items-center justify-center" style={{ background: c.bg }}>{c.icon}</span>
              <span className="leading-tight">
                <span className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">{c.title}</span>
                <span className="block text-sm font-bold text-stone-800">{c.text}</span>
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

const fadeUp = { hidden: { opacity: 0, y: 22 }, show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } } };

function Trust({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="h-8 w-8 rounded-xl bg-white border border-[#E2DED6] flex items-center justify-center text-brand">{icon}</span>
      {label}
    </span>
  );
}
