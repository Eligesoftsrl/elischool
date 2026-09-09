import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRight, ArrowRightLeft, Sparkles, Check, AlertTriangle } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill, SectionLabel } from "@/components/Primitives";

export default function YearTransition() {
  const [years, setYears] = useState([]);
  const [from, setFrom] = useState(null);
  const [to, setTo] = useState(null);
  const [fromClasses, setFromClasses] = useState([]);
  const [toClasses, setToClasses] = useState([]);
  const [mapping, setMapping] = useState({}); // {from_id: to_id}
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typedYear, setTypedYear] = useState("");

  useEffect(() => { (async () => {
    try { const { data } = await api.get("/school-years"); setYears(data); } catch (e) { toast.error(apiErrorMessage(e)); }
  })(); }, []);

  useEffect(() => {
    (async () => {
      if (!from) return setFromClasses([]);
      const { data } = await api.get("/classrooms", { params: { school_year_id: from } });
      setFromClasses(data);
    })();
  }, [from]);

  useEffect(() => {
    (async () => {
      if (!to) return setToClasses([]);
      const { data } = await api.get("/classrooms", { params: { school_year_id: to } });
      setToClasses(data);
    })();
  }, [to]);

  const targetYear = years.find((y) => y.id === to);
  const targetLabel = targetYear?.label || "";

  const openConfirm = () => {
    const entries = Object.entries(mapping).filter(([_, v]) => v);
    if (entries.length === 0) { toast.error("Imposta almeno una corrispondenza"); return; }
    if (!targetYear) { toast.error("Scegli l'anno di destinazione"); return; }
    setTypedYear("");
    setConfirmOpen(true);
  };

  const run = async () => {
    setBusy(true);
    try {
      const entries = Object.entries(mapping).filter(([_, v]) => v).map(([from_classroom_id, to_classroom_id]) => ({ from_classroom_id, to_classroom_id }));
      const { data } = await api.post("/year-transition", { from_year_id: from, to_year_id: to, mapping: entries });
      setDone(data);
      setConfirmOpen(false);
      toast.success(`${data.moved} alunni promossi`);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Passaggio anno" subtitle="Promuovi intere sezioni al nuovo anno scolastico" />

      <Card className="mb-6">
        <SectionLabel>1. Scegli anni</SectionLabel>
        <div className="grid sm:grid-cols-2 gap-4">
          <YearPicker years={years} value={from} onChange={setFrom} label="Da anno" testid="year-from" />
          <YearPicker years={years.filter((y) => y.id !== from)} value={to} onChange={setTo} label="Verso anno" testid="year-to" />
        </div>
      </Card>

      {from && to && (
        <Card>
          <SectionLabel>2. Corrispondenza tra sezioni</SectionLabel>
          {fromClasses.length === 0 ? (
            <EmptyState title="Nessuna sezione nell'anno di partenza" />
          ) : (
            <div className="space-y-3">
              {fromClasses.map((fc) => (
                <div key={fc.id} className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold">{fc.name} <span className="text-xs font-normal text-stone-500">{fc.age_band}</span></p>
                      <p className="text-xs text-stone-500">{fc.student_count || 0} alunni</p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-stone-400" />
                    <select
                      value={mapping[fc.id] || ""}
                      onChange={(e) => setMapping({ ...mapping, [fc.id]: e.target.value })}
                      className="h-11 px-3 rounded-xl bg-white border border-stone-200 text-sm"
                      data-testid={`mapping-${fc.id}`}
                    >
                      <option value="">Salta…</option>
                      {toClasses.map((tc) => <option key={tc.id} value={tc.id}>{tc.name} · {tc.age_band}</option>)}
                    </select>
                  </div>
                </div>
              ))}

              <button
                onClick={openConfirm} disabled={busy}
                className="w-full h-14 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] disabled:opacity-50 text-white font-semibold flex items-center justify-center gap-2"
                data-testid="run-transition-button"
              >
                <Sparkles className="h-5 w-5" /> {busy ? "Promozione…" : "Esegui passaggio"}
              </button>

              {done && (
                <div className="p-4 rounded-2xl bg-emerald-50 text-emerald-800 text-sm font-semibold flex items-center gap-2">
                  <Check className="h-5 w-5" /> Promossi {done.moved} alunni al nuovo anno
                </div>
              )}
            </div>
          )}
        </Card>
      )}

      {/* Modal di conferma con digitazione anno */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-900/50 p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 max-h-[92vh] overflow-y-auto">
            <div className="flex items-start gap-3 mb-4">
              <div className="h-12 w-12 rounded-2xl bg-rose-100 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-6 w-6 text-rose-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-xl font-bold text-stone-900">Conferma passaggio anno</h3>
                <p className="text-sm text-stone-500 mt-1">Operazione irreversibile</p>
              </div>
            </div>

            <div className="rounded-2xl bg-rose-50 border border-rose-200 p-4 mb-4 text-sm text-rose-900">
              <p className="font-bold mb-2">Riepilogo:</p>
              <ul className="space-y-1 text-xs list-disc list-inside">
                <li>Da anno: <b>{years.find(y=>y.id===from)?.label}</b></li>
                <li>Verso anno: <b>{targetLabel}</b></li>
                <li>Sezioni mappate: <b>{Object.values(mapping).filter(Boolean).length}</b></li>
                <li>Gli alunni saranno spostati nelle sezioni del nuovo anno</li>
                <li>L'anno di destinazione diventerà quello attivo</li>
              </ul>
            </div>

            <label className="block mb-4">
              <span className="text-xs font-bold uppercase tracking-wider text-stone-500">
                Per confermare, digita l'anno di destinazione: <b className="text-rose-600 font-mono">{targetLabel}</b>
              </span>
              <input
                type="text"
                value={typedYear}
                onChange={(e) => setTypedYear(e.target.value)}
                placeholder={targetLabel}
                autoFocus
                className="mt-2 w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-rose-300 font-mono tracking-wider"
                data-testid="year-confirm-input"
              />
            </label>

            <div className="flex gap-3">
              <button
                onClick={() => setConfirmOpen(false)}
                className="flex-1 h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 font-semibold text-sm"
              >
                Annulla
              </button>
              <button
                onClick={run}
                disabled={typedYear.trim() !== targetLabel || busy}
                className="flex-1 h-12 rounded-2xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold text-sm flex items-center justify-center gap-2"
                data-testid="year-confirm-run"
              >
                {busy ? "Promozione…" : "Conferma passaggio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function YearPicker({ years, value, onChange, label, testid }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        {years.map((y) => (
          <button
            key={y.id}
            onClick={() => onChange(y.id)}
            className={`h-11 px-4 rounded-2xl text-sm font-semibold border ${value === y.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
            data-testid={`${testid}-${y.label.replace("/", "-")}`}
          >
            {y.label}
          </button>
        ))}
      </div>
    </div>
  );
}
