import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, UsersRound, Pencil, Trash2, Link as LinkIcon, Copy, Send, CheckCircle2, Clock } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { first_name: "", last_name: "", email: "", phone: "", notes: "", student_ids: [] };

export default function StaffParents() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [inviteLink, setInviteLink] = useState(null);

  const load = async () => {
    try {
      const [p, s] = await Promise.all([api.get("/parents"), api.get("/students")]);
      setItems(p.data);
      setStudents(s.data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) { await api.patch(`/parents/${editId}`, form); toast.success("Aggiornato"); setOpen(false); setEditId(null); }
      else {
        const { data } = await api.post("/parents", form);
        toast.success("Invito generato");
        setInviteLink(data.mock_invite_link);
        setOpen(false);
      }
      setForm(empty); await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const resendInvite = async (id) => {
    try {
      const { data } = await api.post(`/parents/${id}/resend-invite`);
      setInviteLink(data.mock_invite_link);
      toast.success("Nuovo invito generato");
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare il genitore?")) return;
    try { await api.delete(`/parents/${id}`); await load(); toast.success("Eliminato"); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const studentName = (id) => {
    const s = students.find((x) => x.id === id);
    return s ? `${s.first_name} ${s.last_name}` : "—";
  };

  return (
    <div>
      <PageHeader
        title="Genitori"
        subtitle={`${items.length} famiglie`}
        right={
          <button onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 tap-press"
            data-testid="add-parent-button">
            <Plus className="h-4 w-4" /> Invita genitore
          </button>
        }
      />

      {inviteLink && (
        <div className="mb-6 p-5 rounded-3xl border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <LinkIcon className="h-5 w-5 text-amber-600 mt-1" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-amber-900">Link di invito (mock email)</p>
              <p className="text-sm text-amber-800 break-all mt-1" data-testid="parent-invite-link">{inviteLink}</p>
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copiato"); }}
                  className="h-10 px-4 rounded-xl bg-white text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copia link
                </button>
                <button onClick={() => setInviteLink(null)} className="h-10 px-4 rounded-xl bg-amber-200 text-amber-900 text-xs font-semibold">Chiudi</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {items.length === 0 ? <EmptyState title="Nessun genitore registrato" description="Invita il primo genitore con email e link sicuro." /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((p) => (
            <Card key={p.id} data-testid={`parent-card-${p.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center"><UsersRound className="h-5 w-5 text-stone-600" /></div>
                  <div className="min-w-0">
                    <p className="font-display font-bold truncate">{p.first_name} {p.last_name}</p>
                    <p className="text-xs text-stone-500 truncate">{p.email}</p>
                  </div>
                </div>
                {p.status === "active"
                  ? <Pill color="green"><CheckCircle2 className="h-3 w-3" /> Attivo</Pill>
                  : <Pill color="amber"><Clock className="h-3 w-3" /> In attesa</Pill>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(p.student_ids || []).map((sid) => <Pill key={sid} color="brand">{studentName(sid)}</Pill>)}
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button onClick={() => resendInvite(p.id)} className="h-10 rounded-xl bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`resend-invite-${p.id}`}><Send className="h-3.5 w-3.5" /></button>
                <button onClick={() => { setForm({ first_name: p.first_name, last_name: p.last_name, email: p.email, phone: p.phone || "", notes: p.notes || "", student_ids: p.student_ids || [] }); setEditId(p.id); setOpen(true); }}
                  className="h-10 rounded-xl bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`edit-parent-${p.id}`}><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(p.id)} className="h-10 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`delete-parent-${p.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal title={editId ? "Modifica genitore" : "Invita genitore"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome"><Input value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required testid="parent-first" /></Field>
              <Field label="Cognome"><Input value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required testid="parent-last" /></Field>
            </div>
            <Field label="Email"><Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required testid="parent-email" /></Field>
            <Field label="Telefono"><Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} /></Field>
            <Field label="Figli/e collegati">
              <div className="flex flex-wrap gap-2 max-h-56 overflow-y-auto p-2 rounded-2xl bg-stone-50 border border-stone-200">
                {students.map((s) => {
                  const sel = form.student_ids.includes(s.id);
                  return (
                    <button key={s.id} type="button"
                      onClick={() => setForm({ ...form, student_ids: sel ? form.student_ids.filter((x) => x !== s.id) : [...form.student_ids, s.id] })}
                      className={`px-3 py-2 rounded-xl text-xs font-semibold border ${sel ? "bg-[#FFF3EF] border-[#FF8C6B] text-[#FF7A54]" : "bg-white border-stone-200 text-stone-700"}`}
                      data-testid={`parent-link-student-${s.id}`}>
                      {s.first_name} {s.last_name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="parent-submit">{editId ? "Salva" : "Invita"}</button>
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
