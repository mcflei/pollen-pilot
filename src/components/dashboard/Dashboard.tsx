import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useRiskScore } from '@/hooks/useRiskScore';
import { usePollenData } from '@/hooks/usePollenData';
import { useCheckIns } from '@/hooks/useCheckIns';
import { useInsights } from '@/hooks/useInsights';
import { RiskRing } from './RiskRing';
import { WeatherStrip } from './WeatherStrip';
import { PollenRadar } from './PollenRadar';
import { TriggerMap } from './TriggerMap';
import { Recommendations } from './Recommendations';
import { ForecastStrip } from './ForecastStrip';
import { BestDaysView } from './BestDaysView';
import { PollenHeatmap } from './PollenHeatmap';
import { CheckInModal } from '@/components/checkin/CheckInModal';

const SYMPTOM_LABELS: Record<string, string> = {
  sneezing: 'Sneezing',
  itchy_eyes: 'Itchy eyes',
  congestion: 'Congestion',
  watery_eyes: 'Watery eyes',
  coughing: 'Coughing',
  headache: 'Headache',
  fatigue: 'Fatigue',
  throat_irritation: 'Throat irritation',
};

export function Dashboard() {
  const { riskScore } = useRiskScore();
  const { pollenData } = usePollenData();
  const { manualCheckIns, checkInSubmittedToday } = useCheckIns();
  const insights = useInsights();
  const forecast = useAppStore(s => s.forecast);
  const profile = useAppStore(s => s.profile);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);

  const predictedSymptoms = riskScore?.predicted_symptoms ?? [];
  const streak = insights.streak_days;

  return (
    <div className="pb-6 space-y-5">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="font-lora text-xl font-semibold text-gray-900">Today's flight plan</h1>
        {streak > 1 && (
          <div className="flex items-center gap-1 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-semibold text-amber-700">{streak} day streak</span>
          </div>
        )}
      </div>

      {riskScore && (
        <RiskRing
          score={riskScore.score}
          category={riskScore.category}
          explanation={riskScore.explanation}
          isPreliminary={riskScore.is_preliminary}
        />
      )}

      {/* Predicted symptoms */}
      {predictedSymptoms.length > 0 && (
        <div className="mx-4">
          <p className="text-xs text-gray-500 mb-2">Your patterns suggest today may bring:</p>
          <div className="flex flex-wrap gap-1.5">
            {predictedSymptoms.map(({ symptom, probability }) => (
              <span
                key={symptom}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-medium"
              >
                {SYMPTOM_LABELS[symptom]} {Math.round(probability * 100)}%
              </span>
            ))}
          </div>
        </div>
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

      {/* Pollen map button */}
      {profile?.location && (
        <div className="mx-4">
          <button
            onClick={() => setShowHeatmap(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-pilot text-sm font-medium transition-opacity hover:opacity-80"
          >
            <span>🗺️</span>
            <span>View live pollen map</span>
          </button>
        </div>
      )}

      {forecast.length > 0 && <ForecastStrip forecast={forecast.slice(0, 3)} />}
      {forecast.length > 0 && <BestDaysView forecast={forecast} />}

      <TriggerMap
        associations={insights.trigger_associations}
        checkInCount={manualCheckIns.length}
      />

      {riskScore && <Recommendations category={riskScore.category} />}

      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}
      {showHeatmap && profile?.location && (
        <PollenHeatmap
          lat={profile.location.lat}
          lng={profile.location.lng}
          onClose={() => setShowHeatmap(false)}
        />
      )}
    </div>
  );
}
