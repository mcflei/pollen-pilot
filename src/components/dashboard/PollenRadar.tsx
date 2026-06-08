import type { PollenSnapshot } from '@/types';
import { indexLabel, indexColor } from '@/lib/pollenApi';

interface Props {
  data: PollenSnapshot;
}

const POLLEN_ITEMS = [
  { key: 'grass_index' as const, label: 'Grass', isMold: false },
  { key: 'tree_index' as const, label: 'Tree', isMold: false },
  { key: 'weed_index' as const, label: 'Weed', isMold: false },
  { key: 'mold_index' as const, label: 'Mold', isMold: true },
  { key: 'ragweed_index' as const, label: 'Ragweed', isMold: false },
];

export function PollenRadar({ data }: Props) {
  const pollenSource = data.source === 'mock' ? 'Demo' : 'Google';
  const aqiSource = data.aqi_source === 'airnow' ? 'AirNow'
    : data.aqi_source === 'google' ? 'Google'
    : data.source !== 'mock' ? 'Google'
    : 'Demo';

  return (
    <div className="mx-4">
      <h3 className="font-semibold text-gray-900 mb-3">Pollen radar</h3>
      <div className="grid grid-cols-3 gap-2">
        {POLLEN_ITEMS.map(({ key, label, isMold }) => {
          const index = data[key];
          return (
            <div key={key} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-1">
              <span className="text-xs text-gray-500">{label}</span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${indexColor(index)}`}>
                {indexLabel(index)}
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map(i => (
                  <div
                    key={i}
                    className={`w-2 h-2 rounded-full ${i <= index ? 'bg-current opacity-80' : 'bg-gray-200'}`}
                    style={{ color: index >= 4 ? '#EF4444' : index === 3 ? '#F59E0B' : '#5A9E6B' }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-gray-400">{isMold ? 'Est.' : pollenSource}</span>
            </div>
          );
        })}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 flex flex-col items-center gap-1">
          <span className="text-xs text-gray-500">AQI</span>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
            data.aqi <= 50 ? 'bg-green-100 text-green-800' :
            data.aqi <= 100 ? 'bg-yellow-100 text-yellow-800' :
            'bg-red-100 text-red-800'
          }`}>
            {data.aqi}
          </span>
          <span className="text-xs text-gray-400">
            {data.aqi <= 50 ? 'Good' : data.aqi <= 100 ? 'Moderate' : 'Poor'}
          </span>
          <span className="text-[10px] text-gray-400">{aqiSource}</span>
        </div>
      </div>
    </div>
  );
}
