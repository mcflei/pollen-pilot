import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/appStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Nav } from '@/components/layout/Nav';
import { TabBar } from '@/components/layout/TabBar';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { InsightsPage } from '@/components/insights/InsightsPage';
import { SettingsPage } from '@/components/settings/SettingsPage';

export function App() {
  useDarkMode(); // Apply dark class immediately on every mount, not just when Settings tab is visited
  const initApp = useAppStore(s => s.initApp);
  const onboardingDone = useAppStore(s => s.onboardingDone);
  const isLoading = useAppStore(s => s.isLoading);

  // undefined = still checking session | null = not logged in | User = logged in
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (authUser) {
      initApp().catch(err => console.error('[initApp error]', err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authUser]);

  if (authUser === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-sky-50 to-white">
        <div className="text-sky-pilot text-sm">Loading…</div>
      </div>
    );
  }

  if (!authUser) {
    return <AuthScreen />;
  }

  if (!onboardingDone) {
    return <OnboardingFlow />;
  }

  return (
    <div className="min-h-screen flex flex-col max-w-lg mx-auto">
      <Nav />
      <main className="flex-1 overflow-y-auto">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <div className="text-sky-pilot text-sm">Loading flight data…</div>
          </div>
        )}
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/insights" element={<InsightsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}
