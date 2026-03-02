import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, X, Lightbulb, Scale, Shield, BookOpen, Users } from 'lucide-react';
import type { StructuredResponse } from '../types/structured-input';
import { emptyStructuredResponse, autoSaveKey } from '../types/structured-input';

interface StructuredInputProps {
  /** Which question index (0-based) — used for auto-save keys */
  questionIndex: number;
  /** The form ID — used for auto-save keys */
  formId: string | number;
  /** Current value */
  value: StructuredResponse;
  /** Called on every change */
  onChange: (value: StructuredResponse) => void;
  /** Whether the form is read-only (reviewing mode) */
  readOnly?: boolean;
}

/* ------------------------------------------------------------------ */
/* Confidence label helper                                            */
/* ------------------------------------------------------------------ */
/* Use CSS variables so colors adapt to dark/light theme */
const confidenceLabels: Record<number, { label: string; color: string }> = {
  1: { label: 'Highly uncertain', color: 'var(--destructive)' },
  2: { label: 'Very uncertain', color: 'var(--warning)' },
  3: { label: 'Uncertain', color: 'var(--warning)' },
  4: { label: 'Somewhat uncertain', color: 'var(--warning)' },
  5: { label: 'Neutral', color: 'var(--muted-foreground)' },
  6: { label: 'Somewhat confident', color: 'var(--success)' },
  7: { label: 'Confident', color: 'var(--success)' },
  8: { label: 'Very confident', color: 'var(--success)' },
  9: { label: 'Highly confident', color: 'var(--success)' },
  10: { label: 'Certain', color: 'var(--success)' },
};

function getConfidenceInfo(n: number) {
  return confidenceLabels[n] ?? { label: '', color: 'var(--muted-foreground)' };
}

