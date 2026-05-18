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

## Test Coverage
- Backend: **53/53 pytest passati** (iteration 2)
- Frontend: validazione visuale OK su dashboard, presenze, comunicazioni, eventi, laboratori, piano

## Backlog
### P1
- [ ] Email reali (SendGrid/Resend)
- [ ] STEP 2 — Menu rotante multi-settimana (settimana 1/2/3/4) come nel DB originale
- [ ] STEP 3 — Import dati da MySQL dump (script di migrazione)
- [ ] Notifiche push PWA quando il report giornaliero è pronto
- [ ] Esportazione PDF resoconto mensile / settimanale

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
