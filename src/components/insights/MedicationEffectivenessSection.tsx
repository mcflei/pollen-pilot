import type { MedicationEffectiveness } from '@/types';

interface Props {
  data: MedicationEffectiveness[];
}

export function MedicationEffectivenessSection({ data }: Props) {
  if (data.length === 0) return null;

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-1">Medication effectiveness</h3>
      <p className="text-xs text-gray-500 mb-3">
        Average severity on days you took each medication vs. similar-pollen days without it.
      </p>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {data.map((item, i) => {
          const diff = item.mean_without - item.mean_with;
          const pct = item.mean_without > 0 ? Math.round((diff / item.mean_without) * 100) : 0;

          return (
            <div key={item.category} className={`px-4 py-3 ${i < data.length - 1 ? 'border-b border-gray-50' : ''}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-800">{item.display_name}</span>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  item.effective ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {item.effective ? `↓ ${pct}% severity` : 'No clear effect'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>With ({item.sample_size} days)</span>
                    <span>{item.mean_with}/10</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400 rounded-full"
                      style={{ width: `${(item.mean_with / 10) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Without</span>
                    <span>{item.mean_without}/10</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gray-400 rounded-full"
                      style={{ width: `${(item.mean_without / 10) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-gray-400 mt-2">
        Based on your check-in history. Not medical advice — correlation, not causation.
      </p>
    </div>
  );
}
