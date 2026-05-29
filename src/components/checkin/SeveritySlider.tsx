interface Props {
  value: number;
  onChange: (v: number) => void;
}

const LABELS = [
  'None',
  'Very mild',
  'Mild',
  'Mild-moderate',
  'Moderate',
  'Moderate',
  'Moderate-severe',
  'Severe',
  'Very severe',
  'Intense',
  'Worst ever',
];

function getColor(v: number): string {
  if (v <= 2) return '#5A9E6B';
  if (v <= 4) return '#4A9FD4';
  if (v <= 6) return '#F59E0B';
  return '#EF4444';
}

export function SeveritySlider({ value, onChange }: Props) {
  const color = getColor(value);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Overall severity</label>
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={10}
          step={1}
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="flex-1 h-2 rounded-full appearance-none cursor-pointer"
          style={{ accentColor: color }}
        />
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: color }}
        >
          {value}
        </div>
      </div>
      <div className="text-center text-sm mt-1" style={{ color }}>
        {LABELS[value]}
      </div>
    </div>
  );
}
