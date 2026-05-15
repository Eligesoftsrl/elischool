import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, UserCog, Pencil, Trash2, Shield } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { first_name: "", last_name: "", email: "", phone: "", role: "teacher", password: "", notes: "" };

export default function StaffTeachers() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    try { const { data } = await api.get("/teachers"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.patch(`/teachers/${editId}`, form);
      else await api.post("/teachers", form);
      toast.success(editId ? "Aggiornata" : "Maestra creata");
      setOpen(false); setForm(empty); setEditId(null);
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare?")) return;
    try { await api.delete(`/teachers/${id}`); await load(); toast.success("Eliminata"); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  if (user?.role !== "admin") {
    return <PageHeader title="Maestre" subtitle="Accesso riservato all'amministratore" />;
  }

  return (
    <div>
      <PageHeader
        title="Maestre"
        subtitle={`${items.length} membri dello staff`}
        right={
          <button onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 tap-press"
            data-testid="add-teacher-button">
            <Plus className="h-4 w-4" /> Nuova maestra
          </button>
        }
      />
      {items.length === 0 ? <EmptyState title="Nessuna maestra" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <Card key={t.id} data-testid={`teacher-card-${t.id}`}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                  {t.role === "admin" ? <Shield className="h-5 w-5 text-violet-600" /> : <UserCog className="h-5 w-5 text-violet-600" />}
                </div>
                <div>
                  <p className="font-display font-bold">{t.first_name} {t.last_name}</p>
                  <p className="text-xs text-stone-500">{t.email}</p>
                  <Pill color={t.role === "admin" ? "rose" : "purple"} className="mt-1">{t.role}</Pill>
                </div>
              </div>
              {t.phone && <p className="text-xs text-stone-500 mt-3">{t.phone}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => { setForm({ first_name: t.first_name, last_name: t.last_name, email: t.email, phone: t.phone || "", role: t.role, password: "", notes: t.notes || "" }); setEditId(t.id); setOpen(true); }}
                  className="h-10 rounded-xl bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Modifica</button>
                <button onClick={() => remove(t.id)}
                  className="h-10 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /> Elimina</button>
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal title={editId ? "Modifica" : "Nuova maestra"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome"><Input value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required testid="teacher-first" /></Field>
              <Field label="Cognome"><Input value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required testid="teacher-last" /></Field>
            </div>
            <Field label="Email"><Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required testid="teacher-email" /></Field>
            <Field label="Telefono"><Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /></Field>
            <Field label="Ruolo">
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200">
                <option value="teacher">Maestra</option>
                <option value="admin">Amministratore</option>
              </select>
            </Field>
            <Field label={editId ? "Nuova password (lascia vuoto per non modificare)" : "Password iniziale"}>
              <Input type="text" value={form.password} onChange={(v) => setForm({ ...form, password: v })} testid="teacher-password" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="teacher-submit">Salva</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-stone-900/40 p-0 md:p-6">
      <div className="bg-white w-full md:max-w-lg rounded-t-[2rem] md:rounded-[2rem] p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><div className="mt-1">{children}</div></label>; }
function Input({ value, onChange, type = "text", required, testid }) {
  return <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
