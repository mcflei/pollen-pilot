import type { CheckIn, FeatureVector, PollenSnapshot } from '@/types';

function clamp(v: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, v));
}

function sleepQualityNum(q: CheckIn['sleep_quality']): number {
  const map: Record<CheckIn['sleep_quality'], number> = {
    poor: 0, fair: 0.33, good: 0.67, great: 1,
  };
  return map[q];
}

function pollenNorm(snap: PollenSnapshot | null, key: 'grass_index' | 'tree_index'): number {
  return snap ? clamp(snap[key] / 5) : 0;
}

/**
 * @param histSnapshots - [1 day ago, 2 days ago, 3 days ago, 4 days ago, 5 days ago]
 * @param personalBaseline - user's rolling mean severity (0–1), 0.5 if unknown
 * @param daysIntoSeason - 0–1, how far into the current pollen season
 */
export function buildFeatureVector(
  checkIn: CheckIn,
  histSnapshots: (PollenSnapshot | null)[],
  personalBaseline = 0.5,
  daysIntoSeason = 0,
): FeatureVector {
  const snap = checkIn.pollen_snapshot;
  const [s1, s2, s3, s4, s5] = histSnapshots;

  const grass = snap ? clamp(snap.grass_index / 5) : 0;
  const tree = snap ? clamp(snap.tree_index / 5) : 0;
  const weed = snap ? clamp(snap.weed_index / 5) : 0;
  const mold = snap ? clamp(snap.mold_index / 5) : 0;
  const humidity = snap ? clamp(snap.humidity_pct / 100) : 0;
  const wind = snap ? clamp(snap.wind_mph / 30) : 0;
  const temp = snap ? clamp((snap.temperature_f - 20) / 100) : 0.5;

  const grassLag1 = pollenNorm(s1, 'grass_index');
  const grassLag2 = pollenNorm(s2, 'grass_index');
  const grassLag3 = pollenNorm(s3, 'grass_index');
  const treeLag1 = pollenNorm(s1, 'tree_index');
  const treeLag2 = pollenNorm(s2, 'tree_index');

  const grass3DayAvg = (grassLag1 + grassLag2 + grassLag3) / 3;
  const tree3DayAvg = (treeLag1 + treeLag2 + pollenNorm(s3, 'tree_index')) / 3;
  const grassRising = grass > grass3DayAvg ? 1 : 0;

  const snapshots5 = [s1, s2, s3, s4, s5];
  const highDays = snapshots5.filter(s => s && (s.grass_index + s.tree_index) / 2 > 3).length;
  const daysHighPollenLast5 = highDays / 5;

  // Rain washout: exponential decay — yesterday 0.5×, 2d 0.25×, 3d 0.125×, 4d 0.0625×
  let rainWashout = 0;
  const rainWeights = [0.5, 0.25, 0.125, 0.0625];
  for (let i = 0; i < 4; i++) {
    rainWashout += (histSnapshots[i]?.precip_intensity ?? 0) * rainWeights[i];
  }
  rainWashout = clamp(rainWashout);

  const exercisedOutside = checkIn.exercised_outside ? 1 : 0;
  const hoursOutside = checkIn.hours_outside !== null ? clamp(checkIn.hours_outside / 8) : 0;
  const outdoorXGrass = clamp(exercisedOutside * grass);

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
    grass_norm: grass,
    tree_norm: tree,
    weed_norm: weed,
    mold_norm: mold,
    grass_lag1: grassLag1,
    tree_lag1: treeLag1,
    grass_lag2: grassLag2,
    grass_lag3: grassLag3,
    tree_lag2: treeLag2,
    grass_3day_avg: grass3DayAvg,
    tree_3day_avg: tree3DayAvg,
    grass_rising: grassRising,
    days_high_pollen_last5: daysHighPollenLast5,
    rain_washout_decay: rainWashout,
    humidity_norm: humidity,
    wind_norm: wind,
    temp_norm: temp,
    grass_x_humidity: clamp(grass * humidity),
    grass_x_wind: clamp(grass * wind),
    outdoor_x_grass: outdoorXGrass,
    hours_outside_norm: hoursOutside,
    exercised_outside: exercisedOutside,
    took_antihistamine: tookAntihistamine,
    took_nasal_spray: tookNasalSpray,
    sleep_hours_norm: clamp(checkIn.sleep_hours / 10),
    sleep_quality_num: sleepQualityNum(checkIn.sleep_quality),
    day_of_week_sin: Math.sin((2 * Math.PI * dayOfWeek) / 7),
    day_of_week_cos: Math.cos((2 * Math.PI * dayOfWeek) / 7),
    week_of_year_sin: Math.sin((2 * Math.PI * weekOfYear) / 52),
    week_of_year_cos: Math.cos((2 * Math.PI * weekOfYear) / 52),
    days_into_season: clamp(daysIntoSeason),
    personal_severity_baseline: clamp(personalBaseline),
  };
}

