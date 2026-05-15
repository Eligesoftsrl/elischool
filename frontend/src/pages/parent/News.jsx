import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { Card, EmptyState, Pill } from "@/components/Primitives";

export default function ParentNews() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    (async () => {
      try { const { data } = await api.get("/news"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); }
    })();
  }, []);
  const catColor = { generale: "stone", evento: "amber", avviso: "rose" };

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">News</h1>
      <p className="text-stone-500 text-sm mb-5">Le novità dalla scuola</p>
      {items.length === 0 ? <EmptyState title="Nessuna news" /> : (
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} className="!p-5">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0"><Megaphone className="h-4 w-4 text-amber-600" /></div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-display font-bold">{n.title}</p>
                    <Pill color={catColor[n.category] || "stone"}>{n.category}</Pill>
                  </div>
                  <p className="text-sm text-stone-600 mt-1 whitespace-pre-line">{n.body}</p>
                  <p className="text-xs text-stone-400 mt-2">{new Date(n.publish_date).toLocaleDateString("it-IT", { day: "numeric", month: "long" })}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
