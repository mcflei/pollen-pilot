import { create } from 'zustand';
import type { CheckIn, PollenSnapshot, RiskScore, UserProfile } from '@/types';
import {
  getProfile,
  saveProfile,
  getCheckIns,
  saveCheckIns,
  appendCheckIn,
  clearCheckIns,
  markOnboardingDone,
  isOnboardingDone,
  getCachedExplanation,
  getModelWeights,
} from '@/lib/storage';
import { getPollenData, getMockPollenData, getPollenForecast } from '@/lib/pollenApi';
import type { ForecastDay } from '@/types';
import { computeRiskScore, selfEvaluate } from '@/lib/models/ensemble';
import { generateExplanation } from '@/lib/models/explainer';
import {
  loadFromSupabase,
  mergeCheckIns,
  pushProfile,
  pushCheckIn,
  pushModelWeights,
  pushPollenSnapshot,
} from '@/lib/sync';
import { supabase } from '@/lib/supabase';

function uuidv4(): string {
  return crypto.randomUUID();
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

interface AppState {
  profile: UserProfile | null;
  checkIns: CheckIn[];
  pollenData: PollenSnapshot | null;
  forecast: ForecastDay[];
  riskScore: RiskScore | null;
  isLoading: boolean;
  onboardingDone: boolean;
  checkInSubmittedToday: boolean;

  initApp: () => Promise<void>;
  completeOnboarding: (profile: UserProfile) => void;
  submitCheckIn: (
    data: Omit<CheckIn, 'id' | 'timestamp' | 'entry_type' | 'confidence_weight' | 'pollen_snapshot'>
  ) => Promise<void>;
  updateProfile: (updates: Partial<UserProfile>) => void;
  refreshPollenData: () => Promise<void>;
  resetData: () => void;
  signOut: () => Promise<void>;
}

function autoAssumeHealthyDays(
  checkIns: CheckIn[],
  profile: UserProfile,
  snapshot: PollenSnapshot
): CheckIn[] {
  if (!profile.assume_healthy_on_miss) return checkIns;

  const existing = new Set(checkIns.map(c => c.timestamp.slice(0, 10)));
  const created = [...checkIns];
  const today = todayStr();

  for (let i = 1; i <= 30; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (d >= today) continue;
    if (existing.has(d)) continue;

    const autoEntry: CheckIn = {
      id: uuidv4(),
      timestamp: `${d}T23:59:00.000Z`,
      entry_type: 'auto_assumed_healthy',
      confidence_weight: 0.4,
      severity: 0,
      symptoms: [],
      notes: '',
      hours_outside: null,
      windows_open: false,
      exercised_outside: false,
      medications: [],
      sleep_hours: 7,
      sleep_quality: 'good',
      air_purifier_on: false,
      pollen_snapshot: { ...snapshot, date: d },
    };
    created.push(autoEntry);
    appendCheckIn(autoEntry);
    existing.add(d);
  }

  return created;
}

export const useAppStore = create<AppState>((set, get) => ({
  profile: null,
  checkIns: [],
  pollenData: null,
  forecast: [],
  riskScore: null,
  isLoading: false,
  onboardingDone: false,
  checkInSubmittedToday: false,

  initApp: async () => {
    set({ isLoading: true });

    // 1. Pull from Supabase and merge with localStorage (silently ignore network failures)
    try {
      const { profile: cloudProfile, checkIns: cloudCheckIns } = await loadFromSupabase();
      if (cloudProfile) {
        saveProfile(cloudProfile);
        markOnboardingDone();
      }
      if (cloudCheckIns.length > 0) {
        const localCheckIns = getCheckIns();
        saveCheckIns(mergeCheckIns(localCheckIns, cloudCheckIns));
      }
    } catch {
      // Offline or not logged in — continue with localStorage
    }

    // 2. Read from localStorage (now synced from cloud if available)
    const profile = getProfile();
    const checkIns = getCheckIns();
    const onboardingDone = isOnboardingDone();
    const today = todayStr();
    const checkInSubmittedToday = checkIns.some(
      c => c.entry_type === 'manual' && c.timestamp.slice(0, 10) === today
    );

    set({ profile, checkIns, onboardingDone, checkInSubmittedToday });

    // 3. Fetch pollen data
    let snapshot: PollenSnapshot;
    if (profile?.location) {
      snapshot = await getPollenData(
        profile.location.lat,
        profile.location.lng,
        profile.location.city
      );
    } else {
      snapshot = getMockPollenData(today);
    }
    set({ pollenData: snapshot });
    pushPollenSnapshot(snapshot).catch(() => {});

    // Fetch 3-day forecast in background
    if (profile?.location) {
      getPollenForecast(profile.location.lat, profile.location.lng, profile.location.city)
        .then(forecast => set({ forecast }))
        .catch(() => {});
    }

    // 4. Auto-assume healthy days
    let allCheckIns = checkIns;
    if (profile) {
      allCheckIns = autoAssumeHealthyDays(checkIns, profile, snapshot);
      set({ checkIns: allCheckIns });
    }

    // 5. Compute risk score + explanation
    const riskScore = computeRiskScore(allCheckIns, snapshot);
    const cachedExplanation = getCachedExplanation();
    if (cachedExplanation) {
      riskScore.explanation = cachedExplanation;
      set({ riskScore, isLoading: false });
    } else {
      set({ riskScore, isLoading: false });
      const manualCount = allCheckIns.filter(c => c.entry_type === 'manual').length;
      generateExplanation(riskScore, manualCount).then(explanation => {
        set(state => ({
          riskScore: state.riskScore ? { ...state.riskScore, explanation } : null,
        }));
      });
    }
  },

  completeOnboarding: (profile: UserProfile) => {
    saveProfile(profile);
    markOnboardingDone();
    set({ profile, onboardingDone: true });
    pushProfile(profile).catch(() => {});
    get().initApp();
  },

  submitCheckIn: async (
    data: Omit<CheckIn, 'id' | 'timestamp' | 'entry_type' | 'confidence_weight' | 'pollen_snapshot'>
  ) => {
    const { pollenData, checkIns } = get();
    const checkIn: CheckIn = {
      ...data,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      entry_type: 'manual',
      confidence_weight: 1.0,
      pollen_snapshot: pollenData ?? null,
    };

    appendCheckIn(checkIn);
    const allCheckIns = [...checkIns, checkIn];
    set({ checkIns: allCheckIns, checkInSubmittedToday: true });

    pushCheckIn(checkIn).catch(() => {});

    selfEvaluate(allCheckIns);

    const weights = getModelWeights();
    if (weights) pushModelWeights(weights).catch(() => {});

    if (pollenData) {
      const riskScore = computeRiskScore(allCheckIns, pollenData);
      const manualCount = allCheckIns.filter(c => c.entry_type === 'manual').length;
      const explanation = await generateExplanation(riskScore, manualCount);
      set({ riskScore: { ...riskScore, explanation } });
    }
  },

  updateProfile: (updates) => {
    const existing = get().profile;
    if (!existing) return;
    const updated = { ...existing, ...updates };
    saveProfile(updated);
    set({ profile: updated });
    pushProfile(updated).catch(() => {});
  },

  refreshPollenData: async () => {
    const { profile } = get();
    const today = todayStr();
    const snapshot = profile?.location
      ? await getPollenData(profile.location.lat, profile.location.lng, profile.location.city)
      : getMockPollenData(today);
    set({ pollenData: snapshot });
    pushPollenSnapshot(snapshot).catch(() => {});
    const riskScore = computeRiskScore(get().checkIns, snapshot);
    set({ riskScore });
  },

  resetData: () => {
    clearCheckIns();
    set({
      checkIns: [],
      riskScore: null,
      checkInSubmittedToday: false,
    });
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({
      profile: null,
      checkIns: [],
      pollenData: null,
      riskScore: null,
      onboardingDone: false,
      checkInSubmittedToday: false,
    });
  },
}));
