import { Zap, Users, Microscope } from 'lucide-react';
import type { ReactNode } from 'react';

interface SynthesisModeSelectorProps {
  mode: 'simple' | 'committee' | 'ttd';
  onModeChange: (mode: 'simple' | 'committee' | 'ttd') => void;
}

const modes: { id: 'simple' | 'committee' | 'ttd'; name: string; description: string; icon: ReactNode; speed: string }[] = [
  {
    id: 'simple',
    name: 'Simple',
    description: 'Quick one-shot summary',
    icon: <Zap size={16} style={{ color: '#eab308' }} />,
    speed: 'Fast',
  },
  {
    id: 'committee',
    name: 'Committee',
    description: 'Multi-analyst structured synthesis',
    icon: <Users size={16} style={{ color: 'var(--accent)' }} />,
    speed: 'Moderate',
  },
  {
    id: 'ttd',
    name: 'TTD',
    description: 'Iterative diffusion refinement',
    icon: <Microscope size={16} style={{ color: 'var(--accent)' }} />,
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
          <span className="synthesis-mode-emoji">{m.icon}</span>
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