export function featureToArray(fv: FeatureVector): number[] {
  return [
    fv.grass_norm, fv.tree_norm, fv.weed_norm, fv.mold_norm,
    fv.grass_lag1, fv.tree_lag1, fv.grass_lag2, fv.grass_lag3, fv.tree_lag2,
    fv.grass_3day_avg, fv.tree_3day_avg, fv.grass_rising,
    fv.days_high_pollen_last5, fv.rain_washout_decay,
    fv.humidity_norm, fv.wind_norm, fv.temp_norm,
    fv.grass_x_humidity, fv.grass_x_wind, fv.outdoor_x_grass,
    fv.hours_outside_norm, fv.exercised_outside,
    fv.took_antihistamine, fv.took_nasal_spray,
    fv.sleep_hours_norm, fv.sleep_quality_num,
    fv.day_of_week_sin, fv.day_of_week_cos, fv.week_of_year_sin, fv.week_of_year_cos,
    fv.days_into_season, fv.personal_severity_baseline,
  ];
}

export const FEATURE_NAMES: (keyof FeatureVector)[] = [
  'grass_norm', 'tree_norm', 'weed_norm', 'mold_norm',
  'grass_lag1', 'tree_lag1', 'grass_lag2', 'grass_lag3', 'tree_lag2',
  'grass_3day_avg', 'tree_3day_avg', 'grass_rising',
  'days_high_pollen_last5', 'rain_washout_decay',
  'humidity_norm', 'wind_norm', 'temp_norm',
  'grass_x_humidity', 'grass_x_wind', 'outdoor_x_grass',
  'hours_outside_norm', 'exercised_outside',
  'took_antihistamine', 'took_nasal_spray',
  'sleep_hours_norm', 'sleep_quality_num',
  'day_of_week_sin', 'day_of_week_cos', 'week_of_year_sin', 'week_of_year_cos',
  'days_into_season', 'personal_severity_baseline',
];

export const FEATURE_DISPLAY_NAMES: Record<keyof FeatureVector, string> = {
  grass_norm: 'Grass pollen',
  tree_norm: 'Tree pollen',
  weed_norm: 'Weed pollen',
  mold_norm: 'Mold spores',
  grass_lag1: 'Yesterday grass pollen',
  tree_lag1: 'Yesterday tree pollen',
  grass_lag2: 'Grass pollen (2 days ago)',
  grass_lag3: 'Grass pollen (3 days ago)',
  tree_lag2: 'Tree pollen (2 days ago)',
  grass_3day_avg: '3-day grass average',
  tree_3day_avg: '3-day tree average',
  grass_rising: 'Pollen rising',
  days_high_pollen_last5: 'Sustained high pollen',
  rain_washout_decay: 'Recent rainfall',
  humidity_norm: 'Humidity',
  wind_norm: 'Wind',
  temp_norm: 'Temperature',
  grass_x_humidity: 'Grass × humidity',
  grass_x_wind: 'Grass × wind',
  outdoor_x_grass: 'Exercise outside × grass',
  hours_outside_norm: 'Time outside',
  exercised_outside: 'Exercised outside',
  took_antihistamine: 'Antihistamine taken',
  took_nasal_spray: 'Nasal spray taken',
  sleep_hours_norm: 'Sleep duration',
  sleep_quality_num: 'Sleep quality',
  day_of_week_sin: 'Day of week',
  day_of_week_cos: 'Day of week',
  week_of_year_sin: 'Season',
  week_of_year_cos: 'Season',
  days_into_season: 'Days into pollen season',
  personal_severity_baseline: 'Your typical severity',
};
