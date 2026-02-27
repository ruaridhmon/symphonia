import { useState, useEffect, useMemo, useRef } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
  PieChart, Pie, Cell,
  AreaChart, Area, Legend,
} from 'recharts';
import {
  LayoutDashboard, MessageSquare, TrendingUp, Trophy,
  BarChart3, GitMerge, PieChart as PieChartIcon, Activity,
  Inbox,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../AuthContext';

/* ════════════════════════════════════════════════════════
 *  Types  (unchanged — same contract as the backend)
 * ════════════════════════════════════════════════════════ */

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

/* ════════════════════════════════════════════════════════
 *  Design-system palette for Recharts (concrete hex only)
 * ════════════════════════════════════════════════════════ */

const PALETTE = {
  blue:   '#2563eb',
  violet: '#7c3aed',
  sky:    '#0ea5e9',
  green:  '#10b981',
  amber:  '#f59e0b',
} as const;

const CHART_COLORS = Object.values(PALETTE);

const MODE_LABELS: Record<string, string> = {
  simple: 'Simple',
  committee: 'Committee',
  ttd: 'TTD / Diffusion',
  human_only: 'Human Only',
  ai_assisted: 'AI Assisted',
};

/* ════════════════════════════════════════════════════════
 *  Shared sub-components
 * ════════════════════════════════════════════════════════ */

/* ── Tooltip ── */

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: '0.8125rem',
        color: '#0f172a',
        boxShadow: '0 4px 16px rgba(15, 23, 42, 0.08)',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <p style={{ fontWeight: 600, marginBottom: 4, fontSize: '0.75rem', color: '#64748b' }}>
        {label}
      </p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ margin: '2px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: entry.color,
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#0f172a' }}>
            {entry.name}:{' '}
            <strong>{typeof entry.value === 'number' ? entry.value.toFixed(1) : entry.value}</strong>
          </span>
        </p>
      ))}
    </div>
  );
}

/* ── Stat card ── */

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accentColor: string;
}

function StatCard({ label, value, sub, icon, accentColor }: StatCardProps) {
  return (
    <div
      className="rounded-lg p-5 relative overflow-hidden transition-shadow hover:shadow-md"
      style={{
        backgroundColor: 'var(--card, #f8faff)',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: 'var(--card-shadow, 0 1px 3px rgba(37,99,235,0.06))',
        borderLeft: `3px solid ${accentColor}`,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p
            className="text-xs font-medium uppercase tracking-wider mb-1.5"
            style={{ color: 'var(--muted-foreground, #64748b)', letterSpacing: '0.06em' }}
          >
            {label}
          </p>
          <p
            className="text-2xl font-bold tracking-tight truncate"
            style={{ color: 'var(--foreground, #0f172a)', lineHeight: 1.2 }}
          >
            {value}
          </p>
          {sub && (
            <p
              className="text-xs mt-1.5"
              style={{ color: 'var(--muted-foreground, #64748b)' }}
            >
              {sub}
            </p>
          )}
        </div>
        <div
          className="rounded-lg p-2 flex-shrink-0"
          style={{ backgroundColor: `${accentColor}10` }}
        >
          <div style={{ color: accentColor }}>{icon}</div>
        </div>
      </div>
    </div>
  );
}

/* ── Section heading ── */

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mb-4 flex items-center gap-2.5">
      <div style={{ color: 'var(--accent, #2563eb)' }}>{icon}</div>
      <div>
        <h3
          className="text-sm font-semibold"
          style={{ color: 'var(--foreground, #0f172a)', lineHeight: 1.3 }}
        >
          {title}
        </h3>
        {description && (
          <p
            className="text-xs mt-0.5"
            style={{ color: 'var(--muted-foreground, #64748b)' }}
          >
            {description}
          </p>
        )}
      </div>
    </div>
  );
}

/* ── Chart card wrapper ── */

