import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, Settings2, User, Save, Check } from 'lucide-react';
import { api } from './api/client';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/* ── Constants ────────────────────────────────────────────────── */

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6 (default — best quality)' },
  { id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (faster, good quality)' },
  { id: 'anthropic/claude-haiku-3-5', label: 'Claude Haiku 3.5 (fastest, cheapest)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (Google, fast)' },
  { id: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5 (Google, high quality)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (OpenAI)' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenAI, fast)' },
];

const SYNTHESIS_STRATEGIES = [
  { id: 'single_prompt', label: 'Single Prompt (fastest, good for focused topics)' },
  { id: 'committee', label: 'Committee (multiple perspectives, richer synthesis)' },
  { id: 'diffusion', label: 'Diffusion / TTD (iterative denoising, best quality, slowest)' },
];

/* ── Toggle switch (pill-shaped) ──────────────────────────────── */

function ToggleSwitch({
  checked,
  onChange,
  id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  id?: string;
}) {
  return (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative inline-flex shrink-0 rounded-full transition-colors duration-200 focus-visible:outline-none"
      style={{
        width: 44,
        height: 24,
        backgroundColor: checked ? 'var(--accent)' : 'var(--input)',
        cursor: 'pointer',
        border: 'none',
        padding: 0,
      }}
    >
      <span
        className="block rounded-full shadow-sm transition-transform duration-200"
        style={{
          width: 20,
          height: 20,
          marginTop: 2,
          marginLeft: checked ? 22 : 2,
          backgroundColor: '#fff',
        }}
      />
    </button>
  );
}

/* ── Settings interface ───────────────────────────────────────── */

interface SettingsState {
  synthesis_model: string;
  synthesis_strategy: string;
  ai_suggestions_count: string;
  max_rounds: string;
  convergence_threshold: string;
  default_anonymous: string;
  allow_late_join: string;
  registration_mode: string;
  allowed_domains: string;
}

const DEFAULTS: SettingsState = {
  synthesis_model: 'anthropic/claude-opus-4-6',
  synthesis_strategy: 'single_prompt',
  ai_suggestions_count: '5',
  max_rounds: '3',
  convergence_threshold: '70',
  default_anonymous: 'false',
  allow_late_join: 'true',
  registration_mode: 'open',
  allowed_domains: '',
};

/* ── Styled input focus helpers ───────────────────────────────── */

const focusStyle = (e: React.FocusEvent<HTMLSelectElement | HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--accent)';
  e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37, 99, 235, 0.2)';
};

const blurStyle = (e: React.FocusEvent<HTMLSelectElement | HTMLInputElement>) => {
  e.currentTarget.style.borderColor = 'var(--input)';
  e.currentTarget.style.boxShadow = 'none';
};

/* ── Main component ───────────────────────────────────────────── */

