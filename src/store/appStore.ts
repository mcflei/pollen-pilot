import { create } from 'zustand';
import type { CheckIn, PollenSnapshot, RiskScore, UserProfile } from '@/types';
import {
  getProfile,
  saveProfile,
  getCheckIns,
  saveCheckIns,
  appendCheckIn,
  updateCheckIn as storageUpdateCheckIn,
  clearCheckIns,
  markOnboardingDone,
  isOnboardingDone,
  getCachedExplanation,
  getModelWeights,
  getForecastCache,
  saveForecastCache,
  isForecastCacheFresh,
  clearPollenCache,
} from '@/lib/storage';
import { computeAchievements, markAchievementsSeen } from '@/lib/achievements';
import type { Achievement } from '@/lib/achievements';
import { getPollenData, getMockPollenData, getPollenForecast, reverseGeocode } from '@/lib/pollenApi';
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

type CheckInPayload = Omit<CheckIn, 'id' | 'timestamp' | 'entry_type' | 'confidence_weight' | 'pollen_snapshot'>;

interface AppState {
  profile: UserProfile | null;
  checkIns: CheckIn[];
  pollenData: PollenSnapshot | null;
  forecast: ForecastDay[];
  riskScore: RiskScore | null;
  isLoading: boolean;
  onboardingDone: boolean;
  checkInSubmittedToday: boolean;
  lastCheckInIllnessFlagged: boolean;
  pendingAchievements: Achievement[];

  initApp: () => Promise<void>;
  completeOnboarding: (profile: UserProfile) => void;
  submitCheckIn: (data: CheckInPayload) => Promise<void>;
  updateTodayCheckIn: (id: string, data: CheckInPayload) => Promise<void>;
  overrideIllness: (checkInId: string) => void;
  clearFirstPendingAchievement: () => void;
  updateProfile: (updates: Partial<UserProfile>) => void;
  refreshPollenData: () => Promise<void>;
  resetData: () => void;
  signOut: () => Promise<void>;
}

