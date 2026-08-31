import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import api from "@/lib/api";

/**
 * Italian comune autocomplete field.
 * Fetches from /api/public/comuni?q=... with debounce.
 * Uses a real <input> with data-testid so testing agent can drive typing directly.
 */
export function ComuniAutocomplete({ value, onChange, required, testid = "comuni-input", placeholder = "Milano" }) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef(null);
  const tRef = useRef(null);

  useEffect(() => { setQ(value || ""); }, [value]);

  useEffect(() => {
    if (tRef.current) clearTimeout(tRef.current);
    if (!q || q.length < 2) { setSuggestions([]); return; }
    tRef.current = setTimeout(async () => {
      try {
        const { data } = await api.get("/public/comuni", { params: { q } });
        setSuggestions(data || []);
        setHighlight(0);
      } catch (_) { setSuggestions([]); }
    }, 180);
    return () => clearTimeout(tRef.current);
  }, [q]);

  useEffect(() => {
    const onClick = (e) => { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const pick = (c) => {
    const label = c.sigla ? `${c.nome} (${c.sigla})` : c.nome;
    setQ(label);
    onChange(label);
    setOpen(false);
    setSuggestions([]);
  };

  const onKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(h + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") {
      // Only prevent submit if a real suggestion is selected
      const c = suggestions[highlight];
      if (c) { e.preventDefault(); pick(c); }
    } else if (e.key === "Escape") { setOpen(false); }
  };

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          required={required}
          value={q}
          onChange={(e) => { setQ(e.target.value); onChange(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="w-full h-12 pl-10 pr-4 rounded-2xl bg-stone-50 border border-stone-200 focus:outline-none focus:ring-2 focus:ring-brand/30"
          data-testid={testid}
        />
      </div>
      {open && suggestions.length > 0 && (
        <ul
          className="absolute z-30 top-full mt-1 left-0 right-0 max-h-60 overflow-auto rounded-2xl bg-white shadow-xl border border-stone-200 py-1"
          data-testid={`${testid}-list`}
        >
          {suggestions.map((c, i) => (
            <li
              key={`${c.nome}-${c.sigla}`}
              onMouseDown={(e) => { e.preventDefault(); pick(c); }}
              onMouseEnter={() => setHighlight(i)}
              className={`px-4 py-2.5 cursor-pointer flex items-center justify-between gap-3 text-sm ${i === highlight ? "bg-brand/10 text-stone-900" : "text-stone-700 hover:bg-stone-50"}`}
              data-testid={`${testid}-option-${i}`}
            >
              <span className="font-medium">{c.nome}</span>
              <span className="text-xs text-stone-500">&middot; {c.sigla} &middot; {c.cap}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