/* ------------------------------------------------------------------ */
/* Auto-resize textarea hook                                          */
/* ------------------------------------------------------------------ */
function useAutoResize() {
  return useCallback((el: HTMLTextAreaElement | null) => {
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, []);
}

/* ------------------------------------------------------------------ */
/* Main component                                                     */
/* ------------------------------------------------------------------ */
export default function StructuredInput({
  questionIndex,
  formId,
  value,
  onChange,
  readOnly = false,
}: StructuredInputProps) {
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [newCitation, setNewCitation] = useState('');
  const [newNomination, setNewNomination] = useState('');
  const autoResize = useAutoResize();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Auto-save to localStorage (debounced 500ms) ──────────────────
  useEffect(() => {
    if (readOnly) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(
          autoSaveKey(formId, questionIndex),
          JSON.stringify(value),
        );
      } catch {
        // localStorage full — silently fail
      }
    }, 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [value, formId, questionIndex, readOnly]);

  // ── Restore from localStorage on mount ───────────────────────────
  useEffect(() => {
    if (readOnly) return;
    try {
      const saved = localStorage.getItem(autoSaveKey(formId, questionIndex));
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<StructuredResponse>;
        // Only restore if current value is empty (fresh load)
        if (!value.position && parsed.position) {
          onChange({ ...emptyStructuredResponse(), ...parsed });
        }
      }
    } catch {
      // corrupt data — ignore
    }
    // only on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── Helpers ───────────────────────────────────────── */
  function update(patch: Partial<StructuredResponse>) {
    onChange({ ...value, ...patch });
  }

  function addCitation() {
    const trimmed = newCitation.trim();
    if (!trimmed) return;
    const existing = value.citations ?? [];
    if (!existing.includes(trimmed)) {
      update({ citations: [...existing, trimmed] });
    }
    setNewCitation('');
  }

  function removeCitation(idx: number) {
    const next = [...(value.citations ?? [])];
    next.splice(idx, 1);
    update({ citations: next });
  }

  function addNomination() {
    const trimmed = newNomination.trim();
    if (!trimmed) return;
    const existing = value.expertNominations ?? [];
    if (!existing.includes(trimmed)) {
      update({ expertNominations: [...existing, trimmed] });
    }
    setNewNomination('');
  }

  function removeNomination(idx: number) {
    const next = [...(value.expertNominations ?? [])];
    next.splice(idx, 1);
    update({ expertNominations: next });
  }

  const conf = getConfidenceInfo(value.confidence);

  /* ── Read-only view ────────────────────────────────── */
  if (readOnly) {
    return (
      <div style={styles.container}>
        {/* Position */}
        <Section icon={<Lightbulb size={14} />} label="Position">
          <div style={styles.readOnlyBlock}>
            {value.position || <span style={{ color: 'var(--muted-foreground)' }}>No position provided</span>}
          </div>
        </Section>

        {/* Evidence */}
        <Section icon={<BookOpen size={14} />} label="Evidence">
          <div style={styles.readOnlyBlock}>
            {value.evidence || <span style={{ color: 'var(--muted-foreground)' }}>No evidence provided</span>}
          </div>
        </Section>

        {/* Confidence */}
        <Section icon={<Scale size={14} />} label={`Confidence: ${value.confidence}/10`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={styles.confidenceTrackReadOnly}>
              <div
                style={{
                  ...styles.confidenceFill,
                  width: `${(value.confidence / 10) * 100}%`,
                  backgroundColor: conf.color,
                }}
              />
            </div>
            <span style={{ ...styles.confidenceLabel, color: conf.color }}>{conf.label}</span>
          </div>
          {value.confidenceJustification && (
            <div style={{ ...styles.readOnlyBlock, marginTop: '0.5rem' }}>
              {value.confidenceJustification}
            </div>
          )}
        </Section>

        {/* Counterarguments */}
        {value.counterarguments && (
          <Section icon={<Shield size={14} />} label="Counterarguments">
            <div style={styles.readOnlyBlock}>{value.counterarguments}</div>
          </Section>
        )}

        {/* Citations */}
        {(value.citations?.length ?? 0) > 0 && (
          <Section icon={<BookOpen size={14} />} label="Citations">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {value.citations!.map((c, i) => (
                <span key={i} style={styles.chipReadOnly}>{c}</span>
              ))}
            </div>
          </Section>
        )}

        {/* Expert nominations */}
        {(value.expertNominations?.length ?? 0) > 0 && (
          <Section icon={<Users size={14} />} label="Expert Nominations">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.375rem' }}>
              {value.expertNominations!.map((n, i) => (
                <span key={i} style={styles.chipReadOnly}>{n}</span>
              ))}
            </div>
          </Section>
        )}
      </div>
    );
  }

  /* ── Editable view ─────────────────────────────────── */
  return (
    <div style={styles.container}>
      {/* ── Position (required) ── */}
      <Section icon={<Lightbulb size={14} />} label="Your Position" required>
        <textarea
          ref={autoResize}
          rows={2}
          placeholder="State your core position or answer clearly…"
          className="w-full rounded-lg px-4 py-2.5 resize-none overflow-hidden bg-muted"
          value={value.position}
          onChange={e => update({ position: e.target.value })}
          onInput={e => autoResize(e.target as HTMLTextAreaElement)}
        />
      </Section>

      {/* ── Evidence ── */}
      <Section icon={<BookOpen size={14} />} label="Evidence & Reasoning">
        <textarea
          ref={autoResize}
          rows={3}
          placeholder="What data, research, or experience supports your position? Include references where possible…"
          className="w-full rounded-lg px-4 py-2.5 resize-none overflow-hidden bg-muted"
          value={value.evidence}
          onChange={e => update({ evidence: e.target.value })}
          onInput={e => autoResize(e.target as HTMLTextAreaElement)}
        />
      </Section>

      {/* ── Confidence slider ── */}
      <Section icon={<Scale size={14} />} label="Confidence Level">
        <div style={styles.confidenceRow}>
          <div style={styles.sliderContainer}>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={value.confidence}
              onChange={e => update({ confidence: Number(e.target.value) })}
              style={styles.slider}
              aria-label={`Confidence level: ${value.confidence} out of 10`}
            />
            <div style={styles.sliderLabels}>
              <span style={styles.sliderLabelStart}>1</span>
              <span style={styles.sliderLabelCenter}>5</span>
              <span style={styles.sliderLabelEnd}>10</span>
            </div>
          </div>
          <div style={styles.confidenceBadge}>
            <span style={{ fontSize: '1.25rem', fontWeight: 700, color: conf.color, fontVariantNumeric: 'tabular-nums' }}>
              {value.confidence}
            </span>
            <span style={{ fontSize: '0.6875rem', color: conf.color, fontWeight: 500 }}>{conf.label}</span>
          </div>
        </div>
        <textarea
          ref={autoResize}
          rows={1}
          placeholder="Why this confidence level? What would change your mind?"
          className="w-full rounded-lg px-4 py-2.5 resize-none overflow-hidden bg-muted"
          style={{ marginTop: '0.5rem' }}
          value={value.confidenceJustification}
          onChange={e => update({ confidenceJustification: e.target.value })}
          onInput={e => autoResize(e.target as HTMLTextAreaElement)}
        />
      </Section>

      {/* ── Counterarguments ── */}
      <Section icon={<Shield size={14} />} label="Counterarguments">
        <textarea
          ref={autoResize}
          rows={2}
          placeholder="What are the strongest arguments against your position?"
          className="w-full rounded-lg px-4 py-2.5 resize-none overflow-hidden bg-muted"
          value={value.counterarguments}
          onChange={e => update({ counterarguments: e.target.value })}
          onInput={e => autoResize(e.target as HTMLTextAreaElement)}
        />
      </Section>

      {/* ── Advanced (collapsible) ── */}
      <button
        type="button"
        onClick={() => setAdvancedOpen(!advancedOpen)}
        style={styles.advancedToggle}
        aria-expanded={advancedOpen}
        aria-label="Advanced options: Citations, Expert Nominations"
      >
        {advancedOpen ? <ChevronDown size={14} aria-hidden="true" /> : <ChevronRight size={14} aria-hidden="true" />}
        <span>Advanced</span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--muted-foreground)', fontWeight: 400 }}>
          Citations, Expert Nominations
        </span>
      </button>

      {advancedOpen && (
        <div style={styles.advancedPanel} className="slide-down">
          {/* Citations */}
          <div style={styles.advancedSection}>
            <label style={styles.fieldLabel}>
              <BookOpen size={12} /> Citations
            </label>
            <div style={styles.chipList}>
              {(value.citations ?? []).map((c, i) => (
                <span key={i} style={styles.chip}>
                  {c}
                  <button type="button" onClick={() => removeCitation(i)} style={styles.chipRemove}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div style={styles.addRow}>
              <input
                type="text"
                placeholder="Add a citation (URL, DOI, or reference)…"
                className="rounded-lg px-3 py-2 bg-muted"
                style={{ flex: 1, fontSize: '0.8125rem' }}
                value={newCitation}
                onChange={e => setNewCitation(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addCitation(); } }}
                aria-label="Add a citation"
              />
              <button type="button" onClick={addCitation} style={styles.addButton}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          {/* Expert Nominations */}
          <div style={styles.advancedSection}>
            <label style={styles.fieldLabel}>
              <Users size={12} /> Nominate Experts
            </label>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0' }}>
              Who else should contribute to this question?
            </p>
            <div style={styles.chipList}>
              {(value.expertNominations ?? []).map((n, i) => (
                <span key={i} style={styles.chip}>
                  {n}
                  <button type="button" onClick={() => removeNomination(i)} style={styles.chipRemove}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
            <div style={styles.addRow}>
              <input
                type="text"
                placeholder="Name or email of expert…"
                className="rounded-lg px-3 py-2 bg-muted"
                style={{ flex: 1, fontSize: '0.8125rem' }}
                value={newNomination}
                onChange={e => setNewNomination(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addNomination(); } }}
                aria-label="Nominate an expert"
              />
              <button type="button" onClick={addNomination} style={styles.addButton}>
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Section sub-component                                              */
/* ------------------------------------------------------------------ */
function Section({
  icon,
  label,
  required,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div style={styles.section}>
      <label style={styles.fieldLabel}>
        {icon}
        <span>{label}</span>
        {required && <span style={{ color: 'var(--destructive)', marginLeft: '0.25rem' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Inline styles (using CSS variables from the theme)                 */
/* ------------------------------------------------------------------ */
const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '1rem',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--card)',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },
  fieldLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--foreground)',
  },
  readOnlyBlock: {
    padding: '0.625rem 0.75rem',
    backgroundColor: 'var(--muted)',
    borderRadius: 'var(--radius)',
    fontSize: '0.875rem',
    lineHeight: '1.6',
    color: 'var(--foreground)',
    whiteSpace: 'pre-wrap' as const,
    border: '1px solid var(--border)',
    minHeight: '2.5rem',
  },

  /* Confidence */
  confidenceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  sliderContainer: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.125rem',
  },
  slider: {
    width: '100%',
    accentColor: 'var(--accent)',
    cursor: 'pointer',
    height: '6px',
  },
  sliderLabels: {
    position: 'relative',
    height: '0.875rem',
    marginTop: '0.125rem',
  },
  sliderLabelStart: {
    position: 'absolute',
    left: 0,
    fontSize: '0.6875rem',
    color: 'var(--muted-foreground)',
  },
  sliderLabelCenter: {
    position: 'absolute',
    left: '50%',
    transform: 'translateX(-50%)',
    fontSize: '0.6875rem',
    color: 'var(--muted-foreground)',
  },
  sliderLabelEnd: {
    position: 'absolute',
    left: '100%',
    transform: 'translateX(-100%)',
    fontSize: '0.6875rem',
    color: 'var(--muted-foreground)',
  },
  confidenceBadge: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '4rem',
    padding: '0.375rem 0.5rem',
    borderRadius: 'var(--radius)',
    backgroundColor: 'var(--muted)',
    border: '1px solid var(--border)',
  },
  confidenceTrackReadOnly: {
    flex: 1,
    height: '6px',
    backgroundColor: 'var(--muted)',
    borderRadius: '3px',
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  },
  confidenceLabel: {
    fontSize: '0.75rem',
    fontWeight: 600,
    whiteSpace: 'nowrap' as const,
  },

  /* Advanced section */
  advancedToggle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.375rem',
    padding: '0.5rem 0',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: 'var(--muted-foreground)',
    fontFamily: 'var(--font-family)',
    transition: 'color 0.15s ease',
  },
  advancedPanel: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    padding: '0.75rem',
    backgroundColor: 'var(--muted)',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
  },
  advancedSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.375rem',
  },

  /* Chips */
  chipList: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    gap: '0.375rem',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    borderRadius: '9999px',
    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
    color: 'var(--accent)',
    border: '1px solid color-mix(in srgb, var(--accent) 20%, transparent)',
    maxWidth: '100%',
    wordBreak: 'break-all' as const,
  },
  chipReadOnly: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '0.25rem 0.625rem',
    fontSize: '0.75rem',
    fontWeight: 500,
    borderRadius: '9999px',
    backgroundColor: 'color-mix(in srgb, var(--accent) 8%, transparent)',
    color: 'var(--accent)',
  },
  chipRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.125rem',
    borderRadius: '50%',
    color: 'var(--accent)',
    opacity: 0.6,
    transition: 'opacity 0.15s',
  },
  addRow: {
    display: 'flex',
    gap: '0.375rem',
    alignItems: 'center',
  },
  addButton: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '2.25rem',
    height: '2.25rem',
    borderRadius: 'var(--radius)',
    border: '1px solid var(--border)',
    backgroundColor: 'var(--card)',
    cursor: 'pointer',
    color: 'var(--accent)',
    flexShrink: 0,
    transition: 'background-color 0.15s, border-color 0.15s',
  },
};
