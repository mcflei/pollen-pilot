import { useState } from 'react';
import type { UserProfile } from '@/types';

interface Props {
  onNext: (prefs: Pick<UserProfile, 'checkin_frequency' | 'custom_checkin_times' | 'assume_healthy_on_miss'>) => void;
}

type Frequency = UserProfile['checkin_frequency'];

const FREQUENCIES: { value: Frequency; label: string; sub: string }[] = [
  { value: 'once', label: 'Once a day', sub: 'Recommended — best before bedtime' },
  { value: 'twice', label: 'Twice a day', sub: 'Morning and evening' },
  { value: 'every_other', label: 'Every other day', sub: 'Minimum for useful patterns' },
  { value: 'custom', label: 'Custom', sub: 'Choose your own times' },
];

export function OnboardingSlide2({ onNext }: Props) {
  const [frequency, setFrequency] = useState<Frequency>('once');
  const [assumeHealthy, setAssumeHealthy] = useState(true);
  const [customTimes, setCustomTimes] = useState<string[]>(['20:00']);

  function addTime() {
    if (customTimes.length < 3) setCustomTimes([...customTimes, '12:00']);
  }

  function removeTime(i: number) {
    setCustomTimes(customTimes.filter((_, idx) => idx !== i));
  }

  function updateTime(i: number, val: string) {
    const updated = [...customTimes];
    updated[i] = val;
    setCustomTimes(updated);
  }

  return (
    <div className="flex flex-col min-h-screen px-6 py-12 bg-white">
      <div className="flex-1">
        <div className="text-4xl mb-4">📅</div>
        <h2 className="font-lora text-2xl font-bold text-gray-900 mb-2">Check-in settings</h2>
        <p className="text-gray-500 text-sm mb-6">
          How often would you like to log your symptoms?
        </p>

        <div className="space-y-2 mb-6">
          {FREQUENCIES.map(f => (
            <button
              key={f.value}
              onClick={() => setFrequency(f.value)}
              className={`w-full text-left p-4 rounded-xl border transition-all ${
                frequency === f.value
                  ? 'border-sky-pilot bg-sky-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div className={`font-semibold ${frequency === f.value ? 'text-sky-pilot' : 'text-gray-900'}`}>
                {f.label}
              </div>
              <div className="text-xs text-gray-500">{f.sub}</div>
            </button>
          ))}
        </div>

        {frequency === 'custom' && (
          <div className="mb-6 p-4 bg-gray-50 rounded-xl">
            <div className="font-medium text-sm text-gray-700 mb-3">Custom check-in times</div>
            <div className="space-y-2">
              {customTimes.map((t, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="time"
                    value={t}
                    onChange={e => updateTime(i, e.target.value)}
                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                  {customTimes.length > 1 && (
                    <button onClick={() => removeTime(i)} className="text-gray-400 hover:text-red-500 text-xl leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            {customTimes.length < 3 && (
              <button onClick={addTime} className="mt-2 text-sky-pilot text-sm font-medium">
                + Add time
              </button>
            )}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5">
              <button
                onClick={() => setAssumeHealthy(!assumeHealthy)}
                className={`w-11 h-6 rounded-full transition-colors relative ${assumeHealthy ? 'bg-sky-pilot' : 'bg-gray-300'}`}
              >
                <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${assumeHealthy ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div>
              <div className="font-semibold text-sm text-gray-900">Count missed days as clear days</div>
              <div className="text-xs text-gray-600 mt-1">
                Assumes low symptoms on days you skip. Works best when you only skip on good days.
              </div>
              <div className="text-xs text-amber-700 mt-1">
                Tip: logging time spent outside on good days still helps calibrate your tolerance.
              </div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={() => onNext({ checkin_frequency: frequency, custom_checkin_times: customTimes, assume_healthy_on_miss: assumeHealthy })}
        className="w-full bg-sky-pilot text-white font-semibold py-4 rounded-xl text-lg hover:bg-sky-500 transition-colors"
      >
        Continue
      </button>
    </div>
  );
}
