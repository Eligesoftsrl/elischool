import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Pencil, Trash2, CalendarRange, Check } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { label: "", start_date: "", end_date: "", is_active: false };

export default function StaffYears() {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => { try { const { data } = await api.get("/school-years"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); } };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.patch(`/school-years/${editId}`, form);
      else await api.post("/school-years", form);
      toast.success("Salvato"); setOpen(false); setForm(empty); setEditId(null); await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const activate = async (id) => { try { await api.post(`/school-years/${id}/activate`); toast.success("Anno attivato"); await load(); } catch (e) { toast.error(apiErrorMessage(e)); } };
  const remove = async (id) => { if (!confirm("Eliminare?")) return; try { await api.delete(`/school-years/${id}`); await load(); } catch (e) { toast.error(apiErrorMessage(e)); } };

  return (
    <div>
      <PageHeader title="Anni scolastici" subtitle={`${items.length} anni`}
        right={
          <button onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2" data-testid="add-year-button">
            <Plus className="h-4 w-4" /> Nuovo anno
          </button>}
      />
      {items.length === 0 ? <EmptyState title="Nessun anno scolastico" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((y) => (
            <Card key={y.id} className={y.is_active ? "ring-2 ring-[#FF8C6B] ring-offset-2" : ""}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center"><CalendarRange className="h-5 w-5 text-stone-600" /></div>
                <div>
                  <p className="font-display font-bold text-lg">{y.label}</p>
                  <p className="text-xs text-stone-500">{y.start_date} → {y.end_date}</p>
                </div>
              </div>
              {y.is_active && <Pill color="green" className="mt-3"><Check className="h-3 w-3" /> Attivo</Pill>}
              <div className="mt-4 grid grid-cols-3 gap-2">
                {!y.is_active && <button onClick={() => activate(y.id)} className="h-10 rounded-xl bg-[#FFF3EF] text-[#FF7A54] text-xs font-semibold" data-testid={`activate-year-${y.id}`}>Attiva</button>}
                <button onClick={() => { setForm({ label: y.label, start_date: y.start_date, end_date: y.end_date, is_active: y.is_active }); setEditId(y.id); setOpen(true); }} className="h-10 rounded-xl bg-stone-100 text-xs font-semibold flex items-center justify-center"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => remove(y.id)} className="h-10 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center justify-center"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            </Card>
          ))}
        </div>
      }
      {open && (
        <Modal title={editId ? "Modifica" : "Nuovo anno"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Etichetta (es: 2026/2027)"><Input value={form.label} onChange={(v) => setForm({ ...form, label: v })} required testid="year-label" /></Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Inizio"><Input type="date" value={form.start_date} onChange={(v) => setForm({ ...form, start_date: v })} required testid="year-start" /></Field>
              <Field label="Fine"><Input type="date" value={form.end_date} onChange={(v) => setForm({ ...form, end_date: v })} required testid="year-end" /></Field>
            </div>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm({ ...form, is_active: e.target.checked })} />
              <span className="text-sm text-stone-700">Imposta come anno attivo</span>
            </label>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="year-submit">Salva</button>
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
