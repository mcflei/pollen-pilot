import type { DecisionTreeNode, GBDTModel, TrainSample } from '@/types';
import { featureToArray } from './featureEngineering';

const MAX_DEPTH = 3;
const GBDT_LEARNING_RATE = 0.1;

function buildTree(
  samples: { x: number[]; residual: number; weight: number }[],
  depth: number
): DecisionTreeNode {
  if (samples.length === 0) return { value: 0 };

  const weightedSum = samples.reduce((s, r) => s + r.residual * r.weight, 0);
  const weightTotal = samples.reduce((s, r) => s + r.weight, 0);
  const leafValue = weightTotal > 0 ? weightedSum / weightTotal : 0;

  if (depth >= MAX_DEPTH || samples.length < 4) {
    return { value: leafValue };
  }

  let bestGain = -Infinity;
  let bestFeature = 0;
  let bestThreshold = 0;

  const nFeatures = samples[0].x.length;
  for (let fi = 0; fi < nFeatures; fi++) {
    const values = [...new Set(samples.map(s => s.x[fi]))].sort((a, b) => a - b);
    for (let ti = 0; ti < values.length - 1; ti++) {
      const threshold = (values[ti] + values[ti + 1]) / 2;
      const left = samples.filter(s => s.x[fi] <= threshold);
      const right = samples.filter(s => s.x[fi] > threshold);
      if (left.length === 0 || right.length === 0) continue;

      const gain =
        -variance(left) * left.length -
        variance(right) * right.length +
        variance(samples) * samples.length;

      if (gain > bestGain) {
        bestGain = gain;
        bestFeature = fi;
        bestThreshold = threshold;
      }
    }
  }

  if (bestGain <= 0) return { value: leafValue };

  const leftSamples = samples.filter(s => s.x[bestFeature] <= bestThreshold);
  const rightSamples = samples.filter(s => s.x[bestFeature] > bestThreshold);

  return {
    feature_index: bestFeature,
    threshold: bestThreshold,
    left: buildTree(leftSamples, depth + 1),
    right: buildTree(rightSamples, depth + 1),
  };
}

function variance(samples: { residual: number; weight: number }[]): number {
  if (samples.length === 0) return 0;
  const wt = samples.reduce((s, r) => s + r.weight, 0);
  const mean = samples.reduce((s, r) => s + r.residual * r.weight, 0) / wt;
  return samples.reduce((s, r) => s + r.weight * (r.residual - mean) ** 2, 0) / wt;
}

function predictTree(node: DecisionTreeNode, x: number[]): number {
  if (node.value !== undefined) return node.value;
  if (node.feature_index === undefined || node.threshold === undefined) return 0;
  if (x[node.feature_index] <= node.threshold) {
    return predictTree(node.left!, x);
  }
  return predictTree(node.right!, x);
}

export function trainGBDT(samples: TrainSample[], nTrees: number): GBDTModel {
  if (samples.length === 0) {
    return { trees: [], learning_rate: GBDT_LEARNING_RATE, n_estimators: 0, base_prediction: 0.5 };
  }

  const wt = samples.reduce((s, r) => s + r.weight, 0);
  const basePred = samples.reduce((s, r) => s + r.target * r.weight, 0) / wt;
  const trees: DecisionTreeNode[] = [];
  const predictions = samples.map(() => basePred);

  for (let t = 0; t < nTrees; t++) {
    const residuals = samples.map((s, i) => ({
      x: featureToArray(s.features),
      residual: s.target - predictions[i],
      weight: s.weight,
    }));

    const tree = buildTree(residuals, 0);
    trees.push(tree);

    for (let i = 0; i < samples.length; i++) {
      predictions[i] += GBDT_LEARNING_RATE * predictTree(tree, featureToArray(samples[i].features));
    }
  }

  return {
    trees,
    learning_rate: GBDT_LEARNING_RATE,
    n_estimators: nTrees,
    base_prediction: basePred,
  };
}

export function predictGBDT(model: GBDTModel, features: number[]): number {
  let pred = model.base_prediction;
  for (const tree of model.trees) {
    pred += model.learning_rate * predictTree(tree, features);
  }
  return Math.round(Math.max(0, Math.min(1, pred)) * 100);
}

export function logLossGBDT(model: GBDTModel, samples: TrainSample[]): number {
  if (samples.length === 0) return 1;
  const eps = 1e-7;
  const loss = samples.reduce((sum, s) => {
    let raw = model.base_prediction;
    const x = featureToArray(s.features);
    for (const tree of model.trees) {
      raw += model.learning_rate * predictTree(tree, x);
    }
    const pred = Math.max(eps, Math.min(1 - eps, raw));
    return sum + -(s.target * Math.log(pred) + (1 - s.target) * Math.log(1 - pred));
  }, 0);
  return loss / samples.length;
}

export function nTreesForCheckInCount(count: number): number {
  return Math.min(50, 10 + Math.floor(count / 10) * 5);
}
