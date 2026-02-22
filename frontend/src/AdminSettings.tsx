import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from './api/client';
import Container from './layouts/Container';
import { LoadingButton } from './components';
import { useDocumentTitle } from './hooks/useDocumentTitle';

const AVAILABLE_MODELS = [
  { id: 'anthropic/claude-opus-4-6', label: 'Claude Opus 4.6 (default — best quality)' },
  { id: 'anthropic/claude-sonnet-4-5', label: 'Claude Sonnet 4.5 (faster, good quality)' },
  { id: 'anthropic/claude-haiku-3-5', label: 'Claude Haiku 3.5 (fastest, cheapest)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (Google, fast)' },
  { id: 'google/gemini-pro-1.5', label: 'Gemini Pro 1.5 (Google, high quality)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (OpenAI)' },
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (OpenAI, fast)' },
];

/**
 * Admin settings page.
 * Route: /admin/settings
 */
export default function AdminSettings() {
  useDocumentTitle('Settings');
  const navigate = useNavigate();

  const [synthesisModel, setSynthesisModel] = useState('anthropic/claude-opus-4-6');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Record<string, string>>('/admin/settings')
      .then(data => {
        if (data.synthesis_model) setSynthesisModel(data.synthesis_model);
      })
      .catch(() => setError('Failed to load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      await api.patch('/admin/settings', { synthesis_model: synthesisModel });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError('Failed to save settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="flex-1 py-6 sm:py-8">
      <Container size="md">
        {/* Back */}
        <button
          type="button"
          onClick={() => navigate('/admin')}
          className="inline-flex items-center gap-1.5 text-sm mb-6"
          style={{ color: 'var(--muted-foreground)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--foreground)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted-foreground)')}
        >
          ← Back to Dashboard
        </button>

        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--foreground)' }}>
            Settings
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
            Configure models and global defaults for your Symphonia instance.
          </p>
        </div>

        {error && (
          <div className="rounded-lg p-4 mb-6" style={{ backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)', border: '1px solid var(--destructive)', color: 'var(--destructive)' }}>
            <span className="text-sm font-medium">{error}</span>
          </div>
        )}

        {/* AI Model */}
        <div
          className="rounded-lg p-6 sm:p-8 mb-4"
          style={{ backgroundColor: 'var(--card)', border: '1px solid var(--border)', borderLeft: '3px solid var(--accent)', boxShadow: 'var(--card-shadow, none)' }}
        >
          <h2 className="text-base font-semibold mb-1" style={{ color: 'var(--foreground)' }}>
            AI Model
          </h2>
          <p className="text-sm mb-4" style={{ color: 'var(--muted-foreground)' }}>
            Used for all synthesis operations — structured analysis, cross-matrix, heatmap generation, AI suggestions, and voice mirroring.
          </p>

          {loading ? (
            <div className="h-10 rounded-lg animate-pulse" style={{ backgroundColor: 'var(--muted)' }} />
          ) : (
            <select
              value={synthesisModel}
              onChange={e => setSynthesisModel(e.target.value)}
              className="w-full rounded-lg px-3 py-2.5 text-sm"
              style={{
                border: '1px solid var(--input)',
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                outline: 'none',
                cursor: 'pointer',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 2px rgba(37,99,235,0.2)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'var(--input)'; e.currentTarget.style.boxShadow = 'none'; }}
            >
              {AVAILABLE_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          )}

          <p className="text-xs mt-2" style={{ color: 'var(--muted-foreground)' }}>
            Model ID: <code style={{ fontFamily: 'monospace', color: 'var(--accent)' }}>{synthesisModel}</code>
          </p>
        </div>

        {/* Save */}
        <div className="flex items-center gap-3">
          <LoadingButton variant="accent" size="md" loading={saving} onClick={save}>
            Save settings
          </LoadingButton>
          {saved && (
            <span className="text-sm font-medium" style={{ color: 'var(--accent)' }}>
              ✓ Saved
            </span>
          )}
        </div>
      </Container>
    </section>
  );
}
