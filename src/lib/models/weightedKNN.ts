import type { CheckIn, KNNModel, TrainSample } from '@/types';
import { featureToArray } from './featureEngineering';

const DEFAULT_K = 5;
const RECENCY_BONUS = 1.1;
const RECENCY_DAYS = 30;

function euclidean(a: number[], b: number[], weights: number[]): number {
  return Math.sqrt(
    a.reduce((sum, ai, i) => sum + weights[i] * (ai - b[i]) ** 2, 0)
  );
}

export function buildKNNModel(featureCount: number): KNNModel {
  return {
    k: DEFAULT_K,
    distance_metric: 'euclidean',
    feature_weights: new Array(featureCount).fill(1),
  };
}

export function predictKNN(
  model: KNNModel,
  samples: TrainSample[],
  queryFeatures: number[],
  referenceCheckIns: CheckIn[]
): number {
  if (samples.length === 0) return 50;

  const k = Math.min(model.k, samples.length);
  const now = Date.now();

  const distances = samples.map((s, i) => {
    const dist = euclidean(featureToArray(s.features), queryFeatures, model.feature_weights);
    const checkIn = referenceCheckIns[i];
    const ageMs = checkIn
      ? now - new Date(checkIn.timestamp).getTime()
      : Infinity;
    const isRecent = ageMs < RECENCY_DAYS * 24 * 60 * 60 * 1000;
    const adjustedDist = isRecent ? dist / RECENCY_BONUS : dist;
    return { dist: adjustedDist, target: s.target, weight: s.weight };
  });

  distances.sort((a, b) => a.dist - b.dist);
  const neighbors = distances.slice(0, k);

  const weightSum = neighbors.reduce((sum, n) => {
    const invDist = n.dist > 0 ? 1 / n.dist : 1e6;
    return sum + invDist * n.weight;
  }, 0);

  if (weightSum === 0) return 50;

  const prediction = neighbors.reduce((sum, n) => {
    const invDist = n.dist > 0 ? 1 / n.dist : 1e6;
    return sum + (invDist * n.weight * n.target) / weightSum;
  }, 0);

  return Math.round(Math.max(0, Math.min(1, prediction)) * 100);
}

export function logLossKNN(
  model: KNNModel,
  trainSamples: TrainSample[],
  evalSamples: TrainSample[],
  trainCheckIns: CheckIn[]
): number {
  if (evalSamples.length === 0) return 1;
  const eps = 1e-7;
  const loss = evalSamples.reduce((sum, evalS) => {
    const rawPred = predictKNN(model, trainSamples, featureToArray(evalS.features), trainCheckIns) / 100;
    const pred = Math.max(eps, Math.min(1 - eps, rawPred));
    return sum + -(evalS.target * Math.log(pred) + (1 - evalS.target) * Math.log(1 - pred));
  }, 0);
  return loss / evalSamples.length;
}
