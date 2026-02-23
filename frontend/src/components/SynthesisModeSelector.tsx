import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Zap, Users, Microscope, Info } from 'lucide-react';
import type { ReactNode } from 'react';

interface SynthesisModeSelectorProps {
  mode: 'simple' | 'committee' | 'ttd';
  onModeChange: (mode: 'simple' | 'committee' | 'ttd') => void;
}

const modeIcons: Record<string, ReactNode> = {
  simple: <Zap size={16} style={{ color: 'var(--warning)' }} />,
  committee: <Users size={16} style={{ color: 'var(--accent)' }} />,
  ttd: <Microscope size={16} style={{ color: 'var(--accent)' }} />,
};

const modeIds: ('simple' | 'committee' | 'ttd')[] = ['simple', 'committee', 'ttd'];

export default function SynthesisModeSelector({ mode, onModeChange }: SynthesisModeSelectorProps) {
  const { t } = useTranslation();
  const [expandedTooltip, setExpandedTooltip] = useState<string | null>(null);

  const modes = modeIds.map(id => ({
    id,
    name: t(`synthesis.modes.${id}`),
    description: t(`synthesis.modes.${id}Desc`),
    detail: t(`synthesis.modes.${id}Detail`),
    icon: modeIcons[id],
    speed: t(`synthesis.modes.speed${id === 'simple' ? 'Fast' : id === 'committee' ? 'Moderate' : 'Thorough'}`),
    bestFor: t(`synthesis.modes.${id}BestFor`),
  }));

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
    [mode, onModeChange, modes],
  );

  return (
    <div className="synthesis-mode-selector" role="radiogroup" aria-label={t('synthesis.modes.modeLabel')}>
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
                aria-label={t('synthesis.modes.moreInfo', { mode: m.name })}
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
                {t('synthesis.modes.bestFor')} <span style={{ fontWeight: 400, color: 'var(--muted-foreground)' }}>{m.bestFor}</span>
              </p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
