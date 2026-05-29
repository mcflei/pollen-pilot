import type { CheckIn, FeatureVector, PollenSnapshot } from '@/types';

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function sleepQualityNum(q: CheckIn['sleep_quality']): number {
  const map: Record<CheckIn['sleep_quality'], number> = {
    poor: 0,
    fair: 0.33,
    good: 0.67,
    great: 1,
  };
  return map[q];
}

export function buildFeatureVector(
  checkIn: CheckIn,
  prevSnapshot: PollenSnapshot | null
): FeatureVector {
  const snap = checkIn.pollen_snapshot;

  const grass = snap ? snap.grass_index / 5 : 0;
  const tree = snap ? snap.tree_index / 5 : 0;
  const weed = snap ? snap.weed_index / 5 : 0;
  const mold = snap ? snap.mold_index / 5 : 0;
  const humidity = snap ? clamp(snap.humidity_pct / 100) : 0;
  const wind = snap ? clamp(snap.wind_mph / 30) : 0;
  const temp = snap ? clamp((snap.temperature_f - 20) / 100) : 0.5;

  const grassLag = prevSnapshot ? prevSnapshot.grass_index / 5 : 0;
  const treeLag = prevSnapshot ? prevSnapshot.tree_index / 5 : 0;

  const hoursOutside = checkIn.hours_outside !== null
    ? clamp(checkIn.hours_outside / 8)
    : 0;

  const tookAntihistamine = checkIn.medications.some(
    m => m.category === 'oral_antihistamine' || m.category === 'nasal_antihistamine'
  ) ? 1 : 0;

  const tookNasalSpray = checkIn.medications.some(
    m => m.category === 'nasal_corticosteroid'
  ) ? 1 : 0;

  const ts = new Date(checkIn.timestamp);
  const dayOfWeek = ts.getDay();
  const weekOfYear = Math.floor(
    (ts.getTime() - new Date(ts.getFullYear(), 0, 1).getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );

  return {
    grass_norm: clamp(grass),
    tree_norm: clamp(tree),
    weed_norm: clamp(weed),
    mold_norm: clamp(mold),
    grass_lag1: clamp(grassLag),
    tree_lag1: clamp(treeLag),
    humidity_norm: humidity,
    wind_norm: wind,
    temp_norm: temp,
    grass_x_humidity: clamp(grass * humidity),
    grass_x_wind: clamp(grass * wind),
    hours_outside_norm: hoursOutside,
    took_antihistamine: tookAntihistamine,
    took_nasal_spray: tookNasalSpray,
    sleep_hours_norm: clamp(checkIn.sleep_hours / 10),
    sleep_quality_num: sleepQualityNum(checkIn.sleep_quality),
    day_of_week_sin: Math.sin((2 * Math.PI * dayOfWeek) / 7),
    day_of_week_cos: Math.cos((2 * Math.PI * dayOfWeek) / 7),
    week_of_year_sin: Math.sin((2 * Math.PI * weekOfYear) / 52),
    week_of_year_cos: Math.cos((2 * Math.PI * weekOfYear) / 52),
  };
}

export function featureToArray(fv: FeatureVector): number[] {
  return [
    fv.grass_norm,
    fv.tree_norm,
    fv.weed_norm,
    fv.mold_norm,
    fv.grass_lag1,
    fv.tree_lag1,
    fv.humidity_norm,
    fv.wind_norm,
    fv.temp_norm,
    fv.grass_x_humidity,
    fv.grass_x_wind,
    fv.hours_outside_norm,
    fv.took_antihistamine,
    fv.took_nasal_spray,
    fv.sleep_hours_norm,
    fv.sleep_quality_num,
    fv.day_of_week_sin,
    fv.day_of_week_cos,
    fv.week_of_year_sin,
    fv.week_of_year_cos,
  ];
}

export const FEATURE_NAMES: (keyof FeatureVector)[] = [
  'grass_norm',
  'tree_norm',
  'weed_norm',
  'mold_norm',
  'grass_lag1',
  'tree_lag1',
  'humidity_norm',
  'wind_norm',
  'temp_norm',
  'grass_x_humidity',
  'grass_x_wind',
  'hours_outside_norm',
  'took_antihistamine',
  'took_nasal_spray',
  'sleep_hours_norm',
  'sleep_quality_num',
  'day_of_week_sin',
  'day_of_week_cos',
  'week_of_year_sin',
  'week_of_year_cos',
];

export const FEATURE_DISPLAY_NAMES: Record<keyof FeatureVector, string> = {
  grass_norm: 'Grass pollen',
  tree_norm: 'Tree pollen',
  weed_norm: 'Weed pollen',
  mold_norm: 'Mold spores',
  grass_lag1: 'Yesterday grass pollen',
  tree_lag1: 'Yesterday tree pollen',
  humidity_norm: 'Humidity',
  wind_norm: 'Wind',
  temp_norm: 'Temperature',
  grass_x_humidity: 'Grass + humidity',
  grass_x_wind: 'Grass + wind',
  hours_outside_norm: 'Time outside',
  took_antihistamine: 'Antihistamine taken',
  took_nasal_spray: 'Nasal spray taken',
  sleep_hours_norm: 'Sleep duration',
  sleep_quality_num: 'Sleep quality',
  day_of_week_sin: 'Day of week',
  day_of_week_cos: 'Day of week',
  week_of_year_sin: 'Season',
  week_of_year_cos: 'Season',
};
