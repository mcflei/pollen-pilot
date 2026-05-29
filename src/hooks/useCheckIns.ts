import { useAppStore } from '@/store/appStore';
import type { CheckIn } from '@/types';

export function useCheckIns() {
  const checkIns = useAppStore(s => s.checkIns);
  const submitCheckIn = useAppStore(s => s.submitCheckIn);
  const checkInSubmittedToday = useAppStore(s => s.checkInSubmittedToday);

  const manualCheckIns = checkIns.filter(c => c.entry_type === 'manual');
  const today = new Date().toISOString().slice(0, 10);
  const todaysCheckIn: CheckIn | undefined = checkIns.find(
    c => c.entry_type === 'manual' && c.timestamp.slice(0, 10) === today
  );

  return { checkIns, manualCheckIns, submitCheckIn, checkInSubmittedToday, todaysCheckIn };
}
