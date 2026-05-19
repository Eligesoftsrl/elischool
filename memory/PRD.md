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
