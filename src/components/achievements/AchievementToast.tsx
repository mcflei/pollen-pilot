import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import type { Achievement } from '@/lib/achievements';

const DISPLAY_MS = 4000;
const EXIT_MS = 400;

interface ToastItemProps {
  achievement: Achievement;
  remaining: number;
  onDismiss: () => void;
}

function ToastItem({ achievement, remaining, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger enter animation on next frame
    const enterRaf = requestAnimationFrame(() => setVisible(true));

    const exitTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, EXIT_MS);
    }, DISPLAY_MS);

    return () => {
      cancelAnimationFrame(enterRaf);
      clearTimeout(exitTimer);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className={`transition-all duration-400 ease-out ${
        visible ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-6 opacity-0 scale-95'
      }`}
    >
      <div className="relative overflow-hidden rounded-2xl shadow-2xl border border-amber-400/60 bg-gray-900 w-80">
        {/* Shimmer overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-amber-400/5 pointer-events-none" />

        {/* Progress bar */}
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-700">
          <div
            className="h-full bg-amber-400"
            style={{
              animation: `shrink ${DISPLAY_MS}ms linear forwards`,
            }}
          />
        </div>

        <div className="px-4 pt-3 pb-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold tracking-widest text-amber-400 uppercase">
              Achievement Unlocked
            </span>
            <button
              onClick={() => { setVisible(false); setTimeout(onDismiss, EXIT_MS); }}
              className="text-gray-500 hover:text-gray-300 transition-colors text-lg leading-none"
            >
              ×
            </button>
          </div>

          {/* Content */}
          <div className="flex items-center gap-3">
            <div className="text-4xl leading-none drop-shadow-lg shrink-0">
              {achievement.icon}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-white text-sm leading-tight">{achievement.name}</div>
              <div className="text-gray-400 text-xs mt-0.5 leading-snug">{achievement.description}</div>
            </div>
          </div>
        </div>

        {/* Queue indicator */}
        {remaining > 1 && (
          <div className="bg-gray-800 border-t border-gray-700 px-4 py-1.5 flex items-center justify-end">
            <span className="text-xs text-gray-500">+{remaining - 1} more</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function AchievementToast() {
  const pending = useAppStore(s => s.pendingAchievements);
  const dismiss = useAppStore(s => s.clearFirstPendingAchievement);

  if (pending.length === 0) return null;

  return (
    <>
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[100] pointer-events-none">
        <div className="pointer-events-auto">
          <ToastItem
            key={pending[0].id}
            achievement={pending[0]}
            remaining={pending.length}
            onDismiss={dismiss}
          />
        </div>
      </div>
    </>
  );
}
