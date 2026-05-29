import type { TriggerAssociation } from '@/types';

interface Props {
  associations: TriggerAssociation[];
  checkInCount: number;
}

export function TriggerMap({ associations, checkInCount }: Props) {
  const top3 = associations.slice(0, 3).filter(a => a.strength > 0);

  if (checkInCount < 7) {
    return (
      <div className="mx-4">
        <h3 className="font-semibold text-gray-900 mb-3">Your trigger map</h3>
        <div className="bg-sky-50 rounded-xl p-4 text-center">
          <div className="text-2xl mb-2">🔍</div>
          <div className="text-sm text-gray-600">
            Pollen Pilot is building your trigger map. Keep logging — it takes about 7 check-ins to start seeing patterns.
          </div>
          <div className="mt-2 text-xs text-sky-pilot font-medium">
            {checkInCount}/7 check-ins logged
          </div>
        </div>
      </div>
    );
  }

  if (top3.length === 0) {
    return (
      <div className="mx-4">
        <h3 className="font-semibold text-gray-900 mb-3">Your trigger map</h3>
        <div className="bg-green-50 rounded-xl p-4 text-sm text-gray-600 text-center">
          No strong triggers detected yet. Keep logging and patterns will emerge.
        </div>
      </div>
    );
  }

  return (
    <div className="mx-4">
      <h3 className="font-semibold text-gray-900 mb-1">Your trigger map</h3>
      <p className="text-xs text-gray-500 mb-3">
        Factors that may be associated with your symptoms based on past check-ins.
      </p>
      <div className="space-y-3">
        {top3.map((a) => (
          <div key={a.trigger}>
            <div className="flex justify-between text-sm mb-1">
              <span className="font-medium text-gray-800">{a.label}</span>
              <span className="text-gray-500 text-xs">{Math.round(a.confidence * 100)}% confidence</span>
            </div>
            <div className="bg-gray-100 rounded-full h-2">
              <div
                className="h-2 rounded-full bg-sky-pilot transition-all"
                style={{ width: `${Math.round(a.strength * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
