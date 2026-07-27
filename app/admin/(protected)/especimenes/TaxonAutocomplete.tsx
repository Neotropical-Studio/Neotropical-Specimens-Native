'use client';

// Autocompletado en cascada Familia → Subfamilia → Género → Especie (Sección
// 1). Cada nivel se restringe al padre ya elegido (parentId). Si el usuario
// no elige una sugerencia, el valor escrito se envía como texto libre — el
// server action decide entre reutilizar el taxón de Sanity (por sanityId) o
// crear una fila de taxonomía Supabase-only (ver lib/sync/resolveTaxonomy.ts).
import { useEffect, useRef, useState } from 'react';
import { inputClass } from '@/components/admin/FormField';

export interface TaxonPick {
  value: string;
  sanityId?: string;
}

interface Suggestion {
  _id: string;
  name: string;
}

interface Props {
  rank: 'familia' | 'subfamilia' | 'genero' | 'especie';
  label: string;
  parentId?: string;
  value: TaxonPick;
  onChange: (pick: TaxonPick) => void;
}

export default function TaxonAutocomplete({ rank, label, parentId, value, onChange }: Props) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!value.value || value.value.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const params = new URLSearchParams({ rank, q: value.value.trim() });
      if (parentId) params.set('parentId', parentId);
      try {
        const res = await fetch(`/api/admin/taxon-search?${params.toString()}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data.results) ? data.results : []);
      } catch {
        setSuggestions([]);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value.value, parentId, rank]);

  return (
    <div className="relative flex flex-col gap-1">
      <label className="text-xs font-medium uppercase tracking-wide text-neutral-400">{label}</label>
      <input
        type="text"
        className={inputClass}
        value={value.value}
        onChange={(e) => {
          onChange({ value: e.target.value, sanityId: undefined });
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={`Buscar o escribir ${label.toLowerCase()}…`}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute top-full z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-neutral-700 bg-neutral-900 shadow-lg">
          {suggestions.map((s) => (
            <li key={s._id}>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange({ value: s.name, sanityId: s._id });
                  setSuggestions([]);
                  setOpen(false);
                }}
                className="block w-full px-3 py-1.5 text-left text-sm text-neutral-200 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                {s.name}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value.sanityId ? (
        <p className="text-xs text-emerald-500">✓ Coincide con Sanity</p>
      ) : value.value ? (
        <p className="text-xs text-amber-500">Texto libre (aún no existe en Sanity)</p>
      ) : null}
    </div>
  );
}
