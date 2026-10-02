import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus, School, GraduationCap, Users, Inbox, Pause, Play, Trash2,
  Copy, ExternalLink, Pencil, Layers,
} from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";
import { SearchBar } from "@/components/SearchBar";
import { ExportMenu } from "@/components/ExportMenu";
import { fmtDate } from "@/lib/format";

const PLAN_COLOR = { trial: "amber", basic: "stone", pro: "brand", demo: "purple" };
const PLAN_LABEL = { trial: "Trial", basic: "Basic", pro: "Pro", demo: "Demo" };

export default function SuperAdminTenants() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/superadmin/tenants"); setRows(data); }
    catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const displayed = useMemo(() => {
    const qn = q.trim().toLowerCase();
    if (!qn) return rows;
    return rows.filter((t) =>
      (t.name || "").toLowerCase().includes(qn) ||
      (t.slug || "").toLowerCase().includes(qn) ||
      (t.contact_email || "").toLowerCase().includes(qn) ||
      (t.plan || "").toLowerCase().includes(qn) ||
      (t.status || "").toLowerCase().includes(qn)
    );
  }, [rows, q]);

  const toggleStatus = async (t) => {
    const next = t.status === "active" ? "suspended" : "active";
    if (!confirm(`${next === "suspended" ? "Sospendere" : "Riattivare"} ${t.name}?`)) return;
    try {
      await api.patch(`/superadmin/tenants/${t.id}`, { status: next });
      toast.success(`Scuola ${next === "suspended" ? "sospesa" : "riattivata"}`);
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (t) => {
    if (!confirm(`ELIMINARE definitivamente "${t.name}" e tutti i suoi dati? L'azione non è reversibile.`)) return;
    if (!confirm(`Conferma ancora: digitando OK eliminerai utenti, alunni, foto, attività di "${t.name}".`)) return;
    try { await api.delete(`/superadmin/tenants/${t.id}`); toast.success("Scuola eliminata"); await load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const totalStudents = rows.reduce((s, t) => s + (t.stats?.students || 0), 0);
  const totalUsers = rows.reduce((s, t) => s + (t.stats?.users || 0), 0);
  const totalPending = rows.reduce((s, t) => s + (t.stats?.enrollment_requests_pending || 0), 0);

  return (
    <div>
      <PageHeader
        title="Scuole registrate"
        subtitle={`${rows.length} scuol${rows.length === 1 ? "a" : "e"} sulla piattaforma`}
        right={
          <div className="flex items-center gap-2">
            <ExportMenu
              data={displayed}
              columns={[
                { key: "name", label: "Nome scuola" },
                { key: "slug", label: "Slug (URL)" },
                { key: "contact_email", label: "Email admin" },
                { key: "contact_phone", label: "Telefono" },
                { key: "plan", label: "Piano", format: (r) => PLAN_LABEL[r.plan] || r.plan },
                { key: "status", label: "Stato", format: (r) => r.status === "active" ? "Attiva" : "Sospesa" },
                { key: "created_at", label: "Attiva dal", format: (r) => fmtDate(r.created_at) },
                { key: "students", label: "Alunni", format: (r) => r.stats?.students ?? 0 },
                { key: "users", label: "Utenti", format: (r) => r.stats?.users ?? 0 },
                { key: "classrooms", label: "Sezioni", format: (r) => r.stats?.classrooms ?? 0 },
              ]}
              filename="scuole"
              title="Scuole registrate sulla piattaforma"
              testid="export-tenants"
            />
            <Link
              to="/superadmin/tenants/new"
              className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 tap-press shadow-sm"
              data-testid="sa-new-tenant-btn"
            >
              <Plus className="h-4 w-4" /> Nuova scuola
            </Link>
          </div>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi icon={<School className="h-5 w-5 text-brand" />} label="Scuole totali" value={rows.length} />
        <Kpi icon={<GraduationCap className="h-5 w-5 text-emerald-600" />} label="Alunni totali" value={totalStudents} />
        <Kpi icon={<Users className="h-5 w-5 text-violet-600" />} label="Utenti totali" value={totalUsers} />
        <Kpi icon={<Inbox className="h-5 w-5 text-amber-600" />} label="Iscrizioni in sospeso" value={totalPending} />
      </div>

      <SearchBar
        value={q}
        onChange={setQ}
        placeholder="Cerca per nome, slug, email, piano o stato…"
        testid="sa-search"
      />

      {loading ? (
        <p className="text-stone-500">Caricamento…</p>
      ) : rows.length === 0 ? (
        <EmptyState title="Nessuna scuola" description="Crea la prima scuola per iniziare." />
      ) : displayed.length === 0 ? (
        <EmptyState title="Nessun risultato" description="Prova a cambiare i termini di ricerca." />
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {displayed.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }}
              data-testid={`sa-tenant-card-${t.id}`}
            >
              <Card className={t.status === "suspended" ? "border-rose-200 bg-rose-50/50" : ""}>
                <div className="flex items-start gap-3">
                  <div className={`h-14 w-14 rounded-2xl flex items-center justify-center shrink-0 overflow-hidden ${
                    t.status === "suspended" ? "bg-rose-100" : "bg-orange-50"
                  }`}>
                    {t.logo_base64
                      ? <img src={t.logo_base64.startsWith("data:") ? t.logo_base64 : `data:image/png;base64,${t.logo_base64}`} alt="" className="h-full w-full object-cover" />
                      : <School className={`h-6 w-6 ${t.status === "suspended" ? "text-rose-600" : "text-[#FF8C6B]"}`} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg font-bold text-stone-900 truncate">{t.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-1">
                      {t.status === "suspended"
                        ? <Pill color="rose">Sospesa</Pill>
                        : <Pill color="green">Attiva</Pill>}
                      <Pill color={PLAN_COLOR[t.plan] || "stone"}>Piano {PLAN_LABEL[t.plan] || t.plan}</Pill>
                      <span className="text-xs text-stone-500">· dal {fmtDate(t.created_at)}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-1 truncate">
                      <code className="font-mono text-stone-700">/iscrizione/{t.slug}</code> · {t.contact_email}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-4">
                  <Stat icon={GraduationCap} label="Alunni" value={t.stats?.students || 0} />
                  <Stat icon={Users} label="Utenti" value={t.stats?.users || 0} />
                  <Stat icon={Layers} label="Sezioni" value={t.stats?.classrooms || 0} />
                  <Stat icon={Inbox} label="Pending" value={t.stats?.enrollment_requests_pending || 0} />
                </div>

                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-stone-100 flex-wrap">
                  <button
                    onClick={() => nav(`/superadmin/tenants/${t.id}/edit`)}
                    className="h-10 px-3 rounded-xl text-xs font-semibold bg-stone-900 hover:bg-stone-800 text-white flex items-center gap-1.5 shadow-sm"
                    data-testid={`sa-edit-${t.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Modifica
                  </button>
                  <button
                    onClick={() => toggleStatus(t)}
                    className="h-10 px-3 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1.5"
                    data-testid={`sa-toggle-${t.id}`}
                  >
                    {t.status === "active"
                      ? <><Pause className="h-3.5 w-3.5" /> Sospendi</>
                      : <><Play className="h-3.5 w-3.5" /> Riattiva</>}
                  </button>
                  <a
                    href={`/iscrizione/${t.slug}`}
                    target="_blank" rel="noreferrer"
                    className="h-10 px-3 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1.5"
                    data-testid={`sa-public-${t.id}`}
                  >
                    <ExternalLink className="h-3.5 w-3.5" /> Form
                  </a>
                  <button
                    onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/iscrizione/${t.slug}`); toast.success("Link copiato"); }}
                    className="h-10 px-3 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center gap-1.5"
                    data-testid={`sa-copy-${t.id}`}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copia
                  </button>
                  <div className="flex-1" />
                  <button
                    onClick={() => remove(t)}
                    className="h-10 w-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 flex items-center justify-center"
                    data-testid={`sa-delete-${t.id}`}
                    title="Elimina"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value }) {
  return (
    <div className="rounded-2xl bg-white border border-stone-200 p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
        <span className="h-8 w-8 rounded-xl bg-stone-50 flex items-center justify-center">{icon}</span>
      </div>
      <p className="font-display text-2xl font-bold text-stone-900 mt-1">{value}</p>
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-stone-50 border border-stone-100 px-2 py-2 text-center">
      <Icon className="h-3.5 w-3.5 text-stone-500 mx-auto mb-0.5" />
      <p className="font-display text-lg font-bold text-stone-900 leading-none">{value}</p>
      <p className="text-[10px] text-stone-500 uppercase tracking-wide mt-1 whitespace-nowrap">{label}</p>
    </div>
  );
}
