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
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-medium text-gray-700">Overall severity</label>
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
          style={{ backgroundColor: color }}
        >
          {value}
        </div>
      </div>

      <div
        className="rounded-xl px-4 pt-3 pb-4 mb-1"
        style={{ backgroundColor: `${color}18` }}
      >
        <div className="text-center font-medium text-sm mb-3" style={{ color }}>
          {LABELS[value]}
        </div>
        <div className="relative">
          <div className="flex justify-between text-xs text-gray-400 mb-1 px-0.5">
            <span>0</span>
            <span className="text-gray-400 text-xs italic">slide to adjust</span>
            <span>10</span>
          </div>
          <input
            type="range"
            min={0}
            max={10}
            step={1}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full h-3 rounded-full appearance-none cursor-pointer"
            style={{ accentColor: color }}
          />
        </div>
      </div>
    </div>
  );
}