function ChartCard({
  title,
  children,
  className = '',
}: {
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-lg overflow-hidden ${className}`}
      style={{
        backgroundColor: 'var(--card, #f8faff)',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: 'var(--card-shadow, 0 1px 3px rgba(37,99,235,0.06))',
      }}
    >
      {title && (
        <div className="px-5 pt-5 pb-0">
          <h4
            className="text-xs font-semibold uppercase tracking-wider"
            style={{ color: 'var(--muted-foreground, #64748b)', letterSpacing: '0.05em' }}
          >
            {title}
          </h4>
        </div>
      )}
      <div className="p-5 pt-3">{children}</div>
    </div>
  );
}

/* ── Pill tab switcher ── */

function PillTabs({
  items,
  selectedId,
  onSelect,
}: {
  items: { id: number; label: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto pb-1"
      style={{
        scrollbarWidth: 'none',
        msOverflowStyle: 'none',
      }}
    >
      {items.map(item => {
        const active = item.id === selectedId;
        return (
          <button
            key={item.id}
            onClick={() => onSelect(item.id)}
            className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all flex-shrink-0"
            style={{
              backgroundColor: active ? PALETTE.blue : 'var(--secondary, #f1f5f9)',
              color: active ? '#ffffff' : 'var(--muted-foreground, #64748b)',
              border: active ? 'none' : '1px solid var(--border, #e2e8f0)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {item.label.length > 24 ? item.label.slice(0, 22) + '...' : item.label}
          </button>
        );
      })}
      {/* Hide scrollbar for WebKit */}
      <style>{`
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}

/* ── Pie legend row ── */

function PieLegend({ data }: { data: { name: string; value: number }[] }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-2">
      {data.map((entry, i) => (
        <div key={entry.name} className="flex items-center gap-1.5 text-xs">
          <span
            style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              borderRadius: 3,
              backgroundColor: CHART_COLORS[i % CHART_COLORS.length],
              flexShrink: 0,
            }}
          />
          <span style={{ color: 'var(--foreground, #0f172a)', fontWeight: 500 }}>
            {entry.name}
          </span>
          <span style={{ color: 'var(--muted-foreground, #64748b)' }}>
            {total > 0 ? `${Math.round((entry.value / total) * 100)}%` : '0%'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Empty state ── */

function EmptyState() {
  return (
    <div
      className="rounded-xl flex flex-col items-center justify-center py-16 px-8 text-center"
      style={{
        backgroundColor: 'var(--card, #f8faff)',
        border: '1px dashed var(--border, #e2e8f0)',
      }}
    >
      <div
        className="rounded-full p-4 mb-5"
        style={{ backgroundColor: 'var(--highlight, #eff6ff)' }}
      >
        <Inbox size={32} style={{ color: 'var(--accent, #2563eb)' }} strokeWidth={1.5} />
      </div>
      <h3
        className="text-base font-semibold mb-2"
        style={{ color: 'var(--foreground, #0f172a)' }}
      >
        Your analytics are waiting
      </h3>
      <p
        className="text-sm max-w-sm leading-relaxed"
        style={{ color: 'var(--muted-foreground, #64748b)' }}
      >
        Once you create forms and start collecting responses, your dashboard
        will come alive with insights on convergence, participation, and synthesis modes.
      </p>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
 *  Main component
 * ════════════════════════════════════════════════════════ */

export default function AdminAnalytics() {
  const { token } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedFormId, setSelectedFormId] = useState<number | null>(null);
  const [fetchedAt, setFetchedAt] = useState<Date | null>(null);

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
        setFetchedAt(new Date());
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
      name: f.title.length > 20 ? f.title.slice(0, 18) + '\u2026' : f.title,
      rate: f.rate,
      responded: f.responded,
      invited: f.invited,
    }));
  }, [data]);

  /* ── Area data (timeline) with weekly ticks ── */
  const areaData = useMemo(() => {
    if (!data) return [];
    return data.activity_timeline.map(d => {
      const dt = new Date(d.date);
      const dayOfWeek = dt.getDay(); // 0 = Sunday, 1 = Monday
      return {
        date: d.date.slice(5), // MM-DD
        fullDate: d.date,
        responses: d.responses,
        isWeekStart: dayOfWeek === 1, // Monday
      };
    });
  }, [data]);

  /* ── Pill items for convergence form switcher ── */
  const convergencePills = useMemo(() => {
    if (!data) return [];
    return data.convergence_by_form.map(f => ({
      id: f.form_id,
      label: f.title,
    }));
  }, [data]);

  /* ════════════════════════════════════════════════════════
   *  Render states
   * ════════════════════════════════════════════════════════ */

  if (loading) {
    return (
      <div className="mb-8 animate-pulse" style={{ fontFamily: 'var(--font-family, Inter, sans-serif)' }}>
        {/* Skeleton stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-lg h-[88px]"
              style={{
                backgroundColor: 'var(--skeleton-base, #e2e8f0)',
                borderRadius: 'var(--skeleton-radius, 0.375rem)',
              }}
            />
          ))}
        </div>
        {/* Skeleton charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {[1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="rounded-lg"
              style={{
                height: i === 4 ? 180 : 280,
                backgroundColor: 'var(--skeleton-base, #e2e8f0)',
                borderRadius: 'var(--skeleton-radius, 0.375rem)',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div
        className="rounded-lg p-5 mb-6 flex items-center gap-3"
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          fontSize: '0.875rem',
        }}
      >
        <div
          className="rounded-full p-1.5 flex-shrink-0"
          style={{ backgroundColor: '#fee2e2' }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="#dc2626" strokeWidth="1.5" />
            <path d="M8 5v3.5M8 10.5h.01" stroke="#dc2626" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
        <span>Failed to load analytics{error ? `: ${error}` : ''}</span>
      </div>
    );
  }

  const hasData = data.total_forms > 0;

  return (
    <div className="mb-8" style={{ fontFamily: 'var(--font-family, Inter, sans-serif)' }}>

      {/* ── Header row ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={18} style={{ color: 'var(--accent, #2563eb)' }} />
          <h2
            className="text-lg font-semibold"
            style={{ color: 'var(--foreground, #0f172a)' }}
          >
            Platform Analytics
          </h2>
        </div>
        {fetchedAt && (
          <p
            className="text-xs"
            style={{ color: 'var(--muted-foreground, #64748b)' }}
          >
            Updated {fetchedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        )}
      </div>

      {/* ═══════════ Stat cards ═══════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Forms"
          value={data.total_forms}
          icon={<LayoutDashboard size={18} />}
          accentColor={PALETTE.blue}
        />
        <StatCard
          label="Total Responses"
          value={data.total_responses}
          icon={<MessageSquare size={18} />}
          accentColor={PALETTE.violet}
        />
        <StatCard
          label="Avg Convergence"
          value={data.average_convergence ? `${(data.average_convergence * 100).toFixed(0)}%` : '\u2014'}
          sub={data.average_convergence ? 'across all rounds' : undefined}
          icon={<TrendingUp size={18} />}
          accentColor={PALETTE.green}
        />
        <StatCard
          label="Most Active"
          value={data.most_active_form?.title ?? '\u2014'}
          sub={data.most_active_form ? `${data.most_active_form.response_count} responses` : undefined}
          icon={<Trophy size={18} />}
          accentColor={PALETTE.amber}
        />
      </div>

      {/* ═══════════ Empty state ═══════════ */}
      {!hasData && <EmptyState />}

      {/* ═══════════ Charts ═══════════ */}
      {hasData && (
        <div className="space-y-8">

          {/* ── Section: Participation ── */}
          {barData.length > 0 && (
            <section>
              <SectionHeading
                icon={<BarChart3 size={16} />}
                title="Participation"
                description="How actively are participants responding to each form?"
              />
              <ChartCard title="Response Rate per Form">
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={56}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      domain={[0, 100]}
                      tickFormatter={v => `${v}%`}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: '#f1f5f9' }} />
                    <Bar
                      dataKey="rate"
                      name="Response Rate (%)"
                      fill={PALETTE.blue}
                      radius={[6, 6, 0, 0]}
                      maxBarSize={48}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          )}

          {/* ── Section: Convergence ── */}
          <section>
            <SectionHeading
              icon={<GitMerge size={16} />}
              title="Convergence Trend"
              description="Track how opinions converge across Delphi rounds"
            />
            <ChartCard>
              <PillTabs
                items={convergencePills}
                selectedId={selectedFormId}
                onSelect={setSelectedFormId}
              />
              {convergenceData.length > 0 ? (
                <div className="mt-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={convergenceData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                      <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: '#64748b' }}
                        domain={[0, 100]}
                        tickFormatter={v => `${v}%`}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="convergence"
                        name="Convergence (%)"
                        stroke={PALETTE.violet}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: PALETTE.violet, strokeWidth: 2, stroke: '#ffffff' }}
                        activeDot={{ r: 6, fill: PALETTE.violet, stroke: '#ffffff', strokeWidth: 2 }}
                        connectNulls
                      />
                      <Line
                        type="monotone"
                        dataKey="responses"
                        name="Responses"
                        stroke={PALETTE.green}
                        strokeWidth={1.5}
                        strokeDasharray="6 3"
                        dot={{ r: 3, fill: PALETTE.green, strokeWidth: 0 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div
                  className="flex flex-col items-center justify-center py-12 text-center"
                  style={{ color: 'var(--muted-foreground, #64748b)' }}
                >
                  <GitMerge size={24} strokeWidth={1.5} className="mb-2 opacity-40" />
                  <p className="text-sm">No round data yet for this form</p>
                  <p className="text-xs mt-1 opacity-60">
                    Convergence scores appear after multiple Delphi rounds
                  </p>
                </div>
              )}
            </ChartCard>
          </section>

          {/* ── Section: Distribution + Timeline (side by side) ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {/* ── Synthesis Mode Distribution ── */}
            <section>
              <SectionHeading
                icon={<PieChartIcon size={16} />}
                title="Synthesis Modes"
                description="Distribution of synthesis strategies across forms"
              />
              <ChartCard>
                {pieData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={52}
                          outerRadius={85}
                          paddingAngle={3}
                          label={false}
                          labelLine={false}
                          stroke="#ffffff"
                          strokeWidth={2}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip content={<ChartTooltip />} />
                      </PieChart>
                    </ResponsiveContainer>
                    <PieLegend data={pieData} />
                  </>
                ) : (
                  <div
                    className="flex flex-col items-center justify-center py-12 text-center"
                    style={{ color: 'var(--muted-foreground, #64748b)' }}
                  >
                    <PieChartIcon size={24} strokeWidth={1.5} className="mb-2 opacity-40" />
                    <p className="text-sm">No syntheses generated yet</p>
                    <p className="text-xs mt-1 opacity-60">
                      Run a synthesis to see the mode breakdown
                    </p>
                  </div>
                )}
              </ChartCard>
            </section>

            {/* ── Activity Timeline ── */}
            <section>
              <SectionHeading
                icon={<Activity size={16} />}
                title="Activity Timeline"
                description="Responses collected over the last 30 days"
              />
              <ChartCard>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={areaData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <defs>
                      <linearGradient id="aphroditeAreaGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.blue} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={PALETTE.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke="#e2e8f0" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: '#e2e8f0' }}
                      tickLine={false}
                      ticks={areaData.filter(d => d.isWeekStart).map(d => d.date)}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#64748b' }}
                      allowDecimals={false}
                      axisLine={false}
                      tickLine={false}
                      width={32}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="responses"
                      name="Responses"
                      stroke={PALETTE.blue}
                      strokeWidth={2}
                      fill="url(#aphroditeAreaGrad)"
                      dot={false}
                      activeDot={{ r: 4, fill: PALETTE.blue, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartCard>
            </section>
          </div>
        </div>
      )}
    </div>
  );
}
