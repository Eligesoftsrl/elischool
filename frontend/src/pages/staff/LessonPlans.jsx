import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, X, BookOpen, Pencil, Trash2, CalendarRange } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { classroom_ids: [], date_from: "", date_to: "", title: "", body: "" };

export default function LessonPlans() {
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

  useEffect(() => {
    if (!activeYear) return;
    (async () => {
      const q = { school_year_id: activeYear.id };
      if (classId) q.classroom_id = classId;
      const { data } = await api.get("/lesson-plans", { params: q });
      setItems(data);
    })();
  }, [activeYear, classId]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, school_year_id: activeYear.id };
      if (editId) await api.patch(`/lesson-plans/${editId}`, payload);
      else await api.post("/lesson-plans", payload);
      toast.success(editId ? "Aggiornato" : "Piano creato");
      setOpen(false); setForm(empty); setEditId(null);
      const q = { school_year_id: activeYear.id };
      if (classId) q.classroom_id = classId;
      const { data } = await api.get("/lesson-plans", { params: q });
      setItems(data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare il piano?")) return;
    try { await api.delete(`/lesson-plans/${id}`); setItems(items.filter((x) => x.id !== id)); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const classroomName = (cid) => classrooms.find((c) => c.id === cid)?.name || "—";

  return (
    <div>
      <PageHeader
        title="Piano didattico"
        subtitle="Cosa imparano i bambini settimana per settimana"
        right={
          <button
            onClick={() => { setForm({ ...empty, classroom_ids: classId ? [classId] : [] }); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2 tap-press"
            data-testid="add-lesson-plan-button"
          >
            <Plus className="h-4 w-4" /> Nuovo piano
          </button>
        }
      />

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1">
        <button onClick={() => setClassId("")}
          className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${!classId ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}>
          Tutte
        </button>
        {classrooms.map((c) => (
          <button key={c.id} onClick={() => setClassId(c.id)}
            className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${classId === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
            data-testid={`lp-class-${c.id}`}>
            {c.name}
          </button>
        ))}
      </div>

      {items.length === 0 ? <EmptyState title="Nessun piano didattico" description="Crea il primo piano settimanale." /> :
        <div className="space-y-4">
          {items.map((p) => (
            <Card key={p.id} data-testid={`lp-card-${p.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="h-12 w-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0"><BookOpen className="h-5 w-5 text-amber-600" /></div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {(p.classroom_ids && p.classroom_ids.length > 0) ? (
                        p.classroom_ids.map((cid) => <Pill key={cid} color="brand">{classroomName(cid)}</Pill>)
                      ) : p.classroom_id ? (
                        <Pill color="brand">{classroomName(p.classroom_id)}</Pill>
                      ) : (
                        <Pill color="purple">Tutte le sezioni</Pill>
                      )}
                      <span className="text-xs text-stone-500 flex items-center gap-1"><CalendarRange className="h-3 w-3" /> {p.date_from} → {p.date_to}</span>
                    </div>
                    <p className="font-display text-lg font-bold text-stone-900">{p.title}</p>
                    <div className="text-sm text-stone-600 mt-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: p.body }} />
                  </div>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <button onClick={() => { setForm({ classroom_ids: (p.classroom_ids && p.classroom_ids.length > 0) ? p.classroom_ids : (p.classroom_id ? [p.classroom_id] : []), date_from: p.date_from, date_to: p.date_to, title: p.title, body: p.body }); setEditId(p.id); setOpen(true); }} className="h-10 w-10 rounded-xl bg-stone-100"><Pencil className="h-4 w-4 mx-auto" /></button>
                  <button onClick={() => remove(p.id)} className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4 mx-auto" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal title={editId ? "Modifica piano" : "Nuovo piano"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Sezioni destinatarie *">
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, classroom_ids: [] })}
                  className={`w-full h-12 rounded-2xl border font-semibold text-sm flex items-center justify-center gap-2 transition-all ${form.classroom_ids.length === 0 ? "bg-purple-600 text-white border-purple-600" : "bg-white border-stone-200 text-stone-700 hover:border-purple-400"}`}
                  data-testid="lp-all-classrooms"
                >
                  {form.classroom_ids.length === 0 ? "✓ " : ""}Tutte le sezioni della scuola
                </button>
                <p className="text-[11px] text-stone-500 text-center">— oppure —</p>
                <div className="flex flex-wrap gap-2 p-2 rounded-2xl bg-stone-50 border border-stone-200">
                  {classrooms.map((c) => {
                    const sel = form.classroom_ids.includes(c.id);
                    return (
                      <button key={c.id} type="button"
                        onClick={() => setForm({ ...form, classroom_ids: sel ? form.classroom_ids.filter((x) => x !== c.id) : [...form.classroom_ids, c.id] })}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border ${sel ? "bg-[#FFF3EF] border-[#FF8C6B] text-[#FF7A54]" : "bg-white border-stone-200 text-stone-700"}`}
                        data-testid={`lp-classroom-${c.id}`}>
                        {sel ? "✓ " : ""}{c.name}
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-stone-500">
                  {form.classroom_ids.length === 0
                    ? "Il piano sarà visibile a tutte le sezioni della scuola"
                    : `Il piano sarà associato a ${form.classroom_ids.length} sezion${form.classroom_ids.length === 1 ? "e" : "i"}`}
                </p>
              </div>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dal"><Input type="date" value={form.date_from} onChange={(v) => setForm({ ...form, date_from: v })} required testid="lp-from" /></Field>
              <Field label="Al"><Input type="date" value={form.date_to} onChange={(v) => setForm({ ...form, date_to: v })} required testid="lp-to" /></Field>
            </div>
            <Field label="Titolo"><Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} required testid="lp-title" /></Field>
            <Field label="Contenuto (puoi usare HTML)">
              <textarea rows={8} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required
                className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 font-mono text-sm" data-testid="lp-body"
                placeholder="<p>Questa settimana...</p>" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="lp-submit">Salva</button>
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
      <div className="bg-white w-full md:max-w-xl rounded-t-[2rem] md:rounded-[2rem] p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>{children}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><div className="mt-1">{children}</div></label>; }
function Input({ value, onChange, type = "text", required, testid }) {
  return <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
