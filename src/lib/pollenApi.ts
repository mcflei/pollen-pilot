import type { PollenSnapshot } from '@/types';
import { getPollenCache, savePollenCache, isPollenCacheFresh } from './storage';

// ── Tomorrow.io (weather only) ───────────────────────────────────────────────

interface TomorrowResponse {
  data: {
    timelines: {
      intervals: {
        startTime: string;
        values: {
          temperature?: number;
          humidity?: number;
          windSpeed?: number;
          precipitationIntensity?: number;
        };
      }[];
    }[];
  };
}

async function fetchWeather(lat: number, lng: number): Promise<{
  temperature_f: number;
  humidity_pct: number;
  wind_mph: number;
  precip_intensity: number;
}> {
  const apiKey = import.meta.env.VITE_TOMORROW_IO_API_KEY as string | undefined;
  if (!apiKey) return { temperature_f: 70, humidity_pct: 50, wind_mph: 5, precip_intensity: 0 };

  const url =
    `https://api.tomorrow.io/v4/timelines` +
    `?location=${lat},${lng}` +
    `&fields=temperature,humidity,windSpeed,precipitationIntensity` +
    `&timesteps=current` +
    `&units=imperial` +
    `&apikey=${apiKey}`;

  const res = await fetch(url);
  if (!res.ok) throw new Error(`Tomorrow.io ${res.status}`);
  const data = await res.json() as TomorrowResponse;
  const v = data.data.timelines[0]?.intervals[0]?.values ?? {};
  return {
    temperature_f: v.temperature ?? 70,
    humidity_pct: v.humidity ?? 50,
    wind_mph: v.windSpeed ?? 5,
    precip_intensity: v.precipitationIntensity ?? 0,
  };
}

// ── Google Pollen API ────────────────────────────────────────────────────────

interface GooglePollenResponse {
  dailyInfo?: {
    pollenTypeInfo?: {
      code: string;
      indexInfo?: { value?: number };
    }[];
  }[];
}

async function fetchGooglePollen(lat: number, lng: number): Promise<{
  tree_index: number;
  grass_index: number;
  weed_index: number;
} | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
  if (!apiKey) return null;

  const url =
    `https://pollen.googleapis.com/v1/forecast:lookup` +
    `?key=${apiKey}` +
    `&location.longitude=${lng}` +
    `&location.latitude=${lat}` +
    `&days=1`;

  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json() as GooglePollenResponse;
  const types = data.dailyInfo?.[0]?.pollenTypeInfo ?? [];

  function idx(code: string) {
    return types.find(t => t.code === code)?.indexInfo?.value ?? 0;
  }

  return {
    tree_index: idx('TREE'),
    grass_index: idx('GRASS'),
    weed_index: idx('WEED'),
  };
}

// ── Google Air Quality API ───────────────────────────────────────────────────

interface GoogleAQIResponse {
  indexes?: { code: string; aqi?: number }[];
}

async function fetchGoogleAQI(lat: number, lng: number): Promise<number | null> {
  const apiKey = import.meta.env.VITE_GOOGLE_API_KEY as string | undefined;
  if (!apiKey) return null;

  const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ location: { latitude: lat, longitude: lng } }),
  });
  if (!res.ok) return null;
  const data = await res.json() as GoogleAQIResponse;
  // Prefer US EPA index, fall back to Universal AQI
  const epa = data.indexes?.find(i => i.code === 'usa_epa');
  const uaqi = data.indexes?.find(i => i.code === 'uaqi');
  return epa?.aqi ?? uaqi?.aqi ?? null;
}

// ── Mold estimate from humidity ──────────────────────────────────────────────
// No free public API for mold spore counts; humidity is the strongest predictor.
function estimateMold(humidity: number): number {
  if (humidity >= 90) return 4;
  if (humidity >= 80) return 3;
  if (humidity >= 70) return 2;
  if (humidity >= 60) return 1;
  return 0;
}

// ── Reverse geocode ──────────────────────────────────────────────────────────

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

// ── Mock data (fallback) ─────────────────────────────────────────────────────

export function getMockPollenData(date: string): PollenSnapshot {
  const month = new Date(date).getMonth();
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

// ── Main fetch ───────────────────────────────────────────────────────────────

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
    const [weather, pollen, aqi] = await Promise.all([
      fetchWeather(lat, lng),
      fetchGooglePollen(lat, lng),
      fetchGoogleAQI(lat, lng),
    ]);

    const date = new Date().toISOString().slice(0, 10);
    const mock = getMockPollenData(date); // seasonal fallback for pollen if no Google key

    const snapshot: PollenSnapshot = {
      date,
      location: { lat, lng, city },
      grass_index: pollen?.grass_index ?? mock.grass_index,
      tree_index: pollen?.tree_index ?? mock.tree_index,
      weed_index: pollen?.weed_index ?? mock.weed_index,
      ragweed_index: pollen?.weed_index ?? mock.ragweed_index,
      mold_index: estimateMold(weather.humidity_pct),
      temperature_f: weather.temperature_f,
      humidity_pct: weather.humidity_pct,
      wind_mph: weather.wind_mph,
      precip_intensity: weather.precip_intensity,
      aqi: aqi ?? mock.aqi,
      source: pollen ? 'tomorrow_io' : 'mock',
    };

    savePollenCache({ data: snapshot, fetched_at: new Date().toISOString() });
    return snapshot;
  } catch {
    const fallback = getMockPollenData(new Date().toISOString().slice(0, 10));
    fallback.location = { lat, lng, city };
    savePollenCache({ data: fallback, fetched_at: new Date().toISOString() });
    return fallback;
  }
}

// ── Display helpers ──────────────────────────────────────────────────────────

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
