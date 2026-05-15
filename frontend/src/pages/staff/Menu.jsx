import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Utensils, Pencil, Trash2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState } from "@/components/Primitives";

const DAYS = ["lunedì", "martedì", "mercoledì", "giovedì", "venerdì"];
const emptyDay = { primo: "", secondo: "", contorno: "", frutta: "" };
const empty = () => ({ week_label: "Settimana", valid_from: "", valid_to: "", days: DAYS.map((g) => ({ giorno: g, ...emptyDay })) });

export default function StaffMenu() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty());

  const load = async () => { try { const { data } = await api.get("/menus"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); } };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.patch(`/menus/${editId}`, form);
      else await api.post("/menus", form);
      toast.success("Salvato"); setOpen(false); setForm(empty()); setEditId(null); await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const remove = async (id) => {
    if (!confirm("Eliminare?")) return;
    try { await api.delete(`/menus/${id}`); await load(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div>
      <PageHeader
        title="Menu della settimana"
        subtitle={`${items.length} menu salvati`}
        right={
          <button onClick={() => { setForm(empty()); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2" data-testid="add-menu-button">
            <Plus className="h-4 w-4" /> Nuovo menu
          </button>
        }
      />

      {items.length === 0 ? <EmptyState title="Nessun menu" /> :
        <div className="space-y-4">
          {items.map((m) => (
            <Card key={m.id} data-testid={`menu-card-${m.id}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-50 flex items-center justify-center"><Utensils className="h-5 w-5 text-emerald-600" /></div>
                  <div>
                    <p className="font-display text-lg font-bold">{m.week_label}</p>
                    <p className="text-xs text-stone-500">Dal {m.valid_from} al {m.valid_to}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => { setForm({ week_label: m.week_label, valid_from: m.valid_from, valid_to: m.valid_to, days: m.days }); setEditId(m.id); setOpen(true); }} className="h-10 w-10 rounded-xl bg-stone-100"><Pencil className="h-4 w-4 mx-auto" /></button>
                  <button onClick={() => remove(m.id)} className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4 mx-auto" /></button>
                </div>
              </div>
              <div className="grid sm:grid-cols-5 gap-2">
                {m.days.map((d, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-stone-50 border border-stone-100">
                    <p className="text-xs font-bold uppercase tracking-wider text-stone-500">{d.giorno}</p>
                    <p className="text-xs mt-1"><b>1°</b> {d.primo}</p>
                    <p className="text-xs"><b>2°</b> {d.secondo}</p>
                    <p className="text-xs"><b>C</b> {d.contorno}</p>
                    <p className="text-xs"><b>F</b> {d.frutta}</p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal title={editId ? "Modifica menu" : "Nuovo menu"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Etichetta"><Input value={form.week_label} onChange={(v) => setForm({ ...form, week_label: v })} required /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dal"><Input type="date" value={form.valid_from} onChange={(v) => setForm({ ...form, valid_from: v })} required /></Field>
              <Field label="Al"><Input type="date" value={form.valid_to} onChange={(v) => setForm({ ...form, valid_to: v })} required /></Field>
            </div>
            {form.days.map((d, i) => (
              <div key={i} className="p-3 rounded-2xl bg-stone-50 border border-stone-200">
                <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">{d.giorno}</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input value={d.primo} placeholder="Primo" onChange={(v) => { const ds = [...form.days]; ds[i] = { ...ds[i], primo: v }; setForm({ ...form, days: ds }); }} />
                  <Input value={d.secondo} placeholder="Secondo" onChange={(v) => { const ds = [...form.days]; ds[i] = { ...ds[i], secondo: v }; setForm({ ...form, days: ds }); }} />
                  <Input value={d.contorno} placeholder="Contorno" onChange={(v) => { const ds = [...form.days]; ds[i] = { ...ds[i], contorno: v }; setForm({ ...form, days: ds }); }} />
                  <Input value={d.frutta} placeholder="Frutta" onChange={(v) => { const ds = [...form.days]; ds[i] = { ...ds[i], frutta: v }; setForm({ ...form, days: ds }); }} />
                </div>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold">Salva</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-stone-900/40 p-0 md:p-6">
      <div className="bg-white w-full md:max-w-xl rounded-t-[2rem] md:rounded-[2rem] p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4"><h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center"><X className="h-4 w-4" /></button>
        </div>{children}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><div className="mt-1">{children}</div></label>; }
function Input({ value, onChange, type = "text", required, placeholder }) {
  return <input type={type} required={required} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)}
    className="w-full h-11 px-4 rounded-xl bg-white border border-stone-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand/30" />;
}
