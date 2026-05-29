import type { RiskCategory } from '@/types';

interface Props {
  category: RiskCategory;
}

const RECS: Record<RiskCategory, string[]> = {
  clear: [
    'Conditions look good today — a great time to get outside if you have been waiting for a clear window.',
    'Your personalized risk is low and none of your usual triggers are elevated.',
    'Enjoy the weather while pollen risk is on your side.',
  ],
  light: [
    'Conditions look favorable today — enjoy outdoor time if it suits your plans.',
    'Pollen levels are light, though it is worth keeping sunglasses on hand.',
    'Stay hydrated and rinse off after extended time outside.',
  ],
  turbulence: [
    'If you plan to be outside for more than an hour, consider taking medication beforehand.',
    'Peak pollen hours are usually mid-morning — later afternoon may be a better time for outdoor activity.',
    'Sunglasses and rinsing off afterward are good habits on days like today.',
  ],
  high: [
    'Take allergy medication before going outside, if that is part of your routine.',
    'Keep windows closed during morning hours when grass pollen peaks.',
    'Rinse off after being outside — pollen sticks to hair and skin.',
    'Wear sunglasses to reduce pollen contact with your eyes.',
    'Consider moving outdoor exercise indoors today.',
    'Check tomorrow\'s forecast before planning outdoor activity.',
  ],
};

export function Recommendations({ category }: Props) {
  return (
    <div className="mx-4">
      <h3 className="font-semibold text-gray-900 mb-1">Course corrections</h3>
      <p className="text-xs text-gray-500 mb-3">Good pollen practices for days like today</p>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 space-y-2">
        {RECS[category].map((rec, i) => (
          <div key={i} className="flex gap-2 text-sm text-gray-700">
            <span className="text-sky-pilot shrink-0">•</span>
            <span>{rec}</span>
          </div>
        ))}
        <div className="pt-2 border-t border-gray-100 text-xs text-gray-400">
          These are general practices, not medical advice. Always follow guidance from your healthcare provider.
        </div>
      </div>
    </div>
  );
}
