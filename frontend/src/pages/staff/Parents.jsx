import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Plus, X, UsersRound, Pencil, Trash2, Link as LinkIcon, Copy, Send, CheckCircle2, Clock, Search as SearchIcon, IdCard, AtSign } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const CF_RE = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
const empty = { first_name: "", last_name: "", email: "", phone: "", fiscal_code: "", notes: "", student_ids: [] };

export default function StaffParents() {
  const [items, setItems] = useState([]);
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [inviteLink, setInviteLink] = useState(null);
  const [studentSearch, setStudentSearch] = useState("");

  const load = async () => {
    try {
      const [p, s, c] = await Promise.all([
        api.get("/parents"),
        api.get("/students"),
        api.get("/classrooms").catch(() => ({ data: [] })),
      ]);
      setItems(p.data);
      setStudents(s.data);
      setClassrooms(c.data || []);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const classroomName = (cid) => classrooms.find((c) => c.id === cid)?.name || "";
  const studentDetails = (sid) => {
    const s = students.find((x) => x.id === sid);
    if (!s) return { name: sid, cf: "", cls: "" };
    return { name: `${s.first_name} ${s.last_name}`, cf: s.fiscal_code || "", cls: classroomName(s.enrollment?.classroom_id) };
  };

  const submit = async (e) => {
    e.preventDefault();
    if (form.fiscal_code && !CF_RE.test(form.fiscal_code.toUpperCase().replace(/\s/g, ""))) {
      toast.error("Codice Fiscale non valido (16 caratteri, lascia vuoto se non lo conosci)");
      return;
    }
    try {
      const payload = { ...form, fiscal_code: form.fiscal_code ? form.fiscal_code.toUpperCase().replace(/\s/g, "") : "" };
      if (editId) { await api.patch(`/parents/${editId}`, payload); toast.success("Aggiornato"); setOpen(false); setEditId(null); }
      else {
        const { data } = await api.post("/parents", payload);
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
                    <p className="text-xs text-stone-600 font-mono truncate flex items-center gap-1 mt-0.5" title={p.email} data-testid={`parent-login-${p.id}`}>
                      <AtSign className="h-3 w-3 text-stone-400 shrink-0" />{p.email}
                    </p>
                  </div>
                </div>
                {p.status === "active"
                  ? <Pill color="green"><CheckCircle2 className="h-3 w-3" /> Attivo</Pill>
                  : <Pill color="amber"><Clock className="h-3 w-3" /> In attesa</Pill>}
              </div>
              <div className="mt-3 flex flex-wrap gap-1">
                {(p.student_ids || []).map((sid) => {
                  const sd = studentDetails(sid);
                  return (
                    <Pill key={sid} color="brand" title={sd.cf ? `CF: ${sd.cf}` : undefined}>
                      {sd.name}{sd.cls ? ` · ${sd.cls}` : ""}
                    </Pill>
                  );
                })}
              </div>
              {p.fiscal_code && (
                <p className="mt-2 text-[11px] text-stone-400 font-mono flex items-center gap-1"><IdCard className="h-3 w-3"/> {p.fiscal_code}</p>
              )}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button onClick={() => resendInvite(p.id)} className="h-10 rounded-xl bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`resend-invite-${p.id}`}><Send className="h-3.5 w-3.5" /></button>
                <button onClick={() => { setForm({ first_name: p.first_name, last_name: p.last_name, email: p.email, phone: p.phone || "", fiscal_code: p.fiscal_code || "", notes: p.notes || "", student_ids: p.student_ids || [] }); setEditId(p.id); setOpen(true); setStudentSearch(""); }}
                  className="h-10 rounded-xl bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`edit-parent-${p.id}`}><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(p.id)} className="h-10 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`delete-parent-${p.id}`}><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal
          title={editId ? "Modifica genitore" : "Invita genitore"}
          onClose={() => setOpen(false)}
          footer={(
            <div className="flex gap-3">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 font-semibold" data-testid="parent-cancel">Annulla</button>
              <button type="submit" form="parent-form" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold" data-testid="parent-submit">{editId ? "Salva" : "Invita"}</button>
            </div>
          )}
        >
          <form id="parent-form" onSubmit={submit} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Nome"><Input value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required testid="parent-first" /></Field>
              <Field label="Cognome"><Input value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required testid="parent-last" /></Field>
            </div>
            <Field label="Email"><Input type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} required testid="parent-email" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Telefono"><Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} testid="parent-phone" /></Field>
              <Field label="Codice Fiscale (facoltativo)">
                <input type="text" value={form.fiscal_code}
                  onChange={(e) => setForm({ ...form, fiscal_code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                  maxLength={16} placeholder="16 caratteri"
                  className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 font-mono tracking-wider uppercase"
                  data-testid="parent-fiscal-code" />
              </Field>
            </div>
            <Field label="Note (facoltativo)">
              <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
                className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                data-testid="parent-notes" />
            </Field>
            <Field label="Figli/e collegati">
              <p className="text-[11px] text-stone-500 mb-2">Cerca per nome, cognome, CF o sezione — mostro il CF per evitare omonimie.</p>
              {/* Selected chips */}
              {form.student_ids.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-2" data-testid="parent-selected-students">
                  {form.student_ids.map((sid) => {
                    const sd = studentDetails(sid);
                    return (
                      <span key={sid} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#FFF3EF] text-[#FF7A54] text-xs font-semibold border border-[#FF8C6B]/30">
                        {sd.name}
                        <span className="text-stone-400 font-mono">· {sd.cf}</span>
                        <button type="button" onClick={() => setForm({ ...form, student_ids: form.student_ids.filter((x) => x !== sid) })} data-testid={`parent-remove-student-${sid}`}>
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Search input */}
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                <input
                  type="text" value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  placeholder="Digita per cercare un alunno da collegare…"
                  className="w-full h-11 pl-10 pr-4 rounded-2xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                  data-testid="parent-student-search"
                />
              </div>
              {studentSearch.trim().length >= 2 && (
                <div className="mt-2 max-h-60 overflow-y-auto rounded-2xl bg-stone-50 border border-stone-200 divide-y divide-stone-200" data-testid="parent-student-suggestions">
                  {students
                    .filter((s) => {
                      if (form.student_ids.includes(s.id)) return false;
                      const q = studentSearch.trim().toLowerCase();
                      return (
                        (s.first_name || "").toLowerCase().includes(q) ||
                        (s.last_name || "").toLowerCase().includes(q) ||
                        `${s.first_name} ${s.last_name}`.toLowerCase().includes(q) ||
                        (s.fiscal_code || "").toLowerCase().includes(q) ||
                        classroomName(s.enrollment?.classroom_id).toLowerCase().includes(q)
                      );
                    })
                    .slice(0, 8)
                    .map((s) => {
                      const cls = classroomName(s.enrollment?.classroom_id);
                      return (
                        <button
                          key={s.id} type="button"
                          onClick={() => { setForm({ ...form, student_ids: [...form.student_ids, s.id] }); setStudentSearch(""); }}
                          className="w-full text-left px-4 py-2.5 hover:bg-stone-100 flex items-center justify-between gap-3"
                          data-testid={`parent-link-student-${s.id}`}
                        >
                          <div className="min-w-0">
                            <p className="font-semibold text-sm truncate">{s.first_name} {s.last_name}</p>
                            <p className="text-xs text-stone-500 font-mono truncate">{s.fiscal_code || "— senza CF —"}</p>
                          </div>
                          {cls && <span className="shrink-0 text-[10px] px-2 py-0.5 rounded-full bg-[#FFF3EF] text-[#FF7A54] font-bold uppercase tracking-wider">{cls}</span>}
                        </button>
                      );
                    })}
                  {students.filter((s) => !form.student_ids.includes(s.id) && `${s.first_name} ${s.last_name} ${s.fiscal_code} ${classroomName(s.enrollment?.classroom_id)}`.toLowerCase().includes(studentSearch.toLowerCase())).length === 0 && (
                    <p className="text-xs text-stone-500 px-4 py-3">Nessun alunno trovato</p>
                  )}
                </div>
              )}
            </Field>
          </form>
        </Modal>
      )}
    </div>
  );
}
function Modal({ children, title, onClose, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-stone-900/40 p-0 md:p-6">
      <div className="bg-white w-full md:max-w-lg rounded-t-[2rem] md:rounded-[2rem] max-h-[92vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100 shrink-0">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center" data-testid="parent-modal-close" aria-label="Chiudi"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
        {footer && (
          <div className="px-6 py-4 border-t border-stone-100 bg-white rounded-b-[2rem] shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><div className="mt-1">{children}</div></label>; }
function Input({ value, onChange, type = "text", required, testid }) {
  return <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
