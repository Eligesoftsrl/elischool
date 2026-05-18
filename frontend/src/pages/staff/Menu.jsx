import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, X, Utensils, Pencil, Trash2, Save, Sparkles, CalendarDays } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const DAYS = ["Lunedi", "Martedi", "Mercoledi", "Giovedi", "Venerdi"];
const emptyMenu = { name: "", valid_from: "", valid_to: "", notes: "" };

export default function StaffMenu() {
  const { activeYear } = useOutletContext();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(emptyMenu);

  const [editorOpen, setEditorOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState(null);
  const [meals, setMeals] = useState([]);
  const [week, setWeek] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try { const { data } = await api.get("/menus"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, school_year_id: activeYear?.id };
      if (editId) await api.patch(`/menus/${editId}`, payload);
      else await api.post("/menus", payload);
      toast.success("Salvato"); setOpen(false); setForm(emptyMenu); setEditId(null); await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare il menu? Tutte le righe verranno eliminate.")) return;
    try { await api.delete(`/menus/${id}`); await load(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const openEditor = async (m) => {
    setActiveMenu(m);
    setWeek(1);
    try {
      const { data } = await api.get(`/menus/${m.id}/meals`);
      setMeals(data);
      setEditorOpen(true);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const updateMeal = (w, d, field, value) => {
    setMeals(meals.map((m) =>
      m.week === w && m.day === d ? { ...m, [field]: value } : m
    ));
  };

  const saveMeals = async () => {
    if (!activeMenu) return;
    setSaving(true);
    try {
      await api.put(`/menus/${activeMenu.id}/meals`, { meals });
      toast.success("Menu salvato");
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setSaving(false); }
  };

  const mealsOfWeek = (w) => DAYS.map((d) => meals.find((m) => m.week === w && m.day === d) || { week: w, day: d, primo: "", secondo: "", contorno: "", frutta: "" });

  return (
    <div>
      <PageHeader title="Menu" subtitle="Rotante su 4 settimane (lun-ven)"
        right={
          <button onClick={() => { setForm(emptyMenu); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2" data-testid="add-menu-button">
            <Plus className="h-4 w-4" /> Nuovo menu
          </button>}
      />

      {items.length === 0 ? <EmptyState title="Nessun menu" description="Crea un menu rotante per l'anno scolastico." /> :
        <div className="space-y-3">
          {items.map((m) => (
            <Card key={m.id} data-testid={`menu-card-${m.id}`}>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center"><Utensils className="h-5 w-5 text-emerald-600" /></div>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-bold truncate">{m.name}</p>
                    <p className="text-xs text-stone-500">Dal {m.valid_from} al {m.valid_to}</p>
                  </div>
                </div>
                <Pill color="brand"><Sparkles className="h-3 w-3" /> 4 sett. × 5 giorni</Pill>
              </div>
              {m.notes && <p className="text-xs text-stone-500 mt-2 italic">{m.notes}</p>}
              <div className="mt-4 grid grid-cols-3 gap-2">
                <button onClick={() => openEditor(m)} className="h-10 rounded-xl bg-[#FFF3EF] text-[#FF7A54] text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`open-menu-editor-${m.id}`}>
                  <CalendarDays className="h-3.5 w-3.5" /> Compila settimane
                </button>
                <button onClick={() => { setForm({ name: m.name, valid_from: m.valid_from, valid_to: m.valid_to, notes: m.notes || "" }); setEditId(m.id); setOpen(true); }} className="h-10 rounded-xl bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5"><Pencil className="h-3.5 w-3.5" /> Modifica</button>
                <button onClick={() => remove(m.id)} className="h-10 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal title={editId ? "Modifica menu" : "Nuovo menu"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Nome (es: Menu 2025/2026)"><Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="menu-name" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Valido dal"><Input type="date" value={form.valid_from} onChange={(v) => setForm({ ...form, valid_from: v })} required testid="menu-from" /></Field>
              <Field label="Valido al"><Input type="date" value={form.valid_to} onChange={(v) => setForm({ ...form, valid_to: v })} required testid="menu-to" /></Field>
            </div>
            <Field label="Note">
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="menu-submit">Salva</button>
            </div>
          </form>
        </Modal>
      )}

      {editorOpen && activeMenu && (
        <div className="fixed inset-0 z-50 bg-stone-900/40">
          <div className="absolute inset-0 md:inset-4 md:mx-auto md:max-w-5xl bg-white md:rounded-[2rem] overflow-y-auto">
            <div className="sticky top-0 bg-white px-5 py-4 border-b border-stone-100 flex items-center justify-between z-10">
              <div>
                <p className="text-xs uppercase tracking-wider font-bold text-stone-400">Compila menu</p>
                <p className="font-display text-lg font-bold">{activeMenu.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={saveMeals} disabled={saving}
                  className="h-11 px-4 rounded-2xl bg-[#FF8C6B] text-white text-sm font-semibold flex items-center gap-2"
                  data-testid="save-meals-button">
                  <Save className="h-4 w-4" /> {saving ? "Salvataggio..." : "Salva"}
                </button>
                <button onClick={() => setEditorOpen(false)} className="h-11 w-11 rounded-2xl bg-stone-100 flex items-center justify-center"><X className="h-5 w-5" /></button>
              </div>
            </div>

            <div className="px-5 py-3 flex gap-2 border-b border-stone-100">
              {[1, 2, 3, 4].map((w) => (
                <button key={w} onClick={() => setWeek(w)}
                  className={`h-11 px-5 rounded-2xl text-sm font-semibold ${week === w ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-700"}`}
                  data-testid={`week-${w}`}>
                  Settimana {w}
                </button>
              ))}
            </div>

            <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {mealsOfWeek(week).map((m) => (
                <div key={m.day} className="rounded-3xl border border-stone-200 p-4 bg-stone-50">
                  <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">{m.day}</p>
                  <div className="space-y-2">
                    <SmallInput label="1° piatto" value={m.primo} onChange={(v) => updateMeal(week, m.day, "primo", v)} testid={`meal-${week}-${m.day}-primo`} />
                    <SmallInput label="2° piatto" value={m.secondo} onChange={(v) => updateMeal(week, m.day, "secondo", v)} testid={`meal-${week}-${m.day}-secondo`} />
                    <SmallInput label="Contorno" value={m.contorno} onChange={(v) => updateMeal(week, m.day, "contorno", v)} testid={`meal-${week}-${m.day}-contorno`} />
                    <SmallInput label="Frutta" value={m.frutta} onChange={(v) => updateMeal(week, m.day, "frutta", v)} testid={`meal-${week}-${m.day}-frutta`} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-stone-900/40 p-0 md:p-6">
      <div className="bg-white w-full md:max-w-lg rounded-t-[2rem] md:rounded-[2rem] p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>{children}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><div className="mt-1">{children}</div></label>; }
function Input({ value, onChange, type = "text", required, testid }) {
  return <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
function SmallInput({ label, value, onChange, testid }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wider font-bold text-stone-400">{label}</p>
      <input value={value || ""} onChange={(e) => onChange(e.target.value)}
        className="w-full h-10 px-3 rounded-xl bg-white border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30"
        data-testid={testid} />
    </div>
  );
}
