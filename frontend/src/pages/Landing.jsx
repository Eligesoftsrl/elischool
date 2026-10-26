import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MotionConfig, animate, motion, useInView, useScroll, useSpring } from "framer-motion";
import { ArrowRight, Lock, CheckCircle2, ChevronDown, Code2, Headphones, ShieldCheck, Mail, UtensilsCrossed, Bed, Bath, BookOpen, Activity, Camera, CalendarDays, MessageCircle } from "lucide-react";
import { TiptiiLogo } from "@/components/TiptiiLogo";
import { SITE, COMPANY } from "@/config/site";
import { SiteFooter } from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";
import { HeroSection } from "@/components/landing/HeroSection";
import { DiaryPreview } from "@/components/landing/DiaryPreview";
import { FeatureBento } from "@/components/landing/FeatureBento";
import { AudienceTabs } from "@/components/landing/AudienceTabs";
import { Reveal, SectionHeading } from "@/components/landing/Reveal";

const FAQS = [
  { q: "Che cos'è Tiptii?", a: "Tiptii è un'app web italiana per asili nido e scuole dell'infanzia (0–6 anni). Riunisce in un unico posto il diario giornaliero dei bambini, le presenze, il menu della mensa, le foto, il calendario e le comunicazioni con le famiglie." },
  { q: "Chi sviluppa Tiptii?", a: `Tiptii è progettata e sviluppata da ${COMPANY.legalName}, software house italiana che realizza soluzioni digitali per scuole, enti e aziende.` },
  { q: "Serve installare qualcosa?", a: "No. Tiptii funziona dal browser di smartphone, tablet e computer. Maestre e genitori accedono con email e password, senza scaricare nulla." },
  { q: "Come vengono protette le foto dei bambini?", a: "Ogni foto e documento viene cifrato con AES-256-GCM prima di essere salvato. Le immagini sono visibili solo agli utenti autorizzati della scuola e non vengono mai pubblicate né vendute a terzi." },
  { q: "Tiptii è conforme al GDPR?", a: "Sì. I dati sono trattati secondo il Regolamento UE 2016/679: ogni scuola resta titolare dei dati dei propri iscritti, mentre Eligesoft agisce come responsabile del trattamento. Le famiglie possono chiedere in ogni momento accesso, rettifica o cancellazione." },
  { q: "Per quali scuole è adatta?", a: "Per asili nido, micronidi, sezioni primavera e scuole dell'infanzia, pubbliche e private, anche con più sedi e più sezioni. Una piattaforma, tante scuole: ognuna vede solo i propri dati." },
  { q: "Come si iscrive un bambino?", a: "Ogni scuola ha il proprio link di iscrizione online: il genitore compila il modulo dal telefono e la segreteria riceve la richiesta direttamente nel pannello, pronta da approvare." },
  { q: "Come posso attivare Tiptii nella mia scuola?", a: `Scrivici a ${COMPANY.email}: ti mostriamo la piattaforma in una breve demo e attiviamo la tua scuola, con assistenza in italiano.` },
];

const MARQUEE = [
  [UtensilsCrossed, "Pappa", "#F2A65A"], [Bed, "Nanna", "#8B7FD4"], [Bath, "Igiene", "#2F6BC0"], [BookOpen, "Attività", "#E0A100"],
  [Activity, "Presenze", "#237A4B"], [Camera, "Foto cifrate", "#2F7D6D"], [CalendarDays, "Calendario", "#E2725B"], [MessageCircle, "Comunicazioni", "#2B2F33"],
];

export default function Landing() {
  usePageMeta({
    title: "Tiptii — App per asilo nido e scuola dell'infanzia",
    description: "Tiptii è l'app italiana per asili nido e scuole dell'infanzia 0–6 anni: diario giornaliero a colori, presenze, mensa, foto cifrate e comunicazioni con le famiglie.",
    path: "/",
  });
  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F6F5F0] text-stone-800 overflow-x-clip">
        <ScrollProgress />
        <Navbar />
        <main>
          <HeroSection />
          <Marquee />
          <DiaryPreview />
          <FeatureBento />
          <AudienceTabs />
          <Stats />
          <Security />
          <About />
          <Faq />
          <FinalCta />
        </main>
        <SiteFooter />
      </div>
    </MotionConfig>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30 });
  return <motion.div aria-hidden style={{ scaleX }} className="fixed top-0 inset-x-0 h-1 origin-left z-[60] bg-gradient-to-r from-brand via-[#F2A65A] to-[#FBEBA8]" />;
}

