import { useState, useEffect, type ReactNode } from 'react';
import { FileText, Users, ArrowRight, Loader2, Sparkles, Clock3, LayoutTemplate, MessagesSquare } from 'lucide-react';
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

function FeaturePill({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        borderRadius: 14,
        padding: '14px 16px',
        background: 'color-mix(in srgb, var(--card) 88%, white)',
        border: '1px solid color-mix(in srgb, var(--accent) 12%, var(--border))',
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        minHeight: 72,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
          color: 'var(--accent)',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.72rem', fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--muted-foreground)' }}>
          {label}
        </div>
        <div style={{ fontSize: '0.92rem', fontWeight: 600, color: 'var(--foreground)', marginTop: 4 }}>
          {value}
        </div>
      </div>
    </div>
  );
}

function StarterOptionCard({
  title,
  description,
  eyebrow,
  icon,
  active,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: {
  title: string;
  description: string;
  eyebrow: string;
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
        gap: 16,
        padding: '18px 20px',
        borderRadius: 16,
        border: `1px solid ${active ? 'color-mix(in srgb, var(--accent) 30%, var(--border))' : 'var(--border)'}`,
        background: active
          ? 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 8%, var(--card)), var(--card))'
          : 'var(--card)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'left',
        minHeight: 124,
        boxShadow: active ? '0 14px 30px rgba(37, 99, 235, 0.12)' : '0 4px 10px rgba(15, 23, 42, 0.04)',
      }}
    >
      <div
        style={{
          width: 52,
          height: 52,
          borderRadius: 14,
          backgroundColor: active
            ? 'color-mix(in srgb, var(--accent) 14%, transparent)'
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
        <div style={{ fontSize: '0.68rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: active ? 'var(--accent)' : 'var(--muted-foreground)', marginBottom: 6 }}>
          {eyebrow}
        </div>
        <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--foreground)', marginBottom: 4 }}>
          {title}
        </div>
        <div style={{ fontSize: '0.84rem', color: 'var(--muted-foreground)', lineHeight: 1.55 }}>
          {description}
        </div>
      </div>
      <ArrowRight
        size={18}
        style={{
          color: active ? 'var(--accent)' : 'var(--muted-foreground)',
          flexShrink: 0,
          opacity: active ? 1 : 0.55,
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

  // Group templates by category
  const grouped = templates.reduce<Record<string, FormTemplate[]>>((acc, t) => {
    (acc[t.category] ??= []).push(t);
    return acc;
  }, {});

  const categoryOrder = Object.keys(grouped).sort();
  const templateCount = templates.length;

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
            Start information gathering form from scratch →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <section
        className="card"
        style={{
          padding: '1.5rem',
          background: 'linear-gradient(135deg, color-mix(in srgb, var(--accent) 7%, white), color-mix(in srgb, var(--accent) 2%, var(--card)))',
          borderColor: 'color-mix(in srgb, var(--accent) 18%, var(--border))',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.7fr) minmax(280px, 1fr)',
            gap: '1rem',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', fontWeight: 800, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 10 }}>
              Consultation Setup
            </div>
            <h2
              style={{
                fontSize: '1.45rem',
                fontWeight: 800,
                color: 'var(--foreground)',
                margin: '0 0 8px 0',
              }}
            >
              Choose the fastest clean starting point
            </h2>
            <p style={{ fontSize: '0.95rem', color: 'var(--muted-foreground)', margin: 0, lineHeight: 1.7, maxWidth: 720 }}>
              Start with a blank consultation when you already know the structure, or pick a proven template when you want sharper questions and a faster setup path for your panel.
            </p>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
              gap: 10,
              alignSelf: 'start',
            }}
          >
            <FeaturePill icon={<LayoutTemplate size={18} />} label="Templates" value={`${templateCount} ready to adapt`} />
            <FeaturePill icon={<MessagesSquare size={18} />} label="Question style" value="Consensus or open-text" />
            <FeaturePill icon={<Clock3 size={18} />} label="Admin effort" value="Minutes, not hours" />
            <FeaturePill icon={<Sparkles size={18} />} label="Best for" value="Clear, structured starts" />
          </div>
        </div>
      </section>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: 14,
        }}
      >
        <StarterOptionCard
          title="Start consensus form from scratch"
          description="Best when you already know the consultation structure and want evidence and confidence fields enabled by default."
          eyebrow="Delphi workflow"
          icon={<Sparkles size={22} />}
          active={hoveredBlank}
          onClick={onStartBlank}
          onMouseEnter={() => setHoveredBlank(true)}
          onMouseLeave={() => setHoveredBlank(false)}
        />

        <StarterOptionCard
          title="Start information gathering form from scratch"
          description="Best when you want fast qualitative inputs first and do not need structured evidence or confidence scoring."
          eyebrow="Open response"
          icon={<MessagesSquare size={22} />}
          active={hoveredInfoBlank}
          onClick={onStartInformationGathering}
          onMouseEnter={() => setHoveredInfoBlank(true)}
          onMouseLeave={() => setHoveredInfoBlank(false)}
        />
      </div>

      {/* Template cards grouped by category */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <h2
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--foreground)',
            margin: 0,
          }}
        >
          Examples of completed templates
        </h2>
        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
          Use these when you want a credible starting structure and faster expert onboarding.
        </p>
      </div>

      {categoryOrder.map(category => (
        <div key={category} style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '0 0 10px 4px' }}>
            <h3
              style={{
                fontSize: '0.75rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'var(--muted-foreground)',
                margin: 0,
              }}
            >
              {category} Templates
            </h3>
            <span
              style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                color: 'var(--accent)',
                backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                borderRadius: 999,
                padding: '2px 8px',
              }}
            >
              {grouped[category].length}
            </span>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
              gap: 12,
            }}
          >
            {grouped[category].map(template => {
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
                    padding: '16px 18px',
                    borderRadius: 12,
                    border: `1px solid ${isHovered ? 'var(--accent)' : 'var(--border)'}`,
                    backgroundColor: isHovered
                      ? 'color-mix(in srgb, var(--accent) 5%, var(--card))'
                      : 'var(--card)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    boxShadow: isHovered
                      ? '0 14px 28px rgba(37, 99, 235, 0.12)'
                      : '0 4px 10px rgba(15, 23, 42, 0.04)',
                    transform: isHovered ? 'translateY(-1px)' : 'translateY(0)',
                  }}
                >
                  {/* Icon + Name row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <span
                      style={{
                        fontSize: '1.4rem',
                        lineHeight: 1,
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        backgroundColor: isHovered
                          ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
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
                        fontSize: '0.92rem',
                        fontWeight: 600,
                        color: 'var(--foreground)',
                      }}
                    >
                      {template.name}
                    </span>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--muted-foreground)',
                      lineHeight: 1.5,
                      margin: '0 0 12px 0',
                      flex: 1,
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {template.description}
                  </p>

                  {/* Meta row */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      fontSize: '0.72rem',
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
      ))}
    </div>
  );
}
