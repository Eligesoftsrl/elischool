import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/landing/Reveal";

const TABS = [
  { id: "scuole", label: "Direzione", img: "/illustrations/school.webp", alt: "Illustrazione di una piccola scuola dell'infanzia con giardino", color: "#2B2F33",
    title: "Per la direzione e la segreteria", items: [
      "Anagrafiche complete: alunni, genitori, codici fiscali e allergie",
      "Iscrizioni online da approvare direttamente nel pannello",
      "Esportazioni PDF, Excel e CSV in un clic",
      "Più sedi, sezioni e anni scolastici, ognuno con i propri dati",
    ] },
  { id: "maestre", label: "Maestre", img: "/illustrations/teacher.webp", alt: "Illustrazione di una maestra con un tablet accanto a un bambino che gioca", color: "#F2A65A",
    title: "Per le maestre e le educatrici", items: [
      "Diario a colori: si compila in pochi secondi, anche per tutta la sezione",
      "Presenze per sezione con barcode e tesserini stampabili",
      "Piano didattico settimanale esportabile in PDF",
      "Comunicazioni e news alle famiglie in un unico canale",
    ] },
  { id: "genitori", label: "Famiglie", img: "/illustrations/family.webp", alt: "Illustrazione di un genitore con lo smartphone e un bambino che lo abbraccia", color: "#2F7D6D",
    title: "Per mamme, papà e famiglie", items: [
      "La giornata del bambino: pappa, nanna, attività e note delle maestre",
      "Foto e momenti speciali, protetti e visibili solo a voi",
      "Menu della mensa, calendario, gite e laboratori",
      "Avvisi della scuola sempre a portata di mano, senza chat caotiche",
    ] },
];

export function AudienceTabs() {
  const [active, setActive] = useState(1);
  const t = TABS[active];
  return (
    <section id="per-chi" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading center eyebrow="Per chi" title="Pensata per chi vive la scuola ogni giorno" />
        <Reveal delay={0.1} className="mt-10 flex justify-center">
          <div role="tablist" aria-label="Destinatari" className="inline-flex p-1.5 rounded-full bg-white border border-[#E2DED6] shadow-sm">
            {TABS.map((x, i) => (
              <button key={x.id} role="tab" type="button" aria-selected={i === active} onClick={() => setActive(i)}
                className={`relative h-11 px-5 sm:px-7 rounded-full text-sm font-bold transition-colors ${i === active ? "text-white" : "text-stone-600 hover:text-stone-800"}`}
                data-testid={`audience-tab-${x.id}`}>
                {i === active && <motion.span layoutId="aud-pill" className="absolute inset-0 rounded-full" style={{ background: x.color }} transition={{ type: "spring", stiffness: 380, damping: 30 }} />}
                <span className="relative">{x.label}</span>
              </button>
            ))}
          </div>
        </Reveal>
        <div className="mt-12 rounded-[2rem] bg-white border border-[#E2DED6] shadow-xl shadow-stone-900/5 p-6 sm:p-10 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={t.id} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }} className="grid md:grid-cols-2 gap-8 items-center" data-testid={`audience-panel-${t.id}`}>
              <div className="relative flex justify-center">
                <div aria-hidden className="absolute inset-6 rounded-full blur-3xl opacity-30" style={{ background: t.color }} />
                <img src={t.img} alt={t.alt} loading="lazy" className="relative w-full max-w-sm h-auto float-slow" />
              </div>
              <div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold tracking-tight text-stone-800">{t.title}</h3>
                <ul className="mt-6 space-y-3">
                  {t.items.map((it, i) => (
                    <motion.li key={it} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.07 }}
                      className="flex items-start gap-3 rounded-2xl bg-[#F6F5F0] p-3.5">
                      <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" style={{ color: t.color === "#F2A65A" ? "#C7742A" : t.color }} />
                      <span className="text-sm sm:text-base text-stone-700">{it}</span>
                    </motion.li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
