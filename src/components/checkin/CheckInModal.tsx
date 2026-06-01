import { useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { SeveritySlider } from './SeveritySlider';
import { SymptomGrid } from './SymptomGrid';
import { MedicationSearch } from './MedicationSearch';
import { SleepSection } from './SleepSection';
import { OutdoorTimeInput } from './OutdoorTimeInput';
import type { CheckIn, MedicationEntry, SymptomKey } from '@/types';

interface Props {
  onClose: () => void;
  initialCheckIn?: CheckIn;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700 dark:text-gray-200">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-sky-pilot' : 'bg-gray-300 dark:bg-gray-600'}`}
      >
        <span className={`absolute top-0.5 left-0 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function CheckInModal({ onClose, initialCheckIn }: Props) {
  const submitCheckIn = useAppStore(s => s.submitCheckIn);
  const updateTodayCheckIn = useAppStore(s => s.updateTodayCheckIn);
  const isEditing = !!initialCheckIn;
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [severity, setSeverity] = useState(initialCheckIn?.severity ?? 0);
  const [symptoms, setSymptoms] = useState<SymptomKey[]>(initialCheckIn?.symptoms ?? []);
  const [hoursOutside, setHoursOutside] = useState<number | null>(initialCheckIn?.hours_outside ?? null);
  const [medications, setMedications] = useState<MedicationEntry[]>(initialCheckIn?.medications ?? []);
  const [sleepHours, setSleepHours] = useState(initialCheckIn?.sleep_hours ?? 7);
  const [sleepQuality, setSleepQuality] = useState<CheckIn['sleep_quality']>(initialCheckIn?.sleep_quality ?? 'good');
  const [windowsOpen, setWindowsOpen] = useState(initialCheckIn?.windows_open ?? false);
  const [exercisedOutside, setExercisedOutside] = useState(initialCheckIn?.exercised_outside ?? false);
  const [airPurifierOn, setAirPurifierOn] = useState(initialCheckIn?.air_purifier_on ?? false);
  const [notes, setNotes] = useState(initialCheckIn?.notes ?? '');

  async function handleSubmit() {
    setIsSubmitting(true);
    const payload = {
      severity,
      symptoms,
      hours_outside: hoursOutside,
      medications,
      sleep_hours: sleepHours,
      sleep_quality: sleepQuality,
      windows_open: windowsOpen,
      exercised_outside: exercisedOutside,
      air_purifier_on: airPurifierOn,
      notes,
    };
    if (isEditing && initialCheckIn) {
      await updateTodayCheckIn(initialCheckIn.id, payload);
    } else {
      await submitCheckIn(payload);
    }
    setIsSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
          <h2 className="font-lora text-xl font-semibold text-gray-900 dark:text-white">
            {isEditing ? 'Edit Check-In' : 'Pilot Check-In'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl leading-none">×</button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-5">
          <SeveritySlider value={severity} onChange={setSeverity} />
          <SymptomGrid selected={symptoms} onChange={setSymptoms} />
          <OutdoorTimeInput value={hoursOutside} onChange={setHoursOutside} />
          <MedicationSearch medications={medications} onChange={setMedications} />
          <SleepSection
            hours={sleepHours}
            quality={sleepQuality}
            onHoursChange={setSleepHours}
            onQualityChange={setSleepQuality}
          />

          {/* Toggles */}
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Environment</div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-xl px-4 divide-y divide-gray-100 dark:divide-gray-700">
              <Toggle label="Windows open" checked={windowsOpen} onChange={setWindowsOpen} />
              <Toggle label="Exercised outside" checked={exercisedOutside} onChange={setExercisedOutside} />
              <Toggle label="Air purifier on" checked={airPurifierOn} onChange={setAirPurifierOn} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything else worth noting today..."
              rows={3}
              className="w-full border border-gray-200 dark:border-gray-600 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-sky-pilot resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-gray-700">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-green-pilot text-white font-semibold py-4 rounded-xl text-base hover:bg-green-600 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? (isEditing ? 'Saving…' : 'Logging…') : (isEditing ? 'Save changes ✈️' : 'Log check-in ✈️')}
          </button>
        </div>
      </div>
    </div>
  );
}
