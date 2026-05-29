import { useMemo } from 'react';
import { useAppStore } from '@/store/appStore';
import type { InsightData, SymptomSourceFlag, TriggerAssociation } from '@/types';
import { getModelEvals, getModelWeights } from '@/lib/storage';

const TRIGGER_KEYS = [
  { key: 'grass_index', label: 'Grass pollen' },
  { key: 'tree_index', label: 'Tree pollen' },
  { key: 'weed_index', label: 'Weed pollen' },
  { key: 'mold_index', label: 'Mold spores' },
  { key: 'ragweed_index', label: 'Ragweed' },
  { key: 'aqi', label: 'Air quality (AQI)' },
] as const;

export function useInsights(): InsightData {
  const checkIns = useAppStore(s => s.checkIns);

  return useMemo(() => {
    const manual = checkIns.filter(c => c.entry_type === 'manual');
    const autoAssumed = checkIns.filter(c => c.entry_type === 'auto_assumed_healthy');

    const withPollen = manual.filter(c => c.pollen_snapshot !== null);

    // Trigger associations: correlation between each pollen index and severity
    const associations: TriggerAssociation[] = TRIGGER_KEYS.map(({ key, label }) => {
      if (withPollen.length < 3) {
        return { trigger: key, label, strength: 0, confidence: 0 };
      }

      const pairs = withPollen.map(c => ({
        x: key === 'aqi'
          ? (c.pollen_snapshot?.aqi ?? 0) / 300
          : (c.pollen_snapshot?.[key as keyof typeof c.pollen_snapshot] as number ?? 0) / 5,
        y: c.severity / 10,
        w: c.confidence_weight,
      }));

      const n = pairs.reduce((s, p) => s + p.w, 0);
      const xMean = pairs.reduce((s, p) => s + p.x * p.w, 0) / n;
      const yMean = pairs.reduce((s, p) => s + p.y * p.w, 0) / n;

      const num = pairs.reduce((s, p) => s + p.w * (p.x - xMean) * (p.y - yMean), 0);
      const denX = Math.sqrt(pairs.reduce((s, p) => s + p.w * (p.x - xMean) ** 2, 0));
      const denY = Math.sqrt(pairs.reduce((s, p) => s + p.w * (p.y - yMean) ** 2, 0));

      const corr = denX > 0 && denY > 0 ? num / (denX * denY) : 0;
      const strength = Math.max(0, corr);
      const confidence = Math.min(1, withPollen.length / 20) * strength;

      return { trigger: key, label, strength, confidence };
    }).sort((a, b) => b.strength - a.strength);

    // Lag pattern detection: does yesterday's grass pollen predict today's severity?
    let lagDetected = false;
    if (withPollen.length >= 7) {
      const lagPairs = withPollen.slice(1).map((c, i) => {
        const prev = withPollen[i];
        return {
          x: prev.pollen_snapshot?.grass_index ?? 0,
          y: c.severity,
        };
      });
      const lagCorr = pearson(lagPairs.map(p => p.x), lagPairs.map(p => p.y));
      lagDetected = lagCorr > 0.4;
    }

    // Symptom source flags
    const sourceFlags: SymptomSourceFlag[] = withPollen
      .filter(c => {
        const snap = c.pollen_snapshot!;
        const pollenSum = snap.grass_index + snap.tree_index + snap.weed_index + snap.mold_index;
        return c.severity >= 5 && pollenSum <= 4 && snap.aqi <= 50;
      })
      .map(c => ({
        date: c.timestamp.slice(0, 10),
        severity: c.severity,
        pollen_sum: (c.pollen_snapshot!.grass_index + c.pollen_snapshot!.tree_index +
          c.pollen_snapshot!.weed_index + c.pollen_snapshot!.mold_index),
        aqi: c.pollen_snapshot!.aqi,
      }))
      .slice(-5);

    // Clearest conditions
    const clearDays = withPollen.filter(c => c.severity <= 2 && c.hours_outside !== null && (c.hours_outside ?? 0) > 1);
    let clearestConditions: string | null = null;
    if (clearDays.length >= 3) {
      const avgGrass = clearDays.reduce((s, c) => s + (c.pollen_snapshot?.grass_index ?? 0), 0) / clearDays.length;
      if (avgGrass <= 2) {
        clearestConditions = 'Low grass pollen days (index 0–2) tend to be your clearest days for outdoor activity.';
      }
    }

    // Model confidence
    const evals = getModelEvals();
    const weights = getModelWeights();
    let leadingModel = 'pollen_index';
    let leadingLogLoss = 1;

    if (weights) {
      const modelKey = (['logistic_regression', 'gradient_boosted_tree', 'weighted_knn'] as const)
        .reduce((a, b) => weights[a] > weights[b] ? a : b);
      leadingModel = modelKey.replace(/_/g, ' ');
      const latest = [...evals].reverse().find(e => e.model === modelKey);
      leadingLogLoss = latest?.log_loss ?? 1;
    }

    const triggerConfidencePct = associations.length > 0
      ? Math.round(associations[0].confidence * 100)
      : 0;

    return {
      manual_checkin_count: manual.length,
      auto_assumed_count: autoAssumed.length,
      trigger_confidence_pct: triggerConfidencePct,
      trigger_associations: associations,
      lag_pattern_detected: lagDetected,
      clearest_conditions: clearestConditions,
      symptom_source_flags: sourceFlags,
      leading_model: leadingModel,
      leading_model_log_loss: leadingLogLoss,
    };
  }, [checkIns]);
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n === 0) return 0;
  const xMean = xs.reduce((s, x) => s + x, 0) / n;
  const yMean = ys.reduce((s, y) => s + y, 0) / n;
  const num = xs.reduce((s, x, i) => s + (x - xMean) * (ys[i] - yMean), 0);
  const denX = Math.sqrt(xs.reduce((s, x) => s + (x - xMean) ** 2, 0));
  const denY = Math.sqrt(ys.reduce((s, y) => s + (y - yMean) ** 2, 0));
  return denX > 0 && denY > 0 ? num / (denX * denY) : 0;
}
