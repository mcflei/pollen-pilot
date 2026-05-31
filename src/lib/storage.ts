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

export function clearCheckIns(): void {
  localStorage.removeItem(KEYS.CHECKINS);
}

export function getPollenCache(): PollenCacheEntry | null {
  return read<PollenCacheEntry>(KEYS.POLLEN_CACHE);
}

export function savePollenCache(entry: PollenCacheEntry): void {
  write(KEYS.POLLEN_CACHE, entry);
}

export function isPollenCacheFresh(): boolean {
  const cache = getPollenCache();
  if (!cache) return false;
  const ageMs = Date.now() - new Date(cache.fetched_at).getTime();
  return ageMs < 6 * 60 * 60 * 1000;
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

export function exportAllData(): string {
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
