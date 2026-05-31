export type SymptomKey =
  | 'sneezing'
  | 'itchy_eyes'
  | 'congestion'
  | 'watery_eyes'
  | 'coughing'
  | 'headache'
  | 'fatigue'
  | 'throat_irritation';

export type MedicationCategory =
  | 'oral_antihistamine'
  | 'nasal_corticosteroid'
  | 'nasal_antihistamine'
  | 'decongestant'
  | 'eye_drop'
  | 'leukotriene_modifier'
  | 'combination'
  | 'immunotherapy'
  | 'nasal_saline'
  | 'other';

export interface MedicationEntry {
  raw_input: string;
  matched_name: string | null;
  generic: string | null;
  category: MedicationCategory | null;
  dose_form: string | null;
  confidence: number;
}

export interface MedicationDBEntry {
  brand: string;
  generic: string;
  category: MedicationCategory;
  dose_form: string;
}

export interface MedicationEffectiveness {
  category: MedicationCategory;
  display_name: string;
  mean_with: number;
  mean_without: number;
  sample_size: number;
  effective: boolean;
}

export interface PollenSnapshot {
  date: string;
  location: { lat: number; lng: number; city: string };
  grass_index: number;
  tree_index: number;
  weed_index: number;
  mold_index: number;
  ragweed_index: number;
  temperature_f: number;
  humidity_pct: number;
  wind_mph: number;
  precip_intensity: number;
  aqi: number;
  source: 'tomorrow_io' | 'mock';
}

export interface ForecastDay {
  date: string;
  snapshot: PollenSnapshot;
  score: number;
  category: RiskCategory;
}

export interface CheckIn {
  id: string;
  timestamp: string;
  entry_type: 'manual' | 'auto_assumed_healthy';
  confidence_weight: number;
  severity: number;
  symptoms: SymptomKey[];
  notes: string;
  hours_outside: number | null;
  windows_open: boolean;
  exercised_outside: boolean;
  medications: MedicationEntry[];
  sleep_hours: number;
  sleep_quality: 'poor' | 'fair' | 'good' | 'great';
  air_purifier_on: boolean;
  pollen_snapshot: PollenSnapshot | null;
  possible_illness?: boolean;
}

export interface UserProfile {
  id: string;
  created_at: string;
  location: { lat: number; lng: number; city: string } | null;
  checkin_frequency: 'once' | 'twice' | 'every_other' | 'custom';
  custom_checkin_times: string[];
  assume_healthy_on_miss: boolean;
  typical_outdoor_activity: 'low' | 'moderate' | 'high';
  default_medications: string[];
  onboarding_complete: boolean;
  allergen_profile?: {
    grass: boolean;
    tree: boolean;
    weed: boolean;
    ragweed: boolean;
    mold: boolean;
  };
  notifications: {
    checkin_reminder: boolean;
    reminder_times: string[];
    reminder_days: number[] | null;
    reminder_timezone: string;
    high_risk_alert: boolean;
    clear_skies_alert: boolean;
  };
}

export interface FeatureVector {
  // Today's pollen
  grass_norm: number;
  tree_norm: number;
  weed_norm: number;
  mold_norm: number;
  // 1-day lags
  grass_lag1: number;
  tree_lag1: number;
  // 2-3 day lags (accumulation effect)
  grass_lag2: number;
  grass_lag3: number;
  tree_lag2: number;
  // Rolling averages
  grass_3day_avg: number;
  tree_3day_avg: number;
  // Trend
  grass_rising: number;
  // Sustained high pollen: fraction of last 5 days with high pollen
  days_high_pollen_last5: number;
  // Rainfall washes pollen — exponential decay over 4 days
  rain_washout_decay: number;
  // Weather
  humidity_norm: number;
  wind_norm: number;
  temp_norm: number;
  // Interactions
  grass_x_humidity: number;
  grass_x_wind: number;
  outdoor_x_grass: number;
  // Behavior
  hours_outside_norm: number;
  exercised_outside: number;
  took_antihistamine: number;
  took_nasal_spray: number;
  sleep_hours_norm: number;
  sleep_quality_num: number;
  // Cyclical time
  day_of_week_sin: number;
  day_of_week_cos: number;
  week_of_year_sin: number;
  week_of_year_cos: number;
  // Personalization
  days_into_season: number;
  personal_severity_baseline: number;
}

export interface TrainSample {
  features: FeatureVector;
  target: number;
  weight: number;
}

export interface LogisticRegressionModel {
  weights: number[];
  learning_rate: number;
  regularization: number;
  iterations_trained: number;
}

export interface DecisionTreeNode {
  feature_index?: number;
  threshold?: number;
  left?: DecisionTreeNode;
  right?: DecisionTreeNode;
  value?: number;
}

export interface GBDTModel {
  trees: DecisionTreeNode[];
  learning_rate: number;
  n_estimators: number;
  base_prediction: number;
}

export interface KNNModel {
  k: number;
  distance_metric: 'euclidean';
  feature_weights: number[];
}

export interface ModelWeights {
  logistic_regression: number;
  gradient_boosted_tree: number;
  weighted_knn: number;
  last_updated: string;
  checkins_at_last_update: number;
}

export interface ModelEvalResult {
  model: 'logistic_regression' | 'gradient_boosted_tree' | 'weighted_knn';
  log_loss: number;
  mae: number;
  n_eval_samples: number;
  evaluated_at: string;
}

export type RiskCategory = 'clear' | 'light' | 'turbulence' | 'high';

export interface RiskScore {
  score: number;
  category: RiskCategory;
  explanation: string | null;
  leading_model: string;
  model_confidence: number;
  top_features: { name: string; contribution: number }[];
  is_preliminary: boolean;
  predicted_symptoms: { symptom: SymptomKey; probability: number }[];
  medication_effectiveness: MedicationEffectiveness[];
}

export interface TriggerAssociation {
  trigger: string;
  strength: number;
  confidence: number;
  label: string;
}

export interface InsightData {
  manual_checkin_count: number;
  auto_assumed_count: number;
  trigger_confidence_pct: number;
  trigger_associations: TriggerAssociation[];
  lag_pattern_detected: boolean;
  clearest_conditions: string | null;
  symptom_source_flags: SymptomSourceFlag[];
  leading_model: string;
  leading_model_log_loss: number;
  streak_days: number;
  medication_effectiveness: MedicationEffectiveness[];
}

export interface SymptomSourceFlag {
  date: string;
  severity: number;
  pollen_sum: number;
  aqi: number;
}

export interface PollenCacheEntry {
  data: PollenSnapshot;
  fetched_at: string;
  explanation?: string;
}
