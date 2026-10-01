# PRD — Scuola dell'Infanzia PWA ("nido.")

## Original Problem
Riconvertire un'applicazione esistente (Flask + MySQL) per la gestione di una scuola dell'infanzia in una PWA mobile-first "wow".

## Stack
- Frontend: React 19 + Tailwind + framer-motion + lucide-react + @tailwindcss/typography
- Backend: FastAPI + Motor (Mongo)
- DB: MongoDB
- Auth: JWT (bearer in localStorage)
- AI: GPT-5.2 via Emergent Universal Key (fallback Italian text)
- Email: MOCKED

## Architettura
```
/app/backend/server.py              ~1660 righe (da splittare in P2)
/app/backend/.env                   JWT_SECRET, ADMIN_*, EMERGENT_LLM_KEY, FRONTEND_URL
/app/frontend/src/App.js            React Router con route protette
/app/frontend/src/contexts/AuthContext.jsx
/app/frontend/src/lib/api.js
/app/frontend/src/layouts/StaffLayout.jsx   Top bar + side nav (16 voci) + year switcher
/app/frontend/src/layouts/ParentLayout.jsx  Bottom nav (5 voci) + glass
/app/frontend/src/pages/staff/      Dashboard, Students, Classrooms, Teachers, Parents, Activities, Menu, News, Years, YearTransition, LessonPlans, Communications, Events, ExtraLabs, SchoolProfile, Attendance, Gallery
/app/frontend/src/pages/parent/     Home, Timeline, Menu, News, Class, Calendar
```

## Personas
1. **Direzione/Admin** — gestisce anni, classi, maestre, profilo scuola, passaggio anno
2. **Maestra/Teacher** — attività, piano didattico, comunicazioni, presenze, foto
3. **Genitore/Parent** — vede solo i propri figli, riceve resoconto AI quotidiano, comunicazioni di classe + foto, piano didattico, laboratori, calendario eventi, menu

## Iterazioni completate

### Iteration 1 (MVP, 15/05/2026) — 26/26 backend tests ✅
- JWT auth (admin/teacher/parent) + brute-force protection + password recovery mock
- Anno scolastico + attivazione
- Sezioni/Aule, Alunni, Maestre, Genitori (invite mock), Parentela
- Spostamento alunno fra sezioni + Wizard passaggio anno
- Attività quotidiane (upsert per student+date)
- Menu settimanale + News
- AI Report giornaliero (GPT-5.2 + fallback)
- Dashboard staff + Parent home con resoconto

### Iteration 5 (Bulk apply scheda, 18/05/2026) — 76/76 backend tests ✅
Rifatto secondo l'osservazione corretta dell'utente: "Replica scheda" non aveva senso perché pranzo/didattica/motoria dipendono dalla data (sono già auto-fill), e Si/No cambiano ogni giorno. Sostituito con il workflow reale:
- **POST /api/activities/bulk** — applica UNA scheda a TUTTI gli alunni della sezione per una data
- Body: `{classroom_id, school_year_id, date, ...activity_fields, overwrite_existing, only_student_ids?}`
- Risposta: `{applied, skipped, students_modified}`
- Skip se la scheda di un alunno esiste già (a meno di `overwrite_existing=true`)
- Frontend: bottone "Compila tutta la sezione" → modal con auto-fill da menu/piano/laboratori già attivi + banner conferma + checkbox sovrascrivi
- Workflow: maestra fa il bulk una volta, poi ritocca singolarmente le 1-2 varianti

### Iteration 4 (Auto-fill scheda + Replica, 18/05/2026)
Replicato comportamento del Flask originale `nuova_attivita`:
- **GET /api/activities/suggestions?student_id=&date_str=** → restituisce auto-fill per:
  - `note_pranzo` ← dal menu rotante (settimana corrente × giorno della settimana)
  - `note_didattica` ← dai piani didattici attivi della classe per quella data (HTML strippato)
  - `note_motoria` ← dal laboratorio extra della classe per quel giorno della settimana
