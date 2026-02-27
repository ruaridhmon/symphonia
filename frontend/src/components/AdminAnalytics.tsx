import { useState, useEffect, useMemo, useCallback, useRef, type ReactNode } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import {
  LayoutDashboard, MessageSquare, TrendingUp, Trophy,
  BarChart3, GitMerge, PieChart as PieChartIcon, Activity,
  Inbox, AlertCircle, RefreshCw,
} from 'lucide-react';
import { API_BASE_URL } from '../config';
import { useAuth } from '../AuthContext';

/* ════════════════════════════════════════════════════════
 *  Types  (same contract as the backend)
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
 *  Typed palette with helper  (Themis structure, Aphrodite colours)
 * ════════════════════════════════════════════════════════ */

const PALETTE = {
  blue:   '#2563eb',
  violet: '#7c3aed',
  sky:    '#0ea5e9',
  green:  '#10b981',
  amber:  '#f59e0b',
} as const;

type PaletteKey = keyof typeof PALETTE;
const PALETTE_ORDER: PaletteKey[] = ['blue', 'violet', 'sky', 'green', 'amber'];
const paletteAt = (i: number): string => PALETTE[PALETTE_ORDER[i % PALETTE_ORDER.length]];

const MODE_LABELS: Record<string, string> = {
  simple: 'Simple',
  committee: 'Committee',
  ttd: 'TTD / Diffusion',
  human_only: 'Human Only',
  ai_assisted: 'AI Assisted',
};

/* ════════════════════════════════════════════════════════
 *  Shared chart styling constants
 * ════════════════════════════════════════════════════════ */

const TICK_STYLE = { fontSize: 11, fill: '#64748b' } as const;
const GRID_STROKE = '#e2e8f0';

/* ════════════════════════════════════════════════════════
 *  Custom tooltip  (Aphrodite visual, Themis typed payload)
 * ════════════════════════════════════════════════════════ */

interface TooltipPayloadEntry {
  name: string;
  value: number | string;
  color: string;
}

