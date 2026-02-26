import { useState, useCallback } from 'react';
import { Sparkles, ToggleLeft, ToggleRight, Loader2, AlertTriangle } from 'lucide-react';
import { voiceMirror } from '../api/synthesis';
import type { ClarifiedResponse, VoiceMirrorInput } from '../api/synthesis';
import { extractQuestionText } from '../utils/questions';

type Props = {
  formId: number;
  roundId: number;
  responses: {
    id: number;
    email: string | null;
    answers: Record<string, string>;
  }[];
  questions: (string | Record<string, unknown>)[];
};

/**
 * Voice Mirroring: AI-clarified expert statements.
 *
 * Shows a toggle per response to swap between "Original" and "Clarified"
 * versions of expert answers. Clarifications preserve meaning while
 * improving readability.
 */
export default function VoiceMirroring({
  formId,
  roundId,
  responses,
  questions,
}: Props) {
  const [clarifiedMap, setClarifiedMap] = useState<
    Record<string, ClarifiedResponse[]>
  >({});
  const [activeToggles, setActiveToggles] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState(false);

  const cacheKey = `${formId}-${roundId}`;

  const generateClarifications = useCallback(async () => {
    if (clarifiedMap[cacheKey]) {
      setGenerated(true);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const inputs: VoiceMirrorInput[] = [];
      for (const resp of responses) {
        for (let i = 0; i < questions.length; i++) {
          const key = `q${i + 1}`;
          const answer = resp.answers[key];
          if (!answer) continue;
          inputs.push({
            expert: resp.email || `Expert ${resp.id}`,
            question: extractQuestionText(questions[i]),
            answer: String(answer),
          });
        }
      }

      if (inputs.length === 0) {
        setError('No responses to clarify');
        return;
      }

      const result = await voiceMirror(formId, roundId, inputs);
      setClarifiedMap(prev => ({
        ...prev,
        [cacheKey]: result.clarified_responses,
      }));
      setGenerated(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to generate clarifications');
    } finally {
      setLoading(false);
    }
  }, [formId, roundId, responses, questions, cacheKey, clarifiedMap]);

  const toggleResponse = useCallback((responseId: number) => {
    setActiveToggles(prev => {
      const next = new Set(prev);
      if (next.has(responseId)) {
        next.delete(responseId);
      } else {
        next.add(responseId);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (activeToggles.size === responses.length) {
      setActiveToggles(new Set());
    } else {
      setActiveToggles(new Set(responses.map(r => r.id)));
    }
  }, [activeToggles, responses]);

  // Get clarified text for a specific expert + question
  const getClarified = (email: string | null, questionIdx: number): string | null => {
    const items = clarifiedMap[cacheKey];
    if (!items) return null;
    const expert = email || '';
    const qText = extractQuestionText(questions[questionIdx]);
    const match = items.find(
      c =>
        (c.expert === expert || c.expert.includes(expert)) &&
        c.question === qText
    );
    return match?.clarified || null;
  };

  if (responses.length === 0) return null;

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        border: '1px solid var(--border)',
        backgroundColor: 'var(--card)',
      }}
    >
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles
            size={16}
            style={{ color: 'var(--accent)' }}
          />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'var(--foreground)' }}
          >
            Voice Mirroring
          </h3>
          <span
            className="text-xs px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 12%, transparent)',
              color: 'var(--accent)',
            }}
          >
            AI
          </span>
        </div>

        {!generated ? (
          <button
            onClick={generateClarifications}
            disabled={loading}
            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: 'var(--accent)',
              color: 'var(--accent-foreground)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? (
              <>
                <Loader2 size={12} className="animate-spin" />
                Clarifying…
              </>
            ) : (
              <>
                <Sparkles size={12} />
                Generate Clarifications
              </>
            )}
          </button>
        ) : (
          <button
            onClick={toggleAll}
            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
            style={{
              backgroundColor: 'color-mix(in srgb, var(--accent) 10%, transparent)',
              color: 'var(--accent)',
              cursor: 'pointer',
            }}
          >
            {activeToggles.size === responses.length ? (
              <>
                <ToggleRight size={14} />
                Show All Originals
              </>
            ) : (
              <>
                <ToggleLeft size={14} />
                Show All Clarified
              </>
            )}
          </button>
        )}
      </div>

      {/* AI Disclaimer */}
      {generated && (
        <div
          className="mx-4 mb-3 px-3 py-2 rounded-md text-xs"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--accent) 6%, transparent)',
            color: 'var(--muted-foreground)',
            border: '1px solid color-mix(in srgb, var(--accent) 15%, transparent)',
          }}
        >
          🔍 AI-clarified versions preserve the expert's original meaning while
          improving readability. Toggle per response to compare.
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mx-4 mb-3 p-3 rounded-md text-sm flex items-center gap-2"
          style={{
            backgroundColor: 'color-mix(in srgb, var(--destructive) 10%, transparent)',
            color: 'var(--destructive)',
            border: '1px solid var(--destructive)',
          }}
        >
          <AlertTriangle size={14} />
          {error}
        </div>
      )}

      {/* Responses with toggle */}
      {generated && (
        <div className="px-4 pb-4 space-y-3">
          {responses.map(resp => {
            const isActive = activeToggles.has(resp.id);
            return (
              <div
                key={resp.id}
                className="rounded-lg p-3 transition-all"
                style={{
                  backgroundColor: isActive
                    ? 'color-mix(in srgb, var(--accent) 5%, var(--background))'
                    : 'var(--background)',
                  border: `1px solid ${isActive ? 'color-mix(in srgb, var(--accent) 25%, transparent)' : 'var(--border)'}`,
                }}
              >
                {/* Response header with toggle */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-xs font-medium"
                    style={{ color: 'var(--muted-foreground)' }}
                  >
                    {resp.email || 'Anonymous'}
                  </span>
                  <button
                    onClick={() => toggleResponse(resp.id)}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md transition-colors"
                    style={{
                      backgroundColor: isActive
                        ? 'color-mix(in srgb, var(--accent) 15%, transparent)'
                        : 'var(--muted)',
                      color: isActive
                        ? 'var(--accent)'
                        : 'var(--muted-foreground)',
                      cursor: 'pointer',
                      border: 'none',
                    }}
                  >
                    {isActive ? (
                      <>
                        <ToggleRight size={12} />
                        Clarified
                      </>
                    ) : (
                      <>
                        <ToggleLeft size={12} />
                        Original
                      </>
                    )}
                  </button>
                </div>

                {/* Answer content */}
                {questions.map((q, i) => {
                  const key = `q${i + 1}`;
                  const original = resp.answers[key];
                  if (!original) return null;
                  const clarified = getClarified(resp.email, i);
                  const displayText = isActive && clarified ? clarified : String(original);

                  return (
                    <div key={key} className="mb-2 last:mb-0">
                      <div
                        className="text-xs font-semibold mb-1"
                        style={{ color: 'var(--foreground)' }}
                      >
                        {extractQuestionText(q)}
                      </div>
                      <div
                        className="text-sm leading-relaxed transition-all"
                        style={{
                          color: 'var(--foreground)',
                          fontStyle: isActive && clarified ? 'normal' : 'normal',
                        }}
                      >
                        {displayText}
                      </div>
                      {isActive && clarified && (
                        <div
                          className="text-xs mt-1"
                          style={{ color: 'var(--muted-foreground)', fontStyle: 'italic' }}
                        >
                          Original: {String(original)}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
