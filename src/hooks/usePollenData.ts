import { useAppStore } from '@/store/appStore';

export function usePollenData() {
  const pollenData = useAppStore(s => s.pollenData);
  const refreshPollenData = useAppStore(s => s.refreshPollenData);
  const isLoading = useAppStore(s => s.isLoading);
  return { pollenData, refreshPollenData, isLoading };
}
