// Italian localised formatters. All functions tolerate null/undefined/invalid inputs
// and return empty string so UI never breaks.

const _parse = (v) => {
  if (!v) return null;
  if (v instanceof Date) return isNaN(v) ? null : v;
  // ISO "YYYY-MM-DD" (date only) → treat as local to avoid TZ shift (shows yesterday).
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [y, m, d] = v.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(v);
  return isNaN(d) ? null : d;
};

const pad = (n) => String(n).padStart(2, "0");

/** DD/MM/YYYY */
export const fmtDate = (v) => {
  const d = _parse(v);
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

/** DD/MM/YYYY HH:MM */
export const fmtDateTime = (v) => {
  const d = _parse(v);
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** DD MMM YYYY (es. 12 ott 2026) — formato corto leggibile */
const MESI_SHORT = ["gen","feb","mar","apr","mag","giu","lug","ago","set","ott","nov","dic"];
export const fmtDateShort = (v) => {
  const d = _parse(v);
  if (!d) return "";
  return `${pad(d.getDate())} ${MESI_SHORT[d.getMonth()]} ${d.getFullYear()}`;
};

/** DD MMMM YYYY esteso (es. 12 ottobre 2026) */
const MESI_LONG = ["gennaio","febbraio","marzo","aprile","maggio","giugno","luglio","agosto","settembre","ottobre","novembre","dicembre"];
export const fmtDateLong = (v) => {
  const d = _parse(v);
  if (!d) return "";
  return `${d.getDate()} ${MESI_LONG[d.getMonth()]} ${d.getFullYear()}`;
};

/** HH:MM */
export const fmtTime = (v) => {
  const d = _parse(v);
  if (!d) return "";
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Età in anni + mesi dalla data di nascita */
export const fmtAge = (birth) => {
  const b = _parse(birth);
  if (!b) return "";
  const now = new Date();
  let years = now.getFullYear() - b.getFullYear();
  let months = now.getMonth() - b.getMonth();
  if (now.getDate() < b.getDate()) months -= 1;
  if (months < 0) { years -= 1; months += 12; }
  if (years <= 0) return `${Math.max(0, months)} mesi`;
  return months > 0 ? `${years} anni e ${months} mesi` : `${years} anni`;
};
