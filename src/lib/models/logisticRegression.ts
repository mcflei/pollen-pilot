import type { LogisticRegressionModel, TrainSample } from '@/types';
import { featureToArray } from './featureEngineering';

const FEATURE_COUNT = 32;
const LEARNING_RATE = 0.01;
const REGULARIZATION = 0.001;
const ITERATIONS = 500;

function sigmoid(x: number): number {
  return 1 / (1 + Math.exp(-x));
}

function dotProduct(a: number[], b: number[]): number {
  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}

export function trainLogisticRegression(samples: TrainSample[], maxIterations = ITERATIONS): LogisticRegressionModel {
  if (samples.length === 0) {
    return {
      weights: new Array(FEATURE_COUNT + 1).fill(0),
      learning_rate: LEARNING_RATE,
      regularization: REGULARIZATION,
      iterations_trained: 0,
    };
  }

  const weights = new Array(FEATURE_COUNT + 1).fill(0);
  const n = samples.length;

  for (let iter = 0; iter < maxIterations; iter++) {
    const gradients = new Array(FEATURE_COUNT + 1).fill(0);

    for (const sample of samples) {
      const x = [1, ...featureToArray(sample.features)];
      const pred = sigmoid(dotProduct(x, weights));
      const err = (pred - sample.target) * sample.weight;
      for (let j = 0; j < weights.length; j++) {
        gradients[j] += (err * x[j]) / n;
      }
    }

    for (let j = 0; j < weights.length; j++) {
      const reg = j === 0 ? 0 : REGULARIZATION * weights[j];
      weights[j] -= LEARNING_RATE * (gradients[j] + reg);
    }
  }

  return {
    weights,
    learning_rate: LEARNING_RATE,
    regularization: REGULARIZATION,
    iterations_trained: maxIterations,
  };
}

export function predictLR(model: LogisticRegressionModel, features: number[]): number {
  const x = [1, ...features];
  const prob = sigmoid(dotProduct(x, model.weights));
  return Math.round(prob * 100);
}

export function logLossLR(model: LogisticRegressionModel, samples: TrainSample[]): number {
  if (samples.length === 0) return 1;
  const eps = 1e-7;
  const loss = samples.reduce((sum, s) => {
    const x = [1, ...featureToArray(s.features)];
    const pred = Math.max(eps, Math.min(1 - eps, sigmoid(dotProduct(x, model.weights))));
    return sum + -(s.target * Math.log(pred) + (1 - s.target) * Math.log(1 - pred));
  }, 0);
  return loss / samples.length;
}
