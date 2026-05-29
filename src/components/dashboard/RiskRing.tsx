import { useEffect, useRef, useState } from 'react';
import type { RiskCategory } from '@/types';
import { getRiskLabel } from '@/lib/models/ensemble';

interface Props {
  score: number;
  category: RiskCategory;
  explanation: string | null;
  isPreliminary: boolean;
}

const RADIUS = 46;
const STROKE = 10;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const CATEGORY_COLORS: Record<RiskCategory, string> = {
  clear: '#5A9E6B',
  light: '#4A9FD4',
  turbulence: '#F59E0B',
  high: '#EF4444',
};

export function RiskRing({ score, category, explanation, isPreliminary }: Props) {
  const [animatedScore, setAnimatedScore] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const start = performance.now();
    const duration = 800;

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedScore(Math.round(eased * score));
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [score]);

  const fillFraction = animatedScore / 100;
  const dashOffset = CIRCUMFERENCE * (1 - fillFraction);
  const color = CATEGORY_COLORS[category];
  const size = (RADIUS + STROKE) * 2;

  return (
    <div className="flex flex-col items-center py-6">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={RADIUS}
            fill="none"
            stroke="rgba(0,0,0,0.06)"
            strokeWidth={STROKE}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={RADIUS}
            fill="none"
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            style={{ transition: 'none' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-lora text-3xl font-bold text-gray-900">{animatedScore}</span>
        </div>
      </div>

      <div className="mt-3 text-center">
        <div className="font-semibold text-lg" style={{ color }}>
          {getRiskLabel(category)}
        </div>
        {isPreliminary && (
          <div className="text-xs text-gray-400 mt-1">Pollen Pilot is learning your patterns</div>
        )}
      </div>

      {explanation && (
        <div className="mt-4 mx-4 bg-gray-50 rounded-xl px-4 py-3 text-sm text-gray-700 text-center max-w-sm">
          {explanation}
        </div>
      )}
    </div>
  );
}
