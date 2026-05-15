import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { Camera, Image as ImageIcon, Plus, X, Trash2 } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState } from "@/components/Primitives";

export default function Gallery() {
  const [items, setItems] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [classId, setClassId] = useState("");
  const [viewer, setViewer] = useState(null);
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const load = async () => {
    try {
      const q = {};
      if (classId) q.classroom_id = classId;
      const [m, c] = await Promise.all([api.get("/media", { params: q }), classrooms.length ? Promise.resolve({ data: classrooms }) : api.get("/classrooms")]);
      setItems(m.data);
      if (!classrooms.length) setClassrooms(c.data);
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [classId]);

  const onPick = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const f of files) {
        if (f.size > 4 * 1024 * 1024) { toast.error(`${f.name}: max 4MB`); continue; }
        const dataUrl = await new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = rej; r.readAsDataURL(f); });
        await api.post("/media", { filename: f.name, content_type: f.type, data_base64: dataUrl, classroom_id: classId || null });
      }
      toast.success("Foto caricate");
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare la foto?")) return;
    try { await api.delete(`/media/${id}`); await load(); } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div>
      <PageHeader title="Galleria" subtitle={`${items.length} foto`}
        right={
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] text-white font-semibold text-sm flex items-center gap-2"
            data-testid="add-photo-button">
            <Camera className="h-4 w-4" /> {uploading ? "Caricamento…" : "Aggiungi foto"}
          </button>}
      />
      <input ref={fileRef} type="file" accept="image/*" multiple onChange={onPick} className="hidden" />

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1">
        <button onClick={() => setClassId("")}
          className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${!classId ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}>
          Tutte
        </button>
        {classrooms.map((c) => (
          <button key={c.id} onClick={() => setClassId(c.id)}
            className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${classId === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}>
            {c.name}
          </button>
        ))}
      </div>

      {items.length === 0 ? <EmptyState title="Nessuna foto" description="Carica foto delle attività dei bambini." /> :
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {items.map((m) => (
            <button key={m.id} onClick={() => setViewer(m)} className="aspect-square rounded-2xl bg-stone-100 overflow-hidden tap-press" data-testid={`media-thumb-${m.id}`}>
              <LazyImg id={m.id} alt={m.filename} />
            </button>
          ))}
        </div>
      }

      {viewer && (
        <div className="fixed inset-0 z-50 bg-stone-900/90 flex items-center justify-center p-5" onClick={() => setViewer(null)}>
          <button onClick={(e) => { e.stopPropagation(); remove(viewer.id); setViewer(null); }} className="absolute top-5 left-5 h-11 px-4 rounded-2xl bg-rose-600 text-white text-sm font-semibold flex items-center gap-2">
            <Trash2 className="h-4 w-4" /> Elimina
          </button>
          <button onClick={() => setViewer(null)} className="absolute top-5 right-5 h-11 w-11 rounded-2xl bg-white/10 text-white flex items-center justify-center"><X className="h-5 w-5" /></button>
          <LazyImg id={viewer.id} alt={viewer.filename} className="max-h-[90vh] max-w-full rounded-2xl" />
        </div>
      )}
    </div>
  );
}

function LazyImg({ id, alt, className = "w-full h-full object-cover" }) {
  const [src, setSrc] = useState(null);
  useEffect(() => {
    let m = true;
    (async () => { try { const { data } = await api.get(`/media/${id}`); if (m) setSrc(data.data_base64); } catch (_) {} })();
    return () => { m = false; };
  }, [id]);
  if (!src) return <div className={`${className} bg-stone-200 flex items-center justify-center`}><ImageIcon className="h-6 w-6 text-stone-400" /></div>;
  return <img src={src} alt={alt} className={className} />;
}
