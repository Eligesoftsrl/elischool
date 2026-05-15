import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Building2, Image as ImageIcon, Save, Upload } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card } from "@/components/Primitives";

const empty = { name: "", email: "", phone: "", mobile: "", whatsapp: "", address: "", vat: "", website: "", facebook: "", instagram: "", logo_base64: "" };

export default function SchoolProfile() {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/school-profile");
        setForm({ ...empty, ...data });
      } catch (e) { toast.error(apiErrorMessage(e)); }
    })();
  }, []);

  const onPickLogo = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 2 * 1024 * 1024) { toast.error("Logo max 2MB"); return; }
    const r = new FileReader();
    r.onload = () => setForm({ ...form, logo_base64: r.result });
    r.readAsDataURL(f);
  };

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.put("/school-profile", form);
      toast.success("Profilo scuola aggiornato");
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Profilo Scuola" subtitle="Identità, contatti e canali social della tua scuola" />
      <form onSubmit={submit} className="space-y-5 max-w-3xl">
        <Card>
          <div className="flex items-center gap-4 mb-5">
            <div className="h-20 w-20 rounded-3xl bg-stone-100 border border-stone-200 overflow-hidden flex items-center justify-center shrink-0">
              {form.logo_base64
                ? <img src={form.logo_base64} alt="logo" className="h-full w-full object-cover" />
                : <Building2 className="h-8 w-8 text-stone-400" />}
            </div>
            <div className="flex-1">
              <input ref={fileRef} type="file" accept="image/*" onChange={onPickLogo} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()}
                className="h-11 px-4 rounded-2xl bg-stone-100 hover:bg-stone-200 text-sm font-semibold flex items-center gap-2"
                data-testid="logo-upload-button">
                <Upload className="h-4 w-4" /> Carica logo
              </button>
              <p className="text-xs text-stone-500 mt-1">Max 2MB · PNG/JPG</p>
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Ragione sociale" full><Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="profile-name" /></Field>
            <Field label="P.IVA / C.F."><Input value={form.vat} onChange={(v) => setForm({ ...form, vat: v })} /></Field>
            <Field label="Indirizzo"><Input value={form.address} onChange={(v) => setForm({ ...form, address: v })} /></Field>
          </div>
        </Card>

        <Card>
          <h3 className="font-display font-bold mb-4">Contatti</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Email"><Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} /></Field>
            <Field label="Sito web"><Input value={form.website} onChange={(v) => setForm({ ...form, website: v })} /></Field>
            <Field label="Telefono fisso"><Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /></Field>
            <Field label="Cellulare"><Input value={form.mobile} onChange={(v) => setForm({ ...form, mobile: v })} /></Field>
            <Field label="WhatsApp"><Input value={form.whatsapp} onChange={(v) => setForm({ ...form, whatsapp: v })} /></Field>
          </div>
        </Card>

        <Card>
          <h3 className="font-display font-bold mb-4">Social</h3>
          <div className="grid md:grid-cols-2 gap-3">
            <Field label="Facebook"><Input value={form.facebook} onChange={(v) => setForm({ ...form, facebook: v })} placeholder="URL" /></Field>
            <Field label="Instagram"><Input value={form.instagram} onChange={(v) => setForm({ ...form, instagram: v })} placeholder="URL o @handle" /></Field>
          </div>
        </Card>

        <button type="submit" disabled={busy}
          className="w-full md:w-auto h-14 px-8 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
          data-testid="profile-submit">
          <Save className="h-5 w-5" /> {busy ? "Salvataggio..." : "Salva profilo"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children, full }) {
  return <label className={`block ${full ? "md:col-span-2" : ""}`}>
    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span>
    <div className="mt-1">{children}</div>
  </label>;
}
function Input({ value, onChange, type = "text", required, placeholder, testid }) {
  return <input type={type} required={required} value={value || ""} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
