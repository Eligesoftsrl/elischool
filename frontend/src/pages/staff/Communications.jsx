import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Plus, X, Megaphone, Pencil, Trash2, Camera, Image as ImageIcon } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { title: "", body: "", type: "comunicazione_classe", classroom_id: null, media_ids: [] };

export default function Communications() {
  const [items, setItems] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [uploading, setUploading] = useState(false);
  const [newMedia, setNewMedia] = useState([]); // media just uploaded for the form
  const fileRef = useRef(null);

  const load = async () => {
    try {
      const [n, c] = await Promise.all([api.get("/communications"), api.get("/classrooms")]);
      setItems(n.data); setClassrooms(c.data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const onPickFile = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const uploaded = [];
      for (const f of files) {
        if (f.size > 4 * 1024 * 1024) { toast.error(`${f.name}: max 4MB`); continue; }
        const dataUrl = await new Promise((res, rej) => {
          const r = new FileReader();
          r.onload = () => res(r.result);
          r.onerror = rej;
          r.readAsDataURL(f);
        });
        const { data } = await api.post("/media", {
          filename: f.name, content_type: f.type, data_base64: dataUrl, classroom_id: form.classroom_id,
        });
        uploaded.push(data);
      }
      setNewMedia([...newMedia, ...uploaded]);
      setForm({ ...form, media_ids: [...form.media_ids, ...uploaded.map((m) => m.id)] });
      toast.success(`${uploaded.length} foto caricate`);
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) await api.patch(`/communications/${editId}`, form);
      else await api.post("/communications", form);
      toast.success("Salvato"); setOpen(false); setForm(empty); setEditId(null); setNewMedia([]); await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare la comunicazione?")) return;
    try { await api.delete(`/communications/${id}`); await load(); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const typeColor = { comunicazione_classe: "blue", evento_attivita: "amber", avviso: "rose" };
  const typeLabel = { comunicazione_classe: "Classe", evento_attivita: "Evento", avviso: "Avviso" };

  return (
    <div>
      <PageHeader title="Comunicazioni" subtitle={`${items.length} comunicazioni alle famiglie`}
        right={
          <button onClick={() => { setForm(empty); setEditId(null); setNewMedia([]); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2" data-testid="add-comm-button">
            <Plus className="h-4 w-4" /> Nuova comunicazione
          </button>}
      />
      {items.length === 0 ? <EmptyState title="Nessuna comunicazione" /> :
        <div className="space-y-3">
          {items.map((n) => (
            <Card key={n.id} data-testid={`comm-card-${n.id}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex gap-3 items-start min-w-0">
                  <div className="h-11 w-11 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0"><Megaphone className="h-5 w-5 text-amber-600" /></div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-display font-bold text-stone-900">{n.title}</h3>
                      <Pill color={typeColor[n.type] || "stone"}>{typeLabel[n.type]}</Pill>
                      {n.classroom_id && <Pill color="brand">{classrooms.find((c) => c.id === n.classroom_id)?.name || "classe"}</Pill>}
                    </div>
                    <div className="text-sm text-stone-600 mt-1 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: n.body }} />
                    {n.media?.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto hide-scrollbar">
                        {n.media.map((m) => (
                          <MediaThumb key={m.id} mediaId={m.id} filename={m.filename} />
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-stone-400 mt-2">{new Date(n.publish_date).toLocaleString("it-IT")}</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setForm({ title: n.title, body: n.body, type: n.type, classroom_id: n.classroom_id, media_ids: n.media_ids || [] }); setEditId(n.id); setNewMedia(n.media || []); setOpen(true); }} className="h-10 w-10 rounded-xl bg-stone-100"><Pencil className="h-4 w-4 mx-auto" /></button>
                  <button onClick={() => remove(n.id)} className="h-10 w-10 rounded-xl bg-rose-50 text-rose-700"><Trash2 className="h-4 w-4 mx-auto" /></button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal title={editId ? "Modifica" : "Nuova comunicazione"} onClose={() => setOpen(false)}>
          <form onSubmit={submit} className="space-y-3">
            <Field label="Titolo"><Input value={form.title} onChange={(v) => setForm({ ...form, title: v })} required testid="comm-title" /></Field>
            <Field label="Tipologia">
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200">
                <option value="comunicazione_classe">Comunicazione di Classe</option>
                <option value="evento_attivita">Evento o Attività</option>
                <option value="avviso">Avviso</option>
              </select>
            </Field>
            <Field label="Sezione (vuoto = tutta la scuola)">
              <select value={form.classroom_id || ""} onChange={(e) => setForm({ ...form, classroom_id: e.target.value || null })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200">
                <option value="">Tutta la scuola</option>
                {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Testo (HTML ammesso)">
              <textarea rows={6} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} required
                className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 font-mono text-sm" data-testid="comm-body" />
            </Field>
            <Field label="Foto (max 4MB ciascuna)">
              <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPickFile} className="hidden" />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                className="w-full h-14 rounded-2xl border-2 border-dashed border-stone-300 hover:border-brand bg-stone-50 flex items-center justify-center gap-2 text-stone-600 font-semibold"
                data-testid="comm-upload-button">
                <Camera className="h-5 w-5" /> {uploading ? "Caricamento…" : "Aggiungi foto"}
              </button>
              {newMedia.length > 0 && (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {newMedia.map((m) => (
                    <div key={m.id} className="aspect-square rounded-2xl bg-stone-100 overflow-hidden">
                      <MediaThumb mediaId={m.id} filename={m.filename} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </Field>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] text-white font-semibold" data-testid="comm-submit">Pubblica</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function MediaThumb({ mediaId, filename, className = "h-20 w-20 rounded-xl object-cover" }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    (async () => {
      try { const { data } = await api.get(`/media/${mediaId}`); setSrc(data.data_base64); } catch (_) {}
    })();
  }, [mediaId]);
  if (!src) return <div className={`${className} bg-stone-200 flex items-center justify-center`}><ImageIcon className="h-5 w-5 text-stone-400" /></div>;
  return <img src={src} alt={filename} className={className} />;
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
function Input({ value, onChange, required, testid }) {
  return <input value={value} required={required} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
