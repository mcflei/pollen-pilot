import type {
  UserProfile,
  CheckIn,
  PollenSnapshot,
  ModelWeights,
  ModelEvalResult,
  PollenCacheEntry,
} from '@/types';

const KEYS = {
  PROFILE: 'pp_profile',
  CHECKINS: 'pp_checkins',
  POLLEN_CACHE: 'pp_pollen_cache',
  FORECAST_CACHE: 'pp_forecast_cache',
  MODEL_WEIGHTS: 'pp_model_weights',
  MODEL_EVALS: 'pp_model_evals',
  ONBOARDING_DONE: 'pp_onboarding_done',
} as const;

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function write<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage quota exceeded — silently ignore for MVP
  }
}

export function getProfile(): UserProfile | null {
  return read<UserProfile>(KEYS.PROFILE);
}

export function saveProfile(profile: UserProfile): void {
  write(KEYS.PROFILE, profile);
}

export function getCheckIns(): CheckIn[] {
  return read<CheckIn[]>(KEYS.CHECKINS) ?? [];
}

export function appendCheckIn(checkIn: CheckIn): void {
  const existing = getCheckIns();
  write(KEYS.CHECKINS, [...existing, checkIn]);
}

export function saveCheckIns(checkIns: CheckIn[]): void {
  write(KEYS.CHECKINS, checkIns);
}

export function updateCheckIn(id: string, updates: Partial<CheckIn>): void {
  const all = getCheckIns();
  const idx = all.findIndex(c => c.id === id);
  if (idx === -1) return;
  all[idx] = { ...all[idx], ...updates };
  write(KEYS.CHECKINS, all);
}

export function clearCheckIns(): void {
  localStorage.removeItem(KEYS.CHECKINS);
}

export function getPollenCache(): PollenCacheEntry | null {
  return read<PollenCacheEntry>(KEYS.POLLEN_CACHE);
}

export function savePollenCache(entry: PollenCacheEntry): void {
  write(KEYS.POLLEN_CACHE, entry);
}

export function clearPollenCache(): void {
  localStorage.removeItem(KEYS.POLLEN_CACHE);
  localStorage.removeItem(KEYS.FORECAST_CACHE);
}

export function isPollenCacheFresh(): boolean {
  const cache = getPollenCache();
  if (!cache) return false;
  const ageMs = Date.now() - new Date(cache.fetched_at).getTime();
  return ageMs < 1 * 60 * 60 * 1000;
}

export function getModelWeights(): ModelWeights | null {
  return read<ModelWeights>(KEYS.MODEL_WEIGHTS);
}

export function saveModelWeights(weights: ModelWeights): void {
  write(KEYS.MODEL_WEIGHTS, weights);
}

export function getModelEvals(): ModelEvalResult[] {
  return read<ModelEvalResult[]>(KEYS.MODEL_EVALS) ?? [];
}

export function appendModelEval(result: ModelEvalResult): void {
  const existing = getModelEvals();
  write(KEYS.MODEL_EVALS, [...existing, result]);
}

export function isOnboardingDone(): boolean {
  return localStorage.getItem(KEYS.ONBOARDING_DONE) === 'true';
}

export function markOnboardingDone(): void {
  localStorage.setItem(KEYS.ONBOARDING_DONE, 'true');
}

export function getForecastCache(): { data: unknown; fetched_at: string } | null {
  return read<{ data: unknown; fetched_at: string }>(KEYS.FORECAST_CACHE);
}

export function saveForecastCache(data: unknown): void {
  write(KEYS.FORECAST_CACHE, { data, fetched_at: new Date().toISOString() });
}

export function isForecastCacheFresh(): boolean {
  const cache = getForecastCache();
  if (!cache) return false;
  return Date.now() - new Date(cache.fetched_at).getTime() < 60 * 60 * 1000;
}

export function computeStreak(): number {
  const checkIns = getCheckIns();
  const manualDates = new Set(
    checkIns
      .filter(c => c.entry_type === 'manual')
      .map(c => c.timestamp.slice(0, 10))
  );
  let streak = 0;
  const today = new Date();
  // Start from yesterday if not yet checked in today, else from today
  const todayStr = today.toISOString().slice(0, 10);
  const startOffset = manualDates.has(todayStr) ? 0 : 1;
  for (let i = startOffset; i < 365; i++) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (manualDates.has(d)) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
}

export function exportAllData(): string {
  const profile = getProfile();
  const checkIns = getCheckIns();
  const manual = checkIns.filter(c => c.entry_type === 'manual');
  const avgSeverity = manual.length > 0
    ? (manual.reduce((s, c) => s + c.severity, 0) / manual.length).toFixed(1)
    : 'N/A';

  const summary = [
    `POLLEN PILOT — HEALTH SUMMARY`,
    `Exported: ${new Date().toLocaleDateString()}`,
    `Patient: ${profile?.id ?? 'Unknown'}`,
    ``,
    `OVERVIEW`,
    `Total check-ins: ${manual.length}`,
    `Average severity: ${avgSeverity}/10`,
    `Date range: ${manual[0]?.timestamp.slice(0, 10) ?? 'N/A'} → ${manual[manual.length - 1]?.timestamp.slice(0, 10) ?? 'N/A'}`,
    ``,
    `RECENT CHECK-INS (last 30)`,
    ...manual.slice(-30).reverse().map(c => {
      const snap = c.pollen_snapshot;
      const meds = c.medications.map(m => m.matched_name ?? m.raw_input).join(', ') || 'None';
      return [
        `Date: ${c.timestamp.slice(0, 10)}`,
        `Severity: ${c.severity}/10  Symptoms: ${c.symptoms.join(', ') || 'None'}`,
        `Medications: ${meds}`,
        `Sleep: ${c.sleep_hours}h (${c.sleep_quality})  Outside: ${c.hours_outside ?? 0}h`,
        snap ? `Pollen — Grass:${snap.grass_index} Tree:${snap.tree_index} Weed:${snap.weed_index}  AQI:${snap.aqi}` : '',
        '',
      ].filter(Boolean).join('\n');
    }),
  ].join('\n');

  const blob = new Blob([summary], { type: 'text/plain' });
  return URL.createObjectURL(blob);
}

export function exportAllDataJSON(): string {
  return JSON.stringify({
    profile: getProfile(),
    checkins: getCheckIns(),
    model_weights: getModelWeights(),
    model_evals: getModelEvals(),
    exported_at: new Date().toISOString(),
  }, null, 2);
}

export function resetAllData(): void {
  Object.values(KEYS).forEach(key => localStorage.removeItem(key));
}

export function getCachedExplanation(): string | null {
  return getPollenCache()?.explanation ?? null;
}

export function saveCachedExplanation(explanation: string): void {
  const cache = getPollenCache();
  if (!cache) return;
  savePollenCache({ ...cache, explanation });
}

export function getSnapshotForDate(date: string): PollenSnapshot | null {
  const checkins = getCheckIns();
  const match = checkins.find(c => c.pollen_snapshot?.date === date);
  return match?.pollen_snapshot ?? null;
}

export function getSnapshotsForPastDays(fromDate: string, nDays: number): (PollenSnapshot | null)[] {
  const base = new Date(fromDate);
  return Array.from({ length: nDays }, (_, i) => {
    const d = new Date(base.getTime() - (i + 1) * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    return getSnapshotForDate(d);
  });
}
