import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { API_BASE_URL } from '../config';
import { useAuth } from '../AuthContext';

/* ────────────────────────────────────────────────────────
 *  Types
 * ──────────────────────────────────────────────────────── */

interface AnalyticsData {
  total_forms: number;
  total_responses: number;
  average_convergence: number;
  most_active_form: { id: number; title: string; response_count: number } | null;
  response_rate_per_form: {
    form_id: number;
    title: string;
    invited: number;
    responded: number;
    response_count: number;
    rate: number;
  }[];
  convergence_by_form: {
    form_id: number;
    title: string;
    rounds: { round_number: number; convergence_score: number | null; response_count: number }[];
  }[];
  synthesis_mode_distribution: { mode: string; count: number }[];
  activity_timeline: { date: string; responses: number }[];
}

/* ────────────────────────────────────────────────────────
 *  Theme-aware colours
 * ──────────────────────────────────────────────────────── */

const CHART_COLORS = [
  'var(--accent, #2563eb)',
  'var(--chart-2, #7c3aed)',
  'var(--chart-3, #059669)',
  'var(--chart-4, #d97706)',
  'var(--chart-5, #dc2626)',
];

/* Fallback hex for Recharts which sometimes needs concrete colours */
const PIE_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626'];

const MODE_LABELS: Record<string, string> = {
  simple: 'Simple',
  committee: 'Committee',
  ttd: 'TTD / Diffusion',
  human_only: 'Human Only',
  ai_assisted: 'AI Assisted',
};

/* ────────────────────────────────────────────────────────
 *  Custom tooltip
 * ──────────────────────────────────────────────────────── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: 'var(--card, #fff)',
        border: '1px solid var(--border, #e5e7eb)',
        borderRadius: 'var(--radius, 8px)',
        padding: '8px 12px',
        fontSize: '0.8125rem',
        color: 'var(--foreground, #111)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4 }}>{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color, margin: 0 }}>
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}
        </p>
      ))}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 *  Stat card
 * ──────────────────────────────────────────────────────── */

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div
      className="rounded-lg p-4 sm:p-5"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow, none)',
      }}
    >
      <p
        className="text-xs font-medium uppercase tracking-wider mb-1"
        style={{ color: 'var(--muted-foreground)' }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-bold tracking-tight"
        style={{ color: 'var(--foreground)' }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 *  Chart card wrapper
 * ──────────────────────────────────────────────────────── */

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--card)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--card-shadow, none)',
      }}
    >
      <div className="p-4 sm:p-5 pb-0 sm:pb-0">
        <h3
          className="text-sm font-semibold mb-3"
          style={{ color: 'var(--foreground)' }}
        >
          {title}
        </h3>
      </div>
      <div className="p-4 sm:p-5 pt-2">{children}</div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────
 *  Main component
 * ──────────────────────────────────────────────────────── */

