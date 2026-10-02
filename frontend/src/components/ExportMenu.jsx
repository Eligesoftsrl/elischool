import { useState, useRef, useEffect } from "react";
import { Download, FileText, FileSpreadsheet, Table } from "lucide-react";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

/**
 * Esporta un dataset tabellare in CSV / Excel / PDF.
 *
 * Props:
 *  - data: array di oggetti riga
 *  - columns: [{ key, label, format?: (row) => string }]
 *  - filename: base del file (senza estensione)
 *  - title: titolo da stampare in cima al PDF (opz.)
 *  - testid: prefix per i data-testid (opz.)
 */
export function ExportMenu({ data, columns, filename = "export", title, testid = "export" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const rows = (data || []).map((r) =>
    columns.map((c) => (c.format ? c.format(r) : (r?.[c.key] ?? "")))
  );
  const headers = columns.map((c) => c.label);
  const disabled = !data || data.length === 0;

  const exportCSV = () => {
    const escape = (v) => {
      const s = String(v ?? "");
      return /[,;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const csv = [headers.map(escape).join(";"), ...rows.map((r) => r.map(escape).join(";"))].join("\n");
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    triggerDownload(blob, `${filename}.csv`);
    setOpen(false);
  };

  const exportXLSX = () => {
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    // auto column width
    const colWidths = headers.map((h, i) => {
      const maxLen = Math.max(
        String(h || "").length,
        ...rows.map((r) => String(r[i] ?? "").length)
      );
      return { wch: Math.min(60, Math.max(10, maxLen + 2)) };
    });
    ws["!cols"] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, filename.slice(0, 28));
    XLSX.writeFile(wb, `${filename}.xlsx`);
    setOpen(false);
  };

  const exportPDF = () => {
    const doc = new jsPDF({ orientation: columns.length > 5 ? "landscape" : "portrait", unit: "pt", format: "a4" });
    const now = new Date();
    const date = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()}`;
    doc.setFontSize(14);
    doc.setTextColor(28, 25, 23);
    doc.text(title || filename, 40, 40);
    doc.setFontSize(9);
    doc.setTextColor(120, 113, 108);
    doc.text(`Esportato il ${date} · ${data.length} righe`, 40, 56);
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: 72,
      styles: { fontSize: 9, cellPadding: 5, textColor: [28, 25, 23] },
      headStyles: { fillColor: [255, 140, 107], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [252, 250, 247] },
      margin: { left: 40, right: 40 },
    });
    doc.save(`${filename}.pdf`);
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        disabled={disabled}
        className="h-12 px-4 rounded-2xl bg-white border border-stone-200 hover:bg-stone-50 text-stone-800 font-semibold text-sm flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        data-testid={`${testid}-trigger`}
        title={disabled ? "Nessun dato da esportare" : "Esporta"}
      >
        <Download className="h-4 w-4" /> Esporta
      </button>
      {open && !disabled && (
        <div
          className="absolute right-0 top-14 z-30 w-56 rounded-2xl bg-white border border-stone-200 shadow-lg overflow-hidden"
          data-testid={`${testid}-menu`}
        >
          <MenuItem icon={<Table className="h-4 w-4 text-emerald-600" />} label="CSV (.csv)" onClick={exportCSV} testid={`${testid}-csv`} />
          <MenuItem icon={<FileSpreadsheet className="h-4 w-4 text-green-700" />} label="Excel (.xlsx)" onClick={exportXLSX} testid={`${testid}-xlsx`} />
          <MenuItem icon={<FileText className="h-4 w-4 text-rose-600" />} label="PDF (.pdf)" onClick={exportPDF} testid={`${testid}-pdf`} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon, label, onClick, testid }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-4 py-3 flex items-center gap-3 text-sm font-medium text-stone-800 hover:bg-stone-50 text-left"
      data-testid={testid}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function triggerDownload(blob, name) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
