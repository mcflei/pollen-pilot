import type {
  CheckIn,
  ModelWeights,
  RiskCategory,
  RiskScore,
  TrainSample,
  PollenSnapshot,
} from '@/types';
import {
  buildFeatureVector,
  featureToArray,
  FEATURE_NAMES,
  FEATURE_DISPLAY_NAMES,
} from './featureEngineering';
import { trainLogisticRegression, predictLR, logLossLR } from './logisticRegression';
import { trainGBDT, predictGBDT, logLossGBDT, nTreesForCheckInCount } from './gradientBoostedTree';
import { buildKNNModel, predictKNN, logLossKNN } from './weightedKNN';
import {
  getModelWeights,
  saveModelWeights,
  appendModelEval,
  getSnapshotForDate,
} from '@/lib/storage';

const MIN_CHECKINS_FOR_MODEL = 7;
const EVAL_HOLDOUT = 5;

const DEFAULT_WEIGHTS: ModelWeights = {
  logistic_regression: 0.333,
  gradient_boosted_tree: 0.334,
  weighted_knn: 0.333,
  last_updated: new Date().toISOString(),
  checkins_at_last_update: 0,
};

export function getRiskCategory(score: number): RiskCategory {
  if (score <= 25) return 'clear';
  if (score <= 50) return 'light';
  if (score <= 75) return 'turbulence';
  return 'high';
}

export function getRiskLabel(category: RiskCategory): string {
  const labels: Record<RiskCategory, string> = {
    clear: 'Clear Skies',
    light: 'Light Pollen Traffic',
    turbulence: 'Turbulence Possible',
    high: 'High Pollen Turbulence',
  };
  return labels[category];
}

function pollenOnlyScore(snapshot: PollenSnapshot): number {
  const avg =
    (snapshot.grass_index + snapshot.tree_index + snapshot.weed_index + snapshot.mold_index) / 4;
  return Math.round(Math.min(100, avg * 20));
}

