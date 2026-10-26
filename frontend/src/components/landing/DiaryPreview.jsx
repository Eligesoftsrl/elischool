import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { UtensilsCrossed, Bed, Bath, BookOpen, Activity, Heart } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/landing/Reveal";

const ORANGE = "#F2A65A";
const CATS = [
  { id: "pappa", label: "Pappa", icon: UtensilsCrossed, chip: "#F2A65A", tone: "bg-cat-pappa", rows: [
    ["Pranzo", ["Ha mangiato", "Poco", "Non ha mangiato"], 0], ["Merenda", ["Ha mangiato", "Poco", "Non ha mangiato"], 1]],
    note: "Oggi pasta al pomodoro e mela: bis di frutta!" },
  { id: "nanna", label: "Nanna", icon: Bed, chip: "#8B7FD4", tone: "bg-cat-nanna", rows: [
    ["Riposo", ["Ha dormito", "Poco", "Non ha dormito"], 0]], time: ["13:10", "14:45"], note: "Si è addormentata serena con il suo peluche." },
  { id: "igiene", label: "Igiene", icon: Bath, chip: "#2F6BC0", tone: "bg-cat-igiene", rows: [
    ["Cambi", ["Regolare", "Da segnalare"], 0]], note: "3 cambi, tutto regolare." },
  { id: "attivita", label: "Attività", icon: BookOpen, chip: "#E0A100", tone: "bg-cat-attivita", rows: [
    ["Didattica", ["Partecipato", "Non ha partecipato"], 0], ["Creative e motorie", ["Partecipato", "Non ha partecipato"], 0]],
    note: "Abbiamo dipinto con le dita: chiedetele dei colori!" },
  { id: "presenze", label: "Presenze", icon: Activity, chip: "#237A4B", tone: "bg-cat-presenze", rows: [],
    time: ["08:32", "16:05"], timeLabels: ["Entrata", "Uscita"], note: "Ritirata da papà." },
];

function DiaryCard({ cat }) {
  const Icon = cat.icon;
  return (
    <motion.div key={cat.id} initial={{ opacity: 0, y: 18, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.98 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className={`rounded-3xl ${cat.tone} border border-white/70 p-5 sm:p-6`} data-testid={`diary-preview-card-${cat.id}`}>
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: cat.chip }}><Icon className="h-5 w-5" /></span>
        <div>
          <p className="font-display font-bold text-lg text-stone-800">{cat.label}</p>
          <p className="text-xs text-stone-600">Sofia · Sezione Coccinelle</p>
        </div>
      </div>
      <div className="mt-5 space-y-4">
        {cat.rows.map(([label, opts, sel]) => (
          <div key={label}>
            <p className="text-xs font-bold uppercase tracking-wider text-stone-600">{label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {opts.map((o, i) => (
                <span key={o} className={`h-9 px-3.5 rounded-xl text-xs font-bold flex items-center border ${i === sel ? "text-stone-900 border-transparent shadow-sm" : "bg-white/80 text-stone-600 border-white"}`}
                  style={i === sel ? { background: ORANGE } : undefined}>{o}</span>
              ))}
            </div>
          </div>
        ))}
        {cat.time && (
          <div className="grid grid-cols-2 gap-2">
            {cat.time.map((t, i) => (
              <div key={t} className="rounded-2xl bg-white/85 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{cat.timeLabels?.[i] || (i ? "Sveglia" : "Addormentata")}</p>
                <p className="font-display text-2xl font-bold text-stone-800">{t}</p>
              </div>
            ))}
          </div>
        )}
        <p className="rounded-2xl bg-white/85 p-3 text-sm text-stone-700 flex gap-2"><Heart className="h-4 w-4 text-[#E2725B] shrink-0 mt-0.5" /> {cat.note}</p>
      </div>
    </motion.div>
  );
}

export function DiaryPreview() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto) return;
    const t = setInterval(() => setActive((a) => (a + 1) % CATS.length), 3800);
    return () => clearInterval(t);
  }, [auto]);

  return (
    <section id="come-funziona" className="relative py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-center">
        <div>
          <SectionHeading eyebrow="Il diario a colori"
            title="Ogni giornata raccontata in modo chiaro e visivo"
            sub="Cinque categorie, cinque colori: le maestre compilano in pochi tocchi e le famiglie capiscono subito com'è andata, senza leggere pagine di testo." />
          <Reveal delay={0.1} className="mt-8 flex flex-wrap gap-2" >
            <div role="tablist" aria-label="Categorie del diario" className="flex flex-wrap gap-2">
              {CATS.map((c, i) => {
                const Icon = c.icon;
                const on = i === active;
                return (
                  <button key={c.id} role="tab" aria-selected={on} type="button"
                    onClick={() => { setActive(i); setAuto(false); }}
                    className={`relative h-12 px-4 rounded-full text-sm font-bold flex items-center gap-2 transition-colors ${on ? "text-white" : "bg-white text-stone-700 border border-[#E2DED6] hover:bg-stone-50"}`}
                    data-testid={`diary-preview-tab-${c.id}`}>
                    {on && <motion.span layoutId="diary-tab" className="absolute inset-0 rounded-full" style={{ background: c.chip }} transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                    <Icon className="relative h-4 w-4" /><span className="relative">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.15} className="relative">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-white/60 border border-white rotate-2" aria-hidden />
          <div className="relative rounded-[2rem] bg-white border border-[#E2DED6] shadow-2xl shadow-stone-900/10 p-3 sm:p-4 min-h-[440px]">
            <div className="flex items-center justify-between px-2 pb-3">
              <span className="text-xs font-bold text-stone-500">Diario di oggi</span>
              <span className="flex gap-1">{CATS.map((c, i) => <span key={c.id} className="h-1.5 rounded-full transition-all" style={{ width: i === active ? 22 : 8, background: i === active ? c.chip : "#E2DED6" }} />)}</span>
            </div>
            <AnimatePresence mode="wait"><DiaryCard cat={CATS[active]} /></AnimatePresence>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
