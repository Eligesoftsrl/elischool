import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, X, UserCog, Pencil, Trash2, Shield, KeyRound, AtSign, Copy, Check } from "lucide-react";
import api, { apiErrorMessage } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

const empty = { first_name: "", last_name: "", email: "", phone: "", role: "teacher", password: "", notes: "" };

// generate a readable, strong initial password: 3 words + 3 digits + "!"
const genPassword = () => {
  const words = ["Sole", "Luna", "Prato", "Mare", "Cielo", "Fiore", "Nido", "Nuvola", "Albero", "Stella", "Melodia", "Arcobaleno"];
  const w1 = words[Math.floor(Math.random() * words.length)];
  const w2 = words[Math.floor(Math.random() * words.length)];
  const num = Math.floor(100 + Math.random() * 900);
  return `${w1}${w2}${num}!`;
};

export default function StaffTeachers() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(empty);
  const [showPassword, setShowPassword] = useState(false);
  const [createdInfo, setCreatedInfo] = useState(null); // { email, password } shown after creation
  const [copied, setCopied] = useState("");

  const load = async () => {
    try { const { data } = await api.get("/teachers"); setItems(data); } catch (e) { toast.error(apiErrorMessage(e)); }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    try {
      if (editId) {
        await api.patch(`/teachers/${editId}`, form);
        toast.success("Aggiornata");
        setOpen(false); setForm(empty); setEditId(null);
      } else {
        if (!form.password || form.password.length < 6) {
          toast.error("Imposta una password di almeno 6 caratteri");
          return;
        }
        await api.post("/teachers", form);
        toast.success("Maestra creata");
        // Show the credentials panel so admin can share them
        setCreatedInfo({ email: form.email, password: form.password });
      }
      await load();
    } catch (e) { toast.error(apiErrorMessage(e)); }
  };

  const closeAndReset = () => {
    setOpen(false); setForm(empty); setEditId(null); setCreatedInfo(null); setShowPassword(false);
  };

  const copyToClipboard = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch { toast.error("Impossibile copiare"); }
  };

  const remove = async (id) => {
    if (!confirm("Eliminare?")) return;
    try { await api.delete(`/teachers/${id}`); await load(); toast.success("Eliminata"); }
    catch (e) { toast.error(apiErrorMessage(e)); }
  };

  if (user?.role !== "admin") {
    return <PageHeader title="Maestre" subtitle="Accesso riservato all'amministratore" />;
  }

  return (
    <div>
      <PageHeader
        title="Maestre"
        subtitle={`${items.length} membri dello staff`}
        right={
          <button onClick={() => { setForm({ ...empty, password: genPassword() }); setEditId(null); setCreatedInfo(null); setShowPassword(true); setOpen(true); }}
            className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold text-sm flex items-center gap-2 tap-press"
            data-testid="add-teacher-button">
            <Plus className="h-4 w-4" /> Nuova maestra
          </button>
        }
      />
      {items.length === 0 ? <EmptyState title="Nessuna maestra" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((t) => (
            <Card key={t.id} data-testid={`teacher-card-${t.id}`}>
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-2xl bg-violet-50 flex items-center justify-center">
                  {t.role === "admin" ? <Shield className="h-5 w-5 text-violet-600" /> : <UserCog className="h-5 w-5 text-violet-600" />}
                </div>
                <div className="min-w-0">
                  <p className="font-display font-bold truncate">{t.first_name} {t.last_name}</p>
                  <Pill color={t.role === "admin" ? "rose" : "purple"} className="mt-1">{t.role === "admin" ? "Amministratore" : "Maestra"}</Pill>
                </div>
              </div>
              <div className="mt-3 rounded-xl bg-stone-50 border border-stone-100 px-3 py-2">
                <p className="text-[10px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1"><AtSign className="h-3 w-3" /> Nome utente per il login</p>
                <p className="text-xs font-mono text-stone-800 truncate mt-0.5" title={t.email}>{t.email}</p>
              </div>
              {t.phone && <p className="text-xs text-stone-500 mt-2">{t.phone}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <button onClick={() => { setForm({ first_name: t.first_name, last_name: t.last_name, email: t.email, phone: t.phone || "", role: t.role, password: "", notes: t.notes || "" }); setEditId(t.id); setCreatedInfo(null); setShowPassword(false); setOpen(true); }}
                  className="h-10 rounded-xl bg-stone-100 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`edit-teacher-${t.id}`}><Pencil className="h-3.5 w-3.5" /> Modifica</button>
                <button onClick={() => remove(t.id)}
                  className="h-10 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold flex items-center justify-center gap-1.5" data-testid={`delete-teacher-${t.id}`}><Trash2 className="h-3.5 w-3.5" /> Elimina</button>
              </div>
            </Card>
          ))}
        </div>
      }

      {open && (
        <Modal
          title={createdInfo ? "Maestra creata ✓" : (editId ? "Modifica maestra" : "Nuova maestra")}
          onClose={closeAndReset}
          footer={createdInfo ? (
            <button type="button" onClick={closeAndReset} className="w-full h-12 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-semibold" data-testid="teacher-created-close">
              Ho condiviso le credenziali, chiudi
            </button>
          ) : (
            <div className="flex gap-3">
              <button type="button" onClick={closeAndReset} className="flex-1 h-12 rounded-2xl bg-stone-100 hover:bg-stone-200 font-semibold" data-testid="teacher-cancel">Annulla</button>
              <button type="submit" form="teacher-form" className="flex-1 h-12 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] text-white font-semibold" data-testid="teacher-submit">
                {editId ? "Salva" : "Crea e genera accesso"}
              </button>
            </div>
          )}
        >
          {createdInfo ? (
            <div className="space-y-4" data-testid="teacher-credentials-panel">
              <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
                <p className="text-sm text-emerald-900 font-semibold">
                  Account creato con successo. Condividi queste credenziali con la maestra: potrà accedere subito dalla pagina di login.
                </p>
              </div>
              <CredentialRow icon={<AtSign className="h-4 w-4" />} label="Nome utente (email)" value={createdInfo.email} copyKey="email" copied={copied} onCopy={copyToClipboard} />
              <CredentialRow icon={<KeyRound className="h-4 w-4" />} label="Password iniziale" value={createdInfo.password} copyKey="pwd" copied={copied} onCopy={copyToClipboard} mono />
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
                <b>Suggerisci alla maestra</b> di cambiare la password dal menu <i>Profilo</i> dopo il primo accesso.
              </div>
            </div>
          ) : (
            <form id="teacher-form" onSubmit={submit} className="space-y-5">
              {/* Sezione: Dati anagrafici */}
              <div className="space-y-3">
                <SectionTitle>Dati anagrafici</SectionTitle>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nome *"><Input value={form.first_name} onChange={(v) => setForm({ ...form, first_name: v })} required testid="teacher-first" /></Field>
                  <Field label="Cognome *"><Input value={form.last_name} onChange={(v) => setForm({ ...form, last_name: v })} required testid="teacher-last" /></Field>
                </div>
                <Field label="Telefono"><Input value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} testid="teacher-phone" /></Field>
                <Field label="Ruolo *">
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
                    data-testid="teacher-role">
                    <option value="teacher">Maestra</option>
                    <option value="admin">Amministratore (accesso completo)</option>
                  </select>
                </Field>
              </div>

              {/* Sezione: Credenziali di accesso */}
              <div className="space-y-3 pt-2">
                <SectionTitle>Credenziali di accesso</SectionTitle>
                <div className="rounded-xl bg-sky-50 border border-sky-200 px-3 py-2 text-xs text-sky-900">
                  La maestra accede dalla pagina di login usando <b>l'email come nome utente</b> e la password che imposti qui sotto.
                </div>
                <Field label="Email (nome utente per il login) *">
                  <div className="relative">
                    <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                    <input type="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value.toLowerCase().trim() })}
                      placeholder="nome.cognome@scuolapp.it"
                      className="w-full h-12 pl-10 pr-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 font-mono text-sm"
                      data-testid="teacher-email" />
                  </div>
                </Field>
                <Field label={editId ? "Nuova password (lascia vuoto per non modificare)" : "Password iniziale *"}>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
                    <input type={showPassword ? "text" : "password"} value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      placeholder={editId ? "— invariata —" : "min. 6 caratteri"}
                      required={!editId}
                      minLength={editId && !form.password ? undefined : 6}
                      className="w-full h-12 pl-10 pr-28 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30 font-mono"
                      data-testid="teacher-password" />
                    <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                      <button type="button" onClick={() => setShowPassword((s) => !s)}
                        className="h-8 px-2 rounded-lg bg-white border border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-600 hover:bg-stone-50"
                        data-testid="teacher-toggle-password" title={showPassword ? "Nascondi" : "Mostra"}>
                        {showPassword ? "Nascondi" : "Mostra"}
                      </button>
                      <button type="button" onClick={() => { setForm({ ...form, password: genPassword() }); setShowPassword(true); }}
                        className="h-8 px-2 rounded-lg bg-brand/10 text-brand text-[10px] font-bold uppercase tracking-wider hover:bg-brand/20"
                        data-testid="teacher-gen-password" title="Genera password sicura">
                        Genera
                      </button>
                    </div>
                  </div>
                </Field>
              </div>
            </form>
          )}
        </Modal>
      )}
    </div>
  );
}