function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 12);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return (
    <header className="sticky top-0 z-50 px-3 sm:px-5 pt-3">
      <div className={`max-w-7xl mx-auto h-16 px-4 sm:px-5 rounded-full flex items-center justify-between transition-[background-color,box-shadow] duration-300 ${scrolled ? "bg-white/80 backdrop-blur-xl shadow-lg shadow-stone-900/5 border border-white" : "bg-transparent"}`}>
        <Link to="/" aria-label="Tiptii, torna alla home" data-testid="navbar-logo"><TiptiiLogo size={30} /></Link>
        <nav className="hidden lg:flex items-center gap-1 text-sm font-semibold text-stone-600" aria-label="Sezioni">
          {[["#funzionalita", "Funzionalità"], ["#per-chi", "Per chi"], ["#sicurezza", "Sicurezza"], ["#chi-siamo", "Chi siamo"], ["#faq", "FAQ"]].map(([h, l]) => (
            <a key={h} href={h} className="px-3.5 py-2 rounded-full hover:bg-white hover:text-stone-900 transition-colors">{l}</a>
          ))}
        </nav>
        <Link to="/login" className="group h-11 px-5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-bold flex items-center gap-2 shadow-md shadow-brand/20 transition-colors" data-testid="landing-login-button">
          Accedi <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </header>
  );
}

function Marquee() {
  const row = [...MARQUEE, ...MARQUEE];
  return (
    <div className="relative py-6 border-y border-[#E2DED6] bg-white/50 overflow-hidden" aria-hidden>
      <div className="flex w-max gap-3 marquee">
        {row.map(([Icon, label, color], i) => (
          <span key={i} className="inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white border border-[#E2DED6] text-sm font-bold text-stone-700 whitespace-nowrap">
            <span className="h-7 w-7 rounded-full flex items-center justify-center text-white" style={{ background: color }}><Icon className="h-3.5 w-3.5" /></span>{label}
          </span>
        ))}
      </div>
    </div>
  );
}