- **GET /api/activities/last-before?student_id=&before_date=** → ultima scheda precedente (per "Copia da ieri")
- **GET /api/activities/replicate-from?student_id=&from_date=** → scheda di una data specifica
- Frontend Activities.jsx: auto-call suggestions quando si apre scheda NUOVA, banner "Pre-compilato da: piano · laboratorio · menu", bottone "Replica" in header del modal

### Iteration 3 (STEP 2, 18/05/2026) — 63/63 backend tests ✅
Allineamento esatto al backend Flask originale per due cose critiche:
- **Scheda quotidiana attività** — voci e valori IDENTICI al Flask:
  - Didattica: `Partecipato` / `Non ha Partecipato`
  - Motoria: `Partecipato` / `Non ha Partecipato`
  - Pranzo: `Ha mangiato` / `Non ha mangiato` / `Ha mangiato poco`
  - Merenda, Riposo, Cacca, Pipì: `Si` / `No`
  - Note libere per ognuna delle voci principali + Note generali
  - Rimossi i campi inventati (umore, riposo_minuti, bagno_cambi, contatori pipì/cacca)
- **Menu rotante 4 settimane × 5 giorni** (lun-ven):
  - Modello `menus` (contenitore) + `menu_meals` (righe per settimana × giorno)
  - 20 righe per menu (4 × 5), pre-create automaticamente alla creazione
  - Editor a tab per settimana, UI mobile-friendly
  - GET `/menus/current` calcola la settimana rotante (1..4) in base alla settimana ISO corrente vs `valid_from`
  - Seed con i veri dati dal dump MySQL dell'utente (Settimana 1 Lun = Pasta con legumi/Prosciutto cotto/Insalata/Frutta fresca, ecc.)
  - Vista genitore: mostra automaticamente la settimana corrente

### Iteration 2 (STEP 1h, 15/05/2026) — 53/53 backend tests ✅
Allineamento al DB MySQL reale dell'utente. Aggiunte:
- **Piano didattico settimanale** (`lesson_plans`) — rich text HTML, per classe e range date
- **Comunicazioni rich** (`communications`) — sostituisce News, con tipologia (classe/evento/avviso) + classe destinataria + foto allegate
- **Eventi calendario** (`calendar_events`) — entità separata con categoria (festività, chiusura, gita, festa, riunione, altro)
- **Laboratori extra** (`extra_labs`) — palinsesto settimanale classe × giorno (musicoterapia, teatro, ecc.)
- **Profilo Scuola** (`school_profile`) — singleton: ragione sociale, P.IVA, contatti, social, logo (base64)
- **Foto/Media** (`media`) — upload base64 (max 4MB), gallery, viewer, parent scoping
- **Barcode + Presenze** (`barcodes`, `attendance`) — generazione barcode per alunno, scan ingresso/uscita, manuale fallback
- **Endpoint parent** dedicati per lesson-plans, communications, extra-labs (con isolation per i propri figli)
- **/api/public/school-profile** accessibile senza auth
- Endpoint generici scoped admin/teacher (security hardening dopo test agent feedback)

