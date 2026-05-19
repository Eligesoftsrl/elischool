import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle2, ArrowLeft, Heart, Sparkles, Send } from "lucide-react";
import { toast } from "sonner";
import api, { apiErrorMessage } from "@/lib/api";

const empty = {
  student_first_name: "", student_last_name: "", student_birth_date: "",
  parent_first_name: "", parent_last_name: "", parent_email: "", parent_phone: "",
  address: "", notes: "",
};

export default function PublicEnrollment() {
  const [form, setForm] = useState(empty);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [school, setSchool] = useState(null);

  useEffect(() => {
    (async () => { try { const { data } = await api.get("/public/school-profile"); setSchool(data); } catch (_) {} })();
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/public/enrollment-requests", form);
      setDone(true);
    } catch (err) { toast.error(apiErrorMessage(err)); }
    finally { setBusy(false); }
  };

  if (done) {
    return (
      <div className="min-h-screen bg-[#FDFBF7] flex items-center justify-center px-5 py-10">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          className="max-w-md text-center bg-white rounded-[2rem] p-8 tactile border border-stone-200">
          <div className="h-20 w-20 rounded-3xl bg-gradient-to-br from-emerald-100 to-emerald-200 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="h-10 w-10 text-emerald-600" />
          </div>
          <h1 className="font-display text-3xl font-bold mb-2">Richiesta inviata!</h1>
          <p className="text-stone-600 leading-relaxed mb-6">
            Grazie {form.parent_first_name}. La direzione di <b>{school?.name || "scuola"}</b> ha ricevuto la tua richiesta di iscrizione per <b>{form.student_first_name} {form.student_last_name}</b>.
            Ti contatteremo a breve via email per i passi successivi.
          </p>
          <Link to="/" className="inline-block h-12 px-6 rounded-2xl bg-stone-900 text-white font-semibold leading-[3rem] tap-press">
            Torna alla home
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFBF7] relative overflow-hidden">
      <div className="pointer-events-none absolute -top-32 -left-24 h-96 w-96 rounded-full bg-[#FFB38A]/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-[#A2D2FF]/30 blur-3xl" />

      <div className="relative max-w-2xl mx-auto px-5 py-10">
        <Link to="/" className="inline-flex items-center text-sm text-stone-500 hover:text-brand mb-6">
          <ArrowLeft className="h-4 w-4 mr-1" /> Torna alla home
        </Link>

        <div className="mb-8">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 backdrop-blur border border-stone-200 text-xs font-semibold text-stone-600 mb-4">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" /> Iscrizione anno scolastico
          </span>
          <h1 className="font-display text-4xl md:text-5xl font-bold tracking-tight text-stone-900 leading-tight">
            Iscrivi tuo figlio<br /><span className="text-brand">in pochi minuti</span>
          </h1>
          <p className="mt-3 text-stone-600 leading-relaxed">
            Compila il modulo. La direzione valuterà la richiesta e ti contatterà via email per completare l'iscrizione.
          </p>
        </div>

        <form onSubmit={submit} className="bg-white/90 backdrop-blur border border-stone-200 rounded-[2rem] p-6 tactile space-y-5"
          data-testid="enrollment-form">
          <section>
            <p className="text-xs uppercase tracking-wider font-bold text-stone-400 mb-3 flex items-center gap-1.5">
              <Heart className="h-3 w-3 text-brand" /> Il bambino / la bambina
            </p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome"><Input value={form.student_first_name} onChange={(v) => setForm({ ...form, student_first_name: v })} required testid="enr-student-first" /></Field>
              <Field label="Cognome"><Input value={form.student_last_name} onChange={(v) => setForm({ ...form, student_last_name: v })} required testid="enr-student-last" /></Field>
              <Field label="Data di nascita" full><Input type="date" value={form.student_birth_date} onChange={(v) => setForm({ ...form, student_birth_date: v })} required testid="enr-birth" /></Field>
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-wider font-bold text-stone-400 mb-3">Genitore di riferimento</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="Nome"><Input value={form.parent_first_name} onChange={(v) => setForm({ ...form, parent_first_name: v })} required testid="enr-parent-first" /></Field>
              <Field label="Cognome"><Input value={form.parent_last_name} onChange={(v) => setForm({ ...form, parent_last_name: v })} required testid="enr-parent-last" /></Field>
              <Field label="Email"><Input type="email" value={form.parent_email} onChange={(v) => setForm({ ...form, parent_email: v })} required testid="enr-email" /></Field>
              <Field label="Telefono"><Input value={form.parent_phone} onChange={(v) => setForm({ ...form, parent_phone: v })} testid="enr-phone" /></Field>
              <Field label="Indirizzo di residenza" full><Input value={form.address} onChange={(v) => setForm({ ...form, address: v })} testid="enr-address" /></Field>
            </div>
          </section>

          <section>
            <p className="text-xs uppercase tracking-wider font-bold text-stone-400 mb-3">Note (opzionali)</p>
            <textarea rows={4} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Eventuali allergie, intolleranze, esigenze particolari…"
              className="w-full px-4 py-3 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
              data-testid="enr-notes" />
          </section>

          <button type="submit" disabled={busy}
            className="w-full h-14 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] disabled:opacity-50 text-white font-semibold text-base tap-press flex items-center justify-center gap-2"
            data-testid="enr-submit">
            <Send className="h-5 w-5" /> {busy ? "Invio…" : "Invia richiesta"}
          </button>

          <p className="text-xs text-stone-500 text-center">
            I dati saranno trattati con riservatezza dalla direzione di {school?.name || "scuola"}.
          </p>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children, full }) {
  return <label className={`block ${full ? "sm:col-span-2" : ""}`}>
    <span className="text-xs font-bold uppercase tracking-wider text-stone-500">{label}</span>
    <div className="mt-1">{children}</div>
  </label>;
}
function Input({ value, onChange, type = "text", required, testid }) {
  return <input type={type} required={required} value={value} onChange={(e) => onChange(e.target.value)}
    className="w-full h-12 px-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30" data-testid={testid} />;
}
