import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Calendar, Pencil, Trash2, MapPin } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { name: "", date: "", end_date: "", notes: "", category: "altro" };
const catColors = { festivita: "rose", chiusura: "stone", gita: "blue", festa: "amber", riunione: "purple", altro: "green" };

export default function Events() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => { try { const { data } = await api.get("/calendar-events"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); } };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const p = { ...form, end_date: form.end_date || null };
      if (editId) await api.patch(`/calendar-events/${editId}`, p);
      else await api.post("/calendar-events", p);
      toast.success("Salvato"); setOpen(false); setForm(empty); setEditId(null); await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const remove = async (id) => { if (!confirm("Eliminare?")) return; try { await api.delete(`/calendar-events/${id}`); await load(); } catch (e) { toast.error(apiErrorMessage(e)); } };

  // group by month
  const grouped = items.reduce((acc, e) => {
    const m = e.date.slice(0, 7);
    (acc[m] = acc[m] || []).push(e); return acc;
  }, {});
  const monthLabel = (m) => new Date(m + "-01").toLocaleDateString("it-IT", { month: "long", year: "numeric" });

  return (
    <div>
      <PageHeader title="Calendario eventi" subtitle={`${items.length} eventi`}
        right={
          <button onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2" data-testid="add-event-button">
            <Plus className="h-4 w-4" /> Nuovo evento
          </button>}
      />
      {items.length === 0 ? <EmptyState title="Nessun evento" /> :
        <div className="space-y-6">
          {Object.entries(grouped).map(([m, evts]) => (
            <div key={m}>
              <p className="text-xs uppercase tracking-wider font-bold text-stone-400 mb-3 capitalize">{monthLabel(m)}</p>
              <div className="space-y-2">
                {evts.map((e) => {
                  const d = new Date(e.date);
                  return (
                    <Card key={e.id} className="!p-4" data-testid={`event-card-${e.id}`}>
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col items-center justify-center shrink-0">
                          <span className="text-[10px] uppercase font-bold text-stone-500">{d.toLocaleDateString("it-IT", { month: "short" })}</span>
                          <span className="font-display text-2xl font-bold text-stone-900 leading-none">{d.getDate()}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-bold text-stone-900">{e.name}</p>
                            <Pill color={catColors[e.category]}>{e.category}</Pill>
                          </div>
                          {e.end_date && <p className="text-xs text-stone-500 mt-0.5">fino al {e.end_date}</p>}
                          {e.notes && <p className="text-xs text-stone-500 mt-0.5 line-clamp-2">{e.notes}</p>}
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => { setForm({ name: e.name, date: e.date, end_date: e.end_date || "", notes: e.notes || "", category: e.category }); setEditId(e.id); setOpen(true); }} className="h-10 w-10 rounded-xl bg-stone-100"><Pencil className="h-4 w-4 mx-auto" /></button>
                          <button onClick={() => remove(e.id)} className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4 mx-auto" /></button>
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

      {open && (
        <Modal title={editId ? "Modifica" : "Nuovo evento"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Nome"><Input value={form.name} onChange={(v) => setForm({ ...form, name: v })} required testid="event-name" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data"><Input type="date" value={form.date} onChange={(v) => setForm({ ...form, date: v })} required testid="event-date" /></Field>
              <Field label="Fine (opz.)"><Input type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} /></Field>
            </div>
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200">
                {["festivita","chiusura","gita","festa","riunione","altro"].map((c) => <option key={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Note"><textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200" /></Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="event-submit">Salva</button>
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
