import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, QrCode, Users, Printer } from "lucide-react";
import api, { apiErrorMessage, API } from "@/lib/api";
import { PageHeader, Card, EmptyState, Pill } from "@/components/Primitives";

export default function BarcodePrint() {
  const [classrooms, setClassrooms] = useState([]);
  const [classId, setClassId] = useState("");
  const [activeYear, setActiveYear] = useState(null);
  const [students, setStudents] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const ys = await api.get("/school-years");
        const ay = ys.data.find((y) => y.is_active);
        setActiveYear(ay);
        if (ay) {
          const cs = await api.get("/classrooms", { params: { school_year_id: ay.id } });
          setClassrooms(cs.data);
        }
      } catch (e) { toast.error(apiErrorMessage(e)); }
    })();
  }, []);

  useEffect(() => {
    (async () => {
      if (!activeYear) return;
      if (classId) {
        const s = await api.get(`/classrooms/${classId}/students`, { params: { school_year_id: activeYear.id } });
        setStudents(s.data);
      } else {
        const s = await api.get("/students");
        setStudents(s.data);
      }
    })();
  }, [classId, activeYear]);

  const downloadPdf = async () => {
    setBusy(true);
    try {
      const params = {};
      if (classId && activeYear) {
        params.classroom_id = classId;
        params.school_year_id = activeYear.id;
      }
      const token = localStorage.getItem("auth_token");
      const url = new URL(`${API}/barcodes/pdf`);
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Errore nel download");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `tesserini-${classId ? classrooms.find((c) => c.id === classId)?.name : "tutti"}.pdf`;
      a.click();
      toast.success("PDF generato");
    } catch (e) { toast.error(e.message || "Errore"); }
    finally { setBusy(false); }
  };

  return (
    <div>
      <PageHeader title="Stampa tesserini" subtitle="Genera un PDF con i barcode per check-in/out" />

      <Card className="mb-5 bg-gradient-to-br from-amber-50 via-rose-50 to-violet-50 border-amber-100">
        <div className="flex items-start gap-3">
          <QrCode className="h-6 w-6 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-display font-bold text-stone-900 mb-1">Tesserini barcode A4</p>
            <p className="text-sm text-stone-600 leading-relaxed">
              10 tesserini per pagina · barcode Code-128 stampabile · nome bambino, sezione, data di nascita.
              Tagliali e consegnali ai genitori per l'ingresso/uscita.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex gap-2 overflow-x-auto hide-scrollbar mb-5 -mx-1 px-1">
        <button onClick={() => setClassId("")}
          className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${!classId ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}>
          Tutti gli alunni
        </button>
        {classrooms.map((c) => (
          <button key={c.id} onClick={() => setClassId(c.id)}
            className={`shrink-0 h-11 px-4 rounded-full border text-sm font-semibold ${classId === c.id ? "bg-stone-900 text-white border-stone-900" : "bg-white text-stone-700 border-stone-200"}`}
            data-testid={`bc-class-${c.id}`}>
            {c.name}
          </button>
        ))}
      </div>

      <Card className="mb-5 !p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-stone-100 flex items-center justify-center"><Users className="h-5 w-5 text-stone-600" /></div>
          <div>
            <p className="font-bold text-stone-900">{students.length} alunni selezionati</p>
            <p className="text-xs text-stone-500">{classId ? classrooms.find((c) => c.id === classId)?.name : "Tutta la scuola"}</p>
          </div>
        </div>
        <button onClick={downloadPdf} disabled={busy || !students.length}
          className="h-12 px-5 rounded-2xl bg-[#FF8C6B] hover:bg-[#FF7A54] disabled:opacity-50 text-white font-semibold text-sm flex items-center gap-2"
          data-testid="download-pdf-button">
          <Download className="h-4 w-4" /> {busy ? "Generazione..." : "Scarica PDF"}
        </button>
      </Card>

      {students.length === 0 ? <EmptyState title="Nessun alunno" /> :
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {students.map((s) => (
            <Card key={s.id} className="!p-4">
              <div className="flex items-center gap-3">
                <QrCode className="h-5 w-5 text-stone-400 shrink-0" />
                <div className="min-w-0">
                  <p className="font-bold truncate">{s.first_name} {s.last_name}</p>
                  <p className="text-xs text-stone-500">{s.birth_date || ""}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      }
    </div>
  );
}
