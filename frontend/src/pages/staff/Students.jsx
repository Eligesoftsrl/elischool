import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, X, GraduationCap, ArrowRightLeft, Cake } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { first_name: "", last_name: "", birth_date: "", fiscal_code: "", residence: "", allergies: "", notes: "" };

export default function StaffStudents() {
  const { activeYear } = useOutletContext();
  const [students, setStudents] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [transferOpen, setTransferOpen] = useState(null);

  const load = async () => {
    try {
      const params = activeYear ? { school_year_id: activeYear.id } : {};
      if (q) params.q = q;
      const { data } = await api.get("/students", { params });
      setStudents(data);
      if (classrooms.length === 0 && activeYear) {
        const { data: cs } = await api.get("/classrooms", { params: { school_year_id: activeYear.id } });
        setClassrooms(cs);
      }
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  useEffect(() => { if (activeYear) load(); /* eslint-disable-next-line */ }, [activeYear, q]);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.patch(`/students/${editId}`, form);
        toast.success("Alunno aggiornato");
      } else {
        await api.post("/students", form);
        toast.success("Alunno creato");
      }
      setOpen(false); setForm(empty); setEditId(null);
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare l'alunno?")) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success("Eliminato");
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const getClassroomName = (s) => {
    const cid = s.enrollment?.classroom_id;
    const c = classrooms.find((x) => x.id === cid);
    return c?.name;
  };

  const onTransfer = async (sid, toClassroomId) => {
    try {
      await api.post("/enrollments/transfer", {
        student_id: sid, to_classroom_id: toClassroomId, school_year_id: activeYear.id,
      });
      toast.success("Alunno spostato");
      setTransferOpen(null);
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  return (
    <div>
      <PageHeader
        title="Alunni"
        subtitle={`${students.length} bambini`}
        right={
          <button
            onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 tap-press"
            data-testid="add-student-button"
          >
            <Plus className="h-4 w-4" /> Nuovo alunno
          </button>
        }
      />

      <div className="mb-5 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nome o cognome…"
          className="w-full pl-12 pr-4 h-14 rounded-2xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
          data-testid="search-student-input"
        />
      </div>

      {students.length === 0 ? (
        <EmptyState
          title="Nessun alunno"
          description="Aggiungi il primo alunno per iniziare."
          imageUrl="https://static.prod-images.emergentagent.com/jobs/96ad60f7-372f-4730-9be4-769e965e5107/images/ff88168c79f5a887e58508be26ea3e4f7ae859628398e0d781e9ee508232af3c.png"
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {students.map((s) => {
            const cName = getClassroomName(s);
            return (
              <Card key={s.id} className="hover:shadow-md transition-all" data-testid={`student-card-${s.id}`}>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center">
                      <GraduationCap className="h-5 w-5 text-stone-600" />
                    </div>
                    <div>
                      <p className="font-display font-bold text-stone-900">{s.first_name} {s.last_name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {cName ? <Pill color="brand">{cName}</Pill> : <Pill>Non assegnato</Pill>}
                        {s.birth_date && (
                          <Pill color="stone"><Cake className="h-3 w-3" /> {s.birth_date}</Pill>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {s.allergies && (
                  <p className="mt-3 text-xs text-rose-600 font-semibold">
                    ⚠ Allergie: {s.allergies}
                  </p>
                )}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  <button
                    onClick={() => setTransferOpen(s)}
                    className="h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                    data-testid={`transfer-student-${s.id}`}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5" /> Sposta
                  </button>
                  <button
                    onClick={() => {
                      const { first_name, last_name, birth_date, fiscal_code, residence, allergies, notes } = s;
                      setForm({ first_name, last_name, birth_date: birth_date || "", fiscal_code, residence, allergies, notes });
                      setEditId(s.id); setOpen(true);
                    }}
                    className="h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                    data-testid={`edit-student-${s.id}`}
                  >
                    <Pencil className="h-3.5 w-3.5" /> Modifica
                  </button>
                  <button
                    onClick={() => remove(s.id)}
                    className="h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                    data-testid={`delete-student-${s.id}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Form drawer */}
      {open && (
        <Modal onClose={() => setOpen(false)} title={editId ? "Modifica alunno" : "Nuovo alunno"}>
          <form onSubmit={submit} className="space-y-3">
            <Row><Field label="Nome"><Input value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required testid="form-first-name" /></Field>
            <Field label="Cognome"><Input value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required testid="form-last-name" /></Field></Row>
            <Row><Field label="Data nascita"><Input type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} testid="form-birth-date" /></Field>
            <Field label="Codice fiscale"><Input value={form.fiscal_code} onChange={(v) => setForm({ ...form, fiscal_code: v })} /></Field></Row>
            <Field label="Residenza"><Input value={form.residence} onChange={(v) => setForm({ ...form, residence: v })} /></Field>
            <Field label="Allergie"><Input value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} /></Field>
            <Field label="Note"><Textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /></Field>

            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 font-semibold">Annulla</button>
              <button type="submit" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold" data-testid="form-submit">Salva</button>
            </div>
          </form>
        </Modal>
      )}

      {transferOpen && (
        <Modal onClose={() => setTransferOpen(null)} title={`Sposta ${transferOpen.first_name} ${transferOpen.last_name}`}>
          <p className="text-sm text-stone-500 mb-4">Scegli la nuova sezione per l'anno {activeYear?.label}:</p>
          <div className="space-y-2">
            {classrooms.map((c) => (
              <button
                key={c.id}
                onClick={() => onTransfer(transferOpen.id, c.id)}
                className="w-full text-left p-4 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200 font-semibold"
                data-testid={`transfer-target-${c.id}`}
              >
                {c.name} <span className="text-xs text-stone-500">· {c.age_band}</span>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, title, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-stone-900/40 p-0 md:p-6">
      <div className="bg-white w-full md:max-w-lg rounded-t-[2rem] md:rounded-[2rem] p-6 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 flex items-center justify-center">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><div className="mt-1">{children}</div></label>; }
function Row({ children }) { return <div className="grid grid-cols-2 gap-3">{children}</div>; }
function Input({ value, onChange, type = "text", required, testid }) {
  return <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
function Textarea({ value, onChange }) {
  return <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" />;
}