## Personalizzazioni UI
- Outfit + Manrope fonts
- Palette pastello (#FF8C6B brand, tonalità per attività)
- Bottom-sheet drawer per registro giornaliero
- Layout monthly per eventi
- Palinsesto a 5 colonne (giorni)
- Lazy load delle foto (singolo GET /media/{id} on demand)

### Iteration 13 (19/02/2026) — 9 Modifiche + Menu 4 gruppi + BottomNav mobile ✅
Grande batch di miglioramenti UX/anagrafica su richiesta cliente:
- **Sezione nella scheda alunno**: campo Sezione (dropdown) in form nuovo/modifica alunno → crea/aggiorna enrollment automaticamente sull'anno attivo. Backend: `StudentIn.classroom_id`
- **Filtro sezione su `/s/alunni`**: pill orizzontali "Tutte le sezioni · Coccinelle (3) · Farfalle (1) · …" con contatore live. Nascoste quando si guarda "Ritirati" o "Da assegnare"
- **Badge genitore su card alunno**: 👥 "Nome Cognome" in viola se linkato / ⚠ "Nessun genitore associato" in ambra se no
- **Abbinamento genitore→bambino con autocomplete**: sostituita la lista pill con un search field. Ogni suggerimento mostra nome + CF (font mono) + sezione (badge). Filtra su nome/cognome/CF/sezione. Selezionati come chip rimovibili con CF visibile.
- **CF nella scheda Genitore** (facoltativo, validato con regex se compilato). Visualizzato sulla card + su ogni chip figlio collegato
- **Campo Note** già presente su Alunni/Genitori/Maestre/Sezioni (verificato)
- **Rinomina "Eventi" → "Festività & Chiusure"** su menu voce, PageHeader e subtitle
- **Piano didattico multi-sezione**: campo `classroom_ids: List[str]` sul model. Nuovo form con tasto esplicito **"Tutte le sezioni della scuola"** (violaceo) + multi-select alternativa. `[]` = tutte, altrimenti solo sezioni specifiche. Backward-compat con vecchio `classroom_id` singolo.
- **Diario auto-fill "tutto sì"**: se l'utente salva la scheda giornaliera **senza toccare NESSUN checkbox** (didattica/motoria/pranzo/merenda/riposo/cacca/pipì), applico i default `Partecipato/Ha mangiato/Sì` in automatico. Se ha toccato anche solo un campo, il resto resta vuoto. Toast informativo.

**Menu riorganizzato in 4 gruppi (A+C combinato):**
- OGGI (default open): Dashboard · Presenze · Diario
- ANAGRAFICHE: Alunni · Sezioni · Genitori · Maestre
- VITA SCOLASTICA: Piano · Laboratori · Comunicazioni · Festività & Chiusure · Galleria
- GESTIONE (admin only): Iscrizioni · Menu mensa · Profilo scuola · Anni · Passaggio anno

**BottomNav su mobile**: bar fissa in basso con 5 shortcut (Home · Presenze · Diario · Alunni · Altro→drawer). `safe-area-inset-bottom` per iOS. Padding-bottom su `<main>` per non nascondere l'ultimo contenuto.

### Iteration 12 (19/02/2026) — Menu Riorganizzato + Redirect + Widget compleanni ✅
Implementata la riorganizzazione completa del menu backoffice richiesta da documento cliente (Nursery_Smart_Riorganizzazione_Menu):
- **7 gruppi collapsible** in `StaffLayout.jsx`: HOME · OGNI GIORNO · DIDATTICA · ANAGRAFICHE · COMUNICAZIONE · SEGRETERIA · CONFIGURAZIONE (ordinati per frequenza d'uso)
- **HOME + OGNI GIORNO aperti di default**, altri chiusi. Stato persistente per utente in `localStorage["nav_groups_open"]`. Il gruppo contenente la pagina attiva si apre automaticamente. Transizioni animate framer-motion. Chevron rotante.
- **Rinomine**: `/s/attivita` → **`/s/diario`** (voce "Diario"), `/s/menu` → **`/s/menu-mensa`** (voce "Menu mensa"). Redirect automatici da vecchi URL per preservare bookmark/PWA
- **Rimozioni dal menu principale + integrazione**:
  - "Compleanni" → nuovo **widget "Prossimi compleanni"** sulla Dashboard (top 5 nei prossimi 30 giorni, con badge "Oggi 🎉" / "Domani" / "Tra N giorni", CTA "Vedi tutti" verso `/s/compleanni` che resta accessibile)
  - "Tesserini" → pagina resta accessibile ma non nel nav (accessibile ancora via `/s/tesserini`)
- **Permessi ruolo**: gruppi SEGRETERIA e CONFIGURAZIONE **completamente nascosti alle maestre** (marker `admin: true` sul gruppo). Menu maestra ora conta 5 gruppi vs 7 per admin.
- **Passaggio anno "safe"**: bottone apre modal di conferma con riepilogo + **input digitazione obbligatoria dell'anno di destinazione** (es. deve digitare esattamente "2026/2027") prima di poter eseguire. Icona AlertTriangle in rosso, tema rosa per l'azione irreversibile.
- Aggiornati anche i link interni (Dashboard CTA "Registra giornata" ora punta a `/s/diario`)

### Iteration 11 (19/02/2026) — Alunni senza sezione + Ritiri strutturati ✅
Migliorata la gestione anagrafica con visibilità e ciclo di vita completo dell'alunno:
- **Banner "senza sezione"** in cima a `/s/alunni` (giallo, cliccabile → filtra) + **pill filtri** rapidi: `Tutti (N)` `Da assegnare (N)` `Ritirati (N)` con conteggi live
- **Ritiro alunno strutturato**: modal con motivo dropdown (Trasferimento / Non rinnovo / Trasloco / Diplomato / Altro) + data + note. Backend: `POST /students/{id}/withdraw` con validazione motivo + rimozione enrollments correnti (attività storiche restano).
- **Ripristino**: `POST /students/{id}/reactivate` — l'alunno torna attivo, va riassegnato a una sezione
- **Ricerca intelligente**: quando cerchi qualcuno tra gli attivi e nessun risultato ma c'è un match tra i ritirati, appare sotto "Trovati tra i ritirati (N)" con quick action **Ripristina** inline
- **Alunni ritirati nascosti da default**: `GET /students` filtra per default `status=active` (accetta anche legacy docs senza campo). Query param `?status=withdrawn` per solo ritirati, `?status=all` per tutti.
- **Card visivamente distinta**: ritirati bordo tratteggiato + icona `UserX` grigia + badge "Ritirato il DD/MM/YYYY" + motivo mostrato in card
- **Dashboard admin**: 2 nuove card alert cliccabili — "N alunni senza sezione" (giallo) + "N ritiri questo mese" (grigio) con contatore totale
- **Compleanni**: escludono automaticamente i ritirati
- **Bonus UX**: alunno senza sezione ha bottone "Assegna" (invece di "Sposta") con colore ambra + bordo giallo sulla card per attirare l'occhio; distinzione chiara tra "Ritira" (archivia, arancio, reversibile) vs "🗑️ Elimina" (rosso, definitivo, con warning esplicito)

### Iteration 10 (19/02/2026) — UX Presenze & Ricerca Alunni ✅
Migliorata l'usabilità delle 2 sezioni backoffice più usate quotidianamente:
- **Presenze multi-sezione** (`/s/presenze`): l'admin può ora selezionare N sezioni contemporaneamente tramite pill toggleable con icona checkbox. Bottone "Seleziona/Deseleziona tutte" per rapidità. Gli alunni vengono raggruppati per sezione con percentuale presenza inline (0%, 100%, ecc.). Fetch parallela via `Promise.all` per performance.
- **Ricerca alunni** (`/s/alunni`): campo di ricerca live, filtra su nome, cognome, "nome cognome", CF, città e sezione. Bottone X per pulire. Contatore dinamico "N di M bambini". EmptyState dedicato quando nessun risultato.

### Iteration 9 (19/02/2026) — CF + Città residenza (Autocomplete Comuni) ✅
Rafforzata l'anagrafica alunni per compliance italiana. Test 100% verde (backend 18/18 pytest + frontend E2E completo):
- **Codice Fiscale obbligatorio** su tutti gli alunni (nuovi e da iscrizione pubblica). Validazione formato (regex 16 char alfanumerici) + normalize automatica (uppercase, strip). Chiave univoca **per tenant** via partial unique index `(tenant_id, fiscal_code)`.
- **Comuni italiani** — 7904 records da `matteocontrini/comuni-json` bundlati in `/app/backend/comuni.json`. Nuovo endpoint pubblico `GET /api/public/comuni?q=<prefix>` con caricamento lazy in memoria + fallback substring match.
- **Componente riusabile** `<ComuniAutocomplete>` con debounce 180ms, navigazione tastiera (arrow + enter + escape), match prefix, cap+sigla mostrati inline.
- **Campi obbligatori aggiornati**: Bambino (Nome+Cognome+Data nascita+**CF**); Genitore (Nome+Cognome+**Cellulare**); **Città residenza**. Email genitore ora **opzionale** — se assente il parent user viene creato con placeholder email (@placeholder.local) e nessun invito viene inviato; l'admin dovrà completare l'email da `/s/genitori` per attivare il login.
- **Prevention duplicate**: sia in `POST /public/enrollment-requests` (check contro students esistenti + richieste pending stesso tenant) sia in `POST /students` (check contro tutti gli students del tenant).
- **Backfill seed**: gli alunni pre-esistenti hanno ricevuto CF sintetici (`ROSALI22A01H501A`, `VERMAR22A01H501B`, ecc.) + città (Milano/Roma/Torino/…).

### Iteration 8 (19/02/2026) — Multi-tenant Frontend (Fase 1B + 1C) ✅
Cablato il frontend per il SaaS multi-tenant. Test 100% verde (backend 12/12 + frontend 8/8 E2E):
- **Layout SuperAdmin** dark, separato dal layout staff (`/app/frontend/src/layouts/SuperAdminLayout.jsx`)
- **Pagina `/superadmin`** — lista scuole con stats card (alunni/utenti/sezioni/in attesa), azioni: sospendi/riattiva, copia link iscrizione, elimina (con doppia conferma cascade)
- **Pagina `/superadmin/tenants/new`** — wizard creazione scuola con auto-slugify, success screen mostra invite link + URL iscrizione pubblica
- **Header staff/parent** dinamico: logo + nome scuola del tenant corrente (fallback a "nido." se assente); login response arricchita con `user.tenant`
- **Route pubblica `/iscrizione/:slug`** — landing branded per scuola, query param `tenant_slug` automatico

### Iteration 7 (19/02/2026) — Multi-tenant SaaS Foundation ✅
Trasformata l'app in **SaaS multi-tenant**: una sola istanza serve N scuole isolate.
- **`tenants` collection**: `{id, slug, name, logo_base64, contact_email/phone, address, vat_number, website, plan, status, created_at}`
- **`tenant_db.py` (nuovo modulo)**: `SmartDB` wrapper su Motor + `contextvars`. Auto-scoping di TUTTE le query/insert sulle 18 collection "owned" (students, classrooms, users, enrollments, ecc.). Zero modifiche ai 97 endpoint esistenti.
- **JWT esteso** con `tenant_id`. `get_current_user` imposta il contextvar.
- **Ruolo `superadmin`** (no tenant, bypass scoping). Credenziali da `.env`.
- **Migrazione one-shot** in `seed()`: tutti i documenti pre-esistenti taggati con `tenant_id="tenant-demo"`. Default tenant eredita dati da legacy `school_profile`.
- **Endpoint `/api/superadmin/*`**: list, get, create (+ invio invito Brevo automatico al primo admin), patch (sospendi/cambia plan), delete (cascade su tutte le collection).
- **Endpoint pubblici** identificano tenant via slug: `POST /api/public/enrollment-requests?tenant_slug=mariposa`, `GET /api/public/school-profile?tenant_slug=mariposa`.
- **Sospensione**: login bloccato per utenti di tenant `suspended`.
- **Test E2E**: 8/8 passati live → isolamento perfetto tra tenant Demo e Mariposa (creata + popolata + eliminata).

### Iteration 6 (19/02/2026) — Brevo Email Integration ✅
Sostituiti tutti i mock email con invii reali via Brevo REST API v3:
- **Servizio `email_service.py`** — usa httpx + Brevo `POST /v3/smtp/email`, fallback graceful (se Brevo fallisce, app non si rompe, ritorna mock link)
- **3 flussi cablati**: forgot-password, create parent invite, resend invite, approve enrollment request
- **Template HTML brandizzati "nido."** in italiano (header con logo, CTA button arancio, footer firmato)
- **Endpoint admin** `POST /api/admin/email/test` per verificare la config
- **Env vars**: `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, `BREVO_SENDER_NAME`, `EMAIL_ENABLED`
- ⚠️ Brevo IP whitelist: l'IP del pod (34.16.56.64) deve essere autorizzato su Brevo
- Verificato live: 3 email inviate con successo a casella reale, HTTP 201 + messageId

### Iteration 5 (19/02/2026) — Legacy Parity Final ✅
Aggiunte le 3 ultime feature per parità 100% con Flask/MySQL legacy:
- **Compleanni** (`/api/birthdays`) — dashboard con prossimi compleanni (7/30/90/365 giorni), raggruppati per mese, evidenziazione "Oggi" e "Domani"
- **Stampa tesserini PDF** (`/api/barcodes/pdf`) — ReportLab A4 con 10 barcode Code-128 per pagina, filtro per sezione o tutta la scuola
- **Iscrizione pubblica** (`/iscrizione` + `/api/public/enrollment-requests`) — form pubblico senza auth, lista admin con approva/rifiuta, alla approvazione crea alunno + genitore con link invito mock
- Link pubblico aggiunto in Landing e Login (`Iscrivi tuo figlio`)
- Test E2E: backend 22/22 pytest + frontend Playwright 7/7 checkpoint (iteration_5.json)

## Test Coverage
- Backend: **75/75 pytest** (53 iter2 + 22 iter5) ✅
- Frontend: E2E Playwright OK su Iscrizione pubblica, Compleanni, Tesserini PDF, approvazione admin

## Backlog
### P1 (prossimi)
- [ ] STEP 3 — Import dati da MySQL dump (186 alunni, 169 genitori) come secondo tenant
- [ ] Dopo approvazione iscrizione → modal/redirect per assegnare sezione
- [ ] Stripe Subscriptions integrato col `tenant.plan` (trial 30gg → basic/pro)
- [ ] Notifiche push PWA quando il report giornaliero è pronto
- [ ] Esportazione PDF resoconto mensile / settimanale
- [ ] Rate-limit sul POST /api/public/enrollment-requests (anti-spam)

### Iteration — 01/10/2026 (UX anagrafiche)
- Pulsanti "Annulla/Salva" sticky in tutti i modali anagrafiche (Alunni, Genitori, Ritiro, Comunicazioni) — sempre visibili senza scroll
- Lista Alunni: visualizzato il Codice Fiscale del bambino sotto nome/sezione
- Click sul nome genitore nella card alunno → popup "Dettaglio genitore" (nome, status, email cliccabile, telefono cliccabile, CF, note, figli collegati) chiudibile con X o pulsante
- Nuova comunicazione: aggiunto campo obbligatorio "Data comunicazione" pre-compilato con oggi, modificabile sia in creazione sia in modifica

### P2
- [ ] Modifica completa tenant lato superadmin (al momento solo status/plan via PATCH)
- [ ] Sender email Brevo per-tenant (ogni scuola può configurare il proprio dominio)
- [ ] Webhook Brevo per tracciare aperture/bounce

### P2
- [ ] Splittare server.py in moduli (auth, school, parents, activities, communications, attendance, media, ai)
- [ ] Duplicate-action guard su POST /api/attendance (evita doppio check-in)
- [ ] Storage media su filesystem/S3 invece di base64 in Mongo
- [ ] Manifest.json + icone PWA installabili
- [ ] Multi-tenant (più scuole)
- [ ] Chat 1:1 maestra-genitore
- [ ] OCR/QR scanner camera-based per barcode

## Note Tecniche
- Universal Key dev budget limitato → AI report cade su fallback italiano automatico.
- CORS `*` con `allow_credentials=False`; frontend usa Bearer in localStorage.
- Media storage: base64 in MongoDB (OK per MVP, da migrare a storage esterno in produzione).
