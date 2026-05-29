interface Props {
  value: number | null;
  onChange: (v: number | null) => void;
}

export function OutdoorTimeInput({ value, onChange }: Props) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">Hours outside today</label>
      <div className="flex items-center gap-2">
        <input
          type="number"
          min={0}
          max={24}
          step={0.5}
          value={value ?? ''}
          onChange={e => {
            const v = e.target.value === '' ? null : Number(e.target.value);
            onChange(v);
          }}
          placeholder="0"
          className="w-24 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-sky-pilot"
        />
        <span className="text-sm text-gray-500">hrs</span>
      </div>
    </div>
  );
}
