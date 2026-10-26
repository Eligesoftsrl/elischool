import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, Camera, MessageCircle, CalendarDays, UtensilsCrossed,
  Bed, Bath, BookOpen, Activity, HeartHandshake, ShieldCheck, Lock, Smartphone,
  Cloud, Users, GraduationCap, LineChart, CheckCircle2, Mail, Bell,
  FileText, Globe, Baby, ChevronDown, Code2, Headphones,
} from "lucide-react";
import { TiptiiBadge, TiptiiLogo } from "@/components/TiptiiLogo";
import { SITE, COMPANY } from "@/config/site";
import { SiteFooter } from "@/components/SiteFooter";
import { usePageMeta } from "@/hooks/usePageMeta";

const FAQS = [
  {
    q: "Che cos'è Tiptii?",
    a: "Tiptii è un'app web italiana per asili nido e scuole dell'infanzia (0–6 anni). Riunisce in un unico posto il diario giornaliero dei bambini, le presenze, il menu della mensa, le foto, il calendario e le comunicazioni con le famiglie.",
  },
  {
    q: "Chi sviluppa Tiptii?",
    a: `Tiptii è progettata e sviluppata da ${COMPANY.legalName}, software house italiana che realizza soluzioni digitali per scuole, enti e aziende.`,
  },
  {
    q: "Serve installare qualcosa?",
    a: "No. Tiptii funziona dal browser di smartphone, tablet e computer. Maestre e genitori accedono con email e password, senza scaricare nulla.",
  },
  {
    q: "Come vengono protette le foto dei bambini?",
    a: "Ogni foto e documento viene cifrato con AES-256-GCM prima di essere salvato. Le immagini sono visibili solo agli utenti autorizzati della scuola e non vengono mai pubblicate né vendute a terzi.",
  },
  {
    q: "Tiptii è conforme al GDPR?",
    a: "Sì. I dati sono trattati secondo il Regolamento UE 2016/679: ogni scuola resta titolare dei dati dei propri iscritti, mentre Eligesoft agisce come responsabile del trattamento. Le famiglie possono chiedere in ogni momento accesso, rettifica o cancellazione.",
  },
  {
    q: "Per quali scuole è adatta?",
    a: "Per asili nido, micronidi, sezioni primavera e scuole dell'infanzia, pubbliche e private, anche con più sedi e più sezioni. Una piattaforma, tante scuole: ognuna vede solo i propri dati.",
  },
  {
    q: "Come si iscrive un bambino?",
    a: "Ogni scuola ha il proprio link di iscrizione online: il genitore compila il modulo dal telefono e la segreteria riceve la richiesta direttamente nel pannello, pronta da approvare.",
  },
  {
    q: "Come posso attivare Tiptii nella mia scuola?",
    a: `Scrivici a ${COMPANY.email}: ti mostriamo la piattaforma in una breve demo e attiviamo la tua scuola, con assistenza in italiano.`,
  },
];

