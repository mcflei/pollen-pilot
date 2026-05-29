import { useState } from 'react';
import { OnboardingSlide1 } from './OnboardingSlide1';
import { OnboardingSlide2 } from './OnboardingSlide2';
import { OnboardingSlide3 } from './OnboardingSlide3';
import { useAppStore } from '@/store/appStore';
import type { UserProfile } from '@/types';

export function OnboardingFlow() {
  const [step, setStep] = useState(1);
  const [prefs, setPrefs] = useState<Partial<UserProfile>>({});
  const completeOnboarding = useAppStore(s => s.completeOnboarding);

  function handleSlide2(p: Pick<UserProfile, 'checkin_frequency' | 'custom_checkin_times' | 'assume_healthy_on_miss'>) {
    setPrefs(prev => ({ ...prev, ...p }));
    setStep(3);
  }

  function handleFinish() {
    const profile: UserProfile = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      location: null,
      checkin_frequency: prefs.checkin_frequency ?? 'once',
      custom_checkin_times: prefs.custom_checkin_times ?? [],
      assume_healthy_on_miss: prefs.assume_healthy_on_miss ?? true,
      typical_outdoor_activity: 'moderate',
      default_medications: [],
      onboarding_complete: true,
      notifications: {
        checkin_reminder: false,
        reminder_times: ['09:00'],
        reminder_days: null,
        reminder_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        high_risk_alert: true,
        clear_skies_alert: true,
      },
    };
    completeOnboarding(profile);
  }

  return (
    <>
      {step === 1 && <OnboardingSlide1 onNext={() => setStep(2)} />}
      {step === 2 && <OnboardingSlide2 onNext={handleSlide2} />}
      {step === 3 && <OnboardingSlide3 onFinish={handleFinish} />}
    </>
  );
}
