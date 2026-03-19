import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ReferenceLine,
} from 'recharts';
import { DOSE_LIMITS } from '../../utils/constants';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
         className="rounded-lg p-3 shadow-xl text-xs">
      <p className="font-medium mb-1">{label}</p>
      <p className="text-primary-500">{payload[0]?.value?.toFixed(4)} mSv/year</p>
      <p style={{ color: 'var(--text-muted)' }} className="mt-1">
        {((payload[0]?.value / DOSE_LIMITS.ANNUAL_LIMIT) * 100).toFixed(1)}% of annual limit
      </p>
    </div>
  );
};

function getBarColor(dose) {
  if (dose >= DOSE_LIMITS.ANNUAL_LIMIT)  return '#ef4444';
  if (dose >= DOSE_LIMITS.ANNUAL_WARNING) return '#f59e0b';
  return '#0ea5e9';
}

export default function ComparisonBarChart({ data = [], height = 280 }) {
  if (!data.length) return (
    <div className="flex items-center justify-center h-40 text-muted text-sm">No data available</div>
  );

  const chartData = data.map((d) => ({
    name: d.full_name?.split(' ').slice(0, 2).join(' ') || d.card_number,
    dose: parseFloat(d.annual_dose),
  }));

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.8} />
        <XAxis
          dataKey="name"
          tick={{ fill: 'var(--text-muted)', fontSize: 10 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-color)' }}
          angle={-25}
          textAnchor="end"
          interval={0}
          height={50}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.toFixed(2)}
          width={50}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(148,163,184,0.05)' }} />
        <ReferenceLine y={DOSE_LIMITS.ANNUAL_WARNING} stroke="#f59e0b" strokeDasharray="4 4"
          label={{ value: 'Warning', fill: '#f59e0b', fontSize: 10 }} />
        <ReferenceLine y={DOSE_LIMITS.ANNUAL_LIMIT} stroke="#ef4444" strokeDasharray="4 4"
          label={{ value: 'Limit', fill: '#ef4444', fontSize: 10 }} />
        <Bar dataKey="dose" name="Annual Dose" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, i) => (
            <Cell key={i} fill={getBarColor(entry.dose)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
