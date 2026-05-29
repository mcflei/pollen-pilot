import { useAppStore } from '@/store/appStore';

export function Nav() {
  const profile = useAppStore(s => s.profile);
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
      <div>
        <div className="font-lora text-lg font-semibold text-gray-900">Pollen Pilot</div>
        <div className="text-xs text-gray-500">{today}</div>
      </div>
      {profile?.location && (
        <div className="flex items-center gap-1 text-xs text-sky-pilot font-medium">
          <span>📍</span>
          <span>{profile.location.city}</span>
        </div>
      )}
    </header>
  );
}
