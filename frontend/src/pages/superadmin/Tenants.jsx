import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import {
  Plus, School, GraduationCap, Users, Inbox, Pause, Play, Trash2,
  Mail, Phone, Globe, Copy, ExternalLink, Sparkles,
} from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";

export default function SuperAdminTenants() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  const load = async () => {
    setLoading(true);
    try { const { data } = await api.get("/superadmin/tenants"); setRows(data); }
    catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const toggleStatus = async (t) => {
    const next = t.status === "active" ? "suspended" : "active";
    if (!confirm(`${next === "suspended" ? "Sospendere" : "Riattivare"} ${t.name}?`)) return;
    try { await api.patch(`/superadmin/tenants/${t.id}`, { status: next }); toast.success(`Scuola ${next === "suspended" ? "sospesa" : "riattivata"}`); await load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const remove = async (t) => {
    if (!confirm(`ELIMINARE definitivamente "${t.name}" e tutti i suoi dati? L'azione non è reversibile.`)) return;
    if (!confirm(`Conferma ancora: digitando OK eliminerai utenti, alunni, foto, attività di "${t.name}".`)) return;
    try { await api.delete(`/superadmin/tenants/${t.id}`); toast.success("Scuola eliminata"); await load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-7">
        <div>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-stone-100 tracking-tight">Scuole registrate</h1>
          <p className="text-stone-500 text-sm mt-1">{rows.length} scuol{rows.length === 1 ? "a" : "e"} attive sulla piattaforma</p>
        </div>
        <Link to="/superadmin/tenants/new"
          className="h-12 px-5 rounded-2xl bg-amber-400 hover:bg-amber-300 text-stone-900 font-semibold text-sm flex items-center gap-2 tap-press"
          data-testid="sa-new-tenant-btn">
          <Plus className="h-4 w-4"/> Nuova scuola
        </Link>
      </div>

      {loading ? <p className="text-stone-500">Caricamento…</p> :
        rows.length === 0 ? (
          <div className="text-center py-20 rounded-3xl border border-dashed border-stone-700">
            <School className="h-12 w-12 text-stone-600 mx-auto mb-3"/>
            <p className="text-stone-400 font-semibold mb-1">Nessuna scuola</p>
            <p className="text-stone-600 text-sm">Crea la prima scuola per iniziare</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map((t, i) => (
              <motion.div key={t.id} initial={{opacity:0,y:8}} animate={{opacity:1,y:0}} transition={{delay:i*0.05}}
                className={`relative rounded-3xl border p-5 ${t.status==="suspended" ? "bg-rose-950/30 border-rose-900" : "bg-stone-900 border-stone-800"}`}
                data-testid={`sa-tenant-card-${t.id}`}>
                <div className="flex items-start gap-3">
                  <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${t.status==="suspended" ? "bg-rose-900/40" : "bg-gradient-to-br from-amber-400/20 to-rose-500/20"}`}>
                    {t.logo_base64 ? <img src={`data:image/png;base64,${t.logo_base64}`} alt="" className="h-10 w-10 rounded-xl object-cover"/> :
                      <School className={`h-5 w-5 ${t.status==="suspended"?"text-rose-400":"text-amber-300"}`}/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display text-lg font-bold text-stone-100 truncate">{t.name}</h3>
                      {t.status === "suspended" && <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-rose-900/50 text-rose-300">sospesa</span>}
                      <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-stone-800 text-stone-400">{t.plan}</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">/{t.slug} · {t.contact_email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mt-4">
                  <Stat icon={GraduationCap} label="Alunni" value={t.stats?.students || 0}/>
                  <Stat icon={Users} label="Utenti" value={t.stats?.users || 0}/>
                  <Stat icon={School} label="Sezioni" value={t.stats?.classrooms || 0}/>
                  <Stat icon={Inbox} label="In attesa" value={t.stats?.enrollment_requests_pending || 0}/>
                </div>

                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-stone-800">
                  <button onClick={() => toggleStatus(t)} className="h-10 px-3 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center gap-1.5" data-testid={`sa-toggle-${t.id}`}>
                    {t.status === "active" ? <><Pause className="h-3.5 w-3.5"/> Sospendi</> : <><Play className="h-3.5 w-3.5"/> Riattiva</>}
                  </button>
                  <a href={`/iscrizione/${t.slug}`} target="_blank" rel="noreferrer"
                    className="h-10 px-3 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center gap-1.5" data-testid={`sa-public-${t.id}`}>
                    <ExternalLink className="h-3.5 w-3.5"/> Form iscrizione
                  </a>
                  <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/iscrizione/${t.slug}`); toast.success("Link copiato"); }}
                    className="h-10 px-3 rounded-xl text-xs font-semibold bg-stone-800 hover:bg-stone-700 text-stone-300 flex items-center gap-1.5">
                    <Copy className="h-3.5 w-3.5"/> Copia
                  </button>
                  <div className="flex-1"/>
                  <button onClick={() => remove(t)} className="h-10 w-10 rounded-xl text-xs font-semibold bg-rose-950/50 hover:bg-rose-900/50 text-rose-400 flex items-center justify-center" data-testid={`sa-delete-${t.id}`}>
                    <Trash2 className="h-4 w-4"/>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )
      }
    </div>
  );
}

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl bg-stone-950/50 border border-stone-800 px-2 py-2.5 text-center">
      <Icon className="h-3.5 w-3.5 text-stone-500 mx-auto mb-0.5"/>
      <p className="font-display text-lg font-bold text-stone-100 leading-none">{value}</p>
      <p className="text-[10px] text-stone-500 uppercase tracking-wider mt-1">{label}</p>
    </div>
  );
}
