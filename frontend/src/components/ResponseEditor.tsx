import { useState, useCallback, useEffect, useRef } from 'react';
import { API_BASE_URL } from '../config';

// ─── Types ───────────────────────────────────────────────

interface ResponseData {
  id: number;
  answers: Record<string, string>;
  email: string | null;
  timestamp: string;
  version: number;
  round_id: number;
}

interface ConflictInfo {
  serverVersion: number;
  localAnswers: Record<string, string>;
}

interface ResponseEditorProps {
  response: ResponseData;
  questions: string[];
  token: string;
  onUpdated?: (updated: ResponseData) => void;
}

// ─── Component ───────────────────────────────────────────

export default function ResponseEditor({
  response,
  questions,
  token,
  onUpdated,
}: ResponseEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedAnswers, setEditedAnswers] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<ConflictInfo | null>(null);
  const [currentVersion, setCurrentVersion] = useState(response.version);
  const [currentAnswers, setCurrentAnswers] = useState(response.answers);
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement | null>>({});

  // Sync when prop changes
  useEffect(() => {
    setCurrentVersion(response.version);
    setCurrentAnswers(response.answers);
  }, [response.version, response.answers]);

  const startEditing = useCallback(() => {
    // Deep copy current answers as the editing baseline
    const copy: Record<string, string> = {};
    for (const [k, v] of Object.entries(currentAnswers)) {
      copy[k] = String(v ?? '');
    }
    setEditedAnswers(copy);
    setIsEditing(true);
    setError(null);
    setConflict(null);
  }, [currentAnswers]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
    setEditedAnswers({});
    setError(null);
    setConflict(null);
  }, []);

  const handleChange = useCallback((key: string, value: string) => {
    setEditedAnswers(prev => ({ ...prev, [key]: value }));
  }, []);

  const saveEdits = useCallback(
    async (force = false) => {
      setSaving(true);
      setError(null);

      const url = force
        ? `${API_BASE_URL}/responses/${response.id}/force`
        : `${API_BASE_URL}/responses/${response.id}`;

      try {
        const res = await fetch(url, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            answers: editedAnswers,
            version: currentVersion,
          }),
        });

        if (res.status === 409) {
          // Conflict — someone else edited
          const serverVersion = parseInt(
            res.headers.get('X-Current-Version') || '0',
            10
          );
          setConflict({
            serverVersion: serverVersion || currentVersion + 1,
            localAnswers: { ...editedAnswers },
          });
          return;
        }

        if (!res.ok) {
          const body = await res.json().catch(() => ({ detail: 'Save failed' }));
          setError(body.detail || `Error ${res.status}`);
          return;
        }

        const updated: ResponseData = await res.json();
        setCurrentVersion(updated.version);
        setCurrentAnswers(updated.answers);
        setIsEditing(false);
        setEditedAnswers({});
        setConflict(null);
        onUpdated?.(updated);
      } catch (e: any) {
        setError(e.message || 'Network error');
      } finally {
        setSaving(false);
      }
    },
    [editedAnswers, currentVersion, response.id, token, onUpdated]
  );

  const forceSave = useCallback(() => saveEdits(true), [saveEdits]);

  // Auto-resize textareas
  const autoResize = useCallback((el: HTMLTextAreaElement | null) => {
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, []);

  // ── View mode ──────────────────────────────────────────

  if (!isEditing) {
    return (
      <div
        className="group relative rounded-lg p-4 transition-colors"
        style={{
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border)',
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--muted-foreground)' }}
          >
            {response.email || 'Anonymous'}
          </span>
          <button
            onClick={startEditing}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-2 py-1 rounded"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
            }}
            title="Edit response"
          >
            ✏️ Edit
          </button>
        </div>

        {questions.map((q, i) => {
          const key = `q${i + 1}`;
          const answer = currentAnswers[key];
          if (!answer) return null;
          return (
            <div key={key} className="mb-3 last:mb-0">
              <div
                className="text-xs font-semibold mb-1"
                style={{ color: 'var(--foreground)' }}
              >
                {q}
              </div>
              <div
                className="text-sm leading-relaxed"
                style={{ color: 'var(--foreground)' }}
              >
                {String(answer)}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // ── Edit mode ──────────────────────────────────────────

  return (
    <div
      className="rounded-lg p-4"
      style={{
        backgroundColor: 'var(--card)',
        border: '2px solid var(--accent)',
        boxShadow: '0 0 0 2px color-mix(in srgb, var(--accent) 20%, transparent)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <span
          className="text-xs font-medium"
          style={{ color: 'var(--muted-foreground)' }}
        >
          Editing: {response.email || 'Anonymous'}
        </span>
        <div className="flex gap-2">
          <button
            onClick={cancelEditing}
            disabled={saving}
            className="text-xs px-3 py-1 rounded"
            style={{
              backgroundColor: 'var(--muted)',
              color: 'var(--muted-foreground)',
            }}
          >
            Cancel
          </button>
          <button
            onClick={() => saveEdits(false)}
            disabled={saving}
            className="text-xs px-3 py-1 rounded font-medium"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
              opacity: saving ? 0.6 : 1,
            }}
          >
            {saving ? 'Saving…' : '💾 Save'}
          </button>
        </div>
      </div>

      {questions.map((q, i) => {
        const key = `q${i + 1}`;
        return (
          <div key={key} className="mb-3 last:mb-0">
            <label
              className="text-xs font-semibold mb-1 block"
              style={{ color: 'var(--foreground)' }}
            >
              {q}
            </label>
            <textarea
              ref={el => {
                textareaRefs.current[key] = el;
                autoResize(el);
              }}
              value={editedAnswers[key] ?? ''}
              onChange={e => {
                handleChange(key, e.target.value);
                autoResize(e.target);
              }}
              disabled={saving}
              rows={2}
              className="w-full rounded-md px-3 py-2 text-sm resize-none"
              style={{
                backgroundColor: 'var(--background)',
                color: 'var(--foreground)',
                border: '1px solid var(--input)',
              }}
            />
          </div>
        );
      })}

      {/* Error banner */}
      {error && (
        <div
          className="mt-3 p-3 rounded-md text-sm"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
            color: 'var(--destructive)',
            border: '1px solid var(--destructive)',
          }}
        >
          ⚠️ {error}
        </div>
      )}

      {/* Conflict modal */}
      {conflict && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
          onClick={e => {
            if (e.target === e.currentTarget) setConflict(null);
          }}
        >
          <div
            className="rounded-xl p-6 max-w-lg w-full space-y-4"
            style={{
              backgroundColor: 'var(--card)',
              border: '1px solid var(--border)',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
            }}
          >
            <div className="flex items-center gap-2">
              <span className="text-2xl">⚠️</span>
              <h3
                className="text-lg font-bold"
                style={{ color: 'var(--foreground)' }}
              >
                Edit Conflict
              </h3>
            </div>

            <p
              className="text-sm"
              style={{ color: 'var(--muted-foreground)' }}
            >
              This response was modified by another admin since you started
              editing. Your version: <strong>v{currentVersion}</strong>, server
              version: <strong>v{conflict.serverVersion}</strong>.
            </p>

            <div
              className="rounded-md p-3 text-xs space-y-2"
              style={{
                backgroundColor: 'var(--muted)',
                border: '1px solid var(--border)',
              }}
            >
              <div
                className="font-semibold"
                style={{ color: 'var(--foreground)' }}
              >
                Your pending changes:
              </div>
              {questions.map((q, i) => {
                const key = `q${i + 1}`;
                const local = conflict.localAnswers[key] ?? '';
                const original = String(currentAnswers[key] ?? '');
                if (local === original) return null;
                return (
                  <div key={key}>
                    <div style={{ color: 'var(--muted-foreground)' }}>
                      {q}
                    </div>
                    <div
                      className="mt-0.5"
                      style={{ color: 'var(--destructive)' }}
                    >
                      − {original || '(empty)'}
                    </div>
                    <div
                      className="mt-0.5"
                      style={{ color: 'var(--success, #22c55e)' }}
                    >
                      + {local || '(empty)'}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => {
                  setConflict(null);
                  cancelEditing();
                }}
                className="px-4 py-2 rounded-lg text-sm"
                style={{
                  backgroundColor: 'var(--muted)',
                  color: 'var(--foreground)',
                }}
              >
                Discard My Changes
              </button>
              <button
                onClick={forceSave}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-medium"
                style={{
                  backgroundColor: 'var(--destructive)',
                  color: '#fff',
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? 'Saving…' : 'Force Save My Version'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
