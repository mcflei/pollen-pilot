import type { PollenSnapshot } from '@/types';

interface Props {
  data: PollenSnapshot;
}

function aqiLabel(aqi: number): string {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for sensitive';
  return 'Unhealthy';
}

function skyCondition(humidity: number, precip: number): string {
  if (precip > 0.1) return '🌧️ Rain';
  if (humidity > 80) return '☁️ Cloudy';
  if (humidity > 60) return '⛅ Partly cloudy';
  return '☀️ Clear';
}

export function WeatherStrip({ data }: Props) {
  const aqiDemo = data.aqi_source === 'mock';
  const weatherDemo = data.source === 'mock';

  const items = [
    { label: 'Temp', value: `${Math.round(data.temperature_f)}°F`, demo: weatherDemo },
    { label: 'Humidity', value: `${Math.round(data.humidity_pct)}%`, demo: weatherDemo },
    { label: 'Wind', value: `${Math.round(data.wind_mph)} mph`, demo: weatherDemo },
    { label: 'AQI', value: `${data.aqi} ${aqiLabel(data.aqi)}`, demo: aqiDemo },
    { label: 'Sky', value: skyCondition(data.humidity_pct, data.precip_intensity), demo: weatherDemo },
  ];

  return (
    <div className="mx-4 bg-sky-50 rounded-xl px-4 py-3 flex gap-3 overflow-x-auto">
      {items.map(item => (
        <div key={item.label} className="flex flex-col items-center min-w-[60px]">
          <span className="text-xs text-gray-500">{item.label}</span>
          <span className="text-xs font-semibold text-gray-900 text-center">{item.value}</span>
          {item.demo && <span className="text-[10px] text-amber-500 font-medium">demo</span>}
        </div>
      ))}
    </div>
  );
}
