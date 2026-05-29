import type { SymptomSourceFlag } from '@/types';

interface Props {
  flags: SymptomSourceFlag[];
}

export function SymptomSourceCheck({ flags }: Props) {
  if (flags.length === 0) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
      <div className="flex items-start gap-2 mb-2">
        <span className="text-blue-500 text-lg shrink-0">ℹ️</span>
        <div>
          <div className="font-semibold text-blue-900 text-sm">Symptom source check</div>
          <div className="text-xs text-blue-700 mt-0.5">
            {flags.length === 1 ? '1 day' : `${flags.length} days`} where symptoms were elevated but pollen levels were low
          </div>
        </div>
      </div>

      <p className="text-sm text-blue-800 mb-3">
        Your symptoms were elevated on {flags.length === 1 ? 'a day' : 'some days'} when pollen levels were low across the board.
        This may mean symptoms had a different cause — a cold, indoor allergens, poor sleep, or something else.
        Pollen Pilot does not diagnose. If symptoms persist, it may be worth checking in with a healthcare provider.
      </p>

      <div className="space-y-1">
        {flags.map((f, i) => (
          <div key={i} className="text-xs text-blue-700 flex gap-3">
            <span className="font-medium">{f.date}</span>
            <span>Severity {f.severity}/10</span>
            <span>Pollen total: {f.pollen_sum}/20</span>
            <span>AQI: {f.aqi}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
