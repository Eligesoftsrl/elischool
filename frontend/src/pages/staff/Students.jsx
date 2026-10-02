import { useEffect, useState, useMemo } from "react";
import { useOutletContext } from "react-router-dom";
import { toast } from "sonner";
import { Plus, Search, Trash2, Pencil, X, GraduationCap, ArrowRightLeft, Cake, AlertTriangle, UserX, RefreshCw, Ban, Send, UsersRound, Mail, Phone, FileText, User } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";
import { ComuniAutocomplete } from "@/components/ComuniAutocomplete";
import { ExportMenu } from "@/components/ExportMenu";
import { fmtDate } from "@/lib/format";

const CF_RE = /^[A-Z]{6}[0-9]{2}[A-Z][0-9]{2}[A-Z][0-9]{3}[A-Z]$/;
const empty = { first_name: "", last_name: "", birth_date: "", fiscal_code: "", city_residence: "", residence: "", allergies: "", notes: "", classroom_id: "" };

const WITHDRAW_REASONS = [
  { value: "transfer", label: "Trasferimento ad altra scuola" },
  { value: "no_renewal", label: "Non rinnovo iscrizione" },
  { value: "moving", label: "Trasloco famiglia" },
  { value: "graduated", label: "Diplomato (fine ciclo)" },
  { value: "other", label: "Altro" },
];
const REASON_LABEL = Object.fromEntries(WITHDRAW_REASONS.map(r => [r.value, r.label]));