function Counter({ to, suffix = "", prefix = "" }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const c = animate(0, to, { duration: 1.4, ease: "easeOut", onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [inView, to]);
  return <span ref={ref}>{prefix}{v}{suffix}</span>;
}

function Stats() {
  const items = [
    [<Counter to={100} suffix="%" />, "italiano, dall'app alle email", "bg-cat-presenze"],
    [<Counter to={0} suffix=" €" />, "costi di installazione", "bg-cat-pappa"],
    [<Counter to={256} />, "bit di cifratura per ogni foto", "bg-cat-nanna"],
    [<span>∞</span>, "anni scolastici archiviati", "bg-cat-attivita"],
  ];
  return (
    <section className="py-12" aria-label="Tiptii in numeri">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {items.map(([big, small, tone], i) => (
          <Reveal key={small} delay={i * 0.08} className={`rounded-3xl ${tone} border border-white/70 p-6 sm:p-8`}>
            <p className="font-display text-4xl sm:text-5xl font-extrabold text-stone-800 tracking-tight" data-testid={`stat-${i}`}>{big}</p>
            <p className="mt-2 text-sm text-stone-700">{small}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

function Security() {
  const points = [
    "Isolamento tra scuole: ognuna vede solo i propri dati",
    "Password cifrate e accessi protetti per ruolo",
    "Codici fiscali validati in fase di inserimento",
    "Accesso, rettifica e cancellazione dei dati su richiesta",
  ];
  return (
    <section id="sicurezza" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="relative rounded-[2.5rem] bg-brand text-white p-8 sm:p-12 lg:p-16 overflow-hidden">
          <div aria-hidden className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-white/10 blur-3xl blob-drift" />
          <div aria-hidden className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-[#F2A65A]/25 blur-3xl blob-drift [animation-delay:-8s]" />
          <div className="relative grid lg:grid-cols-5 gap-10 items-center">
            <div className="lg:col-span-3">
              <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-white/75"><Lock className="h-4 w-4" /> Privacy e sicurezza</span>
              <h2 className="mt-3 font-display text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight leading-[1.1]">Le foto dei bambini valgono più di un codice.</h2>
              <p className="mt-5 text-white/85 text-base sm:text-lg leading-relaxed max-w-2xl">
                Ogni foto e documento è cifrato <b className="text-white">AES-256-GCM</b> prima di essere salvato. Nessun archivio pubblico, nessuna vendita o uso pubblicitario dei dati:
                l'immagine viene ricostruita solo quando serve ed esclusivamente per chi è autorizzato.
              </p>
              <Link to="/privacy" className="mt-8 inline-flex items-center gap-2 h-12 px-6 rounded-full bg-white text-brand font-bold text-sm hover:bg-white/90 transition-colors" data-testid="security-privacy-link">
                Leggi la privacy policy <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <ul className="lg:col-span-2 grid gap-3">
              {points.map((p, i) => (
                <motion.li key={p} initial={{ opacity: 0, x: 20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: 0.1 + i * 0.08 }}
                  className="flex items-start gap-3 rounded-2xl bg-white/10 backdrop-blur border border-white/15 p-4 text-sm sm:text-base">
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-[#FBEBA8] mt-0.5" /> {p}
                </motion.li>
              ))}
            </ul>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function About() {
  const items = [
    [Code2, "Sviluppo interno", "Progettiamo e scriviamo il software in Italia, senza intermediari.", "#F2A65A"],
    [Headphones, "Assistenza dedicata", `Una persona reale risponde a ${COMPANY.email}.`, "#8B7FD4"],
    [ShieldCheck, "Privacy by design", "Dati cifrati, ruoli separati e attenzione al GDPR fin dal primo giorno.", "#2F7D6D"],
  ];
  return (
    <section id="chi-siamo" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8 grid lg:grid-cols-2 gap-12 items-start">
        <div>
          <SectionHeading eyebrow="Chi siamo" title={`${SITE.productName} è un progetto ${COMPANY.legalName}`} />
          <Reveal delay={0.1} className="mt-6 space-y-4 text-stone-600 text-base md:text-lg leading-relaxed">
            <p>{COMPANY.name} è una software house italiana che progetta e sviluppa applicazioni web e gestionali su misura. Con {SITE.productName} portiamo la stessa cura nel mondo 0–6: uno strumento semplice per le educatrici, completo per la direzione e rassicurante per le famiglie.</p>
            <p>Sviluppiamo, ospitiamo e manteniamo la piattaforma direttamente, con assistenza in italiano e aggiornamenti continui costruiti sulle richieste delle scuole che la usano ogni giorno.</p>
          </Reveal>
        </div>
        <div className="grid gap-4">
          {items.map(([Icon, title, text, c], i) => (
            <Reveal key={title} delay={i * 0.08}>
              <motion.div whileHover={{ x: 6 }} className="rounded-3xl bg-white border border-[#E2DED6] p-5 sm:p-6 flex items-start gap-4 shadow-sm">
                <span className="h-12 w-12 rounded-2xl text-white flex items-center justify-center shrink-0" style={{ background: c }}><Icon className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-display text-lg font-bold text-stone-800">{title}</h3>
                  <p className="text-sm text-stone-600 mt-1">{text}</p>
                </div>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  return (
    <section id="faq" className="py-20 md:py-28">
      <div className="max-w-3xl mx-auto px-5 sm:px-8">
        <SectionHeading center eyebrow="Domande frequenti" title="Tutto quello che vuoi sapere su Tiptii" />
        <div className="mt-10 space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={Math.min(i, 4) * 0.05}>
              <details className="group rounded-3xl bg-white border border-[#E2DED6] px-5 sm:px-6 py-5 shadow-sm open:shadow-lg open:border-brand/30 transition-shadow" data-testid={`faq-accordion-item-${i + 1}`}>
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-display font-bold text-stone-800">
                  <h3 className="text-base md:text-lg">{f.q}</h3>
                  <span className="h-9 w-9 rounded-full bg-[#F6F5F0] group-open:bg-brand group-open:text-white text-brand flex items-center justify-center shrink-0 transition-colors">
                    <ChevronDown className="h-5 w-5 transition-transform group-open:rotate-180" />
                  </span>
                </summary>
                <p className="mt-3 text-stone-600 leading-relaxed">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "FAQPage",
        mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      }) }} />
    </section>
  );
}

function FinalCta() {
  return (
    <section id="contatti" className="py-20 md:py-28">
      <div className="max-w-7xl mx-auto px-5 sm:px-8">
        <Reveal className="relative rounded-[2.5rem] bg-white border border-[#E2DED6] shadow-2xl shadow-stone-900/5 overflow-hidden">
          <div aria-hidden className="absolute -top-20 -left-20 h-72 w-72 rounded-full bg-[#FBEBA8]/70 blur-3xl blob-drift" />
          <div aria-hidden className="absolute -bottom-24 right-10 h-72 w-72 rounded-full bg-[#FCE3C7] blur-3xl blob-drift [animation-delay:-10s]" />
          <div className="relative grid md:grid-cols-2 gap-6 items-center p-8 sm:p-12 lg:p-16">
            <div>
              <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-stone-800 tracking-tight leading-[1.1]">Pronti a fare il primo passo?</h2>
              <p className="mt-4 text-stone-600 text-base sm:text-lg">Scrivici per una demo: attiviamo la tua scuola in pochi minuti e ti accompagniamo nei primi giorni.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a href={`mailto:${COMPANY.email}?subject=Richiesta%20demo%20Tiptii`} className="group h-14 px-7 rounded-full bg-brand hover:bg-brand-hover text-white font-bold shadow-xl shadow-brand/25 flex items-center gap-2 transition-[background-color,transform] hover:-translate-y-0.5" data-testid="cta-email-button">
                  <Mail className="h-5 w-5" /> Richiedi una demo
                </a>
                <Link to="/login" className="h-14 px-7 rounded-full bg-[#F6F5F0] hover:bg-stone-100 text-stone-800 font-semibold flex items-center gap-2 transition-colors" data-testid="cta-login-button">
                  Accedi al pannello <ArrowRight className="h-5 w-5" />
                </Link>
              </div>
              <p className="mt-4 text-sm text-stone-500">oppure scrivi a <a className="font-semibold text-brand hover:text-brand-hover" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
            </div>
            <img src="/illustrations/family.webp" alt="" loading="lazy" className="hidden md:block w-full max-w-xs justify-self-center h-auto float-slow" />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
