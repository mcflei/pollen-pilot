import { useState } from 'react';
import { useCheckIns } from '@/hooks/useCheckIns';
import { SeveritySlider } from './SeveritySlider';
import { SymptomGrid } from './SymptomGrid';
import { MedicationSearch } from './MedicationSearch';
import { SleepSection } from './SleepSection';
import { OutdoorTimeInput } from './OutdoorTimeInput';
import type { CheckIn, MedicationEntry, SymptomKey } from '@/types';

interface Props {
  onClose: () => void;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-700">{label}</span>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`w-11 h-6 rounded-full transition-colors relative shrink-0 ${checked ? 'bg-sky-pilot' : 'bg-gray-300'}`}
      >
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </div>
  );
}

export function CheckInModal({ onClose }: Props) {
  const { submitCheckIn } = useCheckIns();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [severity, setSeverity] = useState(0);
  const [symptoms, setSymptoms] = useState<SymptomKey[]>([]);
  const [hoursOutside, setHoursOutside] = useState<number | null>(null);
  const [medications, setMedications] = useState<MedicationEntry[]>([]);
  const [sleepHours, setSleepHours] = useState(7);
  const [sleepQuality, setSleepQuality] = useState<CheckIn['sleep_quality']>('good');
  const [windowsOpen, setWindowsOpen] = useState(false);
  const [exercisedOutside, setExercisedOutside] = useState(false);
  const [airPurifierOn, setAirPurifierOn] = useState(false);
  const [notes, setNotes] = useState('');

  async function handleSubmit() {
    setIsSubmitting(true);
    await submitCheckIn({
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
    });
    setIsSubmitting(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h2 className="font-lora text-xl font-semibold text-gray-900">Pilot Check-In</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
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
            <div className="text-sm font-medium text-gray-700 mb-1">Environment</div>
            <div className="bg-gray-50 rounded-xl px-4 divide-y divide-gray-100">
              <Toggle label="Windows open" checked={windowsOpen} onChange={setWindowsOpen} />
              <Toggle label="Exercised outside" checked={exercisedOutside} onChange={setExercisedOutside} />
              <Toggle label="Air purifier on" checked={airPurifierOn} onChange={setAirPurifierOn} />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Anything else worth noting today..."
              rows={3}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-pilot resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-green-pilot text-white font-semibold py-4 rounded-xl text-base hover:bg-green-600 transition-colors disabled:opacity-60"
          >
            {isSubmitting ? 'Logging...' : 'Log check-in ✈️'}
          </button>
        </div>
      </div>
    </div>
  );
}
