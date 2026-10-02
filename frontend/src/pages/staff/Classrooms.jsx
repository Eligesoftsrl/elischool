import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, X, Users, Pencil, Trash2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";
import { SearchBar } from "@/components/SearchBar";
import { ExportMenu } from "@/components/ExportMenu";

const empty = { name: "", age_band: "3 anni", notes: "", school_year_id: "", teacher_ids: [] };

export default function StaffClassrooms() {
  const { activeYear } = useOutletContext();
  const [items, setItems] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [q, setQ] = useState("");

  const load = async () => {
    if (!activeYear) return;
    try {
      const [c, t] = await Promise.all([
        api.get("/classrooms", { params: { school_year_id: activeYear.id } }),
        api.get("/teachers"),
      ]);
      setItems(c.data);
      setTeachers(t.data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [activeYear]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, school_year_id: activeYear.id };
      if (editId) await api.patch(`/classrooms/${editId}`, payload);
      else await api.post("/classrooms", payload);
      toast.success(editId ? "Sezione aggiornata" : "Sezione creata");
      setOpen(false); setForm(empty); setEditId(null);
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare la sezione? Le iscrizioni associate verranno rimosse.")) return;
    try { await api.delete(`/classrooms/${id}`); toast.success("Eliminata"); await load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const teacherName = (tid) => {
    const t = teachers.find((x) => x.id === tid);
    return t ? `${t.first_name} ${t.last_name}` : "";
  };

  const displayed = useMemo(() => {
    const qn = q.trim().toLowerCase();
    if (!qn) return items;
    return items.filter((c) => {
      const teachersStr = (c.teacher_ids || []).map(teacherName).join(" ").toLowerCase();
      return (
        (c.name || "").toLowerCase().includes(qn) ||
        (c.age_band || "").toLowerCase().includes(qn) ||
        (c.notes || "").toLowerCase().includes(qn) ||
        teachersStr.includes(qn)
      );
    });
  }, [items, q, teachers]);

  return (
    <div>
      <PageHeader
        title="Sezioni"
        subtitle={q
          ? `${displayed.length} di ${items.length} sezioni · ${activeYear?.label || ""}`
          : `Anno ${activeYear?.label || ""} · ${items.length} sezioni`}
        right={
          <div className="flex items-center gap-2">
            <ExportMenu
              data={displayed}
              columns={[
                { key: "name", label: "Nome sezione" },
                { key: "age_band", label: "Fascia età" },
                { key: "student_count", label: "N° alunni" },
                { key: "teachers", label: "Maestre", format: (r) => (r.teacher_ids || []).map(teacherName).join(", ") },
                { key: "notes", label: "Note" },
              ]}
              filename="sezioni"
              title={`Elenco sezioni · ${activeYear?.label || ""}`}
              testid="export-classrooms"
            />
            <button onClick={() => { setForm({ ...empty, school_year_id: activeYear?.id }); setEditId(null); setOpen(true); }}
              className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 tap-press"
              data-testid="add-classroom-button">
              <Plus className="h-4 w-4" /> Nuova sezione
            </button>
          </div>
        }
      />

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Cerca per nome sezione, fascia età o maestra…"
        testid="search-classroom"
      />

      {items.length === 0 ? (
        <EmptyState title="Nessuna sezione" description="Crea la prima sezione per quest'anno scolastico." />
      ) : displayed.length === 0 ? (
        <EmptyState title="Nessun risultato" description="Prova a cambiare i termini di ricerca." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((c) => (
            <Card key={c.id} data-testid={`classroom-card-${c.id}`}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-[#FFF3EF] flex items-center justify-center">
                    <Users className="h-5 w-5 text-[#FF7A54]" />
                  </div>
                  <div>
                    <p className="font-display font-bold text-lg text-stone-900">{c.name}</p>
                    <p className="text-xs text-stone-500">{c.age_band}</p>
                  </div>
                </div>
                <Pill color="stone">{c.student_count || 0} alunni</Pill>
              </div>
              {c.notes && <p className="text-sm text-stone-500 mt-3">{c.notes}</p>}
              <div className="mt-3 flex flex-wrap gap-1">
                {c.teacher_ids?.map((tid) => {
                  const t = teachers.find((x) => x.id === tid);
                  return t ? <Pill key={tid} color="purple">{t.first_name} {t.last_name}</Pill> : null;
                })}
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setForm({ name: c.name, age_band: c.age_band, notes: c.notes || "", school_year_id: activeYear.id, teacher_ids: c.teacher_ids || [] });
                    setEditId(c.id); setOpen(true);
                  }}
                  className="h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                  data-testid={`edit-classroom-${c.id}`}>
                  <Pencil className="h-3.5 w-3.5" /> Modifica
                </button>
                <button onClick={() => remove(c.id)}
                  className="h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                  data-testid={`delete-classroom-${c.id}`}>
                  <Trash2 className="h-3.5 w-3.5" /> Elimina
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <Modal title={editId ? "Modifica sezione" : "Nuova sezione"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Nome (es: Coccinelle)"><Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="form-classroom-name" /></Field>
            <Field label="Fascia d'età">
              <select value={form.age_band} onChange={(e) => setForm({ ...form, age_band: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30">
                {["3 anni", "4 anni", "5 anni", "Misti", "Nido", "Primavera"].map((a) => <option key={a}>{a}</option>)}
              </select>
            </Field>
            <Field label="Maestre">
              <div className="flex flex-wrap gap-2">
                {teachers.map((t) => {
                  const sel = form.teacher_ids.includes(t.id);
                  return (
                    <button key={t.id} type="button"
                      onClick={() => setForm({ ...form, teacher_ids: sel ? form.teacher_ids.filter((x) => x !== t.id) : [...form.teacher_ids, t.id] })}
                      className={`px-3 py-2 rounded-2xl text-xs font-semibold border ${sel ? "bg-[#FFF3EF] border-[#FF8C6B] text-[#FF7A54]" : "bg-stone-50 border-stone-200 text-stone-700"}`}>
                      {t.first_name} {t.last_name}
                    </button>
                  );
                })}
              </div>
            </Field>
            <Field label="Note"><Textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /></Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="form-classroom-submit">Salva</button>
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
function Input({ value, onChange, required, testid }) {
  return <input value={value} required={required} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
function Textarea({ value, onChange }) {
  return <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" />;
}
