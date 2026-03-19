import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const COLORS = { online: '#10b981', stale: '#f59e0b', offline: '#ef4444' };

const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}
         className="rounded-lg p-3 text-xs shadow-xl">
      <p className="font-medium capitalize">{payload[0].name}</p>
      <p style={{ color: 'var(--text-muted)' }}>{payload[0].value} devices</p>
    </div>
  );
};

export default function DevicePieChart({ data }) {
  const chartData = [
    { name: 'Online',  value: data?.online  || 0, color: COLORS.online },
    { name: 'Stale',   value: data?.stale   || 0, color: COLORS.stale },
    { name: 'Offline', value: data?.offline || 0, color: COLORS.offline },
  ].filter((d) => d.value > 0);

  if (!chartData.length) {
    return <div className="flex items-center justify-center h-40 text-muted text-sm">No devices</div>;
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value">
          {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: '11px', color: 'var(--text-muted)' }} iconType="circle" iconSize={8} />
      </PieChart>
    </ResponsiveContainer>
  );
}
