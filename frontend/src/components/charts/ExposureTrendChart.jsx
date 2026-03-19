import {
  ResponsiveContainer, AreaChart, LineChart, Line, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Legend,
} from 'recharts';
import { format, parseISO } from 'date-fns';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
         className="rounded-lg p-3 shadow-xl text-xs">
      <p style={{ color: 'var(--text-muted)' }} className="mb-2">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: {typeof p.value === 'number' ? p.value.toFixed(5) : p.value} mSv
        </p>
      ))}
    </div>
  );
};

export default function ExposureTrendChart({
  data = [], showThreshold = false, thresholdValue, thresholdLabel, height = 260, type = 'area',
}) {
  if (!data.length) {
    return <div className="flex items-center justify-center h-40 text-muted text-sm">No data available</div>;
  }

  const Chart = type === 'area' ? AreaChart : LineChart;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <Chart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="doseGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#0ea5e9" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" strokeOpacity={0.8} />
        <XAxis
          dataKey="date"
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'var(--border-color)' }}
          tickFormatter={(v) => { try { return format(parseISO(v), 'MMM d'); } catch { return v; } }}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v.toFixed(3)}
          width={55}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '8px' }} />
        {showThreshold && thresholdValue && (
          <ReferenceLine
            y={thresholdValue}
            stroke="#f59e0b"
            strokeDasharray="4 4"
            label={{ value: thresholdLabel || 'Limit', fill: '#f59e0b', fontSize: 10, position: 'insideTopRight' }}
          />
        )}
        {type === 'area' ? (
          <Area type="monotone" dataKey="dose" name="Dose (mSv)" stroke="#0ea5e9" strokeWidth={2}
                fill="url(#doseGrad)" dot={false} activeDot={{ r: 4, fill: '#0ea5e9' }} />
        ) : (
          <Line type="monotone" dataKey="dose" name="Dose (mSv)" stroke="#0ea5e9" strokeWidth={2}
                dot={false} activeDot={{ r: 4, fill: '#0ea5e9' }} />
        )}
      </Chart>
    </ResponsiveContainer>
  );
}
