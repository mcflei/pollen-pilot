import type { CheckIn } from '@/types';

interface Props {
  hours: number;
  quality: CheckIn['sleep_quality'];
  onHoursChange: (h: number) => void;
  onQualityChange: (q: CheckIn['sleep_quality']) => void;
}

const QUALITIES: { value: CheckIn['sleep_quality']; label: string }[] = [
  { value: 'poor', label: 'Poor' },
  { value: 'fair', label: 'Fair' },
  { value: 'good', label: 'Good' },
  { value: 'great', label: 'Great' },
];

export function SleepSection({ hours, quality, onHoursChange, onQualityChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Hours of sleep</label>
        <div className="flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={14}
            step={0.5}
            value={hours}
            onChange={e => onHoursChange(Number(e.target.value))}
            className="w-24 border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:border-sky-pilot"
          />
          <span className="text-sm text-gray-500 dark:text-gray-400">hrs</span>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Sleep quality</label>
        <div className="flex gap-2">
          {QUALITIES.map(q => (
            <button
              key={q.value}
              type="button"
              onClick={() => onQualityChange(q.value)}
              className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                quality === q.value
                  ? 'border-sky-pilot bg-sky-50 dark:bg-sky-900/40 text-sky-pilot'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300'
              }`}
            >
              {q.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