export default function AdminAnalytics() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetch(`${API_BASE_URL}/admin/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: AnalyticsData) => {
        setData(d);
        // Auto-select most active form for convergence chart
        if (d.most_active_form) setSelectedFormId(d.most_active_form.id);
        else if (d.convergence_by_form.length) setSelectedFormId(d.convergence_by_form[0].form_id);
        setLoading(false);
      })
      .catch(err => {
        console.error('[AdminAnalytics] fetch failed:', err);
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  /* ── Convergence data for selected form ── */
  const convergenceData = useMemo(() => {
    if (!data || !selectedFormId) return [];
    const form = data.convergence_by_form.find(f => f.form_id === selectedFormId);
    if (!form) return [];
    return form.rounds.map(r => ({
      name: `R${r.round_number}`,
      convergence: r.convergence_score != null ? +(r.convergence_score * 100).toFixed(1) : null,
      responses: r.response_count,
    }));
  }, [data, selectedFormId]);

  /* ── Pie data ── */
  const pieData = useMemo(() => {
    if (!data) return [];
    return data.synthesis_mode_distribution.map(d => ({
      name: MODE_LABELS[d.mode] || d.mode,
      value: d.count,
    }));
  }, [data]);

  /* ── Bar data (response rate) ── */
  const barData = useMemo(() => {
    if (!data) return [];
    return data.response_rate_per_form.map(f => ({
      name: f.title.length > 20 ? f.title.slice(0, 18) + '…' : f.title,
      rate: f.rate,
      responded: f.responded,
      invited: f.invited,
    }));
  }, [data]);

  /* ── Area data (timeline) ── */
  const areaData = useMemo(() => {
    if (!data) return [];
    return data.activity_timeline.map(d => ({
      date: d.date.slice(5), // MM-DD
      responses: d.responses,
    }));
  }, [data]);

  /* ── Render ── */

  if (loading) {
    return (
      <div className="mb-8 animate-pulse">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-lg h-24"
              style={{ backgroundColor: 'var(--muted)' }}
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-lg h-64"
              style={{ backgroundColor: 'var(--muted)' }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-lg p-4 mb-6 text-sm"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
          border: '1px solid var(--destructive)',
          color: 'var(--destructive)',
        }}
      >
        Failed to load analytics{error ? `: ${error}` : ''}
      </div>
    );
  }

  const hasData = data.total_forms > 0;

  return (
    <div className="mb-8">
      {/* ── Stat cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <StatCard label="Total Forms" value={data.total_forms} />
        <StatCard label="Total Responses" value={data.total_responses} />
        <StatCard
          label="Avg Convergence"
          value={data.average_convergence ? `${(data.average_convergence * 100).toFixed(0)}%` : '—'}
        />
        <StatCard
          label="Most Active Form"
          value={data.most_active_form?.title ?? '—'}
          sub={data.most_active_form ? `${data.most_active_form.response_count} responses` : undefined}
        />
      </div>

      {hasData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* ── Response Rate Bar Chart ── */}
          {barData.length > 0 && (
            <ChartCard title="Response Rate per Form">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={barData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground, #6b7280)' }}
                    interval={0}
                    angle={-25}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground, #6b7280)' }}
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="rate" name="Response Rate (%)" fill="#2563eb" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}

          {/* ── Convergence Trend Line Chart ── */}
          <ChartCard title="Convergence Trend">
            <div className="mb-2">
              <select
                value={selectedFormId ?? ''}
                onChange={e => setSelectedFormId(Number(e.target.value))}
                className="text-xs px-2 py-1 rounded"
                style={{
                  backgroundColor: 'var(--muted)',
                  color: 'var(--foreground)',
                  border: '1px solid var(--border)',
                  outline: 'none',
                }}
              >
                {data.convergence_by_form.map(f => (
                  <option key={f.form_id} value={f.form_id}>
                    {f.title}
                  </option>
                ))}
              </select>
            </div>
            {convergenceData.length > 0 ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={convergenceData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground, #6b7280)' }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: 'var(--muted-foreground, #6b7280)' }}
                    domain={[0, 100]}
                    tickFormatter={v => `${v}%`}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line
                    type="monotone"
                    dataKey="convergence"
                    name="Convergence (%)"
                    stroke="#7c3aed"
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#7c3aed' }}
                    connectNulls
                  />
                  <Line
                    type="monotone"
                    dataKey="responses"
                    name="Responses"
                    stroke="#059669"
                    strokeWidth={1.5}
                    strokeDasharray="4 2"
                    dot={{ r: 3, fill: '#059669' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div
                className="flex items-center justify-center h-52 text-sm"
                style={{ color: 'var(--muted-foreground)' }}
              >
                No round data yet for this form
              </div>
            )}
          </ChartCard>

          {/* ── Synthesis Mode Pie / Donut ── */}
          <ChartCard title="Synthesis Mode Distribution">
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={3}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                    style={{ fontSize: '0.6875rem' }}
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div
                className="flex items-center justify-center h-52 text-sm"
                style={{ color: 'var(--muted-foreground)' }}
              >
                No syntheses generated yet
              </div>
            )}
          </ChartCard>

          {/* ── Activity Timeline Area Chart ── */}
          <ChartCard title="Activity Timeline (Last 30 Days)">
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={areaData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <defs>
                  <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border, #e5e7eb)" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: 'var(--muted-foreground, #6b7280)' }}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground, #6b7280)' }}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="responses"
                  name="Responses"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#areaGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </div>
  );
}
