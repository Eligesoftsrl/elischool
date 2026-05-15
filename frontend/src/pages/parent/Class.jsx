import { useEffect, useState } from "react";
import { Megaphone, Image as ImageIcon, BookOpen, Sparkles, Calendar } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { Card, EmptyState, Pill } from "@/components/Primitives";

export default function ParentClass() {
  const [tab, setTab] = useState("comm");
  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">La classe</h1>
      <p className="text-stone-500 text-sm mb-5">Comunicazioni, piano didattico e laboratori</p>

      <div className="flex gap-2 mb-5">
        {[
          ["comm", "Comunicazioni", Megaphone],
          ["plans", "Piano", BookOpen],
          ["labs", "Laboratori", Sparkles],
        ].map(([k, l, Icon]) => (
          <button key={k} onClick={() => setTab(k)}
            className={`flex-1 h-12 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 ${tab === k ? "bg-stone-900 text-white" : "bg-white text-stone-700 border border-stone-200"}`}
            data-testid={`parent-tab-${k}`}>
            <Icon className="h-4 w-4" /> {l}
          </button>
        ))}
      </div>

      {tab === "comm" && <Comms />}
      {tab === "plans" && <Plans />}
      {tab === "labs" && <Labs />}
    </div>
  );
}

function Comms() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => { try { const { data } = await api.get("/parent/me/communications"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); } })();
  }, []);
  const typeColor = { comunicazione_classe: "blue", evento_attivita: "amber", avviso: "rose" };
  const typeLabel = { comunicazione_classe: "Classe", evento_attivita: "Evento", avviso: "Avviso" };
  if (!items.length) return <EmptyState title="Nessuna comunicazione" />;
  return (
    <div className="space-y-3">
      {items.map((n) => (
        <Card key={n.id} className="!p-5">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Pill color={typeColor[n.type]}>{typeLabel[n.type]}</Pill>
            <p className="text-xs text-stone-400">{new Date(n.publish_date).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</p>
          </div>
          <h3 className="font-display font-bold text-stone-900">{n.title}</h3>
          <div className="text-sm text-stone-600 mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: n.body }} />
          {n.media?.length > 0 && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {n.media.map((m) => <LazyImg key={m.id} id={m.id} className="aspect-square rounded-2xl object-cover w-full" />)}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

function Plans() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => { try { const { data } = await api.get("/parent/me/lesson-plans"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); } })();
  }, []);
  if (!items.length) return <EmptyState title="Nessun piano pubblicato" />;
  return (
    <div className="space-y-3">
      {items.map((p) => (
        <Card key={p.id} className="!p-5">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <Pill color="brand"><Calendar className="h-3 w-3" /> {p.date_from} → {p.date_to}</Pill>
          </div>
          <h3 className="font-display font-bold text-stone-900">{p.title}</h3>
          <div className="text-sm text-stone-700 mt-2 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: p.body }} />
        </Card>
      ))}
    </div>
  );
}

function Labs() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => { try { const { data } = await api.get("/parent/me/extra-labs"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); } })();
  }, []);
  if (!items.length) return <EmptyState title="Nessun laboratorio impostato" />;
  const DAYS = ["lunedì","martedì","mercoledì","giovedì","venerdì"];
  return (
    <div className="space-y-3">
      {DAYS.map((d) => {
        const day = items.filter((l) => l.day_of_week === d);
        if (!day.length) return null;
        return (
          <Card key={d} className="!p-4">
            <p className="text-xs uppercase tracking-wider font-bold text-stone-400 mb-2 capitalize">{d}</p>
            <div className="space-y-2">
              {day.map((l) => (
                <div key={l.id} className="flex items-center gap-3 p-3 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-100">
                  <Sparkles className="h-4 w-4 text-amber-600" />
                  <div>
                    <p className="font-bold text-sm">{l.title}</p>
                    {l.teacher_name && <p className="text-xs text-stone-500">{l.teacher_name}</p>}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function LazyImg({ id, className }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let m = true;
    (async () => { try { const { data } = await api.get(`/media/${id}`); if (m) setSrc(data.data_base64); } catch (_) {} })();
    return () => { m = false; };
  }, [id]);
  if (!src) return <div className={`${className} bg-stone-200 flex items-center justify-center`}><ImageIcon className="h-5 w-5 text-stone-400" /></div>;
  return <img src={src} alt="" className={className} />;
}