function buildTrainSamples(checkIns: CheckIn[]): { samples: TrainSample[]; checkins: CheckIn[] } {
  const samples: TrainSample[] = [];
  const usedCheckins: CheckIn[] = [];

  for (let i = 0; i < checkIns.length; i++) {
    const c = checkIns[i];
    if (!c.pollen_snapshot) continue;

    const prevDate = new Date(new Date(c.timestamp).getTime() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const prevSnap = getSnapshotForDate(prevDate);
    const features = buildFeatureVector(c, prevSnap);

    samples.push({
      features,
      target: c.severity / 10,
      weight: c.confidence_weight,
    });
    usedCheckins.push(c);
  }

  return { samples, checkins: usedCheckins };
}

export function getTopFeatureContributions(
  weights: number[],
  features: number[]
): { name: string; contribution: number }[] {
  const contributions = FEATURE_NAMES.map((name, i) => ({
    name: FEATURE_DISPLAY_NAMES[name],
    contribution: Math.abs(weights[i + 1] ?? 0) * features[i],
  }));
  return contributions
    .sort((a, b) => b.contribution - a.contribution)
    .slice(0, 5)
    .filter(c => c.contribution > 0);
}

export function computeRiskScore(checkIns: CheckIn[], todaySnapshot: PollenSnapshot): RiskScore {
  const manualCheckins = checkIns.filter(c => c.entry_type === 'manual');

  if (manualCheckins.length < MIN_CHECKINS_FOR_MODEL) {
    const score = pollenOnlyScore(todaySnapshot);
    return {
      score,
      category: getRiskCategory(score),
      explanation: null,
      leading_model: 'pollen_index',
      model_confidence: 0,
      top_features: [],
      is_preliminary: true,
    };
  }

  const { samples, checkins } = buildTrainSamples(checkIns);
  if (samples.length < MIN_CHECKINS_FOR_MODEL) {
    const score = pollenOnlyScore(todaySnapshot);
    return {
      score,
      category: getRiskCategory(score),
      explanation: null,
      leading_model: 'pollen_index',
      model_confidence: 0,
      top_features: [],
      is_preliminary: true,
    };
  }

  const nTrees = nTreesForCheckInCount(samples.length);
  const lrModel = trainLogisticRegression(samples);
  const gbdtModel = trainGBDT(samples, nTrees);
  const knnModel = buildKNNModel(20);

  const todayCheckin: CheckIn = {
    id: 'today',
    timestamp: new Date().toISOString(),
    entry_type: 'manual',
    confidence_weight: 1,
    severity: 0,
    symptoms: [],
    notes: '',
    hours_outside: null,
    windows_open: false,
    exercised_outside: false,
    medications: [],
    sleep_hours: 7,
    sleep_quality: 'good',
    air_purifier_on: false,
    pollen_snapshot: todaySnapshot,
  };

  const prevDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const prevSnap = getSnapshotForDate(prevDate);
  const todayFeatures = buildFeatureVector(todayCheckin, prevSnap);
  const todayFeatArr = featureToArray(todayFeatures);

  const lrScore = predictLR(lrModel, todayFeatArr);
  const gbdtScore = predictGBDT(gbdtModel, todayFeatArr);
  const knnScore = predictKNN(knnModel, samples, todayFeatArr, checkins);

  const modelWeights = getModelWeights() ?? DEFAULT_WEIGHTS;

  const ensembleScore = Math.round(
    lrScore * modelWeights.logistic_regression +
      gbdtScore * modelWeights.gradient_boosted_tree +
      knnScore * modelWeights.weighted_knn
  );

  const scores = {
    logistic_regression: lrScore,
    gradient_boosted_tree: gbdtScore,
    weighted_knn: knnScore,
  };
  const leadingModelKey = (Object.keys(scores) as (keyof typeof scores)[]).reduce((a, b) =>
    modelWeights[a] > modelWeights[b] ? a : b
  );

  const topFeatures = getTopFeatureContributions(lrModel.weights, todayFeatArr);
  const isPreliminary = manualCheckins.length < 15;

  return {
    score: Math.max(0, Math.min(100, ensembleScore)),
    category: getRiskCategory(ensembleScore),
    explanation: null,
    leading_model: leadingModelKey.replace(/_/g, ' '),
    model_confidence: modelWeights[leadingModelKey],
    top_features: topFeatures,
    is_preliminary: isPreliminary,
  };
}

export function selfEvaluate(checkIns: CheckIn[]): void {
  const { samples, checkins } = buildTrainSamples(checkIns);
  if (samples.length <= EVAL_HOLDOUT + MIN_CHECKINS_FOR_MODEL) return;

  const trainSamples = samples.slice(0, -EVAL_HOLDOUT);
  const trainCheckins = checkins.slice(0, -EVAL_HOLDOUT);
  const evalSamples = samples.slice(-EVAL_HOLDOUT);

  const nTrees = nTreesForCheckInCount(trainSamples.length);
  const lrModel = trainLogisticRegression(trainSamples);
  const gbdtModel = trainGBDT(trainSamples, nTrees);
  const knnModel = buildKNNModel(20);

  const lrLoss = logLossLR(lrModel, evalSamples);
  const gbdtLoss = logLossGBDT(gbdtModel, evalSamples);
  const knnLoss = logLossKNN(knnModel, trainSamples, evalSamples, trainCheckins);

  const now = new Date().toISOString();
  appendModelEval({ model: 'logistic_regression', log_loss: lrLoss, mae: 0, n_eval_samples: evalSamples.length, evaluated_at: now });
  appendModelEval({ model: 'gradient_boosted_tree', log_loss: gbdtLoss, mae: 0, n_eval_samples: evalSamples.length, evaluated_at: now });
  appendModelEval({ model: 'weighted_knn', log_loss: knnLoss, mae: 0, n_eval_samples: evalSamples.length, evaluated_at: now });

  const invLR = 1 / Math.max(lrLoss, 1e-7);
  const invGBDT = 1 / Math.max(gbdtLoss, 1e-7);
  const invKNN = 1 / Math.max(knnLoss, 1e-7);
  const total = invLR + invGBDT + invKNN;

  saveModelWeights({
    logistic_regression: invLR / total,
    gradient_boosted_tree: invGBDT / total,
    weighted_knn: invKNN / total,
    last_updated: now,
    checkins_at_last_update: samples.length,
  });
}
