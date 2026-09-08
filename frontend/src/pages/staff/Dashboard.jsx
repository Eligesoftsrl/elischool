import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Users, GraduationCap, ClipboardList, UserCog, UsersRound, ArrowRight,
  Sparkles, Plus, Bell, AlertTriangle, UserX,
} from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { toast } from "sonner";
import { PageHeader, StatCard, Card, EmptyState, Pill, SectionLabel } from "@/components/Primitives";

export default function StaffDashboard() {
  const { activeYear } = useOutletContext();
  const [stats, setStats] = useState(null);
  const [news, setNews] = useState([]);
  const [todayActivities, setTodayActivities] = useState([]);

  useEffect(() => {
    let m = true;
    (async () => {
      try {
        const [s, n] = await Promise.all([
          api.get("/dashboard/stats"),
          api.get("/news"),
        ]);
        if (!m) return;
        setStats(s.data);
        setNews(n.data.slice(0, 4));
        const today = new Date().toISOString().slice(0, 10);
        const a = await api.get("/activities", { params: { date_from: today, date_to: today } });
        if (!m) return;
        setTodayActivities(a.data);
      } catch (err) {
        toast.error(apiErrorMessage(err));
      }
    })();
    return () => { m = false; };
  }, []);

  return (
    <div>
      <PageHeader
        title="Buongiorno!"
        subtitle={activeYear ? `Anno scolastico ${activeYear.label}` : "Configura l'anno scolastico"}
        right={
          <Link
            to="/s/attivita"
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 tap-press"
            data-testid="dashboard-cta-activities"
          >
            <Plus className="h-4 w-4" /> Registra giornata
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Alunni" value={stats?.total_students ?? "—"} accent="#FF8C6B" icon={<GraduationCap className="h-4 w-4" />} />
        <StatCard label="Sezioni" value={stats?.total_classes ?? "—"} accent="#A2D2FF" icon={<Users className="h-4 w-4" />} />
        <StatCard label="Maestre" value={stats?.total_teachers ?? "—"} accent="#A7D7C5" icon={<UserCog className="h-4 w-4" />} />
        <StatCard
          label="Genitori"
          value={stats?.total_parents ?? "—"}
          accent="#D8B4E2"
          hint={stats?.pending_parents ? `${stats.pending_parents} da attivare` : null}
          icon={<UsersRound className="h-4 w-4" />}
        />
      </div>

      {/* Alerts strip: things that need attention */}
      {(stats?.unassigned_students > 0 || stats?.withdrawn_this_month > 0) && (
        <div className="mt-5 grid sm:grid-cols-2 gap-3" data-testid="dashboard-alerts">
          {stats.unassigned_students > 0 && (
            <Link
              to="/s/alunni"
              className="rounded-2xl p-4 bg-amber-50 border border-amber-200 hover:bg-amber-100 flex items-center gap-3 group transition-all"
              data-testid="dashboard-unassigned-alert"
            >
              <span className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 text-sm">
                  {stats.unassigned_students} {stats.unassigned_students === 1 ? "alunno" : "alunni"} senza sezione
                </p>
                <p className="text-xs text-amber-800/80 truncate">Assegnali a una sezione per iniziare</p>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
          {stats.withdrawn_this_month > 0 && (
            <Link
              to="/s/alunni"
              className="rounded-2xl p-4 bg-stone-100 border border-stone-200 hover:bg-stone-200 flex items-center gap-3 group transition-all"
              data-testid="dashboard-withdrawn-alert"
            >
              <span className="h-11 w-11 rounded-2xl bg-stone-500 text-white flex items-center justify-center shrink-0">
                <UserX className="h-5 w-5" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-stone-900 text-sm">
                  {stats.withdrawn_this_month} {stats.withdrawn_this_month === 1 ? "ritiro" : "ritiri"} questo mese
                </p>
                <p className="text-xs text-stone-600 truncate">Totale ritirati: {stats.withdrawn_students}</p>
              </div>
              <ArrowRight className="h-4 w-4 text-stone-700 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          )}
        </div>
      )}

      <div className="mt-8 grid lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-xl font-bold text-stone-900">Attività di oggi</h3>
            <Link to="/s/attivita" className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1">
              Vedi tutte <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {todayActivities.length === 0 ? (
            <EmptyState
              title="Nessuna attività registrata oggi"
              description="Vai nella sezione 'Attività' per registrare la giornata dei bambini."
              imageUrl="https://static.prod-images.emergentagent.com/jobs/96ad60f7-372f-4730-9be4-769e965e5107/images/ff88168c79f5a887e58508be26ea3e4f7ae859628398e0d781e9ee508232af3c.png"
            />
          ) : (
            <ul className="space-y-2">
              {todayActivities.slice(0, 8).map((a) => (
                <li key={a.id} className="flex items-center justify-between p-3 rounded-2xl bg-stone-50 border border-stone-100">
                  <div className="flex items-center gap-3">
                    <span className="h-9 w-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center">
                      <ClipboardList className="h-4 w-4 text-stone-500" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-stone-800">{a.student_id.slice(0, 8)}…</p>
                      <p className="text-[11px] text-stone-500">{a.date}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 flex-wrap justify-end">
                    {a.didattica && <Pill color={a.didattica === "Partecipato" ? "amber" : "stone"}>{a.didattica}</Pill>}
                    {a.pranzo && <Pill color="green">{a.pranzo}</Pill>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-display text-xl font-bold text-stone-900 flex items-center gap-2">
              <Bell className="h-5 w-5 text-stone-500" /> News
            </h3>
            <Link to="/s/news" className="text-xs font-bold text-brand uppercase tracking-wider flex items-center gap-1">
              Vedi <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {news.length === 0 ? (
            <p className="text-sm text-stone-500">Nessuna comunicazione.</p>
          ) : (
            <ul className="space-y-3">
              {news.map((n) => (
                <li key={n.id} className="border-l-2 border-[#FF8C6B] pl-3">
                  <p className="text-sm font-bold text-stone-900">{n.title}</p>
                  <p className="text-xs text-stone-500 line-clamp-2">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <SectionLabel className="mt-10">Suggerimenti</SectionLabel>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-violet-50/70 to-rose-50/70 p-6"
      >
        <div className="flex items-start gap-4">
          <span className="h-10 w-10 rounded-2xl bg-white/80 flex items-center justify-center shadow-sm">
            <Sparkles className="h-5 w-5 text-indigo-500" />
          </span>
          <div>
            <p className="font-display font-bold text-stone-900">Hai cambiato anno scolastico?</p>
            <p className="text-sm text-stone-600 mt-1">
              Usa la sezione <Link to="/s/passaggio-anno" className="text-brand font-semibold">Passaggio anno</Link> per promuovere intere classi al nuovo anno con un click.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
