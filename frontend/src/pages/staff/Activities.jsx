import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Sparkles, Save, Smile, Frown, Meh, Coffee,
  BookOpen, Activity, Cookie, UtensilsCrossed, Bed, Bath, PlusCircle, MinusCircle, Check,
} from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill, SectionLabel } from "@/components/Primitives";

const today = () => new Date().toISOString().slice(0, 10);
const moods = [
  { v: "sereno", label: "Sereno", icon: <Smile className="h-4 w-4" />, color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  { v: "vivace", label: "Vivace", icon: <Activity className="h-4 w-4" />, color: "bg-amber-50 text-amber-700 border-amber-200" },
  { v: "stanco", label: "Stanco", icon: <Coffee className="h-4 w-4" />, color: "bg-sky-50 text-sky-700 border-sky-200" },
  { v: "irritabile", label: "Irritabile", icon: <Frown className="h-4 w-4" />, color: "bg-rose-50 text-rose-700 border-rose-200" },
  { v: "tranquillo", label: "Tranquillo", icon: <Meh className="h-4 w-4" />, color: "bg-violet-50 text-violet-700 border-violet-200" },
];
const portions = ["tutto", "metà", "poco", "niente"];

const emptyForm = {
  didattica: false, note_didattica: "",
  motoria: false, note_motoria: "",
  merenda: "", pranzo: "", note_pranzo: "",
  riposo_minuti: 0, bagno_cambi: 0, cacca: 0, pipi: 0,
  umore: "", note: "",
};

export default function StaffActivities() {
  const { activeYear } = useOutletContext();
  const [date, setDate] = useState(today());
  const [classrooms, setClassrooms] = useState([]);
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState({});  // student_id -> activity
  const [editing, setEditing] = useState(null); // student
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!activeYear) return;
    (async () => {
      const { data } = await api.get("/classrooms", { params: { school_year_id: activeYear.id } });
      setClassrooms(data);
      if (data.length && !classId) setClassId(data[0].id);
    })();
    // eslint-disable-next-line
  }, [activeYear]);

  useEffect(() => {
    if (!classId || !activeYear) return;
    (async () => {
      try {
        const [s, a] = await Promise.all([
          api.get(`/classrooms/${classId}/students`, { params: { school_year_id: activeYear.id } }),
          api.get("/activities", { params: { date_from: date, date_to: date, classroom_id: classId, school_year_id: activeYear.id } }),
        ]);
        setStudents(s.data);
        const map = {};
        for (const x of a.data) map[x.student_id] = x;
        setActivities(map);
      } catch (e) { toast.error(apiErrorMessage(e)); }
    })();
  }, [classId, activeYear, date]);

  const startEdit = (s) => {
    setEditing(s);
    const existing = activities[s.id];
    if (existing) {
      setForm({
        didattica: !!existing.didattica, note_didattica: existing.note_didattica || "",
        motoria: !!existing.motoria, note_motoria: existing.note_motoria || "",
        merenda: existing.merenda || "", pranzo: existing.pranzo || "", note_pranzo: existing.note_pranzo || "",
        riposo_minuti: existing.riposo_minuti || 0, bagno_cambi: existing.bagno_cambi || 0,
        cacca: existing.cacca || 0, pipi: existing.pipi || 0,
        umore: existing.umore || "", note: existing.note || "",
      });
    } else setForm(emptyForm);
  };

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    try {
      const { data } = await api.post("/activities", { student_id: editing.id, date, ...form });
      setActivities({ ...activities, [editing.id]: data });
      toast.success("Salvato");
      setEditing(null);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const shiftDate = (delta) => {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().slice(0, 10));
  };

  return (
    <div>
      <PageHeader
        title="Registro giornaliero"
        subtitle="Tocca un bambino per registrare le attività"
      />

      <Card className="mb-5 !p-3">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => shiftDate(-1)} className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center" data-testid="prev-day">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input
            type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="h-12 px-4 text-center font-semibold rounded-2xl bg-stone-50 border border-stone-200 flex-1"
            data-testid="activity-date"
          />
          <button onClick={() => shiftDate(1)} className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center" data-testid="next-day">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1">
        {classrooms.map((c) => (
          <button
            key={c.id}
            onClick={() => setClassId(c.id)}
            className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${classId === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
            data-testid={`classroom-pill-${c.id}`}
          >
            {c.name}
          </button>
        ))}
      </div>

      {students.length === 0 ? (
        <EmptyState title="Nessun alunno in questa sezione" description="Seleziona un'altra sezione o aggiungi alunni." />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((s) => {
            const a = activities[s.id];
            return (
              <button
                key={s.id}
                onClick={() => startEdit(s)}
                className={`relative text-left bg-white rounded-3xl border p-5 transition-all tap-press ${a ? "border-emerald-200" : "border-stone-200 hover:border-brand"}`}
                data-testid={`student-tile-${s.id}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-stone-900">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-stone-500">{s.birth_date || ""}</p>
                  </div>
                  {a ? <Pill color="green"><Check className="h-3 w-3" /> Registrato</Pill> : <Pill color="stone">Da fare</Pill>}
                </div>
                {a && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {a.didattica && <Pill color="amber">didattica</Pill>}
                    {a.motoria && <Pill color="rose">motoria</Pill>}
                    {a.pranzo && <Pill color="green">pranzo: {a.pranzo}</Pill>}
                    {a.riposo_minuti > 0 && <Pill color="blue">riposo {a.riposo_minuti}'</Pill>}
                    {a.umore && <Pill color="purple">{a.umore}</Pill>}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-stone-900/40"
              onClick={() => setEditing(null)}
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[2.5rem] shadow-2xl max-h-[92vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-stone-100 flex items-center justify-between z-10">
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider font-bold">Registro</p>
                  <p className="font-display text-lg font-bold">{editing.first_name} {editing.last_name} · {date}</p>
                </div>
                <button onClick={() => setEditing(null)} className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center"><X className="h-4 w-4" /></button>
              </div>

              <div className="p-5 space-y-5">
                {/* Didattica / motoria toggles */}
                <div className="grid grid-cols-2 gap-3">
                  <Toggle label="Didattica" icon={<BookOpen className="h-5 w-5" />} on={form.didattica} bg="#FDE68A" onClick={() => setForm({ ...form, didattica: !form.didattica })} testid="toggle-didattica" />
                  <Toggle label="Motoria" icon={<Activity className="h-5 w-5" />} on={form.motoria} bg="#FFB38A" onClick={() => setForm({ ...form, motoria: !form.motoria })} testid="toggle-motoria" />
                </div>
                {form.didattica && (
                  <Textarea label="Note didattica" value={form.note_didattica} onChange={(v) => setForm({ ...form, note_didattica: v })} testid="note-didattica" />
                )}
                {form.motoria && (
                  <Textarea label="Note motoria" value={form.note_motoria} onChange={(v) => setForm({ ...form, note_motoria: v })} testid="note-motoria" />
                )}

                {/* Merenda / Pranzo */}
                <div>
                  <SectionLabel>Pasti</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <PortionSelector label="Merenda" icon={<Cookie className="h-4 w-4" />} value={form.merenda} onChange={(v) => setForm({ ...form, merenda: v })} testidPrefix="merenda" />
                    <PortionSelector label="Pranzo" icon={<UtensilsCrossed className="h-4 w-4" />} value={form.pranzo} onChange={(v) => setForm({ ...form, pranzo: v })} testidPrefix="pranzo" />
                  </div>
                  {form.pranzo && (
                    <Textarea label="Note pranzo" value={form.note_pranzo} onChange={(v) => setForm({ ...form, note_pranzo: v })} testid="note-pranzo" />
                  )}
                </div>

                {/* Counters */}
                <div>
                  <SectionLabel>Routine</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <Counter label="Riposo (min)" icon={<Bed className="h-4 w-4" />} value={form.riposo_minuti} step={15} onChange={(v) => setForm({ ...form, riposo_minuti: v })} testid="riposo" />
                    <Counter label="Bagno (cambi)" icon={<Bath className="h-4 w-4" />} value={form.bagno_cambi} onChange={(v) => setForm({ ...form, bagno_cambi: v })} testid="bagno" />
                    <Counter label="Pipì" value={form.pipi} onChange={(v) => setForm({ ...form, pipi: v })} testid="pipi" />
                    <Counter label="Cacca" value={form.cacca} onChange={(v) => setForm({ ...form, cacca: v })} testid="cacca" />
                  </div>
                </div>

                {/* Mood */}
                <div>
                  <SectionLabel>Umore</SectionLabel>
                  <div className="flex flex-wrap gap-2">
                    {moods.map((m) => (
                      <button key={m.v} type="button"
                        onClick={() => setForm({ ...form, umore: form.umore === m.v ? "" : m.v })}
                        className={`h-11 px-4 rounded-full border text-sm font-semibold flex items-center gap-2 ${form.umore === m.v ? `${m.color} ring-2 ring-offset-1` : "bg-white border-stone-200 text-stone-700"}`}
                        data-testid={`mood-${m.v}`}>
                        {m.icon} {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Textarea label="Note libere per i genitori" value={form.note} onChange={(v) => setForm({ ...form, note: v })} testid="note-generali" />

                <button
                  onClick={save} disabled={saving}
                  className="w-full h-14 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
                  data-testid="save-activity-button"
                >
                  <Save className="h-5 w-5" /> {saving ? "Salvataggio..." : "Salva giornata"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function Toggle({ label, icon, on, onClick, bg, testid }) {
  return (
    <button onClick={onClick} type="button"
      className={`h-20 rounded-3xl border flex flex-col items-center justify-center gap-1 transition-all ${on ? "border-transparent shadow-md text-stone-900" : "bg-white border-stone-200 text-stone-500"}`}
      style={on ? { background: bg } : {}}
      data-testid={testid}>
      <span className={`h-9 w-9 rounded-2xl flex items-center justify-center ${on ? "bg-white/60" : "bg-stone-100"}`}>{icon}</span>
      <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
    </button>
  );
}

function PortionSelector({ label, icon, value, onChange, testidPrefix }) {
  return (
    <div className="rounded-3xl border border-stone-200 p-3 bg-white">
      <div className="flex items-center gap-2 mb-2 text-stone-700 text-sm font-bold">{icon} {label}</div>
      <div className="flex flex-wrap gap-1.5">
        {portions.map((p) => (
          <button key={p} type="button"
            onClick={() => onChange(value === p ? "" : p)}
            className={`px-3 h-9 rounded-full text-xs font-semibold border ${value === p ? "bg-[#A7D7C5] border-[#A7D7C5] text-stone-900" : "bg-stone-50 border-stone-200 text-stone-600"}`}
            data-testid={`${testidPrefix}-${p}`}>{p}</button>
        ))}
      </div>
    </div>
  );
}

function Counter({ label, icon, value, onChange, step = 1, testid }) {
  return (
    <div className="rounded-3xl border border-stone-200 p-3 bg-white">
      <div className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">{icon} {label}</div>
      <div className="mt-2 flex items-center justify-between">
        <button onClick={() => onChange(Math.max(0, value - step))} type="button" data-testid={`${testid}-minus`}><MinusCircle className="h-7 w-7 text-stone-400 hover:text-stone-700" /></button>
        <span className="font-display text-2xl font-bold" data-testid={`${testid}-value`}>{value}</span>
        <button onClick={() => onChange(value + step)} type="button" data-testid={`${testid}-plus`}><PlusCircle className="h-7 w-7 text-stone-400 hover:text-brand" /></button>
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange, testid }) {
  return (
    <label className="block">
      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
        data-testid={testid} />
    </label>
  );
}
