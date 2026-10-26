import re
B = '/app/frontend/'

def edit(p, fn):
    s = open(B + p).read()
    n = fn(s)
    open(B + p, 'w').write(n)

def landing(s):
    s = s.replace('''            <Link to="/iscrizione" className="hidden sm:inline-flex h-10 px-4 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 text-sm font-semibold items-center gap-1.5" data-testid="landing-enrollment-link">
              <Sparkles className="h-4 w-4 text-brand" /> Iscrivi tuo figlio
            </Link>
''', '')
    s = s.replace('''              <Link to="/iscrizione" className="h-14 px-7 rounded-2xl bg-stone-800 hover:bg-stone-700 text-white text-base font-semibold flex items-center gap-2">
                Iscrivi tuo figlio <Sparkles className="h-5 w-5 text-[#F2A65A]" />
              </Link>
''', '')
    s = s[:s.index('/* ------------------------------- Footer ---')] + s[s.index('/* ------------------------------- Primitives'):]
    s = s.replace('import { SITE, COMPANY, fullAddress } from "@/config/site";', 'import { SITE, COMPANY } from "@/config/site";\nimport { SiteFooter } from "@/components/SiteFooter";\nimport { usePageMeta } from "@/hooks/usePageMeta";')
    s = s.replace('FileText, Globe, Baby, Building2, ChevronDown,', 'FileText, Globe, Baby, ChevronDown,')
    s = s.replace('''export default function Landing() {
  return (''', '''export default function Landing() {
  usePageMeta({
    title: "Tiptii — App per asilo nido e scuola dell'infanzia",
    description: "Tiptii è l'app italiana per asili nido e scuole dell'infanzia 0–6 anni: diario giornaliero a colori, presenze, mensa, foto cifrate e comunicazioni con le famiglie.",
    path: "/",
  });
  return (''')
    s = s.replace('a: "Ogni scuola ha un modulo di iscrizione online: il genitore lo compila dal telefono', 'a: "Ogni scuola ha il proprio link di iscrizione online: il genitore compila il modulo dal telefono')
    return s

def privacy(s):
    s = s.replace('import { useEffect } from "react";', 'import { useEffect } from "react";\nimport { usePageMeta } from "@/hooks/usePageMeta";')
    s = s.replace('import { SiteFooter } from "@/pages/Landing";', 'import { SiteFooter } from "@/components/SiteFooter";')
    s = s.replace('''  useEffect(() => {
    const prev = document.title;
    document.title = `Privacy policy — ${SITE.productName} | ${COMPANY.legalName}`;
    return () => { document.title = prev; };
  }, []);
''', '''  usePageMeta({
    title: `Privacy policy — ${SITE.productName} | ${COMPANY.legalName}`,
    description: `Informativa privacy di ${SITE.productName}: quali dati trattiamo, come proteggiamo le foto dei bambini e come esercitare i tuoi diritti GDPR.`,
    path: "/privacy",
  });
''')
    s = s.replace('PEC {COMPANY.pec}, sviluppa', 'REA {COMPANY.rea}, PEC <a href={`mailto:${COMPANY.pec}`}>{COMPANY.pec}</a>, sviluppa')
    a = s.index('{SITE.productName} non usa cookie di profilazione')
    b = s.index("dall'account.") + len("dall'account.")
    s = s[:a] + '''{SITE.productName} non usa cookie di profilazione né strumenti di tracciamento pubblicitario o statistico. Dopo l'accesso
              vengono usati solo strumenti tecnici strettamente necessari a mantenerti collegato in modo sicuro: due cookie tecnici di
              sessione (<code>access_token</code>, durata 12 ore, e <code>refresh_token</code>, durata 14 giorni) e un token di autenticazione
              conservato nella memoria locale del browser. Non richiedono consenso e vengono eliminati quando esci dall'account o alla loro scadenza.''' + s[b:]
    return s

def login(s):
    return s.replace('''          <span className="mx-2">·</span>
          <Link to="/iscrizione" className="hover:text-brand font-semibold" data-testid="login-enrollment-link">
            Iscrivi tuo figlio
          </Link>
''', '')

edit('src/pages/Landing.jsx', landing)
edit('src/pages/Privacy.jsx', privacy)
edit('src/pages/Login.jsx', login)
edit('src/App.js', lambda s: s.replace('<Route path="/iscrizione" element={<PublicEnrollment />} />', '<Route path="/iscrizione" element={<Navigate to="/" replace />} />'))
edit('public/sitemap.xml', lambda s: re.sub(r'  <url>\n    <loc>https://www.tiptii.com/iscrizione</loc>.*?</url>\n', '', s, flags=re.S))
edit('public/llms.txt', lambda s: s.replace('- Iscrizione online: https://www.tiptii.com/iscrizione\n', '').replace('- Iscrizioni online con modulo pubblico per ogni scuola.', '- Iscrizioni online con un modulo dedicato per ogni scuola.'))
edit('public/index.html', lambda s: re.sub(r'        <meta name="keywords"[^\n]*\n', '', s.replace("<title>Tiptii — App per nido e scuola dell'infanzia | Diario, presenze e comunicazioni</title>", "<title>Tiptii — App per asilo nido e scuola dell'infanzia</title>")))
print("done")