export default function Landing() {
  usePageMeta({
    title: "Tiptii — App per asilo nido e scuola dell'infanzia",
    description: "Tiptii è l'app italiana per asili nido e scuole dell'infanzia 0–6 anni: diario giornaliero a colori, presenze, mensa, foto cifrate e comunicazioni con le famiglie.",
    path: "/",
  });
  return (
    <div className="min-h-screen bg-[#F7F5F0] text-stone-800 overflow-hidden">
      {/* ------------------------------- NAVBAR ------------------------------- */}
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <TiptiiBadge size={38} />
            <span className="font-display font-bold text-xl text-stone-800">tiptii</span>
          </Link>
          <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-stone-600">
            <a href="#famiglie" className="hover:text-brand-hover">Per le famiglie</a>
            <a href="#maestre" className="hover:text-brand-hover">Per le maestre</a>
            <a href="#direzione" className="hover:text-brand-hover">Per la direzione</a>
            <a href="#faq" className="hover:text-brand-hover">Domande frequenti</a>
            <a href="#chi-siamo" className="hover:text-brand-hover">Chi siamo</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link to="/login" className="h-10 px-4 rounded-2xl bg-brand hover:bg-brand-hover text-white text-sm font-semibold flex items-center gap-2 shadow-sm" data-testid="landing-login-button">
              Accedi <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* --------------------------------- HERO ------------------------------- */}
      <section className="relative">
        <div className="pointer-events-none absolute -top-24 -left-16 h-96 w-96 rounded-full bg-[#F2A65A]/25 blur-3xl" />
        <div className="pointer-events-none absolute top-1/3 -right-24 h-[28rem] w-[28rem] rounded-full bg-brand/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-96 w-96 rounded-full bg-[#FBEBA8]/40 blur-3xl" />

        <div className="relative max-w-6xl mx-auto px-5 pt-14 md:pt-20 pb-16">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-stone-200 text-xs font-semibold text-stone-600">
              <span className="h-2 w-2 rounded-full bg-brand pulse-dot" />
              La giornata del tuo bambino, raccontata con cura
            </span>
            <h1 className="mt-5 font-display text-5xl md:text-7xl font-extrabold tracking-tight text-stone-800 leading-[1.05]">
              Un passo dopo l'altro,<br />
              <span className="text-brand">cresciamo insieme.</span>
            </h1>
            <p className="mt-6 max-w-xl text-stone-600 text-lg leading-relaxed">
              Tiptii è l'app per asilo nido e scuola dell'infanzia 0–6 anni: diario giornaliero, presenze,
              mensa e comunicazioni scuola-famiglia in un unico posto. Maestre, bambini e famiglie connessi ogni giorno, dal telefono che hai in tasca.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Link to="/login" className="h-14 px-7 rounded-2xl bg-brand hover:bg-brand-hover text-white text-base font-bold flex items-center gap-2 shadow-lg shadow-brand/20">
                Entra ora <ArrowRight className="h-5 w-5" />
              </Link>
              <a href="#come-funziona" className="h-14 px-7 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-base font-semibold flex items-center">
                Scopri come funziona
              </a>
            </div>

            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-stone-500">
              <TrustItem icon={<ShieldCheck className="h-4 w-4" />} label="Foto cifrate AES-256" />
              <TrustItem icon={<Globe className="h-4 w-4" />} label="100% italiano" />
              <TrustItem icon={<Smartphone className="h-4 w-4" />} label="Pensata per smartphone" />
            </div>
          </motion.div>
        </div>
      </section>

      {/* --------------------------- CATEGORIE DIARIO ------------------------- */}
      <section id="come-funziona" className="relative py-16">
        <div className="max-w-6xl mx-auto px-5">
          <SectionHeading
            eyebrow="Il diario a colori"
            title="Ogni giornata raccontata a famiglie e maestre, in modo chiaro e visivo"
            sub="Cinque categorie, cinque colori: le famiglie capiscono subito cosa ha fatto il bambino, senza dover leggere pagine di testo."
          />
          <div className="mt-10 grid grid-cols-2 md:grid-cols-5 gap-3">
            <CatPill tone="bg-cat-pappa"    chip="#F2A65A" icon={<UtensilsCrossed className="h-5 w-5 text-white" />} label="Pappa" sub="Pranzo & merenda" />
            <CatPill tone="bg-cat-nanna"    chip="#8B7FD4" icon={<Bed className="h-5 w-5 text-white" />}             label="Nanna" sub="Riposo pomeridiano" />
            <CatPill tone="bg-cat-igiene"   chip="#2F6BC0" icon={<Bath className="h-5 w-5 text-white" />}            label="Igiene" sub="Cambi e pulizia" />
            <CatPill tone="bg-cat-attivita" chip="#E0A100" icon={<BookOpen className="h-5 w-5 text-white" />}        label="Attività" sub="Giochi, laboratori" />
            <CatPill tone="bg-cat-presenze" chip="#237A4B" icon={<Activity className="h-5 w-5 text-white" />}        label="Presenze" sub="Entrate e uscite" />
          </div>
        </div>
      </section>

      {/* --------------------------------- PILLARS ---------------------------- */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-3 gap-5">
          <PillarCard id="famiglie" accent="bg-brand" title="Per le famiglie" icon={<HeartHandshake className="h-5 w-5" />} items={[
            { icon: <Camera />,       text: "Foto e momenti del tuo bambino, in tempo reale" },
            { icon: <MessageCircle />,text: "Comunicazioni dirette con le maestre, senza chat caotiche" },
            { icon: <CalendarDays />, text: "Calendario eventi, gite, laboratori sempre a portata" },
            { icon: <Sparkles />,     text: "Diario quotidiano: pappa, nanna, attività e note delle maestre" },
          ]} />

          <PillarCard id="maestre" accent="bg-[#F2A65A]" accentText="text-[#2B2F33]" title="Per le maestre" icon={<GraduationCap className="h-5 w-5" />} items={[
            { icon: <BookOpen />,     text: "Diario a colori: compila in 10 secondi, auto-fill intelligente" },
            { icon: <Users />,        text: "Presenze a sezione multipla, barcode e tesserini stampabili" },
            { icon: <FileText />,     text: "Piano didattico settimanale esportabile in PDF" },
            { icon: <Bell />,         text: "Comunicazioni e news alle famiglie in un unico canale" },
          ]} />

          <PillarCard id="direzione" accent="bg-stone-800" title="Per la direzione" icon={<LineChart className="h-5 w-5" />} items={[
            { icon: <Baby />,         text: "Anagrafiche complete: alunni, genitori, fiscal code, allergie" },
            { icon: <Mail />,         text: "Email transazionali Brevo integrate (benvenuto, reset, inviti)" },
            { icon: <FileText />,     text: "Esportazioni PDF / Excel / CSV in un click" },
            { icon: <Cloud />,        text: "Multi-sede e multi-anno scolastico" },
          ]} />
        </div>
      </section>

      {/* ------------------------- NUMBERS / SOCIAL PROOF --------------------- */}
      <section className="py-10">
        <div className="max-w-6xl mx-auto px-5 grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatBlock big="100%" small="italiano, dalla UI alle email" />
          <StatBlock big="0 €" small="costi di setup o training" />
          <StatBlock big="256" small="bit di cifratura per ogni foto" />
          <StatBlock big="∞" small="anni scolastici archiviati" />
        </div>
      </section>

      {/* --------------------------------- PRIVACY ---------------------------- */}
      <section id="privacy" className="py-16">
        <div className="max-w-6xl mx-auto px-5">
          <div className="rounded-3xl bg-brand text-white p-8 md:p-12 shadow-xl relative overflow-hidden">
            <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />
            <div className="flex items-start gap-4 relative">
              <span className="h-14 w-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Lock className="h-7 w-7" />
              </span>
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-white/70">Privacy & Sicurezza</p>
                <h3 className="font-display text-3xl md:text-4xl font-bold mt-1">Le foto dei bambini valgono di più di un codice.</h3>
                <p className="mt-3 text-white/85 max-w-2xl leading-relaxed">
                  Ogni foto e documento è cifrato <b className="text-white">AES-256-GCM</b> prima di essere salvato nel database. Nessun accesso diretto, nessun archivio pubblico, nessuna vendita o uso pubblicitario dei dati.
                  Ricostruiamo l'immagine solo quando serve ed esclusivamente a chi è autorizzato.
                </p>
                <ul className="mt-5 grid sm:grid-cols-2 gap-2 text-sm">
                  <PrivacyItem>Isolamento multi-tenant: ogni scuola vede solo i propri dati</PrivacyItem>
                  <PrivacyItem>Login con JWT + password hash bcrypt</PrivacyItem>
                  <PrivacyItem>Codici fiscali validati e cittadinanza italiana</PrivacyItem>
                  <PrivacyItem>Accesso, rettifica e cancellazione dei dati a richiesta</PrivacyItem>
                </ul>
                <Link to="/privacy" className="mt-6 inline-flex items-center gap-2 h-11 px-5 rounded-2xl bg-white text-brand font-bold text-sm hover:bg-white/90">
                  Leggi la privacy policy <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------- CHI SIAMO --------------------------- */}
      <section id="chi-siamo" className="py-16">
        <div className="max-w-6xl mx-auto px-5 grid lg:grid-cols-5 gap-8 items-start">
          <div className="lg:col-span-3">
            <SectionHeading
              eyebrow="Chi siamo"
              title={`${SITE.productName} è un progetto ${COMPANY.legalName}`}
            />
            <div className="mt-4 space-y-4 text-stone-600 leading-relaxed">
              <p>
                {COMPANY.name} è una software house italiana che progetta e sviluppa applicazioni web e gestionali su misura.
                Con {SITE.productName} portiamo la stessa cura nel mondo 0–6: uno strumento semplice per le educatrici,
                completo per la direzione e rassicurante per le famiglie.
              </p>
              <p>
                Sviluppiamo, ospitiamo e manteniamo la piattaforma direttamente, con assistenza in italiano e
                aggiornamenti continui costruiti sulle richieste delle scuole che la usano ogni giorno.
              </p>
            </div>
          </div>
          <div className="lg:col-span-2 grid gap-3">
            <AboutItem icon={<Code2 className="h-5 w-5" />} title="Sviluppo interno" text="Progettiamo e scriviamo il software in Italia, senza intermediari." />
            <AboutItem icon={<Headphones className="h-5 w-5" />} title="Assistenza dedicata" text={`Una persona reale risponde a ${COMPANY.email}.`} />
            <AboutItem icon={<ShieldCheck className="h-5 w-5" />} title="Privacy by design" text="Dati cifrati, ruoli separati e conformità al GDPR fin dal primo giorno." />
          </div>
        </div>
      </section>

      {/* ----------------------------------- FAQ ------------------------------ */}
      <section id="faq" className="py-16">
        <div className="max-w-3xl mx-auto px-5">
          <SectionHeading eyebrow="Domande frequenti" title="Tutto quello che vuoi sapere su Tiptii" />
          <div className="mt-8 space-y-3">
            {FAQS.map((f) => (
              <details key={f.q} className="group rounded-2xl bg-white border border-stone-200 p-5 shadow-sm">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none font-display font-bold text-stone-800">
                  <h3 className="text-base md:text-lg">{f.q}</h3>
                  <ChevronDown className="h-5 w-5 text-brand shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="mt-3 text-stone-600 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "FAQPage",
              mainEntity: FAQS.map((f) => ({
                "@type": "Question",
                name: f.q,
                acceptedAnswer: { "@type": "Answer", text: f.a },
              })),
            }),
          }}
        />
      </section>

      {/* ----------------------------- CTA FINALE ----------------------------- */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-5 text-center">
          <TiptiiLogo size={64} className="justify-center mb-6" />
          <h2 className="font-display text-4xl md:text-5xl font-bold text-stone-800 tracking-tight">
            Pronti a cambiare passo?
          </h2>
          <p className="mt-4 text-stone-600 text-lg">
            Scrivici per una demo: attiviamo la tua scuola in pochi minuti e ti accompagniamo nei primi giorni.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link to="/login" className="h-14 px-8 rounded-2xl bg-brand hover:bg-brand-hover text-white font-bold shadow-lg shadow-brand/20 flex items-center gap-2">
              Accedi al pannello <ArrowRight className="h-5 w-5" />
            </Link>
            <a href={`mailto:${COMPANY.email}?subject=Richiesta%20demo%20Tiptii`} className="h-14 px-8 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 font-semibold flex items-center">
              Richiedi una demo — {COMPANY.email}
            </a>
          </div>
        </div>
      </section>

      {/* ------------------------------- FOOTER ------------------------------- */}
      <SiteFooter />
    </div>
  );
}

