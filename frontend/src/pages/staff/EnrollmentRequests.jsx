import { useEffect, useState } from "react";
import { toast } from "sonner";
import { CheckCircle2, X, Clock, Mail, Phone, MapPin, Copy, Sparkles } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

export default function EnrollmentRequests() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [inviteLink, setInviteLink] = useState(null);

  const load = async () => {
    try {
      const params = filter === "all" ? {} : { status: filter };
      const { data } = await api.get("/enrollment-requests", { params });
      setItems(data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [filter]);

  const approve = async (id) => {
    if (!confirm("Approvare l'iscrizione? Verrà creato l'alunno + invito al genitore.")) return;
    try {
      const { data } = await api.post(`/enrollment-requests/${id}/approve`);
      setInviteLink(data.mock_invite_link);
      toast.success("Iscrizione approvata · alunno e genitore creati");
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const reject = async (id) => {
    if (!confirm("Rifiutare la richiesta?")) return;
    try { await api.post(`/enrollment-requests/${id}/reject`); toast.success("Richiesta rifiutata"); await load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const statusColor = { pending: "amber", approved: "green", rejected: "rose" };

  return (
    <div>
      <PageHeader title="Iscrizioni" subtitle="Richieste di iscrizione dal sito" />

      <Card className="mb-5 !p-4 bg-gradient-to-br from-sky-50 to-indigo-50 border-sky-100">
        <div className="flex items-start gap-3">
          <Sparkles className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-stone-800">
              Link pubblico da condividere: <a href="/iscrizione" target="_blank" rel="noreferrer" className="font-bold text-sky-700 underline">{window.location.origin}/iscrizione</a>
            </p>
          </div>
        </div>
      </Card>

      {inviteLink && (
        <div className="mb-6 p-5 rounded-3xl border border-amber-200 bg-amber-50">
          <p className="font-bold text-amber-900 mb-2">Link di invito al genitore (mock email)</p>
          <p className="text-sm text-amber-800 break-all" data-testid="approve-invite-link">{inviteLink}</p>
          <div className="flex gap-2 mt-3">
            <button onClick={() => { navigator.clipboard.writeText(inviteLink); toast.success("Copiato"); }}
              className="h-10 px-4 rounded-xl bg-white text-amber-800 border border-amber-300 text-xs font-semibold flex items-center gap-1.5">
              <Copy className="h-3.5 w-3.5" /> Copia
            </button>
            <button onClick={() => setInviteLink(null)} className="h-10 px-4 rounded-xl bg-amber-200 text-amber-900 text-xs font-semibold">Chiudi</button>
          </div>
        </div>
      )}

      <div className="flex gap-2 mb-5">
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`h-11 px-4 rounded-2xl text-sm font-semibold capitalize ${filter === f ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-700"}`}
            data-testid={`filter-${f}`}>
            {f === "all" ? "Tutte" : f === "pending" ? "In attesa" : f === "approved" ? "Approvate" : "Rifiutate"}
          </button>
        ))}
      </div>

      {items.length === 0 ? <EmptyState title="Nessuna richiesta" description="Le iscrizioni inviate dal sito appariranno qui." /> :
        <div className="space-y-3">
          {items.map((r) => (
            <Card key={r.id} data-testid={`request-card-${r.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <Pill color={statusColor[r.status]}>{r.status === "pending" ? "In attesa" : r.status === "approved" ? "Approvata" : "Rifiutata"}</Pill>
                    <p className="text-xs text-stone-400">{new Date(r.created_at).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" })}</p>
                  </div>
                  <p className="font-display text-lg font-bold">{r.student_first_name} {r.student_last_name}</p>
                  <p className="text-xs text-stone-500 mb-2">nato/a il {r.student_birth_date}</p>
                  <div className="grid sm:grid-cols-2 gap-y-1 gap-x-4 text-sm text-stone-600">
                    <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-stone-400" /> {r.parent_first_name} {r.parent_last_name}</p>
                    <p className="flex items-center gap-2"><Mail className="h-3.5 w-3.5 text-stone-400" />{r.parent_email}</p>
                    {r.parent_phone && <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-stone-400" />{r.parent_phone}</p>}
                    {r.address && <p className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-stone-400" />{r.address}</p>}
                  </div>
                  {r.notes && <p className="mt-3 p-3 rounded-2xl bg-stone-50 text-sm text-stone-700">{r.notes}</p>}
                </div>
                {r.status === "pending" && (
                  <div className="flex flex-col gap-2 shrink-0">
                    <button onClick={() => approve(r.id)} className="h-10 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1.5" data-testid={`approve-${r.id}`}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Approva
                    </button>
                    <button onClick={() => reject(r.id)} className="h-10 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center gap-1.5" data-testid={`reject-${r.id}`}>
                      <X className="h-3.5 w-3.5" /> Rifiuta
                    </button>
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}