function Modal({ children, title, onClose, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-stone-900/40 p-0 md:p-6">
      <div className="bg-white w-full md:max-w-lg rounded-t-[2rem] md:rounded-[2rem] max-h-[92vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-stone-100 shrink-0">
          <h3 className="font-display text-xl font-bold">{title}</h3>
          <button onClick={onClose} className="h-10 w-10 rounded-xl bg-stone-100 hover:bg-stone-200 flex items-center justify-center" data-testid="teacher-modal-close" aria-label="Chiudi"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
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
function Input({ value, onChange, type = "text", required, testid }) {
  return <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
function SectionTitle({ children }) {
  return <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400 border-l-2 border-brand pl-2">{children}</p>;
}
function CredentialRow({ icon, label, value, copyKey, copied, onCopy, mono }) {
  return (
    <div className="rounded-2xl bg-stone-50 border border-stone-200 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-stone-500 flex items-center gap-1.5">{icon}{label}</p>
      <div className="mt-1.5 flex items-center gap-2">
        <code className={`flex-1 px-3 py-2 rounded-xl bg-white border border-stone-200 text-sm ${mono ? "font-mono" : ""} break-all`}>
          {value}
        </code>
        <button type="button" onClick={() => onCopy(value, copyKey)}
          className="h-10 w-10 shrink-0 rounded-xl bg-stone-900 hover:bg-stone-800 text-white flex items-center justify-center"
          data-testid={`copy-${copyKey}`} title="Copia">
          {copied === copyKey ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
