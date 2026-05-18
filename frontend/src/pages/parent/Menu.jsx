import { useEffect, useState } from "react";
import { Utensils, Sparkles, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { Card, EmptyState, Pill } from "@/components/Primitives";

const DAYS_ORDER = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi"];

export default function ParentMenuPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try { const r = await api.get("/menus/current"); setData(r.data); }
      catch (e) { toast.error(apiErrorMessage(e)); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return null;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">Menu</h1>
      <p className="text-stone-500 text-sm mb-5">Quello che si mangia oggi e in settimana</p>

      {!data?.menu ? <EmptyState title="Menu non disponibile" description="Il menu non è ancora pubblicato dalla direzione." /> : (
        <div className="space-y-3">
          <Card className="!p-5 bg-gradient-to-br from-emerald-50 to-amber-50 border-emerald-100">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-white/80 flex items-center justify-center"><Utensils className="h-5 w-5 text-emerald-600" /></div>
              <div className="flex-1">
                <p className="font-display font-bold text-stone-900">{data.menu.name}</p>
                <p className="text-xs text-stone-500">Dal {data.menu.valid_from} al {data.menu.valid_to}</p>
              </div>
              <Pill color="green"><Sparkles className="h-3 w-3" /> Settimana {data.current_week}</Pill>
            </div>
            {data.menu.notes && <p className="text-xs text-stone-600 mt-3 italic">{data.menu.notes}</p>}
          </Card>

          {data.meals.length === 0 ? <EmptyState title="Nessun pasto inserito" /> :
            data.meals.map((m) => (
              <Card key={`${m.week}-${m.day}`} className="!p-5">
                <div className="flex items-center gap-3 mb-3">
                  <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center"><CalendarDays className="h-4 w-4 text-amber-600" /></div>
                  <p className="font-display font-bold text-stone-900">{m.day}</p>
                </div>
                <div className="grid grid-cols-1 gap-y-1 text-sm">
                  <Line label="1° piatto" value={m.primo} />
                  <Line label="2° piatto" value={m.secondo} />
                  <Line label="Contorno" value={m.contorno} />
                  <Line label="Frutta" value={m.frutta} />
                </div>
              </Card>
            ))
          }
        </div>
      )}
    </div>
  );
}

function Line({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex items-baseline gap-3 py-1 border-b border-stone-100 last:border-0">
      <span className="text-xs uppercase tracking-wider font-bold text-stone-400 shrink-0 w-20">{label}</span>
      <span className="text-stone-800">{value}</span>
    </div>
  );
}
