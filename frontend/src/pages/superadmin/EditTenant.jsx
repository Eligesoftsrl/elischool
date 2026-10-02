import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { ArrowLeft, Save, Trash2, Pause, Play, Image as ImageIcon, Mail, Phone, Globe, MapPin, FileText, GraduationCap, Users, Layers, Inbox, School } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { Card, Pill } from "@/components/Primitives";
import { fmtDate } from "@/lib/format";

const PLAN_LABEL = { trial: "Trial (30 giorni)", basic: "Basic", pro: "Pro", demo: "Demo" };

export default function EditTenant() {
  const { id } = useParams();
  const nav = useNavigate();
  const [tenant, setTenant] = useState(null);
  const [form, setForm] = useState({
    name: "", contact_email: "", contact_phone: "", address: "",
    vat_number: "", website: "", logo_base64: "", plan: "trial", status: "active",
  });
  const [saving, setSaving] = useState(false);
  const [logoName, setLogoName] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get(`/superadmin/tenants/${id}`);
      setTenant(data);
      setForm({
        name: data.name || "",
        contact_email: data.contact_email || "",
        contact_phone: data.contact_phone || "",
        address: data.address || "",
        vat_number: data.vat_number || "",
        website: data.website || "",
        logo_base64: data.logo_base64 || "",
        plan: data.plan || "trial",
        status: data.status || "active",
      });
    } catch (e) { toast.error(apiErrorMessage(e)); nav("/superadmin"); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [id]);

  const onLogoPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("Logo max 2MB"); return; }
    const r = new FileReader();
    r.onload = () => { setForm((p) => ({ ...p, logo_base64: r.result })); setLogoName(f.name); };
    r.readAsDataURL(f);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch(`/superadmin/tenants/${id}`, form);
      setTenant(data);
      toast.success("Scuola aggiornata");
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setSaving(false); }
  };

  const toggleStatus = () => {
    const next = form.status === "active" ? "suspended" : "active";
    setForm({ ...form, status: next });
    toast(`Stato impostato su "${next === "active" ? "Attiva" : "Sospesa"}" — ricorda di salvare`, { icon: "💡" });
  };

  const remove = async () => {
    if (!confirm(`ELIMINARE definitivamente "${tenant?.name}" e tutti i suoi dati? L'azione non è reversibile.`)) return;
    if (!confirm(`Conferma: eliminerai utenti, alunni, foto e attività di "${tenant?.name}".`)) return;
    try { await api.delete(`/superadmin/tenants/${id}`); toast.success("Scuola eliminata"); nav("/superadmin"); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  if (!tenant) {
    return <div className="h-64 flex items-center justify-center text-stone-400">Caricamento…</div>;
  }

  return (
    <div className="max-w-5xl mx-auto">
      <Link to="/superadmin" className="inline-flex items-center text-sm text-stone-500 hover:text-[#2F7D6D] mb-6">
        <ArrowLeft className="h-4 w-4 mr-1" /> Torna alle scuole
      </Link>

      {/* Hero */}
      <div className="mb-6 rounded-3xl bg-white border border-stone-200 p-5 md:p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          <div className="h-20 w-20 rounded-2xl bg-brand-light/50 border border-brand-light overflow-hidden flex items-center justify-center shrink-0">
            {form.logo_base64
              ? <img src={form.logo_base64.startsWith("data:") ? form.logo_base64 : `data:image/png;base64,${form.logo_base64}`} alt="" className="h-full w-full object-cover" />
              : <School className="h-9 w-9 text-[#2F7D6D]" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">Modifica scuola</p>
            <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-900 truncate" data-testid="edit-tenant-name">{tenant.name}</h1>
            <div className="flex items-center gap-2 flex-wrap mt-1.5">
              <Pill color={form.status === "active" ? "green" : "rose"}>{form.status === "active" ? "Attiva" : "Sospesa"}</Pill>
              <Pill color="brand">Piano: {PLAN_LABEL[form.plan] || form.plan}</Pill>
              <span className="text-xs text-stone-500">Attiva dal {fmtDate(tenant.created_at)}</span>
            </div>
            <p className="text-xs text-stone-500 mt-1 truncate">URL pubblico: <code className="font-mono text-stone-800">/iscrizione/{tenant.slug}</code></p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button" onClick={toggleStatus}
              className={`h-11 px-4 rounded-2xl text-sm font-semibold flex items-center gap-2 ${
                form.status === "active" ? "bg-amber-100 hover:bg-amber-200 text-amber-900" : "bg-emerald-100 hover:bg-emerald-200 text-emerald-900"
              }`}
              data-testid="edit-toggle-status"
            >
              {form.status === "active" ? <><Pause className="h-4 w-4" /> Sospendi</> : <><Play className="h-4 w-4" /> Riattiva</>}
            </button>
            <button
              type="button" onClick={remove}
              className="h-11 w-11 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center"
              data-testid="edit-delete-tenant" title="Elimina scuola"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatMini icon={<GraduationCap className="h-4 w-4" />} label="Alunni" value={tenant.stats?.students ?? 0} />
        <StatMini icon={<Users className="h-4 w-4" />} label="Utenti" value={tenant.stats?.users ?? 0} />
        <StatMini icon={<Layers className="h-4 w-4" />} label="Sezioni" value={tenant.stats?.classrooms ?? 0} />
        <StatMini icon={<Inbox className="h-4 w-4" />} label="Iscrizioni pending" value={tenant.stats?.enrollment_requests_pending ?? 0} />
      </div>

      <form onSubmit={save} className="grid lg:grid-cols-2 gap-4" data-testid="edit-tenant-form">
        <Card>
          <SectionTitle>Identità</SectionTitle>
          <div className="space-y-3 mt-3">
            <Field label="Nome scuola *">
              <Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="edit-name" />
            </Field>
            <Field label="Slug URL (readonly)">
              <Input value={tenant.slug} onChange={() => {}} readOnly testid="edit-slug" />
            </Field>
            <Field label="Logo (max 2MB)">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                  {form.logo_base64
                    ? <img src={form.logo_base64.startsWith("data:") ? form.logo_base64 : `data:image/png;base64,${form.logo_base64}`} alt="" className="h-full w-full object-cover" />
                    : <ImageIcon className="h-5 w-5 text-stone-400" />}
                </div>
                <label className="flex-1 h-12 rounded-2xl bg-stone-50 border border-stone-200 hover:border-brand hover:bg-white cursor-pointer flex items-center justify-center text-sm font-semibold text-stone-700">
                  <input type="file" accept="image/*" onChange={onLogoPick} className="hidden" data-testid="edit-logo-input" />
                  {logoName || (form.logo_base64 ? "Sostituisci logo" : "Carica logo")}
                </label>
                {form.logo_base64 && (
                  <button type="button" onClick={() => { setForm({ ...form, logo_base64: "" }); setLogoName(""); }}
                    className="h-10 px-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold" data-testid="edit-logo-clear">
                    Rimuovi
                  </button>
                )}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>Contatti</SectionTitle>
          <div className="space-y-3 mt-3">
            <Field label="Email admin *">
              <IconInput icon={<Mail className="h-4 w-4" />} type="email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v.toLowerCase() })} required testid="edit-email" />
            </Field>
            <Field label="Telefono">
              <IconInput icon={<Phone className="h-4 w-4" />} value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} testid="edit-phone" />
            </Field>
            <Field label="Sito web">
              <IconInput icon={<Globe className="h-4 w-4" />} value={form.website} onChange={(v) => setForm({ ...form, website: v })} testid="edit-website" placeholder="https://" />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>Sede legale</SectionTitle>
          <div className="space-y-3 mt-3">
            <Field label="Indirizzo completo">
              <IconInput icon={<MapPin className="h-4 w-4" />} value={form.address} onChange={(v) => setForm({ ...form, address: v })} testid="edit-address" placeholder="Via, numero, CAP, Città (PR)" />
            </Field>
            <Field label="P.IVA / Codice Fiscale">
              <IconInput icon={<FileText className="h-4 w-4" />} value={form.vat_number} onChange={(v) => setForm({ ...form, vat_number: v.toUpperCase() })} testid="edit-vat" />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle>Piano &amp; Stato (riservato Superadmin)</SectionTitle>
          <div className="space-y-3 mt-3">
            <Field label="Piano">
              <select
                value={form.plan}
                onChange={(e) => setForm({ ...form, plan: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-brand/30 focus:outline-none"
                data-testid="edit-plan"
              >
                <option value="trial">Trial (30 giorni)</option>
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
                <option value="demo">Demo</option>
              </select>
            </Field>
            <Field label="Stato">
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-brand/30 focus:outline-none"
                data-testid="edit-status"
              >
                <option value="active">Attiva</option>
                <option value="suspended">Sospesa</option>
              </select>
            </Field>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs text-stone-500">
              Le modifiche vengono applicate immediatamente a tutta la scuola.
            </p>
            <button
              type="submit" disabled={saving}
              className="h-12 px-6 rounded-2xl bg-[#2F7D6D] hover:bg-[#276A5C] text-white font-semibold text-sm flex items-center gap-2 shadow-sm disabled:opacity-60"
              data-testid="edit-save"
            >
              <Save className="h-4 w-4" />
              {saving ? "Salvataggio…" : "Salva modifiche"}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

function SectionTitle({ children }) {
  return <p className="text-xs font-bold uppercase tracking-wider text-stone-500 border-l-2 border-brand pl-2">{children}</p>;
}
function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}
function Input({ value, onChange, required, testid, readOnly, type = "text" }) {
  return (
    <input
      type={type} required={required} value={value} readOnly={readOnly}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full h-12 px-4 rounded-2xl border focus:ring-2 focus:ring-brand/30 focus:outline-none ${
        readOnly ? "bg-stone-100 border-stone-200 text-stone-500 cursor-not-allowed" : "bg-stone-50 border-stone-200"
      }`}
      data-testid={testid}
    />
  );
}
function IconInput({ icon, value, onChange, required, testid, placeholder, type = "text" }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{icon}</span>
      <input
        type={type} required={required} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 pl-10 pr-4 rounded-2xl bg-stone-50 border border-stone-200 focus:ring-2 focus:ring-brand/30 focus:outline-none"
        data-testid={testid}
      />
    </div>
  );
}
function StatMini({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-3 flex items-center gap-3">
      <span className="h-9 w-9 rounded-xl bg-stone-50 flex items-center justify-center text-stone-600">{icon}</span>
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
        <p className="font-display text-xl font-bold text-stone-900 leading-none mt-0.5">{value}</p>
      </div>
    </div>
  );
}
