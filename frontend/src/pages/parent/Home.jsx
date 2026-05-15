import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, RefreshCw, Smile, BookOpen, Activity, UtensilsCrossed, Bed, Heart, ChevronRight } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { Card, EmptyState, Pill, SectionLabel } from "@/components/Primitives";

export default function ParentHome() {
  const [children, setChildren] = useState([]);
  const [active, setActive] = useState(null);
  const [day, setDay] = useState(null);
  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/parent/me/children");
        setChildren(data);
        if (data.length) setActive(data[0]);
      } catch (e) { toast.error(apiErrorMessage(e)); }
    })();
  }, []);

  useEffect(() => {
    if (!active) return;
    (async () => {
      try {
        const { data } = await api.get(`/parent/child/${active.id}/day`);
        setDay(data);
      } catch (e) { toast.error(apiErrorMessage(e)); }
      // AI report
      loadReport(false);
    })();
    // eslint-disable-next-line
  }, [active?.id]);

  const loadReport = async (refresh) => {
    if (!active) return;
    setReportLoading(true);
    setReport(null);
    try {
      const url = refresh ? `/ai/daily-report/${active.id}/refresh` : `/ai/daily-report/${active.id}`;
      const { data } = refresh ? await api.post(url) : await api.get(url);
      setReport(data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setReportLoading(false); }
  };

  if (children.length === 0) {
    return <EmptyState title="Nessun bambino collegato" description="Contatta la scuola per associare i tuoi figli al tuo profilo." />;
  }

  const a = day?.activity;
  const today = new Date().toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="space-y-6">
      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1">
          {children.map((c) => (
            <button
              key={c.id}
              onClick={() => setActive(c)}
              className={`shrink-0 h-12 px-5 rounded-2xl text-sm font-semibold border ${active?.id === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
              data-testid={`child-switch-${c.id}`}
            >
              {c.first_name}
            </button>
          ))}
        </div>
      )}

      {/* Hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-[2rem] p-6 bg-gradient-to-br from-[#FF8C6B] via-[#FFB38A] to-[#FDE68A] text-white"
      >
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/15" />
        <div className="absolute -right-4 bottom-4 h-24 w-24 rounded-full bg-white/10" />
        <p className="text-xs uppercase tracking-wider font-bold opacity-90">{today}</p>
        <h1 className="mt-1 font-display text-3xl font-bold leading-tight">
          La giornata di {active?.first_name}
        </h1>
        {active?.classroom && (
          <span className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/25 backdrop-blur text-xs font-semibold">
            <Heart className="h-3 w-3" fill="white" /> {active.classroom.name} · {active.classroom.age_band}
          </span>
        )}
      </motion.div>

      {/* AI Report */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="relative rounded-[2rem] p-6 bg-gradient-to-br from-indigo-50 via-violet-50 to-rose-50 border border-indigo-100 overflow-hidden"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="h-9 w-9 rounded-2xl bg-white/80 flex items-center justify-center"><Sparkles className="h-4 w-4 text-indigo-500" /></span>
            <span className="font-display font-bold text-stone-900">Resoconto del giorno</span>
          </div>
          <button onClick={() => loadReport(true)} className="h-9 w-9 rounded-xl bg-white/80 flex items-center justify-center text-stone-600" data-testid="refresh-report-button">
            <RefreshCw className={`h-4 w-4 ${reportLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
        {reportLoading ? (
          <div className="space-y-2">
            <div className="h-3 bg-white/70 rounded animate-pulse w-5/6" />
            <div className="h-3 bg-white/70 rounded animate-pulse w-4/6" />
            <div className="h-3 bg-white/70 rounded animate-pulse w-5/6" />
          </div>
        ) : !report?.report ? (
          <p className="text-stone-600 text-sm">{report?.message || "Le maestre stanno ancora registrando le attività di oggi. A breve riceverai il resoconto."}</p>
        ) : (
          <p className="text-stone-800 leading-relaxed" data-testid="ai-report-text">{report.report}</p>
        )}
      </motion.div>

      {/* Day blocks */}
      {a ? (
        <div className="space-y-3">
          <SectionLabel>Attività di oggi</SectionLabel>
          <Block icon={<BookOpen className="h-5 w-5" />} bg="#FDE68A" title="Didattica" on={a.didattica} note={a.note_didattica} />
          <Block icon={<Activity className="h-5 w-5" />} bg="#FFB38A" title="Motoria" on={a.motoria} note={a.note_motoria} />
          <Block icon={<UtensilsCrossed className="h-5 w-5" />} bg="#A7D7C5" title="Pranzo" on={!!a.pranzo} note={`Porzione: ${a.pranzo || "—"}${a.note_pranzo ? " · " + a.note_pranzo : ""}`} />
          {a.merenda && <Block icon={<UtensilsCrossed className="h-5 w-5" />} bg="#A7D7C5" title="Merenda" on={true} note={`Porzione: ${a.merenda}`} />}
          {a.riposo_minuti > 0 && <Block icon={<Bed className="h-5 w-5" />} bg="#A2D2FF" title="Riposo" on={true} note={`${a.riposo_minuti} minuti`} />}
          {a.umore && (
            <Card className="!p-4 flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-violet-50 flex items-center justify-center"><Smile className="h-5 w-5 text-violet-600" /></div>
              <div className="flex-1">
                <p className="text-xs uppercase tracking-wider font-bold text-stone-500">Umore</p>
                <p className="font-semibold capitalize">{a.umore}</p>
              </div>
            </Card>
          )}
          {(a.pipi > 0 || a.cacca > 0 || a.bagno_cambi > 0) && (
            <Card className="!p-4 grid grid-cols-3 gap-3 text-center">
              {[
                ["Pipì", a.pipi],
                ["Cacca", a.cacca],
                ["Cambi", a.bagno_cambi],
              ].map(([l, v]) => (
                <div key={l}>
                  <p className="text-[11px] uppercase tracking-wider font-bold text-stone-500">{l}</p>
                  <p className="font-display text-2xl font-bold">{v || 0}</p>
                </div>
              ))}
            </Card>
          )}
          {a.note && (
            <Card className="!p-5 border-l-4 border-[#FF8C6B]">
              <p className="text-xs uppercase tracking-wider font-bold text-stone-500 mb-1">Note dalle maestre</p>
              <p className="text-stone-800 leading-relaxed">{a.note}</p>
            </Card>
          )}
        </div>
      ) : (
        <EmptyState
          title="Le maestre stanno registrando…"
          description="Le attività di oggi arriveranno qui appena saranno pronte."
          imageUrl="https://static.prod-images.emergentagent.com/jobs/96ad60f7-372f-4730-9be4-769e965e5107/images/ff88168c79f5a887e58508be26ea3e4f7ae859628398e0d781e9ee508232af3c.png"
        />
      )}
    </div>
  );
}

function Block({ icon, title, on, note, bg }) {
  return (
    <Card className="!p-4 flex items-center gap-3">
      <div className="h-12 w-12 rounded-2xl flex items-center justify-center" style={{ background: on ? bg : "#F5F5F4" }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="font-semibold text-stone-900">{title}</p>
          {on ? <Pill color="green">✓</Pill> : <Pill color="stone">no</Pill>}
        </div>
        {on && note && <p className="text-sm text-stone-500 mt-0.5 line-clamp-2">{note}</p>}
      </div>
    </Card>
  );
}
