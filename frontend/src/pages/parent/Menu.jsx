import { useEffect, useState } from "react";
import { Utensils } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";
import { Card, EmptyState, SectionLabel } from "@/components/Primitives";

export default function ParentMenuPage() {
  const [menu, setMenu] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get("/menus/current");
        setMenu(data);
      } catch (e) { toast.error(apiErrorMessage(e)); }
    })();
  }, []);

  return (
    <div>
      <h1 className="font-display text-3xl font-bold mb-1">Menu</h1>
      <p className="text-stone-500 text-sm mb-5">Il pasto della settimana</p>

      {!menu ? <EmptyState title="Menu non disponibile" description="Il menu della settimana corrente non è ancora pubblicato." /> : (
        <div className="space-y-3">
          <Card className="!p-4 flex items-center gap-3">
            <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center"><Utensils className="h-5 w-5 text-emerald-600" /></div>
            <div>
              <p className="font-display font-bold">{menu.week_label}</p>
              <p className="text-xs text-stone-500">Dal {menu.valid_from} al {menu.valid_to}</p>
            </div>
          </Card>
          {menu.days.map((d, i) => (
            <Card key={i} className="!p-5">
              <p className="font-display font-bold text-stone-900 capitalize">{d.giorno}</p>
              <div className="grid grid-cols-2 mt-2 gap-y-1 text-sm">
                <p className="text-stone-500">1° piatto</p><p className="text-stone-800">{d.primo || "—"}</p>
                <p className="text-stone-500">2° piatto</p><p className="text-stone-800">{d.secondo || "—"}</p>
                <p className="text-stone-500">Contorno</p><p className="text-stone-800">{d.contorno || "—"}</p>
                <p className="text-stone-500">Frutta</p><p className="text-stone-800">{d.frutta || "—"}</p>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
