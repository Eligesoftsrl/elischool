import { useEffect } from "react";
import { usePageMeta } from "@/hooks/usePageMeta";
import { resetConsent } from "@/lib/consent";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { TiptiiBadge } from "@/components/TiptiiLogo";
import { SiteFooter } from "@/components/SiteFooter";
import { SITE, COMPANY, PRIVACY_LAST_UPDATE, fullAddress } from "@/config/site";

const SECTIONS = [
  ["titolare", "1. Chi tratta i dati"],
  ["dati", "2. Quali dati trattiamo"],
  ["finalita", "3. Finalità e basi giuridiche"],
  ["minori", "4. Dati dei minori e dati sulla salute"],
  ["fornitori", "5. Fornitori e destinatari"],
  ["estero", "6. Trasferimenti fuori dall'UE"],
  ["sicurezza", "7. Sicurezza"],
  ["conservazione", "8. Per quanto tempo conserviamo i dati"],
  ["diritti", "9. I tuoi diritti"],
  ["cookie", "10. Cookie e archiviazione locale"],
  ["modifiche", "11. Modifiche a questa informativa"],
];

export default function Privacy() {
  const { hash } = useLocation();

  usePageMeta({
    title: `Privacy policy — ${SITE.productName} | ${COMPANY.legalName}`,
    description: `Informativa privacy di ${SITE.productName}: quali dati trattiamo, come proteggiamo le foto dei bambini e come esercitare i tuoi diritti GDPR.`,
    path: "/privacy",
  });

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
  }, [hash]);

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-stone-800">
      <header className="sticky top-0 z-50 glass">
        <div className="max-w-4xl mx-auto px-5 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <TiptiiBadge size={34} />
            <span className="font-display font-bold text-lg text-stone-800">tiptii</span>
          </Link>
          <Link to="/" className="text-sm font-semibold text-stone-600 hover:text-brand-hover flex items-center gap-1.5">
            <ArrowLeft className="h-4 w-4" /> Torna alla home
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-5 py-12">
        <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-brand">
          <ShieldCheck className="h-4 w-4" /> Informativa ai sensi degli artt. 13 e 14 del Regolamento UE 2016/679 (GDPR)
        </span>
        <h1 className="mt-2 font-display text-4xl md:text-5xl font-extrabold tracking-tight">Privacy policy</h1>
        <p className="mt-3 text-stone-500 text-sm">Ultimo aggiornamento: {PRIVACY_LAST_UPDATE}</p>

        <p className="mt-6 text-stone-600 leading-relaxed">
          Questa informativa spiega come vengono trattati i dati personali di chi visita il sito {SITE.url.replace("https://", "")} e di chi
          utilizza la piattaforma {SITE.productName}: direzioni scolastiche, educatrici e maestre, genitori e bambini iscritti alle scuole
          che adottano il servizio.
        </p>

        <nav className="mt-8 rounded-2xl bg-white border border-stone-200 p-5">
          <p className="font-display font-bold text-sm">Indice</p>
          <ol className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
            {SECTIONS.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className="text-stone-600 hover:text-brand-hover">{label}</a></li>
            ))}
          </ol>
        </nav>

        <article className="mt-10 space-y-10 text-stone-700 leading-relaxed [&_h2]:font-display [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-stone-800 [&_h2]:scroll-mt-24 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-1.5 [&_a]:text-brand [&_a]:underline">
          <section>
            <h2 id="titolare">1. Chi tratta i dati</h2>
            <p>
              <b>{COMPANY.legalName}</b>, con sede in {fullAddress()}, P.IVA {COMPANY.vat}, email{" "}
              <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>, REA {COMPANY.rea}, PEC <a href={`mailto:${COMPANY.pec}`}>{COMPANY.pec}</a>, sviluppa e gestisce la piattaforma {SITE.productName}.
              Il ruolo di {COMPANY.name} cambia a seconda dei dati:
            </p>
            <ul>
              <li>
                <b>Titolare del trattamento</b> per i dati di chi visita il sito, chiede una demo o informazioni, e per i dati dei
                referenti delle scuole clienti necessari a gestire il contratto.
              </li>
              <li>
                <b>Responsabile del trattamento</b> (art. 28 GDPR) per i dati che le scuole inseriscono in {SITE.productName}: bambini,
                genitori, personale. In questo caso il <b>titolare è la scuola</b>, che decide quali dati raccogliere e per quali scopi.{" "}
                {COMPANY.name} li tratta solo secondo le istruzioni della scuola e sulla base di un accordo di nomina a responsabile.
              </li>
            </ul>
            <p>
              Se sei un genitore o un dipendente di una scuola, per le richieste sui tuoi dati puoi rivolgerti direttamente alla scuola;
              {" "}{COMPANY.name} la supporterà nel rispondere.
              {COMPANY.dpoEmail && <> Il Responsabile della Protezione dei Dati (DPO) è contattabile a <a href={`mailto:${COMPANY.dpoEmail}`}>{COMPANY.dpoEmail}</a>.</>}
            </p>
          </section>

          <section>
            <h2 id="dati">2. Quali dati trattiamo</h2>
            <ul>
              <li><b>Visitatori del sito:</b> dati tecnici di navigazione (indirizzo IP, tipo di browser, data e ora di accesso) registrati automaticamente dai server.</li>
              <li><b>Richieste di contatto o demo:</b> nome, email, nome della scuola e contenuto del messaggio.</li>
              <li><b>Account utente</b> (direzione, maestre, genitori): nome, cognome, email, ruolo, password conservata solo in forma cifrata (hash bcrypt), data e ora degli accessi.</li>
              <li><b>Anagrafiche inserite dalla scuola:</b> dati di bambini e genitori, inclusi codice fiscale, data e luogo di nascita, residenza, recapiti, sezione frequentata.</li>
              <li><b>Vita scolastica:</b> presenze, diario giornaliero (pasti, riposo, igiene, attività), comunicazioni, eventi, piani didattici.</li>
              <li><b>Foto e documenti</b> caricati dalla scuola, salvati in forma cifrata.</li>
              <li><b>Informazioni sulla salute</b> eventualmente indicate dalla scuola, come allergie o intolleranze alimentari.</li>
            </ul>
          </section>

          <section>
            <h2 id="finalita">3. Finalità e basi giuridiche</h2>
            <ul>
              <li><b>Erogare il servizio {SITE.productName}</b> alle scuole e ai loro utenti — esecuzione del contratto con la scuola (art. 6.1.b) e, per i dati degli iscritti, le basi giuridiche individuate dalla scuola titolare.</li>
              <li><b>Rispondere a richieste di informazioni o demo</b> — misure precontrattuali su richiesta dell'interessato (art. 6.1.b).</li>
              <li><b>Inviare email di servizio</b> (inviti, reimpostazione password, avvisi) — esecuzione del contratto (art. 6.1.b).</li>
              <li><b>Sicurezza della piattaforma</b> e prevenzione degli abusi, ad esempio il blocco dopo tentativi di accesso falliti — legittimo interesse (art. 6.1.f).</li>
              <li><b>Adempimenti fiscali e amministrativi</b> verso le scuole clienti — obbligo di legge (art. 6.1.c).</li>
            </ul>
            <p>Non vendiamo i dati, non li usiamo per pubblicità e non facciamo profilazione commerciale degli utenti.</p>
          </section>

          <section>
            <h2 id="minori">4. Dati dei minori e dati sulla salute</h2>
            <p>
              {SITE.productName} tratta dati di bambini in età prescolare. Questi dati sono inseriti esclusivamente dalla scuola, sono
              visibili solo al personale autorizzato e ai genitori collegati a quel bambino, e non sono mai resi pubblici.
            </p>
            <p>
              Le informazioni su allergie e intolleranze rientrano tra le categorie particolari di dati (art. 9 GDPR). Vengono trattate solo
              se la scuola le ritiene necessarie per la tutela della salute del bambino, ad esempio per la preparazione dei pasti, e
              sulla base giuridica individuata dalla scuola titolare.
            </p>
          </section>

          <section>
            <h2 id="fornitori">5. Fornitori e destinatari</h2>
            <p>I dati sono accessibili al personale autorizzato di {COMPANY.name} e ai seguenti fornitori, nominati responsabili del trattamento, solo nella misura necessaria al servizio:</p>
            <ul>
              <li><b>Railway Corporation</b> (USA) — hosting del server applicativo e del database.</li>
              <li><b>Vercel Inc.</b> (USA) — hosting e distribuzione delle pagine del sito.</li>
              <li><b>Brevo / Sendinblue SAS</b> (Francia) — invio delle email di servizio.</li>
              <li><b>Google LLC</b> (USA) — fornitura dei caratteri tipografici del sito (Google Fonts), che comporta la trasmissione dell'indirizzo IP, solo se accetti nel banner cookie.</li>
              <li>
                <b>Fornitore di intelligenza artificiale</b> (OpenAI, tramite la piattaforma Emergent) — solo se la scuola attiva la funzione
                di report giornaliero automatico: il testo del diario della giornata viene elaborato per generare un riassunto per la famiglia.
              </li>
            </ul>
            <p>I dati possono inoltre essere comunicati alle autorità quando richiesto dalla legge.</p>
          </section>

          <section>
            <h2 id="estero">6. Trasferimenti fuori dall'Unione Europea</h2>
            <p>
              Alcuni fornitori hanno sede negli Stati Uniti. In questi casi il trasferimento avviene sulla base dell'adesione del fornitore
              all'EU-US Data Privacy Framework oppure delle Clausole Contrattuali Standard approvate dalla Commissione Europea (art. 46 GDPR),
              con misure di sicurezza aggiuntive. Puoi chiedere copia delle garanzie adottate scrivendo a <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.
            </p>
          </section>

          <section>
            <h2 id="sicurezza">7. Sicurezza</h2>
            <ul>
              <li>Foto e documenti cifrati con AES-256-GCM prima del salvataggio.</li>
              <li>Connessioni protette con HTTPS.</li>
              <li>Password conservate solo come hash bcrypt, mai in chiaro.</li>
              <li>Separazione dei dati tra scuole diverse e accessi limitati in base al ruolo (direzione, maestra, genitore).</li>
              <li>Limitazione dei tentativi di accesso per prevenire attacchi.</li>
            </ul>
          </section>

          <section>
            <h2 id="conservazione">8. Per quanto tempo conserviamo i dati</h2>
            <ul>
              <li><b>Dati inseriti dalla scuola:</b> per la durata del contratto con la scuola. Alla cessazione vengono restituiti alla scuola su richiesta e poi cancellati entro 90 giorni, salvo diverse istruzioni della scuola o obblighi di legge.</li>
              <li><b>Account utente:</b> fino alla disattivazione da parte della scuola o su richiesta dell'interessato.</li>
              <li><b>Richieste di contatto:</b> fino a 24 mesi dall'ultimo contatto, se non segue un contratto.</li>
              <li><b>Dati tecnici e di sicurezza</b> (log di accesso): fino a 12 mesi.</li>
              <li><b>Documenti amministrativi e fiscali:</b> 10 anni, come previsto dalla legge.</li>
            </ul>
          </section>

          <section>
            <h2 id="diritti">9. I tuoi diritti</h2>
            <p>In ogni momento puoi chiedere:</p>
            <ul>
              <li>l'accesso ai tuoi dati e una copia degli stessi;</li>
              <li>la rettifica dei dati inesatti o l'integrazione di quelli incompleti;</li>
              <li>la cancellazione dei dati o la limitazione del trattamento;</li>
              <li>la portabilità dei dati in un formato leggibile;</li>
              <li>di opporti ai trattamenti basati sul legittimo interesse.</li>
            </ul>
            <p>
              Scrivi a <a href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> oppure, per i dati gestiti dalla scuola, direttamente alla
              scuola. Rispondiamo entro 30 giorni. Hai anche il diritto di proporre reclamo al{" "}
              <a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">Garante per la protezione dei dati personali</a>.
            </p>
          </section>

          <section>
            <h2 id="cookie">10. Cookie e archiviazione locale</h2>
            <p>
              {SITE.productName} non usa cookie di profilazione né strumenti di tracciamento pubblicitario o statistico. Dopo l'accesso
              vengono usati solo strumenti tecnici strettamente necessari a mantenerti collegato in modo sicuro: due cookie tecnici di
              sessione (<code>access_token</code>, durata 12 ore, e <code>refresh_token</code>, durata 14 giorni) e un token di autenticazione
              conservato nella memoria locale del browser. Non richiedono consenso e vengono eliminati quando esci dall'account o alla loro scadenza.
            </p>
            <p>
              Solo se premi <b>Accetta</b> nel banner carichiamo i caratteri tipografici di Google Fonts, che ricevono il tuo indirizzo IP.
              Se premi <b>Rifiuta</b> il sito funziona normalmente con i caratteri del tuo dispositivo. La scelta viene salvata solo nel tuo browser
              e puoi cambiarla in qualsiasi momento.
            </p>
            <button type="button" onClick={resetConsent}
              className="not-prose mt-2 inline-flex items-center h-11 px-5 rounded-full bg-brand hover:bg-brand-hover text-white text-sm font-bold transition-colors"
              data-testid="privacy-cookie-preferences-button">
              Modifica preferenze cookie
            </button>
          </section>

          <section>
            <h2 id="modifiche">11. Modifiche a questa informativa</h2>
            <p>
              Possiamo aggiornare questa informativa per adeguarla a novità normative o a cambiamenti del servizio. La data dell'ultimo
              aggiornamento è indicata in cima alla pagina; in caso di modifiche rilevanti avviseremo le scuole clienti.
            </p>
          </section>
        </article>
      </main>

      <SiteFooter />
    </div>
  );
}
