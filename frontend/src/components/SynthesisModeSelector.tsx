import { useState, useCallback } from 'react';
import { Zap, Users, Microscope, Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface SynthesisModeSelectorProps {
  mode: 'simple' | 'committee' | 'ttd';
  onModeChange: (mode: 'simple' | 'committee' | 'ttd') => void;
}

const modes: {
  id: 'simple' | 'committee' | 'ttd';
  name: string;
  description: string;
  detail: string;
  icon: ReactNode;
  speed: string;
  bestFor: string;
}[] = [
  {
    id: 'simple',
    name: 'Simple',
    description: 'Quick one-shot summary',
    detail:
      'A single AI pass that reads all expert responses and generates a unified summary. Fast and cost-effective, but may miss nuanced disagreements or minority positions.',
    icon: <Zap size={16} style={{ color: 'var(--warning)' }} />,
    speed: 'Fast',
    bestFor: 'Quick overviews, early rounds, small panels (< 8 experts)',
  },
  {
    id: 'committee',
    name: 'Committee',
    description: 'Multi-analyst structured synthesis',
    detail:
      'Multiple independent AI analysts each read all responses and identify agreements, disagreements, nuances, and probes. A meta-synthesiser then combines their analyses into a structured output with provenance tracking.',
    icon: <Users size={16} style={{ color: 'var(--accent)' }} />,
    speed: 'Moderate',
    bestFor: 'Final rounds, policy-critical topics, panels with strong disagreement',
  },
  {
    id: 'ttd',
    name: 'TTD',
    description: 'Iterative diffusion refinement',
    detail:
      'Think-Through-Diffusion: an iterative process where the synthesis is refined across multiple passes, with each pass deepening the analysis. Produces the most thorough output but takes longer.',
    icon: <Microscope size={16} style={{ color: 'var(--accent)' }} />,
    speed: 'Thorough',
    bestFor: 'Complex multi-dimensional topics, high-stakes decisions, large panels',
  },
];

export default function SynthesisModeSelector({ mode, onModeChange }: SynthesisModeSelectorProps) {
  const [expandedTooltip, setExpandedTooltip] = useState<string | null>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const currentIndex = modes.findIndex(m => m.id === mode);
      let nextIndex = currentIndex;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        e.preventDefault();
        nextIndex = (currentIndex + 1) % modes.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        e.preventDefault();
        nextIndex = (currentIndex - 1 + modes.length) % modes.length;
      }
      if (nextIndex !== currentIndex) {
        onModeChange(modes[nextIndex].id);
        // Focus the newly-selected radio button
        const container = (e.target as HTMLElement).closest('[role="radiogroup"]');
        const buttons = container?.querySelectorAll<HTMLElement>('[role="radio"]');
        buttons?.[nextIndex]?.focus();
      }
    },
    [mode, onModeChange],
  );

  return (
    <div className="synthesis-mode-selector" role="radiogroup" aria-label="Synthesis mode">
      {modes.map(m => (
        <div key={m.id} style={{ position: 'relative' }}>
          <button
            className={`synthesis-mode-option ${mode === m.id ? 'selected' : ''}`}
            onClick={() => onModeChange(m.id)}
            role="radio"
            aria-checked={mode === m.id}
            aria-label={`${m.name} synthesis mode: ${m.description}`}
            tabIndex={mode === m.id ? 0 : -1}
            onKeyDown={handleKeyDown}
          >
            <span className="synthesis-mode-emoji">{m.icon}</span>
            <div className="synthesis-mode-text">
              <span className="synthesis-mode-name">{m.name}</span>
              <span className="synthesis-mode-desc">{m.description}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span className="synthesis-mode-speed">{m.speed}</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setExpandedTooltip(expandedTooltip === m.id ? null : m.id);
                }}
                aria-label={`More info about ${m.name} mode`}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '2px',
                  display: 'flex',
                  alignItems: 'center',
                  color: 'var(--muted-foreground)',
                  opacity: 0.7,
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '1'; }}
                onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.7'; }}
              >
                <Info size={13} />
              </button>
            </div>
          </button>

          {/* Expanded tooltip */}
          {expandedTooltip === m.id && (
            <div
              className="fade-in"
              style={{
                marginTop: '0.25rem',
                padding: '0.75rem 1rem',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
                fontSize: '0.8125rem',
                lineHeight: '1.5',
                color: 'var(--muted-foreground)',
              }}
            >
              <p style={{ marginBottom: '0.5rem' }}>{m.detail}</p>
              <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--foreground)' }}>
                Best for: <span style={{ fontWeight: 400, color: 'var(--muted-foreground)' }}>{m.bestFor}</span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
