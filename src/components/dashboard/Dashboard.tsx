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
import { PollenGame } from '@/components/pollenGame/PollenGame';

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
  const { manualCheckIns, checkInSubmittedToday, todaysCheckIn } = useCheckIns();
  const insights = useInsights();
  const forecast = useAppStore(s => s.forecast);
  const profile = useAppStore(s => s.profile);
  const illnessFlagged = useAppStore(s => s.lastCheckInIllnessFlagged);
  const overrideIllness = useAppStore(s => s.overrideIllness);
  const [showCheckIn, setShowCheckIn] = useState(false);
  const [showEditCheckIn, setShowEditCheckIn] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [showGame, setShowGame] = useState(false);

  const predictedSymptoms = riskScore?.predicted_symptoms ?? [];
  const streak = insights.streak_days;

  const todayIllnessOverridden = todaysCheckIn?.illness_override === true;

  return (
    <div className="pb-6 space-y-5">
      <div className="px-4 pt-4 flex items-center justify-between">
        <h1 className="font-lora text-xl font-semibold text-gray-900 dark:text-white">Today's flight plan</h1>
        {streak > 1 && (
          <div className="flex items-center gap-1 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-full px-3 py-1">
            <span className="text-sm">🔥</span>
            <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">{streak} day streak</span>
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
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Your patterns suggest today may bring:</p>
          <div className="flex flex-wrap gap-1.5">
            {predictedSymptoms.map(({ symptom, probability }) => (
              <span
                key={symptom}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 font-medium"
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
        <div className="mx-4 space-y-2">
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-xl p-4 flex items-center gap-3">
            <span className="text-2xl">✅</span>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-green-800 dark:text-green-300">Check-in logged</div>
              <div className="text-sm text-green-600 dark:text-green-400">Your data has been recorded for today.</div>
            </div>
            <button
              onClick={() => setShowEditCheckIn(true)}
              className="text-xs text-green-700 dark:text-green-400 underline underline-offset-2 shrink-0"
            >
              Edit
            </button>
          </div>

          {/* Illness flagged — with override option */}
          {illnessFlagged && !todayIllnessOverridden && todaysCheckIn && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
              <span className="text-xl">🤧</span>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-amber-800 dark:text-amber-300 text-sm">Possible cold or illness detected</div>
                <div className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  Pollen is very low but your symptoms are elevated. This check-in has been weighted near-zero in your allergy model so it doesn't skew your personal risk scores.
                </div>
                <button
                  onClick={() => overrideIllness(todaysCheckIn.id)}
                  className="mt-2 text-xs font-medium text-amber-800 dark:text-amber-300 underline underline-offset-2"
                >
                  Override — this was my allergies
                </button>
              </div>
            </div>
          )}

          {/* Override confirmed */}
          {todayIllnessOverridden && (
            <div className="bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700 rounded-xl p-3 flex items-center gap-2">
              <span className="text-base">✓</span>
              <span className="text-xs text-sky-700 dark:text-sky-300">Overridden — counted as allergies in your model.</span>
            </div>
          )}
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
          <p className="text-xs text-center text-gray-400 dark:text-gray-500 mt-1">Takes 30–90 seconds</p>
        </div>
      )}

      {/* Pollen mini-game — shown between check-in 4 and 7 while ML model warms up */}
      {manualCheckIns.length >= 4 && manualCheckIns.length < 7 && (
        <div className="mx-4 bg-gradient-to-br from-sky-50 to-blue-50 dark:from-sky-900/20 dark:to-blue-900/20 border border-sky-200 dark:border-sky-800 rounded-2xl p-4">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-2xl">✈️</span>
            <div>
              <div className="font-semibold text-sky-900 dark:text-sky-100 text-sm">While you wait...</div>
              <div className="text-xs text-sky-600 dark:text-sky-400">
                {7 - manualCheckIns.length} more check-in{7 - manualCheckIns.length !== 1 ? 's' : ''} until your ML model activates
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mb-3 leading-relaxed">
            Play a quick game to learn what causes pollen — and what the weather has to do with your symptoms.
          </p>
          <button
            onClick={() => setShowGame(true)}
            className="w-full bg-sky-500 text-white font-semibold py-2.5 rounded-xl text-sm hover:bg-sky-600 active:scale-[0.98] transition-all"
          >
            🎮 Play: Pollen Pilot
          </button>
        </div>
      )}

      {pollenData && <PollenRadar data={pollenData} />}

      {/* Pollen map button */}
      {profile?.location && (
        <div className="mx-4">
          <button
            onClick={() => setShowHeatmap(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-700 text-sky-pilot text-sm font-medium transition-opacity hover:opacity-80"
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

      {showGame && (
        <PollenGame
          onClose={() => setShowGame(false)}
          checkInsRemaining={7 - manualCheckIns.length}
        />
      )}
      {showCheckIn && <CheckInModal onClose={() => setShowCheckIn(false)} />}
      {showEditCheckIn && todaysCheckIn && (
        <CheckInModal
          onClose={() => setShowEditCheckIn(false)}
          initialCheckIn={todaysCheckIn}
        />
      )}
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
