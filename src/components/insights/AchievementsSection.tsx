import { useEffect, useState } from 'react';
import { useCheckIns } from '@/hooks/useCheckIns';
import { computeAchievements, markAchievementsSeen } from '@/lib/achievements';
import type { Achievement } from '@/lib/achievements';

export function AchievementsSection() {
  const { checkIns } = useCheckIns();
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  useEffect(() => {
    const computed = computeAchievements(checkIns);
    setAchievements(computed);
    const newIds = computed.filter(a => a.unlocked && a.unlockedAt).map(a => a.id);
    if (newIds.length) markAchievementsSeen(newIds);
  }, [checkIns]);

  const unlocked = achievements.filter(a => a.unlocked);
  const locked = achievements.filter(a => !a.unlocked);

  return (
    <div>
      <h3 className="font-semibold text-gray-900 mb-1">Achievements</h3>
      <p className="text-xs text-gray-500 mb-3">{unlocked.length}/{achievements.length} unlocked</p>

      <div className="grid grid-cols-2 gap-2">
        {[...unlocked, ...locked].map(a => (
          <div
            key={a.id}
            className={`rounded-xl border p-3 flex items-start gap-3 transition-opacity ${
              a.unlocked
                ? 'bg-white border-gray-100 shadow-sm'
                : 'bg-gray-50 border-gray-100 opacity-40'
            }`}
          >
            <span className="text-2xl leading-none mt-0.5">{a.icon}</span>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-gray-900 leading-tight">{a.name}</div>
              <div className="text-xs text-gray-500 mt-0.5 leading-tight">{a.description}</div>
              {a.unlocked && a.unlockedAt && (
                <div className="text-xs text-sky-pilot font-medium mt-1">New!</div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
