import { useState, useRef, useEffect } from 'react';
import { searchMedications, categoryLabel } from '@/lib/medicationDb';
import type { MedicationEntry } from '@/types';

interface Props {
  medications: MedicationEntry[];
  onChange: (meds: MedicationEntry[]) => void;
}

export function MedicationSearch({ medications, onChange }: Props) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<MedicationEntry[]>([]);
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (query.length >= 2) {
      setResults(searchMedications(query));
      setOpen(true);
    } else {
      setResults([]);
      setOpen(false);
    }
  }, [query]);

  function addMed(med: MedicationEntry) {
    if (!medications.find(m => m.matched_name === med.matched_name)) {
      onChange([...medications, med]);
    }
    setQuery('');
    setOpen(false);
  }

  function addRaw() {
    if (query.trim()) {
      onChange([...medications, {
        raw_input: query.trim(),
        matched_name: null,
        generic: null,
        category: 'other',
        dose_form: null,
        confidence: 0,
      }]);
      setQuery('');
      setOpen(false);
    }
  }

  function remove(i: number) {
    onChange(medications.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Medication taken today</label>

      {medications.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {medications.map((m, i) => (
            <div key={i} className="flex items-center gap-1 bg-sky-50 dark:bg-sky-900/40 border border-sky-200 dark:border-sky-700 rounded-full px-3 py-1 text-xs text-sky-800 dark:text-sky-200">
              <span>{m.matched_name ?? m.raw_input}</span>
              <button onClick={() => remove(i)} className="text-sky-400 hover:text-red-500 ml-1">×</button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addRaw(); } }}
          placeholder="Search medications (e.g. Flonase, Zyrtec, Benadryl)"
          className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-sky-pilot"
        />

        {open && results.length > 0 && (
          <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl shadow-lg overflow-hidden">
            {results.map((r, i) => (
              <button
                key={i}
                type="button"
                onClick={() => addMed(r)}
                className="w-full text-left px-4 py-2.5 hover:bg-sky-50 dark:hover:bg-sky-900/30 flex items-center justify-between gap-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <div>
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100">{r.matched_name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{r.generic}</span>
                </div>
                <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full shrink-0">
                  {r.dose_form}
                </span>
              </button>
            ))}
            {query.trim() && (
              <button
                type="button"
                onClick={addRaw}
                className="w-full text-left px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Add "{query}" as-is
              </button>
            )}
          </div>
        )}
      </div>

      {medications.length > 0 && medications.some(m => m.category !== null) && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">
          {medications.filter(m => m.category !== null).map(m => categoryLabel(m.category)).join(', ')}
        </div>
      )}
    </div>
  );
}