export default function StaffStudents() {
  const { activeYear } = useOutletContext();
  const [active, setActiveList] = useState([]);
  const [withdrawn, setWithdrawn] = useState([]);
  const [classrooms, setClassrooms] = useState([]);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all"); // 'all' | 'unassigned' | 'withdrawn'
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [transferOpen, setTransferOpen] = useState(null);
  const [withdrawOpen, setWithdrawOpen] = useState(null);
  const [withdrawForm, setWithdrawForm] = useState({ reason: "transfer", withdrawn_at: new Date().toISOString().slice(0, 10), notes: "" });
  const [classFilter, setClassFilter] = useState("all");
  const [parentLinks, setParentLinks] = useState({}); // {student_id: [{parent_id, parent_name}]}
  const [parentsById, setParentsById] = useState({}); // full parent data by id
  const [parentDetail, setParentDetail] = useState(null); // parent object to show in popup

  const load = async () => {
    try {
      const yearParam = activeYear ? { school_year_id: activeYear.id } : {};
      const [a, w, p] = await Promise.all([
        api.get("/students", { params: { ...yearParam, status: "active" } }),
        api.get("/students", { params: { status: "withdrawn" } }),
        api.get("/parents").catch(() => ({ data: [] })),
      ]);
      setActiveList(a.data);
      setWithdrawn(w.data);
      // Build map student -> [parents] and parentsById
      const linkMap = {};
      const byId = {};
      (p.data || []).forEach((par) => {
        byId[par.id] = par;
        (par.student_ids || []).forEach((sid) => {
          if (!linkMap[sid]) linkMap[sid] = [];
          linkMap[sid].push({ id: par.id, name: par.name || `${par.first_name} ${par.last_name}` });
        });
      });
      setParentLinks(linkMap);
      setParentsById(byId);
      if (classrooms.length === 0 && activeYear) {
        const { data: cs } = await api.get("/classrooms", { params: { school_year_id: activeYear.id } });
        setClassrooms(cs);
      }
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  useEffect(() => { if (activeYear) load(); /* eslint-disable-next-line */ }, [activeYear]);

  const submit = async (e) => {
    e.preventDefault();
    const cf = (form.fiscal_code || "").toUpperCase().replace(/\s/g, "");
    if (!CF_RE.test(cf)) {
      toast.error("Codice Fiscale non valido (16 caratteri, es. RSSMRA85M01H501Z)");
      return;
    }
    try {
      const payload = { ...form, fiscal_code: cf };
      if (editId) {
        await api.patch(`/students/${editId}`, payload);
        toast.success("Alunno aggiornato");
      } else {
        await api.post("/students", payload);
        toast.success("Alunno creato");
      }
      setOpen(false); setForm(empty); setEditId(null);
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const getClassroomName = (s) => {
    const cid = s.enrollment?.classroom_id;
    const c = classrooms.find((x) => x.id === cid);
    return c?.name;
  };

  const remove = async (id) => {
    if (!confirm("Eliminare DEFINITIVAMENTE l'alunno? Questa azione cancella tutti i dati (attività, presenze, foto). Se invece vuoi archiviarlo temporaneamente usa 'Ritira'.")) return;
    try {
      await api.delete(`/students/${id}`);
      toast.success("Eliminato definitivamente");
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const submitWithdraw = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/students/${withdrawOpen.id}/withdraw`, withdrawForm);
      toast.success(`${withdrawOpen.first_name} ${withdrawOpen.last_name} ritirato/a`);
      setWithdrawOpen(null);
      setWithdrawForm({ reason: "transfer", withdrawn_at: new Date().toISOString().slice(0, 10), notes: "" });
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const reactivate = async (s) => {
    if (!confirm(`Ripristinare ${s.first_name} ${s.last_name} come alunno attivo? Dovrai riassegnare la sezione.`)) return;
    try {
      await api.post(`/students/${s.id}/reactivate`);
      toast.success("Alunno ripristinato");
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  // Ricerca live
  const qn = q.trim().toLowerCase();
  const matches = (s) => {
    if (!qn) return true;
    const full = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase();
    return (
      (s.first_name || "").toLowerCase().includes(qn) ||
      (s.last_name || "").toLowerCase().includes(qn) ||
      full.includes(qn) ||
      (s.fiscal_code || "").toLowerCase().includes(qn) ||
      (s.city_residence || "").toLowerCase().includes(qn) ||
      (getClassroomName(s) || "").toLowerCase().includes(qn)
    );
  };

  const unassignedCount = useMemo(() => active.filter((s) => !s.enrollment?.classroom_id).length, [active]);
  const withdrawnMatchingSearch = useMemo(() => (qn ? withdrawn.filter(matches) : []), [withdrawn, qn]); // eslint-disable-line

  const displayed = useMemo(() => {
    let list;
    if (filter === "withdrawn") list = withdrawn.filter(matches);
    else if (filter === "unassigned") list = active.filter((s) => !s.enrollment?.classroom_id).filter(matches);
    else list = active.filter(matches);
    // apply class filter (except when viewing withdrawn or unassigned, which are already filtered)
    if (classFilter !== "all" && filter !== "withdrawn" && filter !== "unassigned") {
      list = list.filter((s) => s.enrollment?.classroom_id === classFilter);
    }
    return list;
    // eslint-disable-next-line
  }, [active, withdrawn, filter, qn, classFilter]);

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
        subtitle={
          filter === "withdrawn"
            ? `${displayed.length} ritirat${displayed.length === 1 ? "o" : "i"}`
            : filter === "unassigned"
              ? `${displayed.length} da assegnare`
              : qn
                ? `${displayed.length} di ${active.length} bambini`
                : `${active.length} bambini attivi`
        }
        right={
          <div className="flex items-center gap-2">
            <ExportMenu
              data={displayed.filter((s) => s.status !== "withdrawn")}
              columns={[
                { key: "last_name", label: "Cognome" },
                { key: "first_name", label: "Nome" },
                { key: "fiscal_code", label: "Codice Fiscale" },
                { key: "birth_date", label: "Data nascita", format: (r) => fmtDate(r.birth_date) },
                { key: "city_residence", label: "Città" },
                { key: "residence", label: "Indirizzo" },
                { key: "classroom", label: "Sezione", format: (r) => classrooms.find((c) => c.id === r.enrollment?.classroom_id)?.name || "— Da assegnare —" },
                { key: "allergies", label: "Allergie" },
              ]}
              filename="alunni"
              title="Elenco alunni"
              testid="export-students"
            />
            <button
              onClick={() => { setForm(empty); setEditId(null); setOpen(true); }}
              className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 tap-press"
              data-testid="add-student-button"
            >
              <Plus className="h-4 w-4" /> Nuovo alunno
            </button>
          </div>
        }
      />

      {/* Banner alunni senza sezione */}
      {unassignedCount > 0 && filter !== "unassigned" && (
        <button
          onClick={() => setFilter("unassigned")}
          className="w-full mb-4 rounded-2xl p-4 bg-amber-50 border border-amber-200 hover:bg-amber-100 text-left flex items-center gap-3 transition-all group"
          data-testid="unassigned-banner"
        >
          <span className="h-11 w-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shrink-0">
            <AlertTriangle className="h-5 w-5" />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-display font-bold text-stone-900">
              {unassignedCount} {unassignedCount === 1 ? "alunno" : "alunni"} senza sezione
            </p>
            <p className="text-xs text-amber-800/80">Assegnali a una sezione per iniziare a raccogliere attività e presenze.</p>
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-amber-700 group-hover:underline">Assegna →</span>
        </button>
      )}

      <div className="mb-4 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-stone-400" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Cerca per nome, cognome, CF, città o sezione…"
          className="w-full pl-12 pr-12 h-14 rounded-2xl bg-white border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
          data-testid="search-student-input"
        />
        {q && (
          <button
            type="button"
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-stone-100 hover:bg-stone-200 flex items-center justify-center"
            data-testid="clear-search-btn"
            aria-label="Cancella ricerca"
          >
            <X className="h-4 w-4 text-stone-500" />
          </button>
        )}
      </div>

      {/* Pill filtri */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-3 -mx-1 px-1">
        <FilterPill active={filter === "all"} onClick={() => setFilter("all")} testid="filter-all">
          Tutti <span className="ml-1 opacity-70">({active.length})</span>
        </FilterPill>
        {unassignedCount > 0 && (
          <FilterPill active={filter === "unassigned"} onClick={() => setFilter("unassigned")} color="amber" testid="filter-unassigned">
            <AlertTriangle className="h-3.5 w-3.5" /> Da assegnare <span className="ml-1 opacity-70">({unassignedCount})</span>
          </FilterPill>
        )}
        {withdrawn.length > 0 && (
          <FilterPill active={filter === "withdrawn"} onClick={() => setFilter("withdrawn")} color="stone" testid="filter-withdrawn">
            <Ban className="h-3.5 w-3.5" /> Ritirati <span className="ml-1 opacity-70">({withdrawn.length})</span>
          </FilterPill>
        )}
      </div>

      {/* Filtro sezione (nascosto quando si guarda ritirati o solo da assegnare) */}
      {filter === "all" && classrooms.length > 1 && (
        <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1" data-testid="class-filter-pills">
          <button
            onClick={() => setClassFilter("all")}
            className={`shrink-0 h-9 px-3 rounded-full border text-xs font-semibold ${classFilter === "all" ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
            data-testid="class-filter-all"
          >
            Tutte le sezioni
          </button>
          {classrooms.map((c) => {
            const count = active.filter((s) => s.enrollment?.classroom_id === c.id).length;
            return (
              <button
                key={c.id}
                onClick={() => setClassFilter(c.id)}
                className={`shrink-0 h-9 px-3 rounded-full border text-xs font-semibold ${classFilter === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
                data-testid={`class-filter-${c.id}`}
              >
                {c.name} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {displayed.length === 0 ? (
        qn ? (
          <EmptyState title="Nessun risultato" description={`Nessun alunno corrisponde a "${q}".`} />
        ) : filter === "unassigned" ? (
          <EmptyState title="Tutti assegnati!" description="Nessun alunno attende una sezione. Ottimo lavoro!" />
        ) : filter === "withdrawn" ? (
          <EmptyState title="Nessun alunno ritirato" description="I ritiri appariranno qui." />
        ) : (
          <EmptyState
            title="Nessun alunno"
            description="Aggiungi il primo alunno per iniziare."
            imageUrl="https://static.prod-images.emergentagent.com/jobs/96ad60f7-372f-4730-9be4-769e965e5107/images/ff88168c79f5a887e58508be26ea3e4f7ae859628398e0d781e9ee508232af3c.png"
          />
        )
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayed.map((s) => {
            const cName = getClassroomName(s);
            const isWithdrawn = s.status === "withdrawn";
            const isUnassigned = !isWithdrawn && !cName;
            return (
              <Card
                key={s.id}
                className={`hover:shadow-md transition-all ${isWithdrawn ? "bg-stone-50 opacity-80 border-dashed" : isUnassigned ? "border-amber-300" : ""}`}
                data-testid={`student-card-${s.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${isWithdrawn ? "bg-stone-200" : "bg-stone-100"}`}>
                      {isWithdrawn ? <UserX className="h-5 w-5 text-stone-500" /> : <GraduationCap className="h-5 w-5 text-stone-600" />}
                    </div>
                    <div>
                      <p className={`font-display font-bold ${isWithdrawn ? "text-stone-500" : "text-stone-900"}`}>{s.first_name} {s.last_name}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-1">
                        {isWithdrawn ? (
                          <Pill color="stone"><Ban className="h-3 w-3" /> Ritirato {s.withdrawn_at ? `il ${fmtDate(s.withdrawn_at)}` : ""}</Pill>
                        ) : cName ? (
                          <Pill color="brand">{cName}</Pill>
                        ) : (
                          <Pill color="amber"><AlertTriangle className="h-3 w-3" /> Da assegnare</Pill>
                        )}
                        {s.birth_date && !isWithdrawn && (
                          <Pill color="stone"><Cake className="h-3 w-3" /> {fmtDate(s.birth_date)}</Pill>
                        )}
                      </div>
                      {s.fiscal_code && !isWithdrawn && (
                        <p className="mt-1.5 text-[11px] font-mono tracking-wider text-stone-500 uppercase" data-testid={`student-cf-${s.id}`}>
                          CF: {s.fiscal_code}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                {isWithdrawn && s.withdrawal_reason && (
                  <p className="mt-3 text-xs text-stone-500">
                    <b>Motivo:</b> {REASON_LABEL[s.withdrawal_reason] || s.withdrawal_reason}
                    {s.withdrawal_notes ? <> · {s.withdrawal_notes}</> : null}
                  </p>
                )}
                {s.allergies && !isWithdrawn && (
                  <p className="mt-3 text-xs text-rose-600 font-semibold">⚠ Allergie: {s.allergies}</p>
                )}
                {!isWithdrawn && (
                  parentLinks[s.id]?.length > 0 ? (
                    <div className="mt-2 flex items-center gap-1.5 flex-wrap" data-testid={`student-parent-linked-${s.id}`}>
                      <UsersRound className="h-3 w-3 text-purple-700 shrink-0" />
                      {parentLinks[s.id].map((p, i) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            const full = parentsById[p.id];
                            if (full) setParentDetail(full);
                          }}
                          className="text-xs text-purple-700 font-medium hover:text-purple-900 hover:underline underline-offset-2"
                          data-testid={`student-parent-btn-${s.id}-${p.id}`}
                          title="Vedi dettaglio genitore"
                        >
                          {p.name}{i < parentLinks[s.id].length - 1 ? "," : ""}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-amber-700 flex items-center gap-1 font-medium" data-testid={`student-parent-missing-${s.id}`}>
                      <AlertTriangle className="h-3 w-3" /> Nessun genitore associato
                    </p>
                  )
                )}

                {isWithdrawn ? (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <button
                      onClick={() => reactivate(s)}
                      className="h-10 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                      data-testid={`reactivate-student-${s.id}`}
                    >
                      <RefreshCw className="h-3.5 w-3.5" /> Ripristina
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                      data-testid={`delete-student-${s.id}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Elimina def.
                    </button>
                  </div>
                ) : (
                  <div className="mt-4 grid grid-cols-4 gap-2">
                    <button
                      onClick={() => setTransferOpen(s)}
                      className={`h-10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 ${isUnassigned ? "bg-amber-100 hover:bg-amber-200 text-amber-800" : "bg-stone-100 hover:bg-stone-200"}`}
                      data-testid={`transfer-student-${s.id}`}
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" /> {isUnassigned ? "Assegna" : "Sposta"}
                    </button>
                    <button
                      onClick={() => {
                        const { first_name, last_name, birth_date, fiscal_code, city_residence, residence, allergies, notes } = s;
                        setForm({ first_name, last_name, birth_date: birth_date || "", fiscal_code: fiscal_code || "", city_residence: city_residence || "", residence: residence || "", allergies: allergies || "", notes: notes || "", classroom_id: s.enrollment?.classroom_id || "" });
                        setEditId(s.id); setOpen(true);
                      }}
                      className="h-10 rounded-xl bg-stone-100 hover:bg-stone-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                      data-testid={`edit-student-${s.id}`}
                    >
                      <Pencil className="h-3.5 w-3.5" /> Modifica
                    </button>
                    <button
                      onClick={() => setWithdrawOpen(s)}
                      className="h-10 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                      data-testid={`withdraw-student-${s.id}`}
                      title="Ritira dalla scuola (archivia)"
                    >
                      <UserX className="h-3.5 w-3.5" /> Ritira
                    </button>
                    <button
                      onClick={() => remove(s.id)}
                      className="h-10 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5"
                      data-testid={`delete-student-${s.id}`}
                      title="Elimina definitivamente"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Ricerca intelligente: ritirati che matchano quando non stai già filtrando "Ritirati" */}
      {qn && filter !== "withdrawn" && withdrawnMatchingSearch.length > 0 && (
        <div className="mt-8 pt-6 border-t border-stone-200">
          <p className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center gap-1.5">
            <Ban className="h-3.5 w-3.5" /> Trovati tra i ritirati ({withdrawnMatchingSearch.length})
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {withdrawnMatchingSearch.map((s) => (
              <Card key={s.id} className="bg-stone-50 border-dashed opacity-80" data-testid={`withdrawn-hint-${s.id}`}>
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-2xl bg-stone-200 flex items-center justify-center">
                    <UserX className="h-4 w-4 text-stone-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-stone-600 truncate">{s.first_name} {s.last_name}</p>
                    <p className="text-xs text-stone-500 truncate">Ritirato il {fmtDate(s.withdrawn_at)} · {REASON_LABEL[s.withdrawal_reason] || s.withdrawal_reason}</p>
                  </div>
                  <button
                    onClick={() => reactivate(s)}
                    className="h-9 px-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold flex items-center gap-1"
                    data-testid={`quick-reactivate-${s.id}`}
                  >
                    <RefreshCw className="h-3 w-3" /> Ripristina
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Form drawer */}
      {open && (
        <Modal
          onClose={() => setOpen(false)}
          title={editId ? "Modifica alunno" : "Nuovo alunno"}
          footer={(
            <div className="flex gap-3">
              <button type="button" onClick={() => setOpen(false)} className="flex-1 h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 font-semibold" data-testid="form-cancel">Annulla</button>
              <button type="submit" form="student-form" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold" data-testid="form-submit">Salva</button>
            </div>
          )}
        >
          <form id="student-form" onSubmit={submit} className="space-y-3">
            <Row><Field label="Nome *"><Input value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required testid="form-first-name" /></Field>
            <Field label="Cognome *"><Input value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required testid="form-last-name" /></Field></Row>
            <Row><Field label="Data nascita *"><Input type="date" value={form.birth_date} onChange={(v) => setForm({ ...form, birth_date: v })} required testid="form-birth-date" /></Field>
            <Field label="Codice Fiscale *">
              <input type="text" required value={form.fiscal_code}
                onChange={(e) => setForm({ ...form, fiscal_code: e.target.value.toUpperCase().replace(/\s/g, "") })}
                maxLength={16} placeholder="RSSMRA85M01H501Z"
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 font-mono tracking-wider uppercase"
                data-testid="form-fiscal-code" />
            </Field></Row>
            <Field label="Città di residenza *">
              <ComuniAutocomplete value={form.city_residence} onChange={(v) => setForm({ ...form, city_residence: v })} required testid="form-city" />
            </Field>
            <Field label="Sezione (anno attivo)">
              <select
                value={form.classroom_id}
                onChange={(e) => setForm({ ...form, classroom_id: e.target.value })}
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                data-testid="form-classroom"
              >
                <option value="">— Da assegnare —</option>
                {classrooms.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.age_band}</option>)}
              </select>
            </Field>
            <Field label="Indirizzo (via, numero)"><Input value={form.residence} onChange={(v) => setForm({ ...form, residence: v })} /></Field>
            <Field label="Allergie"><Input value={form.allergies} onChange={(v) => setForm({ ...form, allergies: v })} /></Field>
            <Field label="Note"><Textarea value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} /></Field>
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

      {withdrawOpen && (
        <Modal
          onClose={() => setWithdrawOpen(null)}
          title={`Ritira ${withdrawOpen.first_name} ${withdrawOpen.last_name}`}
          footer={(
            <div className="flex gap-3">
              <button type="button" onClick={() => setWithdrawOpen(null)} className="flex-1 h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 font-semibold">Annulla</button>
              <button type="submit" form="withdraw-form" className="flex-1 h-12 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-semibold flex items-center justify-center gap-2" data-testid="withdraw-submit">
                <UserX className="h-4 w-4" /> Ritira alunno
              </button>
            </div>
          )}
        >
          <div className="rounded-2xl bg-orange-50 border border-orange-200 p-4 mb-4">
            <p className="text-sm text-orange-900">
              <b>Cosa succede quando ritiri:</b>
            </p>
            <ul className="text-xs text-orange-800 mt-2 space-y-1 list-disc list-inside">
              <li>L'alunno viene archiviato e non compare più nella lista principale</li>
              <li>Viene rimosso dalle sezioni correnti</li>
              <li>Attività, presenze e foto storiche restano archiviate</li>
              <li>Puoi <b>ripristinarlo</b> in qualsiasi momento</li>
            </ul>
          </div>
          <form id="withdraw-form" onSubmit={submitWithdraw} className="space-y-3">
            <Field label="Motivo del ritiro *">
              <select
                value={withdrawForm.reason}
                onChange={(e) => setWithdrawForm({ ...withdrawForm, reason: e.target.value })}
                required
                className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                data-testid="withdraw-reason"
              >
                {WITHDRAW_REASONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </Field>
            <Field label="Data del ritiro *">
              <Input type="date" value={withdrawForm.withdrawn_at} onChange={(v) => setWithdrawForm({ ...withdrawForm, withdrawn_at: v })} required testid="withdraw-date" />
            </Field>
            <Field label="Note (facoltativo)">
              <Textarea value={withdrawForm.notes} onChange={(v) => setWithdrawForm({ ...withdrawForm, notes: v })} />
            </Field>
          </form>
        </Modal>
      )}

      {/* Parent detail popup */}
      {parentDetail && (
        <Modal
          onClose={() => setParentDetail(null)}
          title="Dettaglio genitore"
          footer={(
            <button type="button" onClick={() => setParentDetail(null)} className="w-full h-12 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-semibold" data-testid="parent-detail-close">
              Chiudi
            </button>
          )}
        >
          <div className="space-y-4" data-testid="parent-detail-modal">
            <div className="flex items-center gap-3">
              <div className="h-14 w-14 rounded-2xl bg-purple-100 flex items-center justify-center shrink-0">
                <User className="h-6 w-6 text-purple-700" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-lg text-stone-900">
                  {parentDetail.name || `${parentDetail.first_name || ""} ${parentDetail.last_name || ""}`.trim()}
                </p>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <Pill color={parentDetail.status === "active" ? "green" : "amber"}>
                    {parentDetail.status === "active" ? "Attivo" : "In attesa invito"}
                  </Pill>
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2">
              {parentDetail.email && (
                <DetailRow icon={<Mail className="h-4 w-4" />} label="Email">
                  <a href={`mailto:${parentDetail.email}`} className="text-brand hover:underline break-all">{parentDetail.email}</a>
                </DetailRow>
              )}
              {parentDetail.phone && (
                <DetailRow icon={<Phone className="h-4 w-4" />} label="Telefono">
                  <a href={`tel:${parentDetail.phone}`} className="text-brand hover:underline">{parentDetail.phone}</a>
                </DetailRow>
              )}
              {parentDetail.fiscal_code && (
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Codice Fiscale">
                  <span className="font-mono tracking-wider uppercase text-stone-800">{parentDetail.fiscal_code}</span>
                </DetailRow>
              )}
              {parentDetail.notes && (
                <DetailRow icon={<FileText className="h-4 w-4" />} label="Note">
                  <span className="text-stone-700 whitespace-pre-wrap">{parentDetail.notes}</span>
                </DetailRow>
              )}
              {parentDetail.student_ids?.length > 0 && (
                <DetailRow icon={<UsersRound className="h-4 w-4" />} label={`Figli (${parentDetail.student_ids.length})`}>
                  <div className="flex flex-wrap gap-1.5">
                    {parentDetail.student_ids.map((sid) => {
                      const s = active.find((x) => x.id === sid) || withdrawn.find((x) => x.id === sid);
                      if (!s) return null;
                      return <Pill key={sid} color="brand">{s.first_name} {s.last_name}</Pill>;
                    })}
                  </div>
                </DetailRow>
              )}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function FilterPill({ active, onClick, children, color = "stone", testid }) {
  const colorMap = {
    stone: active ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200 hover:border-stone-400",
    amber: active ? "bg-amber-500 text-white border-amber-500" : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100",
  };
  return (
    <button
      onClick={onClick}
      className={`shrink-0 h-10 px-4 rounded-full border text-sm font-semibold flex items-center gap-1.5 transition-all ${colorMap[color]}`}
      data-testid={testid}
    >
      {children}
    </button>
  );
}

function Modal({ children, title, onClose, footer, maxWidth = "md:max-w-lg" }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-stone-900/40 p-0 md:p-6">
      <div className={`bg-white w-full ${maxWidth} rounded-t-[2rem] md:rounded-[2rem] max-h-[92vh] flex flex-col shadow-xl`}>
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100 shrink-0">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center" data-testid="modal-close-btn" aria-label="Chiudi">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {children}
        </div>
        {footer && (
          <div className="px-6 py-4 border-t border-stone-100 bg-white rounded-b-[2rem] shrink-0" style={{ paddingBottom: "max(1rem, env(safe-area-inset-bottom))" }}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
function Field({ label, children }) { return <label className="block"><span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span><div className="mt-1">{children}</div></label>; }
function Row({ children }) { return <div className="grid grid-cols-2 gap-3">{children}</div>; }
function DetailRow({ icon, label, children }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-2xl bg-stone-50 border border-stone-100">
      <span className="h-8 w-8 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-stone-600 shrink-0 mt-0.5">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500">{label}</p>
        <div className="mt-0.5 text-sm">{children}</div>
      </div>
    </div>
  );
}
function Input({ value, onChange, type = "text", required, testid }) {
  return <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
function Textarea({ value, onChange }) {
  return <textarea rows={3} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" />;
}
