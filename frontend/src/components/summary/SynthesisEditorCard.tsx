import { EditorContent, Editor } from '@tiptap/react';
import { MarkdownRenderer } from '../index';
import type { Round } from '../../types/summary';

type Props = {
  activeRound: Round | null;
  contextNote?: string | null;
  synthesisViewMode: 'view' | 'edit';
  onSetViewMode: (mode: 'view' | 'edit') => void | Promise<void>;
  editor: Editor | null;
  isDirty: boolean;
  isSaving: boolean;
  onSave: () => void | Promise<void | boolean>;
  onRevert: () => void;
};

export default function SynthesisEditorCard({
  activeRound,
  contextNote,
  synthesisViewMode,
  onSetViewMode,
  editor,
  isDirty,
  isSaving,
  onSave,
  onRevert,
}: Props) {
  return (
    <div
      className="card p-4 sm:p-6 min-h-[200px] lg:min-h-[300px]"
      style={{ borderTop: '3px solid var(--accent)' }}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2" style={{ margin: 0 }}>
            <span>📝</span> Synthesis for Round {activeRound?.round_number || ''}
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
        <div className="prose max-w-none">
          <EditorContent editor={editor} />
        </div>
      ) : (
        <div>
          {activeRound?.synthesis ? (
            <MarkdownRenderer content={activeRound.synthesis} />
          ) : (
            <div
              className="rounded-lg p-6 text-center"
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px dashed var(--border)',
              }}
            >
              <div className="text-3xl mb-3">🤖</div>
              <p className="text-sm font-medium" style={{ color: 'var(--foreground)' }}>
                No synthesis yet
              </p>
              <p className="text-sm mt-1" style={{ color: 'var(--muted-foreground)' }}>
                Generate one using the AI panel on the right, or switch to Edit mode to write manually.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
