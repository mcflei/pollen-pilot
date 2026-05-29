import { useState } from 'react';
import { useRiskScore } from '@/hooks/useRiskScore';
import { usePollenData } from '@/hooks/usePollenData';
import { useCheckIns } from '@/hooks/useCheckIns';
import { useInsights } from '@/hooks/useInsights';
import { RiskRing } from './RiskRing';
import { WeatherStrip } from './WeatherStrip';
import { PollenRadar } from './PollenRadar';
import { TriggerMap } from './TriggerMap';
import { Recommendations } from './Recommendations';
import { CheckInModal } from '@/components/checkin/CheckInModal';

export function Dashboard() {
  const { riskScore } = useRiskScore();
  const { pollenData } = usePollenData();
  const { manualCheckIns, checkInSubmittedToday } = useCheckIns();
  const insights = useInsights();
  const [showCheckIn, setShowCheckIn] = useState(false);

  return (
    <div className="pb-6 space-y-5">
      <div className="px-4 pt-4">
        <h1 className="font-lora text-xl font-semibold text-gray-900">Today's flight plan</h1>
      </div>

      {riskScore && (
        <RiskRing
          score={riskScore.score}
          category={riskScore.category}
          explanation={riskScore.explanation}
          isPreliminary={riskScore.is_preliminary}
        />
      )}

      {pollenData && <WeatherStrip data={pollenData} />}

      {/* Check-in CTA */}
      {checkInSubmittedToday ? (
        <div className="mx-4 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">✅</span>
          <div>
            <div className="font-semibold text-green-800">Check-in logged</div>
            <div className="text-sm text-green-600">Your data has been recorded for today.</div>
          </div>
        </div>
      ) : (
        <div className="mx-4">
          <button
            onClick={() => setShowCheckIn(true)}
            className="w-full bg-green-pilot text-white font-semibold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-green-600 transition-colors shadow-sm"
          >
            <span className="text-xl">📋</span>
            <span>Pilot Check-In</span>
          </button>
          <p className="text-xs text-center text-gray-400 mt-1">Takes 30–90 seconds</p>
        </div>
      )}

      {pollenData && <PollenRadar data={pollenData} />}

      <TriggerMap
        associations={insights.trigger_associations}
        checkInCount={manualCheckIns.length}
      />

      {riskScore && <Recommendations category={riskScore.category} />}

      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}
    </div>
  );
}
