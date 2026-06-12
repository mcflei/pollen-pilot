import { useEffect, useRef, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/appStore';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Nav } from '@/components/layout/Nav';
import { TabBar } from '@/components/layout/TabBar';
import { AuthScreen } from '@/components/auth/AuthScreen';
import { ResetPasswordScreen } from '@/components/auth/ResetPasswordScreen';
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow';
import { Dashboard } from '@/components/dashboard/Dashboard';
import { InsightsPage } from '@/components/insights/InsightsPage';
import { SettingsPage } from '@/components/settings/SettingsPage';
import { AchievementToast } from '@/components/achievements/AchievementToast';
import { msUntilLocalMidnight } from '@/lib/dateUtils';

export function App() {
  useDarkMode(); // Apply dark class immediately on every mount, not just when Settings tab is visited
  const initApp = useAppStore(s => s.initApp);
  const resetDailyState = useAppStore(s => s.resetDailyState);
  const onboardingDone = useAppStore(s => s.onboardingDone);
  const isLoading = useAppStore(s => s.isLoading);
  const midnightTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset check-in status at local midnight while the app is open
  useEffect(() => {
    function scheduleMidnightReset() {
      midnightTimerRef.current = setTimeout(() => {
        resetDailyState();
        scheduleMidnightReset();
      }, msUntilLocalMidnight());
    }
    scheduleMidnightReset();
    return () => {
      if (midnightTimerRef.current !== null) clearTimeout(midnightTimerRef.current);
    };
  }, [resetDailyState]);

  // undefined = still checking session | null = not logged in | User = logged in
  const [authUser, setAuthUser] = useState<User | null | undefined>(undefined);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setAuthUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }
      // Don't clear isPasswordRecovery on other events (e.g. SIGNED_IN fires right after
      // PASSWORD_RECOVERY) — only clear it when the user completes the reset via onDone.
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

  if (isPasswordRecovery) {
    return <ResetPasswordScreen onDone={() => setIsPasswordRecovery(false)} />;
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
      <AchievementToast />
    </div>
  );
}
