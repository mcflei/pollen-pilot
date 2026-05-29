import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import type { TriggerAssociation } from '@/types';

interface Props {
  associations: TriggerAssociation[];
}

export function TriggerMapChart({ associations }: Props) {
  const data = associations
    .filter(a => a.strength > 0)
    .map(a => ({
      name: a.label,
      strength: Math.round(a.strength * 100),
      confidence: Math.round(a.confidence * 100),
    }));

  if (data.length === 0) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 text-center">
        Not enough data yet for trigger associations.
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={data.length * 48 + 20}>
        <BarChart layout="vertical" data={data} margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
          <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} tickFormatter={v => `${v}%`} />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={110} />
          <Tooltip
            formatter={(value, name) => [`${value ?? 0}%`, name === 'strength' ? 'Association strength' : 'Confidence']}
          />
          <Bar dataKey="strength" name="strength" radius={[0, 4, 4, 0]}>
            {data.map((_, i) => (
              <Cell key={i} fill={i === 0 ? '#4A9FD4' : i === 1 ? '#5A9E6B' : '#F59E0B'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-gray-400 mt-1 px-1">
        Based on past check-ins. Higher % = stronger pattern. This does not mean you are allergic to these triggers.
      </p>
    </div>
  );
}
