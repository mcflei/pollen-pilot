import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import type { CheckIn } from '@/types';

interface Props {
  checkIns: CheckIn[];
}

export function TrendChart({ checkIns }: Props) {
  const last14 = [...checkIns]
    .filter(c => c.pollen_snapshot !== null)
    .sort((a, b) => a.timestamp.localeCompare(b.timestamp))
    .slice(-14)
    .map(c => ({
      date: c.timestamp.slice(5, 10),
      severity: c.severity,
      grass: c.pollen_snapshot?.grass_index ?? 0,
    }));

  if (last14.length < 2) {
    return (
      <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-500 text-center">
        Log at least 2 check-ins to see your trend chart.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={last14} margin={{ top: 4, right: 8, left: -16, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
        <YAxis tick={{ fontSize: 10 }} domain={[0, 10]} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Line
          type="monotone"
          dataKey="severity"
          stroke="#EF4444"
          strokeWidth={2}
          dot={false}
          name="Severity (0–10)"
        />
        <Line
          type="monotone"
          dataKey="grass"
          stroke="#5A9E6B"
          strokeWidth={2}
          dot={false}
          name="Grass pollen (0–5)"
          strokeDasharray="4 2"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