/* ------------------------------- Primitives ----------------------------- */
function AboutItem({ icon, title, text }) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-5 shadow-sm flex items-start gap-3">
      <span className="h-10 w-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">{icon}</span>
      <div>
        <p className="font-display font-bold text-stone-800">{title}</p>
        <p className="text-sm text-stone-600 mt-0.5">{text}</p>
      </div>
    </div>
  );
}

function SectionHeading({ eyebrow, title, sub }) {
  return (
    <div className="max-w-3xl">
      <span className="inline-block text-xs font-bold uppercase tracking-wider text-brand">{eyebrow}</span>
      <h2 className="mt-2 font-display text-3xl md:text-4xl font-bold text-stone-800 tracking-tight">{title}</h2>
      {sub && <p className="mt-3 text-stone-600 text-base">{sub}</p>}
    </div>
  );
}

function CatPill({ tone, chip, icon, label, sub }) {
  return (
    <div className={`rounded-2xl ${tone} border border-stone-200/70 p-4 shadow-sm`}>
      <span className="inline-flex h-10 w-10 rounded-xl items-center justify-center" style={{ background: chip }}>
        {icon}
      </span>
      <p className="font-display font-bold text-stone-800 mt-3">{label}</p>
      <p className="text-xs text-stone-700/70 mt-0.5">{sub}</p>
    </div>
  );
}

