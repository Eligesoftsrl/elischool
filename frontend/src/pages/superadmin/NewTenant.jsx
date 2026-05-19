import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Sparkles, Send, Copy, CheckCircle2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";

const empty = {
  name: "", slug: "", contact_email: "", contact_phone: "", address: "",
  vat_number: "", website: "",
  admin_first_name: "Direzione", admin_last_name: "Scuola",
  plan: "trial",
};

function slugify(s) {
  return (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 64);
}

export default function NewTenant() {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const nav = useNavigate();
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const payload = { ...form, slug: slugify(form.slug || form.name) };
      const { data } = await api.post("/superadmin/tenants", payload);
      setResult(data);
      toast.success("Scuola creata! Email di invito inviata all'admin.");
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setBusy(false); }
  };

  if (result) {
    return (
      <div className="max-w-xl mx-auto text-center">
        <div className="h-20 w-20 rounded-3xl bg-emerald-500/20 mx-auto flex items-center justify-center mb-6">
          <CheckCircle2 className="h-10 w-10 text-emerald-400"/>
        </div>
        <h1 className="font-display text-3xl font-bold text-stone-100 mb-2">Scuola creata 🎉</h1>
        <p className="text-stone-400 mb-7">
          {result.email_sent
            ? <>L'email di invito è stata inviata all'admin a <b className="text-stone-200">{form.contact_email}</b>.</>
            : <>L'invio email è fallito. Copia e invia manualmente il link di setup all'admin:</>}
        </p>
        <div className="rounded-2xl bg-stone-900 border border-stone-800 p-4 text-left">
          <p className="text-[11px] uppercase tracking-wider text-stone-500 mb-2 font-bold">Link di setup password</p>
          <p className="text-xs text-stone-300 break-all font-mono mb-3" data-testid="new-tenant-invite-link">{result.invite_link}</p>
          <p className="text-[11px] uppercase tracking-wider text-stone-500 mt-4 mb-2 font-bold">Link iscrizione pubblica</p>
          <p className="text-xs text-stone-300 break-all font-mono">{window.location.origin}/iscrizione/{result.slug}</p>
        </div>
        <div className="flex gap-2 mt-5 justify-center">
          <button onClick={() => { navigator.clipboard.writeText(result.invite_link); toast.success("Copiato"); }}
            className="h-11 px-4 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-sm font-semibold flex items-center gap-2">
            <Copy className="h-4 w-4"/> Copia invito
          </button>
          <Link to="/superadmin" className="h-11 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-900 text-sm font-semibold flex items-center" data-testid="new-tenant-back">
            Torna alle scuole
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Link to="/superadmin" className="inline-flex items-center text-sm text-stone-500 hover:text-amber-400 mb-6"><ArrowLeft className="h-4 w-4 mr-1"/> Indietro</Link>
      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-stone-900 border border-stone-800 text-xs font-semibold text-stone-400 mb-4">
        <Sparkles className="h-3.5 w-3.5 text-amber-400"/> Nuovo tenant
      </span>
      <h1 className="font-display text-4xl font-bold text-stone-100 leading-tight mb-2">Crea una nuova scuola</h1>
      <p className="text-stone-500 mb-8">L'admin riceverà un'email per impostare la password e accedere al pannello.</p>

      <form onSubmit={submit} className="rounded-3xl bg-stone-900 border border-stone-800 p-6 space-y-5" data-testid="new-tenant-form">
        <Section title="Scuola">
          <Grid>
            <Field label="Nome scuola *">
              <Input value={form.name} onChange={(e) => { const n = e.target.value; setForm({ ...form, name: n, slug: slugify(form.slug || n) }); }} required testid="nt-name"/>
            </Field>
            <Field label="Slug (URL) *" hint={`Es. /iscrizione/${form.slug || "scuola-mariposa"}`}>
              <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} required testid="nt-slug"/>
            </Field>
            <Field label="Indirizzo" full><Input value={form.address} onChange={set("address")} testid="nt-address"/></Field>
            <Field label="P.IVA"><Input value={form.vat_number} onChange={set("vat_number")} testid="nt-vat"/></Field>
            <Field label="Sito web"><Input value={form.website} onChange={set("website")} placeholder="https://..." testid="nt-website"/></Field>
            <Field label="Telefono"><Input value={form.contact_phone} onChange={set("contact_phone")} testid="nt-phone"/></Field>
            <Field label="Piano">
              <select value={form.plan} onChange={set("plan")} data-testid="nt-plan"
                className="w-full h-12 px-3 rounded-2xl bg-stone-950 border border-stone-800 text-stone-200 focus:border-amber-400 focus:outline-none">
                <option value="trial">Trial (30 giorni)</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="demo">Demo</option>
              </select>
            </Field>
          </Grid>
        </Section>

        <Section title="Admin della scuola">
          <Grid>
            <Field label="Nome admin *"><Input value={form.admin_first_name} onChange={set("admin_first_name")} required testid="nt-admin-first"/></Field>
            <Field label="Cognome admin *"><Input value={form.admin_last_name} onChange={set("admin_last_name")} required testid="nt-admin-last"/></Field>
            <Field label="Email admin *" hint="Riceverà l'email di invito" full>
              <Input type="email" value={form.contact_email} onChange={set("contact_email")} required testid="nt-admin-email"/>
            </Field>
          </Grid>
        </Section>

        <button type="submit" disabled={busy}
          className="w-full h-14 rounded-2xl bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-stone-900 font-bold text-base flex items-center justify-center gap-2 tap-press"
          data-testid="nt-submit">
          <Send className="h-5 w-5"/> {busy ? "Creazione…" : "Crea scuola e invia invito"}
        </button>
      </form>
    </div>
  );
}

function Section({ title, children }) {
  return <section>
    <p className="text-[11px] uppercase tracking-wider font-bold text-stone-500 mb-3">{title}</p>
    {children}
  </section>;
}
function Grid({ children }) { return <div className="grid sm:grid-cols-2 gap-3">{children}</div>; }
function Field({ label, hint, children, full }) {
  return <label className={`block ${full ? "sm:col-span-2" : ""}`}>
    <span className="text-xs font-bold text-stone-400">{label}</span>
    <div className="mt-1">{children}</div>
    {hint && <span className="text-[10px] text-stone-600 mt-1 block">{hint}</span>}
  </label>;
}
function Input({ value, onChange, type = "text", required, testid, placeholder }) {
  return <input type={type} required={required} value={value} onChange={onChange} placeholder={placeholder}
    className="w-full h-12 px-4 rounded-2xl bg-stone-950 border border-stone-800 text-stone-200 placeholder-stone-600 focus:border-amber-400 focus:outline-none"
    data-testid={testid}/>;
}