function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}) {
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
      {payload.map((entry, i) => (
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

/* ════════════════════════════════════════════════════════
 *  Stat card  (Aphrodite left-border accent, Themis a11y)
 * ════════════════════════════════════════════════════════ */

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon: ReactNode;
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
          className="flex-shrink-0 flex items-center justify-center w-10 h-10 rounded-lg"
          style={{ backgroundColor: `${accentColor}10`, color: accentColor }}
          aria-hidden="true"
        >
          {icon}
        </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
 *  Chart section  (Themis wrapper + Aphrodite section heading)
 * ════════════════════════════════════════════════════════ */

interface ChartSectionProps {
  title: string;
  description?: string;
  icon: ReactNode;
  children: ReactNode;
  ariaLabel: string;
}

function ChartSection({ title, description, icon, children, ariaLabel }: ChartSectionProps) {
  return (
    <section
      className="rounded-lg overflow-hidden"
      style={{
        backgroundColor: 'var(--card, #f8faff)',
        border: '1px solid var(--border, #e2e8f0)',
        boxShadow: 'var(--card-shadow, 0 1px 3px rgba(37,99,235,0.06))',
      }}
      aria-label={ariaLabel}
    >
      <div className="px-5 pt-5 pb-0">
        <div className="flex items-center gap-2 mb-1">
          <span style={{ color: PALETTE.blue }} aria-hidden="true">{icon}</span>
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--foreground, #0f172a)' }}
          >
            {title}
          </h3>
        </div>
        {description && (
          <p
            className="text-xs mb-0"
            style={{ color: 'var(--muted-foreground, #64748b)' }}
          >
            {description}
          </p>
        )}
      </div>
      <div className="p-5 pt-3">{children}</div>
    </section>
  );
}

/* ════════════════════════════════════════════════════════
 *  Section heading  (Aphrodite narrative icon + description)
 * ════════════════════════════════════════════════════════ */

function SectionHeading({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="mt-8 mb-4 flex items-center gap-2.5">
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

/* ════════════════════════════════════════════════════════
 *  Pill tab switcher  (Aphrodite visual, Themis a11y roles)
 * ════════════════════════════════════════════════════════ */

interface PillTabsProps {
  options: { id: number; label: string }[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}

function PillTabs({ options, selectedId, onSelect }: PillTabsProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  if (options.length === 0) return null;

  return (
    <div
      ref={scrollRef}
      className="flex gap-1.5 overflow-x-auto pb-1 mb-3"
      role="tablist"
      aria-label="Select a form to view convergence trend"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {options.map(opt => {
        const active = opt.id === selectedId;
        return (
          <button
            key={opt.id}
            role="tab"
            aria-selected={active}
            onClick={() => onSelect(opt.id)}
            className="whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
            style={{
              backgroundColor: active ? PALETTE.blue : 'var(--secondary, #f1f5f9)',
              color: active ? '#ffffff' : 'var(--muted-foreground, #64748b)',
              border: active ? 'none' : '1px solid var(--border, #e2e8f0)',
              cursor: 'pointer',
              outline: 'none',
            }}
          >
            {opt.label.length > 24 ? opt.label.slice(0, 22) + '\u2026' : opt.label}
          </button>
        );
      })}
      <style>{`div::-webkit-scrollbar { display: none; }`}</style>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
 *  Pie legend  (Aphrodite visual, Themis typed entries)
 * ════════════════════════════════════════════════════════ */

interface LegendEntry { name: string; value: number; color: string }

function PieLegend({ entries }: { entries: LegendEntry[] }) {
  const total = entries.reduce((sum, e) => sum + e.value, 0);
  return (
    <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-2">
      {entries.map(e => (
        <div key={e.name} className="flex items-center gap-1.5 text-xs">
          <span
            className="inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0"
            style={{ backgroundColor: e.color }}
            aria-hidden="true"
          />
          <span style={{ color: 'var(--foreground, #0f172a)', fontWeight: 500 }}>
            {e.name}
          </span>
          <span style={{ color: 'var(--muted-foreground, #64748b)' }}>
            {total > 0 ? `${Math.round((e.value / total) * 100)}%` : '\u2014'}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
 *  Empty state  (Aphrodite warm copy, Themis parametric)
 * ════════════════════════════════════════════════════════ */

function EmptyState({ message, sub }: { message: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <div
        className="rounded-full p-4 mb-5"
        style={{ backgroundColor: 'var(--highlight, #eff6ff)' }}
        aria-hidden="true"
      >
        <Inbox size={28} style={{ color: 'var(--accent, #2563eb)' }} strokeWidth={1.5} />
      </div>
      <p
        className="text-sm font-medium mb-1"
        style={{ color: 'var(--foreground, #0f172a)' }}
      >
        {message}
      </p>
      {sub && (
        <p className="text-xs max-w-sm leading-relaxed" style={{ color: 'var(--muted-foreground, #64748b)' }}>
          {sub}
        </p>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════
 *  Skeleton loader  (Themis shimmer animation)
 * ════════════════════════════════════════════════════════ */

function SkeletonBlock({ className }: { className: string }) {
  return (
    <div
      className={`rounded-lg ${className}`}
      style={{
        background: 'linear-gradient(90deg, var(--skeleton-base, #e2e8f0) 25%, var(--skeleton-highlight, #f1f5f9) 50%, var(--skeleton-base, #e2e8f0) 75%)',
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s ease-in-out infinite',
      }}
    />
  );
}

function LoadingSkeleton() {
  return (
    <div className="mb-8" aria-busy="true" aria-label="Loading analytics">
      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
      <div
        className="grid gap-4 mb-8"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
      >
        {[1, 2, 3, 4].map(i => (
          <SkeletonBlock key={i} className="h-[104px]" />
        ))}
      </div>
      <SkeletonBlock className="h-4 w-48 mb-4" />
      <div
        className="grid gap-5"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}
      >
        {[1, 2, 3, 4].map(i => (
          <SkeletonBlock key={i} className="h-[340px]" />
        ))}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════
 *  Weekly tick helper  (Themis algorithm)
 * ════════════════════════════════════════════════════════ */

function weeklyTickIndices(timeline: { date: string; fullDate: string }[]): number[] {
  const indices: number[] = [];
  let lastWeek = -1;

  for (let i = 0; i < timeline.length; i++) {
    const d = new Date(timeline[i].fullDate);
    if (isNaN(d.getTime())) continue;

    const jan1 = new Date(d.getFullYear(), 0, 1);
    const dayOfYear = Math.ceil((d.getTime() - jan1.getTime()) / 86_400_000) + 1;
    const week = Math.ceil((dayOfYear + jan1.getDay()) / 7);

    if (week !== lastWeek) {
      indices.push(i);
      lastWeek = week;
    }
  }

  if (indices.length > 0 && indices[indices.length - 1] !== timeline.length - 1) {
    indices.push(timeline.length - 1);
  }

  return indices;
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

  /* ── Fetch with retry support (Themis useCallback) ── */
  const fetchAnalytics = useCallback(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
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

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  /* ── Formatted timestamp ── */
  const lastFetchLabel = useMemo(() => {
    if (!fetchedAt) return null;
    return fetchedAt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }, [fetchedAt]);

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

  /* ── Area data (timeline) with full date for weekly tick calc ── */
  const areaData = useMemo(() => {
    if (!data) return [];
    return data.activity_timeline.map(d => ({
      date: d.date.slice(5),
      fullDate: d.date,
      responses: d.responses,
    }));
  }, [data]);

  /* ── Weekly tick indices ── */
  const timelineTicks = useMemo(() => weeklyTickIndices(areaData), [areaData]);

  /* ── Convergence pill-tab options ── */
  const convergenceFormOptions = useMemo(() => {
    if (!data) return [];
    return data.convergence_by_form.map(f => ({
      id: f.form_id,
      label: f.title,
    }));
  }, [data]);

  /* ── Pie legend entries ── */
  const pieLegendEntries: LegendEntry[] = useMemo(
    () => pieData.map((d, i) => ({ name: d.name, value: d.value, color: paletteAt(i) })),
    [pieData],
  );

  /* ════════════════════════════════════════════════════════
   *  Render: loading
   * ════════════════════════════════════════════════════════ */

  if (loading) return <LoadingSkeleton />;

  /* ════════════════════════════════════════════════════════
   *  Render: error  (Themis role='alert' + retry button)
   * ════════════════════════════════════════════════════════ */

  if (error || !data) {
    return (
      <div
        className="rounded-lg p-5 mb-6 flex items-start gap-3"
        role="alert"
        style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
        }}
      >
        <AlertCircle size={18} className="flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium mb-1">Failed to load analytics</p>
          {error && <p className="text-xs opacity-80">{error}</p>}
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-md transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            backgroundColor: '#dc2626',
            color: '#ffffff',
            border: 'none',
            cursor: 'pointer',
          }}
          aria-label="Retry loading analytics"
        >
          <RefreshCw size={12} aria-hidden="true" />
          Retry
        </button>
      </div>
    );
  }

  const hasData = data.total_forms > 0;

  /* ════════════════════════════════════════════════════════
   *  Render: dashboard
   * ════════════════════════════════════════════════════════ */

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
        {lastFetchLabel && (
          <p
            className="text-xs"
            style={{ color: 'var(--muted-foreground, #64748b)' }}
          >
            Updated {lastFetchLabel}
          </p>
        )}
      </div>

      {/* ═══════════ Stat cards — auto-fit responsive grid ═══════════ */}
      <div
        className="grid gap-4 mb-2"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
      >
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

      {/* ═══════════ Global empty state ═══════════ */}
      {!hasData && (
        <div
          className="rounded-xl mt-6"
          style={{
            backgroundColor: 'var(--card, #f8faff)',
            border: '1px dashed var(--border, #e2e8f0)',
          }}
        >
          <EmptyState
            message="Your analytics are waiting"
            sub="Once you create forms and start collecting responses, your dashboard will come alive with insights on convergence, participation, and synthesis modes."
          />
        </div>
      )}

      {/* ═══════════ Charts ═══════════ */}
      {hasData && (
        <>
          {/* ── Section: Engagement ── */}
          <SectionHeading
            icon={<BarChart3 size={16} />}
            title="Engagement"
            description="How actively are participants responding?"
          />
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}
          >
            {/* ── Response Rate Bar Chart ── */}
            <ChartSection
              title="Response Rate per Form"
              description="Percentage of invited participants who responded"
              icon={<BarChart3 size={16} />}
              ariaLabel="Bar chart showing response rates per form"
            >
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={barData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={TICK_STYLE}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                      height={56}
                      axisLine={{ stroke: GRID_STROKE }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={TICK_STYLE}
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
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
              ) : (
                <EmptyState
                  message="No response data yet"
                  sub="Response rates will appear once forms have been distributed."
                />
              )}
            </ChartSection>

            {/* ── Activity Timeline Area Chart ── */}
            <ChartSection
              title="Activity Timeline"
              description="Response volume over the last 30 days"
              icon={<Activity size={16} />}
              ariaLabel="Area chart showing daily response activity over 30 days"
            >
              {areaData.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={areaData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <defs>
                      <linearGradient id="analytics-area-grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PALETTE.blue} stopOpacity={0.2} />
                        <stop offset="100%" stopColor={PALETTE.blue} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      axisLine={{ stroke: GRID_STROKE }}
                      tickLine={false}
                      ticks={timelineTicks.map(i => areaData[i]?.date).filter(Boolean)}
                    />
                    <YAxis
                      tick={TICK_STYLE}
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
                      fill="url(#analytics-area-grad)"
                      dot={false}
                      activeDot={{ r: 4, fill: PALETTE.blue, stroke: '#ffffff', strokeWidth: 2 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <EmptyState
                  message="No activity recorded"
                  sub="The timeline will fill in as responses are submitted."
                />
              )}
            </ChartSection>
          </div>

          {/* ── Section: Convergence & Synthesis ── */}
          <SectionHeading
            icon={<GitMerge size={16} />}
            title="Convergence & Synthesis"
            description="Track how opinions converge and which synthesis strategies are used"
          />
          <div
            className="grid gap-5"
            style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 420px), 1fr))' }}
          >
            {/* ── Convergence Trend Line Chart ── */}
            <ChartSection
              title="Convergence Trend"
              description="How consensus evolves across rounds"
              icon={<GitMerge size={16} />}
              ariaLabel="Line chart showing convergence trend across Delphi rounds"
            >
              <PillTabs
                options={convergenceFormOptions}
                selectedId={selectedFormId}
                onSelect={setSelectedFormId}
              />
              {convergenceData.length > 0 ? (
                <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={convergenceData} margin={{ top: 8, right: 16, bottom: 8, left: 0 }}>
                    <CartesianGrid vertical={false} stroke={GRID_STROKE} strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      tick={TICK_STYLE}
                      axisLine={{ stroke: GRID_STROKE }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={TICK_STYLE}
                      domain={[0, 100]}
                      tickFormatter={(v: number) => `${v}%`}
                      axisLine={false}
                      tickLine={false}
                      width={40}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={28}
                      iconType="circle"
                      iconSize={8}
                      wrapperStyle={{ fontSize: '0.6875rem', color: '#64748b' }}
                    />
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
              ) : (
                <EmptyState
                  message="No round data yet"
                  sub="Convergence scores appear after multiple Delphi rounds are completed."
                />
              )}
            </ChartSection>

            {/* ── Synthesis Mode Donut ── */}
            <ChartSection
              title="Synthesis Modes"
              description="Distribution of synthesis strategies across forms"
              icon={<PieChartIcon size={16} />}
              ariaLabel="Donut chart showing synthesis mode distribution"
            >
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
                          <Cell key={i} fill={paletteAt(i)} />
                        ))}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <PieLegend entries={pieLegendEntries} />
                </>
              ) : (
                <EmptyState
                  message="No syntheses generated yet"
                  sub="Synthesis mode data will appear once forms have been processed."
                />
              )}
            </ChartSection>
          </div>
        </>
      )}
    </div>
  );
}