function PillarCard({ id, title, icon, accent, accentText = "text-white", items }) {
  return (
    <div id={id} className="rounded-3xl bg-white border border-stone-200 p-6 shadow-sm flex flex-col">
      <div className="flex items-center gap-3">
        <span className={`h-10 w-10 rounded-2xl ${accent} ${accentText} flex items-center justify-center shadow-sm`}>
          {icon}
        </span>
        <h3 className="font-display text-xl font-bold text-stone-800">{title}</h3>
      </div>
      <ul className="mt-5 space-y-3 flex-1">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="h-8 w-8 rounded-xl bg-stone-50 border border-stone-200 flex items-center justify-center text-brand shrink-0 mt-0.5">
              {it.icon && <it.icon.type {...it.icon.props} className="h-4 w-4" />}
            </span>
            <p className="text-sm text-stone-700 leading-relaxed pt-1">{it.text}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrustItem({ icon, label }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-stone-500">
      <span className="h-7 w-7 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-brand">{icon}</span>
      {label}
    </span>
  );
}

function StatBlock({ big, small }) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-5 text-center">
      <p className="font-display text-4xl font-extrabold text-brand">{big}</p>
      <p className="text-xs text-stone-500 mt-1">{small}</p>
    </div>
  );
}

function PrivacyItem({ children }) {
  return (
    <li className="flex items-start gap-2">
      <CheckCircle2 className="h-4 w-4 text-white/90 mt-0.5 shrink-0" />
      <span>{children}</span>
    </li>
  );
}
