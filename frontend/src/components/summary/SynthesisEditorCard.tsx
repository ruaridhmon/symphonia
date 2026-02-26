import { EditorContent, Editor } from '@tiptap/react';
import { MarkdownRenderer } from '../index';
import type { Round } from '../../types/summary';

type Props = {
  activeRound: Round | null;
  synthesisViewMode: 'view' | 'edit';
  onSetViewMode: (mode: 'view' | 'edit') => void;
  editor: Editor | null;
};

export default function SynthesisEditorCard({
  activeRound,
  synthesisViewMode,
  onSetViewMode,
  editor,
}: Props) {
  return (
    <div
      className="card p-4 sm:p-6 min-h-[200px] lg:min-h-[300px]"
      style={{ borderTop: '3px solid var(--accent)' }}
    >
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2" style={{ margin: 0 }}>
          <span>📝</span> Synthesis for Round {activeRound?.round_number || ''}
        </h2>
        <div
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