function detectProbableCold(
  severity: number,
  pollenData: PollenSnapshot | null,
  hoursOutside: number | null,
): boolean {
  if (severity < 4) return false;
  if (!pollenData) return false;

  const avgPollen = (pollenData.grass_index + pollenData.tree_index + pollenData.weed_index) / 3;
  const outdoor = hoursOutside ?? 0;

  // Very low pollen + any notable symptoms = probably not allergies
  if (avgPollen <= 1 && severity >= 4) return true;

  // Low pollen + little outdoor time + moderate-high severity
  if (avgPollen <= 2 && outdoor <= 0.5 && severity >= 5) return true;

  return false;
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
  lastCheckInIllnessFlagged: false,
  pendingAchievements: [],

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

    // 3. Silently refresh location if permission already granted (no popup)
    let updatedProfile = profile;
    if (profile && navigator.geolocation) {
      try {
        const permission = await navigator.permissions.query({ name: 'geolocation' });
        if (permission.state === 'granted') {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          );
          const { latitude: lat, longitude: lng } = pos.coords;
          const city = await reverseGeocode(lat, lng);
          updatedProfile = { ...profile, location: { lat, lng, city } };
          saveProfile(updatedProfile);
          set({ profile: updatedProfile });
          pushProfile(updatedProfile).catch(() => {});
        }
      } catch {
        // Permission denied or timeout — use stored location
      }
    }

    // 4. Fetch pollen data
    let snapshot: PollenSnapshot;
    if (updatedProfile?.location) {
      snapshot = await getPollenData(
        updatedProfile.location.lat,
        updatedProfile.location.lng,
        updatedProfile.location.city
      );
    } else {
      snapshot = getMockPollenData(today);
    }
    set({ pollenData: snapshot });
    pushPollenSnapshot(snapshot).catch(() => {});

    // Fetch forecast — serve from cache if fresh, otherwise fetch in background
    if (updatedProfile?.location) {
      if (isForecastCacheFresh()) {
        const cached = getForecastCache();
        if (cached) set({ forecast: cached.data as ForecastDay[] });
      } else {
        getPollenForecast(updatedProfile.location.lat, updatedProfile.location.lng, updatedProfile.location.city)
          .then(forecast => { set({ forecast }); saveForecastCache(forecast); })
          .catch(() => {});
      }
    }

    // 4. Auto-assume healthy days
    let allCheckIns = checkIns;
    if (profile) {
      allCheckIns = autoAssumeHealthyDays(checkIns, profile, snapshot);
      set({ checkIns: allCheckIns });
    }

    // 5. Compute risk score + explanation
    const riskScore = computeRiskScore(allCheckIns, snapshot);
    const manualCount = allCheckIns.filter(c => c.entry_type === 'manual').length;
    const cachedExplanation = manualCount > 0 ? getCachedExplanation() : null;
    if (cachedExplanation) {
      riskScore.explanation = cachedExplanation;
      set({ riskScore, isLoading: false });
    } else {
      set({ riskScore, isLoading: false });
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

  submitCheckIn: async (data: CheckInPayload) => {
    const { pollenData, checkIns } = get();
    const illnessFlagged = detectProbableCold(data.severity, pollenData, data.hours_outside);
    const checkIn: CheckIn = {
      ...data,
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      entry_type: 'manual',
      possible_illness: illnessFlagged,
      // Auto-detected illness days get near-zero weight — they shouldn't train the allergy model
      confidence_weight: illnessFlagged ? 0.05 : 1.0,
      pollen_snapshot: pollenData ?? null,
    };

    // Compute achievements BEFORE appending so computeStreak() reads old localStorage state
    const preAchievements = computeAchievements(checkIns);

    appendCheckIn(checkIn);
    const allCheckIns = [...checkIns, checkIn];
    set({ checkIns: allCheckIns, checkInSubmittedToday: true, lastCheckInIllnessFlagged: illnessFlagged });

    // Detect newly unlocked achievements (post-append, so streak is updated)
    const postAchievements = computeAchievements(allCheckIns);
    const preUnlocked = new Set(preAchievements.filter(a => a.unlocked).map(a => a.id));
    const newlyUnlocked = postAchievements.filter(a => a.unlocked && !preUnlocked.has(a.id));
    if (newlyUnlocked.length > 0) {
      markAchievementsSeen(newlyUnlocked.map(a => a.id));
      set(state => ({ pendingAchievements: [...state.pendingAchievements, ...newlyUnlocked] }));
    }

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

  updateTodayCheckIn: async (id: string, data: CheckInPayload) => {
    const { pollenData, checkIns } = get();
    const illnessFlagged = detectProbableCold(data.severity, pollenData, data.hours_outside);
    const updates: Partial<CheckIn> = {
      ...data,
      possible_illness: illnessFlagged,
      illness_override: undefined,
      confidence_weight: illnessFlagged ? 0.05 : 1.0,
    };
    storageUpdateCheckIn(id, updates);
    const allCheckIns = checkIns.map(c => c.id === id ? { ...c, ...updates } : c);
    set({ checkIns: allCheckIns, lastCheckInIllnessFlagged: illnessFlagged });

    pushCheckIn(allCheckIns.find(c => c.id === id)!).catch(() => {});

    if (pollenData) {
      const riskScore = computeRiskScore(allCheckIns, pollenData);
      const manualCount = allCheckIns.filter(c => c.entry_type === 'manual').length;
      const explanation = await generateExplanation(riskScore, manualCount);
      set({ riskScore: { ...riskScore, explanation } });
    }
  },

  overrideIllness: (checkInId: string) => {
    const { checkIns, pollenData } = get();
    storageUpdateCheckIn(checkInId, { illness_override: true, confidence_weight: 1.0 });
    const allCheckIns = checkIns.map(c =>
      c.id === checkInId ? { ...c, illness_override: true, confidence_weight: 1.0 } : c
    );
    set({ checkIns: allCheckIns, lastCheckInIllnessFlagged: false });
    pushCheckIn(allCheckIns.find(c => c.id === checkInId)!).catch(() => {});
    if (pollenData) {
      const riskScore = computeRiskScore(allCheckIns, pollenData);
      set({ riskScore });
    }
  },

  clearFirstPendingAchievement: () => {
    set(state => ({ pendingAchievements: state.pendingAchievements.slice(1) }));
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
    // Always bypass cache — this is an explicit user-triggered refresh
    clearPollenCache();
    const snapshot = profile?.location
      ? await getPollenData(profile.location.lat, profile.location.lng, profile.location.city)
      : getMockPollenData(today);
    set({ pollenData: snapshot });
    pushPollenSnapshot(snapshot).catch(() => {});
    // Also refresh forecast for the new location
    if (profile?.location) {
      getPollenForecast(profile.location.lat, profile.location.lng, profile.location.city)
        .then(forecast => { set({ forecast }); saveForecastCache(forecast); })
        .catch(() => {});
    }
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
