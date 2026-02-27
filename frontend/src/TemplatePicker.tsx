import { useState, useEffect } from 'react';
import { FileText, Users, ArrowRight, Loader2 } from 'lucide-react';
import { API_BASE_URL } from './config';

/* ── Types ──────────────────────────────────────────────────── */

export interface FormTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  suggested_panel_size: number;
  default_questions: string[];
  expert_label_preset: Record<string, unknown>;
  tags: string[];
}

/* ── TemplatePicker ─────────────────────────────────────────── */

interface TemplatePickerProps {
  onSelectTemplate: (template: FormTemplate) => void;
  onStartBlank: () => void;
}

export default function TemplatePicker({ onSelectTemplate, onStartBlank }: TemplatePickerProps) {
  const [templates, setTemplates] = useState<FormTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [hoveredBlank, setHoveredBlank] = useState(false);

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
          Start from scratch →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h2
          style={{
            fontSize: '1.15rem',
            fontWeight: 700,
            color: 'var(--foreground)',
            margin: '0 0 6px 0',
          }}
        >
          Choose a template
        </h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--muted-foreground)', margin: 0 }}>
          Start with a pre-built template or create a blank consultation from scratch.
        </p>
      </div>

      {/* Start from scratch — always first */}
      <button
        type="button"
        onClick={onStartBlank}
        onMouseEnter={() => setHoveredBlank(true)}
        onMouseLeave={() => setHoveredBlank(false)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          padding: '16px 20px',
          borderRadius: 12,
          border: `2px dashed ${hoveredBlank ? 'var(--accent)' : 'var(--border)'}`,
          backgroundColor: hoveredBlank
            ? 'color-mix(in srgb, var(--accent) 5%, var(--card))'
            : 'var(--card)',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
          marginBottom: '1.5rem',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 10,
            backgroundColor: hoveredBlank
              ? 'color-mix(in srgb, var(--accent) 12%, transparent)'
              : 'color-mix(in srgb, var(--foreground) 6%, transparent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            transition: 'background-color 0.15s ease',
          }}
        >
          <FileText
            size={22}
            style={{
              color: hoveredBlank ? 'var(--accent)' : 'var(--muted-foreground)',
              transition: 'color 0.15s ease',
            }}
          />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '0.95rem',
            fontWeight: 600,
            color: 'var(--foreground)',
            marginBottom: 2,
          }}>
            Start from scratch
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--muted-foreground)' }}>
            Create a blank form with your own title, questions, and settings.
          </div>
        </div>
        <ArrowRight
          size={18}
          style={{
            color: hoveredBlank ? 'var(--accent)' : 'var(--muted-foreground)',
            flexShrink: 0,
            opacity: hoveredBlank ? 1 : 0.5,
            transition: 'all 0.15s ease',
          }}
        />
      </button>

      {/* Template cards grouped by category */}
      {categoryOrder.map(category => (
        <div key={category} style={{ marginBottom: '1.5rem' }}>
          <h3
            style={{
              fontSize: '0.75rem',
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--muted-foreground)',
              margin: '0 0 10px 4px',
            }}
          >
            {category}
          </h3>
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
                      ? '0 4px 12px rgba(0, 0, 0, 0.1)'
                      : 'none',
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
