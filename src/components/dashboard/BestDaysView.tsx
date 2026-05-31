import type { ForecastDay } from '@/types';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const CATEGORY_CONFIG = {
  clear:      { label: 'Clear',    emoji: '☀️',  bar: 'bg-green-400', text: 'text-green-700' },
  light:      { label: 'Light',    emoji: '🌤️',  bar: 'bg-blue-400',  text: 'text-blue-700' },
  turbulence: { label: 'Moderate', emoji: '⛅',  bar: 'bg-amber-400', text: 'text-amber-700' },
  high:       { label: 'High',     emoji: '⛈️',  bar: 'bg-red-400',   text: 'text-red-700' },
};

interface Props {
  forecast: ForecastDay[];
}

export function BestDaysView({ forecast }: Props) {
  if (forecast.length === 0) return null;

  const sorted = [...forecast].sort((a, b) => a.score - b.score);

  return (
    <div className="mx-4">
      <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">Best Days This Week</h3>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {sorted.map((day, rank) => {
          const d = new Date(day.date + 'T12:00:00');
          const dayName = DAY_NAMES[d.getDay()];
          const cfg = CATEGORY_CONFIG[day.category];

          return (
            <div key={day.date} className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-0">
              <span className="text-xs font-bold text-gray-400 w-4">{rank + 1}</span>
              <span className="text-lg leading-none">{cfg.emoji}</span>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium text-gray-800">{dayName}</span>
                  <span className={`text-xs font-semibold ${cfg.text}`}>{cfg.label}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cfg.bar}`} style={{ width: `${day.score}%` }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
