import type { PollenSnapshot } from '@/types';
import { getPollenCache, savePollenCache, isPollenCacheFresh } from './storage';

interface TomorrowValues {
  treeIndex?: number;
  grassIndex?: number;
  weedIndex?: number;
  moldIndex?: number;
  temperature?: number;
  humidity?: number;
  windSpeed?: number;
  precipitationIntensity?: number;
  epaIndex?: number;
}

interface TomorrowResponse {
  data: {
    timelines: {
      intervals: {
        startTime: string;
        values: TomorrowValues;
      }[];
    }[];
  };
}

export async function reverseGeocode(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=10`,
      { headers: { 'Accept-Language': 'en' } }
    );
    const data = await res.json() as {
      address?: {
        city?: string;
        municipality?: string;
        town?: string;
        village?: string;
        suburb?: string;
        hamlet?: string;
        county?: string;
      };
    };
    const a = data.address;
    return (
      a?.city ??
      a?.municipality ??
      a?.town ??
      a?.village ??
      a?.suburb ??
      a?.hamlet ??
      a?.county ??
      'Your location'
    );
  } catch {
    return 'Your location';
  }
}

export function getMockPollenData(date: string): PollenSnapshot {
  const month = new Date(date).getMonth();
  // Raleigh NC seasonal variation
  const isSpring = month >= 2 && month <= 5;
  const isSummer = month >= 6 && month <= 8;
  const isFall = month >= 9 && month <= 10;

  return {
    date,
    location: { lat: 35.7796, lng: -78.6382, city: 'Raleigh, NC' },
    grass_index: isSpring ? 4 : isSummer ? 3 : isFall ? 1 : 0,
    tree_index: isSpring ? 5 : isSummer ? 1 : isFall ? 0 : 1,
    weed_index: isSpring ? 2 : isSummer ? 3 : isFall ? 4 : 1,
    mold_index: isSummer ? 3 : isSpring ? 2 : 1,
    ragweed_index: isFall ? 4 : isSummer ? 2 : 0,
    temperature_f: isSpring ? 68 : isSummer ? 88 : isFall ? 62 : 45,
    humidity_pct: isSummer ? 78 : isSpring ? 65 : 55,
    wind_mph: 8,
    precip_intensity: 0,
    aqi: isSpring ? 52 : isSummer ? 65 : 38,
    source: 'mock',
  };
}

async function fetchFromTomorrow(
  lat: number,
  lng: number,
  city: string
): Promise<PollenSnapshot> {
  const apiKey = import.meta.env.VITE_TOMORROW_IO_API_KEY as string | undefined;
  if (!apiKey) return getMockPollenData(new Date().toISOString().slice(0, 10));

  const url =
    `https://api.tomorrow.io/v4/timelines` +
    `?location=${lat},${lng}` +
    `&fields=treeIndex,grassIndex,weedIndex,moldIndex,temperature,humidity,windSpeed,precipitationIntensity,epaIndex` +
    `&timesteps=1d` +
    `&units=imperial` +
    `&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tomorrow.io error ${res.status}`);

  const data = await res.json() as TomorrowResponse;
  const interval = data.data.timelines[0]?.intervals[0];
  const v = interval?.values ?? {};
  const date = (interval?.startTime ?? new Date().toISOString()).slice(0, 10);

  return {
    date,
    location: { lat, lng, city },
    grass_index: v.grassIndex ?? 0,
    tree_index: v.treeIndex ?? 0,
    weed_index: v.weedIndex ?? 0,
    mold_index: v.moldIndex ?? 0,
    ragweed_index: v.weedIndex ?? 0,
    temperature_f: v.temperature ?? 70,
    humidity_pct: v.humidity ?? 50,
    wind_mph: v.windSpeed ?? 5,
    precip_intensity: v.precipitationIntensity ?? 0,
    aqi: v.epaIndex ?? 40,
    source: 'tomorrow_io',
  };
}

export async function getPollenData(
  lat: number,
  lng: number,
  city: string
): Promise<PollenSnapshot> {
  if (isPollenCacheFresh()) {
    const cached = getPollenCache();
    if (cached) return cached.data;
  }

  try {
    const snapshot = await fetchFromTomorrow(lat, lng, city);
    savePollenCache({ data: snapshot, fetched_at: new Date().toISOString() });
    return snapshot;
  } catch {
    const fallback = getMockPollenData(new Date().toISOString().slice(0, 10));
    fallback.location = { lat, lng, city };
    savePollenCache({ data: fallback, fetched_at: new Date().toISOString() });
    return fallback;
  }
}

export function indexLabel(index: number): 'None' | 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High' {
  if (index === 0) return 'None';
  if (index === 1) return 'Very Low';
  if (index === 2) return 'Low';
  if (index === 3) return 'Moderate';
  if (index === 4) return 'High';
  return 'Very High';
}

export function indexColor(index: number): string {
  if (index <= 1) return 'bg-green-100 text-green-800';
  if (index === 2) return 'bg-blue-100 text-blue-800';
  if (index === 3) return 'bg-yellow-100 text-yellow-800';
  if (index === 4) return 'bg-orange-100 text-orange-800';
  return 'bg-red-100 text-red-800';
}
