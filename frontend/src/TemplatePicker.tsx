import { useState, useEffect, type ReactNode } from 'react';
import { FileText, Users, ArrowRight, Loader2, Sparkles, MessagesSquare } from 'lucide-react';
import { API_BASE_URL } from './config';

/* ── Types ──────────────────────────────────────────────────── */

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  suggested_panel_size: number;
  default_questions: Array<string | Record<string, unknown>>;
  expert_label_preset: Record<string, unknown>;
  tags: string[];
}

/* ── TemplatePicker ─────────────────────────────────────────── */

interface TemplatePickerProps {
  onSelectTemplate: (template: FormTemplate) => void;
  onStartBlank: () => void;
  onStartInformationGathering: () => void;
}

function StarterOptionCard({
  title,
  description,
  icon,
  active,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
        padding: '16px 18px',
        borderRadius: 14,
        border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 30%, var(--border))' : 'var(--border)'}`,
        background: active
          ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)), var(--card))'
          : 'var(--card)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'left',
        minHeight: 102,
        boxShadow: active ? '0 10px 24px rgba(37, 99, 235, 0.08)' : '0 2px 6px rgba(15, 23, 42, 0.03)',
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          backgroundColor: active
            ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
            : 'color-mix(in srgb, var(--foreground) 6%, transparent)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: active ? 'var(--accent)' : 'var(--muted-foreground)',
        }}
      >
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 3 }}>
          {title}
        </div>
        <div style={{ fontSize: '0.8rem', color: 'var(--muted-foreground)', lineHeight: 1.45 }}>
          {description}
        </div>
      </div>
      <ArrowRight
        size={16}
        style={{
          color: active ? 'var(--accent)' : 'var(--muted-foreground)',
          flexShrink: 0,
          opacity: active ? 1 : 0.35,
        }}
      />
    </button>
  );
}

export default function TemplatePicker({
  onSelectTemplate,
  onStartBlank,
  onStartInformationGathering,
}: TemplatePickerProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredBlank, setHoveredBlank] = useState(false);
  const [hoveredInfoBlank, setHoveredInfoBlank] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE_URL}/templates`)
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: FormTemplate[]) => {
        setTemplates(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message || 'Failed to load templates');
        setLoading(false);
      });
  }, []);

  const sortedTemplates = [...templates].sort((a, b) => {
    const categoryCompare = a.category.localeCompare(b.category);
    if (categoryCompare !== 0) return categoryCompare;
    return a.name.localeCompare(b.name);
  });

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '4rem 2rem',
        gap: 12,
      }}>
        <Loader2
          size={28}
          style={{
            color: 'var(--accent)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)' }}>
          Loading templates…
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    // On error, just show blank option
    return (
      <div style={{ padding: '2rem 0' }}>
        <p style={{ fontSize: '0.875rem', color: 'var(--muted-foreground)', marginBottom: 16 }}>
          Could not load templates. You can still create a form from scratch.
        </p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onStartBlank}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: '2px solid var(--accent)',
              backgroundColor: 'transparent',
              color: 'var(--accent)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start consensus form from scratch →
          </button>
          <button
            type="button"
            onClick={onStartInformationGathering}
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: '2px solid var(--border)',
              backgroundColor: 'transparent',
              color: 'var(--foreground)',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Start survey form from scratch →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        <StarterOptionCard
          title="Blank consensus"
          description="Evidence, counterarguments, and confidence enabled."
          icon={<Sparkles size={22} />}
          active={hoveredBlank}
          onClick={onStartBlank}
          onMouseEnter={() => setHoveredBlank(true)}
          onMouseLeave={() => setHoveredBlank(false)}
        />

        <StarterOptionCard
          title="Blank survey"
          description="Open-text responses only."
          icon={<MessagesSquare size={22} />}
          active={hoveredInfoBlank}
          onClick={onStartInformationGathering}
          onMouseEnter={() => setHoveredInfoBlank(true)}
          onMouseLeave={() => setHoveredInfoBlank(false)}
        />
      </div>

      {/* Template cards grouped by category */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2
          style={{
            fontSize: '1rem',
            fontWeight: 700,
            color: 'var(--foreground)',
            margin: 0,
          }}
        >
          Templates
        </h2>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
          gap: 10,
        }}
      >
        {sortedTemplates.map(template => {
          const isHovered = hoveredId === template.id;
          return (
            <button
              key={template.id}
              type="button"
              onClick={() => onSelectTemplate(template)}
              onMouseEnter={() => setHoveredId(template.id)}
              onMouseLeave={() => setHoveredId(null)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                textAlign: 'left',
                padding: '14px 15px',
                borderRadius: 12,
                border: `1px solid ${isHovered ? 'color-mix(in srgb, var(--accent) 55%, var(--border))' : 'color-mix(in srgb, var(--border) 70%, transparent)'}`,
                backgroundColor: isHovered
                  ? 'color-mix(in srgb, var(--accent) 4%, var(--card))'
                  : 'var(--card)',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isHovered
                  ? '0 8px 18px rgba(15, 23, 42, 0.06)'
                  : '0 1px 4px rgba(15, 23, 42, 0.02)',
                transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                minHeight: 168,
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontSize: '0.62rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--muted-foreground)',
                  marginBottom: 6,
                }}
              >
                {template.category}
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 7 }}>
                <span
                  style={{
                    fontSize: '1.05rem',
                    lineHeight: 1,
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    backgroundColor: isHovered
                      ? 'color-mix(in srgb, var(--accent) 10%, transparent)'
                      : 'color-mix(in srgb, var(--foreground) 6%, transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    transition: 'background-color 0.15s ease',
                  }}
                >
                  {template.icon}
                </span>
                <span
                  style={{
                    fontSize: '0.88rem',
                    fontWeight: 600,
                    color: 'var(--foreground)',
                  }}
                >
                  {template.name}
                </span>
              </div>

              <p
                style={{
                  fontSize: '0.76rem',
                  color: 'var(--muted-foreground)',
                  lineHeight: 1.45,
                  margin: '0 0 9px 0',
                  flex: 1,
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                }}
              >
                {template.description}
              </p>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  fontSize: '0.69rem',
                  color: 'var(--muted-foreground)',
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <FileText size={12} />
                  {template.default_questions.length} questions
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Users size={12} />
                  {template.suggested_panel_size} experts
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
