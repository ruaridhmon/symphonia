interface SynthesisModeSelectorProps {
  mode: 'simple' | 'committee' | 'ttd';
  onModeChange: (mode: 'simple' | 'committee' | 'ttd') => void;
}

const modes = [
  {
    id: 'simple' as const,
    name: 'Simple',
    description: 'Quick one-shot summary',
    emoji: '⚡',
    speed: 'Fast',
  },
  {
    id: 'committee' as const,
    name: 'Committee',
    description: 'Multi-analyst structured synthesis',
    emoji: '👥',
    speed: 'Moderate',
  },
  {
    id: 'ttd' as const,
    name: 'TTD',
    description: 'Iterative diffusion refinement',
    emoji: '🔬',
    speed: 'Thorough',
  },
];

export default function SynthesisModeSelector({ mode, onModeChange }: SynthesisModeSelectorProps) {
  return (
    <div className="synthesis-mode-selector">
      {modes.map(m => (
        <button
          key={m.id}
          className={`synthesis-mode-option ${mode === m.id ? 'selected' : ''}`}
          onClick={() => onModeChange(m.id)}
        >
          <span className="synthesis-mode-emoji">{m.emoji}</span>
          <div className="synthesis-mode-text">
            <span className="synthesis-mode-name">{m.name}</span>
            <span className="synthesis-mode-desc">{m.description}</span>
          </div>
          <span className="synthesis-mode-speed">{m.speed}</span>
        </button>
      ))}
    </div>
  );
}
