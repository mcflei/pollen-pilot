import { useAppStore } from '@/store/appStore';
import { localDateStr, localDateOf } from '@/lib/dateUtils';
import type { CheckIn } from '@/types';

export function useCheckIns() {
  const checkIns = useAppStore(s => s.checkIns);
  const submitCheckIn = useAppStore(s => s.submitCheckIn);
  const checkInSubmittedToday = useAppStore(s => s.checkInSubmittedToday);

  const manualCheckIns = checkIns.filter(c => c.entry_type === 'manual');
  const today = localDateStr();
  const todaysCheckIn: CheckIn | undefined = checkIns.find(
    c => c.entry_type === 'manual' && localDateOf(c.timestamp) === today
  );

  return { checkIns, manualCheckIns, submitCheckIn, checkInSubmittedToday, todaysCheckIn };
}
