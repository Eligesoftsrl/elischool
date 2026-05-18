import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  X, ChevronLeft, ChevronRight, Save, BookOpen, Activity, UtensilsCrossed,
  Cookie, Bed, Bath, Check, Sparkles, History, RotateCcw,
} from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill, SectionLabel } from "@/components/Primitives";

const today = () => new Date().toISOString().slice(0, 10);

// Same values as Flask original:
const OPT_PARTECIPATO = ["Partecipato", "Non ha Partecipato"];
const OPT_PRANZO = ["Ha mangiato", "Non ha mangiato", "Ha mangiato poco"];
const OPT_SINO = ["Si", "No"];

const emptyForm = {
  didattica: "", note_didattica: "",
  motoria: "", note_motoria: "",
  pranzo: "", note_pranzo: "",
  merenda: "", riposo: "", cacca: "", pipi: "",
  note: "",
};

export default function StaffActivities() {
  const { activeYear } = useOutletContext();
  const [date, setDate] = useState(today());
  const [classrooms, setClassrooms] = useState([]);
  const [classId, setClassId] = useState(null);
  const [students, setStudents] = useState([]);
  const [activities, setActivities] = useState({});
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [hint, setHint] = useState(null);

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

  const startEdit = async (s) => {
    setEditing(s);
    setHint(null);
    const existing = activities[s.id];
    if (existing) {
      setForm({
        didattica: existing.didattica || "",
        note_didattica: existing.note_didattica || "",
        motoria: existing.motoria || "",
        note_motoria: existing.note_motoria || "",
        pranzo: existing.pranzo || "",
        note_pranzo: existing.note_pranzo || "",
        merenda: existing.merenda || "",
        riposo: existing.riposo || "",
        cacca: existing.cacca || "",
        pipi: existing.pipi || "",
        note: existing.note || "",
      });
    } else {
      // NEW: ask backend for auto-fill suggestions (menu/piano/laboratori)
      try {
        const { data } = await api.get("/activities/suggestions", { params: { student_id: s.id, date_str: date } });
        setForm({
          ...emptyForm,
          note_didattica: data.note_didattica || "",
          note_motoria: data.note_motoria || "",
          note_pranzo: data.note_pranzo || "",
        });
        const sources = [];
        if (data.note_didattica) sources.push("piano didattico");
        if (data.note_motoria) sources.push("laboratorio extra");
        if (data.note_pranzo) sources.push("menu del giorno");
        if (sources.length) setHint(`Pre-compilato da: ${sources.join(" · ")}`);
      } catch (_) {
        setForm(emptyForm);
      }
    }
  };

  const replicateYesterday = async () => {
    if (!editing) return;
    try {
      const { data } = await api.get("/activities/last-before", {
        params: { student_id: editing.id, before_date: date },
      });
      setForm({
        didattica: data.didattica || "",
        note_didattica: data.note_didattica || "",
        motoria: data.motoria || "",
        note_motoria: data.note_motoria || "",
        pranzo: data.pranzo || "",
        note_pranzo: data.note_pranzo || "",
        merenda: data.merenda || "",
        riposo: data.riposo || "",
        cacca: data.cacca || "",
        pipi: data.pipi || "",
        note: data.note || "",
      });
      setHint(`Replicata dalla scheda del ${data.source_date}. Modifica solo ciò che è cambiato.`);
      toast.success("Scheda replicata");
    } catch (e) { toast.error(apiErrorMessage(e, "Nessuna scheda precedente da copiare")); }
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
      <PageHeader title="Scheda quotidiana" subtitle="Tocca un bambino per registrare la giornata" />

      <Card className="mb-5 !p-3">
        <div className="flex items-center justify-between gap-3">
          <button onClick={() => shiftDate(-1)} className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center" data-testid="prev-day">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            className="h-12 px-4 text-center font-semibold rounded-2xl bg-stone-50 border border-stone-200 flex-1"
            data-testid="activity-date" />
          <button onClick={() => shiftDate(1)} className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center" data-testid="next-day">
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1">
        {classrooms.map((c) => (
          <button key={c.id} onClick={() => setClassId(c.id)}
            className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${classId === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
            data-testid={`classroom-pill-${c.id}`}>
            {c.name}
          </button>
        ))}
      </div>

      {students.length === 0 ? (
        <EmptyState title="Nessun alunno in questa sezione" />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((s) => {
            const a = activities[s.id];
            const filled = a && (a.didattica || a.motoria || a.pranzo || a.merenda || a.riposo || a.note);
            return (
              <button key={s.id} onClick={() => startEdit(s)}
                className={`relative text-left bg-white rounded-3xl border p-5 transition-all tap-press ${filled ? "border-emerald-200" : "border-stone-200 hover:border-brand"}`}
                data-testid={`student-tile-${s.id}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-stone-900">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-stone-500">{s.birth_date || ""}</p>
                  </div>
                  {filled ? <Pill color="green"><Check className="h-3 w-3" /> Registrato</Pill> : <Pill color="stone">Da fare</Pill>}
                </div>
                {a && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {a.didattica && <Pill color={a.didattica === "Partecipato" ? "amber" : "stone"}>Didattica: {a.didattica}</Pill>}
                    {a.motoria && <Pill color={a.motoria === "Partecipato" ? "rose" : "stone"}>Motoria: {a.motoria}</Pill>}
                    {a.pranzo && <Pill color="green">{a.pranzo}</Pill>}
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
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-stone-900/40" onClick={() => setEditing(null)} />
            <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 260 }}
              className="fixed bottom-0 inset-x-0 z-50 bg-white rounded-t-[2.5rem] shadow-2xl max-h-[92vh] overflow-y-auto">
              <div className="sticky top-0 bg-white px-5 pt-4 pb-3 border-b border-stone-100 flex items-center justify-between z-10">
                <div>
                  <p className="text-xs text-stone-500 uppercase tracking-wider font-bold">Scheda del {date}</p>
                  <p className="font-display text-lg font-bold">{editing.first_name} {editing.last_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={replicateYesterday} type="button"
                    className="h-10 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-700 text-xs font-semibold flex items-center gap-1.5"
                    data-testid="replicate-yesterday-button"
                    title="Copia dalla scheda più recente">
                    <RotateCcw className="h-3.5 w-3.5" /> Replica
                  </button>
                  <button onClick={() => setEditing(null)} className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center"><X className="h-4 w-4" /></button>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {hint && (
                  <div className="rounded-2xl bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-50 border border-indigo-100 p-3 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    <p className="text-xs text-stone-700 leading-relaxed" data-testid="autofill-hint">{hint}</p>
                  </div>
                )}
                {/* Didattica */}
                <div>
                  <SectionLabel><BookOpen className="inline h-3 w-3 mr-1" /> Attività didattiche</SectionLabel>
                  <ChoiceRow options={OPT_PARTECIPATO} value={form.didattica}
                    onChange={(v) => setForm({ ...form, didattica: v })} testidPrefix="didattica" colorOn="#FDE68A" />
                  <Textarea className="mt-3" label="Descrizione attività didattiche"
                    value={form.note_didattica} onChange={(v) => setForm({ ...form, note_didattica: v })} testid="note-didattica" />
                </div>

                {/* Motoria */}
                <div>
                  <SectionLabel><Activity className="inline h-3 w-3 mr-1" /> Attività ricreative e motorie</SectionLabel>
                  <ChoiceRow options={OPT_PARTECIPATO} value={form.motoria}
                    onChange={(v) => setForm({ ...form, motoria: v })} testidPrefix="motoria" colorOn="#FFB38A" />
                  <Textarea className="mt-3" label="Descrizione attività ricreative e motorie"
                    value={form.note_motoria} onChange={(v) => setForm({ ...form, note_motoria: v })} testid="note-motoria" />
                </div>

                {/* Pranzo */}
                <div>
                  <SectionLabel><UtensilsCrossed className="inline h-3 w-3 mr-1" /> Pranzo</SectionLabel>
                  <ChoiceRow options={OPT_PRANZO} value={form.pranzo}
                    onChange={(v) => setForm({ ...form, pranzo: v })} testidPrefix="pranzo" colorOn="#A7D7C5" />
                  <Textarea className="mt-3" label="Ulteriori info sul pranzo"
                    value={form.note_pranzo} onChange={(v) => setForm({ ...form, note_pranzo: v })} testid="note-pranzo" />
                </div>

                {/* SiNo group */}
                <div>
                  <SectionLabel>Routine</SectionLabel>
                  <div className="grid grid-cols-2 gap-3">
                    <SiNoRow label="Merenda" icon={<Cookie className="h-4 w-4" />} value={form.merenda}
                      onChange={(v) => setForm({ ...form, merenda: v })} testidPrefix="merenda" />
                    <SiNoRow label="Riposo" icon={<Bed className="h-4 w-4" />} value={form.riposo}
                      onChange={(v) => setForm({ ...form, riposo: v })} testidPrefix="riposo" />
                    <SiNoRow label="Cacca" icon={<Bath className="h-4 w-4" />} value={form.cacca}
                      onChange={(v) => setForm({ ...form, cacca: v })} testidPrefix="cacca" />
                    <SiNoRow label="Pipì" icon={<Bath className="h-4 w-4" />} value={form.pipi}
                      onChange={(v) => setForm({ ...form, pipi: v })} testidPrefix="pipi" />
                  </div>
                </div>

                <Textarea label="Ulteriori Informazioni" value={form.note}
                  onChange={(v) => setForm({ ...form, note: v })} testid="note-generali" />

                <button onClick={save} disabled={saving}
                  className="w-full h-14 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
                  data-testid="save-activity-button">
                  <Save className="h-5 w-5" /> {saving ? "Salvataggio..." : "Inserisci / Modifica attività"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ChoiceRow({ options, value, onChange, colorOn, testidPrefix }) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button key={o} type="button"
          onClick={() => onChange(value === o ? "" : o)}
          className={`h-11 px-4 rounded-full border text-sm font-semibold transition-all ${value === o ? "border-transparent shadow-sm text-stone-900" : "bg-white border-stone-200 text-stone-600"}`}
          style={value === o ? { background: colorOn } : {}}
          data-testid={`${testidPrefix}-${o.replace(/\s+/g, "-").toLowerCase()}`}>
          {o}
        </button>
      ))}
    </div>
  );
}

function SiNoRow({ label, icon, value, onChange, testidPrefix }) {
  return (
    <div className="rounded-3xl border border-stone-200 p-3 bg-white">
      <div className="flex items-center gap-2 mb-2 text-stone-700 text-sm font-bold">{icon} {label}</div>
      <div className="flex gap-2">
        {["Si", "No"].map((o) => (
          <button key={o} type="button"
            onClick={() => onChange(value === o ? "" : o)}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold border ${value === o ? (o === "Si" ? "bg-emerald-100 border-emerald-300 text-emerald-800" : "bg-stone-100 border-stone-300 text-stone-700") : "bg-stone-50 border-stone-200 text-stone-500"}`}
            data-testid={`${testidPrefix}-${o.toLowerCase()}`}>
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

function Textarea({ label, value, onChange, testid, className }) {
  return (
    <label className={`block ${className || ""}`}>
      <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span>
      <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 resize-none"
        data-testid={testid} />
    </label>
  );
}
