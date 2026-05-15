import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Calendar as CalIcon } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { Card, EmptyState, Pill } from "@/components/Primitives";

const catColors = { festivita: "rose", chiusura: "stone", gita: "blue", festa: "amber", riunione: "purple", altro: "green" };

export default function ParentCalendar() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => { try { const { data } = await api.get("/calendar-events"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); } })();
  }, []);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = items.filter((e) => e.date >= today);
  const grouped = upcoming.reduce((acc, e) => { const m = e.date.slice(0, 7); (acc[m] = acc[m] || []).push(e); return acc; }, {});
  const monthLabel = (m) => new Date(m + "-01").toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">Calendario</h1>
      <p className="text-stone-500 text-sm mb-5">Festività, gite ed eventi</p>

      {upcoming.length === 0 ? <EmptyState title="Nessun evento in programma" /> :
        <div className="space-y-6">
          {Object.entries(grouped).map(([m, evts]) => (
            <div key={m}>
              <p className="text-xs uppercase tracking-wider font-bold text-stone-400 mb-3 capitalize">{monthLabel(m)}</p>
              <div className="space-y-2">
                {evts.map((e) => {
                  const d = new Date(e.date);
                  return (
                    <Card key={e.id} className="!p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-amber-50 to-rose-50 border border-amber-100 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] uppercase font-bold text-stone-500">{d.toLocaleDateString("it-IT", { month: "short" })}</span>
                          <span className="font-display text-2xl font-bold text-stone-900 leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-stone-900">{e.name}</p>
                            <Pill color={catColors[e.category]}>{e.category}</Pill>
                          </div>
                          {e.end_date && <p className="text-xs text-stone-500">fino al {e.end_date}</p>}
                          {e.notes && <p className="text-xs text-stone-500">{e.notes}</p>}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      }
    </div>
  );
}
