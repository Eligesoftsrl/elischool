import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Cake, Gift, Calendar } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

export default function Birthdays() {
  const [items, setItems] = useState([]);
  const [range, setRange] = useState(30);

  const load = async (d) => {
    try { const { data } = await api.get("/birthdays", { params: { days: d } }); setItems(data); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(range); }, [range]);

  // group by month
  const grouped = items.reduce((acc, b) => {
    const m = b.next_birthday.slice(0, 7);
    (acc[m] = acc[m] || []).push(b);
    return acc;
  }, {});
  const monthLabel = (m) => new Date(m + "-01").toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div>
      <PageHeader title="Compleanni" subtitle={`${items.length} compleanni nei prossimi ${range} giorni`} />

      <div className="flex gap-2 mb-5">
        {[7, 30, 90, 365].map((d) => (
          <button key={d} onClick={() => setRange(d)}
            className={`h-11 px-4 rounded-2xl text-sm font-semibold ${range === d ? "bg-stone-900 text-white" : "bg-white border border-stone-200 text-stone-700"}`}
            data-testid={`birthday-range-${d}`}>
            {d === 7 ? "Settimana" : d === 30 ? "Mese" : d === 90 ? "3 mesi" : "Anno"}
          </button>
        ))}
      </div>

      {items.length === 0 ? <EmptyState title="Nessun compleanno" /> :
        <div className="space-y-6">
          {Object.entries(grouped).map(([m, list]) => (
            <div key={m}>
              <p className="text-xs uppercase tracking-wider font-bold text-stone-400 mb-3 capitalize">{monthLabel(m)}</p>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {list.map((b) => {
                  const d = new Date(b.next_birthday);
                  const today = b.days_until === 0;
                  return (
                    <Card key={b.id} className={`!p-4 ${today ? "bg-gradient-to-br from-amber-50 via-rose-50 to-violet-50 border-amber-200" : ""}`}
                      data-testid={`birthday-card-${b.id}`}>
                      <div className="flex items-center gap-3">
                        <div className={`h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0 ${today ? "bg-white/80" : "bg-stone-50 border border-stone-200"}`}>
                          <span className="text-[10px] uppercase font-bold text-stone-500">{d.toLocaleDateString("it-IT", { month: "short" })}</span>
                          <span className="font-display text-2xl font-bold text-stone-900 leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-display font-bold text-stone-900 truncate">{b.first_name} {b.last_name}</p>
                            {today ? <Pill color="rose"><Cake className="h-3 w-3" /> Oggi!</Pill> :
                              b.days_until === 1 ? <Pill color="amber">Domani</Pill> :
                                <Pill color="stone">{b.days_until} gg</Pill>}
                          </div>
                          <p className="text-xs text-stone-500 flex items-center gap-1 mt-0.5"><Gift className="h-3 w-3" /> compirà {b.age_turning} anni</p>
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
