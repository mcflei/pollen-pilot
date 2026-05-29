import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { exportAllData, resetAllData } from '@/lib/storage';
import { reverseGeocode } from '@/lib/pollenApi';
import { subscribeToPush, unsubscribeFromPush } from '@/lib/notifications';
import type { UserProfile } from '@/types';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mx-4">
      <h3 className="font-semibold text-gray-700 text-xs uppercase tracking-wide mb-2">{title}</h3>
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
      <span className="text-sm text-gray-700">{label}</span>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-pilot focus-visible:ring-offset-2 ${checked ? 'bg-sky-pilot' : 'bg-gray-200'}`}
    >
      <span
        aria-hidden="true"
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${checked ? 'translate-x-5' : 'translate-x-0'}`}
      />
    </button>
  );
}

function TimeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      <input
        type="time"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-pilot"
      />
    </div>
  );
}

function ReminderTimePicker({
  profile,
  updateProfile,
}: {
  profile: UserProfile;
  updateProfile: (u: Partial<UserProfile>) => void;
}) {
  const notifs = profile.notifications;
  const times = notifs.reminder_times ?? ['09:00'];
  const days = notifs.reminder_days ?? null;
  const freq = profile.checkin_frequency;

  function setTime(index: number, value: string) {
    const next = [...times];
    next[index] = value;
    updateProfile({ notifications: { ...notifs, reminder_times: next } });
  }

  function toggleDay(day: number) {
    const current = days ?? ALL_DAYS;
    const next = current.includes(day)
      ? current.filter(d => d !== day)
      : [...current, day].sort((a, b) => a - b);
    if (next.length === 0) return;
    updateProfile({ notifications: { ...notifs, reminder_days: next } });
  }

  return (
    <div className="px-4 py-3 space-y-4 border-t border-gray-50 bg-gray-50/50">
      {freq === 'custom' && (
        <div className="space-y-1.5">
          <p className="text-xs text-gray-500">Days</p>
          <div className="flex gap-1.5">
            {DAY_LABELS.map((label, i) => {
              const active = (days ?? ALL_DAYS).includes(i);
              return (
                <button
                  key={i}
                  onClick={() => toggleDay(i)}
                  className={`w-8 h-8 rounded-full text-xs font-medium transition-colors ${
                    active ? 'bg-sky-pilot text-white' : 'bg-white border border-gray-200 text-gray-400'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className={`flex gap-4 ${freq === 'twice' ? 'flex-row' : ''}`}>
        <TimeInput
          value={times[0] ?? '09:00'}
          onChange={v => setTime(0, v)}
          label={freq === 'twice' ? 'Morning' : 'Remind me at'}
        />
        {freq === 'twice' && (
          <TimeInput
            value={times[1] ?? '20:00'}
            onChange={v => setTime(1, v)}
            label="Evening"
          />
        )}
      </div>
    </div>
  );
}

export function SettingsPage() {
  const profile = useAppStore(s => s.profile);
  const updateProfile = useAppStore(s => s.updateProfile);
  const refreshPollenData = useAppStore(s => s.refreshPollenData);
  const resetData = useAppStore(s => s.resetData);
  const signOut = useAppStore(s => s.signOut);
  const [exported, setExported] = useState(false);
  const [locStatus, setLocStatus] = useState<'idle' | 'loading' | 'error'>('idle');
  const [locError, setLocError] = useState<string | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);

  async function handleUseLocation() {
    if (!navigator.geolocation) {
      setLocError('Geolocation is not supported by your browser.');
      return;
    }
    setLocStatus('loading');
    setLocError(null);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude: lat, longitude: lng } = pos.coords;
        const city = await reverseGeocode(lat, lng);
        updateProfile({ location: { lat, lng, city } });
        await refreshPollenData();
        setLocStatus('idle');
      },
      err => {
        setLocStatus('error');
        setLocError(
          err.code === 1
            ? 'Location permission denied. Enable it in your browser settings.'
            : 'Could not get location. Try again.'
        );
      },
      { timeout: 10000 }
    );
  }

  function handleClearLocation() {
    updateProfile({ location: null });
  }

  function handleExport() {
    const json = exportAllData();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pollen-pilot-export-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
  }

  function handleReset() {
    if (window.confirm('Reset all data? This cannot be undone.')) {
      resetAllData();
      resetData();
    }
  }

  if (!profile) return <div className="px-4 pt-8 text-gray-500">Complete onboarding first.</div>;

  const notifs = profile.notifications;

  return (
    <div className="pb-6 space-y-5">
      <div className="px-4 pt-4">
        <h1 className="font-lora text-xl font-semibold text-gray-900">Settings</h1>
      </div>

      <Section title="Check-in schedule">
        <Row label="Frequency">
          <select
            value={profile.checkin_frequency}
            onChange={e => updateProfile({ checkin_frequency: e.target.value as typeof profile.checkin_frequency })}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1"
          >
            <option value="once">Once a day</option>
            <option value="twice">Twice a day</option>
            <option value="every_other">Every other day</option>
            <option value="custom">Custom</option>
          </select>
        </Row>
        <Row label="Count missed days as clear">
          <Toggle
            checked={profile.assume_healthy_on_miss}
            onChange={v => updateProfile({ assume_healthy_on_miss: v })}
          />
        </Row>
      </Section>

      <Section title="Location">
        <div className="px-4 py-3 space-y-2">
          {profile.location ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <span>📍</span>
                <span>{profile.location.city}</span>
              </div>
              <button onClick={handleClearLocation} className="text-sm text-gray-400 hover:text-red-500 transition-colors">
                Clear
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">No location set — using demo data (Raleigh, NC).</p>
          )}
          <button
            onClick={handleUseLocation}
            disabled={locStatus === 'loading'}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-sky-50 border border-sky-200 text-sky-pilot text-sm font-medium disabled:opacity-50 transition-opacity"
          >
            {locStatus === 'loading' ? (
              <><span className="animate-spin">⟳</span>Detecting location…</>
            ) : (
              <><span>📡</span>Use my current location</>
            )}
          </button>
          {locError && <p className="text-xs text-red-500">{locError}</p>}
        </div>
      </Section>

      <Section title="Environment">
        <Row label="Typical outdoor activity">
          <select
            value={profile.typical_outdoor_activity}
            onChange={e => updateProfile({ typical_outdoor_activity: e.target.value as typeof profile.typical_outdoor_activity })}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1"
          >
            <option value="low">Low</option>
            <option value="moderate">Moderate</option>
            <option value="high">High</option>
          </select>
        </Row>
      </Section>

      <Section title="Notifications">
        {pushError && <p className="px-4 pt-3 text-xs text-red-500">{pushError}</p>}

        <Row label="Check-in reminder">
          <Toggle
            checked={notifs.checkin_reminder}
            onChange={async v => {
              setPushError(null);
              if (v) {
                const ok = await subscribeToPush();
                if (!ok) {
                  setPushError('Notification permission denied. Enable it in your browser settings.');
                  return;
                }
                const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
                updateProfile({
                  notifications: {
                    ...notifs,
                    checkin_reminder: true,
                    reminder_timezone: timezone,
                    reminder_times: notifs.reminder_times?.length ? notifs.reminder_times : ['09:00'],
                    reminder_days: notifs.reminder_days ?? null,
                  },
                });
              } else {
                await unsubscribeFromPush();
                updateProfile({ notifications: { ...notifs, checkin_reminder: false } });
              }
            }}
          />
        </Row>

        {notifs.checkin_reminder && (
          <ReminderTimePicker profile={profile} updateProfile={updateProfile} />
        )}

        <Row label="High-risk alert">
          <Toggle
            checked={notifs.high_risk_alert}
            onChange={v => updateProfile({ notifications: { ...notifs, high_risk_alert: v } })}
          />
        </Row>
        <Row label="Clear skies alert">
          <Toggle
            checked={notifs.clear_skies_alert}
            onChange={v => updateProfile({ notifications: { ...notifs, clear_skies_alert: v } })}
          />
        </Row>
      </Section>

      <Section title="Data & privacy">
        <Row label="Export data">
          <button onClick={handleExport} className="text-sm text-sky-pilot font-medium">
            {exported ? 'Downloaded!' : 'Export JSON'}
          </button>
        </Row>
        <Row label="Reset all data">
          <button onClick={handleReset} className="text-sm text-red-500 font-medium">
            Reset
          </button>
        </Row>
        <Row label="Sign out">
          <button onClick={() => signOut()} className="text-sm text-gray-500 font-medium">
            Sign Out
          </button>
        </Row>
      </Section>

      <div className="mx-4 bg-gray-50 rounded-xl p-4 text-xs text-gray-400">
        <strong>Disclaimer:</strong> Pollen Pilot does not diagnose illness or allergies. Risk scores and insights
        are based on patterns in your personal check-in data and are not medical advice. Always follow guidance
        from your healthcare provider.
      </div>
    </div>
  );
}
