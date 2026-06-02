import type { CheckIn } from '@/types';
import { localDateStr, localDateOf, localDateMinusDays } from '@/lib/dateUtils';

const SEVERITY_COLORS = [
  'bg-green-200',   // 0-1
  'bg-green-300',   // 2-3
  'bg-yellow-300',  // 4-5
  'bg-orange-400',  // 6-7
  'bg-red-400',     // 8-9
  'bg-red-600',     // 10
];

const POLLEN_COLORS = [
  'bg-gray-100',    // no data
  'bg-sky-100',     // low
  'bg-sky-200',     // moderate
  'bg-sky-300',     // high
];

function severityColor(severity: number): string {
  if (severity <= 1) return SEVERITY_COLORS[0];
  if (severity <= 3) return SEVERITY_COLORS[1];
  if (severity <= 5) return SEVERITY_COLORS[2];
  if (severity <= 7) return SEVERITY_COLORS[3];
  if (severity <= 9) return SEVERITY_COLORS[4];
  return SEVERITY_COLORS[5];
}

function pollenColor(index: number): string {
  if (index === 0) return POLLEN_COLORS[0];
  if (index <= 2) return POLLEN_COLORS[1];
  if (index <= 3) return POLLEN_COLORS[2];
  return POLLEN_COLORS[3];
}

interface Props {
  checkIns: CheckIn[];
}

export function CalendarHeatmap({ checkIns }: Props) {
  const today = new Date();
  const todayStr = localDateStr(today);
  const days: { date: string; checkIn: CheckIn | null; pollenIndex: number }[] = [];

  for (let i = 59; i >= 0; i--) {
    const d = localDateMinusDays(today, i);
    const dateStr = localDateStr(d);
    const checkIn = checkIns
      .filter(c => localDateOf(c.timestamp) === dateStr && c.entry_type === 'manual')
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0] ?? null;
    const snap = checkIn?.pollen_snapshot;
    const pollenIndex = snap ? Math.round((snap.grass_index + snap.tree_index) / 2) : 0;
    days.push({ date: dateStr, checkIn, pollenIndex });
  }

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {days.map(({ date, checkIn, pollenIndex }) => {
          const isToday = date === todayStr;
          const color = checkIn
            ? severityColor(checkIn.severity)
            : pollenColor(pollenIndex);
          const label = checkIn
            ? `${date}: severity ${checkIn.severity}/10`
            : `${date}: no check-in`;

          return (
            <div
              key={date}
              title={label}
              className={`w-4 h-4 rounded-sm ${color} ${isToday ? 'ring-2 ring-gray-600 ring-offset-1' : ''} ${!checkIn ? 'opacity-60' : ''}`}
            />
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 flex-wrap">
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {SEVERITY_COLORS.map((c, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${c}`} />
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">Checked in (low → high severity)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex gap-0.5">
            {POLLEN_COLORS.map((c, i) => (
              <div key={i} className={`w-3 h-3 rounded-sm ${c} opacity-60`} />
            ))}
          </div>
          <span className="text-xs text-gray-500 ml-1">No check-in (pollen level)</span>
        </div>
      </div>
    </div>
  );
}
