import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, Megaphone, Pencil, Trash2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { title: "", body: "", category: "generale", classroom_id: null };

export default function StaffNews() {
  const [items, setItems] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);

  const load = async () => {
    try {
      const [n, c] = await Promise.all([api.get("/news"), api.get("/classrooms")]);
      setItems(n.data); setClassrooms(c.data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.patch(`/news/${editId}`, form);
      else await api.post("/news", form);
      toast.success("Salvato"); setOpen(false); setForm(empty); setEditId(null); await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const remove = async (id) => {
    if (!confirm("Eliminare?")) return;
    try { await api.delete(`/news/${id}`); await load(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  const catColor = { generale: "stone", evento: "amber", avviso: "rose" };

  return (
    <div>
      <PageHeader title="News e avvisi" subtitle={`${items.length} comunicazioni`}
        right={
          <button onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2" data-testid="add-news-button">
            <Plus className="h-4 w-4" /> Nuova news
          </button>}
      />
      {items.length === 0 ? <EmptyState title="Nessuna news" /> :
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} data-testid={`news-card-${n.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 items-start min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0"><Megaphone className="h-5 w-5 text-amber-600" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-stone-900">{n.title}</h3>
                      <Pill color={catColor[n.category] || "stone"}>{n.category}</Pill>
                      {n.classroom_id && <Pill color="brand">{classrooms.find((c) => c.id === n.classroom_id)?.name || "classe"}</Pill>}
                    </div>
                    <p className="text-sm text-stone-600 mt-1 whitespace-pre-line">{n.body}</p>
                    <p className="text-xs text-stone-400 mt-1">{new Date(n.publish_date).toLocaleString("it-IT")}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setForm({ title: n.title, body: n.body, category: n.category, classroom_id: n.classroom_id }); setEditId(n.id); setOpen(true); }} className="h-10 w-10 rounded-xl bg-stone-100"><Pencil className="h-4 w-4 mx-auto" /></button>
                  <button onClick={() => remove(n.id)} className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4 mx-auto" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal title={editId ? "Modifica" : "Nuova news"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Titolo"><Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} required testid="news-title" /></Field>
            <Field label="Categoria">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200">
                <option value="generale">Generale</option>
                <option value="evento">Evento</option>
                <option value="avviso">Avviso</option>
              </select>
            </Field>
            <Field label="Sezione (opzionale)">
              <select value={form.classroom_id || ""} onChange={(e) => setForm({ ...form, classroom_id: e.target.value || null })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200">
                <option value="">Tutta la scuola</option>
                {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Testo">
              <textarea rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required
                className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200" data-testid="news-body" />
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="news-submit">Salva</button>
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
function Input({ value, onChange, required, testid }) {
  return <input value={value} required={required} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