export default function AdminSettings() {
  useDocumentTitle('Settings');
  const navigate = useNavigate();
  const { user } = useAuth();

  const [settings, setSettings] = useState<SettingsState>(DEFAULTS);
  const [initial, setInitial] = useState<SettingsState>(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Record<string, string>>('/admin/settings')
      .then(data => {
        const merged: SettingsState = { ...DEFAULTS };
        for (const key of Object.keys(DEFAULTS) as (keyof SettingsState)[]) {
          if (data[key] !== undefined) merged[key] = data[key];
        }
        setSettings(merged);
        setInitial(merged);
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(initial);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      // Send only changed keys
      const payload: Record<string, string> = {};
      for (const key of Object.keys(settings) as (keyof SettingsState)[]) {
        if (settings[key] !== initial[key]) {
          payload[key] = settings[key];
        }
      }
      if (Object.keys(payload).length > 0) {
        await api.patch('/admin/settings', payload);
      }
      setInitial({ ...settings });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    border: '1px solid var(--input)',
    backgroundColor: 'var(--background)',
    color: 'var(--foreground)',
    outline: 'none',
  };

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--card)',
    border: '1px solid var(--border)',
    borderLeft: '3px solid var(--accent)',
    boxShadow: 'var(--card-shadow, none)',
  };

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="md">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm mb-6"
          style={{
            color: 'var(--muted-foreground)',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}
        >
          <ArrowLeft size={16} />
          Back to Dashboard
        </button>

        <div className="mb-8">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: 'var(--foreground)' }}
          >
            Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Configure AI models, synthesis behaviour, and consultation defaults.
          </p>
        </div>

        {error && (
          <div
            className="rounded-lg p-4 mb-6"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
              border: '1px solid var(--destructive)',
              color: 'var(--destructive)',
            }}
          >
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className="h-40 rounded-lg animate-pulse"
                style={{ backgroundColor: 'var(--input)' }}
              />
            ))}
          </div>
        ) : (
          <div className="space-y-6">

            {/* ── Section 1: AI & Synthesis ──────────────────────── */}
            <div className="rounded-lg p-6 sm:p-8" style={cardStyle}>
              <div className="flex items-center gap-2 mb-5">
                <Brain size={18} style={{ color: 'var(--accent)' }} />
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  AI & Synthesis
                </h2>
              </div>

              <div className="space-y-5">
                {/* AI Model */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--foreground)' }}
                  >
                    AI Model
                  </label>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Used for synthesis, AI suggestions, cross-analysis, and voice mirroring.
                  </p>
                  <select
                    value={settings.synthesis_model}
                    onChange={e => update('synthesis_model', e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  >
                    {AVAILABLE_MODELS.map(m => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <p className="text-xs mt-1.5" style={{ color: 'var(--muted-foreground)' }}>
                    Model ID:{' '}
                    <code style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
                      {settings.synthesis_model}
                    </code>
                  </p>
                </div>

                {/* Synthesis Strategy */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Synthesis Strategy
                  </label>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    How AI synthesises expert responses between rounds.
                  </p>
                  <select
                    value={settings.synthesis_strategy}
                    onChange={e => update('synthesis_strategy', e.target.value)}
                    className="w-full rounded-lg px-3 py-2.5 text-sm"
                    style={{ ...inputStyle, cursor: 'pointer' }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  >
                    {SYNTHESIS_STRATEGIES.map(s => (
                      <option key={s.id} value={s.id}>{s.label}</option>
                    ))}
                  </select>
                </div>

                {/* AI Suggestions Count */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--foreground)' }}
                  >
                    AI Suggestions Count
                  </label>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    How many question suggestions the AI assistant returns.
                  </p>
                  <input
                    type="number"
                    min={3}
                    max={10}
                    step={1}
                    value={settings.ai_suggestions_count}
                    onChange={e => {
                      const v = Math.max(3, Math.min(10, Number(e.target.value) || 3));
                      update('ai_suggestions_count', String(v));
                    }}
                    className="w-full sm:w-32 rounded-lg px-3 py-2.5 text-sm"
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>
              </div>
            </div>

            {/* ── Section 2: Consultation Defaults ───────────────── */}
            <div className="rounded-lg p-6 sm:p-8" style={cardStyle}>
              <div className="flex items-center gap-2 mb-5">
                <Settings2 size={18} style={{ color: 'var(--accent)' }} />
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  Consultation Defaults
                </h2>
              </div>

              <div className="space-y-6">
                {/* Max Rounds */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Max Rounds
                  </label>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Hard ceiling on the number of rounds per consultation.
                  </p>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    value={settings.max_rounds}
                    onChange={e => {
                      const v = Math.max(1, Math.min(10, Number(e.target.value) || 1));
                      update('max_rounds', String(v));
                    }}
                    className="w-full sm:w-32 rounded-lg px-3 py-2.5 text-sm"
                    style={inputStyle}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  />
                </div>

                {/* Convergence Threshold */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Convergence Threshold
                  </label>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Agreement percentage at which the system suggests closing a round.
                  </p>
                  <div className="flex items-center gap-4">
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={5}
                      value={settings.convergence_threshold}
                      onChange={e => update('convergence_threshold', e.target.value)}
                      className="flex-1"
                      style={{
                        accentColor: 'var(--accent)',
                        cursor: 'pointer',
                        height: 6,
                      }}
                    />
                    <span
                      className="text-sm font-semibold tabular-nums"
                      style={{
                        color: 'var(--accent)',
                        minWidth: '4.5rem',
                        textAlign: 'right',
                      }}
                    >
                      {settings.convergence_threshold}% agreement
                    </span>
                  </div>
                </div>

                {/* Default Anonymous */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="toggle-default-anonymous"
                      className="block text-sm font-medium"
                      style={{ color: 'var(--foreground)', cursor: 'pointer' }}
                    >
                      Default Anonymous
                    </label>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      New forms default to anonymous responses — participant names hidden in synthesis.
                    </p>
                  </div>
                  <ToggleSwitch
                    id="toggle-default-anonymous"
                    checked={settings.default_anonymous === 'true'}
                    onChange={v => update('default_anonymous', v ? 'true' : 'false')}
                  />
                </div>

                {/* Allow Late Join */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <label
                      htmlFor="toggle-allow-late-join"
                      className="block text-sm font-medium"
                      style={{ color: 'var(--foreground)', cursor: 'pointer' }}
                    >
                      Allow Late Join
                    </label>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Participants can join a consultation after round 1 has started.
                    </p>
                  </div>
                  <ToggleSwitch
                    id="toggle-allow-late-join"
                    checked={settings.allow_late_join === 'true'}
                    onChange={v => update('allow_late_join', v ? 'true' : 'false')}
                  />
                </div>
              </div>
            </div>

            {/* ── Section: Registration Controls ──────────────────── */}
            <div className="rounded-lg p-6 sm:p-8" style={cardStyle}>
              <div className="flex items-center gap-2 mb-5">
                <User size={18} style={{ color: 'var(--accent)' }} />
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  Registration
                </h2>
              </div>

              <div className="space-y-4">
                {/* Registration Mode */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Registration Mode
                  </label>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Controls who can create new accounts on this platform.
                  </p>
                  <select
                    value={settings.registration_mode}
                    onChange={e => update('registration_mode', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg text-sm"
                    style={{
                      border: '1px solid var(--input)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--foreground)',
                    }}
                    onFocus={focusStyle}
                    onBlur={blurStyle}
                  >
                    <option value="open">Open (anyone can register)</option>
                    <option value="domain_restricted">Domain-restricted (approved email domains only)</option>
                    <option value="invite_only">Invite-only (registration disabled)</option>
                  </select>
                </div>

                {/* Allowed Domains (only shown for domain_restricted) */}
                {settings.registration_mode === 'domain_restricted' && (
                  <div>
                    <label
                      className="block text-sm font-medium mb-1"
                      style={{ color: 'var(--foreground)' }}
                    >
                      Allowed Email Domains
                    </label>
                    <p
                      className="text-xs mb-2"
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      Comma-separated list of allowed domains (e.g. gov.uk, ed.ac.uk).
                    </p>
                    <input
                      type="text"
                      value={settings.allowed_domains}
                      onChange={e => update('allowed_domains', e.target.value)}
                      placeholder="e.g. gov.uk, ed.ac.uk, axiotic.ai"
                      className="w-full px-3 py-2 rounded-lg text-sm"
                      style={{
                        border: '1px solid var(--input)',
                        backgroundColor: 'var(--background)',
                        color: 'var(--foreground)',
                      }}
                      onFocus={focusStyle}
                      onBlur={blurStyle}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* ── Section 3: Account ─────────────────────────────── */}
            <div className="rounded-lg p-6 sm:p-8" style={cardStyle}>
              <div className="flex items-center gap-2 mb-5">
                <User size={18} style={{ color: 'var(--accent)' }} />
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  Account
                </h2>
              </div>

              <div className="space-y-4">
                {/* Admin email */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Admin Email
                  </label>
                  <p
                    className="text-sm"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {user?.email || 'Not available'}
                  </p>
                </div>

                {/* Change password placeholder */}
                <div>
                  <label
                    className="block text-sm font-medium mb-1"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Password
                  </label>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Password reset via email — contact your system administrator.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="text-sm px-4 py-2 rounded-lg font-medium"
                    style={{
                      border: '1px solid var(--border)',
                      backgroundColor: 'var(--background)',
                      color: 'var(--muted-foreground)',
                      cursor: 'not-allowed',
                      opacity: 0.6,
                    }}
                  >
                    Change Password
                  </button>
                </div>
              </div>
            </div>

            {/* ── Save Button ────────────────────────────────────── */}
            <div
              className="flex items-center gap-3 pt-2"
              style={{
                position: 'sticky',
                bottom: 16,
                zIndex: 10,
              }}
            >
              <div
                className="flex items-center gap-3 rounded-lg px-4 py-3"
                style={{
                  backgroundColor: 'var(--card)',
                  border: `1px solid ${isDirty ? 'var(--accent)' : 'var(--border)'}`,
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <LoadingButton
                  variant="accent"
                  size="md"
                  loading={saving}
                  onClick={save}
                  disabled={!isDirty && !saving}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Save size={15} />
                    Save settings
                  </span>
                </LoadingButton>
                {saved && (
                  <span
                    className="text-sm font-medium"
                    style={{
                      color: 'var(--accent)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    <Check size={16} />
                    Saved
                  </span>
                )}
                {isDirty && !saved && (
                  <span
                    className="text-xs"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Unsaved changes
                  </span>
                )}
              </div>
            </div>

          </div>
        )}
      </Container>
    </section>
  );
}
