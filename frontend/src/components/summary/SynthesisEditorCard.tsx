import { EditorContent, Editor } from '@tiptap/react';
import type { CSSProperties, ReactNode } from 'react';
import { Bot, SquarePen } from 'lucide-react';
import { MarkdownRenderer } from '../index';
import type { Round } from '../../types/summary';

type Props = {
  activeRound: Round | null;
  contextNote?: string | null;
  synthesisViewMode: 'view' | 'edit';
  onSetViewMode: (mode: 'view' | 'edit') => void | Promise<void>;
  canGenerate?: boolean;
  onGenerate?: () => void;
  editor: Editor | null;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void | Promise<void | boolean>;
  onRevert: () => void;
  background?: 'default' | 'paper' | 'soft';
  children?: ReactNode;
};

export default function SynthesisEditorCard({
  activeRound,
  contextNote,
  synthesisViewMode,
  onSetViewMode,
  canGenerate = false,
  onGenerate,
  editor,
  isDirty,
  isSaving,
  onSave,
  onRevert,
  background = 'default',
  children,
}: Props) {
  const synthesisText = activeRound?.synthesis || '';
  const hasSynthesis = synthesisText.trim().length > 0;
  const hasEmbeddedContent = Boolean(children);
  const backgroundStyle =
    background === 'paper'
      ? {
          backgroundColor: '#ffffff',
          color: '#0f172a',
          borderColor: '#e2e8f0',
          '--foreground': '#0f172a',
          '--card': '#ffffff',
          '--background': '#ffffff',
          '--muted': '#f8fafc',
          '--muted-foreground': '#64748b',
          '--border': '#e2e8f0',
        } as CSSProperties
      : background === 'soft'
        ? { backgroundColor: 'color-mix(in srgb, var(--muted) 35%, var(--card))' }
        : {};

  return (
    <div
      className={`card p-4 sm:p-6 ${hasSynthesis || hasEmbeddedContent || synthesisViewMode === 'edit' ? 'min-h-[200px] lg:min-h-[300px]' : 'min-h-[180px]'}`}
      style={{
        borderTop: '2px solid color-mix(in srgb, var(--accent) 72%, transparent)',
        ...backgroundStyle,
      }}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2" style={{ margin: 0 }}>
            <SquarePen size={18} style={{ color: 'var(--accent)' }} /> Synthesis for Round {activeRound?.round_number || ''}
          </h2>
          {contextNote && (
            <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>
              {contextNote}
            </p>
          )}
        </div>
        <div
          role="tablist"
          aria-label="Synthesis view mode"
          style={{
            display: 'inline-flex',
            borderRadius: '0.5rem',
            overflow: 'hidden',
            border: '1px solid var(--border)',
            fontSize: '0.8125rem',
            alignSelf: 'flex-start',
          }}
        >
          <button
            role="tab"
            aria-selected={synthesisViewMode === 'view'}
            onClick={() => onSetViewMode('view')}
            style={{
              padding: '0.375rem 0.75rem',
              cursor: 'pointer',
              border: 'none',
              fontWeight: synthesisViewMode === 'view' ? 600 : 400,
              backgroundColor: synthesisViewMode === 'view' ? 'var(--accent)' : 'var(--card)',
              color: synthesisViewMode === 'view' ? 'white' : 'var(--muted-foreground)',
              transition: 'all 0.15s ease',
            }}
          >
            View
          </button>
          <button
            role="tab"
            aria-selected={synthesisViewMode === 'edit'}
            onClick={() => onSetViewMode('edit')}
            style={{
              padding: '0.375rem 0.75rem',
              cursor: 'pointer',
              border: 'none',
              borderLeft: '1px solid var(--border)',
              fontWeight: synthesisViewMode === 'edit' ? 600 : 400,
              backgroundColor: synthesisViewMode === 'edit' ? 'var(--accent)' : 'var(--card)',
              color: synthesisViewMode === 'edit' ? 'white' : 'var(--muted-foreground)',
              transition: 'all 0.15s ease',
            }}
          >
            Edit
          </button>
        </div>
      </div>
      {synthesisViewMode === 'edit' && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs" style={{ color: isDirty ? 'var(--accent)' : 'var(--muted-foreground)' }}>
            {isDirty ? 'Unsaved changes' : 'All changes saved'}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onRevert}
              disabled={!isDirty || isSaving}
              className="px-3 py-1.5 rounded-md text-xs font-medium"
              style={{
                border: '1px solid var(--border)',
                background: 'var(--card)',
                color: 'var(--muted-foreground)',
                cursor: !isDirty || isSaving ? 'not-allowed' : 'pointer',
                opacity: !isDirty || isSaving ? 0.6 : 1,
              }}
            >
              Revert
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!isDirty || isSaving}
              className="px-3 py-1.5 rounded-md text-xs font-semibold"
              style={{
                border: '1px solid var(--accent)',
                background: 'var(--accent)',
                color: 'white',
                cursor: !isDirty || isSaving ? 'not-allowed' : 'pointer',
                opacity: !isDirty || isSaving ? 0.6 : 1,
              }}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
      {synthesisViewMode === 'edit' ? (
        <div className="synthesis-editor-surface markdown-body">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div className="space-y-5">
          {hasSynthesis ? (
            <MarkdownRenderer content={synthesisText} />
          ) : !hasEmbeddedContent ? (
            <div
              className="rounded-lg p-6 text-center"
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px dashed var(--border)',
              }}
            >
              <div className="mb-3 flex justify-center">
                <span
                  style={{
                    width: 52,
                    height: 52,
                    borderRadius: 16,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
                  }}
                >
                  <Bot size={24} style={{ color: 'var(--accent)' }} />
                </span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                No synthesis yet
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Generate a first draft for this round or switch to Edit to write one manually.
              </p>
              {canGenerate && onGenerate && (
                <button
                  type="button"
                  onClick={onGenerate}
                  className="mt-4 inline-flex items-center justify-center rounded-lg px-3.5 py-2 text-sm font-semibold"
                  style={{
                    backgroundColor: 'var(--accent)',
                    color: 'white',
                    border: '1px solid var(--accent)',
                  }}
                >
                  Generate draft
                </button>
              )}
            </div>
          ) : null}
          {hasEmbeddedContent && (
            <div
              className={hasSynthesis ? 'pt-5 space-y-5' : 'space-y-5'}
              style={hasSynthesis ? { borderTop: '1px solid var(--border)' } : undefined}
            >
              {children}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
