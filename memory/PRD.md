# PRD — Scuola dell'Infanzia PWA ("nido.")

## Original Problem
Riconvertire un'applicazione esistente (Flask + MySQL) per la gestione di una scuola dell'infanzia in una PWA mobile-first "wow", fruibile al 100% da smartphone e tablet, con:
- Riferimento "anno scolastico"
- Possibilità di spostare alunni fra classi e di promuoverli al nuovo anno
- Accesso genitori sicuro con recupero password
- AI Report giornaliero per i genitori

## Stack scelto
- Frontend: React 19 + Tailwind + framer-motion + lucide-react + shadcn (su misura)
- Backend: FastAPI + Motor (Mongo)
- DB: MongoDB
- Auth: JWT (bearer in localStorage, cookies set ma allow_credentials=False)
- AI: GPT-5.2 via Emergent Universal Key (emergentintegrations) con fallback italiano automatico
- Email: MOCKED (link restituito in API + log)

## Architettura
```
/app/backend/server.py              ~1200 righe — auth, anni, classrooms, students, enrollments, transfer, year-transition, teachers, parents (invite mock), activities (upsert/idempotent), menus, news, parent endpoints, AI daily report, seed
/app/backend/.env                   JWT_SECRET, ADMIN_*, EMERGENT_LLM_KEY, FRONTEND_URL
/app/frontend/src/App.js            React Router con route protette + AuthProvider
/app/frontend/src/contexts/AuthContext.jsx
/app/frontend/src/lib/api.js        Axios + Bearer interceptor + 401 redirect
/app/frontend/src/layouts/StaffLayout.jsx   Top bar + side nav + year switcher + user menu
/app/frontend/src/layouts/ParentLayout.jsx  Max-w-lg + bottom nav + glass
/app/frontend/src/pages/...         Login, ForgotPassword, ResetPassword, SetupPassword, Landing
/app/frontend/src/pages/staff/      Dashboard, Students, Classrooms, Teachers, Parents, Activities, Menu, News, Years, YearTransition
/app/frontend/src/pages/parent/     Home (AI report), Timeline, Menu, News
/app/frontend/src/components/Primitives.jsx
```

## Personas
1. **Direzione/Admin** — gestisce anni, classi, maestre, genitori, menu, news; può fare passaggio anno
2. **Maestra/Teacher** — registra le attività giornaliere, crea news/menu, gestisce classi/alunni
3. **Genitore/Parent** — vede solo i propri figli, riceve il resoconto AI quotidiano, vede menu, news, timeline

## Funzionalità implementate (MVP completato 15/05/2026)
- [x] Login JWT (admin + teacher + parent) con brute-force protection (5 tentativi → 15 min lock)
- [x] Recupero password con token e link mock
- [x] Invito genitori con token di setup-password mock
- [x] Anno scolastico CRUD + attivazione
- [x] Sezioni/Aule CRUD legate all'anno con assegnazione maestre + conteggio alunni
- [x] Alunni CRUD con ricerca, allergie evidenziate
- [x] Spostamento alunno tra sezioni (transfer log persistito)
- [x] Wizard passaggio anno (mapping classe→classe, promozione bulk)
- [x] Maestre CRUD (solo admin)
- [x] Genitori CRUD con linking ai figli, status pending/active
- [x] Attività quotidiane: didattica, motoria, merenda, pranzo, riposo (minuti), pipì/cacca/bagno, umore, note — upsert idempotente (student+date unique)
- [x] Menu settimanale con 5 giorni × 4 portate
- [x] News a tutta scuola o per sezione
- [x] Dashboard staff con stats e attività di oggi
- [x] Parent home: hero personalizzato, AI report con refresh, blocchi attività, contatori, note maestre
- [x] Parent timeline 30 giorni
- [x] Parent menu corrente + news
- [x] Child-switcher per genitori con più figli
- [x] Sicurezza: genitore può vedere SOLO i propri figli (403 altrimenti)
- [x] PWA-ready meta tags (theme-color, apple-mobile-web-app-capable)
- [x] Design mobile-first: bottom nav, max-w-lg, large touch targets (48px+), framer-motion transitions, bottom-sheet drawer per attività, Outfit/Manrope fonts, palette pastello con accenti per categoria attività
- [x] Italiano UI ovunque
- [x] data-testid su tutti gli elementi interattivi principali

## Test Coverage
- Backend: 26/26 pytest tests passati (auth, RBAC, transfer, year-transition, AI fallback, parent security)
- Frontend: validazione visiva tramite screenshot — Landing, Login, Staff Dashboard, Parent Home (con AI report), Staff Activities

## Backlog / Future
### P1
- [ ] Email reale (SendGrid/Resend) al posto del mock
- [ ] Upload foto / gallery multimediale per attività
- [ ] Notifiche push PWA quando il report giornaliero è pronto
- [ ] Eventi calendario condivisi (oltre alla news "evento")
- [ ] Esportazione PDF resoconto mensile

### P2
- [ ] Importazione dati da MySQL dump
- [ ] Manifest.json completo + icone 192/512 per installazione PWA
- [ ] Sezione "permessi granulari" per parentela (papà / mamma / nonna)
- [ ] Chat 1:1 tra genitore e maestra
- [ ] Multi-tenant (più scuole)
- [ ] Splittare server.py in moduli (auth.py, students.py, ai.py…)

## Note Tecniche
- Emergent Universal Key dev budget: limitato. Se esaurito l'AI report cade automaticamente sul fallback italiano (testo concatenato dalle attività registrate). Per AI completa, top-up della key da Profilo → Universal Key.
- CORS attualmente `*` con `allow_credentials=False`: il frontend usa Bearer token in localStorage.
- Brute-force lockout collection: `login_attempts` (TTL non impostato, pulizia manuale opzionale).
