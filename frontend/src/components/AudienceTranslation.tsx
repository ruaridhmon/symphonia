import { useState } from 'react';
import { Globe, Loader2, X } from 'lucide-react';
import { translateSynthesis } from '../api/synthesis';
import type { AudienceType } from '../api/synthesis';
import MarkdownRenderer from './MarkdownRenderer';

interface AudienceTranslationProps {
  formId: number;
  roundId: number;
  /** The full synthesis text to translate (can be plain text, markdown, or extracted from JSON) */
  synthesisText: string;
}

const AUDIENCES: { value: AudienceType; label: string; icon: string }[] = [
  { value: 'policy_maker', label: 'Policy Maker', icon: '🏛️' },
  { value: 'technical', label: 'Technical', icon: '🔬' },
  { value: 'general_public', label: 'General Public', icon: '👥' },
  { value: 'executive', label: 'Executive', icon: '💼' },
  { value: 'academic', label: 'Academic', icon: '🎓' },
];

export default function AudienceTranslation({
  formId,
  roundId,
  synthesisText,
}: AudienceTranslationProps) {
  const [selectedAudience, setSelectedAudience] = useState<AudienceType | ''>('');
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [translatedLabel, setTranslatedLabel] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAudienceChange(audience: AudienceType | '') {
    setSelectedAudience(audience);
    setError(null);

    if (!audience) {
      setTranslatedText(null);
      setTranslatedLabel('');
      return;
    }

    setLoading(true);
    try {
      const result = await translateSynthesis(formId, roundId, audience, synthesisText);
      setTranslatedText(result.translated_text);
      setTranslatedLabel(result.audience_label);
    } catch (err) {
      setError((err as Error).message || 'Failed to translate synthesis');
      setTranslatedText(null);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setSelectedAudience('');
    setTranslatedText(null);
    setTranslatedLabel('');
    setError(null);
  }

  return (
    <div className="space-y-3">
      {/* Audience selector row */}
      <div className="flex items-center gap-2 flex-wrap">
        <Globe size={16} style={{ color: 'var(--accent)', flexShrink: 0 }} />
        <span className="text-sm font-medium" style={{ color: 'var(--muted-foreground)' }}>
          Reading as:
        </span>
        <select
          value={selectedAudience}
          onChange={e => handleAudienceChange(e.target.value as AudienceType | '')}
          disabled={loading}
          className="text-sm rounded-lg px-3 py-1.5 transition-colors"
          style={{
            backgroundColor: 'var(--muted)',
            color: 'var(--foreground)',
            border: '1px solid var(--border)',
            cursor: loading ? 'wait' : 'pointer',
            minWidth: '180px',
          }}
        >
          <option value="">Select audience…</option>
          {AUDIENCES.map(a => (
            <option key={a.value} value={a.value}>
              {a.icon} {a.label}
            </option>
          ))}
        </select>
        {selectedAudience && !loading && (
          <button
            onClick={handleClear}
            className="p-1 rounded transition-colors"
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--muted-foreground)',
              cursor: 'pointer',
            }}
            title="Clear translation"
          >
            <X size={14} />
          </button>
        )}
        {loading && <Loader2 size={16} className="animate-spin" style={{ color: 'var(--accent)' }} />}
      </div>

      {/* Error display */}
      {error && (
        <div
          className="text-sm rounded-lg px-3 py-2"
          style={{ backgroundColor: 'rgba(239,68,68,0.08)', color: 'var(--destructive)' }}
        >
          {error}
        </div>
      )}

      {/* Translated content */}
      {translatedText && (
        <div
          className="rounded-lg p-4 sm:p-5 space-y-2"
          style={{
            backgroundColor: 'rgba(99,102,241,0.04)',
            border: '1px solid rgba(99,102,241,0.15)',
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: 'rgba(99,102,241,0.12)',
                color: 'rgb(99,102,241)',
              }}
            >
              {translatedLabel} Lens
            </span>
            <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
              AI-translated version
            </span>
          </div>
          <MarkdownRenderer content={translatedText} />
        </div>
      )}
    </div>
  );
}
