import { motion } from "framer-motion";
import { BookOpen, Lock, UtensilsCrossed, Activity, MessageCircle, CalendarDays, FileText, Building2 } from "lucide-react";
import { Reveal, SectionHeading } from "@/components/landing/Reveal";

const ITEMS = [
  { icon: BookOpen, title: "Diario giornaliero a colori", text: "Pappa, nanna, igiene e attività in un tocco. Compilazione rapida per tutta la sezione e aggiornamenti immediati per le famiglie.", cls: "md:col-span-2 bg-cat-attivita", chip: "#E0A100", big: true },
  { icon: Lock, title: "Foto cifrate AES-256", text: "I ricordi dei bambini sono cifrati prima di essere salvati e visibili solo agli utenti autorizzati.", cls: "md:row-span-2 bg-brand text-white", chip: "rgba(255,255,255,0.18)", dark: true },
  { icon: UtensilsCrossed, title: "Mensa e menu", text: "Menu settimanale, allergie e intolleranze sempre sotto controllo.", cls: "bg-cat-pappa", chip: "#F2A65A" },
  { icon: Activity, title: "Presenze e orari", text: "Entrate e uscite veloci, anche con barcode e tesserini stampabili.", cls: "bg-cat-presenze", chip: "#237A4B" },
  { icon: MessageCircle, title: "Comunicazioni e news", text: "Avvisi e novità alle famiglie in un unico canale, senza chat caotiche.", cls: "bg-cat-igiene", chip: "#2F6BC0" },
  { icon: CalendarDays, title: "Calendario e compleanni", text: "Eventi, gite e compleanni della sezione sempre a portata di mano.", cls: "bg-cat-nanna", chip: "#8B7FD4" },
  { icon: FileText, title: "Export in un clic", text: "Anagrafiche e registri in PDF, Excel o CSV.", cls: "bg-white", chip: "#2B2F33" },
  { icon: Building2, title: "Multi-sede e multi-anno", text: "Più scuole, più sezioni, più anni scolastici: ognuna vede solo i propri dati.", cls: "md:col-span-2 lg:col-span-3 bg-white", chip: "#2F7D6D" },
];

export function FeatureBento() {
  return (
    <section id="funzionalita" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <SectionHeading eyebrow="Funzionalità" title="Tutto quello che serve alla tua scuola, in un unico posto"
          sub="Pensata insieme alle educatrici per ridurre la burocrazia e avvicinare le famiglie." />
        <div className="mt-12 grid grid-flow-row-dense md:grid-cols-2 lg:grid-cols-4 auto-rows-[minmax(190px,auto)] gap-4 lg:gap-5">
          {ITEMS.map((it, i) => {
            const Icon = it.icon;
            return (
              <Reveal key={it.title} delay={(i % 4) * 0.06} className={`${it.cls} ${i === 1 ? "lg:col-span-1" : ""}`.replace(/bg-\S+|text-white/g, "")}>
                <motion.article whileHover={{ y: -4 }} transition={{ type: "spring", stiffness: 300, damping: 22 }}
                  className={`h-full rounded-3xl border ${it.dark ? "border-transparent" : "border-[#E2DED6]/70"} ${it.cls} p-6 flex flex-col shadow-sm hover:shadow-xl transition-shadow relative overflow-hidden`}
                  data-testid={`feature-card-${i}`}>
                  {it.dark && <div aria-hidden className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />}
                  <span className="h-12 w-12 rounded-2xl flex items-center justify-center text-white shadow-md" style={{ background: it.chip }}><Icon className="h-5 w-5" /></span>
                  <h3 className={`mt-5 font-display font-bold tracking-tight ${it.big ? "text-2xl" : "text-xl"} ${it.dark ? "text-white" : "text-stone-800"}`}>{it.title}</h3>
                  <p className={`mt-2 text-sm leading-relaxed ${it.dark ? "text-white/85" : "text-stone-700"}`}>{it.text}</p>
                  {it.dark && (
                    <div className="mt-auto pt-6 grid grid-cols-4 gap-1.5" aria-hidden>
                      {Array.from({ length: 8 }).map((_, k) => (
                        <motion.span key={k} className="aspect-square rounded-lg bg-white/15"
                          animate={{ opacity: [0.35, 0.9, 0.35] }} transition={{ duration: 2.4, delay: k * 0.18, repeat: Infinity }} />
                      ))}
                    </div>
                  )}
                </motion.article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
