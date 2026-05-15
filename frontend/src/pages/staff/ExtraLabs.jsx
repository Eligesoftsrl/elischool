import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, X, Sparkles, Pencil, Trash2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const DAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì"];
const empty = { classroom_id: "", day_of_week: "lunedì", title: "", teacher_name: "" };

export default function ExtraLabs() {
  const { activeYear } = useOutletContext();
  const [items, setItems] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [classId, setClassId] = useState("");
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (!activeYear) return;
    (async () => {
      const c = await api.get("/classrooms", { params: { school_year_id: activeYear.id } });
      setClassrooms(c.data);
      if (c.data.length && !classId) setClassId(c.data[0].id);
    })();
    // eslint-disable-next-line
  }, [activeYear]);

  const load = async () => {
    try {
      const q = {};
      if (classId) q.classroom_id = classId;
      const { data } = await api.get("/extra-labs", { params: q });
      setItems(data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.patch(`/extra-labs/${editId}`, form);
      else await api.post("/extra-labs", form);
      toast.success("Salvato"); setOpen(false); setForm(empty); setEditId(null); await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const remove = async (id) => { if (!confirm("Eliminare?")) return; try { await api.delete(`/extra-labs/${id}`); await load(); } catch (e) { toast.error(apiErrorMessage(e)); } };

  const byDay = (d) => items.filter((x) => x.day_of_week === d);

  return (
    <div>
      <PageHeader title="Laboratori extra" subtitle="Palinsesto settimanale (musica, teatro, motoria, arte...)"
        right={
          <button onClick={() => { setForm({ ...empty, classroom_id: classId }); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2" data-testid="add-extra-button">
            <Plus className="h-4 w-4" /> Nuovo laboratorio
          </button>}
      />

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1">
        {classrooms.map((c) => (
          <button key={c.id} onClick={() => setClassId(c.id)}
            className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${classId === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
            data-testid={`extra-class-${c.id}`}>
            {c.name}
          </button>
        ))}
      </div>

      {items.length === 0 ? <EmptyState title="Nessun laboratorio impostato" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {DAYS.map((d) => (
            <Card key={d} className="!p-4">
              <p className="text-xs uppercase tracking-wider font-bold text-stone-400 mb-2 capitalize">{d}</p>
              <div className="space-y-2">
                {byDay(d).length === 0 ? <p className="text-xs text-stone-400">—</p> :
                  byDay(d).map((l) => (
                    <div key={l.id} className="p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-100">
                      <div className="flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-sm text-stone-900">{l.title}</p>
                          {l.teacher_name && <p className="text-[11px] text-stone-500">{l.teacher_name}</p>}
                        </div>
                      </div>
                      <div className="mt-2 flex gap-1">
                        <button onClick={() => { setForm({ classroom_id: l.classroom_id, day_of_week: l.day_of_week, title: l.title, teacher_name: l.teacher_name }); setEditId(l.id); setOpen(true); }}
                          className="flex-1 h-8 rounded-lg bg-white/80 text-xs"><Pencil className="h-3 w-3 mx-auto" /></button>
                        <button onClick={() => remove(l.id)}
                          className="flex-1 h-8 rounded-lg bg-white/80 text-rose-600 text-xs"><Trash2 className="h-3 w-3 mx-auto" /></button>
                      </div>
                    </div>
                  ))
                }
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal title={editId ? "Modifica" : "Nuovo laboratorio"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Sezione">
              <select value={form.classroom_id} onChange={(e) => setForm({ ...form, classroom_id: e.target.value })} required
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200" data-testid="extra-classroom">
                <option value="">Seleziona…</option>
                {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Giorno">
              <select value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200">
                {DAYS.map((d) => <option key={d}>{d}</option>)}
              </select>
            </Field>
            <Field label="Titolo (es: Musicoterapia)"><Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} required testid="extra-title" /></Field>
            <Field label="Maestra/Istruttore"><Input value={form.teacher_name} onChange={(v) => setForm({ ...form, teacher_name: v })} /></Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="extra-submit">Salva</button>
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
        <div className="flex items-center justify-between mb-4"><h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>{children}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><div className="mt-1">{children}</div></label>; }
function Input({ value, onChange, required, testid }) {
  return <input value={value} required={required} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
