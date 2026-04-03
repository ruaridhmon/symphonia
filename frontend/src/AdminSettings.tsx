import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Brain, User, Save, Check } from 'lucide-react';
import { api } from './api/client';
import { useAuth } from './AuthContext';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

/* ── Constants ────────────────────────────────────────────────── */

const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4o', label: 'GPT-4o (OpenAI, best quality)' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenAI, fast)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (Google, fast)' },
  { id: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5 (Google, high quality)' },
];

function sanitizeModel(model: string): string {
  if (model.startsWith('anthropic/')) return 'openai/gpt-4o';
  return model;
}

/* ── Settings interface ───────────────────────────────────────── */

interface SettingsState {
  synthesis_model: string;
  registration_mode: string;
  allowed_domains: string;
}

const DEFAULTS: SettingsState = {
  synthesis_model: 'openai/gpt-4o',
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
        merged.synthesis_model = sanitizeModel(merged.synthesis_model);
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
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-2 mb-6 transition-colors"
          style={{
            color: 'var(--muted-foreground)',
            backgroundColor: 'var(--card)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            cursor: 'pointer',
            padding: '10px 14px',
            fontSize: '0.95rem',
            fontWeight: 600,
            lineHeight: 1,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.color = 'var(--foreground)';
            e.currentTarget.style.borderColor = 'var(--accent)';
            e.currentTarget.style.backgroundColor = 'color-mix(in srgb, var(--accent) 6%, var(--card))';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.color = 'var(--muted-foreground)';
            e.currentTarget.style.borderColor = 'var(--border)';
            e.currentTarget.style.backgroundColor = 'var(--card)';
          }}
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
            Platform-wide defaults only. Consultation-specific choices belong in each summary.
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

            {/* ── Section 1: AI Defaults ─────────────────────────── */}
            <div className="rounded-lg p-6 sm:p-8" style={cardStyle}>
              <div className="flex items-center gap-2 mb-5">
                <Brain size={18} style={{ color: 'var(--accent)' }} />
                <h2
                  className="text-base font-semibold"
                  style={{ color: 'var(--foreground)' }}
                >
                  AI Defaults
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <label
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: 'var(--foreground)' }}
                  >
                    Default AI model
                  </label>
                  <p
                    className="text-xs mb-2"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    Used as the starting model in the summary workspace and as a fallback for AI tools that do not choose one explicitly.
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
                    Selected default:{' '}
                    <code style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>
                      {settings.synthesis_model}
                    </code>
                  </p>
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
                  Access
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
                    Save changes
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
