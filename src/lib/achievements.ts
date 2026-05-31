import type { CheckIn } from '@/types';
import { computeStreak } from './storage';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlocked: boolean;
  unlockedAt?: string;
}

const SEEN_KEY = 'pp_achievements_seen';

function getSeenIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function markAchievementsSeen(ids: string[]): void {
  const seen = getSeenIds();
  ids.forEach(id => seen.add(id));
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
}

export function computeAchievements(checkIns: CheckIn[]): Achievement[] {
  const manual = checkIns.filter(c => c.entry_type === 'manual');
  const streak = computeStreak();
  const seen = getSeenIds();

  const definitions: Omit<Achievement, 'unlocked' | 'unlockedAt'>[] = [
    { id: 'first_checkin',    icon: '✈️', name: 'First Flight',       description: 'Logged your first check-in' },
    { id: 'checkins_7',       icon: '🤖', name: 'Pattern Recognition', description: 'ML models activated (7 check-ins)' },
    { id: 'checkins_10',      icon: '📊', name: 'Data Collector',      description: '10 check-ins logged' },
    { id: 'checkins_30',      icon: '🎖️', name: 'Veteran Pilot',       description: '30 check-ins logged' },
    { id: 'streak_3',         icon: '🔥', name: 'Co-pilot',            description: '3-day check-in streak' },
    { id: 'streak_7',         icon: '🧭', name: 'Navigator',           description: '7-day check-in streak' },
    { id: 'streak_30',        icon: '🏆', name: 'Ace Pilot',           description: '30-day check-in streak' },
    { id: 'medication_logged',icon: '💊', name: 'Medicated',           description: 'Logged a medication during a check-in' },
    { id: 'survived_high',    icon: '⛈️', name: 'Storm Rider',         description: 'Checked in on a high-pollen day with severity ≤ 4' },
    { id: 'clear_day',        icon: '☀️', name: 'Clear Skies',         description: 'Checked in with severity 0–1 on a good pollen day' },
    { id: 'illness_logged',   icon: '🤧', name: 'Honest Pilot',        description: 'Flagged a check-in as possible illness' },
  ];

  function isUnlocked(id: string): boolean {
    switch (id) {
      case 'first_checkin':     return manual.length >= 1;
      case 'checkins_7':        return manual.length >= 7;
      case 'checkins_10':       return manual.length >= 10;
      case 'checkins_30':       return manual.length >= 30;
      case 'streak_3':          return streak >= 3;
      case 'streak_7':          return streak >= 7;
      case 'streak_30':         return streak >= 30;
      case 'medication_logged': return manual.some(c => c.medications.length > 0);
      case 'survived_high':     return manual.some(c => {
        const snap = c.pollen_snapshot;
        return snap && (snap.grass_index + snap.tree_index) / 2 > 3 && c.severity <= 4;
      });
      case 'clear_day':         return manual.some(c => {
        const snap = c.pollen_snapshot;
        return c.severity <= 1 && snap && (snap.grass_index + snap.tree_index) / 2 <= 2;
      });
      case 'illness_logged':    return manual.some(c => c.possible_illness === true);
      default: return false;
    }
  }

  return definitions.map(def => ({
    ...def,
    unlocked: isUnlocked(def.id),
    unlockedAt: isUnlocked(def.id) && !seen.has(def.id) ? new Date().toISOString() : undefined,
  }));
}
