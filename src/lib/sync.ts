import type { CheckIn, ModelWeights, PollenSnapshot, UserProfile } from '@/types';
import { supabase } from './supabase';

// ---------- helpers ----------

async function getAuthUser() {
  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

// ---------- uploads ----------

export async function pushProfile(profile: UserProfile): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;
  await supabase.from('profiles').upsert({
    id: user.id,
    created_at: profile.created_at,
    location: profile.location,
    checkin_frequency: profile.checkin_frequency,
    custom_checkin_times: profile.custom_checkin_times,
    assume_healthy_on_miss: profile.assume_healthy_on_miss,
    typical_outdoor_activity: profile.typical_outdoor_activity,
    default_medications: profile.default_medications,
    onboarding_complete: profile.onboarding_complete,
    notifications: profile.notifications,
  });
}

export async function pushCheckIn(checkIn: CheckIn): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;
  await supabase.from('check_ins').upsert({
    id: checkIn.id,
    user_id: user.id,
    timestamp: checkIn.timestamp,
    entry_type: checkIn.entry_type,
    confidence_weight: checkIn.confidence_weight,
    severity: checkIn.severity,
    symptoms: checkIn.symptoms,
    notes: checkIn.notes,
    hours_outside: checkIn.hours_outside,
    windows_open: checkIn.windows_open,
    exercised_outside: checkIn.exercised_outside,
    medications: checkIn.medications,
    sleep_hours: checkIn.sleep_hours,
    sleep_quality: checkIn.sleep_quality,
    air_purifier_on: checkIn.air_purifier_on,
    pollen_snapshot: checkIn.pollen_snapshot,
  });
}

export async function pushModelWeights(weights: ModelWeights): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;
  await supabase.from('model_weights').upsert({
    user_id: user.id,
    logistic_regression: weights.logistic_regression,
    gradient_boosted_tree: weights.gradient_boosted_tree,
    weighted_knn: weights.weighted_knn,
    last_updated: weights.last_updated,
    checkins_at_last_update: weights.checkins_at_last_update,
  });
}

export async function pushPollenSnapshot(snapshot: PollenSnapshot): Promise<void> {
  const user = await getAuthUser();
  if (!user) return;
  await supabase.from('pollen_snapshots').upsert({
    user_id: user.id,
    date: snapshot.date,
    snapshot,
    fetched_at: new Date().toISOString(),
  });
}

// ---------- download ----------

export async function loadFromSupabase(): Promise<{
  profile: UserProfile | null;
  checkIns: CheckIn[];
}> {
  const user = await getAuthUser();
  if (!user) return { profile: null, checkIns: [] };

  const [profileResult, checkInsResult] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(),
    supabase
      .from('check_ins')
      .select('*')
      .eq('user_id', user.id)
      .order('timestamp', { ascending: true }),
  ]);

  let profile: UserProfile | null = null;
  if (profileResult.data?.onboarding_complete) {
    const r = profileResult.data;
    profile = {
      id: user.id,
      created_at: r.created_at as string,
      location: r.location as UserProfile['location'],
      checkin_frequency: r.checkin_frequency as UserProfile['checkin_frequency'],
      custom_checkin_times: (r.custom_checkin_times as string[]) ?? [],
      assume_healthy_on_miss: r.assume_healthy_on_miss as boolean,
      typical_outdoor_activity: r.typical_outdoor_activity as UserProfile['typical_outdoor_activity'],
      default_medications: (r.default_medications as string[]) ?? [],
      onboarding_complete: true,
      notifications: r.notifications as UserProfile['notifications'],
    };
  }

  const checkIns: CheckIn[] = (checkInsResult.data ?? []).map(r => ({
    id: r.id as string,
    timestamp: r.timestamp as string,
    entry_type: r.entry_type as CheckIn['entry_type'],
    confidence_weight: r.confidence_weight as number,
    severity: r.severity as number,
    symptoms: (r.symptoms as CheckIn['symptoms']) ?? [],
    notes: (r.notes as string) ?? '',
    hours_outside: r.hours_outside as number | null,
    windows_open: (r.windows_open as boolean) ?? false,
    exercised_outside: (r.exercised_outside as boolean) ?? false,
    medications: (r.medications as CheckIn['medications']) ?? [],
    sleep_hours: (r.sleep_hours as number) ?? 7,
    sleep_quality: (r.sleep_quality as CheckIn['sleep_quality']) ?? 'good',
    air_purifier_on: (r.air_purifier_on as boolean) ?? false,
    pollen_snapshot: (r.pollen_snapshot as CheckIn['pollen_snapshot']) ?? null,
  }));

  return { profile, checkIns };
}

// ---------- merge util ----------

export function mergeCheckIns(local: CheckIn[], cloud: CheckIn[]): CheckIn[] {
  const byId = new Map<string, CheckIn>();
  [...local, ...cloud].forEach(c => byId.set(c.id, c)); // cloud wins on conflict
  return Array.from(byId.values()).sort((a, b) =>
    a.timestamp.localeCompare(b.timestamp)
  );
}
