import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Calendar } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { Card, EmptyState, Pill, SectionLabel } from "@/components/Primitives";

export default function ParentTimeline() {
  const [children, setChildren] = useState([]);
  const [active, setActive] = useState(null);
  const [items, setItems] = useState([]);

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
      const { data } = await api.get(`/parent/child/${active.id}/timeline`, { params: { days: 30 } });
      setItems(data);
    })();
  }, [active?.id]);

  if (!active) return <EmptyState title="Nessun bambino" />;

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">Timeline</h1>
      <p className="text-stone-500 text-sm mb-5">Ultimi 30 giorni</p>

      {children.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar -mx-1 px-1 mb-5">
          {children.map((c) => (
            <button key={c.id} onClick={() => setActive(c)}
              className={`shrink-0 h-11 px-5 rounded-2xl text-sm font-semibold border ${active?.id === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}>
              {c.first_name}
            </button>
          ))}
        </div>
      )}

      {items.length === 0 ? (
        <EmptyState title="Nessuna attività ancora" description="Quando le maestre registreranno le giornate le troverai qui." />
      ) : (
        <ol className="relative border-l-2 border-stone-200 ml-3 space-y-5">
          {items.map((a, idx) => (
            <motion.li
              key={a.id}
              initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
              className="ml-5"
            >
              <span className="absolute -left-[7px] mt-2 h-3 w-3 rounded-full bg-[#FF8C6B] ring-4 ring-[#FDFBF7]" />
              <Card className="!p-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-display font-bold text-stone-900 flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-stone-400" />
                    {new Date(a.date).toLocaleDateString("it-IT", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1">
                  {a.didattica && <Pill color={a.didattica === "Partecipato" ? "amber" : "stone"}>Didattica: {a.didattica}</Pill>}
                  {a.motoria && <Pill color={a.motoria === "Partecipato" ? "rose" : "stone"}>Motoria: {a.motoria}</Pill>}
                  {a.pranzo && <Pill color="green">{a.pranzo}</Pill>}
                  {a.merenda && <Pill color={a.merenda === "Si" ? "green" : "stone"}>Merenda: {a.merenda}</Pill>}
                  {a.riposo && <Pill color={a.riposo === "Si" ? "blue" : "stone"}>Riposo: {a.riposo}</Pill>}
                </div>
                {a.note && <p className="text-sm text-stone-600 mt-2 line-clamp-3">{a.note}</p>}
              </Card>
            </motion.li>
          ))}
        </ol>
      )}
    </div>
  );
}
