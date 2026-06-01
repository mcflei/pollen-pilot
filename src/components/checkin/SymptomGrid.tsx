import type { SymptomKey } from '@/types';

interface Props {
  selected: SymptomKey[];
  onChange: (s: SymptomKey[]) => void;
}

const SYMPTOMS: { key: SymptomKey; label: string; emoji: string }[] = [
  { key: 'sneezing', label: 'Sneezing', emoji: '🤧' },
  { key: 'itchy_eyes', label: 'Itchy eyes', emoji: '👁️' },
  { key: 'congestion', label: 'Congestion', emoji: '😤' },
  { key: 'watery_eyes', label: 'Watery eyes', emoji: '💧' },
  { key: 'coughing', label: 'Coughing', emoji: '😮‍💨' },
  { key: 'headache', label: 'Headache', emoji: '🤕' },
  { key: 'fatigue', label: 'Fatigue', emoji: '😴' },
  { key: 'throat_irritation', label: 'Throat irritation', emoji: '🤒' },
];

export function SymptomGrid({ selected, onChange }: Props) {
  function toggle(key: SymptomKey) {
    if (selected.includes(key)) {
      onChange(selected.filter(s => s !== key));
    } else {
      onChange([...selected, key]);
    }
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Symptoms today</label>
      <div className="grid grid-cols-2 gap-2">
        {SYMPTOMS.map(s => (
          <button
            key={s.key}
            type="button"
            onClick={() => toggle(s.key)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-all ${
              selected.includes(s.key)
                ? 'border-sky-pilot bg-sky-50 dark:bg-sky-900/40 text-sky-pilot'
                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
            }`}
          >
            <span>{s.emoji}</span>
            <span>{s.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
