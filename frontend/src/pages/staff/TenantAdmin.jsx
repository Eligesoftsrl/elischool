import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Building2, Save, Mail, Phone, Globe, MapPin, FileText, Image as ImageIcon, Lock, Users, GraduationCap, UserCog, Layers, Camera, HardDrive, Inbox } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, Pill } from "@/components/Primitives";
import { fmtDate } from "@/lib/format";

const PLAN_LABELS = {
  trial: { label: "Trial (30 giorni)", color: "amber" },
  basic: { label: "Basic", color: "stone" },
  pro: { label: "Pro", color: "brand" },
  demo: { label: "Demo", color: "purple" },
};

const fmtBytes = (b) => {
  if (!b) return "0 B";
  const u = ["B", "KB", "MB", "GB"]; let i = 0; let n = b;
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 ? 2 : 1)} ${u[i]}`;
};

export default function StaffTenantAdmin() {
  const [tenant, setTenant] = useState(null);
  const [form, setForm] = useState({ name: "", contact_email: "", contact_phone: "", address: "", vat_number: "", website: "", logo_base64: "" });
  const [saving, setSaving] = useState(false);
  const [logoFileName, setLogoFileName] = useState("");

  const load = async () => {
    try {
      const { data } = await api.get("/admin/tenant");
      setTenant(data);
      setForm({
        name: data.name || "",
        contact_email: data.contact_email || "",
        contact_phone: data.contact_phone || "",
        address: data.address || "",
        vat_number: data.vat_number || "",
        website: data.website || "",
        logo_base64: data.logo_base64 || "",
      });
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const onLogoPick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("Logo max 2MB"); return; }
    const r = new FileReader();
    r.onload = () => { setForm((p) => ({ ...p, logo_base64: r.result })); setLogoFileName(f.name); };
    r.readAsDataURL(f);
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/admin/tenant", form);
      setTenant((prev) => ({ ...(prev || {}), ...data, stats: prev?.stats }));
      toast.success("Dati tenant aggiornati");
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  };

  if (!tenant) {
    return <div className="h-64 flex items-center justify-center text-stone-400">Caricamento…</div>;
  }

  const planCfg = PLAN_LABELS[tenant.plan] || { label: tenant.plan, color: "stone" };

  return (
    <div>
      <PageHeader
        title="Gestione Tenant"
        subtitle="Impostazioni della tua scuola, piano attivo e utilizzo"
      />

      {/* Hero / plan */}
      <div className="mb-6 rounded-3xl bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 text-white p-6 md:p-8 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center gap-5">
          <div className="h-20 w-20 rounded-2xl bg-white/10 border border-white/20 overflow-hidden flex items-center justify-center shrink-0">
            {tenant.logo_base64
              ? <img src={tenant.logo_base64} alt="logo" className="h-full w-full object-cover" />
              : <Building2 className="h-9 w-9 text-white/60" />}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-white/60">La tua scuola</p>
            <h2 className="font-display text-3xl md:text-4xl font-bold truncate" data-testid="tenant-name">{tenant.name}</h2>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <Pill color={planCfg.color}>Piano: {planCfg.label}</Pill>
              <Pill color={tenant.status === "active" ? "green" : "amber"}>{tenant.status === "active" ? "Attivo" : tenant.status}</Pill>
              <span className="text-xs text-white/60">· Attivo dal {fmtDate(tenant.created_at)}</span>
            </div>
            <p className="text-xs text-white/50 mt-1">
              URL pubblico iscrizioni: <code className="font-mono text-white/80">/iscrizione/{tenant.slug}</code>
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 border border-white/20 p-3 text-xs text-white/80 max-w-xs">
            <div className="flex items-center gap-2 mb-1"><Lock className="h-3.5 w-3.5" /> <b>Piano e stato</b></div>
            Solo il Superadmin può modificare il piano e lo stato della scuola.
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="mb-6">
        <h3 className="font-display font-bold text-lg mb-3 text-stone-800">Utilizzo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard icon={<GraduationCap className="h-5 w-5" />} label="Alunni attivi" value={tenant.stats.students_active} sub={tenant.stats.students_withdrawn > 0 ? `+${tenant.stats.students_withdrawn} ritirati` : null} tone="brand" testid="stat-students" />
          <StatCard icon={<Users className="h-5 w-5" />} label="Genitori" value={tenant.stats.parents} tone="purple" testid="stat-parents" />
          <StatCard icon={<UserCog className="h-5 w-5" />} label="Maestre + Admin" value={tenant.stats.teachers + tenant.stats.admins} sub={`${tenant.stats.teachers} maestre · ${tenant.stats.admins} admin`} tone="rose" testid="stat-staff" />
          <StatCard icon={<Layers className="h-5 w-5" />} label="Sezioni" value={tenant.stats.classrooms} tone="emerald" testid="stat-classrooms" />
          <StatCard icon={<Camera className="h-5 w-5" />} label="Foto" value={tenant.stats.media_count} tone="sky" testid="stat-media" />
          <StatCard icon={<HardDrive className="h-5 w-5" />} label="Spazio foto" value={fmtBytes(tenant.stats.media_bytes)} sub="cifrate AES-256" tone="indigo" testid="stat-media-bytes" />
          <StatCard icon={<Inbox className="h-5 w-5" />} label="Iscrizioni in sospeso" value={tenant.stats.enrollment_requests_pending} tone="amber" testid="stat-enrollment" />
          <StatCard icon={<Building2 className="h-5 w-5" />} label="Slug tenant" value={tenant.slug} tone="stone" testid="stat-slug" mono />
        </div>
      </div>

      {/* Edit form */}
      <h3 className="font-display font-bold text-lg mb-3 text-stone-800">Dati scuola</h3>
      <form onSubmit={save} className="grid lg:grid-cols-2 gap-4">
        <Card>
          <SectionTitle icon={<Building2 className="h-4 w-4" />}>Identità</SectionTitle>
          <div className="space-y-3 mt-3">
            <Field label="Nome scuola *">
              <TextInput value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="tenant-name-input" />
            </Field>
            <Field label="Logo (max 2MB)">
              <div className="flex items-center gap-3">
                <div className="h-14 w-14 rounded-2xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
                  {form.logo_base64
                    ? <img src={form.logo_base64} alt="logo" className="h-full w-full object-cover" />
                    : <ImageIcon className="h-5 w-5 text-stone-400" />}
                </div>
                <label className="flex-1 h-12 rounded-2xl bg-stone-50 border border-stone-200 hover:border-brand hover:bg-white cursor-pointer flex items-center justify-center text-sm font-semibold text-stone-700">
                  <input type="file" accept="image/*" onChange={onLogoPick} className="hidden" data-testid="tenant-logo-input" />
                  {logoFileName || (form.logo_base64 ? "Sostituisci logo" : "Carica logo")}
                </label>
                {form.logo_base64 && (
                  <button type="button" onClick={() => { setForm({ ...form, logo_base64: "" }); setLogoFileName(""); }}
                    className="h-10 px-3 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold" data-testid="tenant-logo-clear">Rimuovi</button>
                )}
              </div>
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle icon={<Mail className="h-4 w-4" />}>Contatti</SectionTitle>
          <div className="space-y-3 mt-3">
            <Field label="Email di contatto *">
              <IconInput icon={<Mail className="h-4 w-4" />} type="email" value={form.contact_email} onChange={(v) => setForm({ ...form, contact_email: v.toLowerCase() })} required testid="tenant-email-input" />
            </Field>
            <Field label="Telefono">
              <IconInput icon={<Phone className="h-4 w-4" />} value={form.contact_phone} onChange={(v) => setForm({ ...form, contact_phone: v })} testid="tenant-phone-input" />
            </Field>
            <Field label="Sito web">
              <IconInput icon={<Globe className="h-4 w-4" />} value={form.website} onChange={(v) => setForm({ ...form, website: v })} testid="tenant-website-input" placeholder="https://" />
            </Field>
          </div>
        </Card>

        <Card>
          <SectionTitle icon={<MapPin className="h-4 w-4" />}>Sede legale</SectionTitle>
          <div className="space-y-3 mt-3">
            <Field label="Indirizzo completo">
              <TextInput value={form.address} onChange={(v) => setForm({ ...form, address: v })} testid="tenant-address-input" placeholder="Via, numero civico, CAP, Città (PR)" />
            </Field>
            <Field label="Partita IVA / Codice Fiscale">
              <IconInput icon={<FileText className="h-4 w-4" />} value={form.vat_number} onChange={(v) => setForm({ ...form, vat_number: v.toUpperCase() })} testid="tenant-vat-input" />
            </Field>
          </div>
        </Card>

        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs text-stone-500">
              Queste informazioni appaiono nelle email alle famiglie, nei PDF esportati e nel modulo pubblico di iscrizione.
            </p>
            <button type="submit" disabled={saving}
              className="h-12 px-6 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 shadow-sm disabled:opacity-60"
              data-testid="tenant-save">
              <Save className="h-4 w-4" />
              {saving ? "Salvataggio…" : "Salva modifiche"}
            </button>
          </div>
        </Card>
      </form>
    </div>
  );
}

function StatCard({ icon, label, value, sub, tone = "stone", testid, mono }) {
  const colors = {
    brand: "bg-orange-50 text-orange-900 border-orange-100",
    purple: "bg-violet-50 text-violet-900 border-violet-100",
    rose: "bg-rose-50 text-rose-900 border-rose-100",
    emerald: "bg-emerald-50 text-emerald-900 border-emerald-100",
    sky: "bg-sky-50 text-sky-900 border-sky-100",
    indigo: "bg-indigo-50 text-indigo-900 border-indigo-100",
    amber: "bg-amber-50 text-amber-900 border-amber-100",
    stone: "bg-stone-50 text-stone-900 border-stone-100",
  };
  const iconBg = {
    brand: "bg-orange-200/60 text-orange-700",
    purple: "bg-violet-200/60 text-violet-700",
    rose: "bg-rose-200/60 text-rose-700",
    emerald: "bg-emerald-200/60 text-emerald-700",
    sky: "bg-sky-200/60 text-sky-700",
    indigo: "bg-indigo-200/60 text-indigo-700",
    amber: "bg-amber-200/60 text-amber-700",
    stone: "bg-stone-200/60 text-stone-700",
  };
  return (
    <div className={`rounded-2xl border p-4 ${colors[tone]}`} data-testid={testid}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wider opacity-75">{label}</p>
        <span className={`h-8 w-8 rounded-xl flex items-center justify-center ${iconBg[tone]}`}>{icon}</span>
      </div>
      <p className={`font-display font-bold mt-1 ${mono ? "font-mono text-base" : "text-2xl"}`}>{value ?? "—"}</p>
      {sub && <p className="text-[11px] opacity-70 mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionTitle({ icon, children }) {
  return (
    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-stone-500">
      <span className="h-6 w-6 rounded-lg bg-stone-100 flex items-center justify-center text-stone-600">{icon}</span>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function TextInput({ value, onChange, required, testid, placeholder, type = "text" }) {
  return (
    <input type={type} required={required} value={value} placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
      data-testid={testid} />
  );
}

function IconInput({ icon, value, onChange, required, testid, placeholder, type = "text" }) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">{icon}</span>
      <input type={type} required={required} value={value} placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full h-12 pl-10 pr-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
        data-testid={testid} />
    </div>
  );
}
