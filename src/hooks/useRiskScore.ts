import { useAppStore } from '@/store/appStore';
import { getRiskLabel } from '@/lib/models/ensemble';

export function useRiskScore() {
  const riskScore = useAppStore(s => s.riskScore);
  const label = riskScore ? getRiskLabel(riskScore.category) : null;
  return { riskScore, label };
}
