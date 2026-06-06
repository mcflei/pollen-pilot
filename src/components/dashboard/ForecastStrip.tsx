import type { ForecastDay } from '@/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_STYLES = {
  clear:      { bg: 'bg-green-50',  border: 'border-green-200', dot: 'bg-green-500',  label: 'Clear',      text: 'text-green-700' },
  light:      { bg: 'bg-blue-50',   border: 'border-blue-200',  dot: 'bg-blue-400',   label: 'Light',      text: 'text-blue-700' },
  turbulence: { bg: 'bg-amber-50',  border: 'border-amber-200', dot: 'bg-amber-500',  label: 'Moderate',   text: 'text-amber-700' },
  high:       { bg: 'bg-red-50',    border: 'border-red-200',   dot: 'bg-red-500',    label: 'High',       text: 'text-red-700' },
};

interface Props {
  forecast: ForecastDay[];
}

export function ForecastStrip({ forecast }: Props) {
  if (forecast.length === 0) return null;

  const isDemo = forecast[0]?.snapshot.source === 'mock';

  return (
    <div className="mx-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide">3-Day Forecast</h3>
        {isDemo && (
          <span className="text-[10px] font-medium text-amber-500 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5">
            Demo data
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2">
        {forecast.map(day => {
          const styles = CATEGORY_STYLES[day.category];
          const d = new Date(day.date + 'T12:00:00');
          const dayName = DAY_NAMES[d.getDay()];
          const snap = day.snapshot;

          return (
            <div
              key={day.date}
              className={`rounded-xl border p-3 ${styles.bg} ${styles.border}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-gray-600">{dayName}</span>
                <div className={`w-2 h-2 rounded-full ${styles.dot}`} />
              </div>
              <div className={`text-sm font-bold ${styles.text} mb-1`}>{styles.label}</div>
              <div className="text-xs text-gray-500 space-y-0.5">
                <div>🌿 Grass {snap.grass_index}/5</div>
                <div>🌳 Tree {snap.tree_index}/5</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
