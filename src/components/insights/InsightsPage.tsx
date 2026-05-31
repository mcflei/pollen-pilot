import { useInsights } from '@/hooks/useInsights';
import { useCheckIns } from '@/hooks/useCheckIns';
import { useRiskScore } from '@/hooks/useRiskScore';
import { TriggerMapChart } from './TriggerMapChart';
import { TrendChart } from './TrendChart';
import { SymptomSourceCheck } from './SymptomSourceCheck';
import { CalendarHeatmap } from './CalendarHeatmap';
import { MedicationEffectivenessSection } from './MedicationEffectivenessSection';

export function InsightsPage() {
  const insights = useInsights();
  const { checkIns, manualCheckIns } = useCheckIns();
  const { riskScore } = useRiskScore();
  const medEffectiveness = riskScore?.medication_effectiveness ?? [];

  return (
    <div className="pb-6 space-y-5">
      <div className="px-4 pt-4">
        <h1 className="font-lora text-xl font-semibold text-gray-900">Your allergy route</h1>
        <p className="text-sm text-gray-500 mt-0.5">Patterns from your check-ins</p>
      </div>

      {/* Stats row */}
      <div className="mx-4 grid grid-cols-3 gap-2">
        {[
          { label: 'Check-ins', value: insights.manual_checkin_count },
          { label: 'Streak', value: `${insights.streak_days}d` },
          { label: 'Trigger confidence', value: `${insights.trigger_confidence_pct}%` },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3 text-center">
            <div className="font-bold text-lg text-gray-900">{s.value}</div>
            <div className="text-xs text-gray-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Calendar heatmap */}
      <div className="mx-4">
        <h3 className="font-semibold text-gray-900 mb-3">60-day history</h3>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
          <CalendarHeatmap checkIns={checkIns} />
        </div>
      </div>

      {manualCheckIns.length < 7 && (
        <div className="mx-4 bg-sky-50 border border-sky-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1">
            <span>🔍</span>
            <span className="font-semibold text-sky-900 text-sm">Building your allergy route</span>
          </div>
          <p className="text-sm text-sky-700">
            Pollen Pilot needs at least 7 manual check-ins to start detecting patterns.
            You have {manualCheckIns.length} so far — keep going!
          </p>
        </div>
      )}

      {/* Trigger map */}
      <div className="mx-4">
        <h3 className="font-semibold text-gray-900 mb-3">Trigger associations</h3>
        <TriggerMapChart associations={insights.trigger_associations} />
      </div>

      {/* Trend chart */}
      <div className="mx-4">
        <h3 className="font-semibold text-gray-900 mb-3">Symptom & pollen trend (14 days)</h3>
        <TrendChart checkIns={checkIns} />
      </div>

      {/* Medication effectiveness */}
      {medEffectiveness.length > 0 && (
        <div className="mx-4">
          <MedicationEffectivenessSection data={medEffectiveness} />
        </div>
      )}

      {/* Lag detection */}
      {insights.lag_pattern_detected && (
        <div className="mx-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <div className="font-semibold text-amber-900 text-sm">Lag pattern detected</div>
              <p className="text-sm text-amber-700 mt-0.5">
                Your symptoms may be associated with the previous day's grass pollen levels, not just today's.
                This lag effect is common and your predictions account for it.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Clearest conditions */}
      {insights.clearest_conditions && (
        <div className="mx-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-2">
            <span className="text-lg">🌤️</span>
            <div>
              <div className="font-semibold text-blue-900 text-sm">Your clearest conditions</div>
              <p className="text-sm text-blue-700 mt-0.5">{insights.clearest_conditions}</p>
            </div>
          </div>
        </div>
      )}

      {/* Symptom source check */}
      <div className="mx-4">
        <SymptomSourceCheck flags={insights.symptom_source_flags} />
      </div>

      {/* Model info */}
      <div className="mx-4 bg-gray-50 rounded-xl p-4">
        <h3 className="font-semibold text-gray-800 text-sm mb-1">Model status</h3>
        <div className="text-xs text-gray-500">
          Leading model: <span className="font-medium text-gray-700">{insights.leading_model}</span>
        </div>
        {insights.leading_model_log_loss < 1 && (
          <div className="text-xs text-gray-500">
            Log-loss: <span className="font-medium text-gray-700">{insights.leading_model_log_loss.toFixed(3)}</span>
          </div>
        )}
      </div>
    </div>
  );
}
