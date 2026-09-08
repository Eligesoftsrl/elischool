import { useEffect, useState, useRef, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Scan, LogIn, LogOut, RefreshCw, QrCode, Check, X, Clock, Users, CheckSquare, Square } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

export default function Attendance() {
  const { activeYear } = useOutletContext();
  const [classrooms, setClassrooms] = useState([]);
  const [classIds, setClassIds] = useState([]); // multi-select
  const [students, setStudents] = useState([]); // [{...student, classroom_id}]
  const [todayLog, setTodayLog] = useState([]);
  const [barcode, setBarcode] = useState("");
  const [action, setAction] = useState("in");
  const [lastCheck, setLastCheck] = useState(null);
  const inputRef = useRef(null);

  const today = new Date().toISOString().slice(0, 10);
  const classById = useMemo(() => Object.fromEntries(classrooms.map(c => [c.id, c])), [classrooms]);

  useEffect(() => {
    if (!activeYear) return;
    (async () => {
      const c = await api.get("/classrooms", { params: { school_year_id: activeYear.id } });
      setClassrooms(c.data);
      if (c.data.length && classIds.length === 0) setClassIds([c.data[0].id]);
    })();
    // eslint-disable-next-line
  }, [activeYear]);

  const load = async () => {
    if (classIds.length === 0 || !activeYear) { setStudents([]); setTodayLog([]); return; }
    try {
      // Fetch students & attendance for each selected class in parallel
      const results = await Promise.all(
        classIds.map(async (cid) => {
          const [s, a] = await Promise.all([
            api.get(`/classrooms/${cid}/students`, { params: { school_year_id: activeYear.id } }),
            api.get("/attendance", { params: { date_str: today, classroom_id: cid, school_year_id: activeYear.id } }),
          ]);
          return { cid, students: s.data.map((x) => ({ ...x, classroom_id: cid })), attendance: a.data };
        })
      );
      // Dedupe students by id (a student appears once per classroom, but multi-class enrollments shouldn't dupe)
      const seen = new Set();
      const flatStudents = [];
      results.forEach((r) => r.students.forEach((s) => { if (!seen.has(s.id)) { seen.add(s.id); flatStudents.push(s); } }));
      setStudents(flatStudents);
      setTodayLog(results.flatMap((r) => r.attendance));
    } catch (e) {
      toast.error(apiErrorMessage(e));
    }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classIds, activeYear]);

  const toggleClass = (cid) => {
    setClassIds((prev) => (prev.includes(cid) ? prev.filter((x) => x !== cid) : [...prev, cid]));
  };
  const selectAll = () => setClassIds(classrooms.map((c) => c.id));
  const clearAll = () => setClassIds([]);

  const submitBarcode = async (e) => {
    e?.preventDefault();
    if (!barcode.trim()) return;
    try {
      const { data } = await api.post("/attendance", { barcode: barcode.trim(), action });
      setLastCheck(data);
      toast.success(`${action === "in" ? "Ingresso" : "Uscita"} registrato per ${data.student.first_name}`);
      setBarcode("");
      inputRef.current?.focus();
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); setBarcode(""); inputRef.current?.focus(); }
  };

  const manualCheck = async (sid, act) => {
    try {
      await api.post("/attendance", { student_id: sid, action: act });
      toast.success(act === "in" ? "Ingresso" : "Uscita");
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const lastFor = (sid) => todayLog.find((x) => x.student_id === sid);
  const presentCount = students.filter((s) => { const l = lastFor(s.id); return l && l.action === "in"; }).length;

  // group students by classroom for readability when multi-class
  const grouped = useMemo(() => {
    const g = new Map();
    students.forEach((s) => {
      const cid = s.classroom_id;
      if (!g.has(cid)) g.set(cid, []);
      g.get(cid).push(s);
    });
    return Array.from(g.entries()).sort(([a], [b]) => (classById[a]?.name || "").localeCompare(classById[b]?.name || ""));
  }, [students, classById]);

  const allSelected = classrooms.length > 0 && classIds.length === classrooms.length;

  return (
    <div>
      <PageHeader
        title="Presenze"
        subtitle={
          classIds.length === 0
            ? "Seleziona almeno una sezione"
            : `Oggi · ${presentCount}/${students.length} presenti · ${classIds.length} sezion${classIds.length === 1 ? "e" : "i"} selezionat${classIds.length === 1 ? "a" : "e"}`
        }
      />

      <Card className="mb-5 bg-gradient-to-br from-amber-50 to-rose-50 border-amber-100">
        <div className="flex items-center gap-3 mb-3">
          <Scan className="h-5 w-5 text-amber-600" />
          <p className="font-display font-bold">Scansiona barcode</p>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setAction("in")} className={`flex-1 h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 ${action === "in" ? "bg-emerald-600 text-white" : "bg-white text-stone-700 border border-stone-200"}`} data-testid="action-in">
            <LogIn className="h-4 w-4" /> Ingresso
          </button>
          <button onClick={() => setAction("out")} className={`flex-1 h-12 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 ${action === "out" ? "bg-rose-600 text-white" : "bg-white text-stone-700 border border-stone-200"}`} data-testid="action-out">
            <LogOut className="h-4 w-4" /> Uscita
          </button>
        </div>
        <form onSubmit={submitBarcode} className="flex gap-2">
          <input ref={inputRef} autoFocus value={barcode} onChange={(e) => setBarcode(e.target.value)}
            placeholder="Inquadra o digita il barcode…"
            className="flex-1 h-12 px-4 rounded-2xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 font-mono"
            data-testid="barcode-input" />
          <button type="submit" className="h-12 px-5 rounded-2xl bg-stone-900 text-white font-semibold">OK</button>
        </form>
        {lastCheck && (
          <div className="mt-3 p-3 rounded-2xl bg-white/70 border border-stone-200 flex items-center gap-3">
            <span className="h-10 w-10 rounded-2xl bg-emerald-100 flex items-center justify-center"><Check className="h-5 w-5 text-emerald-700" /></span>
            <div className="text-sm">
              <p className="font-bold">{lastCheck.student.first_name} {lastCheck.student.last_name}</p>
              <p className="text-stone-500">{lastCheck.entry.action === "in" ? "Ingresso" : "Uscita"} · {new Date(lastCheck.entry.ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}</p>
            </div>
          </div>
        )}
      </Card>

      {/* Multi-select sezioni */}
      <div className="mb-5">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5" /> Sezioni
          </p>
          <button
            onClick={allSelected ? clearAll : selectAll}
            className="text-xs font-semibold text-brand hover:underline flex items-center gap-1"
            data-testid="toggle-all-classes"
          >
            {allSelected ? <><Square className="h-3.5 w-3.5" /> Deseleziona tutte</> : <><CheckSquare className="h-3.5 w-3.5" /> Seleziona tutte</>}
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
          {classrooms.map((c) => {
            const active = classIds.includes(c.id);
            return (
              <button
                key={c.id}
                onClick={() => toggleClass(c.id)}
                className={`shrink-0 h-11 pl-3 pr-4 rounded-full border text-sm font-semibold flex items-center gap-2 transition-all ${active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200 hover:border-stone-400"}`}
                data-testid={`att-class-${c.id}`}
                aria-pressed={active}
              >
                {active ? <CheckSquare className="h-4 w-4" /> : <Square className="h-4 w-4 opacity-60" />}
                {c.name}
              </button>
            );
          })}
        </div>
      </div>

      {classIds.length === 0 ? (
        <EmptyState title="Nessuna sezione selezionata" description="Scegli almeno una sezione qui sopra per visualizzare gli alunni." />
      ) : students.length === 0 ? (
        <EmptyState title="Nessun alunno" description="Nelle sezioni selezionate non è iscritto ancora nessuno." />
      ) : (
        <div className="space-y-6">
          {grouped.map(([cid, list]) => {
            const cName = classById[cid]?.name || "Sezione";
            const presentInGroup = list.filter((s) => { const l = lastFor(s.id); return l && l.action === "in"; }).length;
            return (
              <section key={cid} data-testid={`att-group-${cid}`}>
                <div className="flex items-center justify-between mb-3 px-1">
                  <div>
                    <p className="font-display font-bold text-stone-900">{cName}</p>
                    <p className="text-xs text-stone-500">{presentInGroup}/{list.length} presenti</p>
                  </div>
                  <Pill color={presentInGroup === list.length ? "green" : "stone"}>
                    {Math.round((presentInGroup / (list.length || 1)) * 100)}%
                  </Pill>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {list.map((s) => {
                    const last = lastFor(s.id);
                    const present = last && last.action === "in";
                    return (
                      <Card key={s.id} className="!p-4" data-testid={`att-student-${s.id}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-bold truncate">{s.first_name} {s.last_name}</p>
                            {last
                              ? <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5"><Clock className="h-3 w-3" /> {new Date(last.ts).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })} {last.action === "in" ? "ingresso" : "uscita"}</p>
                              : <p className="text-xs text-stone-400 mt-0.5">Non registrato</p>}
                          </div>
                          {present ? <Pill color="green"><Check className="h-3 w-3" /> Presente</Pill> : <Pill color="stone">Assente</Pill>}
                        </div>
                        <div className="mt-3 grid grid-cols-2 gap-2">
                          <button onClick={() => manualCheck(s.id, "in")} disabled={present}
                            className="h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                            data-testid={`manual-in-${s.id}`}>
                            <LogIn className="h-3.5 w-3.5" /> Ingresso
                          </button>
                          <button onClick={() => manualCheck(s.id, "out")} disabled={!present}
                            className="h-10 rounded-xl bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                            data-testid={`manual-out-${s.id}`}>
                            <LogOut className="h-3.5 w-3.5" /> Uscita
                          </button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
