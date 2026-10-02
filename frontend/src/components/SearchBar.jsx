import { Search as SearchIcon, X } from "lucide-react";

/**
 * Barra di ricerca stile "Alunni" riusabile.
 * Props:
 *  - value, onChange
 *  - placeholder (default "Cerca…")
 *  - testid prefix (default "search")
 *  - right: nodi opzionali a destra (es. filtri)
 */
export function SearchBar({ value, onChange, placeholder = "Cerca…", testid = "search", right }) {
  return (
    <div className="mb-5 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
      <div className="relative flex-1">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400 pointer-events-none" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full h-12 pl-11 pr-11 rounded-2xl bg-white border border-stone-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-brand/30 placeholder:text-stone-400"
          data-testid={`${testid}-input`}
        />
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-stone-100 hover:bg-stone-200 flex items-center justify-center text-stone-500"
            data-testid={`${testid}-clear`}
            aria-label="Pulisci ricerca"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {right}
    </div>
  );
}
